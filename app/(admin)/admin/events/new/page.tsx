"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImageField = {
  label: string;
  key: keyof ImageState;
};

type ImageState = {
  backgroundImageUrl: string;
  greetingImageUrl: string;
  checkoutImageUrl: string;
  confirmationImageUrl: string;
  ticketVisualUrl: string;
};

type UploadState = {
  [K in keyof ImageState]: "idle" | "uploading" | "done" | "error";
};

const IMAGE_FIELDS: ImageField[] = [
  { label: "Hero Creative (events page card)", key: "backgroundImageUrl" },
  { label: "Greeting Screen", key: "greetingImageUrl" },
  { label: "Checkout Screen", key: "checkoutImageUrl" },
  { label: "Confirmation Screen", key: "confirmationImageUrl" },
  { label: "Ticket Visual", key: "ticketVisualUrl" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "12px",
  padding: "12px 14px",
  color: "#ffffff",
  fontFamily: "var(--font-dm-sans)",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans)",
  fontSize: "13px",
  color: "rgba(255,255,255,0.6)",
  marginBottom: "6px",
  display: "block",
};

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans)",
  fontSize: "11px",
  fontWeight: 700,
  color: "rgba(255,255,255,0.35)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "14px",
  marginTop: "0",
};

const fieldWrap: React.CSSProperties = { marginBottom: "16px" };

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "14px",
        background: value ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.1)",
        border: `1px solid ${value ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.2)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: value ? "22px" : "3px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: value ? "#4ade80" : "rgba(255,255,255,0.5)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

export default function NewEventPage() {
  const router = useRouter();

  // Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [isUpcoming, setIsUpcoming] = useState(true);

  // Venue
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");

  // Ticketing
  const [ticketPrice, setTicketPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [waitlistingEnabled, setWaitlistingEnabled] = useState(true);

  // Images
  const [images, setImages] = useState<ImageState>({
    backgroundImageUrl: "",
    greetingImageUrl: "",
    checkoutImageUrl: "",
    confirmationImageUrl: "",
    ticketVisualUrl: "",
  });
  const [uploadState, setUploadState] = useState<UploadState>({
    backgroundImageUrl: "idle",
    greetingImageUrl: "idle",
    checkoutImageUrl: "idle",
    confirmationImageUrl: "idle",
    ticketVisualUrl: "idle",
  });

  const fileRefs = useRef<{ [K in keyof ImageState]?: HTMLInputElement | null }>({});

  // Form state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleFileChange(key: keyof ImageState, file: File) {
    setUploadState((s) => ({ ...s, [key]: "uploading" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImages((s) => ({ ...s, [key]: data.url }));
      setUploadState((s) => ({ ...s, [key]: "done" }));
    } catch {
      setUploadState((s) => ({ ...s, [key]: "error" }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");

    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!eventDate) newErrors.eventDate = "Event date is required";
    if (!ticketPrice || isNaN(Number(ticketPrice)) || Number(ticketPrice) < 0)
      newErrors.ticketPrice = "Valid ticket price is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          eventDate: new Date(`${eventDate}T00:00:00`).toISOString(),
          timeDisplay: eventTime.trim() || null,
          venue: venue.trim() || null,
          location: location.trim() || null,
          mapsUrl: mapsUrl.trim() || null,
          defaultTicketPrice: Math.round(Number(ticketPrice) * 100),
          capacity: capacity ? Number(capacity) : null,
          waitlistingEnabled,
          isUpcoming,
          ...images,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? "Failed to create event");
        return;
      }

      router.push("/admin/events");
    } catch {
      setSubmitError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: "#000000",
        minHeight: "100dvh",
        paddingTop: "60px",
        paddingLeft: "24px",
        paddingRight: "24px",
        paddingBottom: "60px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            padding: "0",
            fontSize: "20px",
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1
          style={{
            fontFamily: "var(--font-jersey)",
            fontSize: "32px",
            color: "#ffffff",
            margin: 0,
          }}
        >
          New Event
        </h1>
      </div>

      {/* Submit error banner */}
      {submitError && (
        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "20px",
            color: "#f87171",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "14px",
          }}
        >
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section A — Basic Info */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <p style={sectionHeadStyle}>Basic Info</p>

          <div style={fieldWrap}>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. HMO Vol. 12"
              style={{ ...inputStyle, borderColor: errors.title ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)" }}
            />
            {errors.title && <p style={{ color: "#f87171", fontSize: "12px", margin: "4px 0 0", fontFamily: "var(--font-dm-sans)" }}>{errors.title}</p>}
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short event description…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, ...fieldWrap }}>
              <label style={labelStyle}>Event Date *</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                style={{ ...inputStyle, borderColor: errors.eventDate ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)" }}
              />
              {errors.eventDate && <p style={{ color: "#f87171", fontSize: "12px", margin: "4px 0 0", fontFamily: "var(--font-dm-sans)" }}>{errors.eventDate}</p>}
            </div>
            <div style={{ flex: 1, ...fieldWrap }}>
              <label style={labelStyle}>Event Time</label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="e.g. 7:30 PM"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ ...labelStyle, margin: 0 }}>Mark as Upcoming</span>
            <Toggle value={isUpcoming} onChange={setIsUpcoming} />
          </div>
        </div>

        {/* Section B — Venue */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <p style={sectionHeadStyle}>Venue</p>

          <div style={fieldWrap}>
            <label style={labelStyle}>Venue Name</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. The Humming Tree" style={inputStyle} />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Location Text</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Koramangala, Bengaluru" style={inputStyle} />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Maps URL</label>
            <input type="url" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." style={inputStyle} />
          </div>
        </div>

        {/* Section C — Ticketing */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "16px",
          }}
        >
          <p style={sectionHeadStyle}>Ticketing</p>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1, ...fieldWrap }}>
              <label style={labelStyle}>Default Ticket Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                placeholder="e.g. 1750"
                style={{ ...inputStyle, borderColor: errors.ticketPrice ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)" }}
              />
              {errors.ticketPrice && <p style={{ color: "#f87171", fontSize: "12px", margin: "4px 0 0", fontFamily: "var(--font-dm-sans)" }}>{errors.ticketPrice}</p>}
            </div>
            <div style={{ flex: 1, ...fieldWrap }}>
              <label style={labelStyle}>Capacity (reference only)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 200"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ ...labelStyle, margin: 0 }}>Waitlist Enabled</span>
            <Toggle value={waitlistingEnabled} onChange={setWaitlistingEnabled} />
          </div>
        </div>

        {/* Section D — Images */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "28px",
          }}
        >
          <p style={sectionHeadStyle}>Images</p>

          {IMAGE_FIELDS.map(({ label, key }) => (
            <div key={key} style={fieldWrap}>
              <label style={labelStyle}>{label}</label>
              <input
                ref={(el) => { fileRefs.current[key] = el; }}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(key, file);
                }}
              />

              {images[key] ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[key]}
                    alt={label}
                    style={{ width: "56px", height: "56px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <span style={{ color: "#4ade80", fontSize: "18px" }}>✓</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImages((s) => ({ ...s, [key]: "" }));
                      setUploadState((s) => ({ ...s, [key]: "idle" }));
                      if (fileRefs.current[key]) fileRefs.current[key]!.value = "";
                    }}
                    style={{
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "rgba(255,255,255,0.5)",
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "12px",
                      padding: "4px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRefs.current[key]?.click()}
                  disabled={uploadState[key] === "uploading"}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px dashed rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    padding: "14px 20px",
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "14px",
                    cursor: uploadState[key] === "uploading" ? "not-allowed" : "pointer",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  {uploadState[key] === "uploading" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#ffffff",
                          borderRadius: "50%",
                          display: "inline-block",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Uploading…
                    </span>
                  ) : uploadState[key] === "error" ? (
                    <span style={{ color: "#f87171" }}>Upload failed — tap to retry</span>
                  ) : (
                    "Upload image"
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            background: submitting ? "rgba(255,255,255,0.1)" : "#ffffff",
            color: submitting ? "rgba(255,255,255,0.4)" : "#000000",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "16px",
            fontWeight: 700,
            border: "none",
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Creating…" : "Create Event"}
        </button>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) opacity(0.5);
        }
      `}</style>
    </div>
  );
}
