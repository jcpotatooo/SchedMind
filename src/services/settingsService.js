import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";

// Study hours live inside the student's own profile document (users/{uid}.settings).
// The security rules already allow students to edit their own profile (but not their role).
export function saveSettings(uid, settings) {
  return updateDoc(doc(db, "users", uid), { settings });
}

// Change the display name (Firebase Auth profile + our users/{uid} document).
export async function saveDisplayName(user, name) {
  await updateProfile(user, { displayName: name });
  await updateDoc(doc(db, "users", user.uid), { name });
}

// Change password (email/password accounts only). Firebase requires the student to
// prove they know the current password first, so we re-authenticate before updating.
export async function changePassword(user, currentPassword, newPassword) {
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
