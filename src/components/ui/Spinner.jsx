import { Loader2 } from "lucide-react";

// Loading indicator. fullScreen centers it on the whole page.
export default function Spinner({ fullScreen = false, label = "Loading..." }) {
  const content = (
    <div className="flex flex-col items-center gap-2 text-ink-500" role="status">
      <Loader2 size={28} className="animate-spin text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
  if (!fullScreen) return <div className="flex justify-center py-12">{content}</div>;
  return <div className="flex min-h-screen items-center justify-center bg-page">{content}</div>;
}
