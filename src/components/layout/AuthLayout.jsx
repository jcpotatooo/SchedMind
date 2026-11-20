import Logo from "./Logo.jsx";

// Centered white card on a light page, shared by Login, Register and Forgot Password.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-soft">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="lg" showText={false} />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
