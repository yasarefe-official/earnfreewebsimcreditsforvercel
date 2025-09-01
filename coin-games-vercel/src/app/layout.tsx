import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Coin Games - Earn Websim Credits",
  description: "Play games to earn credits on Websim",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
