import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ToDoBEST",
  description: "ToDoBEST - Your daily schedule and routine manager",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ToDoBEST",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
