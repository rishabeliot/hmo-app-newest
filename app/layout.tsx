import type { Metadata } from "next";
import { Jersey_25, DM_Sans } from "next/font/google";
import "./globals.css";

const jersey25 = Jersey_25({
  variable: "--font-jersey",
  subsets: ["latin"],
  weight: "400",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "700", "800"],
});

export const metadata: Metadata = {
  title: "HMO",
  description: "Hear Me Out Collective",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jersey25.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
