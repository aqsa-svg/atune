"use client";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <span
        className="size-3 rounded-full"
        style={{
          background: "radial-gradient(circle at 32% 30%, var(--apricot), var(--haze))",
          boxShadow: "0 0 22px 2px color-mix(in srgb, var(--haze) 55%, transparent)",
        }}
        aria-hidden
      />
      <h1 className="font-display text-2xl font-semibold tracking-tight">Something slipped.</h1>
      <p className="text-muted-foreground">
        A hiccup on our end, not you. Give it another try — your data is safe.
      </p>
      <button onClick={() => reset()} className={cn(buttonVariants(), "h-10 rounded-xl px-5")}>
        Try again
      </button>
    </main>
  );
}
