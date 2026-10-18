import { useEffect, useRef, useState } from 'react'
import { brand, nav } from '../content/site'
import { Mark } from './Mark'

export function Nav() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const jumpTo = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current!
    const button = buttonRef.current!
    const focusables = () => [button, ...panel.querySelectorAll<HTMLElement>('a[href]')]
    focusables()[1]?.focus()
    document.documentElement.classList.add('menu-open')
    // Hide the page behind the menu from assistive tech and the tab order.
    const behind = [document.getElementById('main'), document.querySelector('.site-footer')]
    behind.forEach((el) => el?.setAttribute('inert', ''))

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      // Keep focus inside the toggle + menu links while the menu is open.
      const items = focusables()
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    const onWide = (e: MediaQueryListEvent) => e.matches && setOpen(false)
    const mql = window.matchMedia('(min-width: 860px)')
    document.addEventListener('keydown', onKey)
    mql.addEventListener('change', onWide)
    return () => {
      document.removeEventListener('keydown', onKey)
      mql.removeEventListener('change', onWide)
      document.documentElement.classList.remove('menu-open')
      behind.forEach((el) => el?.removeAttribute('inert'))
      const target = jumpTo.current && document.querySelector<HTMLElement>(jumpTo.current)
      jumpTo.current = null
      if (target) {
        // A menu link was chosen: move focus to that section so keyboard users continue from there.
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        requestAnimationFrame(() => target.focus({ preventScroll: true }))
      } else {
        button.focus()
      }
    }
  }, [open])

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="header-inner">
        <a className="wordmark" href="#top" aria-label={`${brand.name}, back to top`}>
          <Mark />
          <span>{brand.name}</span>
        </a>

        <nav className="nav-desktop" aria-label="Primary">
          <ul>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <a className="btn btn-small btn-primary nav-cta" href="#contact">
          Start a project
        </a>

        <button
          ref={buttonRef}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="menu-toggle-label">{open ? 'Close' : 'Menu'}</span>
          <span className="menu-toggle-icon" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={panelRef}
        id="mobile-menu"
        className="mobile-menu"
        data-open={open}
        hidden={!open}
      >
        <nav aria-label="Mobile">
          <ul>
            {[...nav, { label: 'Start a project', href: '#contact' }].map((item, i) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => {
                    jumpTo.current = item.href
                    setOpen(false)
                  }}
                >
                  <span className="mobile-menu-index" aria-hidden="true">
                    0{i + 1}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
