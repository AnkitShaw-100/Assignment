import { useState } from "react";
import { buildHeaders, getApiBase, parseResponse } from "../lib/api";
import type { EventModel, EventStatus, RegistrationMode } from "../types";

type CreateEventPageProps = {
  setStatusMessage: (value: string) => void;
  createdEvent: EventModel | null;
  setCreatedEvent: (event: EventModel | null) => void;
};

const API_BASE = getApiBase();

export function CreateEventPage({
  setStatusMessage,
  createdEvent,
  setCreatedEvent,
}: CreateEventPageProps) {
  const initialFormState = {
    title: "",
    description: "",
    date: "",
    venue: "",
    mode: "offline",
    capacity: 50,
    registrationMode: "open" as RegistrationMode,
    status: "published" as EventStatus,
  };

  const [form, setForm] = useState({
    ...initialFormState,
  });

  async function createEvent(event: React.FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify(form),
      });
      const data = await parseResponse<{ event: EventModel }>(response);
      setCreatedEvent(data.event);
      setForm({ ...initialFormState });
      setStatusMessage("Event created successfully.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Event creation failed."
      );
    }
  }

  return (
    <section className="card page-card">
      <h2>Create Event</h2>
      <form className="stack" onSubmit={createEvent}>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, title: event.target.value }))
          }
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
        <input
          type="datetime-local"
          value={form.date}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, date: event.target.value }))
          }
        />
        <input
          placeholder="Venue"
          value={form.venue}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, venue: event.target.value }))
          }
        />
        <input
          type="number"
          min={1}
          placeholder="Capacity"
          value={form.capacity}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              capacity: Number(event.target.value) || 0,
            }))
          }
        />
        <div className="row">
          <select
            value={form.registrationMode}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                registrationMode: event.target.value as RegistrationMode,
              }))
            }
          >
            <option value="open">Open</option>
            <option value="shortlisted">Shortlisted</option>
          </select>
          <select
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                status: event.target.value as EventStatus,
              }))
            }
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button type="submit">Create event</button>
      </form>

      {createdEvent ? (
        <div className="summary">
          <p>
            <strong>Event created.</strong>
          </p>
        </div>
      ) : null}
    </section>
  );
}