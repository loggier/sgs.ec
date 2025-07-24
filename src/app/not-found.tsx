import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-4xl font-bold mb-2">Error 404</h1>
      <p className="text-xl text-muted-foreground mb-6">
        La página que estás buscando no existe o ha sido movida.
      </p>
      <Button asChild variant="default">
        <Link href="/" legacyBehavior passHref>
          <a>Volver al Inicio</a>
        </Link>
      </Button>
    </div>
  );
}