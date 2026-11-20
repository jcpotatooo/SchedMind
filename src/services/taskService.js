// All Firestore writes for tasks. Reads are done live in hooks/useTasks.js.
// Collection: "tasks". Every document has a userId = the owner's Firebase uid,
// and the security rules only let that owner read or change it.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";

export async function addTask(userId, data) {
  await addDoc(collection(db, "tasks"), {
    userId,
    title: data.title,
    subject: data.subject,
    description: data.description,
    category: data.category,
    status: data.status,
    difficulty: data.difficulty,
    importance: data.importance,
    estimatedMinutes: data.estimatedMinutes,
    deadline: Timestamp.fromDate(data.deadline),
    // Phase 3 (behavior learning) will fill actualMinutes when a task is finished.
    actualMinutes: null,
    completedAt: data.status === "done" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// `task` = the current task (needed to know if the status really changed).
// `changes` = only the fields to change.
export async function updateTask(task, changes) {
  const next = { ...changes, updatedAt: serverTimestamp() };
  if (changes.deadline) next.deadline = Timestamp.fromDate(changes.deadline);
  if (changes.status && changes.status !== task.status) {
    // Remember WHEN it was finished (used later for progress charts and streaks).
    next.completedAt = changes.status === "done" ? serverTimestamp() : null;
  }
  await updateDoc(doc(db, "tasks", task.id), next);
}

export function deleteTask(taskId) {
  return deleteDoc(doc(db, "tasks", taskId));
}
