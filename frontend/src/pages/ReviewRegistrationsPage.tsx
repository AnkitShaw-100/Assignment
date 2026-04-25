import { useEffect, useMemo, useState } from "react";
import { buildHeaders, getApiBase, parseResponse } from "../lib/api";
import type {
  EventModel,
  RegistrationMode,
  RegistrationModel,
  RegistrationStatus,
} from "../types";

type ReviewRegistrationsPageProps = {
  setStatusMessage: (value: string) => void;
};

const API_BASE = getApiBase();

type RegistrationRow = RegistrationModel & {
  eventId: string;
  eventTitle: string;
  eventRegistrationMode: RegistrationMode;
};

function isActionActive(
  status: RegistrationStatus,
  action: "approve" | "reject" | "revoke",
) {
  if (action === "approve") {
    return status === "approved" || status === "registered";
  }
  if (action === "reject") {
    return status === "rejected";
  }
  return status === "revoked";
}

export function ReviewRegistrationsPage({
  setStatusMessage,
}: ReviewRegistrationsPageProps) {
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [eventOptions, setEventOptions] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [loading, setLoading] = useState(false);

  async function loadRegistrations() {
    setLoading(true);
    try {
      const eventsResponse = await fetch(`${API_BASE}/api/events/mine`, {
        method: "GET",
        credentials: "include",
        headers: buildHeaders({ includeJson: false }),
      });
      const eventsData = await parseResponse<{ events: EventModel[] }>(
        eventsResponse,
      );
      setEventOptions(
        (eventsData.events ?? []).map((eventModel) => ({
          id: eventModel._id,
          title: eventModel.title,
        })),
      );

      const registrationRows: RegistrationRow[] = [];
      await Promise.all(
        (eventsData.events ?? []).map(async (eventModel) => {
          const response = await fetch(
            `${API_BASE}/api/events/${eventModel._id}/registrations`,
            {
              method: "GET",
              credentials: "include",
              headers: buildHeaders({ includeJson: false }),
            },
          );
          const data = await parseResponse<{
            registrations: RegistrationModel[];
          }>(response);
          for (const registration of data.registrations ?? []) {
            registrationRows.push({
              ...registration,
              eventId: eventModel._id,
              eventTitle: eventModel.title,
              eventRegistrationMode: eventModel.registrationMode,
            });
          }
        }),
      );

      setRegistrations(registrationRows);
      setStatusMessage(
        `Loaded ${registrationRows.length} registrations across all events.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Failed to load registrations.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(
    eventId: string,
    registrationId: string,
    action: "approve" | "reject" | "revoke",
  ) {
    try {
      const response = await fetch(
        `${API_BASE}/api/events/${eventId}/registrations/${registrationId}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: buildHeaders({ includeJson: false }),
        },
      );
      const data = await parseResponse<{ message?: string }>(response);
      setStatusMessage(data.message ?? `Registration ${action}d successfully.`);
      await loadRegistrations();
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : `Failed to ${action} registration.`,
      );
    }
  }

  useEffect(() => {
    void loadRegistrations();
  }, []);

  const filteredRegistrations = useMemo(() => {
    if (selectedEventId === "all") {
      return registrations;
    }
    return registrations.filter(
      (registration) => registration.eventId === selectedEventId,
    );
  }, [registrations, selectedEventId]);

  return (
    <section className="card page-card">
      <h2>Review Registrations</h2>

      <div className="row">
        <select
          value={selectedEventId}
          onChange={(event) => setSelectedEventId(event.target.value)}
        >
          <option value="all">All events</option>
          {eventOptions.map((eventOption) => (
            <option key={eventOption.id} value={eventOption.id}>
              {eventOption.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void loadRegistrations()}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistrations.length === 0 ? (
              <tr>
                <td colSpan={5}>No registrations found.</td>
              </tr>
            ) : (
              filteredRegistrations.map((registration) => (
                <tr key={registration._id}>
                  <td>{registration.eventTitle}</td>
                  <td>{registration.attendeeName}</td>
                  <td>{registration.attendeeEmail}</td>
                  <td>{registration.status}</td>
                  <td>
                    {registration.eventRegistrationMode === "shortlisted" ? (
                      <div className="row actions">
                        {(() => {
                          const approveActive = isActionActive(
                            registration.status,
                            "approve",
                          );
                          const rejectActive = isActionActive(
                            registration.status,
                            "reject",
                          );
                          const revokeActive = isActionActive(
                            registration.status,
                            "revoke",
                          );
                          return (
                            <>
                              <button
                                type="button"
                                className={`action-button approve${approveActive ? " is-active" : ""}`}
                                aria-pressed={approveActive}
                                disabled={approveActive}
                                onClick={() =>
                                  void changeStatus(
                                    registration.eventId,
                                    registration._id,
                                    "approve",
                                  )
                                }
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className={`action-button reject${rejectActive ? " is-active" : ""}`}
                                aria-pressed={rejectActive}
                                disabled={rejectActive}
                                onClick={() =>
                                  void changeStatus(
                                    registration.eventId,
                                    registration._id,
                                    "reject",
                                  )
                                }
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                className={`action-button revoke${revokeActive ? " is-active" : ""}`}
                                aria-pressed={revokeActive}
                                disabled={revokeActive}
                                onClick={() =>
                                  void changeStatus(
                                    registration.eventId,
                                    registration._id,
                                    "revoke",
                                  )
                                }
                              >
                                Revoke
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
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
