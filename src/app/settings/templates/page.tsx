
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, MoreVertical, Globe, Copy } from 'lucide-react';
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
  getGlobalMessageTemplates,
  deleteMessageTemplate,
} from '@/lib/settings-actions';
import {
  type MessageTemplate,
  templateEventLabels,
  TemplateEventType
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


function GlobalTemplatesInfo({ onCustomize }: { onCustomize: (template: MessageTemplate) => void }) {
  const [globalTemplates, setGlobalTemplates] = React.useState<MessageTemplate[]>([]);

  React.useEffect(() => {
    getGlobalMessageTemplates().then(setGlobalTemplates);
  }, []);

  if (globalTemplates.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plantillas Globales por Defecto</CardTitle>
        <CardDescription>
          Estas son las plantillas que se usarán para sus notificaciones si no crea una versión personal. Puede personalizarlas para adaptarlas a su estilo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {globalTemplates.map((template, index) => (
          <React.Fragment key={template.id}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {template.name} 
                  <Badge variant="secondary">{templateEventLabels[template.eventType]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.content}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onCustomize(template)}>
                <Copy className="mr-2 h-4 w-4" /> Personalizar
              </Button>
            </div>
            {index < globalTemplates.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}


function MessageTemplatesPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [personalTemplates, setPersonalTemplates] = React.useState<MessageTemplate[]>([]);
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
      const userPersonalTemplates = data.filter(t => !t.isGlobal);
      setPersonalTemplates(userPersonalTemplates);
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
  
  const handleCustomize = (templateToCopy: MessageTemplate) => {
    setSelectedTemplate({
        ...templateToCopy,
        name: `Copia de ${templateToCopy.name}`,
        isGlobal: false,
        ownerId: user?.id ?? null,
    });
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
      <Header title="Plantillas de Mensajes Personales" showBackButton backButtonHref="/settings" />
      
      {user.role === 'manager' && <div className="mb-6"><GlobalTemplatesInfo onCustomize={handleCustomize} /></div>}

       <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mis Plantillas Personales</CardTitle>
                  <CardDescription>Cree y edite sus plantillas para notificaciones. Estas anularán a las globales.</CardDescription>
                </div>
                  <Button onClick={handleAdd} size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nueva Plantilla Personal
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
                  {personalTemplates.length > 0 ? (
                    personalTemplates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                            {template.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{templateEventLabels[template.eventType as TemplateEventType]}</Badge>
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
                        No ha creado ninguna plantilla personal todavía.
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
            <SheetTitle>{selectedTemplate?.id ? 'Editar Plantilla Personal' : 'Nueva Plantilla Personal'}</SheetTitle>
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
