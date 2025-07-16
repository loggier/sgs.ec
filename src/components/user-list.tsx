'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import type { User } from '@/lib/user-schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type UserListProps = {
  initialUsers: User[];
};

export default function UserList({ initialUsers }: UserListProps) {
  const [users, setUsers] = React.useState(initialUsers);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    // We don't want to show passwords on the client side
    const usersWithoutPasswords = initialUsers.map(({ password, ...user }) => user as User);
    setUsers(usersWithoutPasswords);
  }, [initialUsers]);

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsSheetOpen(true);
  };
  
  const handleEditUser = (user: User) => {
    // This is a placeholder. Edit functionality is not implemented yet.
    alert(`Editar usuario: ${user.username}`);
  };

  const handleDeleteUser = (user: User) => {
    // This is a placeholder. Delete functionality is not implemented yet.
    alert(`Eliminar usuario: ${user.username}`);
  };


  const handleFormSave = (newUser: User) => {
    setUsers(currentUsers => [...currentUsers, newUser]);
    setIsSheetOpen(false);
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
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestión de Usuarios</CardTitle>
          <Button onClick={handleAddUser} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
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
                  <TableCell colSpan={3} className="text-center">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md w-full">
          <SheetHeader>
            <SheetTitle>{selectedUser ? 'Editar Usuario' : 'Agregar Nuevo Usuario'}</SheetTitle>
          </SheetHeader>
          <UserForm
            onSave={handleFormSave}
            onCancel={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </Card>
  );
}
