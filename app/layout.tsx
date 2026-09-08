import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import { resolveSiteOrigin } from "@/lib/site-url";

import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_NAME = "Realtor Suite";
const APP_TAGLINE = "Showings, pipeline, and paperwork in one place.";

export const metadata: Metadata = {
  // Read in priority order: an explicit override first, then the canonical
  // production domain, then this specific deployment. Members are accessed
  // individually so the bundler can still inline them.
  // VERCEL_PROJECT_PRODUCTION_URL beats VERCEL_URL so preview builds still
  // point Open Graph tags at the real domain.
  metadataBase: resolveSiteOrigin([
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ]),
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} — Today`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  manifest: "/manifest.webmanifest",

  // Home Screen install on iPadOS/iOS. `capable` is what drops the Safari
  // address and tab bars; the translucent status bar lets the navy run to
  // the top edge, which viewport-fit=cover + pt-safe then pad around.
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },

  other: {
    // `appleWebApp.capable` above emits the title, the status-bar style, and
    // the renamed `mobile-web-app-capable` — but no longer the apple-prefixed
    // spelling. That is the tag iPadOS reads to drop the address and tab bars,
    // so it has to be set by hand. Do not also set mobile-web-app-capable here
    // or the head ends up with two of it.
    "apple-mobile-web-app-capable": "yes",
  },

  // Stops iOS auto-linking addresses and phone numbers in listing data.
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },

  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_TAGLINE,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom jitter is what breaks the illusion of a native app once the
  // browser bars are gone. Safari ignores this while browsing and honours it
  // in standalone, so it costs nothing in the tab.
  maximumScale: 1,
  userScalable: false,
  // Lets the layout paint under the status bar and home indicator.
  viewportFit: "cover",
  themeColor: "#0f172a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
