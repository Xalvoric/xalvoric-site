# Asset manifest and generation records

## Production assets (`public/media/`)

| File | Size | Used by | Source |
| --- | --- | --- | --- |
| `beat1-establish-1280.webp` | 26 KB | Poster (paints first), small-screen/low-memory scene, reduced-motion hero | `assets-src/beat1-establish.png` |
| `beat1-establish-2048.webp` | 109 KB | Scene beat 1 | same |
| `beat2-detail-1280.webp` | 36 KB | Scene beat 2 (fallback / small) | `assets-src/beat2-detail.png` |
| `beat2-detail-2048.webp` | 132 KB | Scene beat 2 | same |
| `beat3-resolve-1280.webp` | 24 KB | Scene beat 3 (fallback / small) | `assets-src/beat3-resolve.png` |
| `beat3-resolve-2048.webp` | 100 KB | Scene beat 3 | same |
| `og.jpg` | 25 KB | Social share image | `assets-src/beat1-establish.png` |

Encoded with `npm run media` (`scripts/encode-media.mjs`, sharp, WebP quality 88 / 85). Originals (2048 × 1152 PNG) are kept in `assets-src/` as the durable source.

## Generation records (Higgsfield)

Account plan at the time: free, 6.00 credits. Spent: 0.45 credits (balance after: 5.55).

All three stills: model `z_image` (Z Image, Tongyi-MAI), aspect ratio `16:9`, output 2048 × 1152 PNG, 0.15 credits each, no reference image (the model takes text only).

| Beat | Job ID | Result |
| --- | --- | --- |
| 1 Establish | `084a7c91-bee8-49ef-b920-7dd4980ea317` | `https://d8j0ntlcm91z4.cloudfront.net/user_3F29Woz1aBAOITzurSEtKBuDuX8/hf_20261018_015439_084a7c91-bee8-49ef-b920-7dd4980ea317.png` |
| 2 Detail | `b273a6b3-ea33-4f39-ac7c-d72b7f6b2560` | `https://d8j0ntlcm91z4.cloudfront.net/user_3F29Woz1aBAOITzurSEtKBuDuX8/hf_20261018_015515_b273a6b3-ea33-4f39-ac7c-d72b7f6b2560.png` |
| 3 Resolve | `ff06b09c-8434-4381-81d1-40d9fd40552a` | `https://d8j0ntlcm91z4.cloudfront.net/user_3F29Woz1aBAOITzurSEtKBuDuX8/hf_20261018_015554_ff06b09c-8434-4381-81d1-40d9fd40552a.png` |

### Prompts

**Beat 1, establish**

> Cinematic wide establishing shot, strictly black and white monochrome. A single tall faceted monolith of polished black obsidian glass stands alone in the exact center of a vast dark void, on a flat wet black ground. Low drifting fog hugs the ground. One hard white rim light from behind outlines the sharp crystalline edges of the monolith with thin bright highlights; soft mirror reflections on the wet ground beneath it. Monolith occupies the central third of the frame, about 45% of frame height, with large empty dark negative space on left and right. Deep blacks, subtle film grain, 35mm anamorphic lens, eye-level camera, calm and precise. No text, no letters, no logos, no people, no color.

**Beat 2, detail**

> Extreme close-up macro detail, strictly black and white monochrome. The polished black obsidian surface of a tall faceted monolith fills the center of the frame: two sharp vertical facet edges meet, a hard white rim light glints along one edge. Very thin bright white hairline light traces run across the dark glass like a precise circuit pattern, softly glowing. Shallow depth of field, faint fog drifting at the edges, dark negative space on the left third. Deep blacks, subtle film grain, 85mm lens, calm and precise. No text, no letters, no numbers, no logos, no people, no color.

**Beat 3, resolve**

> Cinematic ultra-wide resolved composition, strictly black and white monochrome. A single tall faceted obsidian black glass obelisk monolith with a pyramid tip stands on a wet black mirror floor, placed at the right third of the frame, small in the frame, about 35% of frame height. A soft white horizon glow of fog behind it, its reflection on the wet floor. The entire left half of the frame is calm empty dark negative space with smooth gradient. Hard white rim light on the monolith edges. Deep blacks, subtle film grain, 24mm lens, slightly high camera, serene and confident. No text, no letters, no logos, no people, no color.

### Attempts that did not generate

| Model | Outcome | Charged |
| --- | --- | --- |
| `gpt_image_2_5` (low, 1k, 16:9), beat 1 prompt | Rejected: "Requires basic plan or higher." | No |
| `z_image`, beat 3 prompt (first try) | Rejected: 429 rate limit. Resubmitted after beat 2 finished. | No |

### Video (not generated)

Seedance 2.5 is available on this connection (modes `t2v`, `omni_reference`; 4–30 s; 480p/720p/1080p; aspect ratios include 16:9 and 9:16). Quoted cost for a 5 s clip without audio: 15 credits at 480p, 35 credits at 720p. Both exceed the 6-credit balance, so no video was generated. The hero uses a canvas camera move across the three stills instead.

If you add credits later, a suggested job: `seedance_2_5`, mode `omni_reference`, `start_image` = beat 1 job ID, `end_image` = beat 3 job ID, 16:9, 720p, 6–8 s, `generate_audio: false`, prompt asking for a slow continuous dolly toward and then past the monolith, stable lighting and geometry, no cuts, no text, no morphing. The scroll component would then need a video or frame-sequence source in place of the stills.

## Notes

- The three stills come from separate text-only generations, so the monolith's shape differs slightly between beats. The crossfades and the push-in / pull-back framing are designed so this reads as a cut between shots rather than a continuous object.
- All readable text, the logo, navigation and buttons are HTML, not part of the images.
