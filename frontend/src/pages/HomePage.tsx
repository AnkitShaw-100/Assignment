import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="grid two-up">
      <article className="card">
        <h2>Organizer flow</h2>
        <ol className="steps">
          <li>Sign up or login</li>
          <li>Create event</li>
          <li>Choose open or shortlisted registration</li>
          <li>Publish and share event URL</li>
        </ol>
        <div className="row">
          <Link className="button-link" to="/organizer/auth">
            Open auth
          </Link>
          <Link className="button-link" to="/organizer/events/create">
            Create event
          </Link>
        </div>
      </article>

      <article className="card">
        <h2>Attendee flow</h2>
        <ol className="steps">
          <li>Open shared URL</li>
          <li>View event description and registrations count</li>
          <li>Fill name, email, phone</li>
          <li>Submit RSVP</li>
          <li>Wait for approval if shortlisted</li>
        </ol>
        <div className="row">
          <p>Attendee registration is available only on shared event links.</p>
          <Link className="button-link" to="/organizer/review">
            Review queue
          </Link>
        </div>
      </article>
    </section>
  );
}
