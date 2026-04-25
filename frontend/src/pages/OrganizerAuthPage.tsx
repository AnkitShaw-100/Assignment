import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildHeaders, getApiBase, parseResponse } from "../lib/api";

type OrganizerAuthPageProps = {
  setStatusMessage: (value: string) => void;
};

const API_BASE = getApiBase();

export function OrganizerAuthPage({
  setStatusMessage,
}: OrganizerAuthPageProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function registerOrganizer(event: React.FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/organisations/register`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify(form),
      });
      const data = await parseResponse<{ message?: string }>(response);
      setStatusMessage(data.message ?? "Organizer registered successfully.");
      navigate("/organizer/events");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Organizer registration failed."
      );
    }
  }

  async function loginOrganizer() {
    try {
      const response = await fetch(`${API_BASE}/api/organisations/login`, {
        method: "POST",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await parseResponse<{ message?: string }>(response);
      setStatusMessage(data.message ?? "Organizer logged in successfully.");
      navigate("/organizer/events");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Organizer login failed."
      );
    }
  }

  return (
    <section className="card page-card">
      <h2>Organizer Authentication</h2>
      <form className="stack" onSubmit={registerOrganizer}>
        <input
          placeholder="Name"
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
        <input
          placeholder="Email"
          value={form.email}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }
        />
        <div className="row">
          <button type="submit">Register</button>
          {/* Added button-secondary class here */}
          <button 
            type="button" 
            className="button-secondary" 
            onClick={() => void loginOrganizer()}
          >
            Login
          </button>
        </div>
      </form>
    </section>
  );
}