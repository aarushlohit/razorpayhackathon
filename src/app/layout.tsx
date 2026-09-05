import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Refund Loop Closer | Razorpay AI Buildathon 2026",
  description: "Autonomous closed-loop agent that investigates, un-sticks, and verifies stuck refunds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#070b12] text-slate-100 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
