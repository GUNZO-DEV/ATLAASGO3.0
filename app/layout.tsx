import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import OfflineBanner from "@/components/OfflineBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import ToasterProvider from "@/components/ToasterProvider";
import PostHogProvider from "@/components/PostHogProvider";
import PostHogPageView from "@/components/PostHogPageView";
import { CartProvider } from "@/contexts/CartContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlaas Go — Livraison marocaine",
  description: "La livraison marocaine, pensée pour les Marocains.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${plusJakartaSans.variable} ${bricolageGrotesque.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <PostHogProvider>
            <Suspense><PostHogPageView /></Suspense>
            <ToasterProvider />
            <OfflineBanner />
            <ErrorBoundary><CartProvider>{children}</CartProvider></ErrorBoundary>
          </PostHogProvider>
        </body>
    </html>
  );
}
