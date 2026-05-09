"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Script from "next/script";
import { useToast, Toast } from "@/app/components/Toast";
import { TERMS_AND_CONDITIONS } from "@/lib/terms";

interface EventData {
  id: string;
  title: string;
  venue: string | null;
  eventDate: string;
  location: string | null;
  timeDisplay: string | null;
  isTicketingClosed: boolean;
  isAllowed: boolean;
  ticketPrice: number | null;
  checkoutImageUrl: string | null;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#000000",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "20px",
          padding: "28px 24px",
          width: "100%",
          maxWidth: "380px",
          maxHeight: "70dvh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            width: "30px",
            height: "30px",
            borderRadius: "50%",
            fontSize: "18px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <h2
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 700,
            fontSize: "18px",
            color: "white",
            margin: "0 0 16px",
          }}
        >
          Terms &amp; Conditions
        </h2>
        <div
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "14px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.8)",
            margin: 0,
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{ __html: TERMS_AND_CONDITIONS }}
        />
      </div>
    </div>
  );
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

export default function TicketPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [paying, setPaying] = useState(false);
  const { message, visible, showToast } = useToast();

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        const upcoming: EventData | null = data?.upcoming ?? null;
        const past: EventData[] = data?.past ?? [];
        const all: EventData[] = [upcoming, ...past].filter(Boolean) as EventData[];
        const found = all.find((e) => e.id === id) ?? null;
        setEvent(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePay() {
    if (!accepted) {
      showToast("Please accept terms & conditions");
      return;
    }
    if (!event) return;

    setPaying(true);
    try {
      const orderRes = await fetch("/api/tickets/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: id }),
      });
      const orderData = await orderRes.json();

      if (orderRes.status === 409 && orderData.ticket_id) {
        // Already confirmed — go straight to ticket
        router.push(`/tickets/${orderData.ticket_id}`);
        return;
      }

      if (!orderRes.ok) {
        showToast(orderData.error ?? "Failed to create order");
        return;
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.order_id,
        name: "Hear Me Out",
        description: event.title,
        theme: { color: "#1a0a40" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const confirmRes = await fetch("/api/tickets/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const confirmData = await confirmRes.json();
          if (confirmRes.ok && confirmData.ticket_id) {
            router.push(`/tickets/${confirmData.ticket_id}`);
          } else {
            showToast(confirmData.error ?? "Payment confirmation failed");
          }
        },
        modal: {
          ondismiss: () => {
            showToast("Payment cancelled");
            setPaying(false);
          },
        },
      };

      const rp = new window.Razorpay(options);
      rp.open();
    } catch (err) {
      console.error("Payment error:", err);
      showToast(err instanceof Error ? err.message : "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  function handleShare() {
    const link = `${window.location.origin}/login`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => showToast("Link copied")).catch(() => fallbackCopy(link));
    } else {
      fallbackCopy(link);
    }
  }

  function fallbackCopy(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:absolute;left:-9999px;top:-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast("Link copied");
  }

  const ticketPriceDisplay = event?.ticketPrice ? `₹${event.ticketPrice / 100}` : "—";
  const dateDisplay = event?.eventDate ? formatDate(event.eventDate) : "—";

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <main
        style={{
          minHeight: "100dvh",
          backgroundImage: `url('${event?.checkoutImageUrl ?? "/confirm.png"}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Upper section: fixed-height container holding the overlapping text + card */}
        <div style={{ position: "relative", height: "560px" }}>
          {/* "Confirm" — Jersey 25, 80px */}
          <p
            style={{
              position: "absolute",
              left: "49px",
              top: "104px",
              margin: 0,
              fontFamily: "var(--font-jersey)",
              fontSize: "80px",
              fontWeight: 400,
              color: "white",
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            Confirm
          </p>

          {/* "your spot" — Jersey 25, 70px */}
          <p
            style={{
              position: "absolute",
              left: "116px",
              top: "162px",
              margin: 0,
              fontFamily: "var(--font-jersey)",
              fontSize: "70px",
              fontWeight: 400,
              color: "white",
              lineHeight: 1,
              zIndex: 2,
            }}
          >
            your spot
          </p>

          {/* Glass card — centered */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              top: "173px",
              width: "285px",
              height: "375px",
              borderRadius: "18px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.08)",
              zIndex: 1,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxSizing: "border-box",
            }}
          >
            {/* Heading */}
            <div>
              <p
                style={{
                  margin: "76px 0 0",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "30px",
                  fontWeight: 200,
                  color: "white",
                  lineHeight: 1.15,
                }}
              >
                Hear Me Out
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.15,
                }}
              >
                at {loading ? "..." : (event?.venue ?? "Concept01")}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />

            {/* Details grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { label: "Location", value: loading ? "..." : (event?.location ?? "Koramangala") },
                { label: "Date", value: loading ? "..." : dateDisplay },
                { label: "Time", value: loading ? "..." : (event?.timeDisplay ?? "4pm - 11pm") },
                { label: "Ticket Price", value: loading ? "..." : ticketPriceDisplay },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "white",
                      minWidth: "90px",
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "12px",
                      fontWeight: 300,
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div
              style={{
                marginTop: "31px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "4px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  fontWeight: 300,
                  color: "white",
                }}
              >
                Doors shut at{" "}
                <span style={{ fontWeight: 700 }}>5:30pm</span>
              </span>
              <span
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                No late entry.
              </span>
            </div>
          </div>
        </div>

        {/* Lower section — normal flow, fully scrollable */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            paddingBottom: "60px",
          }}
        >
          {/* Checkbox row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
            }}
          >
            {/* Custom checkbox */}
            <button
              type="button"
              role="checkbox"
              aria-checked={accepted}
              onClick={() => setAccepted(!accepted)}
              style={{
                width: "18px",
                height: "18px",
                minWidth: "18px",
                borderRadius: "3px",
                background: "#000",
                border: "1px solid rgba(255,255,255,0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                flexShrink: 0,
              }}
            >
              {accepted && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontSize: "13px",
                fontWeight: 400,
                color: "white",
                cursor: "pointer",
              }}
              onClick={() => setAccepted(!accepted)}
            >
              Please accept{" "}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  textDecoration: "underline",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  fontWeight: 400,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Terms &amp; Conditions
              </button>
            </span>
          </div>

          {/* Proceed to Pay button */}
          <button
            onClick={handlePay}
            disabled={paying}
            style={{
              width: "177px",
              height: "50px",
              borderRadius: "49px",
              // background: accepted ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              border: `1px solid ${accepted ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.07)"}`,
              color: accepted ? "white" : "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "17px",
              fontWeight: 400,
              cursor: paying ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {paying ? "..." : "Proceed to Pay"}
          </button>

          {/* Dev bypass */}
          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={async () => {
                const res = await fetch("/api/tickets/dev-confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event_id: id }),
                });
                const data = await res.json();
                if (res.ok) {
                  router.push(`/tickets/${data.ticket_id}`);
                } else if (res.status === 409 && data.ticket_id) {
                  router.push(`/tickets/${data.ticket_id}`);
                } else {
                  showToast(data.error ?? "Dev confirm failed");
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "12px",
                fontWeight: 400,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Skip payment (dev only)
            </button>
          )}

          {/* Share row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingLeft: "62px",
              paddingRight: "24px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontSize: "15.5px",
                fontWeight: 400,
                color: "white",
              }}
            >
              Share this link to bring your homies
            </span>
            <button
              onClick={handleShare}
              aria-label="Copy waitlist link"
              style={{
                width: "36px",
                height: "36px",
                minWidth: "36px",
                borderRadius: "50%",
                // background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/chain.png" alt="share" width={11} height={11} />
            </button>
          </div>
        </div>
      </main>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      <Toast message={message} visible={visible} />
    </>
  );
}
