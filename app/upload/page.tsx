"use client";

import { useRef, useState } from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";

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
  const [apiKey, setApiKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const supported = ["xlsx", "yml", "yaml", "pdf"];

    if (!ext || !supported.includes(ext)) {
      setError("Unsupported file format. Please upload .xlsx, .yml, .yaml, or .pdf files.");
      return;
    }

    if (!apiKey.trim()) {
      setError("Organization API key is required.");
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

    try {
      const formData = new FormData();
      formData.append("apiKey", apiKey.trim());
      formData.append("file", file);

      const response = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to upload document.");
      }

      setUploads((prev) =>
        prev.map((item) =>
          item.id === newItem.id
            ? { ...item, status: "uploaded", progress: 100 }
            : item
        )
      );
    } catch (err) {
      setUploads((prev) =>
        prev.map((item) =>
          item.id === newItem.id
            ? { ...item, status: "error", progress: 25 }
            : item
        )
      );
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
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
        <div className="mb-4">
          <label className="text-sm font-medium">Organization API key</label>
          <Input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="org_XXXX"
          />
        </div>
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
              Supported: .xlsx, .yml, .yaml, .pdf
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx,.yml,.yaml,.pdf"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse files
          </Button>
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
