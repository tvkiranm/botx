import Card from "./card";

type StatCardProps = {
  label: string;
  value: string;
  icon: string;
};

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="mt-2 text-3xl font-semibold">{value}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-xl">
        {icon}
      </div>
    </Card>
  );
}
