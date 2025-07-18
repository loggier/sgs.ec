
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import AppContent from '@/components/app-content';
import { getLoginSession } from '@/lib/auth';


export const metadata: Metadata = {
  title: 'SGC',
  description: 'Sistema de gestion de cliente.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getLoginSession();

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
        <AuthProvider initialUser={session}>
            <AppContent>
              {children}
            </AppContent>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
