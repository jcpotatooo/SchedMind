import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../lib/firebase.js";

const LIMIT = 2000; // keeps the page fast and inside the free Firebase quota

const toDates = (snap) =>
  snap.docs.map((d) => {
    const out = { id: d.id };
    Object.entries(d.data()).forEach(([k, v]) => (out[k] = v?.toDate ? v.toDate() : v));
    return out;
  });

// Reads (never writes) all users, tasks and focus sessions.
// Firestore rules only allow this when users/{uid}.role == "admin".
export async function loadAdminData() {
  const [users, tasks, focusSessions] = await Promise.all(
    ["users", "tasks", "focusSessions"].map((name) => getDocs(query(collection(db, name), limit(LIMIT))).then(toDates))
  );
  return { users, tasks, focusSessions, truncated: [users, tasks, focusSessions].some((l) => l.length >= LIMIT) };
}
