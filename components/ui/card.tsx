import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  subtitle?: string;
};

export default function Card({ title, subtitle, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm ${className}`}
      {...props}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--muted)]">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
