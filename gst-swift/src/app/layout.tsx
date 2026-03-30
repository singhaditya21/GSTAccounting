import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
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
  title: "GSTSwift | Future of SaaS",
  description: "100% GST-compliant Invoicing + Accounting SaaS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isMissingKey = !clerkPubKey || clerkPubKey.includes("pk_test_...");

  if (isMissingKey) {
    return (
      <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body suppressHydrationWarning className="min-h-full flex flex-col items-center justify-center bg-zinc-50 p-6">
          <div className="max-w-md w-full p-8 bg-white border border-rose-200 rounded-xl shadow-sm text-center space-y-4 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500"></div>
            <h1 className="text-xl font-bold text-rose-600">Authentication Setup Required</h1>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Your <b>Clerk Provider API Keys</b> are currently set to the default placeholders.
            </p>
            <div className="bg-zinc-100 p-4 rounded-md text-left overflow-x-auto text-xs font-mono text-zinc-800">
              {`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...\nCLERK_SECRET_KEY=sk_test_...`}
            </div>
            <p className="text-xs text-zinc-500">
              Create a free account at clerk.com, obtain your Next.js keys, paste them into the <code>.env</code> file, and restart the server.
            </p>
          </div>
        </body>
      </html>
    );
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html
        lang={locale}
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body suppressHydrationWarning className="min-h-full flex flex-col">
          <NextIntlClientProvider messages={messages}>
             {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
