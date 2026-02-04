// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://nagi-6tu.pages.dev",
  integrations: [sitemap()],
  vite: {
    server: {
      allowedHosts: [
        "localhost",
        "4321-iyocek6w1s4bc62qymi5i-7a02f538.sg1.manus.computer",
        ".manus.computer"
      ],
    },
  },
});
