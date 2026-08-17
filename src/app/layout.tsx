import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { ToastProvider } from "@/components/ui/Toast";
import { SessionProviderWrapper } from "@/components/auth/SessionProviderWrapper";
import { ServiceWorkerRegister } from "@/components/shell/ServiceWorkerRegister";
import "./globals.css";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta");
  const title = t("defaultTitle");
  const description = t("defaultDescription");

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: t("titleTemplate"),
    },
    description,
    openGraph: {
      siteName: title,
      title,
      description,
      url: "/",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // required for safe-area-inset-* to resolve
  themeColor: "#faf7f2",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProviderWrapper>
            <ToastProvider>{children}</ToastProvider>
          </SessionProviderWrapper>
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
