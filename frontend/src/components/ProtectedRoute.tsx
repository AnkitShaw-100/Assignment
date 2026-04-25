import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { buildHeaders, getApiBase } from "../lib/api";

type ProtectedRouteProps = {
  setStatusMessage: (value: string) => void;
};

const API_BASE = getApiBase();

export function ProtectedRoute({ setStatusMessage }: ProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      setIsChecking(true);
      try {
        const response = await fetch(`${API_BASE}/api/organisations/me`, {
          method: "GET",
          credentials: "include",
          headers: buildHeaders({ includeJson: false }),
        });

        if (!active) {
          return;
        }

        setIsAuthorized(response.ok);
        if (!response.ok) {
          setStatusMessage(
            "Please login as organizer to access dashboard routes.",
          );
        }
      } catch (_error) {
        if (!active) {
          return;
        }
        setIsAuthorized(false);
        setStatusMessage(
          "Unable to validate organizer session. Please login again.",
        );
      } finally {
        if (active) {
          setIsChecking(false);
        }
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, [location.pathname, setStatusMessage]);

  if (isChecking) {
    return (
      <section className="card page-card">
        <h2>Checking organizer session...</h2>
      </section>
    );
  }

  if (!isAuthorized) {
    return (
      <Navigate
        to="/organizer/auth"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
