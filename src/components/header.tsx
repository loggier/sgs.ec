import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from './ui/button';

type HeaderProps = {
  title?: string;
  showBackButton?: boolean;
  backButtonHref?: string;
};

export default function Header({ title = 'Clientes', showBackButton = false, backButtonHref = '/' }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="md:hidden" />
      {showBackButton && (
        <Button asChild variant="outline" size="icon" className="h-8 w-8">
            <Link href={backButtonHref}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Regresar</span>
            </Link>
        </Button>
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
