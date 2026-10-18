# Xalvoric website

Single-page marketing site for Xalvoric (website development, AI agency, ad generation) with a cinematic, scroll-driven hero.

Stack: Vite + React 19 + TypeScript, GSAP ScrollTrigger (scroll progress only), self-hosted Geist fonts. The production HTML is prerendered at build time so the headline, copy and poster paint before JavaScript loads.

## Commands

Requires Node 20+ (tested on Node 22).

```bash
npm install
```

```bash
npm run dev        # dev server at http://localhost:5173
```

```bash
npm run build      # typecheck, client build, prerender into dist/
```

```bash
npm run preview    # serve dist/ at http://localhost:4173
```

```bash
npm run lint       # oxlint
```

```bash
npm run media      # re-encode assets-src/*.png into public/media/*.webp
```

## Where to edit

| What | File |
| --- | --- |
| All visible copy (hero beats, services, process, FAQ, contact) | `src/content/site.ts` |
| Contact inbox (`CONTACT_EMAIL`) | `src/content/site.ts` |
| Colours, fonts, spacing, type scale | top of `src/styles.css` (`:root` tokens) |
| Hero images (paths, alt text) | `src/scene/config.ts` → `layers` |
| Scroll length and timing | `src/scene/config.ts` → `SCROLL_LENGTH_VH`, each layer's `window` and `keys`, `beats` |
| Desktop vs phone framing | `keys` (landscape) and `portraitKeys` (phones) in `src/scene/config.ts` |
| Copy position over the scene | `.scene-beat--*` rules in `src/styles.css` |
| Top-corner labels in the hero | `hero.corners` in `src/content/site.ts` |
| Fog/glitch transitions (timing) | `transitions` in `src/scene/config.ts`; look in `src/scene/effects.ts` |
| Line build-in over the monolith | `outline` in `src/scene/config.ts` (points are image coordinates of beat 1) |
| Callouts from monolith to service links | `callouts` in `src/scene/config.ts` (points are image coordinates of beat 2) |
| Cursor tilt strength (or off) | `TILT` in `src/scene/config.ts` |
| Page title, description, social image | `index.html` |

### How scroll timing works

`p` is the hero section's scroll progress, 0 at its top, 1 at its bottom. Every number in `src/scene/config.ts` is in those units.

- `window: [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd]` sets when an image or copy block is visible.
- `keys` are camera keyframes: `zoom` (1 = image just covers the viewport), `fx`/`fy` (the image point placed at screen centre, 0–1).
- The renderer is a pure function of `p` (`src/scene/timeline.ts`), so the same scroll position always draws the same frame, forwards, backwards, after a resize or after a reload halfway down.

### Replacing the hero imagery

1. Put new 16:9 PNGs (at least 2048 px wide) in `assets-src/` using the same names, or add names to `scripts/encode-media.mjs` and `layers`.
2. Run `npm run media`.
3. Adjust `keys`/`portraitKeys` so the subject stays clear of the copy at desktop and phone widths.

## How the hero works

- `src/components/ScrollScene.tsx` holds the whole sequence. The section is `SCROLL_LENGTH_VH` tall with a `position: sticky` stage, so normal page scrolling drives it; there is no scroll hijacking or smoothing layer.
- One ScrollTrigger reports progress; one `gsap.ticker` callback redraws the canvas only when progress or size changed.
- Three stills are drawn to a `<canvas>` with a slow push-in, a crossfade into a detail shot, and a pull-back reveal. Video scrubbing was not used because no video was generated (see `ASSETS.md`).
- A poster `<img>` paints immediately; the canvas fades in once the first still is decoded. The first still loads first, then the other two.
- One image width is chosen per visit (1280 or 2048 px). At most three bitmaps are kept in memory. If a still has not loaded, the nearest earlier still is held on its last frame instead of going blank. If a 2048 file fails, the 1280 file is tried.
- Between beats, a fog-and-glitch transition (screened ghost copies, horizontal slice offsets, a grey fog veil) peaks at each crossfade. The slices are seeded from progress, so scrolling back replays the same frames. The offscreen buffer it needs is allocated when the browser is idle.
- On load, hairlines trace the monolith's outline (1.5 s), settle to a faint layer, and fade out as scrolling starts. In beat 2, leader lines tie each service link to a point on the monolith edge (desktop layout only). Both are an SVG layer driven by the same camera maths as the canvas, so they stay pinned through the camera move.
- With a mouse, the frame shifts slightly toward the pointer and the copy drifts a few pixels the other way. Touch devices get no tilt.
- On resize the visitor stays at the same point in the sequence, not the same pixel offset.
- Keyboard focus moving into hero links scrolls the scene to that beat.
- `prefers-reduced-motion: reduce` (or `?motion=off`) replaces the sequence with the same three frames and copy in normal document flow.

## Integrations and placeholders

| Item | Status |
| --- | --- |
| Contact form | **Placeholder.** `CONTACT_EMAIL` is empty, so the form validates input and then says clearly that it is not connected. Nothing is sent or stored. When you set an address, it opens the visitor's email app with a pre-filled draft (`mailto:`), still with no server. |
| Logo | **Placeholder.** No logo was supplied. `src/components/Mark.tsx` and `public/favicon.svg` are a simple faceted X. |
| Hero imagery | Real, generated with Higgsfield (Z Image). See `ASSETS.md`. |
| Analytics, CMS, booking, newsletter | None configured. |
| Testimonials, client logos, statistics | None. None were supplied, so none were invented. |

## Deploying (Vercel)

`vercel.json` is included. On Vercel: import the repository, set the project root to this folder, keep the detected build command (`npm run build`) and output directory (`dist`). No environment variables are needed and no credentials are used anywhere in the site.

Static assets are served from `public/media/` alongside the site, so no separate asset hosting is required. `vercel.json` sets long cache headers for hashed `/assets/*` and a 7-day cache for `/media/*`; if you replace an image without renaming it, expect up to a week of old copies in caches, or rename the file.

Any static host works: upload the contents of `dist/` after `npm run build`.

## Assumptions

- No logo, photos, real facts or contact address were supplied, so the copy describes the services without claims, prices, client names or numbers.
- Visual subject (a black glass monolith) and palette (black, white, greys) were chosen to fit the "dark black and white" brief.
- The reference site (igloo.inc) was studied from a screen recording you supplied: its build-in, fog/glitch transitions, cursor response, pinned callouts and corner labels. Those ideas were reinterpreted for still images; no code, text, media or layout was copied.
