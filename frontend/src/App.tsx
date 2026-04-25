import { useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StatusBanner } from "./components/StatusBanner";
import { CreateEventPage } from "./pages/CreateEventPage";
import { OrganizerEventsPage } from "./pages/OrganizerEventsPage";
import { OrganizerAuthPage } from "./pages/OrganizerAuthPage";
import { PublicEventPage } from "./pages/PublicEventPage";
import { ReviewRegistrationsPage } from "./pages/ReviewRegistrationsPage";
import type { EventModel } from "./types";

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isPublicEventPage = location.pathname.startsWith("/events/");
  const isOrganizerAuthPage = location.pathname === "/organizer/auth";

  const [statusMessage, setStatusMessage] = useState("");
  const [createdEvent, setCreatedEvent] = useState<EventModel | null>(null);

  return (
    <main className="app-shell">
      {!isPublicEventPage && !isOrganizerAuthPage ? (
        <Navbar setStatusMessage={setStatusMessage} />
      ) : null}
      <StatusBanner message={statusMessage} />

      <Routes>
        <Route
          path="/organizer/auth"
          element={<OrganizerAuthPage setStatusMessage={setStatusMessage} />}
        />
        <Route
          path="/events/:slug"
          element={<PublicEventPage setStatusMessage={setStatusMessage} />}
        />
        <Route element={<ProtectedRoute setStatusMessage={setStatusMessage} />}>
          <Route
            path="/"
            element={<Navigate to="/organizer/events" replace />}
          />
          <Route
            path="/organizer/events/create"
            element={
              <CreateEventPage
                setStatusMessage={setStatusMessage}
                createdEvent={createdEvent}
                setCreatedEvent={setCreatedEvent}
              />
            }
          />
          <Route
            path="/organizer/events"
            element={
              <OrganizerEventsPage setStatusMessage={setStatusMessage} />
            }
          />
          <Route
            path="/organizer/review"
            element={
              <ReviewRegistrationsPage setStatusMessage={setStatusMessage} />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
