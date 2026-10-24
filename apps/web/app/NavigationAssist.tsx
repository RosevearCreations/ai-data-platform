"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HelpInfo } from "@/app/help/HelpInfo";
import {
  NAVIGATION_ACCESSIBILITY_AUDIT,
  NAVIGATION_KEYBOARD_ACTIONS,
  contextAwareJumpTargets
} from "@/lib/navigation-assist";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function focusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function NavigationAssist() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const jumpTargets = useMemo(
    () => contextAwareJumpTargets(pathname, 6),
    [pathname]
  );

  const openGuide = useCallback(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function handleGlobalShortcut(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;
      if (event.key === "?" && event.shiftKey) {
        event.preventDefault();
        if (open) closeGuide();
        else openGuide();
      }
    }

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [closeGuide, open, openGuide]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleDialogKeyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGuide();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = focusableElements(dialogRef.current);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDialogKeyboard);
    return () => document.removeEventListener("keydown", handleDialogKeyboard);
  }, [closeGuide, open]);

  return (
    <>
      <button
        className="navigationAssistTrigger"
        type="button"
        onClick={openGuide}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>Keyboard</span>
        <kbd>Shift ?</kbd>
      </button>

      {open ? (
        <div
          className="navigationAssistBackdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeGuide();
          }}
        >
          <section
            ref={dialogRef}
            className="navigationAssistDialog uiSurfaceCard uiSurfaceCard--raised uiSurfaceCard--neutral"
            role="dialog"
            aria-modal="true"
            aria-labelledby="navigation-assist-title"
            aria-describedby="navigation-assist-description"
          >
            <header className="navigationAssistHeader">
              <div>
                <p className="eyebrow">Build 124 · Keyboard navigation</p>
                <h2 id="navigation-assist-title">Keyboard action map</h2>
                <p id="navigation-assist-description">
                  Shortcuts open navigation or guidance only. Workflow permissions and controls remain authoritative.
                </p>
              </div>
              <div className="navigationAssistHeaderActions">
                <HelpInfo topic="keyboard-action-map" inline />
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeGuide}
                  aria-label="Close keyboard action map"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="navigationAssistGrid">
              <section className="navigationAssistPanel" aria-labelledby="keyboard-actions-heading">
                <div className="navigationAssistSectionHeading">
                  <div>
                    <p className="eyebrow">Keyboard actions</p>
                    <h3 id="keyboard-actions-heading">Navigation shortcuts</h3>
                  </div>
                  <HelpInfo topic="keyboard-action-map" inline />
                </div>
                <div className="navigationActionList">
                  {NAVIGATION_KEYBOARD_ACTIONS.map((action) => (
                    <article className="navigationActionRow" key={action.id}>
                      <div className="navigationActionKeys" aria-label={action.keys.join(" plus ")}>
                        {action.keys.map((key) => <kbd key={key}>{key}</kbd>)}
                      </div>
                      <div>
                        <strong>{action.label}</strong>
                        <span>{action.description}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="navigationAssistPanel" aria-labelledby="context-jumps-heading">
                <div className="navigationAssistSectionHeading">
                  <div>
                    <p className="eyebrow">Current context</p>
                    <h3 id="context-jumps-heading">Suggested jumps</h3>
                  </div>
                  <HelpInfo topic="context-jump-suggestions" inline />
                </div>
                <p className="navigationAssistGuidance">
                  Suggestions come only from registered destinations near the current route.
                </p>
                <div className="navigationJumpList">
                  {jumpTargets.map((target) => (
                    <Link href={target.href} onClick={closeGuide} key={target.href}>
                      <span>
                        <strong>{target.label}</strong>
                        <small>{target.description}</small>
                      </span>
                      <em>{target.kind === "module" ? "Module" : target.groupShortLabel}</em>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            <section className="navigationAccessibilityAudit" aria-labelledby="navigation-audit-heading">
              <div className="navigationAssistSectionHeading">
                <div>
                  <p className="eyebrow">Accessibility audit</p>
                  <h3 id="navigation-audit-heading">Navigation baseline</h3>
                </div>
                <HelpInfo topic="navigation-accessibility-audit" inline />
              </div>
              <div className="navigationAuditGrid">
                {NAVIGATION_ACCESSIBILITY_AUDIT.map((item) => (
                  <article key={item.id}>
                    <span className="navigationAuditStatus" aria-label="Implemented">✓</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <footer className="navigationAssistFooter">
              <span>Use <kbd>Tab</kbd> and <kbd>Shift+Tab</kbd> to move focus.</span>
              <span><kbd>Esc</kbd> closes and returns focus.</span>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
