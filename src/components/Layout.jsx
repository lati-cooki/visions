// App-wide page shell: full-height coastal gradient background + centered content column.
export function PageShell({ children, center = false }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-sand via-white to-brand-lightblue font-sans text-brand-navy">
      <div
        className={`mx-auto max-w-[660px] px-5 pb-16 pt-8 ${
          center ? "flex min-h-[90vh] flex-col items-center justify-center text-center" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
