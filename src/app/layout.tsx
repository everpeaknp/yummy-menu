import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL("https://menu.yummyever.com"),
  title: "Yummyever Menu - All Your Favorite Menus, One Place",
  description: "Browse digital menus from top restaurants in Nepal. Find what you crave, check prices, and visit your favorite spots.",
  icons: {
    icon: "/logos/yummy_logo.png",
  },
  openGraph: {
    title: "Yummyever Menu - All Your Favorite Menus, One Place",
    description: "Browse digital menus from top restaurants in Nepal. Find what you crave, check prices, and visit your favorite spots.",
    url: "https://menu.yummyever.com",
    siteName: "Yummyever Menu",
    images: [
      {
        url: "/og-image.png",
        width: 1200, 
        height: 630,
        alt: "Yummyever Menu Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Yummyever Menu - All Your Favorite Menus, One Place",
    description: "Browse digital menus from top restaurants in Nepal. Find what you crave, check prices, and visit your favorite spots.",
    images: ["/og-image.png"], 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-body antialiased`}>{children}</body>
    </html>
  );
}
