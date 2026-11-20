import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, firebaseConfigError } from "../lib/firebase.js";
import Spinner from "../components/ui/Spinner.jsx";

// AuthContext = "who is logged in?" available to every page via useAuth().
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth user (or null)
  const [profile, setProfile] = useState(null); // users/{uid} document (name, role...)
  const [loading, setLoading] = useState(!firebaseConfigError);

  useEffect(() => {
    if (firebaseConfigError) return;

    let unsubscribeProfile = () => {};

    // Firebase tells us whenever someone logs in or out (also after a page refresh).
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeProfile();
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Listen to the profile live, so the role/name update as soon as it is saved.
      unsubscribeProfile = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
          setLoading(false);
        },
        (error) => {
          console.error("Profile listener error:", error);
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      displayName: profile?.name || user?.displayName || user?.email?.split("@")[0] || "Student",
      isAdmin: profile?.role === "admin",
    }),
    [user, profile, loading]
  );

  if (firebaseConfigError) return <SetupNeeded message={firebaseConfigError} />;
  if (loading) return <Spinner fullScreen label="Loading SchedMind..." />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

function SetupNeeded({ message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-soft">
        <h1 className="text-xl font-extrabold">Firebase is not configured yet</h1>
        <p className="mt-2 text-sm text-ink-500">{message}</p>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-ink-700">
          <li>Copy <code>.env.example</code> to <code>.env</code></li>
          <li>Paste your Firebase web app values</li>
          <li>Stop and restart <code>npm run dev</code></li>
        </ol>
      </div>
    </main>
  );
}
