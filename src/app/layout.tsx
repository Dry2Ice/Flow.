import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'dockview/dist/styles/dockview.css';
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { AppProviders } from "@/components/AppProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flow — AI-Powered Development Platform",
  description: "Flow is an AI coding assistant powered by NVIDIA NIM. Write, debug, plan and ship code with an intelligent AI partner in a unified web interface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeInitializer />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
