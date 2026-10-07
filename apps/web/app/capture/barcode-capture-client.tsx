"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BarcodeTarget = "personal-movie" | "devil-supplier";
type CaptureMethod = "camera" | "manual";

interface TargetOption {
  target: BarcodeTarget;
  workspaceId: string;
  workspaceName: string;
  label: string;
}

interface CaptureRecord {
  workspaceId: string;
  captureId: string;
  target: BarcodeTarget;
  rawCode: string;
  normalizedCode: string;
  barcodeFormat: string;
  captureMethod: CaptureMethod;
  capturedAt: string;
  provenance: Record<string, unknown>;
  matchStatus: "exact" | "unmatched" | "duplicate";
  matchPayload: Record<string, unknown>;
  reviewStatus: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QueuedCapture {
  id: string;
  workspaceId: string;
  target: BarcodeTarget;
  rawCode: string;
  formatHint: string;
  captureMethod: CaptureMethod;
  capturedAt: string;
  offlineQueuedAt: string;
}

interface DetectorResult {
  rawValue: string;
  format?: string;
}

interface DetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectorResult[]>;
}

type DetectorConstructor = new (options?: {
  formats?: string[];
}) => DetectorInstance;

const QUEUE_KEY = "ai-data-platform-mobile-barcode-queue-v1";
const DETECTOR_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf"
];

function readQueue(): QueuedCapture[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is QueuedCapture =>
          Boolean(item) &&
          typeof item === "object" &&
          typeof (item as QueuedCapture).id === "string" &&
          typeof (item as QueuedCapture).workspaceId === "string" &&
          ((item as QueuedCapture).target === "personal-movie" ||
            (item as QueuedCapture).target === "devil-supplier") &&
          typeof (item as QueuedCapture).rawCode === "string"
      )
      .slice(-100);
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedCapture[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-100)));
}

