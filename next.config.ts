import { join } from "node:path";
import type { NextConfig } from "next";

/**
 * The Presence Core's card runtime (a sandboxed Three.js document) is built by `npm run presence:cards` into
 * .generated/card-runtime.js and imported by the surface as "aion:card-runtime" (src/presence-core/surface/cards/host.ts).
 */
const CARD_RUNTIME = join(process.cwd(), ".generated", "card-runtime.js");

// A server deployment (not a static export): /api/realtime/token needs OPENAI_API_KEY at request time, and the Presence
// host (/api/presence/*) lives in the server process.
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // The Presence Core's tool server runs in-process on Node.js; these stay ordinary Node modules, not bundled.
  serverExternalPackages: ["@modelcontextprotocol/server", "@modelcontextprotocol/client", "@modelcontextprotocol/core", "@modelcontextprotocol/ext-apps"],
  turbopack: { resolveAlias: { "aion:card-runtime": "./.generated/card-runtime.js" } },
  webpack: (webpackConfig, { webpack }) => {
    // "aion:" reads as a URI scheme to webpack, so the request is replaced before resolution (an alias would be too late).
    webpackConfig.plugins.push(new webpack.NormalModuleReplacementPlugin(/^aion:card-runtime$/, CARD_RUNTIME));
    return webpackConfig;
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        // Only this origin may use the microphone; nothing needs the camera or geolocation.
        { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }, {
      // Curated brand assets are pictures, not documents: an SVG opened directly may not run script or load anything.
      source: "/assets/:path*",
      headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox" }],
    }];
  },
};
export default config;
