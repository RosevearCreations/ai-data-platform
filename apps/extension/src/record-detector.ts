import type {
  RecordDetectionResult,
  RecordGroupCandidate,
  RecordPreviewResult
} from "./types";

export function detectRepeatingRecords(
  inputSelector = ""
): RecordDetectionResult {
  const mode = inputSelector ? "selected-field" : "auto";
  const MAX_PARENTS = 3200;
  const MAX_CANDIDATES = 12;
  const MAX_RECORDS = 100;
  const OVERLAY_ATTR = "data-ai-data-platform-picker";

  const cleanText = (value: string | null | undefined, max = 320) =>
    (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const isVisible = (element: Element) => {
    if (element.closest(`[${OVERLAY_ATTR}]`)) {
      return false;
    }

    const html = element as HTMLElement;
    const style = window.getComputedStyle(html);
    const rect = html.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const stableToken = (value: string) =>
    /^[A-Za-z_][A-Za-z0-9_-]{0,48}$/.test(value) &&
    !/[a-f0-9]{14,}/i.test(value) &&
    !/^(css|jsx|sc|emotion)-?[a-z0-9]{8,}$/i.test(value);

  const queryCount = (selector: string) => {
    try {
      return document.querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  };

  const stableClasses = (element: Element) =>
    Array.from(element.classList).filter(stableToken).slice(0, 5);

  const signature = (element: Element) => {
    const classes = stableClasses(element).slice(0, 3).sort().join(".");
    const role = cleanText(element.getAttribute("role"), 80);
    const itemprop = cleanText(element.getAttribute("itemprop"), 80);
    const testId =
      cleanText(element.getAttribute("data-testid"), 80) ||
      cleanText(element.getAttribute("data-test"), 80) ||
      cleanText(element.getAttribute("data-qa"), 80);

    return [
      element.tagName.toLowerCase(),
      classes ? `class:${classes}` : "",
      role ? `role:${role}` : "",
      itemprop ? `itemprop:${itemprop}` : "",
      testId ? `test:${testId}` : ""
    ]
      .filter(Boolean)
      .join("|");
  };

  const selectorSegment = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");

    if (id && stableToken(id)) {
      const selector = `#${CSS.escape(id)}`;
      if (queryCount(selector) === 1) {
        return selector;
      }
    }

    for (const name of [
      "data-testid",
      "data-test",
      "data-qa",
      "itemprop",
      "role"
    ]) {
      const value = element.getAttribute(name);
      if (!value || value.length > 120) {
        continue;
      }

      const selector = `${tag}[${name}="${CSS.escape(value)}"]`;
      if (queryCount(selector) === 1) {
        return selector;
      }
    }

    const classes = stableClasses(element);
    if (classes.length) {
      for (let count = Math.min(3, classes.length); count >= 1; count -= 1) {
        const selector = `${tag}${classes
          .slice(0, count)
          .map((value) => `.${CSS.escape(value)}`)
          .join("")}`;

        if (queryCount(selector) === 1) {
          return selector;
        }
      }
    }

    const parent = element.parentElement;
    if (!parent) {
      return tag;
    }

    const sameTag = Array.from(parent.children).filter(
      (child) => child.tagName === element.tagName
    );

    if (sameTag.length <= 1) {
      return tag;
    }

    return `${tag}:nth-of-type(${sameTag.indexOf(element) + 1})`;
  };

  const exactSelector = (element: Element) => {
    const direct = selectorSegment(element);
    if (queryCount(direct) === 1) {
      return direct;
    }

    const segments: string[] = [];
    let current: Element | null = element;

    for (let depth = 0; current && depth < 7; depth += 1) {
      segments.unshift(selectorSegment(current));
      const candidate = segments.join(" > ");

      if (queryCount(candidate) === 1) {
        return candidate;
      }

      current = current.parentElement;
    }

    return segments.join(" > ") || element.tagName.toLowerCase();
  };

  const commonClasses = (records: Element[]) => {
    if (!records.length) {
      return [] as string[];
    }

    let common = new Set(stableClasses(records[0]));

    for (const record of records.slice(1)) {
      const next = new Set(stableClasses(record));
      common = new Set(Array.from(common).filter((value) => next.has(value)));
    }

    return Array.from(common).slice(0, 3);
  };

  const recordSelectorFor = (
    parent: Element,
    records: Element[],
    dominantSignature: string
  ) => {
    const parentSelector = exactSelector(parent);
    const tag = records[0]?.tagName.toLowerCase() ?? "*";
    const common = commonClasses(records);

    if (common.length) {
      for (let count = common.length; count >= 1; count -= 1) {
        const childSelector = `${tag}${common
          .slice(0, count)
          .map((value) => `.${CSS.escape(value)}`)
          .join("")}`;
        const full = `${parentSelector} > ${childSelector}`;
        const matchCount = queryCount(full);

        if (matchCount === records.length) {
          return full;
        }
      }
    }

    for (const name of ["role", "itemprop", "data-testid", "data-test", "data-qa"]) {
      const values = records.map((record) => record.getAttribute(name));
      const first = values[0];

      if (
        first &&
        first.length <= 120 &&
        values.every((value) => value === first)
      ) {
        const full = `${parentSelector} > ${tag}[${name}="${CSS.escape(first)}"]`;
        if (queryCount(full) === records.length) {
          return full;
        }
      }
    }

    const directTag = `${parentSelector} > ${tag}`;
    if (queryCount(directTag) === records.length) {
      return directTag;
    }

    const signaturePeers = Array.from(parent.children).filter(
      (child) => signature(child) === dominantSignature
    );

    if (signaturePeers.length === records.length) {
      return directTag;
    }

    return parentSelector + " > *";
  };

  const fieldHints = (record: Element) => {
    const hints = new Set<string>();

    for (const element of Array.from(
      record.querySelectorAll("h1,h2,h3,h4,h5,h6,a,img,[itemprop],[aria-label]")
    ).slice(0, 40)) {
      const tag = element.tagName.toLowerCase();
      const itemprop = element.getAttribute("itemprop");
      const aria = element.getAttribute("aria-label");

      if (/^h[1-6]$/.test(tag)) {
        hints.add("heading");
      }
      if (tag === "a") {
        hints.add("link");
      }
      if (tag === "img") {
        hints.add("image");
      }
      if (itemprop) {
        hints.add(`itemprop:${cleanText(itemprop, 40)}`);
      }
      if (aria) {
        hints.add(`aria:${cleanText(aria, 40)}`);
      }
    }

    return Array.from(hints).slice(0, 8);
  };

  const sampleRecord = (record: Element, index: number) => {
    const linkElement =
      record.matches("a[href]") ? record : record.querySelector("a[href]");
    const imageElement =
      record.matches("img") ? record : record.querySelector("img");

    return {
      index,
      text: cleanText(record.textContent),
      link: cleanText(linkElement?.getAttribute("href"), 500),
      image: cleanText(
        imageElement?.getAttribute("src") ??
          imageElement?.getAttribute("data-src"),
        500
      ),
      descendantCount: record.querySelectorAll("*").length,
      fieldHints: fieldHints(record)
    };
  };

  const structuralFingerprint = (record: Element) => {
    const counts = new Map<string, number>();

    for (const element of Array.from(record.querySelectorAll("*")).slice(0, 100)) {
      const tag = element.tagName.toLowerCase();
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([tag, count]) => `${tag}:${Math.min(count, 9)}`)
      .join("|");
  };

  const structuralConsistency = (records: Element[]) => {
    if (records.length <= 1) {
      return 0;
    }

    const fingerprints = records.map(structuralFingerprint);
    const frequencies = new Map<string, number>();

    for (const fingerprint of fingerprints) {
      frequencies.set(fingerprint, (frequencies.get(fingerprint) ?? 0) + 1);
    }

    const dominant = Math.max(...frequencies.values());
    return dominant / records.length;
  };

  const deriveCandidate = (
    parent: Element,
    records: Element[],
    dominantSignature: string,
    source: "auto" | "selected-field"
  ): RecordGroupCandidate | null => {
    if (records.length < 2) {
      return null;
    }

    const limitedRecords = records.slice(0, MAX_RECORDS);
    const visibleRecords = limitedRecords.filter(isVisible);
    const textBearing = limitedRecords.filter(
      (record) => cleanText(record.textContent, 400).length >= 4
    );
    const linkBearing = limitedRecords.filter(
      (record) => record.matches("a[href]") || Boolean(record.querySelector("a[href]"))
    );
    const imageBearing = limitedRecords.filter(
      (record) => record.matches("img") || Boolean(record.querySelector("img"))
    );
    const childCount = Array.from(parent.children).filter(isVisible).length;
    const repeatRatio = records.length / Math.max(childCount, records.length);
    const consistency = structuralConsistency(limitedRecords);
    const averageDescendants =
      limitedRecords.reduce(
        (sum, record) => sum + record.querySelectorAll("*").length,
        0
      ) / limitedRecords.length;
    const averageTextLength =
      limitedRecords.reduce(
        (sum, record) => sum + cleanText(record.textContent, 600).length,
        0
      ) / limitedRecords.length;

    const parentTag = parent.tagName.toLowerCase();
    const recordTag = records[0]?.tagName.toLowerCase() ?? "";
    const semanticBonus =
      parentTag === "table" ||
      parentTag === "tbody" ||
      parentTag === "ul" ||
      parentTag === "ol" ||
      recordTag === "article" ||
      recordTag === "tr" ||
      records.every((record) => record.getAttribute("role") === "row")
        ? 8
        : 0;

    let confidence =
      repeatRatio * 25 +
      consistency * 30 +
      Math.min(records.length, 12) * 2 +
      Math.min(averageDescendants / 8, 1) * 8 +
      Math.min(averageTextLength / 100, 1) * 8 +
      (textBearing.length / limitedRecords.length) * 5 +
      semanticBonus;

    if (["nav", "header", "footer"].includes(parentTag)) {
      confidence -= 30;
    }

    if (parent.closest("nav,header,footer")) {
      confidence -= 18;
    }

    if (averageTextLength < 8) {
      confidence -= 18;
    }

    if (averageDescendants < 1 && recordTag !== "tr") {
      confidence -= 10;
    }

    confidence = Math.round(Math.max(0, Math.min(100, confidence)));

    if (confidence < 48) {
      return null;
    }

    const diagnostics: string[] = [];
    if (repeatRatio >= 0.8) {
      diagnostics.push("Most visible children share the record structure.");
    } else if (repeatRatio >= 0.5) {
      diagnostics.push("A majority of visible children share the record structure.");
    } else {
      diagnostics.push("Repeated records are mixed with other child elements.");
    }

    if (consistency >= 0.8) {
      diagnostics.push("Record internals are highly consistent.");
    } else if (consistency >= 0.55) {
      diagnostics.push("Record internals are moderately consistent.");
    } else {
      diagnostics.push("Record internals vary significantly.");
    }

    if (linkBearing.length / limitedRecords.length >= 0.7) {
      diagnostics.push("Most records contain a link.");
    }
    if (imageBearing.length / limitedRecords.length >= 0.5) {
      diagnostics.push("Many records contain an image.");
    }
    if (source === "selected-field") {
      diagnostics.push("Boundary was inferred from the selected field.");
    }

    const recordSelector = recordSelectorFor(
      parent,
      records,
      dominantSignature
    );

    return {
      containerSelector: exactSelector(parent),
      recordSelector,
      source,
      recordCount: records.length,
      visibleRecordCount: visibleRecords.length,
      confidence,
      metrics: {
        repeatRatio: Number(repeatRatio.toFixed(2)),
        structuralConsistency: Number(consistency.toFixed(2)),
        textCoverage: Number(
          (textBearing.length / limitedRecords.length).toFixed(2)
        ),
        linkCoverage: Number(
          (linkBearing.length / limitedRecords.length).toFixed(2)
        ),
        imageCoverage: Number(
          (imageBearing.length / limitedRecords.length).toFixed(2)
        ),
        averageDescendants: Number(averageDescendants.toFixed(1))
      },
      diagnostics,
      samples: limitedRecords.slice(0, 5).map(sampleRecord)
    };
  };

  const candidates: RecordGroupCandidate[] = [];
  let inspectedParents = 0;

  const addCandidate = (candidate: RecordGroupCandidate | null) => {
    if (!candidate) {
      return;
    }

    const duplicate = candidates.some(
      (existing) =>
        existing.containerSelector === candidate.containerSelector &&
        existing.recordSelector === candidate.recordSelector
    );

    if (!duplicate) {
      candidates.push(candidate);
    }
  };

  if (inputSelector) {
    let selectedFields: Element[] = [];

    try {
      selectedFields = Array.from(document.querySelectorAll(inputSelector)).filter(
        isVisible
      );
    } catch {
      selectedFields = [];
    }

    const ancestorGroups = new Map<
      Element,
      { signature: string; records: Element[]; hits: number }
    >();

    for (const field of selectedFields.slice(0, 80)) {
      let current: Element | null = field;

      for (let depth = 0; current && depth < 7; depth += 1) {
        const parentElement: Element | null = current.parentElement;

        if (!parentElement) {
          break;
        }

        const currentSignature = signature(current);
        const peers: Element[] = Array.from(parentElement.children).filter(
          (child: Element) =>
            isVisible(child) && signature(child) === currentSignature
        );

        if (peers.length >= 2) {
          const previous = ancestorGroups.get(parentElement);
          ancestorGroups.set(parentElement, {
            signature: currentSignature,
            records: peers,
            hits: (previous?.hits ?? 0) + 1
          });
        }

        current = parentElement;
      }
    }

    for (const [parent, group] of ancestorGroups) {
      inspectedParents += 1;
      const candidate = deriveCandidate(
        parent,
        group.records,
        group.signature,
        "selected-field"
      );

      if (candidate) {
        candidate.confidence = Math.min(
          100,
          candidate.confidence + Math.min(group.hits, 8)
        );
      }

      addCandidate(candidate);
    }
  } else {
    const parents = Array.from(document.body?.querySelectorAll("*") ?? [])
      .filter(isVisible)
      .slice(0, MAX_PARENTS);

    for (const parent of parents) {
      const children = Array.from(parent.children).filter(isVisible);

      if (children.length < 2 || children.length > MAX_RECORDS) {
        continue;
      }

      inspectedParents += 1;

      const signatureCounts = new Map<string, number>();
      for (const child of children) {
        const childSignature = signature(child);
        signatureCounts.set(
          childSignature,
          (signatureCounts.get(childSignature) ?? 0) + 1
        );
      }

      let dominantSignature = "";
      let dominantCount = 0;

      for (const [childSignature, count] of signatureCounts) {
        if (count > dominantCount) {
          dominantSignature = childSignature;
          dominantCount = count;
        }
      }

      if (dominantCount < 2) {
        continue;
      }

      const records = children.filter(
        (child) => signature(child) === dominantSignature
      );

      addCandidate(
        deriveCandidate(parent, records, dominantSignature, "auto")
      );
    }
  }

  candidates.sort((left, right) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }

    return right.recordCount - left.recordCount;
  });

  return {
    url: window.location.href,
    detectedAt: new Date().toISOString(),
    mode,
    inputSelector,
    candidates: candidates.slice(0, MAX_CANDIDATES),
    inspectedParents,
    truncated: candidates.length > MAX_CANDIDATES
  };
}

