import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase.js";

// Saves new notifications. The document id = uid_key, so the same reminder can
// never be created twice (a second write is rejected by the security rules).
export async function createNotifications(uid, list) {
  const batch = writeBatch(db);
  list.forEach((n) => {
    batch.set(doc(db, "notifications", `${uid}_${n.key}`), {
      userId: uid,
      key: n.key,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: false,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export function markRead(id) {
  return updateDoc(doc(db, "notifications", id), { read: true });
}

export async function markAllRead(ids) {
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, "notifications", id), { read: true }));
  await batch.commit();
}
