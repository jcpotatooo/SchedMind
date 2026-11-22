import { auth } from "../lib/firebase.js";

// Calls our own server function (/api/coach). The AI key stays on the server.
// We send the student's Firebase login token so the server knows who is asking.
export async function askCoach({ mode, message, history, context }) {
  const token = await auth.currentUser?.getIdToken();
  let res;
  try {
    res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, message, history, context }),
    });
  } catch {
    throw new Error("Could not reach the AI Coach. Check your internet connection.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // not JSON (for example when running locally with npm run dev, where /api does not exist)
  }
  if (!res.ok || !data?.reply) {
    throw new Error(
      data?.error ||
        (res.status === 404
          ? "The AI Coach only works on the deployed site (Vercel), not on npm run dev."
          : "The AI Coach could not answer. Please try again.")
    );
  }
  return data.reply;
}
