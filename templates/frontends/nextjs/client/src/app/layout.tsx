import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';
import { appConfig } from '@/config/appConfig';
import { AppProvider } from '@/providers/AppProvider';
import './globals.css';

export const metadata: Metadata = {
  title: appConfig.name,
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    // The theme class is toggled on <html> in the browser (see MainLayout).
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
