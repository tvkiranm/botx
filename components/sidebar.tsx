"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/organizations", label: "Organizations" },
  { href: "/upload", label: "Upload Data" },
  { href: "/preview", label: "Chatbot Preview" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[260px] border-r border-[var(--card-border)] bg-[var(--card)] lg:flex lg:flex-col lg:gap-6 lg:px-6 lg:py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)]">
          AI
        </div>
        <div className="leading-tight">
          <p className="text-sm text-[var(--muted)]">Organization</p>
          <p className="text-base font-semibold">AICore Labs</p>
        </div>
      </div>
      <nav className="mt-4 flex flex-col gap-2 text-sm">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-2xl px-3 py-2 font-medium hover:bg-[var(--accent)] ${
                active ? "text-[var(--foreground)] bg-[var(--accent)]" : "text-[var(--muted)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
