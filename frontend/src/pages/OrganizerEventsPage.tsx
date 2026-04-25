import { useEffect, useState } from "react";
import { buildHeaders, getApiBase, parseResponse } from "../lib/api";
import type { EventModel } from "../types";

type OrganizerEventsPageProps = {
  setStatusMessage: (value: string) => void;
};

const API_BASE = getApiBase();

export function OrganizerEventsPage({
  setStatusMessage,
}: OrganizerEventsPageProps) {
  const [events, setEvents] = useState<EventModel[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadEvents() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/events/mine`, {
        method: "GET",
        credentials: "include",
        headers: buildHeaders({ includeJson: false }),
      });
      const data = await parseResponse<{ events: EventModel[] }>(response);
      setEvents(data.events || []);
      setStatusMessage(`Loaded ${data.events?.length || 0} events.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to load events.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  return (
    <section className="card page-card wide">
      <h2>My Events</h2>
      <div className="row">
        <button type="button" onClick={() => void loadEvents()}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Webhook Delivery</th>
              <th>Registration Mode</th>
              <th>Capacity</th>
              <th>Share Link</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6}>No events loaded.</td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event._id}>
                  <td>{event.title}</td>
                  <td>{event.status}</td>
                  <td title={event.webhookLastError || ""}>
                    {event.webhookDeliveryStatus || "not_configured"}
                    {event.webhookLastError ? " (check tooltip)" : ""}
                  </td>
                  <td>{event.registrationMode}</td>
                  <td>{event.capacity}</td>
                  <td>
                    <a
                      href={`/events/${event.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {`${window.location.origin}/events/${event.slug}`}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
