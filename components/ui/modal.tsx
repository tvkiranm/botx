"use client";

import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--accent)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
