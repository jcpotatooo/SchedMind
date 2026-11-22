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
export async function setSessionStatus({ uid, schedule, session, status, task }) {
  const sessions = schedule.sessions.map((s) => (s.id === session.id ? { ...s, status, autoMissed: false } : s));
  const batch = writeBatch(db);
  batch.update(doc(db, "schedules", uid), { sessions, updatedAt: serverTimestamp() });

  const delta = (status === "done" ? session.minutes : 0) - (session.status === "done" ? session.minutes : 0);
  if (task && delta !== 0) {
    batch.update(doc(db, "tasks", task.id), { studiedMinutes: increment(delta), updatedAt: serverTimestamp() });
  }
  await batch.commit();
}
