import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export const metadata: Metadata = {
  title: "ToDoBEST",
  description: "ToDoBEST - Your daily schedule and routine manager",
  manifest: "/manifest.json",
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
        <div className="app-container">
          <Navigation />
          <div className="main-content-area">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
