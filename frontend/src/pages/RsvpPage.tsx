import { useEffect, useState } from 'react'
import { buildHeaders, getApiBase, parseResponse } from '../lib/api'

type RsvpPageProps = {
  setStatusMessage: (value: string) => void
  rsvpEventId: string
  setRsvpEventId: (value: string) => void
}

const API_BASE = getApiBase()

export function RsvpPage({ setStatusMessage, rsvpEventId, setRsvpEventId }: RsvpPageProps) {
  const [form, setForm] = useState({ attendeeName: '', attendeeEmail: '', phone: '' })

  useEffect(() => {
    if (rsvpEventId) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    const queryEventId = params.get('eventId')
    if (queryEventId) {
      setRsvpEventId(queryEventId)
    }
  }, [rsvpEventId, setRsvpEventId])

  async function submitRegistration(event: React.FormEvent) {
    event.preventDefault()
    if (!rsvpEventId.trim()) {
      setStatusMessage('Event id is required for RSVP submission.')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/events/${rsvpEventId}/register`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(form)
      })
      const data = await parseResponse<{ message?: string }>(response)
      setStatusMessage(data.message ?? 'RSVP submitted successfully.')
      setForm({ attendeeName: '', attendeeEmail: '', phone: '' })
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'RSVP submission failed.')
    }
  }

  return (
    <section className="card page-card">
      <h2>Attendee RSVP</h2>
      <form className="stack" onSubmit={submitRegistration}>
        {/* Made this input readOnly so users don't accidentally edit the auto-populated ID */}
        <input 
          placeholder="Event id" 
          value={rsvpEventId} 
          readOnly={!!rsvpEventId} // Locks the field if an ID exists
          onChange={(event) => setRsvpEventId(event.target.value)} 
        />
        <input
          placeholder="Attendee name"
          value={form.attendeeName}
          onChange={(event) => setForm((prev) => ({ ...prev, attendeeName: event.target.value }))}
        />
        <input
          type="email" /* Changed to type="email" for mobile keyboard optimization */
          placeholder="Attendee email"
          value={form.attendeeEmail}
          onChange={(event) => setForm((prev) => ({ ...prev, attendeeEmail: event.target.value }))}
        />
        <input
          type="tel" /* Changed to type="tel" for mobile keyboard optimization */
          placeholder="Phone"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <button type="submit">Submit RSVP</button>
      </form>
    </section>
  )
}