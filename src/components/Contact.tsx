import { useState, type FormEvent } from 'react'
import { CONTACT_EMAIL, brand, contact } from '../content/site'

type Status = { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'handoff' } | { kind: 'unconfigured' }

export function Contact() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const configured = CONTACT_EMAIL.trim().length > 0

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      setStatus({ kind: 'error', message: 'Please complete the required fields.' })
      return
    }
    if (!configured) {
      setStatus({ kind: 'unconfigured' })
      return
    }
    const data = new FormData(form)
    const get = (k: string) => String(data.get(k) ?? '').trim()
    const subject = `Project enquiry: ${get('service') || 'General'}${get('company') ? ` / ${get('company')}` : ''}`
    const body = [
      `Name: ${get('name')}`,
      `Email: ${get('email')}`,
      get('company') && `Company: ${get('company')}`,
      `Service: ${get('service')}`,
      '',
      get('message'),
    ]
      .filter((line) => line !== '')
      .join('\n')
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setStatus({ kind: 'handoff' })
  }

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="container contact-layout">
        <header className="section-head">
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title" className="section-title section-title--xl">
            {contact.title}
          </h2>
          <p className="section-lede">{contact.body}</p>
          {configured ? (
            <p className="contact-direct">
              Or email us directly at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          ) : (
            <p className="notice" role="note">
              <strong>Not connected yet.</strong> This form does not send messages until a contact address is
              configured. Nothing you type here is stored or sent.
            </p>
          )}
        </header>

        <form className="contact-form" noValidate onSubmit={onSubmit} aria-describedby="form-status">
          <div className="field">
            <label htmlFor="f-name">Name</label>
            <input id="f-name" name="name" type="text" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="f-email">Email</label>
            <input id="f-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="f-company">
              Company <span className="optional">(optional)</span>
            </label>
            <input id="f-company" name="company" type="text" autoComplete="organization" />
          </div>
          <div className="field">
            <label htmlFor="f-service">Service</label>
            <select id="f-service" name="service" defaultValue={contact.serviceOptions[0]}>
              {contact.serviceOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field field--full">
            <label htmlFor="f-message">What are you trying to achieve?</label>
            <textarea id="f-message" name="message" rows={5} required />
          </div>
          <div className="form-foot field--full">
            <button type="submit" className="btn btn-primary">
              {configured ? 'Open email draft' : 'Send enquiry'}
            </button>
            <p id="form-status" className="form-status" role="status" aria-live="polite">
              {status.kind === 'error' && status.message}
              {status.kind === 'unconfigured' &&
                `Not sent. ${brand.name}'s contact inbox is not configured yet, so this form cannot deliver messages.`}
              {status.kind === 'handoff' &&
                'Your email app should open with a pre-filled draft. The message is only sent when you press send there.'}
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
