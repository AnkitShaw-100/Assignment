import { NavLink, useNavigate } from "react-router-dom";
import { buildHeaders, getApiBase, parseResponse } from "../lib/api";
import { useEffect, useState } from "react";

const links = [
  { to: "/organizer/events/create", label: "Create Event" },
  { to: "/organizer/events", label: "My Events", end: true },
  { to: "/organizer/review", label: "Review RSVP" },
];

type NavbarProps = {
  setStatusMessage: (value: string) => void;
};

const API_BASE = getApiBase();

export function Navbar({ setStatusMessage }: NavbarProps) {
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWebhookSettings() {
      try {
        const response = await fetch(`${API_BASE}/api/organisations/webhooks`, {
          method: "GET",
          credentials: "include",
          headers: buildHeaders({ includeJson: false }),
        });
        const data = await parseResponse<{ zapierWebhookUrl: string | null }>(
          response,
        );
        if (active) {
          setWebhookUrl(data.zapierWebhookUrl ?? "");
        }
      } catch (_error) {
        if (active) setWebhookUrl("");
      }
    }

    void loadWebhookSettings();
    return () => {
      active = false;
    };
  }, []);

  async function logoutOrganizer() {
    try {
      const response = await fetch(`${API_BASE}/api/organisations/logout`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders({ includeJson: false }),
      });
      const data = await parseResponse<{ message?: string }>(response);
      setStatusMessage(data.message ?? "Logged out successfully.");
      navigate("/organizer/auth");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to logout.",
      );
    }
  }

  async function saveWebhookSettings() {
    setSavingWebhook(true);
    try {
      const response = await fetch(`${API_BASE}/api/organisations/webhooks`, {
        method: "PUT",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({ zapierWebhookUrl: webhookUrl.trim() }),
      });
      const data = await parseResponse<{
        message?: string;
        zapierWebhookUrl?: string | null;
      }>(response);
      setWebhookUrl(data.zapierWebhookUrl ?? "");
      setStatusMessage(data.message ?? "Webhook settings saved.");
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to save webhook settings.",
      );
    } finally {
      setSavingWebhook(false);
    }
  }

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Event RSVP Platform</p>
        <h1>Organizer Console</h1>
      </div>
      <div className="topbar-webhook">
        <input
          value={webhookUrl}
          onChange={(event) => setWebhookUrl(event.target.value)}
          placeholder="Paste Zapier webhook URL"
        />
        <button
          type="button"
          onClick={() => void saveWebhookSettings()}
          disabled={savingWebhook}
        >
          {savingWebhook ? "Saving..." : "Save Webhook URL"}
        </button>
      </div>

      <nav className="tabs" aria-label="Primary">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `tab${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="tab tab-button"
          onClick={() => void logoutOrganizer()}
        >
          Logout
        </button>
      </nav>
    </header>
  );
}
