import type { InputHTMLAttributes } from "react";

export default function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-2xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[var(--primary)] ${className}`}
      {...props}
    />
  );
}
