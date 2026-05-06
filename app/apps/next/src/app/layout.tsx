import type { Metadata } from "next";
import { Onest } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const onest = Onest({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PortEx - E-Document Portal",
  description: "Portal E-Document Export Sales — Sistem pengelolaan dokumen ekspor terpusat untuk PT Semen Tonasa, SIG Group.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${onest.className} min-h-full bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
