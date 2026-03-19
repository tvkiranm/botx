import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AICore Admin",
  description: "Admin panel for AI Chatbot SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-[var(--background)]">
          <Sidebar />

          <div className="flex min-h-screen flex-col lg:pl-[260px]">
            <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4 lg:left-[260px]">
              <div className="flex items-center gap-3">
                <div className="lg:hidden">
                  <div className="h-9 w-9 rounded-xl bg-[var(--accent)]" />
                </div>
                <div className="leading-tight">
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
                    Active Organization
                  </p>
                  <p className="text-lg font-semibold">AICore Labs</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm leading-tight">
                  <p className="font-medium">Jordan Lee</p>
                  <p className="text-[var(--muted)]">Admin</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-[var(--accent)]" />
              </div>
            </header>
            <main className="flex-1 px-6 pb-6 pt-24">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
