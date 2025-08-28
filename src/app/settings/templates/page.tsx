
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, MoreVertical, Globe } from 'lucide-react';
import AppContent from '@/components/app-content';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
import MessageTemplateForm from '@/components/message-template-form';

import {
  getMessageTemplatesForUser,
  deleteMessageTemplate,
} from '@/lib/settings-actions';
import {
  type MessageTemplate,
  templateEventLabels,
} from '@/lib/settings-schema';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';


function MessageTemplatesPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = React.useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<MessageTemplate | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getMessageTemplatesForUser(user.id);
      setTemplates(data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast({ title: "Error", description: "No se pudieron cargar las plantillas.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if (!authLoading) {
      if (user?.role && !['master', 'manager'].includes(user.role)) {
        router.push('/');
      } else if (user) {
        fetchTemplates();
      }
    }
  }, [user, authLoading, router, fetchTemplates]);

  const handleAdd = () => {
    setSelectedTemplate(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsSheetOpen(true);
  };

  const handleDelete = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate || !user) return;

    setIsDeleting(true);
    const result = await deleteMessageTemplate(selectedTemplate.id!, user);
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
      fetchTemplates();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setSelectedTemplate(null);
  };
  
  const canManageTemplate = (template: MessageTemplate) => {
      if (!user) return false;
      if (template.isGlobal) {
          return user.role === 'master';
      }
      return true; // Personal templates are always manageable by the owner
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'master' && user?.role !== 'manager') {
    return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            Solo los usuarios con rol "Master" o "Manager" pueden acceder a esta sección.
          </AlertDescription>
        </Alert>
    );
  }

  return (
    <>
      <Header title="Plantillas de Mensajes" showBackButton backButtonHref="/settings" />
       <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestor de Plantillas</CardTitle>
                  <CardDescription>Cree y edite sus plantillas para notificaciones. Las plantillas globales se usarán si no existe una personal.</CardDescription>
                </div>
                  <Button onClick={handleAdd} size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nueva Plantilla
                  </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre de Plantilla</TableHead>
                    <TableHead>Tipo de Evento</TableHead>
                    <TableHead>Contenido</TableHead>
                    <TableHead>
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length > 0 ? (
                    templates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                            {template.name}
                            {template.isGlobal && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                    <Globe className="mr-1 h-3 w-3"/> Global
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{templateEventLabels[template.eventType]}</Badge>
                        </TableCell>
                        <TableCell>
                            <p className="line-clamp-2 max-w-sm text-muted-foreground">{template.content}</p>
                        </TableCell>
                        <TableCell>
                         {canManageTemplate(template) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Alternar menú</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(template)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                {!template.isGlobal && (
                                  <DropdownMenuItem onClick={() => handleDelete(template)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                         )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        No hay plantillas creadas.
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
            <SheetTitle>{selectedTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</SheetTitle>
          </SheetHeader>
          <MessageTemplateForm
            template={selectedTemplate}
            onSave={() => {
              setIsSheetOpen(false);
              fetchTemplates();
            }}
            onCancel={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la plantilla{' '}
              <span className="font-semibold">{selectedTemplate?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function MessageTemplatesPage() {
    return (
        <AppContent>
            <MessageTemplatesPageContent />
        </AppContent>
    );
}
