"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="card-flat p-6 max-w-md space-y-3">
        <h2 className="font-display text-xl">Что-то пошло не так</h2>
        <p className="text-sm text-muted break-words">{error.message}</p>
        <button onClick={reset} className="btn btn-primary">
          Попробовать снова
        </button>
      </div>
    </div>
  );
}