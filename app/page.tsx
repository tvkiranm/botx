import Card from "@/components/ui/card";
import StatCard from "@/components/ui/stat-card";

const stats = [
  { label: "Total Organizations", value: "48", icon: "🏢" },
  { label: "Total Uploads", value: "1,284", icon: "📂" },
  { label: "Total Chats", value: "92,310", icon: "💬" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
          Overview
        </p>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="System Health" subtitle="Last 24 hours">
          <div className="space-y-3 text-sm text-[var(--muted)]">
            <div className="flex items-center justify-between">
              <span>Response time</span>
              <span className="font-medium text-[var(--foreground)]">320ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Uptime</span>
              <span className="font-medium text-[var(--foreground)]">99.98%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Queued jobs</span>
              <span className="font-medium text-[var(--foreground)]">12</span>
            </div>
          </div>
        </Card>
        <Card title="Recent Activity" subtitle="Today">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>New org onboarded</span>
              <span className="text-[var(--muted)]">10:14 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Training run completed</span>
              <span className="text-[var(--muted)]">9:32 AM</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Upload queued</span>
              <span className="text-[var(--muted)]">8:07 AM</span>
            </div>
          </div>
        </Card>
        <Card title="Active Agents" subtitle="Live sessions">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Billing bot</span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Support bot</span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sales bot</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                Monitoring
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
