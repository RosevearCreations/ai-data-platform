import type {
  SelectorPreviewResult,
  VisualPickResult
} from "./types";

export function startVisualPicker(): Promise<VisualPickResult> {
  return new Promise((resolve) => {
    const PICKER_ATTR = "data-ai-data-platform-picker";
    const existing = document.querySelector(`[${PICKER_ATTR}="overlay"]`);

    if (existing) {
      existing.remove();
    }

    const cleanText = (value: string | null | undefined, max = 280) =>
      (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

    const safeAttributeNames = [
      "href",
      "src",
      "alt",
      "title",
      "aria-label",
      "role",
      "name",
      "type",
      "itemprop",
      "data-testid",
      "data-test",
      "data-qa"
    ] as const;

    const isStableToken = (value: string) =>
      /^[A-Za-z_][A-Za-z0-9_-]{0,48}$/.test(value) &&
      !/[a-f0-9]{14,}/i.test(value) &&
      !/^(css|jsx|sc|emotion)-?[a-z0-9]{8,}$/i.test(value);

    const unique = (selector: string) => {
      try {
        return document.querySelectorAll(selector).length === 1;
      } catch {
        return false;
      }
    };

    const count = (selector: string) => {
      try {
        return document.querySelectorAll(selector).length;
      } catch {
        return 0;
      }
    };

    const attributeSelector = (element: Element) => {
      const tag = element.tagName.toLowerCase();
      const attributes = [
        "data-testid",
        "data-test",
        "data-qa",
        "itemprop",
        "name",
        "aria-label"
      ];

      for (const name of attributes) {
        const value = element.getAttribute(name);
        if (!value || value.length > 120) {
          continue;
        }

        const selector = `${tag}[${name}="${CSS.escape(value)}"]`;
        const matchCount = count(selector);

        if (matchCount > 0 && matchCount <= 100) {
          return { selector, matchCount };
        }
      }

      return null;
    };

    const classSelector = (element: Element) => {
      const tag = element.tagName.toLowerCase();
      const classes = Array.from(element.classList)
        .filter(isStableToken)
        .slice(0, 4);

      if (!classes.length) {
        return null;
      }

      for (let size = Math.min(classes.length, 3); size >= 1; size -= 1) {
        const selector = `${tag}${classes
          .slice(0, size)
          .map((value) => `.${CSS.escape(value)}`)
          .join("")}`;
        const matchCount = count(selector);

        if (matchCount > 0 && matchCount <= 100) {
          return { selector, matchCount };
        }
      }

      return null;
    };

    const generalizedSelectorFor = (element: Element) => {
      const attribute = attributeSelector(element);
      if (attribute && attribute.matchCount > 1) {
        return attribute;
      }

      const byClass = classSelector(element);
      if (byClass && byClass.matchCount > 1) {
        return byClass;
      }

      const tag = element.tagName.toLowerCase();
      const tagCount = count(tag);

      if (tagCount > 1 && tagCount <= 40) {
        return { selector: tag, matchCount: tagCount };
      }

      return {
        selector: attribute?.selector ?? byClass?.selector ?? tag,
        matchCount:
          attribute?.matchCount ?? byClass?.matchCount ?? Math.max(tagCount, 1)
      };
    };

    const segmentFor = (element: Element) => {
      const tag = element.tagName.toLowerCase();
      const id = element.getAttribute("id");

      if (id && isStableToken(id)) {
        const selector = `#${CSS.escape(id)}`;
        if (unique(selector)) {
          return selector;
        }
      }

      const attribute = attributeSelector(element);
      if (attribute && attribute.matchCount === 1) {
        return attribute.selector;
      }

      const byClass = classSelector(element);
      if (byClass && byClass.matchCount === 1) {
        return byClass.selector;
      }

      const parent = element.parentElement;
      if (!parent) {
        return tag;
      }

      const sameTagSiblings = Array.from(parent.children).filter(
        (child) => child.tagName === element.tagName
      );

      if (sameTagSiblings.length <= 1) {
        return byClass?.selector ?? attribute?.selector ?? tag;
      }

      const index = sameTagSiblings.indexOf(element) + 1;
      const base = byClass?.selector ?? attribute?.selector ?? tag;

      return `${base}:nth-of-type(${index})`;
    };

    const exactSelectorFor = (element: Element) => {
      const directId = element.getAttribute("id");

      if (directId && isStableToken(directId)) {
        const selector = `#${CSS.escape(directId)}`;
        if (unique(selector)) {
          return selector;
        }
      }

      const directAttribute = attributeSelector(element);
      if (directAttribute && directAttribute.matchCount === 1) {
        return directAttribute.selector;
      }

      const directClass = classSelector(element);
      if (directClass && directClass.matchCount === 1) {
        return directClass.selector;
      }

      const segments: string[] = [];
      let current: Element | null = element;

      for (let depth = 0; current && depth < 7; depth += 1) {
        segments.unshift(segmentFor(current));
        const selector = segments.join(" > ");

        if (unique(selector)) {
          return selector;
        }

        const currentId = current.getAttribute("id");
        if (currentId && isStableToken(currentId)) {
          segments[0] = `#${CSS.escape(currentId)}`;
          const anchored = segments.join(" > ");
          if (unique(anchored)) {
            return anchored;
          }
          break;
        }

        current = current.parentElement;
      }

      return segments.join(" > ") || element.tagName.toLowerCase();
    };

    const overlay = document.createElement("div");
    overlay.setAttribute(PICKER_ATTR, "overlay");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483646",
      pointerEvents: "none",
      border: "2px solid #2ec4b6",
      background: "rgba(46, 196, 182, 0.12)",
      borderRadius: "4px",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
      display: "none"
    });

    const tooltip = document.createElement("div");
    tooltip.setAttribute(PICKER_ATTR, "tooltip");
    Object.assign(tooltip.style, {
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      maxWidth: "360px",
      padding: "7px 9px",
      borderRadius: "6px",
      background: "#071018",
      color: "#edf6f7",
      font: "600 12px/1.35 system-ui, sans-serif",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      display: "none",
      whiteSpace: "normal"
    });

    document.documentElement.append(overlay, tooltip);

    let hovered: Element | null = null;

    const positionOverlay = (element: Element) => {
      const rect = element.getBoundingClientRect();

      Object.assign(overlay.style, {
        display: "block",
        top: `${Math.max(0, rect.top)}px`,
        left: `${Math.max(0, rect.left)}px`,
        width: `${Math.max(0, rect.width)}px`,
        height: `${Math.max(0, rect.height)}px`
      });

      const general = generalizedSelectorFor(element);
      tooltip.textContent = `${element.tagName.toLowerCase()} · ${general.selector} · ${general.matchCount} match${general.matchCount === 1 ? "" : "es"} · click to select · Esc to cancel`;

      const tooltipTop =
        rect.top > 44 ? rect.top - 36 : Math.min(window.innerHeight - 38, rect.bottom + 8);
      const tooltipLeft = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - 370)
      );

      Object.assign(tooltip.style, {
        display: "block",
        top: `${Math.max(8, tooltipTop)}px`,
        left: `${tooltipLeft}px`
      });
    };

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("ai-data-platform:cancel-picker", onCancel);
      overlay.remove();
      tooltip.remove();
    };

    const cancelledResult = (): VisualPickResult => ({
      status: "cancelled",
      selector: "",
      selectorMatchCount: 0,
      generalizedSelector: "",
      generalizedMatchCount: 0,
      tagName: "",
      text: "",
      attributes: {},
      rect: null
    });

    const onMove = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(`[${PICKER_ATTR}]`)) {
        return;
      }

      hovered = target;
      positionOverlay(target);
    };

    const onClick = (event: MouseEvent) => {
      const target =
        event.target instanceof Element ? event.target : hovered;

      if (!target || target.closest(`[${PICKER_ATTR}]`)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const selector = exactSelectorFor(target);
      const generalized = generalizedSelectorFor(target);
      const rect = target.getBoundingClientRect();
      const attributes: Record<string, string> = {};

      for (const name of safeAttributeNames) {
        const value = target.getAttribute(name);
        if (value) {
          attributes[name] = cleanText(value, 500);
        }
      }

      cleanup();
      resolve({
        status: "picked",
        selector,
        selectorMatchCount: count(selector),
        generalizedSelector: generalized.selector,
        generalizedMatchCount: generalized.matchCount,
        tagName: target.tagName.toLowerCase(),
        text: cleanText(target.textContent),
        attributes,
        rect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      cleanup();
      resolve(cancelledResult());
    };

    const onCancel = () => {
      cleanup();
      resolve(cancelledResult());
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("ai-data-platform:cancel-picker", onCancel);
  });
}

export function cancelVisualPicker() {
  document.dispatchEvent(new CustomEvent("ai-data-platform:cancel-picker"));
}

export function previewSelector(selector: string): SelectorPreviewResult {
  const cleanText = (value: string | null | undefined, max = 180) =>
    (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const matches = Array.from(document.querySelectorAll(selector));
  const visibleMatches = matches.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element as HTMLElement);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  });

  const overlays = visibleMatches.slice(0, 50).map((element, index) => {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement("div");

    overlay.setAttribute("data-ai-data-platform-picker", "preview");
    Object.assign(overlay.style, {
      position: "fixed",
      zIndex: "2147483645",
      pointerEvents: "none",
      top: `${Math.max(0, rect.top)}px`,
      left: `${Math.max(0, rect.left)}px`,
      width: `${Math.max(0, rect.width)}px`,
      height: `${Math.max(0, rect.height)}px`,
      border: index === 0 ? "3px solid #2ec4b6" : "2px solid #7de2d8",
      background:
        index === 0
          ? "rgba(46, 196, 182, 0.16)"
          : "rgba(125, 226, 216, 0.08)",
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
  }, 2200);

  return {
    selector,
    matchCount: matches.length,
    visibleMatchCount: visibleMatches.length,
    sampleTexts: matches
      .map((element) => cleanText(element.textContent))
      .filter(Boolean)
      .slice(0, 5),
    truncated: visibleMatches.length > 50
  };
}
