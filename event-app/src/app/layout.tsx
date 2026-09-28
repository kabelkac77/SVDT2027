import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SVDT · Partneři",
  description: "Interní organizace SVDT",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
