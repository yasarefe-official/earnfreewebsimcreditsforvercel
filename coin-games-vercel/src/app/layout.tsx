import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers"; // Import the new provider component

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
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
