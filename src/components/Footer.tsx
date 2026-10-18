import { brand, nav } from '../content/site'
import { Mark } from './Mark'

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a className="wordmark wordmark--lg" href="#top">
            <Mark size={30} />
            <span>{brand.name}</span>
          </a>
          <p>{brand.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="footer-nav">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="container footer-base">
        <p>
          © {YEAR} {brand.name}
        </p>
        <p>Hero imagery generated with AI.</p>
      </div>
    </footer>
  )
}
