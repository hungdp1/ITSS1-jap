// Replace gradient placeholder seed images with real photos from ~/Downloads.
//   avatar/ -> seed-avatars/* + avatars/*   (400x400, face-aware crop)
//   group/  -> seed-covers/*                (1200x675, keeps each file's format)
//   event/  -> NEW seed-events/event-001..NN (1200x675 jpg)  + caller repoints DB
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG = join(__dirname, "..", "public", "assets", "images");
const DL = join(homedir(), "Downloads");

const list = (dir, exts = [".jpg", ".jpeg", ".png", ".webp", ".avif"]) =>
    readdirSync(dir)
        .filter((f) => exts.includes(extname(f).toLowerCase()))
        .sort()
        .map((f) => join(dir, f));

const encoder = (ext) => (p) => {
    switch (ext.toLowerCase()) {
        case ".png": return p.png();
        case ".webp": return p.webp({ quality: 84 });
        case ".avif": return p.avif({ quality: 58 });
        default: return p.jpeg({ quality: 84, mozjpeg: true });
    }
};

async function render(srcPath, w, h, ext, position) {
    const buf = await encoder(ext)(
        sharp(srcPath).rotate().resize(w, h, { fit: "cover", position })
    ).toBuffer();
    return buf;
}

// 1) AVATARS -> seed-avatars + avatars
const avatarSrc = list(join(DL, "avatar"));
let ai = 0;
for (const dir of ["seed-avatars", "avatars"]) {
    const targetDir = join(IMG, dir);
    const targets = readdirSync(targetDir).filter((f) => /\.(jpg|jpeg|png|webp|avif)$/i.test(f)).sort();
    for (const f of targets) {
        const src = avatarSrc[ai++ % avatarSrc.length];
        writeFileSync(join(targetDir, f), await render(src, 400, 400, extname(f), "attention"));
    }
    console.log(`${dir}: ${targets.length} avatars applied`);
}

// 2) GROUPS -> seed-covers (preserve each target's extension/format)
const groupSrc = list(join(DL, "group"));
{
    const targetDir = join(IMG, "seed-covers");
    const targets = readdirSync(targetDir).filter((f) => /\.(jpg|jpeg|png|webp|avif)$/i.test(f)).sort();
    let gi = 0;
    for (const f of targets) {
        const src = groupSrc[gi++ % groupSrc.length];
        writeFileSync(join(targetDir, f), await render(src, 1200, 675, extname(f), "centre"));
    }
    console.log(`seed-covers: ${targets.length} group covers applied`);
}

// 3) EVENTS -> new seed-events/event-001..NN.jpg
const eventSrc = list(join(DL, "event"));
{
    const targetDir = join(IMG, "seed-events");
    mkdirSync(targetDir, { recursive: true });
    let n = 0;
    for (let i = 0; i < eventSrc.length; i++) {
        const name = `event-${String(i + 1).padStart(3, "0")}.jpg`;
        writeFileSync(join(targetDir, name), await render(eventSrc[i], 1200, 675, ".jpg", "centre"));
        n++;
    }
    console.log(`seed-events: ${n} event images created (event-001..${String(n).padStart(3, "0")}.jpg)`);
    console.log(`EVENT_COUNT=${n}`);
}
console.log("done");
