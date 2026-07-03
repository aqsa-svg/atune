export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span
        aria-hidden
        className="attune-breathe size-3 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 30%, var(--apricot), var(--haze))",
          boxShadow: "0 0 22px 2px color-mix(in srgb, var(--haze) 55%, transparent)",
        }}
      />
      <span className="font-display text-xl font-semibold tracking-tight">
        Attune
      </span>
    </div>
  );
}
