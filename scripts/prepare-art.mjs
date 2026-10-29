import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("src/assets", { recursive: true });
await sharp("art/source/greenhaven.png")
  .resize(1440)
  .webp({ quality: 88 })
  .toFile("src/assets/greenhaven.webp");
await sharp("art/source/mara.png")
  .resize(560)
  .webp({ quality: 88 })
  .toFile("src/assets/mara.webp");
for (const [i, name] of [
  "hall",
  "hall2",
  "sawmill",
  "blacksmith",
  "kitchen",
  "farm",
].entries())
  await sharp("art/source/buildings.png")
    .extract({
      left: (i % 3) * 512,
      top: Math.floor(i / 3) * 512,
      width: 512,
      height: 512,
    })
    .resize(384)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(`src/assets/${name}.webp`);
// The same hall emblem is used for both Home Screen icons, not a temporary glyph.
for (const size of [192, 512]) {
  const sprite = await sharp("src/assets/hall.webp")
    .resize(Math.round(size * 0.85))
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#244b3c" },
  })
    .composite([{ input: sprite, gravity: "center" }])
    .png()
    .toFile(`public/icon-${size}.png`);
}
