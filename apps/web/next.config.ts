import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  devIndicators: false,

  /*
   * Next's dev server trusts `localhost` and refuses `/_next/*` to any other
   * origin, so opening the Desk at http://127.0.0.1:3000 loses a chunk to a 403
   * and React never finishes hydrating. The page renders and nothing is
   * clickable — which reads as Relic being broken rather than as a host name
   * being spelled the other way.
   *
   * The two names are the same machine, and a GM who typed the numeric one has
   * not made a mistake worth a dead page.
   */
  allowedDevOrigins: ["127.0.0.1"]
};

export default config;
