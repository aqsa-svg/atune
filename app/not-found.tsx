import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">404</span>
      <h1 className="font-display text-2xl font-semibold tracking-tight">This page drifted off.</h1>
      <p className="text-muted-foreground">The page you&rsquo;re after isn&rsquo;t here.</p>
      <Link href="/" className={cn(buttonVariants(), "h-10 rounded-xl px-5")}>
        Back to Attune
      </Link>
    </main>
  );
}
