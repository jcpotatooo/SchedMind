// Firestore writes for the study schedule.
// One document per student: schedules/{uid}. It holds the list of study sessions
// (planned / done / missed), the saved "inputs snapshot" and a change log.
import { doc, increment, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase.js";

export function saveSchedule(uid, data) {
  return setDoc(doc(db, "schedules", uid), { ...data, userId: uid, updatedAt: serverTimestamp() });
}

// Mark one session planned / done / missed.
// Marking a session Done also adds its minutes to the task's "studiedMinutes",
// which Behavior Learning later compares with the student's estimate.
export async function setSessionStatus({ uid, schedule, session, status, task, markTaskDone = false }) {
  const nowMs = Date.now();
  const sessions = schedule.sessions.map((s) =>
    s.id === session.id
      ? {
          ...s,
          status,
          autoMissed: false,
          completedAt: status === "done" ? (s.completedAt || nowMs) : null,
        }
      : s
  );
  const batch = writeBatch(db);
  batch.update(doc(db, "schedules", uid), { sessions, updatedAt: serverTimestamp() });

  const delta = (status === "done" ? session.minutes : 0) - (session.status === "done" ? session.minutes : 0);
  if (task && (delta !== 0 || markTaskDone)) {
    const taskUpdates = { updatedAt: serverTimestamp() };
    if (delta !== 0) {
      taskUpdates.studiedMinutes = increment(delta);
    }
    if (markTaskDone) {
      taskUpdates.status = "done";
      taskUpdates.completedAt = serverTimestamp();
      taskUpdates.actualMinutes = (task.studiedMinutes || 0) + (status === "done" ? session.minutes : 0);
    } else if (status === "done" && task.status === "todo") {
      // Transition from To Do to In Progress once study time is logged
      taskUpdates.status = "in_progress";
    } else if (status === "planned" && task.status === "in_progress" && (task.studiedMinutes || 0) + delta <= 0) {
      // Revert back to To Do if all logged study time is undone
      taskUpdates.status = "todo";
    }
    batch.update(doc(db, "tasks", task.id), taskUpdates);
  }
  await batch.commit();
}
