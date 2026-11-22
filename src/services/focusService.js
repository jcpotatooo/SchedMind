import { collection, doc, increment, serverTimestamp, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase.js";

// Saves a finished focus session. If it was linked to a task, the minutes are also
// added to that task's studiedMinutes, so Behavior Learning and the scheduler
// count them as real study time.
export async function saveFocusSession({ uid, task, minutes, plannedMinutes, startedAt, endedAt, completed }) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "focusSessions")), {
    userId: uid,
    taskId: task?.id || null,
    taskTitle: task?.title || "",
    minutes,
    plannedMinutes,
    completed,
    startedAt: Timestamp.fromMillis(startedAt),
    endedAt: Timestamp.fromMillis(endedAt),
    createdAt: serverTimestamp(),
  });
  if (task) {
    batch.update(doc(db, "tasks", task.id), { studiedMinutes: increment(minutes), updatedAt: serverTimestamp() });
  }
  await batch.commit();
}
