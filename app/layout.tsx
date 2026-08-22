import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Display face for headline figures only — see `figure-display` in globals.css.
 * One weight is all it ships and all we need; body text is Geist.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Finance Tracker",
    template: "%s — Finance Tracker",
  },
  description: "Track income and expenses, and see where the money went.",
};

/**
 * `themeColor` needs both entries so the mobile browser chrome matches the
 * theme — a light address bar above a dark app is the giveaway that dark mode
 * was bolted on. Values are the literal `--paper` from each block.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8fd" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e18" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="bg-paper text-ink flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
