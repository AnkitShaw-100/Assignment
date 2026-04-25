import { Resend } from "resend";

let cachedClient = null;
let cachedApiKey = null;

function logEmail(level, message, metadata = {}) {
  const payload = {
    scope: "email-service",
    ...metadata,
  };

  if (level === "error") {
    console.error(message, payload);
    return;
  }

  if (level === "warn") {
    console.warn(message, payload);
    return;
  }

  console.info(message, payload);
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new Resend(apiKey);
    cachedApiKey = apiKey;
  }

  return cachedClient;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "To be announced";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "To be announced";
  }

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function sendEmail({ to, subject, text }) {
  const resendClient = getResendClient();
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendClient || !resendFromEmail) {
    logEmail("warn", "Email skipped due to missing Resend config.", {
      to,
      subject,
      hasApiKey: Boolean(process.env.RESEND_API_KEY),
      hasFromEmail: Boolean(resendFromEmail),
    });
    return;
  }

  try {
    logEmail("info", "Sending email via Resend.", {
      to,
      subject,
      from: resendFromEmail,
    });

    const result = await resendClient.emails.send({
      from: resendFromEmail,
      to,
      subject,
      text,
    });

    if (result?.error) {
      logEmail("error", "Resend returned an API error while sending email.", {
        to,
        subject,
        resendError: result.error,
      });
      return;
    }

    if (!result?.data?.id) {
      logEmail("warn", "Email request accepted but no Resend ID returned.", {
        to,
        subject,
        resendResponse: result,
      });
      return;
    }

    logEmail("info", "Email sent via Resend.", {
      to,
      subject,
      resendId: result.data.id,
    });
  } catch (error) {
    logEmail("error", "Failed to send email via Resend.", {
      to,
      subject,
      errorMessage:
        error instanceof Error ? error.message : "Unknown email error",
    });
  }
}

export async function sendRegistrationReceivedEmail({
  attendeeEmail,
  attendeeName,
  eventTitle,
  eventDate,
  venue,
  registrationMode,
}) {
  const sharedDetails = [
    `Hi ${attendeeName},`,
    "",
    `Event: ${eventTitle}`,
    `Date: ${formatDate(eventDate)}`,
    `Venue: ${venue || "To be announced"}`,
    "",
  ];

  const modeSpecificText =
    registrationMode === "open"
      ? [
          "Your registration is confirmed. You are in!",
          "We look forward to seeing you at the event.",
        ]
      : [
          "We have received your registration response.",
          "Your status is currently: pending.",
          "Our team will review it shortly and share an update soon.",
        ];

  await sendEmail({
    to: attendeeEmail,
    subject:
      registrationMode === "open"
        ? `Registration confirmed: ${eventTitle}`
        : `Registration received: ${eventTitle}`,
    text: [...sharedDetails, ...modeSpecificText].join("\n"),
  });
}

export async function sendRegistrationStatusUpdateEmail({
  attendeeEmail,
  attendeeName,
  eventTitle,
  eventDate,
  venue,
  nextStatus,
}) {
  const sharedDetails = [
    `Hi ${attendeeName},`,
    "",
    `Event: ${eventTitle}`,
    `Date: ${formatDate(eventDate)}`,
    `Venue: ${venue || "To be announced"}`,
    "",
  ];

  if (nextStatus === "registered") {
    await sendEmail({
      to: attendeeEmail,
      subject: `Registration confirmed: ${eventTitle}`,
      text: [
        ...sharedDetails,
        "Great news! Your registration status is now: registered.",
        "You are in, and your seat is confirmed.",
      ].join("\n"),
    });
    return;
  }

  if (nextStatus === "pending") {
    await sendEmail({
      to: attendeeEmail,
      subject: `Registration received: ${eventTitle}`,
      text: [
        ...sharedDetails,
        "We have received your registration response.",
        "Your status is currently: pending.",
        "Our team will review it shortly and share an update soon.",
      ].join("\n"),
    });
    return;
  }

  if (nextStatus === "approved") {
    await sendEmail({
      to: attendeeEmail,
      subject: `Approved: ${eventTitle}`,
      text: [
        ...sharedDetails,
        "Great news! Your registration status is now: approved.",
        "Your seat is now confirmed.",
      ].join("\n"),
    });
    return;
  }

  if (nextStatus === "rejected") {
    await sendEmail({
      to: attendeeEmail,
      subject: `Update on your registration: ${eventTitle}`,
      text: [
        ...sharedDetails,
        "Thank you for your interest.",
        "After review, your registration status is now: rejected.",
      ].join("\n"),
    });
    return;
  }

  if (nextStatus === "revoked") {
    await sendEmail({
      to: attendeeEmail,
      subject: `Registration cancelled: ${eventTitle}`,
      text: [
        ...sharedDetails,
        "Your registration status is now: revoked.",
        "Your previously approved registration has been cancelled by the organizer.",
        "Your spot has been released and is no longer reserved.",
      ].join("\n"),
    });
  }
}
