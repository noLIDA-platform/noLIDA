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

/**
 * Viewport meta, injected as `<meta name="viewport">` by Next.js.
 *
 * This export must live in the ROOT layout (`src/app/layout.tsx`) and nowhere
 * else. Next.js reads it once, from the root, and ignores a `viewport` export in
 * a nested layout — so a stray one in `(main)` or `(auth)` is dead code that
 * looks like it is doing something. Phase 8G confirmed this is the only one.
 *
 * `viewportFit: "cover"` lets the bottom nav reach the screen edge on a notched
 * device. It is safe only because `.app-bottom-nav` and the page headers add
 * `env(safe-area-inset-*)` padding — without that pairing, cover-mode pushes
 * content under the notch and home indicator.
 *
 * `maximumScale` / `userScalable: false` are set on product instruction, to stop
 * the page zooming under a pinch. Two things worth knowing:
 *
 * 1. Most modern mobile browsers **ignore both** for accessibility reasons, so
 *    on recent iOS/Android this is effectively inert.
 * 2. Where they ARE honoured, they disable pinch zoom, which is a WCAG 1.4.4
 *    requirement — a real cost for low-vision users.
 *
 * The "page jumps when I tap a field" symptom is a *separate* bug and is not
 * fixed by this tag: it was iOS auto-zoom on inputs under 16px, corrected at
 * `.ui-input` / `.ui-textarea` in `styles/`. Keep that fix if these ever go.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0e27",
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

