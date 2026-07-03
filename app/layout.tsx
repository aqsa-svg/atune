import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/* Display — Bricolage Grotesque (Google). Carries the personality. */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

/* Mono — Geist Mono (Google). Labels, data, tabular numbers. */
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

/* Body — General Sans (Fontshare, self-hosted). Quiet & legible. */
const body = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/GeneralSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GeneralSans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/GeneralSans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/GeneralSans-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Attune — an app that attunes to you",
  description:
    "An AI wellness companion that learns your daily patterns and tells you what you need — grounded in your own data, never generic.",
};

/* Set the theme before paint so there is no flash. Dark is the default. */
const themeInit = `(function(){try{var t=localStorage.getItem('attune-theme');document.documentElement.classList.toggle('dark', t? t==='dark' : true);}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${display.variable} ${body.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
