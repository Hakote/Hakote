import React from "react";
import { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "하코테 — 하루코딩테스트",
  description:
    "하루 한 문제로 코딩테스트 루틴 만들기. 매일 아침 문제 한 개, 생각 30분, 실력 1%씩.",
  metadataBase: new URL("https://www.hakote.dev"),
  openGraph: {
    title: "하코테 — 하루코딩테스트",
    description:
      "하루 한 문제로 코딩테스트 루틴 만들기. 매일 아침 문제 한 개, 생각 30분, 실력 1%씩.",
    url: "/",
    siteName: "하코테",
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/hakote-og.png",
        width: 1200,
        height: 630,
        alt: "하코테 — 하루코딩테스트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "하코테 — 하루코딩테스트",
    description:
      "하루 한 문제로 코딩테스트 루틴 만들기. 매일 아침 문제 한 개, 생각 30분, 실력 1%씩.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <GoogleAnalytics gaId={"G-KG28W680G3"} />
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
