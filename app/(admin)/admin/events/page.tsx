"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  title: string;
  eventDate: string;
  venue: string | null;
  isTicketingClosed: boolean;
  isUpcoming: boolean;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
        else setError("Failed to load events");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        background: "#000000",
        minHeight: "100dvh",
        paddingTop: "60px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingBottom: "40px",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-jersey)",
          fontSize: "36px",
          color: "#ffffff",
          margin: "0 0 24px 0",
        }}
      >
        Events
      </h1>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass" style={{ borderRadius: "16px", padding: "16px", height: "70px", opacity: 0.4 }} />
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: "#ff6b6b", fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>{error}</p>
      )}

      {!loading && !error && events.length === 0 && (
        <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>
          No events found
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => router.push(`/admin/events/${event.id}`)}
            className="glass"
            style={{
              borderRadius: "16px",
              padding: "16px",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "17px", fontWeight: 700, color: "#ffffff" }}>
                {event.title}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-dm-sans)",
                  padding: "2px 10px",
                  borderRadius: "99px",
                  background: event.isTicketingClosed ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                  color: event.isTicketingClosed ? "#f87171" : "#4ade80",
                  border: `1px solid ${event.isTicketingClosed ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                  whiteSpace: "nowrap",
                }}
              >
                {event.isTicketingClosed ? "Closed" : "Open"}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
              {formatDate(event.eventDate)}
              {event.venue ? ` · ${event.venue}` : ""}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
