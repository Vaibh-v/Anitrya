export default function AuthErrorPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-semibold">Authentication Error</h1>
        <p className="mt-3 text-white/70">
          Something went wrong during sign-in or integration connection.
        </p>
      </div>
    </main>
  );
}