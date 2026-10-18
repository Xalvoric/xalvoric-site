// Re-encodes the approved source stills in assets-src/ into the web sizes
// served from public/media/. Run with: npm run media
import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'

const beats = ['beat1-establish', 'beat2-detail', 'beat3-resolve']
const sizes = [
  { width: 2048, quality: 88 },
  { width: 1280, quality: 85 },
]

await mkdir('public/media', { recursive: true })

for (const beat of beats) {
  for (const { width, quality } of sizes) {
    const out = `public/media/${beat}-${width}.webp`
    await sharp(`assets-src/${beat}.png`)
      .resize({ width })
      .webp({ quality, effort: 6 })
      .toFile(out)
    const { size } = await stat(out)
    console.log(`${out}  ${(size / 1024).toFixed(0)} KB`)
  }
}

// Social preview image.
await sharp('assets-src/beat1-establish.png')
  .resize({ width: 1200, height: 630, fit: 'cover' })
  .jpeg({ quality: 78, mozjpeg: true })
  .toFile('public/media/og.jpg')
console.log('public/media/og.jpg')
