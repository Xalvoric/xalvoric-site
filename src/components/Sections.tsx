import { faq, process, services } from '../content/site'

export function Services() {
  return (
    <section id="services" className="section services" aria-labelledby="services-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Services</p>
          <h2 id="services-title" className="section-title">
            Three ways we help a business grow.
          </h2>
          <p className="section-lede">
            Take one service or combine them. Each is led by the same team, so your site, your tools and your ads
            speak with one voice.
          </p>
        </header>

        <ol className="service-list">
          {services.map((s) => (
            <li key={s.id} id={s.id} className="service">
              <span className="service-index" aria-hidden="true">
                {s.index}
              </span>
              <div className="service-main">
                <h3 className="service-name">{s.name}</h3>
                <p className="service-lede">{s.lede}</p>
              </div>
              <div className="service-detail">
                <h4 className="mini-label">What’s included</h4>
                <ul className="tick-list">
                  {s.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4 className="mini-label">A good fit if</h4>
                <p className="service-fit">{s.fit}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

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
