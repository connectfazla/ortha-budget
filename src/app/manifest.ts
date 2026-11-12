import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ortha Budget",
    short_name: "Budget",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f3",
    theme_color: "#f6f6f3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
