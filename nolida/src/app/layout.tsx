import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Relative OG/Twitter image paths are resolved against this at build time.
  // Falls back to the local port so a missing env var can never break a build.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
  ),
  title: {
    default: "noLIDA",
    template: "%s · noLIDA",
  },
  description:
    "Discover, request, book, and pay — all in one place. noLIDA is Nigeria's all-in-one social marketplace.",
  icons: {
    icon: [
      { url: "/branding/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/branding/apple-touch-icon.png",
  },
  openGraph: {
    title: "noLIDA",
    description: "Discover, request, book, and pay — all in one place.",
    siteName: "noLIDA",
    type: "website",
    images: ["/branding/logo-app-icon-512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "noLIDA",
    description: "Discover, request, book, and pay — all in one place.",
    images: ["/branding/logo-app-icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e27",
  width: "device-width",
  initialScale: 1,
  /*
   * `viewport-fit=cover` so the bottom nav can reach the screen edge on a
   * notched device. It is safe here because both the nav and the page header
   * already add `env(safe-area-inset-*)` padding — without that pairing,
   * cover-mode would push content under the notch and home indicator.
   *
   * Deliberately NOT setting `maximumScale` or `userScalable: false`. Pinch
   * zoom is a WCAG 1.4.4 requirement and disabling it locks out users who need
   * to magnify. The "page zooms when I tap a field" complaint is caused by the
   * 14px input font, not by the viewport scale, and is fixed at the font (see
   * `.ui-input` in Input.css) where it actually belongs.
   */
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

