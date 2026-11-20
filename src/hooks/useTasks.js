import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { friendlyError } from "../lib/authErrors.js";

// Firestore stores dates as Timestamp objects; the UI wants normal JS Dates.
const toDate = (value) => (value?.toDate ? value.toDate() : null);

// Live list of the logged-in student's tasks. onSnapshot keeps it updated
// automatically (add/edit/delete show up instantly, also from another device).
export function useTasks(userId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    // "where userId ==" matches the security rule. No orderBy here, so no
    // custom Firestore index is needed; we sort in the page instead.
    const q = query(collection(db, "tasks"), where("userId", "==", userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTasks(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              deadline: toDate(data.deadline),
              createdAt: toDate(data.createdAt),
              completedAt: toDate(data.completedAt),
            };
          })
        );
        setError("");
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { tasks, loading, error };
}
