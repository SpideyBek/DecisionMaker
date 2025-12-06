import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "DecisionAI - AI-Powered Decision Making Tool",
  description:
    "Stop overthinking! DecisionAI helps you make confident decisions by asking the right questions and providing personalized recommendations.",
  keywords: ["decision maker", "AI decision tool", "choice helper", "decision assistant"],
  authors: [{ name: "Bibek Tiwari", url: "https://bibektiwari.com" }],
  metadataBase: new URL("https://www.decisionai.click"),
  openGraph: {
    title: "DecisionAI - AI-Powered Decision Making Tool",
    description: "Stop overthinking! Get AI-powered recommendations for your decisions.",
    url: "https://www.decisionai.click",
    siteName: "DecisionAI",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>{children}</body>
    </html>
  );
}
