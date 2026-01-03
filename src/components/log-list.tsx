
'use client';

import * as React from 'react';
import Link from 'next/link';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Trash2, CheckCircle, XCircle, AlertTriangle, ListFilter, ArrowLeft, ArrowRight } from 'lucide-react';

import type { MessageLog } from '@/lib/log-schema';
import { getMessageLogs, clearAllLogs } from '@/lib/log-actions';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PageInfo = {
  lastVisibleId: string | null;
  firstVisibleId: string | null;
  hasMore: boolean;
};

export default function LogList() {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<MessageLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState('3days');
  const [page, setPage] = React.useState(1);
  const [pageHistory, setPageHistory] = React.useState<(string | null)[]>([null]); // History of lastVisibleIds for prev page
  const [currentPageInfo, setCurrentPageInfo] = React.useState<PageInfo>({
    lastVisibleId: null,
    firstVisibleId: null,
    hasMore: false,
  });
  
  const filterLabels: Record<string, string> = {
    all: 'Todos los registros',
    '3days': 'Últimos 3 días',
  };

  const fetchLogs = React.useCallback(async (cursor: string | null, direction: 'next' | 'prev') => {
      setIsLoading(true);
      setError(null);
      
      const startDate = filter === '3days' ? subDays(new Date(), 3) : undefined;
      
      try {
        const { logs: newLogs, lastVisible, firstVisible, hasMore } = await getMessageLogs(cursor, direction, startDate);
        setLogs(newLogs);
        setCurrentPageInfo({ lastVisibleId: lastVisible, firstVisibleId: firstVisible, hasMore });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
        setError(errorMessage);
        console.error("Error fetching logs for display:", err);
      } finally {
        setIsLoading(false);
      }
  }, [filter]);
  
  const refetchData = React.useCallback(() => {
    // Reset and fetch when filter changes
    setPage(1);
    setPageHistory([null]);
    fetchLogs(null, 'next');
  }, [fetchLogs]);

  React.useEffect(() => {
    refetchData();
  }, [filter, refetchData]);

  const handleNextPage = () => {
    if (!currentPageInfo.lastVisibleId) return;
    setPageHistory([...pageHistory, currentPageInfo.lastVisibleId]);
    setPage(page + 1);
    fetchLogs(currentPageInfo.lastVisibleId, 'next');
  };

  const handlePrevPage = () => {
    if (page <= 1) return;
    const prevHistory = [...pageHistory];
    prevHistory.pop(); // Remove current page's start cursor
    const prevCursor = prevHistory[prevHistory.length - 1]; // Get the previous one
    setPageHistory(prevHistory);
    setPage(page - 1);
    fetchLogs(prevCursor, 'next'); // Refetch from the start of the previous page
  };


  const handleClearLogs = async () => {
    setIsClearDialogOpen(false);
    const result = await clearAllLogs();
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
      refetchData();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };
  
  const formatDate = (date: any) => {
      try {
          const d = new Date(date);
          if (isNaN(d.getTime())) return 'Fecha inválida';
          return format(d, "dd/MM/yyyy HH:mm:ss", { locale: es });
      } catch {
          return 'Formato desconocido';
      }
  }
  
  if (isLoading && logs.length === 0 && page === 1) {
      return (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  if (error) {
    return (
       <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al Cargar los Logs</AlertTitle>
          <AlertDescription>
             <p>No se pudieron cargar los logs desde la base de datos. Este es el error reportado:</p>
             <pre className="mt-2 whitespace-pre-wrap rounded-md bg-destructive/10 p-2 text-xs font-mono">
               {error}
             </pre>
          </AlertDescription>
        </Alert>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Historial de Envíos</CardTitle>
                <CardDescription>Auditoría de todos los mensajes enviados por el sistema.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <ListFilter className="mr-2 h-4 w-4" />
                        <span>{filterLabels[filter]}</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={filter} onValueChange={setFilter}>
                        <DropdownMenuRadioItem value="3days">Últimos 3 días</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="all">Todos los registros</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button size="sm" variant="destructive" onClick={() => setIsClearDialogOpen(true)} disabled={logs.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpiar Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto relative">
              {isLoading && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Enviado por (QV ID)</TableHead>
                    <TableHead>Mensaje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length > 0 ? (
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
                        No hay logs para mostrar con el filtro actual.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end items-center gap-2">
            <span className="text-sm text-muted-foreground">Página {page}</span>
             <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1 || isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!currentPageInfo.hasMore || isLoading}
              >
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
          </CardFooter>
        </Card>
        <ClearLogsDialog
          isOpen={isClearDialogOpen}
          onOpenChange={setIsClearDialogOpen}
          onConfirm={handleClearLogs}
        />
      </div>
    </TooltipProvider>
  );
}

    