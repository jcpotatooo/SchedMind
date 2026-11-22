import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus, Search, SearchX } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePlan } from "../../context/PlanContext.jsx";
import { addTask, updateTask, deleteTask } from "../../services/taskService.js";
import { CATEGORIES, STATUSES } from "../../lib/taskConstants.js";
import { friendlyError } from "../../lib/authErrors.js";
import Alert from "../../components/ui/Alert.jsx";
import Button from "../../components/ui/Button.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { controlClass } from "../../components/ui/Field.jsx";
import TaskCard from "../../components/tasks/TaskCard.jsx";
import TaskForm from "../../components/tasks/TaskForm.jsx";
import TaskDetails from "../../components/tasks/TaskDetails.jsx";

const SORTS = {
  deadline: "Deadline (soonest)",
  newest: "Recently added",
  importance: "Importance (highest)",
};

export default function Tasks() {
  const { user } = useAuth();
  const { tasks, loading, error, priorityById, riskById } = usePlan();

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("deadline");

  // Dialogs. We store ids, then look the task up, so dialogs always show live data.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = adding a new task
  const [viewingId, setViewingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [notice, setNotice] = useState(null); // { type, text }

  // Success/error message disappears after 4 seconds.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const editingTask = tasks.find((t) => t.id === editingId) || null;
  const viewingTask = tasks.find((t) => t.id === viewingId) || null;
  const deletingTask = tasks.find((t) => t.id === deletingId) || null;

  const visibleTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = tasks.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (status !== "all" && t.status !== status) return false;
      if (!term) return true;
      return [t.title, t.subject, t.description].some((v) => (v || "").toLowerCase().includes(term));
    });

    list.sort((a, b) => {
      if (sort === "newest") return (b.createdAt?.getTime() ?? Date.now()) - (a.createdAt?.getTime() ?? Date.now());
      if (sort === "importance") return b.importance - a.importance || a.deadline - b.deadline;
      // Default: unfinished tasks first, each group by nearest deadline.
      const aDone = a.status === "done" ? 1 : 0;
      const bDone = b.status === "done" ? 1 : 0;
      return aDone - bDone || a.deadline - b.deadline;
    });
    return list;
  }, [tasks, search, category, status, sort]);

  function openAdd() {
    setEditingId(null);
    setFormOpen(true);
  }
  function openEdit(task) {
    setViewingId(null);
    setEditingId(task.id);
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  // TaskForm calls this. If it throws, the form shows the error and stays open.
  async function handleSave(payload) {
    const wasEditing = !!editingTask;
    if (wasEditing) await updateTask(editingTask, payload);
    else await addTask(user.uid, payload);
    closeForm();
    setNotice({ type: "success", text: wasEditing ? "Task updated." : "Task added." });
  }

  async function handleStatusChange(task, newStatus) {
    try {
      await updateTask(task, { status: newStatus });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    }
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      await deleteTask(deletingTask.id);
      setNotice({ type: "success", text: "Task deleted." });
    } catch (err) {
      setNotice({ type: "error", text: friendlyError(err) });
    } finally {
      setDeleteBusy(false);
      setDeletingId(null);
    }
  }

  const hasFilters = search || category !== "all" || status !== "all";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Tasks</h1>
          <p className="text-sm text-ink-500">Assignments, projects, quizzes and exams</p>
        </div>
        <button type="button" onClick={openAdd}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-card transition hover:bg-brand-600">
          <Plus size={18} /> Add task
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <Alert type={notice?.type || "info"}>{notice?.text}</Alert>
        <Alert type="error">{error}</Alert>
      </div>

      {/* Search + filters */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="relative col-span-2 sm:col-span-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..." aria-label="Search tasks"
            className={`${controlClass()} pl-9`} />
        </div>
        <select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className={controlClass()}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className={controlClass()}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)} className={`${controlClass()} col-span-2`}>
          {Object.entries(SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {/* List */}
      <div className="mt-5">
        {loading ? (
          <Spinner label="Loading your tasks..." />
        ) : tasks.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tasks yet"
            text="Add your first assignment, quiz or exam so SchedMind can start helping you plan."
            action={<Button onClick={openAdd} className="px-6"><Plus size={18} /> Add your first task</Button>} />
        ) : visibleTasks.length === 0 ? (
          <EmptyState icon={SearchX} title="No matching tasks"
            text="Try a different search or clear the filters."
            action={hasFilters && (
              <Button variant="outline" className="px-6"
                onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}>
                Clear filters
              </Button>
            )} />
        ) : (
          <>
            <p className="mb-3 text-xs text-ink-500">
              Showing {visibleTasks.length} of {tasks.length} task{tasks.length === 1 ? "" : "s"}
            </p>
            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <TaskCard key={task.id} task={task}
                  priority={priorityById[task.id]} risk={riskById[task.id]}
                  onOpen={(t) => setViewingId(t.id)}
                  onEdit={openEdit}
                  onDelete={(t) => setDeletingId(t.id)}
                  onStatusChange={handleStatusChange} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      {formOpen && (
        <TaskForm key={editingId ?? "new"} task={editingTask} onSave={handleSave} onClose={closeForm} />
      )}
      {viewingTask && (
        <TaskDetails task={viewingTask} priority={priorityById[viewingTask.id]} risk={riskById[viewingTask.id]} onClose={() => setViewingId(null)} onEdit={openEdit}
          onDelete={(t) => { setViewingId(null); setDeletingId(t.id); }} />
      )}
      {deletingTask && (
        <Modal title="Delete task?" onClose={() => !deleteBusy && setDeletingId(null)}>
          <p className="text-sm text-ink-700">
            "<strong>{deletingTask.title}</strong>" will be permanently deleted. This cannot be undone.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={deleteBusy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
