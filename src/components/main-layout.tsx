
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, Briefcase, UsersRound, Car, LogOut, Edit, History } from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import type { User } from '@/lib/user-schema';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from './ui/sidebar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ProfileForm from './profile-form';

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
};

function NavLink({ href, children }: NavLinkProps) {
    const pathname = usePathname();
    const isActive = pathname === href;
    return (
      <Link href={href} className="block">
        <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-2">
            {children}
        </Button>
      </Link>
    );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { logout, user, updateUserContext } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const handleProfileSave = (updatedUser: User) => {
    updateUserContext(updatedUser);
    setIsProfileDialogOpen(false);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="flex-col border-r bg-card">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Banknote className="h-5 w-5 text-primary-foreground" />
              </div>
              <span>SGC</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                 <NavLink href="/">
                    <Briefcase className="h-4 w-4" />
                    <span>Clientes</span>
                 </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink href="/units">
                    <Car className="h-4 w-4" />
                    <span>Unidades</span>
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <NavLink href="/payments">
                    <History className="h-4 w-4" />
                    <span>Historial de Pagos</span>
                </NavLink>
              </SidebarMenuItem>
              {user?.role === 'master' && (
                 <SidebarMenuItem>
                    <NavLink href="/users">
                        <UsersRound className="h-4 w-4" />
                        <span>Usuarios</span>
                    </NavLink>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t">
             {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start items-center gap-3 p-2 h-auto text-left">
                       <Avatar className="h-9 w-9">
                          <AvatarFallback>{getInitials(user.nombre)}</AvatarFallback>
                       </Avatar>
                       <div className="flex flex-col">
                          <span className="font-semibold text-sm truncate">{user.nombre || user.username}</span>
                          <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                       </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                    <DropdownMenuLabel>
                        <p className="font-bold">{user.nombre}</p>
                        <p className="text-xs text-muted-foreground font-normal">{user.correo}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 p-4 md:p-6 h-screen overflow-auto">
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
    </SidebarProvider>
  );
}
