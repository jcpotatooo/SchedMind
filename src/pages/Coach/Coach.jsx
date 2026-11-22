import { useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { usePlan } from "../../context/PlanContext.jsx";
import { askCoach } from "../../services/aiService.js";
import { buildCoachContext } from "../../lib/aiContext.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import { controlClass } from "../../components/ui/Field.jsx";

// AI STUDY COACH. The schedule is still made by SchedMind's own rules; the AI (Google
// Gemini, called through our server) explains it and gives advice from the student's data.
export default function Coach() {
  const { tasks, ranking, riskById, settings, behavior, sessions, now } = usePlan();
  const [messages, setMessages] = useState([]); // { role: "user" | "model", text }
  const [input, setInput] = useState("");
  const [taskId, setTaskId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  async function send(mode, label, message = "") {
    if (loading) return;
    setError("");
    const history = messages;
    setMessages((m) => [...m, { role: "user", text: label }]);
    setLoading(true);
    try {
      const context = buildCoachContext({ tasks, ranking, riskById, settings, behavior, sessions, now, focusTaskId: mode === "breakdown" ? taskId : "" });
      const reply = await askCoach({ mode, message, history, context });
      setMessages((m) => [...m, { role: "model", text: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function submit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return setError("Type a question first.");
    if (text.length > 600) return setError("Please keep your question under 600 characters.");
    setInput("");
    send("ask", text, text);
  }

  const hasTasks = openTasks.length > 0;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Sparkles size={24} className="text-brand-600" /> AI Study Coach</h1>
      <p className="text-sm text-ink-500">Advice based on your real tasks, schedule and study habits.</p>

      <div className="mt-4"><Alert type="info">
        Your task titles, deadlines and study numbers are sent to Google Gemini to write the answer. Your name and email are not.
        AI advice can be wrong, so double-check important decisions. Your schedule itself is still made by SchedMind's rules.
      </Alert></div>

      <section className="mt-5 space-y-3 rounded-3xl bg-surface p-5 shadow-card" aria-label="Quick actions">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={loading || !hasTasks} onClick={() => send("analyze", "Review my plan")}
            className="h-10 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">Review my plan</button>
          <button type="button" disabled={loading || !hasTasks} onClick={() => send("ask", "What should I do first today?", "What should I do first today, and why?")}
            className="h-10 rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50">What should I do first?</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Task to break down" value={taskId} onChange={(e) => setTaskId(e.target.value)} className={`${controlClass()} min-w-0 flex-1`}>
            <option value="">Pick a task to break down...</option>
            {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button type="button" disabled={loading || !taskId}
            onClick={() => send("breakdown", `Break down: ${openTasks.find((t) => t.id === taskId)?.title}`)}
            className="h-11 rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:opacity-50">Break into steps</button>
        </div>
        {!hasTasks && <p className="text-xs text-ink-500">Add a task first so the coach has something to work with.</p>}
      </section>

      <section className="mt-5 space-y-3" aria-live="polite" aria-label="Conversation">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm shadow-card ${
            m.role === "user" ? "ml-auto bg-brand-500 text-white" : "bg-surface text-ink-700"}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="w-fit rounded-2xl bg-surface px-4 py-3 text-sm text-ink-500 shadow-card">Thinking...</div>}
        <div ref={endRef} />
      </section>

      <div className="mt-3"><Alert type="error">{error}</Alert></div>

      <form onSubmit={submit} noValidate className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={600} aria-label="Ask the coach"
          placeholder="Ask anything about your study plan..." className={`${controlClass()} flex-1`} />
        <div className="w-14"><Button type="submit" loading={loading} aria-label="Send"><Send size={18} /></Button></div>
      </form>
    </div>
  );
}
