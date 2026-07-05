import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attune — AI wellness companion",
    short_name: "Attune",
    description:
      "An AI wellness coach grounded in your own data — it learns your patterns and never makes things up.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#151320",
    theme_color: "#151320",
    categories: ["health", "lifestyle", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
