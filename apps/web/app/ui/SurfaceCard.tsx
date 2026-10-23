import type { ReactNode } from "react";

import { HelpInfo } from "@/app/help/HelpInfo";
import type { HelpTopicKey } from "@/app/help/help-content";

export type SurfaceCardVariant =
  | "default"
  | "raised"
  | "metric"
  | "interactive"
  | "inset";

export type SurfaceCardStatus =
  | "neutral"
  | "healthy"
  | "attention"
  | "critical"
  | "info";

export function SurfaceCard({
  children,
  className = "",
  helpTopic,
  variant = "default",
  status = "neutral",
  as: Tag = "article"
}: {
  children: ReactNode;
  className?: string;
  helpTopic?: HelpTopicKey;
  variant?: SurfaceCardVariant;
  status?: SurfaceCardStatus;
  as?: "article" | "section" | "div";
}) {
  const classes = [
    "uiSurfaceCard",
    "uiSurfaceCard--" + variant,
    "uiSurfaceCard--" + status,
    helpTopic ? "cardHelpSurface" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes}>
      {helpTopic ? <HelpInfo topic={helpTopic} inline /> : null}
      {children}
    </Tag>
  );
}
