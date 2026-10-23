import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ApplicationShell } from "./application-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Platform",
  description: "Shared extraction and data intelligence platform for Rosevear Creations."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ApplicationShell>{children}</ApplicationShell>
      </body>
    </html>
  );
}
