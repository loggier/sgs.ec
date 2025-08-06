
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  MessageTemplateSchema,
  type MessageTemplate,
  type MessageTemplateFormInput,
  templateEventLabels,
  templateVariables
} from '@/lib/settings-schema';
import { saveMessageTemplate } from '@/lib/settings-actions';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

type MessageTemplateFormProps = {
  template: MessageTemplate | null;
  onSave: () => void;
  onCancel: () => void;
};

export default function MessageTemplateForm({ template, onSave, onCancel }: MessageTemplateFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const form = useForm<MessageTemplateFormInput>({
    resolver: zodResolver(MessageTemplateSchema.omit({id: true})),
    defaultValues: template
      ? { ...template }
      : {
          name: '',
          eventType: 'payment_reminder',
          content: '',
        },
  });

  async function onSubmit(values: MessageTemplateFormInput) {
    setIsSubmitting(true);
    try {
      const result = await saveMessageTemplate(values, template?.id);
      if (result.success) {
          toast({ title: 'Éxito', description: result.message });
          onSave();
      } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Ocurrió un error inesperado.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex h-full flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Plantilla</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Recordatorio de Pago Amistoso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Evento</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(templateEventLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido del Mensaje</FormLabel>
                  <FormControl>
                    <Textarea rows={8} placeholder="Escriba aquí el mensaje. Puede usar variables como {nombre_cliente}." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card className="mt-6 bg-secondary/50">
                <CardHeader>
                    <CardTitle className="text-base">Variables Disponibles</CardTitle>
                    <CardDescription>
                        Use estas variables en su mensaje. Serán reemplazadas por los datos reales al enviar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        {templateVariables.map((v, i) => (
                           <React.Fragment key={v.variable}>
                             <div className="flex justify-between items-center">
                                <p className="font-mono text-primary">{v.variable}</p>
                                <p className="text-muted-foreground">{v.description}</p>
                            </div>
                            {i < templateVariables.length -1 && <Separator/>}
                           </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>

          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar Plantilla'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
