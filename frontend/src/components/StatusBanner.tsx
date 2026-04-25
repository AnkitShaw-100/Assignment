type StatusBannerProps = {
  message: string;
};

type StatusVariant = "error" | "warning" | "success" | "info";

function StatusIcon({ variant }: { variant: StatusVariant }) {
  if (variant === "error") {
    return (
      <span className="status-icon" aria-hidden="true">
        !
      </span>
    );
  }
  if (variant === "warning") {
    return (
      <span className="status-icon" aria-hidden="true">
        !
      </span>
    );
  }
  if (variant === "success") {
    return (
      <span className="status-icon" aria-hidden="true">
        i
      </span>
    );
  }
  return (
    <span className="status-icon" aria-hidden="true">
      i
    </span>
  );
}

export function StatusBanner({ message }: StatusBannerProps) {
  if (!message.trim()) {
    return null;
  }

  const normalizedMessage = message.toLowerCase();
  const variant: StatusVariant =
    normalizedMessage.includes("fail") || normalizedMessage.includes("error")
      ? "error"
      : normalizedMessage.includes("warn") ||
          normalizedMessage.includes("warning")
        ? "warning"
        : normalizedMessage.includes("loaded") ||
            normalizedMessage.includes("success") ||
            normalizedMessage.includes("approved")
          ? "success"
          : "info";

  return (
    <p className={`status ${variant}`} role="status" aria-live="polite">
      <StatusIcon variant={variant} />
      {message}
    </p>
  );
}
