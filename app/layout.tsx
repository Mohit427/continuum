import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Noto_Sans_Devanagari, Noto_Sans_Tamil } from "next/font/google";
import { Toaster } from "sonner";
import { THEME_SCRIPT } from "@/components/shell/ThemeToggle";
import { SLOT_SCRIPT } from "@/lib/supabase/slot";
import "./globals.css";

const grotesk = Hanken_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600"], display: "swap", preload: false });
const taml = Noto_Sans_Tamil({ variable: "--font-taml", subsets: ["tamil"], weight: ["400", "600"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Continuum: one record across every doctor", template: "%s · Continuum" },
  description: "A patient-held, consent-based health record that turns scattered prescriptions and lab reports into one verified timeline, and finds what no single doctor could see.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0e17" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${deva.variable} ${taml.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SLOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: "15px", borderRadius: "12px" } }} />
      </body>
    </html>
  );
}
