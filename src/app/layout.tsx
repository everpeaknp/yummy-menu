import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

// SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://menu.yummyever.com"
  ),
  title: {
    template: "%s | Yummy",
    default: "Yummy - Your dining life, together",
  },
  applicationName: "Yummy",
  description:
    "Keep your restaurants, orders, rewards and offers together in one Yummy customer profile.",
  keywords: [
    "restaurant rewards",
    "customer dining profile",
    "Nepal food",
    "order history",
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
    title: "Yummy - Your dining life, together",
    description:
      "Keep your restaurants, orders, rewards and offers together in one Yummy customer profile.",
    type: "website",
    locale: "en_US",
    siteName: "Yummy",
    url: "https://menu.yummyever.com",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Yummy customer experience",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yummy - Your dining life, together",
    description:
      "Keep your restaurants, orders, rewards and offers together in one Yummy customer profile.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Yummy",
  "applicationCategory": "LifestyleApplication",
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
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
