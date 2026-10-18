// Scroll timing and camera moves for the hero sequence.
//
// Everything is expressed against `p`, the scroll progress of the pinned
// hero section: 0 = section top reaches viewport top, 1 = section bottom
// reaches viewport bottom. Change numbers here to retime the sequence;
// the renderer turns them into pixels.

/** Camera framing for one still. zoom 1 = image just covers the viewport. */
export type Cam = {
  zoom: number
  /** Image point (0..1) placed at the viewport centre, clamped to stay covered. */
  fx: number
  fy: number
}

export type CamKey = Cam & { p: number }

/** [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd] in progress units. */
export type Span = [number, number, number, number]

export type SceneLayer = {
  id: string
  /** Base path without size suffix; files are `${src}-1280.webp` and `${src}-2048.webp`. */
  src: string
  alt: string
  window: Span
  keys: CamKey[]
  /** Optional framing for portrait viewports (phones). Falls back to `keys`. */
  portraitKeys?: CamKey[]
}

/** Section height in viewport heights. More = slower, calmer sequence. */
export const SCROLL_LENGTH_VH = 420

export const layers: SceneLayer[] = [
  {
    id: 'establish',
    src: '/media/beat1-establish',
    alt: 'A tall black glass monolith standing alone in fog on a wet, dark floor, lit from behind.',
    window: [0, 0, 0.3, 0.42],
    keys: [
      { p: 0, zoom: 1, fx: 0.425, fy: 0.5 },
      { p: 0.42, zoom: 2.1, fx: 0.425, fy: 0.42 },
    ],
  },
  {
    id: 'detail',
    src: '/media/beat2-detail',
    alt: 'Close-up of the monolith edge, with fine lines of light running across the dark glass.',
    window: [0.3, 0.42, 0.62, 0.74],
    keys: [
      { p: 0.3, zoom: 1.0, fx: 0.47, fy: 0.55 },
      { p: 0.74, zoom: 1.32, fx: 0.44, fy: 0.45 },
    ],
    portraitKeys: [
      { p: 0.3, zoom: 1.0, fx: 0.42, fy: 0.55 },
      { p: 0.74, zoom: 1.2, fx: 0.4, fy: 0.45 },
    ],
  },
  {
    id: 'resolve',
    src: '/media/beat3-resolve',
    alt: 'The monolith seen from further away, set to one side of a calm, empty frame.',
    window: [0.62, 0.74, 2, 2],
    keys: [
      { p: 0.62, zoom: 1.5, fx: 0.5, fy: 0.42 },
      { p: 1, zoom: 1.2, fx: 0.43, fy: 0.5 },
    ],
    portraitKeys: [
      { p: 0.62, zoom: 1.3, fx: 0.545, fy: 0.4 },
      { p: 1, zoom: 1.05, fx: 0.545, fy: 0.46 },
    ],
  },
]

/** When each block of hero copy is on screen. `focusAt` is where keyboard focus scrolls to. */
export const beats: { id: 'establish' | 'detail' | 'resolve'; window: Span; focusAt: number }[] = [
  { id: 'establish', window: [0, 0, 0.2, 0.29], focusAt: 0 },
  { id: 'detail', window: [0.4, 0.47, 0.6, 0.67], focusAt: 0.53 },
  { id: 'resolve', window: [0.77, 0.85, 2, 2], focusAt: 1 },
]
