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

export interface VisualPickResult {
  status: "picked" | "cancelled";
  selector: string;
  selectorMatchCount: number;
  generalizedSelector: string;
  generalizedMatchCount: number;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  rect: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

export interface SelectorPreviewResult {
  selector: string;
  matchCount: number;
  visibleMatchCount: number;
  sampleTexts: string[];
  truncated: boolean;
}

export interface RecordSample {
  index: number;
  text: string;
  link: string;
  image: string;
  descendantCount: number;
  fieldHints: string[];
}

export interface RecordGroupCandidate {
  containerSelector: string;
  recordSelector: string;
  source: "auto" | "selected-field";
  recordCount: number;
  visibleRecordCount: number;
  confidence: number;
  metrics: {
    repeatRatio: number;
    structuralConsistency: number;
    textCoverage: number;
    linkCoverage: number;
    imageCoverage: number;
    averageDescendants: number;
  };
  diagnostics: string[];
  samples: RecordSample[];
}

export interface RecordDetectionResult {
  url: string;
  detectedAt: string;
  mode: "auto" | "selected-field";
  inputSelector: string;
  candidates: RecordGroupCandidate[];
  inspectedParents: number;
  truncated: boolean;
}

export interface RecordPreviewResult {
  recordSelector: string;
  matchCount: number;
  visibleMatchCount: number;
  sampleTexts: string[];
  truncated: boolean;
}
