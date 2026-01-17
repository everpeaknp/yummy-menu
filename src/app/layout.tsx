import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://menu.yummyever.com"
  ),
  title: {
    template: "%s | Yummyever Menu",
    default: "Yummyever Menu - All Your Favorite Menus, One Place",
  },
  applicationName: "Yummyever Menu",
  description:
    "Browse digital menus from top restaurants in Nepal. Find what you crave, check prices, and visit your favorite spots.",
  keywords: [
    "restaurant menu",
    "digital menu",
    "Nepal food",
    "menu prices",
    "Yummyever",
    "food delivery",
  ],
  authors: [{ name: "Yummyever" }],
  icons: {
    icon: "/logos/yummy_logo.png",
    apple: "/logos/yummy_logo.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Yummyever Menu - All Your Favorite Menus, One Place",
    description:
      "Browse digital menus from top restaurants in Nepal. Find what you crave, check prices, and visit your favorite spots.",
    type: "website",
    locale: "en_US",
    siteName: "Yummyever Menu",
    url: "https://menu.yummyever.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Yummyever Menu Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yummyever Menu - All Your Favorite Menus, One Place",
    description:
      "Browse digital menus from top restaurants in Nepal. Find what you crave, check prices, and visit your favorite spots.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Yummyever Menu",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, Android, iOS",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "NPR",
  },
  "author": {
    "@type": "Organization",
    "name": "Yummyever",
    "url": "https://menu.yummyever.com"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-body antialiased`}>
         <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
