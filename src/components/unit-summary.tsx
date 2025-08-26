import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, CircleDollarSign, FileText, ShieldOff, Tag } from 'lucide-react';
import type { Unit } from '@/lib/unit-schema';

type UnitSummaryProps = {
  totalUnits: number;
  totalAmount: number;
  totalSuspended: number;
  unitsByPlan: Record<string, number>;
  unitsByContractType: Record<string, number>;
};

const planDisplayNames: Record<string, string> = {
  'estandar-sc': 'Estándar SC',
  'avanzado-sc': 'Avanzado SC',
  'total-sc': 'Total SC',
  'estandar-cc': 'Estándar CC',
  'avanzado-cc': 'Avanzado CC',
  'total-cc': 'Total CC',
};

const contractTypeDisplayNames: Record<string, string> = {
  'con_contrato': 'Con Contrato',
  'sin_contrato': 'Sin Contrato',
};

export default function UnitSummary({ totalUnits, totalAmount, totalSuspended, unitsByPlan, unitsByContractType }: UnitSummaryProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Resumen de Unidades</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnits}</div>
            <p className="text-xs text-muted-foreground">Unidades activas registradas</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Suspendidas</CardTitle>
            <ShieldOff className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalSuspended}</div>
            <p className="text-xs text-muted-foreground">Servicios no activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturación Mensual</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Suma de costos mensuales de unidades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desglose por Contrato</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="flex flex-wrap gap-2 pt-1">
              {Object.keys(unitsByContractType).length > 0 ? (
                Object.entries(unitsByContractType).map(([type, count]) => (
                  <Badge key={type} variant={type === 'con_contrato' ? 'default' : 'secondary'} className="text-sm">
                    {contractTypeDisplayNames[type]}: <strong className="ml-1.5">{count}</strong>
                  </Badge>
                ))
              ) : (
                 <p className="text-xs text-muted-foreground">No hay datos de contrato.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desglose por Plan</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.keys(unitsByPlan).length > 0 ? (
                Object.entries(unitsByPlan).map(([plan, count]) => (
                  <Badge key={plan} variant="secondary" className="text-sm">
                    {planDisplayNames[plan as Unit['tipoPlan']] || plan}: <strong className="ml-1.5">{count}</strong>
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No hay unidades para mostrar desglose.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
