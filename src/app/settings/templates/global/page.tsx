
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Loader2, AlertTriangle, Globe } from 'lucide-react';
import AppContent from '@/components/app-content';
import Header from '@/components/header';
import { useAuth } from '@/context/auth-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import MessageTemplateForm from '@/components/message-template-form';

import { getGlobalMessageTemplates } from '@/lib/settings-actions';
import {
  type MessageTemplate,
  templateEventLabels,
} from '@/lib/settings-schema';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function GlobalMessageTemplatesPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [templates, setTemplates] = React.useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<MessageTemplate | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    if (user?.role !== 'master') return;
    setIsLoading(true);
    try {
      const data = await getGlobalMessageTemplates();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to fetch global templates:", error);
      toast({ title: "Error", description: "No se pudieron cargar las plantillas globales.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if (!authLoading) {
      if (user?.role !== 'master') {
        router.push('/');
      } else {
        fetchTemplates();
      }
    }
  }, [user, authLoading, router, fetchTemplates]);

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setIsSheetOpen(true);
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
            Solo los usuarios con rol "Master" pueden acceder a esta sección.
          </AlertDescription>
        </Alert>
    );
  }

  return (
    <>
      <Header title="Plantillas de Mensajes Globales" showBackButton backButtonHref="/settings" />
       <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestor de Plantillas Globales</CardTitle>
                  <CardDescription>Edite el contenido de las plantillas que se usarán por defecto en toda la aplicación.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
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
                        <TableCell>
                          <Badge variant={template.isActive ? 'default' : 'secondary'} className={cn(template.isActive && 'bg-green-500 hover:bg-green-600')}>
                            {template.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium flex items-center gap-2">
                            {template.name}
                             <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                <Globe className="mr-1 h-3 w-3"/> Global
                            </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{templateEventLabels[template.eventType]}</Badge>
                        </TableCell>
                        <TableCell>
                            <p className="line-clamp-2 max-w-sm text-muted-foreground">{template.content}</p>
                        </TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No hay plantillas globales encontradas.
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
            <SheetTitle>Editar Plantilla Global</SheetTitle>
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
    </>
  );
}


export default function GlobalMessageTemplatesPage() {
    return (
        <AppContent>
            <GlobalMessageTemplatesPageContent />
        </AppContent>
    );
}