function detail(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function matchSummary(capture: CaptureRecord) {
  const payload = capture.matchPayload;
  if (capture.matchStatus === "duplicate") {
    return detail(payload.reason) || "Duplicate intake capture.";
  }
  if (capture.target === "personal-movie" && capture.matchStatus === "exact") {
    return (
      "Owned movie UPC match: " +
      (detail(payload.title) || "Untitled") +
      (payload.year ? " (" + detail(payload.year) + ")" : "")
    );
  }
  if (capture.target === "devil-supplier" && capture.matchStatus === "exact") {
    return (
      "Supplier staging SKU match: " +
      [detail(payload.supplierName), detail(payload.productName)]
        .filter(Boolean)
        .join(" · ")
    );
  }
  return detail(payload.reason) || "No exact match yet; review before routing.";
}

export function BarcodeCaptureClient({
  targets
}: {
  targets: TargetOption[];
}) {
  const [target, setTarget] = useState<BarcodeTarget>(
    targets[0]?.target ?? "personal-movie"
  );
  const [manualCode, setManualCode] = useState("");
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<QueuedCapture[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [detectorSupported, setDetectorSupported] = useState(false);
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const detectorRef = useRef<DetectorInstance | null>(null);

  const selected = useMemo(
    () => targets.find((item) => item.target === target) ?? targets[0] ?? null,
    [target, targets]
  );

  function stopCamera() {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    detectorRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  useEffect(() => {
    setOfflineQueue(readQueue());
    setOnline(navigator.onLine);
    setCameraSupported(Boolean(navigator.mediaDevices?.getUserMedia));
    const detector = (window as unknown as {
      BarcodeDetector?: DetectorConstructor;
    }).BarcodeDetector;
    setDetectorSupported(Boolean(detector));

    return () => stopCamera();
  }, []);

  async function refreshCaptures(workspaceId = selected?.workspaceId ?? "") {
    if (!workspaceId) return;
    const response = await fetch(
      "/api/barcode-captures?workspaceId=" +
        encodeURIComponent(workspaceId),
      { cache: "no-store" }
    );
    if (!response.ok) return;
    const body = (await response.json()) as { captures?: CaptureRecord[] };
    setCaptures(Array.isArray(body.captures) ? body.captures : []);
  }

  useEffect(() => {
    if (!selected) return;
    void refreshCaptures(selected.workspaceId);
  }, [selected?.workspaceId]);

  async function sendCapture(input: {
    workspaceId: string;
    target: BarcodeTarget;
    rawCode: string;
    formatHint: string;
    captureMethod: CaptureMethod;
    capturedAt: string;
    offlineQueuedAt: string | null;
  }) {
    const response = await fetch("/api/barcode-captures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });

    const body = (await response.json()) as {
      error?: string;
      warning?: string | null;
      capture?: CaptureRecord;
    };

    if (!response.ok || !body.capture) {
      throw new Error(body.error || "Barcode intake failed.");
    }

    await refreshCaptures(input.workspaceId);
    setMessage(
      (body.warning ? body.warning + " " : "") +
        (body.capture.matchStatus === "duplicate"
          ? "Duplicate detected. Review and reject the duplicate capture."
          : body.capture.matchStatus === "exact"
            ? "Exact existing-record suggestion found. Review it before approving the handoff."
            : "No exact existing record matched. Review the identifier before approving it for downstream lookup staging.")
    );
    return body.capture;
  }

  function queueOffline(input: Omit<QueuedCapture, "id" | "offlineQueuedAt">) {
    const queued: QueuedCapture = {
      ...input,
      id: crypto.randomUUID(),
      offlineQueuedAt: new Date().toISOString()
    };
    const next = [...readQueue(), queued].slice(-100);
    writeQueue(next);
    setOfflineQueue(next);
    setMessage(
      "Capture saved to this device's offline queue. It will not be matched or reviewed until it is sent to the authenticated workspace."
    );
  }

  async function captureCode(
    rawCode: string,
    formatHint: string,
    captureMethod: CaptureMethod
  ) {
    if (!selected) return;
    const digits = rawCode.replace(/\D/g, "");
    if (![8, 12, 13, 14].includes(digits.length)) {
      setMessage("Enter or scan an 8, 12, 13 or 14 digit UPC/EAN/GTIN barcode.");
      return;
    }

    const input = {
      workspaceId: selected.workspaceId,
      target: selected.target,
      rawCode: digits,
      formatHint,
      captureMethod,
      capturedAt: new Date().toISOString()
    };

    if (!online) {
      queueOffline(input);
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      await sendCapture({ ...input, offlineQueuedAt: null });
      setManualCode("");
    } catch (reason) {
      if (reason instanceof TypeError) {
        queueOffline(input);
      } else {
        setMessage(
          reason instanceof Error
            ? reason.message
            : "Unable to submit barcode capture."
        );
      }
    } finally {
      setPending(false);
    }
  }

  async function flushOfflineQueue() {
    if (!online || !offlineQueue.length) return;
    setPending(true);
    setMessage(null);

    const remaining: QueuedCapture[] = [];
    let sent = 0;
    for (const item of readQueue()) {
      try {
        await sendCapture({
          workspaceId: item.workspaceId,
          target: item.target,
          rawCode: item.rawCode,
          formatHint: item.formatHint,
          captureMethod: item.captureMethod,
          capturedAt: item.capturedAt,
          offlineQueuedAt: item.offlineQueuedAt
        });
        sent += 1;
      } catch {
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    setOfflineQueue(remaining);
    setMessage(
      sent +
        " offline capture" +
        (sent === 1 ? "" : "s") +
        " sent. " +
        remaining.length +
        " remain queued."
    );
    setPending(false);
  }

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setOfflineQueue(readQueue());
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function startCamera() {
    if (!selected || !cameraSupported || !detectorSupported) {
      setMessage(
        "Camera barcode detection is not supported in this browser. Use manual barcode entry."
      );
      return;
    }

    setMessage(null);
    try {
      const Detector = (window as unknown as {
        BarcodeDetector?: DetectorConstructor;
      }).BarcodeDetector;
      if (!Detector) throw new Error("BarcodeDetector is unavailable.");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        },
        audio: false
      });
      streamRef.current = stream;
      detectorRef.current = new Detector({ formats: DETECTOR_FORMATS });
      if (!videoRef.current) {
        for (const track of stream.getTracks()) track.stop();
        streamRef.current = null;
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);

      const scan = async () => {
        const detector = detectorRef.current;
        const video = videoRef.current;
        if (!detector || !video || !streamRef.current) return;

        try {
          const results = await detector.detect(video);
          const first = results.find((result) =>
            [8, 12, 13, 14].includes(
              result.rawValue.replace(/\D/g, "").length
            )
          );
          if (first) {
            const rawValue = first.rawValue;
            const format = first.format ?? "";
            stopCamera();
            await captureCode(rawValue, format, "camera");
            return;
          }
        } catch {
          // A transient video-frame detection error is retried while camera is active.
        }

        if (streamRef.current) {
          scanTimerRef.current = window.setTimeout(() => {
            void scan();
          }, 350);
        }
      };

      void scan();
    } catch (reason) {
      stopCamera();
      setMessage(
        reason instanceof Error
          ? "Camera could not start: " + reason.message
          : "Camera could not start."
      );
    }
  }

  async function reviewCapture(
    capture: CaptureRecord,
    reviewStatus: "approved" | "rejected"
  ) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/barcode-captures", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: capture.workspaceId,
          captureId: capture.captureId,
          reviewStatus
        })
      });
      const body = (await response.json()) as {
        error?: string;
        capture?: CaptureRecord;
      };
      if (!response.ok || !body.capture) {
        throw new Error(body.error || "Barcode review failed.");
      }
      await refreshCaptures(capture.workspaceId);
      setMessage(
        reviewStatus === "approved"
          ? capture.target === "personal-movie"
            ? "Approved. The identifier is now a reviewed Personal movie lookup handoff; existing ownership fields remain unchanged."
            : "Approved. The identifier is now a reviewed Devil n Dove supplier/inventory lookup handoff; internal inventory fields remain unchanged."
          : "Capture rejected. It will not be routed as an approved handoff."
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Unable to review barcode capture."
      );
    } finally {
      setPending(false);
    }
  }

  if (!targets.length) {
    return (
      <div className="emptyState">
        <h3>No barcode-enabled workspace access</h3>
        <p>
          This account needs access to the Personal or Devil n Dove workspace
          before barcode intake can be used.
        </p>
      </div>
    );
  }

  return (
    <div className="barcodeCapture">
      <section className="barcodeControls">
        <label>
          Route barcode to
          <select
            disabled={pending || cameraActive}
            onChange={(event) =>
              setTarget(event.target.value as BarcodeTarget)
            }
            value={selected?.target ?? target}
          >
            {targets.map((option) => (
              <option key={option.target} value={option.target}>
                {option.label} · {option.workspaceName}
              </option>
            ))}
          </select>
        </label>

        <div className="barcodeManual">
          <label>
            Manual UPC / EAN / GTIN
            <input
              autoComplete="off"
              inputMode="numeric"
              maxLength={24}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Enter 8, 12, 13 or 14 digits"
              value={manualCode}
            />
          </label>
          <button
            className="primary"
            disabled={pending || !manualCode.trim()}
            onClick={() => void captureCode(manualCode, "", "manual")}
            type="button"
          >
            Review manual barcode
          </button>
        </div>

        <div className="barcodeCamera">
          <div>
            <strong>Camera scanner</strong>
            <span>
              {cameraSupported && detectorSupported
                ? "Supported in this browser."
                : "Barcode camera detection unavailable; manual entry remains available."}
            </span>
          </div>
          <div className="barcodeCameraActions">
            <button
              className="primary"
              disabled={
                pending ||
                cameraActive ||
                !cameraSupported ||
                !detectorSupported
              }
              onClick={() => void startCamera()}
              type="button"
            >
              Start camera
            </button>
            <button
              className="secondaryButton"
              disabled={!cameraActive}
              onClick={stopCamera}
              type="button"
            >
              Stop camera
            </button>
          </div>
          <video
            className={cameraActive ? "barcodeVideo active" : "barcodeVideo"}
            muted
            playsInline
            ref={videoRef}
          />
          <small>
            Camera permission is requested only when Start camera is pressed.
            The camera is released after a successful scan or when Stop camera
            is pressed. Location is never requested or stored.
          </small>
        </div>

        <div className="barcodeOffline">
          <div>
            <strong>{offlineQueue.length}</strong>
            <span>captures queued on this device</span>
          </div>
          <button
            className="secondaryButton"
            disabled={pending || !offlineQueue.length || !online}
            onClick={() => void flushOfflineQueue()}
            type="button"
          >
            Send offline queue
          </button>
        </div>
      </section>

      <section className="barcodeReview">
        <div className="sectionHeading">
          <p className="eyebrow">Review queue</p>
          <h2>{selected?.workspaceName}</h2>
        </div>

        {captures.length ? (
          <div className="barcodeCaptureList">
            {captures.map((capture) => (
              <article key={capture.captureId}>
                <div className="barcodeCaptureTop">
                  <div>
                    <strong>{capture.rawCode}</strong>
                    <span>
                      {capture.barcodeFormat} · {capture.captureMethod}
                    </span>
                  </div>
                  <span
                    className={
                      "barcodeMatch barcodeMatch-" + capture.matchStatus
                    }
                  >
                    {capture.matchStatus}
                  </span>
                </div>

                <p>{matchSummary(capture)}</p>
                <small>
                  Captured {new Date(capture.capturedAt).toLocaleString()} ·{" "}
                  {capture.reviewStatus}
                </small>

                {capture.reviewStatus === "pending" ? (
                  <div className="barcodeReviewActions">
                    <button
                      className="primary"
                      disabled={pending || capture.matchStatus === "duplicate"}
                      onClick={() => void reviewCapture(capture, "approved")}
                      type="button"
                    >
                      Approve handoff
                    </button>
                    <button
                      className="secondaryButton"
                      disabled={pending}
                      onClick={() => void reviewCapture(capture, "rejected")}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <p>No barcode captures have been submitted to this workspace yet.</p>
          </div>
        )}
      </section>

      {message ? (
        <p className="barcodeMessage" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
