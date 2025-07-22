
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { SearchProvider } from '@/context/search-context';
import AppContent from '@/components/app-content';

export const metadata: Metadata = {
  title: 'SGC',
  description: 'Sistema de gestion de cliente.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <SearchProvider>
            <AppContent>{children}</AppContent>
          </SearchProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
