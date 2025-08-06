
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, MoreVertical } from 'lucide-react';
import AppContent from '@/components/app-content';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
  getMessageTemplates,
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
    setIsLoading(true);
    const data = await getMessageTemplates();
    setTemplates(data);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    if (!authLoading && user?.role !== 'master') {
      router.push('/');
    } else if (user) {
      fetchTemplates();
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
    if (!selectedTemplate) return;

    setIsDeleting(true);
    const result = await deleteMessageTemplate(selectedTemplate.id!);
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

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'master') {
    return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            Solo los usuarios con rol de "Master" pueden acceder a esta sección.
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
                  <CardDescription>Cree y edite las plantillas para las notificaciones de WhatsApp.</CardDescription>
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
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{templateEventLabels[template.eventType]}</Badge>
                        </TableCell>
                        <TableCell>
                            <p className="line-clamp-2 max-w-sm text-muted-foreground">{template.content}</p>
                        </TableCell>
                        <TableCell>
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
                                <DropdownMenuItem onClick={() => handleDelete(template)} className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
