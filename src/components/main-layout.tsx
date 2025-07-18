
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, LogOut, Edit } from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/user-schema';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ProfileForm from './profile-form';

type MainLayoutProps = {
  children: React.ReactNode;
};

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
        <Link href={href} className={cn(
            "transition-colors text-foreground/60 hover:text-foreground/80",
            isActive && "text-foreground font-semibold"
        )}>
            {children}
        </Link>
    )
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { logout, user, updateUserContext } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  const handleProfileSave = (updatedUser: User) => {
    updateUserContext(updatedUser);
    setIsProfileDialogOpen(false);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Banknote className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold">SGC</span>
          </Link>
          <NavLink href="/">Clientes</NavLink>
          <NavLink href="/units">Unidades</NavLink>
          {user?.role === 'master' && (
            <NavLink href="/users">Usuarios</NavLink>
          )}
        </nav>
        
        <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
           {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                       <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(user.nombre)}</AvatarFallback>
                       </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel>
                        <p className="font-bold">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground font-normal">{user.correo}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-6">
        {children}
      </main>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar mi Perfil</DialogTitle>
          </DialogHeader>
          {user && (
            <ProfileForm
              user={user}
              onSave={handleProfileSave}
              onCancel={() => setIsProfileDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
