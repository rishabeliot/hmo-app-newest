"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type Tab = "attendees" | "waitlist" | "scanner";

type Event = {
  id: string;
  title: string;
  eventDate: string;
  venue: string | null;
  isTicketingClosed: boolean;
  isUpcoming: boolean;
};

type Attendee = {
  user_id: string;
  name: string | null;
  email: string;
  phone_number: string | null;
  ticket_price: number;
  payment_mode: string;
  booking_status: string;
  entry_status: string | null;
};

type WaitlistEntry = {
  id: string;
  name: string;
  email: string | null;
  ig_handle: string | null;
  added_to_event: boolean;
  created_at: string;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const PAYMENT_MODES = ["razorpay", "cash_div", "cash_ted"];

const mutedStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontFamily: "var(--font-dm-sans)",
  fontSize: "14px",
};

const inputStyle: React.CSSProperties = {
  height: "44px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#fff",
  padding: "0 12px",
  fontSize: "14px",
  fontFamily: "var(--font-dm-sans)",
  outline: "none",
  boxSizing: "border-box",
  width: "100%",
};

// ─── Attendees Tab ────────────────────────────────────────────────────────────

function AttendeesTab({ eventId }: { eventId: string }) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addPaymentMode, setAddPaymentMode] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState("");

  const fetchAttendees = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ sort: sortField, order: sortOrder }).toString();
      const res = await fetch(`/api/admin/events/${eventId}/attendees?${qs}`);
      const data = await res.json();
      if (data.attendees) setAttendees(data.attendees);
      else setError("Failed to load attendees");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [eventId, sortField, sortOrder]);

  useEffect(() => {
    fetchAttendees();
  }, [fetchAttendees]);

  const filtered = attendees.filter(
    (a) =>
      !search ||
      (a.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  async function handlePaymentModeChange(userId: string, newMode: string) {
    setAttendees((prev) =>
      prev.map((a) => (a.user_id === userId ? { ...a, payment_mode: newMode } : a))
    );
    const res = await fetch(`/api/admin/events/${eventId}/attendees/${userId}/payment-mode`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_mode: newMode }),
    });
    if (!res.ok) fetchAttendees();
  }

  async function handlePriceSave(userId: string) {
    const rupees = parseFloat(editingPriceVal);
    if (isNaN(rupees) || rupees < 0) return;
    const paise = Math.round(rupees * 100);
    setAttendees((prev) =>
      prev.map((a) => (a.user_id === userId ? { ...a, ticket_price: paise } : a))
    );
    setEditingPriceId(null);
    const res = await fetch(`/api/admin/events/${eventId}/attendees/${userId}/ticket-price`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket_price: paise }),
    });
    if (!res.ok) fetchAttendees();
  }

  async function handleAddAttendee() {
    setAddError("");
    if (!addEmail || !addPrice || !addPaymentMode) {
      setAddError("All fields are required");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, ticket_price: Math.round(parseFloat(addPrice) * 100), payment_mode: addPaymentMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? "Failed to add attendee");
        return;
      }
      setAddEmail("");
      setAddPrice("");
      setAddPaymentMode("");
      setShowAddForm(false);
      fetchAttendees();
    } catch {
      setAddError("Network error");
    } finally {
      setAddLoading(false);
    }
  }

  const sortIcon = (field: string) => (sortField !== field ? " ↕" : sortOrder === "asc" ? " ↑" : " ↓");

  if (loading) return <p style={mutedStyle}>Loading...</p>;
  if (error) return <p style={{ color: "#f87171", fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>{error}</p>;

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: "16px" }}
      />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: "var(--font-dm-sans)" }}>
          <thead>
            <tr>
              {[
                { key: "name", label: "Name" },
                { key: "phone_number", label: "Phone" },
                { key: "ticket_price", label: "Price (₹)" },
                { key: "payment_mode", label: "Payment Mode" },
                { key: "booking_status", label: "Booking" },
                { key: "entry_status", label: "Entry" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {label}{sortIcon(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "24px 12px", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                  No attendees found
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.user_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "10px 12px", color: "#fff" }}>
                  <div>{a.name ?? "—"}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px" }}>{a.email}</div>
                </td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.8)" }}>{a.phone_number ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  {editingPriceId === a.user_id ? (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <input
                        type="number"
                        value={editingPriceVal}
                        onChange={(e) => setEditingPriceVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handlePriceSave(a.user_id);
                          if (e.key === "Escape") setEditingPriceId(null);
                        }}
                        autoFocus
                        style={{ width: "70px", height: "28px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "#fff", padding: "0 6px", fontSize: "12px", fontFamily: "var(--font-dm-sans)", outline: "none" }}
                      />
                      <button onClick={() => handlePriceSave(a.user_id)} style={{ background: "#fff", border: "none", borderRadius: "4px", color: "#000", padding: "2px 6px", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}>✓</button>
                      <button onClick={() => setEditingPriceId(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "14px", cursor: "pointer", lineHeight: 1 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.8)" }}>₹{(a.ticket_price / 100).toLocaleString("en-IN")}</span>
                      <button
                        onClick={() => { setEditingPriceId(a.user_id); setEditingPriceVal(String(a.ticket_price / 100)); }}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "11px", cursor: "pointer", padding: 0, lineHeight: 1 }}
                        title="Edit price"
                      >✎</button>
                    </div>
                  )}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <select
                    value={a.payment_mode}
                    onChange={(e) => handlePaymentModeChange(a.user_id, e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "6px",
                      color: "#fff",
                      padding: "4px 8px",
                      fontSize: "12px",
                      fontFamily: "var(--font-dm-sans)",
                      cursor: "pointer",
                    }}
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m} style={{ background: "#111" }}>{m}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "99px",
                      background: a.booking_status === "Booked" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                      color: a.booking_status === "Booked" ? "#4ade80" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {a.booking_status === "Booked" ? "Booked" : "Invited"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "99px",
                      background: a.entry_status === "admitted" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                      color: a.entry_status === "admitted" ? "#4ade80" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {a.entry_status === "admitted" ? "Entered" : "Not entered"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "8px",
            color: "#fff",
            padding: "8px 16px",
            fontSize: "14px",
            fontFamily: "var(--font-dm-sans)",
            cursor: "pointer",
          }}
        >
          {showAddForm ? "Cancel" : "+ Add Attendee"}
        </button>

        {showAddForm && (
          <div
            style={{
              marginTop: "12px",
              padding: "16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input type="email" placeholder="User email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} style={inputStyle} />
              <input type="number" placeholder="Ticket price (₹)" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} style={inputStyle} />
              <select value={addPaymentMode} onChange={(e) => setAddPaymentMode(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="" disabled style={{ background: "#111" }}>Select payment mode</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m} style={{ background: "#111" }}>{m}</option>
                ))}
              </select>
              {addError && (
                <p style={{ color: "#f87171", fontSize: "12px", margin: 0, fontFamily: "var(--font-dm-sans)" }}>{addError}</p>
              )}
              <button
                onClick={handleAddAttendee}
                disabled={addLoading}
                style={{
                  background: "#ffffff",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px",
                  fontSize: "14px",
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 700,
                  cursor: addLoading ? "not-allowed" : "pointer",
                  opacity: addLoading ? 0.6 : 1,
                }}
              >
                {addLoading ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Waitlist Tab ─────────────────────────────────────────────────────────────

function WaitlistTab({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promotePrice, setPromotePrice] = useState("");
  const [promotePaymentMode, setPromotePaymentMode] = useState("");
  const [promoteError, setPromoteError] = useState("");
  const [promoteLoading, setPromoteLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}/waitlist`)
      .then((r) => r.json())
      .then((data) => {
        if (data.waitlist) setEntries(data.waitlist);
        else setError("Failed to load waitlist");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [eventId]);

  async function handlePromote(entryId: string) {
    setPromoteError("");
    if (!promotePrice || !promotePaymentMode) { setPromoteError("Ticket price and payment mode are required"); return; }
    setPromoteLoading(true);
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, ticket_price: Math.round(parseFloat(promotePrice) * 100), payment_mode: promotePaymentMode }),
      });
      const data = await res.json();
      if (!res.ok) { setPromoteError(data.error ?? "Failed to promote"); return; }
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, added_to_event: true } : e)));
      setPromotingId(null);
      setPromotePrice("");
      setPromotePaymentMode("");
    } catch {
      setPromoteError("Network error");
    } finally {
      setPromoteLoading(false);
    }
  }

  if (loading) return <p style={mutedStyle}>Loading...</p>;
  if (error) return <p style={{ color: "#f87171", fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>{error}</p>;
  if (entries.length === 0) return <p style={mutedStyle}>No waitlist entries for this event</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", fontFamily: "var(--font-dm-sans)" }}>
        <thead>
          <tr>
            {["Name", "Email", "IG Handle", "Status", "Action"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "rgba(255,255,255,0.5)", fontWeight: 400, borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <>
              <tr key={entry.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "10px 12px", color: "#fff" }}>{entry.name}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.8)" }}>{entry.email ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.8)" }}>{entry.ig_handle ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "99px",
                      background: entry.added_to_event ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                      color: entry.added_to_event ? "#4ade80" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {entry.added_to_event ? "Added" : "Pending"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {entry.added_to_event ? (
                    <span style={{ color: "#4ade80", fontSize: "12px" }}>Added ✓</span>
                  ) : (
                    <button
                      onClick={() => { setPromotingId(entry.id); setPromoteError(""); setPromotePrice(""); setPromotePaymentMode(""); }}
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontFamily: "var(--font-dm-sans)",
                        cursor: "pointer",
                      }}
                    >
                      Promote
                    </button>
                  )}
                </td>
              </tr>
              {promotingId === entry.id && (
                <tr key={`${entry.id}-promote`}>
                  <td colSpan={5} style={{ padding: "0 12px 12px" }}>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px",
                        padding: "12px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        placeholder="Ticket price (₹)"
                        value={promotePrice}
                        onChange={(e) => setPromotePrice(e.target.value)}
                        style={{ ...inputStyle, width: "180px" }}
                      />
                      <select
                        value={promotePaymentMode}
                        onChange={(e) => setPromotePaymentMode(e.target.value)}
                        style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
                      >
                        <option value="" disabled style={{ background: "#111" }}>Select payment mode</option>
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m} style={{ background: "#111" }}>{m}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePromote(entry.id)}
                        disabled={promoteLoading}
                        style={{
                          background: "#ffffff",
                          color: "#000",
                          border: "none",
                          borderRadius: "6px",
                          padding: "8px 14px",
                          fontSize: "13px",
                          fontFamily: "var(--font-dm-sans)",
                          fontWeight: 700,
                          cursor: promoteLoading ? "not-allowed" : "pointer",
                          opacity: promoteLoading ? 0.6 : 1,
                          height: "44px",
                        }}
                      >
                        {promoteLoading ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setPromotingId(null)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontFamily: "var(--font-dm-sans)",
                        }}
                      >
                        Cancel
                      </button>
                      {promoteError && (
                        <p style={{ color: "#f87171", fontSize: "12px", margin: 0, width: "100%", fontFamily: "var(--font-dm-sans)" }}>
                          {promoteError}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Scanner Tab ──────────────────────────────────────────────────────────────

function ScannerTab() {
  const [scanState, setScanState] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [manualId, setManualId] = useState("");
  const [cameraError, setCameraError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let scanner: { stop: () => Promise<void> } | null = null;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!mountedRef.current) return;
      const qr = new Html5Qrcode("qr-scanner-div");
      scanner = qr;
      qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {
          try {
            const parts = decodedText.split(".");
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            admitTicket(payload.ticket_id);
          } catch {
            if (!mountedRef.current) return;
            setScanState("error");
            setMessage("Invalid QR code");
            setTimeout(() => { if (mountedRef.current) { setScanState("idle"); setMessage(""); } }, 3000);
          }
        },
        undefined
      ).catch(() => {
        if (!mountedRef.current) return;
        setCameraError("Camera access denied. Tap the camera icon in your browser's address bar to allow access, then reload.");
      });
    });

    return () => {
      mountedRef.current = false;
      if (scanner) scanner.stop().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function admitTicket(ticketId: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/admit`, { method: "POST" });
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.ok) {
        setScanState("success");
        setMessage("Admitted!");
      } else {
        setScanState("error");
        setMessage(data.error ?? "Failed to admit");
      }
      setTimeout(() => { if (mountedRef.current) { setScanState("idle"); setMessage(""); } }, 2500);
    } catch {
      if (!mountedRef.current) return;
      setScanState("error");
      setMessage("Network error");
      setTimeout(() => { if (mountedRef.current) { setScanState("idle"); setMessage(""); } }, 3000);
    }
  }

  async function handleManualAdmit() {
    if (!manualId.trim()) return;
    await admitTicket(manualId.trim());
    setManualId("");
  }

  return (
    <div style={{ padding: "4px 0" }}>
      <p style={{ ...mutedStyle, marginBottom: "16px" }}>Point camera at attendee&apos;s QR code</p>

      {cameraError && (
        <div style={{ color: "#f87171", fontSize: "14px", fontFamily: "var(--font-dm-sans)", marginBottom: "16px", padding: "12px", background: "rgba(248,113,113,0.1)", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.2)" }}>
          {cameraError}
        </div>
      )}

      {scanState === "success" && (
        <div style={{ color: "#4ade80", textAlign: "center", marginBottom: "12px", fontSize: "16px", fontFamily: "var(--font-dm-sans)" }}>
          ✓ {message}
        </div>
      )}
      {scanState === "error" && (
        <div style={{ color: "#f87171", textAlign: "center", marginBottom: "12px", fontSize: "14px", fontFamily: "var(--font-dm-sans)" }}>
          {message}
        </div>
      )}

      <div id="qr-scanner-div" style={{ width: "100%", borderRadius: "12px", overflow: "hidden" }} />

      <div style={{ marginTop: "28px" }}>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px", fontFamily: "var(--font-dm-sans)", marginBottom: "8px" }}>
          Enter ticket ID manually
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualAdmit()}
            placeholder="Ticket ID (UUID)"
            style={{ ...inputStyle, flex: 1, width: "auto" }}
          />
          <button
            onClick={handleManualAdmit}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "#fff",
              padding: "0 16px",
              fontSize: "14px",
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
              height: "44px",
              flexShrink: 0,
            }}
          >
            Admit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("attendees");
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [closingTicketing, setClosingTicketing] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => { if (data.event) setEvent(data.event); })
      .finally(() => setLoadingEvent(false));
  }, [eventId]);

  async function handleCloseTicketing() {
    if (!confirm("Close ticketing for this event? This cannot be undone.")) return;
    setClosingTicketing(true);
    const res = await fetch(`/api/admin/events/${eventId}/close-ticketing`, { method: "PATCH" });
    if (res.ok) setEvent((prev) => (prev ? { ...prev, isTicketingClosed: true } : prev));
    setClosingTicketing(false);
  }

  async function handleExportCsv() {
    const res = await fetch(`/api/admin/events/${eventId}/attendees/export`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendees.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "attendees", label: "Attendees" },
    { key: "waitlist", label: "Waitlist" },
    { key: "scanner", label: "Scanner" },
  ];

  return (
    <div
      style={{
        background: "#000000",
        minHeight: "100dvh",
        paddingTop: "52px",
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingBottom: "40px",
      }}
    >
      <button
        onClick={() => router.push("/admin/events")}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: "13px",
          fontFamily: "var(--font-dm-sans)",
          cursor: "pointer",
          padding: "0 0 16px 0",
          display: "block",
        }}
      >
        ← Events
      </button>

      <div style={{ marginBottom: "20px" }}>
        {loadingEvent ? (
          <div style={{ height: "60px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }} />
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: "var(--font-jersey)", fontSize: "28px", color: "#ffffff", margin: "0 0 4px 0" }}>
                {event?.title ?? "Event"}
              </h1>
              <p style={{ ...mutedStyle, fontSize: "13px", margin: 0 }}>
                {event ? formatDate(event.eventDate) : ""}
                {event?.venue ? ` · ${event.venue}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={handleCloseTicketing}
                disabled={!!event?.isTicketingClosed || closingTicketing}
                className="glass"
                style={{
                  borderRadius: "99px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontFamily: "var(--font-dm-sans)",
                  cursor: event?.isTicketingClosed ? "not-allowed" : "pointer",
                  color: event?.isTicketingClosed ? "rgba(255,255,255,0.3)" : "#f87171",
                  opacity: event?.isTicketingClosed ? 0.5 : 1,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  whiteSpace: "nowrap",
                }}
              >
                {event?.isTicketingClosed ? "Closed" : "Close Ticketing"}
              </button>
              <button
                onClick={handleExportCsv}
                className="glass"
                style={{
                  borderRadius: "99px",
                  padding: "8px 14px",
                  fontSize: "13px",
                  fontFamily: "var(--font-dm-sans)",
                  cursor: "pointer",
                  color: "#ffffff",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  whiteSpace: "nowrap",
                }}
              >
                Export CSV
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "99px",
          padding: "4px",
          marginBottom: "24px",
        }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "99px",
              border: "none",
              fontSize: "14px",
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === key ? "#ffffff" : "transparent",
              color: activeTab === key ? "#000000" : "rgba(255,255,255,0.5)",
              fontWeight: activeTab === key ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "attendees" && <AttendeesTab eventId={eventId} />}
      {activeTab === "waitlist" && <WaitlistTab eventId={eventId} />}
      {activeTab === "scanner" && <ScannerTab />}
    </div>
  );
}
