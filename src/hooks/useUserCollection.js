import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { friendlyError } from "../lib/authErrors.js";

// Live list of the logged-in student's documents in any collection
// (habits, habitLogs, goals, focusSessions, notifications).
// Only documents with userId == uid are requested, which matches the security rules.
// Firestore Timestamps are converted to normal JS Dates.
export function useUserCollection(name, userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, name), where("userId", "==", userId));
    return onSnapshot(
      q,
      (snapshot) => {
        setItems(
          snapshot.docs.map((d) => {
            const data = d.data();
            const converted = {};
            Object.entries(data).forEach(([key, value]) => {
              converted[key] = value?.toDate ? value.toDate() : value;
            });
            return { id: d.id, ...converted };
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
  }, [name, userId]);

  return { items, loading, error };
}
