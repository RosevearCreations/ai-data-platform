import type { PageInspection } from "./types";

export function inspectPage(): PageInspection {
  const cleanText = (value: string | null | undefined, max = 400) =>
    (value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);

  const isVisible = (element: Element) => {
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
    "data-testid"
  ] as const;

  const selectorHint = (element: Element) => {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");

    if (id) {
      return `#${CSS.escape(id)}`;
    }

    const classes = Array.from(element.classList)
      .filter((value) => /^[a-zA-Z0-9_-]+$/.test(value))
      .slice(0, 2);

    if (classes.length) {
      return `${tag}.${classes.map((value) => CSS.escape(value)).join(".")}`;
    }

    const role = element.getAttribute("role");
    if (role) {
      return `${tag}[role="${CSS.escape(role)}"]`;
    }

    return tag;
  };

  const childSignature = (element: Element) => {
    const classes = Array.from(element.classList)
      .filter((value) => /^[a-zA-Z0-9_-]+$/.test(value))
      .slice(0, 3)
      .sort()
      .join(".");

    const role = element.getAttribute("role") ?? "";
    const itemprop = element.getAttribute("itemprop") ?? "";

    return [
      element.tagName.toLowerCase(),
      classes,
      role ? `role:${role}` : "",
      itemprop ? `itemprop:${itemprop}` : ""
    ]
      .filter(Boolean)
      .join("|");
  };

  const bodyElements = Array.from(document.body?.querySelectorAll("*") ?? []);
  const visibleElements = bodyElements.filter(isVisible);
  const elementSnapshots = visibleElements
    .filter((element) => {
      const tag = element.tagName.toLowerCase();
      const meaningfulTag =
        /^(h[1-6]|a|button|img|article|section|li|table|tr|td|th|label|input|select|textarea)$/.test(
          tag
        );
      const hasSemanticAttribute =
        element.hasAttribute("role") ||
        element.hasAttribute("itemprop") ||
        element.hasAttribute("aria-label");

      return meaningfulTag || hasSemanticAttribute;
    })
    .slice(0, 300)
    .map((element) => {
      const attributes: Record<string, string> = {};

      for (const name of safeAttributeNames) {
        const raw = element.getAttribute(name);
        if (raw) {
          attributes[name] = cleanText(raw, 500);
        }
      }

      return {
        tagName: element.tagName.toLowerCase(),
        selectorHint: selectorHint(element),
        text: cleanText(element.textContent),
        attributes
      };
    });

  const candidates = visibleElements
    .slice(0, 2500)
    .map((parent) => {
      const children = Array.from(parent.children).filter(isVisible);

      if (children.length < 2 || children.length > 80) {
        return null;
      }

      const signatureCounts = new Map<string, number>();

      for (const child of children) {
        const signature = childSignature(child);
        signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
      }

      let dominantSignature = "";
      let repeatedChildren = 0;

      for (const [signature, count] of signatureCounts) {
        if (count > repeatedChildren) {
          dominantSignature = signature;
          repeatedChildren = count;
        }
      }

      if (repeatedChildren < 2) {
        return null;
      }

      const matchingChildren = children.filter(
        (child) => childSignature(child) === dominantSignature
      );
      const sampleTexts = matchingChildren
        .map((child) => cleanText(child.textContent, 220))
        .filter((text) => text.length >= 3)
        .slice(0, 3);

      if (sampleTexts.length < 2) {
        return null;
      }

      const repeatRatio = repeatedChildren / children.length;
      const averageTextLength =
        sampleTexts.reduce((sum, text) => sum + text.length, 0) /
        sampleTexts.length;
      const linkCount = matchingChildren.filter(
        (child) => child.matches("a[href]") || child.querySelector("a[href]")
      ).length;
      const imageCount = matchingChildren.filter(
        (child) => child.matches("img") || child.querySelector("img")
      ).length;
      const averageDescendants =
        matchingChildren.reduce(
          (sum, child) => sum + child.querySelectorAll("*").length,
          0
        ) / matchingChildren.length;

      let score =
        repeatRatio * 52 +
        Math.min(repeatedChildren, 10) * 3 +
        Math.min(averageTextLength / 120, 1) * 8 +
        (linkCount / repeatedChildren) * 5 +
        (imageCount / repeatedChildren) * 4 +
        Math.min(averageDescendants / 6, 1) * 5;

      const parentTag = parent.tagName.toLowerCase();

      if (["nav", "header", "footer"].includes(parentTag)) {
        score -= 22;
      }

      if (averageTextLength < 8) {
        score -= 12;
      }

      score = Math.max(0, Math.min(100, Math.round(score)));

      if (score < 58) {
        return null;
      }

      return {
        selectorHint: selectorHint(parent),
        tagName: parentTag,
        signature: dominantSignature,
        childCount: children.length,
        repeatedChildren,
        repeatRatio: Number(repeatRatio.toFixed(2)),
        score,
        sampleTexts
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.score - left.score)
    .filter(
      (candidate, index, all) =>
        all.findIndex(
          (other) =>
            other.selectorHint === candidate.selectorHint &&
            other.signature === candidate.signature
        ) === index
    )
    .slice(0, 12);

  const headings = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .filter(isVisible)
    .slice(0, 50)
    .map((heading) => ({
      level: Number(heading.tagName.slice(1)),
      text: cleanText(heading.textContent, 240)
    }))
    .filter((heading) => Boolean(heading.text));

  const description =
    document.querySelector('meta[name="description"]')?.getAttribute("content") ??
    "";
  const canonicalUrl =
    document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";

  return {
    url: window.location.href,
    title: document.title,
    language: document.documentElement.lang || "",
    inspectedAt: new Date().toISOString(),
    metadata: {
      description: cleanText(description, 500),
      canonicalUrl: cleanText(canonicalUrl, 500)
    },
    counts: {
      elements: bodyElements.length,
      visibleElements: visibleElements.length,
      links: document.querySelectorAll("a[href]").length,
      images: document.images.length,
      headings: headings.length,
      tables: document.querySelectorAll("table").length,
      forms: document.forms.length
    },
    headings,
    elements: elementSnapshots,
    candidates,
    truncated: visibleElements.length > 300
  };
}
