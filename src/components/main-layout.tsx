
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Banknote, Briefcase, UsersRound, Car, LogOut, Edit, CreditCard, Settings, LayoutDashboard, History, Menu, Wrench, HardHat, BarChart } from 'lucide-react';
import Image from 'next/image';

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
  useSidebar,
} from './ui/sidebar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import ProfileForm from './profile-form';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
};

function NavLink({ href, children }: NavLinkProps) {
    const pathname = usePathname();
    const { isCollapsed } = useSidebar();
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link href={href} className="block">
        <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-2">
            {children}
        </Button>
      </Link>
    );
}

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { logout, user, updateUserContext } = useAuth();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { isCollapsed } = useSidebar();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const handleProfileSave = (updatedUser: User) => {
    updateUserContext(updatedUser);
    setIsProfileDialogOpen(false);
  };

  const navContent = (
    <>
        <SidebarHeader className="p-4 flex items-center justify-center">
             <Link href="/" className="flex items-center gap-2 font-semibold">
                {isCollapsed ? (
                    <span className="font-bold text-xl">SGI</span>
                ) : (
                    <Image src="/sgi_logo.png" alt="SGI Logo" width={128} height={32} priority />
                )}
            </Link>
        </SidebarHeader>
        <SidebarContent className="flex-1 p-2">
            <SidebarMenu>
            <SidebarMenuItem>
                <NavLink href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    {!isCollapsed && <span>Dashboard</span>}
                </NavLink>
            </SidebarMenuItem>
            
            {user && user.role !== 'tecnico' && (
                <>
                    <SidebarMenuItem>
                        <NavLink href="/clients">
                            <Briefcase className="h-4 w-4" />
                            {!isCollapsed && <span>Clientes</span>}
                        </NavLink>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <NavLink href="/units">
                            <Car className="h-4 w-4" />
                            {!isCollapsed && <span>Unidades</span>}
                        </NavLink>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <NavLink href="/payments">
                            <CreditCard className="h-4 w-4" />
                            {!isCollapsed && <span>Gestión de Pagos</span>}
                        </NavLink>
                    </SidebarMenuItem>
                </>
            )}

            <SidebarMenuItem>
                <NavLink href="/work-orders">
                    <Wrench className="h-4 w-4" />
                    {!isCollapsed && <span>Órd. de Soporte</span>}
                </NavLink>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <NavLink href="/installations">
                    <HardHat className="h-4 w-4" />
                    {!isCollapsed && <span>Instalaciones</span>}
                </NavLink>
            </SidebarMenuItem>
           
            {user && ['master', 'manager'].includes(user.role) && (
                <>
                    <SidebarMenuItem>
                        <NavLink href="/users">
                            <UsersRound className="h-4 w-4" />
                            {!isCollapsed && <span>Usuarios</span>}
                        </NavLink>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <NavLink href="/settings">
                            <Settings className="h-4 w-4" />
                            {!isCollapsed && <span>Configuración</span>}
                        </NavLink>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <NavLink href="/reports">
                            <BarChart className="h-4 w-4" />
                            {!isCollapsed && <span>Reportes</span>}
                        </NavLink>
                    </SidebarMenuItem>
                </>
                )}
            {user && ['master'].includes(user.role) && (
                <SidebarMenuItem>
                    <NavLink href="/logs">
                        <History className="h-4 w-4" />
                        {!isCollapsed && <span>Logs de Notificaciones</span>}
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
                    {!isCollapsed &&
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm truncate">{user.nombre || user.username}</span>
                            <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                        </div>
                    }
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
    </>
  );

  return (
      <div className="flex min-h-screen">
         <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 flex flex-col">
              <SheetHeader>
                 <SheetTitle className="sr-only">Menú Principal</SheetTitle>
              </SheetHeader>
              <div onClick={() => setIsMobileMenuOpen(false)}>{navContent}</div>
            </SheetContent>
         </Sheet>
        
        <Sidebar className="hidden md:flex">
          {navContent}
        </Sidebar>

        <main className="flex-1 h-screen overflow-auto md:pl-0 pl-16 pt-12 md:pt-0">
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


export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <MainLayoutContent>{children}</MainLayoutContent>
        </SidebarProvider>
    )
}
