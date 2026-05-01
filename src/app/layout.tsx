import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Resolves relative OG/Twitter image paths; set NEXT_PUBLIC_SITE_URL in production. */
function appMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.includes("://") ? raw : `https://${raw}`);
    } catch {
      /* ignore */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return new URL(`https://${vercel}`);
  }
  return new URL("http://localhost:3000");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: appMetadataBase(),
  title: {
    default: "Spendda",
    template: "%s · Spendda",
  },
  description:
    "Spendda surfaces what matters in spend and payroll before it escalates. Governed AI, forecasts, and board-ready exports for teams that cannot afford surprises.",
  icons: {
    icon: [{ url: "/brand/spendda-logo.png", type: "image/png" }],
    apple: [{ url: "/brand/spendda-logo.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    siteName: "Spendda",
    locale: "en_US",
    title: "Spendda",
    description:
      "Spend and payroll reporting that surfaces what matters before it escalates. Forecasting, alerts, and executive-ready reporting.",
    images: [{ url: "/brand/spendda-logo.png", width: 1024, height: 1024, alt: "Spendda" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spendda",
    description:
      "Detect waste, improve accountability, and ship executive-ready reports with AI-powered analytics.",
    images: ["/brand/spendda-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
