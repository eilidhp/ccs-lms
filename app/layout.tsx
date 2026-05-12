import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "LMS | Change Consulting Scotland",
  description: "Bespoke Learning Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // We added suppressHydrationWarning here to tell Next.js to ignore browser extensions!
    <html lang="en" suppressHydrationWarning>
      <body className={`${lato.variable} font-sans`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}