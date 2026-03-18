import type { ReactNode } from "react";

type TableProps = {
  headers: string[];
  rows: ReactNode[][];
};

export default function Table({ headers, rows }: TableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--accent)] text-xs uppercase tracking-wider text-[var(--muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="border-t border-[var(--card-border)]"
            >
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
