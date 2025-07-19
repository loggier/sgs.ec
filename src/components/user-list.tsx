'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Search } from 'lucide-react';
import type { User } from '@/lib/user-schema';
import { useSearch } from '@/context/search-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import UserForm from './user-form';
import DeleteUserDialog from './delete-user-dialog';
import { Input } from './ui/input';

type UserListProps = {
  initialUsers: User[];
};

export default function UserList({ initialUsers }: UserListProps) {
  const { searchTerm, setSearchTerm } = useSearch();
  const [users, setUsers] = React.useState(initialUsers);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    // The user object from the server via initialUsers already lacks the password.
    // No need to map and remove it again.
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsSheetOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsSheetOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSave = (savedUser: User) => {
    setUsers(currentUsers => {
      const existingUser = currentUsers.find(u => u.id === savedUser.id);
      if (existingUser) {
        return currentUsers.map(u => (u.id === savedUser.id ? savedUser : u));
      }
      return [...currentUsers, savedUser];
    });
    setIsSheetOpen(false);
    setSelectedUser(null);
  };

  const onUserDeleted = (userId: string) => {
    setUsers(currentUsers => currentUsers.filter(u => u.id !== userId));
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  const getRoleVariant = (role: User['role']) => {
    switch (role) {
      case 'master':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'usuario':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const displayRole: Record<User['role'], string> = {
    'master': 'Master',
    'manager': 'Manager',
    'usuario': 'Usuario'
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return users;
    const lowercasedTerm = searchTerm.toLowerCase();
    return users.filter(user =>
      user.username.toLowerCase().includes(lowercasedTerm) ||
      (user.nombre && user.nombre.toLowerCase().includes(lowercasedTerm)) ||
      user.correo.toLowerCase().includes(lowercasedTerm) ||
      (user.telefono && user.telefono.includes(lowercasedTerm))
    );
  }, [searchTerm, users]);


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>Busque, agregue, edite o elimine usuarios.</CardDescription>
            </div>
            <Button onClick={handleAddUser} size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>
           <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, correo, teléfono..."
                className="w-full rounded-lg bg-background pl-8 md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.nombre || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{user.username}</div>
                      </TableCell>
                       <TableCell>{user.correo}</TableCell>
                       <TableCell>{user.telefono || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleVariant(user.role)}>
                          {displayRole[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Alternar menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
          <SheetHeader>
            <SheetTitle>{selectedUser ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</SheetTitle>
          </SheetHeader>
          <UserForm
            user={selectedUser}
            onSave={handleFormSave}
            onCancel={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DeleteUserDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onDelete={onUserDeleted}
      />
    </>
  );
}
