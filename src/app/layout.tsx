import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppToaster } from "@/components/AppToaster";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitKolay — GitHub'ı kolayca kullanın",
  description:
    "GitHub depolarınızı görüntüleyin, dosyaları tarayıcıda düzenleyin ve yeni depo oluşturun. Terminal gerekmez.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="bg-page font-sans text-ink antialiased">
        <SessionProvider>
          <div id="app-shell" className="flex min-h-screen flex-col">
            <AppHeader />
            <div className="flex-1">{children}</div>
            <footer className="border-t border-line">
              <div className="mx-auto flex max-w-wide flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <p>GitKolay — GitHub için sade bir arayüz.</p>
                <p>
                  Verileriniz tarayıcınızdan doğrudan GitHub&apos;a gider.
                </p>
              </div>
            </footer>
          </div>
          <AppToaster />
        </SessionProvider>
      </body>
    </html>
  );
}
