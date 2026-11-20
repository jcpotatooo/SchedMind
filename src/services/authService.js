// All Firebase Authentication calls live here, so pages stay simple.
// Passwords are handled ONLY by Firebase Auth. We never store them ourselves.
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase.js";

// Creates the student's profile document (users/{uid}) if it does not exist yet.
// SECURITY: role is ALWAYS "student" here. Firestore rules also reject any other
// role on create, so nobody can make themselves an admin from the app.
async function ensureUserProfile(user, nameOverride) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;
    await setDoc(ref, {
      uid: user.uid,
      name: nameOverride || user.displayName || user.email.split("@")[0],
      email: user.email,
      photoURL: user.photoURL || "",
      role: "student",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Don't block login if this fails; it will retry on the next sign-in.
    console.warn("Could not create user profile:", error);
  }
}

export async function registerWithEmail({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: name.trim() });
  await ensureUserProfile(cred.user, name.trim());
  return cred.user;
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export function sendResetEmail(email) {
  return sendPasswordResetEmail(auth, email.trim());
}

export function logout() {
  return signOut(auth);
}
