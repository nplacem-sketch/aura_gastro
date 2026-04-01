import type { Metadata } from "next";
import { Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { AuthProvider } from "@/lib/auth-context";
import MagicEditorOverlay from "@/components/MagicEditorOverlay";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-headline",
  style: ["normal", "italic"],
  weight: ["300", "400", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "AURA GASTRONOMY | Panel Maestro",
    template: "%s | AURA GASTRONOMY",
  },
  description:
    "Plataforma gastronómica avanzada: formación, laboratorio culinario y recetario con inteligencia artificial.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={cn(
          "bg-surface text-on-surface font-body selection:bg-primary-container selection:text-primary min-h-screen",
          notoSerif.variable,
          manrope.variable,
        )}
      >
        <AuthProvider>
          {children}
          <MagicEditorOverlay />
        </AuthProvider>
      </body>
    </html>
  );
}
