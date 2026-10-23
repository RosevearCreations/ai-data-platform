import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DEFAULT_UI_THEME } from "@/lib/ui-theme";

import { ApplicationShell } from "./application-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Platform",
  description: "Shared extraction and data intelligence platform for Rosevear Creations."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme={DEFAULT_UI_THEME}>
      <body>
        <ApplicationShell>{children}</ApplicationShell>
      </body>
    </html>
  );
}
