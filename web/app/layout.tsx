import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Subdir - Download GitHub/GitLab/Bitbucket Folders",
  description:
    "Free tool to download specific folders from GitHub, GitLab, and Bitbucket as ZIP. No git clone required.",
  keywords: [
    "github folder download",
    "gitlab directory download",
    "bitbucket subdirectory",
    "download without cloning",
    "github subdirectory",
    "download github folder",
    "partial git clone",
  ],
  openGraph: {
    title: "Subdir - Download GitHub/GitLab/Bitbucket Folders",
    description:
      "Free tool to download specific folders from GitHub, GitLab, and Bitbucket as ZIP. No git clone required.",
    type: "website",
    locale: "en_US",
    siteName: "Subdir",
  },
  twitter: {
    card: "summary_large_image",
    title: "Subdir - Download GitHub/GitLab/Bitbucket Folders",
    description:
      "Free tool to download specific folders from GitHub, GitLab, and Bitbucket as ZIP. No git clone required.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
