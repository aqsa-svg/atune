import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Showcase } from "@/components/showcase";

// Design-system preview (the approved "Twilight" direction, live).
export default function PreviewPage() {
  return (
    <main className="min-h-full">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <Showcase />
      <footer className="mx-auto w-full max-w-2xl px-5 pb-16 pt-4 sm:px-8">
        <p className="font-mono text-xs text-muted-foreground">
          Attune · design-system preview — Twilight direction
        </p>
      </footer>
    </main>
  );
}
