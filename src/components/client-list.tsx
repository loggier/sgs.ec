'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

import type { Client } from '@/lib/schema';
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

import ClientForm from './client-form';
import DeleteClientDialog from './delete-client-dialog';
import CreditRiskDialog from './credit-risk-dialog';
import type { AssessCreditRiskOutput } from '@/ai/flows/credit-risk-assessment';

type ClientListProps = {
  initialClients: Client[];
};

export default function ClientList({ initialClients }: ClientListProps) {
  const [clients, setClients] = React.useState(initialClients);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isRiskDialogOpen, setIsRiskDialogOpen] = React.useState(false);
  const [selectedClient, setSelectedClient] = React.useState<Client | null>(null);
  const [assessmentResult, setAssessmentResult] = React.useState<AssessCreditRiskOutput | null>(null);

  React.useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);
  
  const handleAddClient = () => {
    setSelectedClient(null);
    setIsSheetOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsSheetOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSave = (result: { client?: Client, assessment?: AssessCreditRiskOutput }) => {
    setIsSheetOpen(false);
    setSelectedClient(null);
    if (result.assessment) {
      setAssessmentResult(result.assessment);
      setIsRiskDialogOpen(true);
    }
  };

  const getStatusVariant = (status: Client['estado']) => {
    switch (status) {
      case 'al día':
        return 'success';
      case 'adeuda':
        return 'warning';
      case 'retirado':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Custom variants for Badge
  const badgeVariants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Client Management</CardTitle>
          <Button onClick={handleAddClient} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Plan Type</TableHead>
                <TableHead className="hidden md:table-cell">Operation Value</TableHead>
                <TableHead className="hidden lg:table-cell">Due Date</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length > 0 ? (
                clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.nomSujeto}</TableCell>
                    <TableCell>{client.ciudad}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeVariants[getStatusVariant(client.estado)]}>
                        {client.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{client.tipoPlan}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(client.valOperacion)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(client.fecVencimiento).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClient(client)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No clients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full">
          <SheetHeader>
            <SheetTitle>{selectedClient ? 'Edit Client' : 'Add New Client'}</SheetTitle>
          </SheetHeader>
          <ClientForm
            client={selectedClient}
            onSave={handleFormSave}
            onCancel={() => setIsSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DeleteClientDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        client={selectedClient}
        onDelete={() => {
          setSelectedClient(null);
          setIsDeleteDialogOpen(false);
        }}
      />
      
      <CreditRiskDialog
        isOpen={isRiskDialogOpen}
        onOpenChange={setIsRiskDialogOpen}
        assessment={assessmentResult}
      />
    </Card>
  );
}
