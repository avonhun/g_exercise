# The Living World · starter art direction

The art edition replaces the prototype SVG scene with an original generated pixel-art landscape, six coordinated transparent building sprites, and a storybook watercolor portrait. All images are bundled locally; there are no runtime art services.

- World: 520 × 400 logical canvas; isometric ground tiles approximately 64 × 36, 2:1 horizontal diamond projection. Final sprites should be authored at integer scale, with nearest-neighbor rendering.
- Buildings: one 64 × 36 footprint, 80 × 96 sprite envelope. Hall upgrade adds a tower and banner. World, character, and UI assets are separate layers.
- Light: upper left. Roof left planes are dark terracotta, walls cream, contact shadows deep green at low opacity.
- Palette: water `#305958`, pine `#385c45`, grass `#8b9a68`, timber `#795435`, plaster `#e0cca0`, roof `#c17a4b`, paper `#f4f1e8`, ink `#263e36`.
- UI: local Georgia serif for narrative and headings; system sans for small labels. No network fonts. Resource symbols are temporary text icons; replace with a consistent original 16 × 16 icon sheet.
- Character layer: ink-like contours, muted watercolor colors, portrait envelope 100 × 110. Mara is an original prototype SVG portrait.
- Animation: optional ambient 2–4 frame loops, no required timing-dependent interactions. Respect reduced-motion preferences when introducing animation.
- Export target: transparent PNG world sprites at 1× and 2×; narrative art 800 × 1000 WebP; app icons 192 and 512 PNG with safe-area margin.

Next art work: normalize a small hand-pixelled ground/river/tree sheet; replace prototype houses individually without changing map footprints. Do not generate a large asset set before perspective and readability are validated on an iPhone.


## Art edition assets

Source masters are retained under `art/source/` (original image generation for this project). `npm run art:prepare` uses Sharp to export an optimized 1440 × 960 WebP landscape, 384 × 384 building sprites from a regular 3 × 2 master, a 560px portrait, and matching 192/512px PNG app icons. This is an export/cropping pipeline, not procedural replacement art. The portrait is deliberately painted rather than pixel art.

`World.tsx` anchors each independent building to a consistent map position. Unbuilt infrastructure is absent; the upgraded hall swaps its own sprite. All five built locations are keyboard-accessible. Hashed art filenames are included in the worker's complete precache, allowing safe offline upgrades. Art assets total approximately 1.2 MB. The mobile and fully developed village are inspected in Chromium screenshots. Final visual approval and real iPhone review remain necessary before calling the entire product a finished release.

## Interface edition · 0.3

The interface takes the form of a field almanac: ink-blue `#26343c`, vermilion `#ae4028`, ochre `#d7b478` and neutral paper `#eeede8`. Use Bitter slab-serif 600/700 for headings and Barlow 400/600 for reading and labels. Both are self-hosted, OFL-licensed, bundled and precached; license copies are under `public/licenses/`. No runtime font requests.

`Icon.tsx` contains a single original 24-unit woodcut-inspired icon family. Resource, navigation, weather and action marks use consistent silhouettes without platform emoji. Corners are square, sections separated with rules, and buttons use a firm lower edge rather than floating cards. On phones, the village is deliberately full bleed; its surrounding text retains an 18px inset. Do not restore a duplicate framed map heading or the earlier green rounded-card treatment.
