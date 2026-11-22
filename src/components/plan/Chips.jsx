const STYLES = {
  High: "bg-red-50 text-red-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-brand-50 text-brand-700",
};

const base = "rounded-full px-2 py-0.5 text-xs font-medium";

export function PriorityChip({ level }) {
  return <span className={`${base} ${STYLES[level]}`}>{level} priority</span>;
}

export function RiskChip({ level }) {
  return <span className={`${base} ${STYLES[level]}`}>{level} risk</span>;
}
