// Build-time prerender entry: renders the page to static HTML so the headline,
// copy and poster paint before JavaScript loads. See scripts/prerender.mjs.
import { renderToString } from 'react-dom/server'
import App from './App'

export function render() {
  return renderToString(<App />)
}
