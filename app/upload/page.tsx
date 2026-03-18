"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

type UploadItem = {
  id: string;
  name: string;
  status: "uploaded" | "processing" | "error";
  progress: number;
};

const initialUploads: UploadItem[] = [
  { id: "file_1", name: "product_catalog.xlsx", status: "uploaded", progress: 100 },
  { id: "file_2", name: "support_faq.yml", status: "processing", progress: 64 },
  { id: "file_3", name: "pricing_guide.pdf", status: "error", progress: 25 },
];

export default function UploadPage() {
  const [uploads, setUploads] = useState(initialUploads);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const supported = ["xlsx", "yml", "pdf"];

    if (!ext || !supported.includes(ext)) {
      setError("Unsupported file format. Please upload .xlsx, .yml, or .pdf files.");
      return;
    }

    setError(null);

    const newItem: UploadItem = {
      id: `file_${uploads.length + 1}`,
      name: file.name,
      status: "processing",
      progress: 10,
    };

    setUploads((prev) => [newItem, ...prev]);

    // Placeholder: Replace with real upload call
    setTimeout(() => {
      setUploads((prev) =>
        prev.map((item) =>
          item.id === newItem.id
            ? { ...item, status: "uploaded", progress: 100 }
            : item
        )
      );
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Knowledge Base
        </p>
        <h1 className="text-2xl font-semibold">Upload Data</h1>
      </div>

      <Card>
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragActive ? "border-[var(--primary)] bg-[var(--accent)]" : "border-[var(--card-border)]"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <div className="text-3xl">📥</div>
          <div>
            <p className="text-sm font-medium">Drag & drop your files here</p>
            <p className="text-xs text-[var(--muted)]">
              Supported: .xlsx, .yml, .pdf
            </p>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <Button type="button" variant="secondary">
              Browse files
            </Button>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </Card>

      <Card title="Recent Uploads" subtitle="Track ingestion status">
        <div className="space-y-4">
          {uploads.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-[var(--card-border)] bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.status === "uploaded" && "Completed"}
                    {item.status === "processing" && "Processing"}
                    {item.status === "error" && "Failed"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === "uploaded"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.status === "processing"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--accent)]">
                <div
                  className={`h-2 rounded-full ${
                    item.status === "error" ? "bg-red-400" : "bg-[var(--primary)]"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
