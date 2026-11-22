import { addDoc, collection, deleteDoc, doc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";

// targetDate comes from the form as "yyyy-MM-dd"; saved as the END of that day.
const toTimestamp = (dateString) => Timestamp.fromDate(new Date(`${dateString}T23:59:00`));

export function addGoal(uid, form) {
  return addDoc(collection(db, "goals"), {
    userId: uid,
    title: form.title.trim(),
    description: form.description.trim(),
    targetDate: toTimestamp(form.targetDate),
    weeklyTargetMinutes: Math.round(Number(form.weeklyHours) * 60),
    status: "active",
    completedAt: null,
    createdAt: serverTimestamp(),
  });
}

export function updateGoal(goalId, form) {
  return updateDoc(doc(db, "goals", goalId), {
    title: form.title.trim(),
    description: form.description.trim(),
    targetDate: toTimestamp(form.targetDate),
    weeklyTargetMinutes: Math.round(Number(form.weeklyHours) * 60),
  });
}

export function setGoalCompleted(goalId, completed) {
  return updateDoc(doc(db, "goals", goalId), {
    status: completed ? "completed" : "active",
    completedAt: completed ? serverTimestamp() : null,
  });
}

export function deleteGoal(goalId) {
  return deleteDoc(doc(db, "goals", goalId));
}
