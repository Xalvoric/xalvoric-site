// Injects the server-rendered app into dist/index.html after `vite build`.
import { readFile, writeFile, rm } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const { render } = await import(pathToFileURL(resolve('.ssr/entry-server.js')).href)
const file = 'dist/index.html'
const html = await readFile(file, 'utf8')
const marker = '<div id="root"></div>'
if (!html.includes(marker)) throw new Error('Root marker not found in dist/index.html')
await writeFile(file, html.replace(marker, `<div id="root">${render()}</div>`))
await rm('.ssr', { recursive: true, force: true })
console.log('Prerendered dist/index.html')
