
'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Trash2, CheckCircle, XCircle } from 'lucide-react';

import type { MessageLog } from '@/lib/log-schema';
import { getMessageLogs, clearAllLogs } from '@/lib/log-actions';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ClearLogsDialog from './clear-logs-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function LogList() {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<MessageLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);
  const [isClearing, setIsClearing] = React.useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false);

  const fetchLogs = React.useCallback(async (lastVisible: any = null) => {
    setIsLoading(true);
    try {
      const { logs: newLogs, hasMore: newHasMore, lastDoc: newLastDoc } = await getMessageLogs(lastVisible);
      setLogs(prev => lastVisible ? [...prev, ...newLogs] : newLogs);
      setHasMore(newHasMore);
      setLastDoc(newLastDoc);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los logs.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    setIsClearing(true);
    const result = await clearAllLogs();
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
      setLogs([]); // Clear logs from state immediately
      setHasMore(false);
      setLastDoc(null);
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    setIsClearing(false);
    setIsClearDialogOpen(false);
  };
  
  const formatDate = (date: Date | string) => {
      try {
          const dateObj = typeof date === 'string' ? new Date(date) : date;
          if (isNaN(dateObj.getTime())) {
              return "Fecha inválida";
          }
          return format(dateObj, "dd/MM/yyyy HH:mm:ss", { locale: es });
      } catch {
          return "Fecha inválida";
      }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Historial de Envíos</CardTitle>
                <CardDescription>Auditoría de todos los mensajes enviados por el sistema.</CardDescription>
              </div>
              <Button size="sm" variant="destructive" onClick={() => setIsClearDialogOpen(true)} disabled={logs.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Enviado por (Qyvoo ID)</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : logs.length > 0 ? (
                    logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(log.sentAt)}</TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle className="mr-1 h-3 w-3" /> Exitoso
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                  <Badge variant="destructive">
                                    <XCircle className="mr-1 h-3 w-3" /> Fallido
                                  </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{log.errorMessage}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/clients/${log.clientId}/units`} className="font-medium text-primary hover:underline">
                            {log.clientName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{log.recipientNumber}</TableCell>
                        <TableCell className="text-muted-foreground">{log.qyvooUserId}</TableCell>
                        <TableCell>
                           <Tooltip>
                              <TooltipTrigger>
                                <p className="truncate max-w-xs">{log.messageContent}</p>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                <p className="whitespace-pre-wrap max-w-md">{log.messageContent}</p>
                              </TooltipContent>
                            </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No hay logs para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => fetchLogs(lastDoc)} disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cargar más
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        <ClearLogsDialog
          isOpen={isClearDialogOpen}
          onOpenChange={setIsClearDialogOpen}
          isClearing={isClearing}
          onConfirm={handleClearLogs}
        />
      </div>
    </TooltipProvider>
  );
}
