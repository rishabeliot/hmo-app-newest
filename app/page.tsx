import Link from "next/link";

export default function SplashPage() {
  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/purple2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Heading */}
      <h1
        style={{
          fontFamily: "var(--font-jersey)",
          fontSize: "70px",
          color: "#ffffff",
          lineHeight: 1,
          textAlign: "center",
          position: "absolute",
          top: "170px",
          left: "50%",
          transform: "translateX(-50%)",
          // whiteSpace: "nowrap",
        }}
      >
        Hear Me Out
      </h1>

      {/* Glass circle CTA */}
      <Link
        href="/login"
        style={{
          position: "absolute",
          top: "339px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="glass"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/arrow-right.png" alt="Enter" width={24} height={24} />
      </Link>
    </main>
  );
}
