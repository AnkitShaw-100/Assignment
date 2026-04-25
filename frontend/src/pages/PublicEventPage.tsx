import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { buildHeaders, getApiBase, parseResponse } from "../lib/api";
import type { EventModel } from "../types";

type PublicEventPageProps = {
  setStatusMessage: (value: string) => void;
};

type PublicEventResponse = {
  event: EventModel;
  registeredCount: number;
  availableSpots: number;
};

const API_BASE = getApiBase();

export function PublicEventPage({ setStatusMessage }: PublicEventPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const [eventData, setEventData] = useState<PublicEventResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    attendeeName: "",
    attendeeEmail: "",
    phone: "",
  });

  async function loadPublicEventDetails() {
    if (!slug) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/events/public/${slug}`, {
        method: "GET",
        headers: buildHeaders({ includeJson: false }),
      });
      const data = await parseResponse<PublicEventResponse>(response);
      setEventData(data);
      setStatusMessage("Event details loaded.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to load event details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPublicEventDetails();
  }, [slug]);

  async function submitRegistration(event: React.FormEvent) {
    event.preventDefault();
    if (!slug) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/events/public/${slug}/register`,
        {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify(form),
        }
      );
      const data = await parseResponse<{ message?: string }>(response);
      setStatusMessage(data.message || "Registration submitted successfully.");
      setForm({ attendeeName: "", attendeeEmail: "", phone: "" });
      await loadPublicEventDetails();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit registration."
      );
    }
  }

  return (
    <section className="card page-card">
      <h2>Event Registration</h2>

      {loading ? <p>Loading event details...</p> : null}

      {eventData ? (
        <div className="summary">
          <p>
            <strong>Title:</strong> {eventData.event.title}
          </p>
          <p>
            <strong>Description:</strong>{" "}
            {eventData.event.description || "No description provided."}
          </p>
          <p>
            <strong>Date:</strong>{" "}
            {new Date(eventData.event.date).toLocaleString()}
          </p>
          <p>
            <strong>Venue:</strong> {eventData.event.venue || "Not specified"}
          </p>
          <p>
            <strong>Status:</strong> {eventData.event.status}
          </p>
          <p>
            <strong>Capacity:</strong> {eventData.event.capacity}
          </p>
          <p>
            <strong>Registered:</strong> {eventData.registeredCount}
          </p>
          <p>
            <strong>Available Spots:</strong> {eventData.availableSpots}
          </p>
        </div>
      ) : null}

      <form className="stack" onSubmit={submitRegistration}>
        <input
          placeholder="Your name"
          value={form.attendeeName}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, attendeeName: event.target.value }))
          }
        />
        <input
          placeholder="Your email"
          value={form.attendeeEmail}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, attendeeEmail: event.target.value }))
          }
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, phone: event.target.value }))
          }
        />
        <button type="submit">Register for this event</button>
      </form>
    </section>
  );
}