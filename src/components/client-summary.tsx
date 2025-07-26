
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Car } from 'lucide-react';
import type { Client } from '@/lib/schema';

type ClientSummaryProps = {
  totalClients: number;
  totalUnits: number;
  clientsByStatus: Record<string, number>;
};

const statusDisplayNames: Record<Client['estado'], string> = {
    'al dia': 'Al día',
    'adeuda': 'Adeuda',
    'retirado': 'Retirado'
};

const statusBadgeVariants: Record<Client['estado'], string> = {
    'al dia': 'bg-green-100 text-green-800 border-green-200',
    'adeuda': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'retirado': 'bg-red-100 text-red-800 border-red-200'
};

export default function ClientSummary({
  totalClients,
  totalUnits,
  clientsByStatus,
}: ClientSummaryProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Resumen General</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <div className="flex flex-wrap gap-1 pt-1">
              {Object.keys(clientsByStatus).length > 0 ? (
                Object.entries(clientsByStatus).map(([status, count]) => (
                  <Badge key={status} variant="outline" className={`text-xs ${statusBadgeVariants[status as Client['estado']]}`}>
                    {statusDisplayNames[status as Client['estado']]}: <strong className="ml-1">{count}</strong>
                  </Badge>
                ))
              ) : (
                 <p className="text-xs text-muted-foreground">No hay datos de estado.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground">Suma de todas las unidades</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
