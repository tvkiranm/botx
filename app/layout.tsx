import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import AppToaster from "@/components/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Botx Admin",
  description: "Admin panel for Botx Chatbot SaaS",
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
                  B
                </div>
                <span className="text-base font-semibold">Bot-X</span>
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
        <AppToaster />
      </body>
    </html>
  );
}
