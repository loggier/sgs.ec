import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-4xl font-bold mb-2">Error 404</h1>
      <p className="text-xl text-muted-foreground mb-6">
        La página que estás buscando no existe o ha sido movida.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}