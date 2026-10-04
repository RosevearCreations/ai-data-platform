import type {
  PaginationInspection,
  PaginationMode,
  PaginationProbe,
  PaginationStepResult
} from "./types";

export function inspectPagination(recordSelector: string): PaginationInspection {
  const cleanText = (value: string | null | undefined, max = 180) =>
    (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

  const recordCount = (() => {
    try {
      return document.querySelectorAll(recordSelector).length;
    } catch {
      return 0;
    }
  })();

  const isVisible = (element: Element) => {
    const style = window.getComputedStyle(element as HTMLElement);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const isDisabled = (element: Element) =>
    element.hasAttribute("disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    /(^|\s)(disabled|is-disabled)(\s|$)/i.test(element.className || "");

  const stableToken = (value: string) =>
    /^[A-Za-z_][A-Za-z0-9_-]{0,48}$/.test(value) &&
    !/[a-f0-9]{14,}/i.test(value);

  const queryCount = (selector: string) => {
    try {
      return document.querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  };

  const selectorFor = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");

    if (id && stableToken(id)) {
      const selector = `#${CSS.escape(id)}`;
      if (queryCount(selector) === 1) {
        return selector;
      }
    }

    for (const name of ["rel", "aria-label", "title", "data-testid", "data-test"]) {
      const value = element.getAttribute(name);

      if (!value || value.length > 100) {
        continue;
      }

      const selector = `${tag}[${name}="${CSS.escape(value)}"]`;
      if (queryCount(selector) === 1) {
        return selector;
      }
    }

    const classes = Array.from(element.classList)
      .filter(stableToken)
      .slice(0, 3);

    for (let count = classes.length; count >= 1; count -= 1) {
      const selector = `${tag}${classes
        .slice(0, count)
        .map((value) => `.${CSS.escape(value)}`)
        .join("")}`;

      if (queryCount(selector) === 1) {
        return selector;
      }
    }

    const parts: string[] = [];
    let current: Element | null = element;

    for (let depth = 0; current && depth < 6; depth += 1) {
      const currentTag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      let segment = currentTag;

      if (parent) {
        const sameTag = Array.from(parent.children).filter(
          (child) => child.tagName === current?.tagName
        );

        if (sameTag.length > 1) {
          segment += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
        }
      }

      parts.unshift(segment);
      const selector = parts.join(" > ");

      if (queryCount(selector) === 1) {
        return selector;
      }

      current = parent;
    }

    return parts.join(" > ") || tag;
  };

  const sameOriginFor = (element: Element) => {
    if (!element.matches("a[href]")) {
      return true;
    }

    const href = element.getAttribute("href");

    if (!href) {
      return true;
    }

    try {
      return new URL(href, window.location.href).origin === window.location.origin;
    } catch {
      return false;
    }
  };

  const candidates: PaginationInspection["candidates"] = [];

  const addCandidate = (
    element: Element,
    mode: Exclude<PaginationMode, "none">,
    label: string,
    confidence: number
  ) => {
    if (!isVisible(element)) {
      return;
    }

    const selector = selectorFor(element);

    if (!selector) {
      return;
    }

    if (
      candidates.some(
        (candidate) =>
          candidate.selector === selector && candidate.mode === mode
      )
    ) {
      return;
    }

    candidates.push({
      mode,
      selector,
      label,
      confidence,
      sameOrigin: sameOriginFor(element),
      disabled: isDisabled(element)
    });
  };

  const interactive = Array.from(
    document.querySelectorAll(
      'a[href],button,[role="button"]'
    )
  ).filter(isVisible);

  const nextRegex =
    /^(next|next page|older|older posts|more results|›|»|→|>)$/i;
  const loadMoreRegex =
    /^(load more|show more|view more|more|see more|show additional|load additional)$/i;

  for (const element of interactive) {
    const text = cleanText(element.textContent, 80);
    const aria = cleanText(element.getAttribute("aria-label"), 80);
    const title = cleanText(element.getAttribute("title"), 80);
    const rel = cleanText(element.getAttribute("rel"), 40).toLowerCase();
    const combined = [text, aria, title].filter(Boolean).join(" ");

    if (rel.split(/\s+/).includes("next")) {
      addCandidate(element, "next-button", combined || "rel=next", 99);
      continue;
    }

    if (
      /\b(next|next page|older|more results)\b/i.test(combined) ||
      nextRegex.test(text)
    ) {
      addCandidate(element, "next-button", combined || text || "Next", 92);
      continue;
    }

    if (
      /\b(load more|show more|view more|see more|load additional)\b/i.test(
        combined
      ) ||
      loadMoreRegex.test(text)
    ) {
      addCandidate(element, "load-more", combined || text || "Load more", 89);
    }
  }

  const currentPageElements = Array.from(
    document.querySelectorAll(
      '[aria-current="page"],[aria-current="true"],.pagination .active,.pagination .current,.pager .active,.pager .current'
    )
  ).filter(isVisible);

  let currentPage: number | null = null;

  for (const element of currentPageElements) {
    const numeric = Number(cleanText(element.textContent, 12));
    if (Number.isInteger(numeric) && numeric > 0) {
      currentPage = numeric;
      break;
    }
  }

  const numericControls = interactive
    .map((element) => ({
      element,
      number: Number(cleanText(element.textContent, 12))
    }))
    .filter(
      (entry) =>
        Number.isInteger(entry.number) &&
        entry.number > 0 &&
        entry.number < 100000
    );

  if (numericControls.length >= 2) {
    const numericValues = numericControls
      .map((entry) => entry.number)
      .sort((left, right) => left - right);

    if (currentPage === null) {
      const url = new URL(window.location.href);
      const queryNumber = ["page", "p", "paged"]
        .map((key) => Number(url.searchParams.get(key)))
        .find((value) => Number.isInteger(value) && value > 0);

      currentPage = queryNumber ?? Math.max(1, numericValues[0] - 1);
    }

    const nextNumeric = numericControls
      .filter((entry) => entry.number > (currentPage ?? 0))
      .sort((left, right) => left.number - right.number)[0];

    if (nextNumeric) {
      addCandidate(
        nextNumeric.element,
        "numbered-pages",
        `Page ${nextNumeric.number}`,
        nextNumeric.number === (currentPage ?? 0) + 1 ? 88 : 72
      );
    }
  }

  const scrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0
  );

  if (scrollHeight > window.innerHeight * 1.25) {
    candidates.push({
      mode: "infinite-scroll",
      selector: "",
      label: "Scroll page to load additional records",
      confidence: candidates.length ? 38 : 58,
      sameOrigin: true,
      disabled: false
    });
  }

  candidates.sort((left, right) => right.confidence - left.confidence);

  const recommended = candidates.find(
    (candidate) => !candidate.disabled && candidate.sameOrigin
  );

  const diagnostics: string[] = [];

  if (!candidates.length) {
    diagnostics.push("No pagination control or scroll-growth candidate was detected.");
  }

  if (candidates.some((candidate) => !candidate.sameOrigin)) {
    diagnostics.push("Cross-origin pagination controls were detected and will not be followed.");
  }

  if (candidates.some((candidate) => candidate.disabled)) {
    diagnostics.push("Disabled pagination controls are ignored.");
  }

  if (recommended?.mode === "infinite-scroll") {
    diagnostics.push("Infinite scroll is heuristic and will stop unless record count or page height grows.");
  }

  return {
    url: window.location.href,
    recordCount,
    scrollHeight,
    recommendedMode: recommended?.mode ?? "none",
    recommendedSelector: recommended?.selector ?? "",
    candidates: candidates.slice(0, 12),
    diagnostics
  };
}

export function probePagination(recordSelector: string): PaginationProbe {
  let recordCount = 0;

  try {
    recordCount = document.querySelectorAll(recordSelector).length;
  } catch {
    recordCount = 0;
  }

  return {
    url: window.location.href,
    origin: window.location.origin,
    recordCount,
    scrollHeight: Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0
    ),
    readyState: document.readyState
  };
}

export function performPaginationStep(
  mode: Exclude<PaginationMode, "none">,
  selector: string,
  recordSelector: string
): PaginationStepResult {
  let beforeRecordCount = 0;

  try {
    beforeRecordCount = document.querySelectorAll(recordSelector).length;
  } catch {
    beforeRecordCount = 0;
  }

  const beforeScrollHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0
  );
  const beforeUrl = window.location.href;

  if (mode === "infinite-scroll") {
    window.scrollTo({
      top: beforeScrollHeight,
      behavior: "auto"
    });

    return {
      mode,
      selector: "",
      action: "scrolled",
      beforeUrl,
      beforeRecordCount,
      beforeScrollHeight
    };
  }

  if (!selector) {
    throw new Error("Pagination selector is required for this mode.");
  }

  const control = document.querySelector(selector);

  if (!control) {
    throw new Error("Pagination control is no longer present.");
  }

  const style = window.getComputedStyle(control as HTMLElement);
  const rect = control.getBoundingClientRect();

  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    throw new Error("Pagination control is not visible.");
  }

  if (
    control.hasAttribute("disabled") ||
    control.getAttribute("aria-disabled") === "true"
  ) {
    throw new Error("Pagination control is disabled.");
  }

  if (
    control.matches("button") &&
    (control as HTMLButtonElement).type === "submit" &&
    Boolean(control.closest("form"))
  ) {
    throw new Error("Refusing to click a form submit button as pagination.");
  }

  if (!control.matches('a[href],button,[role="button"]')) {
    throw new Error("Refusing to click a non-interactive pagination target.");
  }

  if (control.matches("a[href]")) {
    const href = control.getAttribute("href");

    if (href) {
      const target = new URL(href, window.location.href);

      if (target.origin !== window.location.origin) {
        throw new Error("Refusing to follow cross-origin pagination.");
      }
    }
  }

  control.scrollIntoView({ block: "center", inline: "nearest" });
  (control as HTMLElement).click();

  return {
    mode,
    selector,
    action: "clicked",
    beforeUrl,
    beforeRecordCount,
    beforeScrollHeight
  };
}
