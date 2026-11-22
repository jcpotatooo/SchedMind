import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";

export function addHabit(uid, { name, note }) {
  return addDoc(collection(db, "habits"), { userId: uid, name, note, createdAt: serverTimestamp() });
}

export function updateHabit(habitId, { name, note }) {
  return updateDoc(doc(db, "habits", habitId), { name, note });
}

// Deletes the habit AND all of its daily check-ins.
export async function deleteHabit(uid, habitId) {
  const logs = await getDocs(query(collection(db, "habitLogs"), where("userId", "==", uid), where("habitId", "==", habitId)));
  const batch = writeBatch(db);
  logs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, "habits", habitId));
  await batch.commit();
}

// Check or uncheck a habit for one day. The document id (habitId_date) makes
// double-counting impossible.
export function setHabitDone(uid, habitId, date, done) {
  const ref = doc(db, "habitLogs", `${habitId}_${date}`);
  return done
    ? setDoc(ref, { userId: uid, habitId, date, createdAt: serverTimestamp() })
    : deleteDoc(ref);
}
