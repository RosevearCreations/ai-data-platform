import type { NextConfig } from "next";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function configuredFrameAncestors() {
  const values = ["'self'"];
  const raw = process.env.AI_DATA_EMBED_ALLOWED_HOST_ORIGINS?.trim();
  if (!raw) return values;

  for (const item of raw.split(",")) {
    const value = item.trim();
    if (!value || value === "*" || value.includes(" ")) {
      throw new Error(
        "AI_DATA_EMBED_ALLOWED_HOST_ORIGINS requires exact origins; wildcards are forbidden."
      );
    }

    const url = new URL(value);
    const localHttp =
      url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
    if (url.protocol !== "https:" && !localHttp) {
      throw new Error(
        "AI_DATA_EMBED_ALLOWED_HOST_ORIGINS requires HTTPS except localhost."
      );
    }

    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        "AI_DATA_EMBED_ALLOWED_HOST_ORIGINS entries must be origins only."
      );
    }

    if (!values.includes(url.origin)) values.push(url.origin);
  }

  return values;
}

const embedCsp = [
  "frame-ancestors " + configuredFrameAncestors().join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/module-embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: embedCsp
          },
          {
            key: "Referrer-Policy",
            value: "origin"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
