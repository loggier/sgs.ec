
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Banknote, Briefcase, UsersRound, Car, LogOut, Edit } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/auth-context';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ProfileForm from './profile-form';
import type { User } from '@/lib/user-schema';
import Header from './header';

type MainLayoutProps = {
  children: React.ReactNode;
  title: string;
  showBackButton?: boolean;
  backButtonHref?: string;
};

export default function MainLayout({ children, title, showBackButton, backButtonHref }: MainLayoutProps) {
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
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Banknote className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
              SGC
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Clientes">
                <Link href="/">
                  <Briefcase />
                  Clientes
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Unidades">
                <Link href="/units">
                  <Car />
                  Unidades
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {user?.role === 'master' && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Usuarios">
                  <Link href="/users">
                    <UsersRound />
                    Usuarios
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {user && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start items-center gap-2 p-2 h-auto text-left">
                       <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(user.nombre)}</AvatarFallback>
                       </Avatar>
                       <div className="flex flex-col overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
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
                    <DropdownMenuItem onClick={() => logout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen">
        <Header title={title} showBackButton={showBackButton} backButtonHref={backButtonHref} />
        <div className="flex-1 overflow-auto">
           {children}
        </div>
      </SidebarInset>

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
    </SidebarProvider>
  );
}
