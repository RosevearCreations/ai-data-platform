export interface ElementSnapshot {
  tagName: string;
  selectorHint: string;
  text: string;
  attributes: Record<string, string>;
}

export interface ContainerCandidate {
  selectorHint: string;
  tagName: string;
  signature: string;
  childCount: number;
  repeatedChildren: number;
  repeatRatio: number;
  score: number;
  sampleTexts: string[];
}

export interface PageInspection {
  url: string;
  title: string;
  language: string;
  inspectedAt: string;
  metadata: {
    description: string;
    canonicalUrl: string;
  };
  counts: {
    elements: number;
    visibleElements: number;
    links: number;
    images: number;
    headings: number;
    tables: number;
    forms: number;
  };
  headings: Array<{
    level: number;
    text: string;
  }>;
  elements: ElementSnapshot[];
  candidates: ContainerCandidate[];
  truncated: boolean;
}
