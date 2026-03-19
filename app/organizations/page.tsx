"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";

type Organization = {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
};

// const initialOrganizations: Organization[] = [
//   {
//     id: "org_1",
//     name: "Northwind AI",
//     apiKey: "sk_live_NW_84dd...12b4",
//     createdAt: "Mar 02, 2026",
//   },
//   {
//     id: "org_2",
//     name: "Acme Support",
//     apiKey: "sk_live_AC_71ff...a901",
//     createdAt: "Feb 18, 2026",
//   },
//   {
//     id: "org_3",
//     name: "Skyline Retail",
//     apiKey: "sk_live_SK_1c2b...0f88",
//     createdAt: "Jan 27, 2026",
//   },
// ];

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formatDate(dateValue: string) {
    return new Date(dateValue).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const response = await fetch("/api/organizations");
        if (!response.ok) {
          throw new Error("Failed to load organizations.");
        }
        const data = (await response.json()) as {
          organizations?: Array<{
            id: string;
            name: string;
            apiKey: string;
            createdAt: string;
          }>;
        };
        const list =
          data.organizations?.map((org) => ({
            ...org,
            createdAt: formatDate(org.createdAt),
          })) ?? [];
        setOrganizations(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load organizations.");
      }
    }

    loadOrganizations();
  }, []);

  const rows = useMemo(
    () =>
      organizations.map((org) => [
        <div key={`${org.id}-name`} className="font-medium">
          {org.name}
        </div>,
        <code key={`${org.id}-key`} className="text-xs text-[var(--muted)]">
          {org.apiKey}
        </code>,
        <span key={`${org.id}-date`} className="text-sm text-[var(--muted)]">
          {org.createdAt}
        </span>,
      ]),
    [organizations]
  );

  async function handleCreateOrganization() {
    setIsLoading(true);
    setError(null);
    setGeneratedKey(null);

    try {
      if (!orgName.trim()) {
        throw new Error("Organization name is required.");
      }

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create organization.");
      }

      const data = (await response.json()) as {
        status?: string;
        organization?: {
          id: string;
          name: string;
          apiKey: string;
          createdAt: string;
        };
      };

      if (!data.organization) {
        throw new Error("Organization creation failed.");
      }

      const createdAt = formatDate(data.organization.createdAt);

      const newOrg: Organization = {
        id: data.organization.id,
        name: data.organization.name,
        apiKey: data.organization.apiKey,
        createdAt,
      };

      setOrganizations((prev) => [newOrg, ...prev]);
      setGeneratedKey(newOrg.apiKey);
      setOrgName("");
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold">Organizations</h1>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Create Organization</Button>
      </div>

      <Card title="Organizations" subtitle="Manage API access for each org">
        <Table headers={["Name", "API Key", "Created Date"]} rows={rows} />
      </Card>

      <Modal
        open={isModalOpen}
        title="Create organization"
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Organization name</label>
            <Input
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Acme Support"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {generatedKey && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              API key generated: <span className="font-semibold">{generatedKey}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
