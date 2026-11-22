import { auth } from "../lib/firebase.js";

// Calls our own server function (/api/schedule). The AI key stays on the server.
// We send the student's Firebase login token so the server knows who is asking.
export async function askScheduleAI(context) {
  const token = await auth.currentUser?.getIdToken();
  let res;
  try {
    res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ context }),
    });
  } catch {
    throw new Error("could not reach the AI service. Check your internet connection");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // not JSON (for example with npm run dev, where /api does not exist)
  }
  if (!res.ok || !Array.isArray(data?.hints)) {
    throw new Error(
      data?.error ||
        (res.status === 404
          ? "AI scheduling only works on the deployed site (Vercel), not on npm run dev"
          : "the AI service could not answer")
    );
  }
  return data;
}
