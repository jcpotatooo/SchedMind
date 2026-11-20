// Turns Firebase error codes into messages a student can understand.
const messages = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/user-disabled": "This account has been disabled. Please contact the administrator.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Password is too weak. Use at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network error. Please check your internet connection.",
  "auth/popup-blocked": "Your browser blocked the Google popup. Allow popups for this site and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/operation-not-allowed": "This sign-in method is not enabled in the Firebase Console yet.",
  "auth/unauthorized-domain": "This domain is not authorized in Firebase Authentication settings.",
  "permission-denied": "Permission denied. Make sure the Firestore security rules were published.",
  unavailable: "The database is unreachable right now. Check your connection and try again.",
};

// Returns "" when the user simply closed the Google popup (nothing to show).
export function friendlyError(error) {
  const code = error?.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
  if (messages[code]) return messages[code];
  console.error(error); // keep the real error visible for debugging
  return "Something went wrong. Please try again.";
}
