
'use client';

import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useSearch } from '@/context/search-context';
import { usePathname } from 'next/navigation';
import * as React from 'react';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
  backButtonHref?: string;
  children?: React.ReactNode;
};

// Páginas que no mostrarán la barra de búsqueda
const noSearchPages = ['/login'];

export default function Header({ title, showBackButton = false, backButtonHref = '/', children }: HeaderProps) {
  const { searchTerm, setSearchTerm } = useSearch();
  const pathname = usePathname();

  const showSearch = !noSearchPages.some(path => pathname.startsWith(path));

  return (
    <header className="flex flex-col md:flex-row h-auto items-start md:items-center gap-4 px-4 md:px-0 py-4 border-b mb-6">
      <div className="flex items-center gap-4 flex-1">
        {showBackButton && (
          <Button asChild variant="outline" size="icon" className="h-8 w-8">
              <Link href={backButtonHref}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Regresar</span>
              </Link>
          </Button>
        )}
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
       <div className="flex items-center gap-2 w-full md:w-auto">
          {children}
          {showSearch && (
            <div className="relative flex-1 md:flex-initial md:w-auto md:min-w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar en toda la aplicación..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          )}
       </div>
    </header>
  );
}
