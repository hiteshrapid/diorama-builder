import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diorama",
  description: "3D workspace visualizer for OpenClaw",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
          background: "#0a1018",
          color: "#e6ebf5",
          fontSize: 14,
          lineHeight: 1.5,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {children}
      </body>
    </html>
  );
}
