// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://nagi-6tu.pages.dev",
  output: "server",
  adapter: vercel({
    imageService: true,
  }),
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  integrations: [sitemap(), react()],
  vite: {
    server: {
      allowedHosts: [
        "localhost",
        "4321-iyocek6w1s4bc62qymi5i-7a02f538.sg1.manus.computer",
        ".manus.computer"
      ],
    },
    ssr: {
      noExternal: ['@toast-ui/editor', '@toast-ui/react-editor']
    }
  },
});
