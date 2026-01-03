

'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Car } from 'lucide-react';
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
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import { deleteUser } from '@/lib/user-actions';


type UserListProps = {
  initialUsers: User[];
  onDataChange: () => void;
};

export default function UserList({ initialUsers, onDataChange }: UserListProps) {
  const { searchTerm } = useSearch();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = React.useState(initialUsers);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  React.useEffect(() => {
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

  const handleFormSave = () => {
    onDataChange();
    setIsSheetOpen(false);
    setSelectedUser(null);
  };

  const onDeletionConfirmed = async () => {
    if (!selectedUser?.id) return;

    const result = await deleteUser(selectedUser.id);
    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message,
      });
      setIsDeleteDialogOpen(false);
      onDataChange();
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
      setIsDeleteDialogOpen(false);
    }
  };

  const getRoleVariant = (role: User['role']) => {
    switch (role) {
      case 'master':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'analista':
        return 'outline';
      case 'tecnico':
        return 'secondary';
      case 'usuario':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const displayRole: Record<User['role'], string> = {
    'master': 'Master',
    'manager': 'Manager',
    'analista': 'Analista',
    'tecnico': 'Técnico',
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

  const canManageUser = (targetUser: User) => {
    if (!currentUser) return false;
    if (currentUser.role === 'master') return true;
    if (currentUser.role === 'manager' && targetUser.creatorId === currentUser.id) return true;
    return false;
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
                <CardTitle>Gestión de Usuarios</CardTitle>
                <CardDescription>Agregue, edite o elimine usuarios.</CardDescription>
            </div>
            {currentUser && ['master', 'manager'].includes(currentUser.role) && (
                <Button onClick={handleAddUser} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Usuario
                </Button>
            )}
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
                  <TableHead>Unidades</TableHead>
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
                          {user.role === 'manager' ? (
                            <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{user.unitCount || 0}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                      </TableCell>
                      <TableCell>
                        {canManageUser(user) && (
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
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
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
        onConfirm={onDeletionConfirmed}
      />
    </>
  );
}
