// Regenerate broken Git-LFS-pointer seed images with real gradient placeholders.
// Keeps each filename + extension; outputs a valid image in the matching format.
import { readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_ROOT = join(__dirname, "..", "public", "assets", "images");

const formatFor = (ext) => {
    switch (ext.toLowerCase()) {
        case ".jpg":
        case ".jpeg": return { fn: (s) => s.jpeg({ quality: 82 }) };
        case ".png": return { fn: (s) => s.png() };
        case ".webp": return { fn: (s) => s.webp({ quality: 82 }) };
        case ".avif": return { fn: (s) => s.avif({ quality: 55 }) };
        default: return { fn: (s) => s.jpeg({ quality: 82 }) };
    }
};

// Deterministic pleasant color from an index (golden-angle hue spread).
const palette = (i) => {
    const h = (i * 47) % 360;
    const c1 = `hsl(${h} 55% 58%)`;
    const c2 = `hsl(${(h + 35) % 360} 60% 42%)`;
    return [c1, c2];
};

function svgGradient(w, h, i, label) {
    const [c1, c2] = palette(i);
    const fontSize = Math.round(Math.min(w, h) * 0.42);
    return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${label ? `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" fill="rgba(255,255,255,0.92)"
        font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="${fontSize}">${label}</text>` : ""}
</svg>`);
}

async function regen(dir, { w, h, withLabel }) {
    const full = join(IMG_ROOT, dir);
    const files = await readdir(full);
    let done = 0;
    for (const f of files) {
        const ext = extname(f);
        const p = join(full, f);
        const info = await stat(p);
        // Only replace tiny files (LFS pointers ~130 bytes). Skip real images.
        if (info.size > 2048) continue;
        const idx = parseInt(f.replace(/\D/g, "") || "0", 10);
        const label = withLabel ? String((idx % 99) + 1) : "";
        const svg = svgGradient(w, h, idx, label);
        const out = await formatFor(ext).fn(sharp(svg)).toBuffer();
        await writeFile(p, out);
        done++;
    }
    console.log(`${dir}: regenerated ${done}/${files.length}`);
}

await regen("seed-avatars", { w: 400, h: 400, withLabel: true });
await regen("seed-covers", { w: 960, h: 540, withLabel: false });
console.log("done");
