import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PriorAuth Pulse — Automated Prior Authorization Monitoring",
  description:
    "Stop paying coordinators $228,800/year to check PA status. PriorAuth Pulse monitors 50+ payer portals automatically — $199/month, 96× ROI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className={`${inter.className} h-full bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
