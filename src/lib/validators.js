// Simple form validators. Each returns an error message, or "" if the value is OK.
// Firebase will do its own checks too (Phase 2), but validating here gives
// the student instant feedback.

export function validateEmail(email) {
  if (!email.trim()) return "Email is required.";
  // Basic shape check: something@something.something
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return "";
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return "";
}

export function validateName(name) {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 2) return "Name is too short.";
  return "";
}

export function validateConfirm(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return "";
}
