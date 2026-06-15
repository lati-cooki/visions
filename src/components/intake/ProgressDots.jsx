// Three-step progress indicator. The current/completed step widens and turns ocean blue.
export function ProgressDots({ step }) {
  return (
    <div className="mb-8 flex justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`h-2.5 rounded-full transition-all duration-300 ${
            step >= s ? "w-8 bg-brand-ocean" : "w-2.5 bg-brand-border"
          }`}
        />
      ))}
    </div>
  );
}
