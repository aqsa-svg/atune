// Generate PWA PNG icons from the Twilight brand mark (dark square + periwinkle→apricot dot).
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });

function iconSVG({ bg = true, dotScale = 0.66 } = {}) {
  const S = 512;
  const c = S / 2;
  const r = (S * dotScale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
    <defs>
      <radialGradient id="g" cx="36%" cy="30%" r="82%">
        <stop offset="0" stop-color="#F0B49A"/>
        <stop offset="1" stop-color="#9A93F5"/>
      </radialGradient>
    </defs>
    ${bg ? `<rect width="${S}" height="${S}" fill="#151320"/>` : ""}
    <circle cx="${c}" cy="${c}" r="${r}" fill="url(#g)"/>
  </svg>`;
}

async function render(svg, size, out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log("wrote", out);
}

await render(iconSVG({ dotScale: 0.66 }), 512, "public/icon-512.png");
await render(iconSVG({ dotScale: 0.66 }), 192, "public/icon-192.png");
await render(iconSVG({ dotScale: 0.5 }), 512, "public/icon-maskable-512.png"); // smaller dot for maskable safe zone
await render(iconSVG({ dotScale: 0.66 }), 180, "public/apple-touch-icon.png");
console.log("done");
