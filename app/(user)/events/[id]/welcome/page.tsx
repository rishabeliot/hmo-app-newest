"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [firstName, setFirstName] = useState("");
  const [greetingImageUrl, setGreetingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        const name: string = data?.name ?? "";
        setFirstName(name.split(" ")[0] ?? "");
      })
      .catch(() => {});

    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        const all = [data?.upcoming, ...(data?.past ?? [])].filter(Boolean);
        const event = all.find((e: { id: string }) => e.id === id);
        if (event?.greetingImageUrl) setGreetingImageUrl(event.greetingImageUrl);
      })
      .catch(() => {});
  }, [id]);

  return (
    <main
      style={{
        position: "relative",
        minHeight: "100dvh",
        backgroundImage: `url('${greetingImageUrl ?? "/greeting.png"}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        overflow: "hidden",
      }}
    >
      {/* "Hey, {firstName}" */}
      <p
        style={{
          position: "absolute",
          left: "53px",
          top: "130px",
          margin: 0,
          fontFamily: "var(--font-jersey)",
          fontSize: "100px",
          fontWeight: 400,
          color: "white",
          lineHeight: 0.9,
          textAlign: "left",
        }}
      >
        Hey,{" "}
        {firstName || (
          <span style={{ opacity: 0.5 }}>...</span>
        )}
      </p>

      {/* "Tickets just dropped" */}
      <p
        style={{
          position: "absolute",
          left: "53px",
          top: "315px",
          margin: 0,
          fontFamily: "var(--font-dm-sans)",
          fontSize: "24px",
          fontWeight: 400,
          color: "white",
          lineHeight: 1,
        }}
      >
        Tickets just dropped
      </p>

      {/* "Let's go ->" button */}
      <button
        onClick={() => router.push(`/events/${id}/ticket`)}
        style={{
          position: "absolute",
          left: "223px",
          top: "405px",
          padding: "14px 24px",
          borderRadius: "49px",
          // background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "white",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "18px",
          fontWeight: 400,
          cursor: "pointer",
          whiteSpace: "nowrap",
          minWidth: "44px",
          minHeight: "44px",
        }}
      >
        Let&apos;s go -&gt;
      </button>
    </main>
  );
}
