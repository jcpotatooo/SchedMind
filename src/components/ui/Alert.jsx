import { AlertCircle, CheckCircle2, Info } from "lucide-react";

// Message box for forms. type: "error" | "success" | "info"
const styles = {
  error: { box: "bg-red-50 text-red-700", Icon: AlertCircle },
  success: { box: "bg-brand-50 text-brand-700", Icon: CheckCircle2 },
  info: { box: "bg-blue-50 text-blue-700", Icon: Info },
};

export default function Alert({ type = "error", children }) {
  if (!children) return null;
  const { box, Icon } = styles[type];
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${box}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
