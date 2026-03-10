"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Suspense, useEffect, useState } from "react";

type FormValues = {
  name: string;
  phone_number: string;
  date_of_birth: string;
};

const COUNTRIES = [
  { name: "Afghanistan", code: "+93" },
  { name: "Albania", code: "+355" },
  { name: "Algeria", code: "+213" },
  { name: "Argentina", code: "+54" },
  { name: "Australia", code: "+61" },
  { name: "Austria", code: "+43" },
  { name: "Bahrain", code: "+973" },
  { name: "Bangladesh", code: "+880" },
  { name: "Belgium", code: "+32" },
  { name: "Brazil", code: "+55" },
  { name: "Canada", code: "+1" },
  { name: "Chile", code: "+56" },
  { name: "China", code: "+86" },
  { name: "Colombia", code: "+57" },
  { name: "Czech Republic", code: "+420" },
  { name: "Denmark", code: "+45" },
  { name: "Egypt", code: "+20" },
  { name: "Ethiopia", code: "+251" },
  { name: "Finland", code: "+358" },
  { name: "France", code: "+33" },
  { name: "Germany", code: "+49" },
  { name: "Ghana", code: "+233" },
  { name: "Greece", code: "+30" },
  { name: "Hong Kong", code: "+852" },
  { name: "Hungary", code: "+36" },
  { name: "India", code: "+91" },
  { name: "Indonesia", code: "+62" },
  { name: "Iran", code: "+98" },
  { name: "Iraq", code: "+964" },
  { name: "Ireland", code: "+353" },
  { name: "Israel", code: "+972" },
  { name: "Italy", code: "+39" },
  { name: "Japan", code: "+81" },
  { name: "Jordan", code: "+962" },
  { name: "Kenya", code: "+254" },
  { name: "Kuwait", code: "+965" },
  { name: "Malaysia", code: "+60" },
  { name: "Mexico", code: "+52" },
  { name: "Morocco", code: "+212" },
  { name: "Myanmar", code: "+95" },
  { name: "Nepal", code: "+977" },
  { name: "Netherlands", code: "+31" },
  { name: "New Zealand", code: "+64" },
  { name: "Nigeria", code: "+234" },
  { name: "Norway", code: "+47" },
  { name: "Oman", code: "+968" },
  { name: "Pakistan", code: "+92" },
  { name: "Philippines", code: "+63" },
  { name: "Poland", code: "+48" },
  { name: "Portugal", code: "+351" },
  { name: "Qatar", code: "+974" },
  { name: "Romania", code: "+40" },
  { name: "Russia", code: "+7" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Singapore", code: "+65" },
  { name: "South Africa", code: "+27" },
  { name: "South Korea", code: "+82" },
  { name: "Spain", code: "+34" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Sweden", code: "+46" },
  { name: "Switzerland", code: "+41" },
  { name: "Taiwan", code: "+886" },
  { name: "Tanzania", code: "+255" },
  { name: "Thailand", code: "+66" },
  { name: "Turkey", code: "+90" },
  { name: "UAE", code: "+971" },
  { name: "Uganda", code: "+256" },
  { name: "Ukraine", code: "+380" },
  { name: "United Kingdom", code: "+44" },
  { name: "United States", code: "+1" },
  { name: "Vietnam", code: "+84" },
  { name: "Zimbabwe", code: "+263" },
];

function CompleteProfileForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const [countryCode, setCountryCode] = useState("+91");

  // Computed client-side only to avoid hydration mismatch
  const [maxDob, setMaxDob] = useState("");
  useEffect(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    setMaxDob(d.toISOString().split("T")[0]);
  }, []);

  async function onSubmit(data: FormValues) {
    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        phone_number: countryCode + data.phone_number,
        date_of_birth: data.date_of_birth,
        email,
      }),
    });

    if (res.ok) {
      router.push("/events");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "307px",
    height: "52px",
    borderRadius: "49px",
    border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    fontFamily: "var(--font-dm-sans)",
    fontSize: "14px",
    outline: "none",
    paddingLeft: "20px",
    paddingRight: "20px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-dm-sans)",
    fontSize: "14px",
    color: "rgba(255,255,255,0.8)",
    marginBottom: "6px",
    display: "block",
  };

  const errorStyle: React.CSSProperties = {
    color: "#ff6b6b",
    fontSize: "12px",
    fontFamily: "var(--font-dm-sans)",
    marginTop: "4px",
    paddingLeft: "8px",
  };

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "40px" }}>
      {/* Title */}
      <h1
        style={{
          fontFamily: "var(--font-jersey)",
          fontSize: "60px",
          color: "#ffffff",
          lineHeight: 0.9,
          paddingTop: "40px",
          paddingLeft: "38px",
          marginBottom: "32px",
        }}
      >
        Let&apos;s get
        <br />
        you in
      </h1>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          paddingLeft: "44px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Full Name */}
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Your name"
            style={inputStyle}
            {...register("name", {
              required: "Name is required",
              validate: (v) => v.trim().includes(" ") || "Please enter your full name",
            })}
          />
          {errors.name && <p style={errorStyle}>{errors.name.message}</p>}
        </div>

        {/* Mobile Number */}
        <div>
          <label style={labelStyle}>Mobile Number</label>
          <div
            style={{
              ...inputStyle,
              display: "flex",
              alignItems: "center",
              paddingLeft: "0",
              paddingRight: "0",
              overflow: "hidden",
            }}
          >
            {/* Country code dropdown — shows only code when collapsed, full name when open */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                borderRight: "1px solid rgba(255,255,255,0.2)",
                height: "100%",
                flexShrink: 0,
                width: "62px",
              }}
            >
              {/* Visible label */}
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  paddingLeft: "12px",
                  pointerEvents: "none",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {countryCode}
              </span>
              {/* Chevron */}
              <svg
                width="8" height="5" viewBox="0 0 8 5" fill="none"
                style={{ marginLeft: "4px", marginRight: "6px", flexShrink: 0, pointerEvents: "none" }}
              >
                <path d="M0 0l4 5 4-5z" fill="rgba(255,255,255,0.4)" />
              </svg>
              {/* Invisible native select overlaid for interaction */}
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  width: "100%",
                  height: "100%",
                  cursor: "pointer",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option
                    key={`${c.name}-${c.code}`}
                    value={c.code}
                    style={{ background: "#2a1a3e", color: "#ffffff" }}
                  >
                    {c.code} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="tel"
              inputMode="numeric"
              maxLength={15}
              placeholder="Enter your whatsapp number"
              onKeyDown={(e) => {
                if (
                  !/[0-9]/.test(e.key) &&
                  !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"].includes(e.key)
                ) {
                  e.preventDefault();
                }
              }}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "14px",
                outline: "none",
                paddingLeft: "12px",
                height: "100%",
              }}
              {...register("phone_number", {
                required: "Phone number is required",
                pattern: { value: /^[0-9]{5,15}$/, message: "Enter a valid phone number" },
              })}
            />
          </div>
          {errors.phone_number && <p style={errorStyle}>{errors.phone_number.message}</p>}
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={labelStyle}>Email ID</label>
          <input
            type="email"
            value={email}
            readOnly
            style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }}
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label style={labelStyle}>Date of Birth</label>
          <input
            type="date"
            max={maxDob}
            style={{ ...inputStyle, colorScheme: "dark" }}
            {...register("date_of_birth", {
              required: "Date of birth is required",
            })}
          />
          {errors.date_of_birth && <p style={errorStyle}>{errors.date_of_birth.message}</p>}
        </div>

        {/* Arrow CTA — inline, right-aligned below DOB */}
        <div style={{ width: "307px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="glass"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arrow-right.png" alt="Submit" width={24} height={24} />
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense>
      <CompleteProfileForm />
    </Suspense>
  );
}
