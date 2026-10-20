import { faq, process } from '../content/site'

export function Process() {
  return (
    <section id="process" className="section process" aria-labelledby="process-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Process</p>
          <h2 id="process-title" className="section-title">
            Clear steps, visible progress.
          </h2>
        </header>
        <ol className="process-grid">
          {process.map((p) => (
            <li key={p.step} className="process-step">
              <span className="process-num" aria-hidden="true">
                {p.step}
              </span>
              <h3 className="process-name">{p.name}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <div className="container faq-layout">
        <header className="section-head">
          <p className="eyebrow">FAQ</p>
          <h2 id="faq-title" className="section-title">
            Questions, answered plainly.
          </h2>
        </header>
        <div className="faq-list">
          {faq.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>
                <span>{item.q}</span>
                <span className="faq-icon" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