export function previewRecordGroup(
  recordSelector: string
): RecordPreviewResult {
  const cleanText = (value: string | null | undefined, max = 180) =>
    (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  let records: Element[] = [];

  try {
    records = Array.from(document.querySelectorAll(recordSelector));
  } catch {
    records = [];
  }

  const visible = records.filter((record) => {
    const style = window.getComputedStyle(record as HTMLElement);
    const rect = record.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  });

  const overlays = visible.slice(0, 60).map((record, index) => {
    const rect = record.getBoundingClientRect();
    const overlay = document.createElement("div");

    overlay.setAttribute("data-ai-data-platform-picker", "record-preview");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483644",
      pointerEvents: "none",
      top: `${Math.max(0, rect.top)}px`,
      left: `${Math.max(0, rect.left)}px`,
      width: `${Math.max(0, rect.width)}px`,
      height: `${Math.max(0, rect.height)}px`,
      border: index === 0 ? "3px solid #ff9f1c" : "2px solid #ffbf69",
      background:
        index === 0
          ? "rgba(255, 159, 28, 0.14)"
          : "rgba(255, 191, 105, 0.07)",
      borderRadius: "4px",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.2)"
    });

    document.documentElement.appendChild(overlay);
    return overlay;
  });

  window.setTimeout(() => {
    for (const overlay of overlays) {
      overlay.remove();
    }
  }, 2400);

  return {
    recordSelector,
    matchCount: records.length,
    visibleMatchCount: visible.length,
    sampleTexts: records
      .map((record) => cleanText(record.textContent))
      .filter(Boolean)
      .slice(0, 5),
    truncated: visible.length > 60
  };
}
