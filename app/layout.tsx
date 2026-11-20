import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rhett’s Arcade",
  description: "Your games. One home. Bring your saves with you.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
