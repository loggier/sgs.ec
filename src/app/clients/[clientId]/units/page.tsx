import { getClientById } from '@/lib/actions';
import { getUnitsByClientId } from '@/lib/unit-actions';
import Header from '@/components/header';
import UnitList from '@/components/unit-list';
import UnitSummary from '@/components/unit-summary';
import { notFound } from 'next/navigation';

type UnitsPageProps = {
  params: {
    clientId: string;
  };
};

export default async function UnitsPage({ params }: UnitsPageProps) {
  const { clientId } = params;
  const client = await getClientById(clientId);
  const units = await getUnitsByClientId(clientId);

  if (!client) {
    notFound();
  }

  // Calculate summary data
  const totalUnits = units.length;
  const totalAmount = units.reduce((sum, unit) => {
    if (unit.tipoContrato === 'con_contrato') {
      return sum + (unit.costoTotalContrato ?? 0);
    }
    // For now, let's assume 'sin_contrato' monthly cost contributes for one month to the summary.
    // This could be changed to an annualized value if needed.
    return sum + (unit.costoMensual ?? 0);
  }, 0);
  
  const unitsByPlan = units.reduce((acc, unit) => {
    acc[unit.tipoPlan] = (acc[unit.tipoPlan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-screen">
      <Header 
        title={`Unidades de ${client.nomSujeto}`} 
        showBackButton 
        backButtonHref="/"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <UnitSummary 
          totalUnits={totalUnits}
          totalAmount={totalAmount}
          unitsByPlan={unitsByPlan}
        />
        <UnitList initialUnits={units} clientId={clientId} />
      </main>
    </div>
  );
}
