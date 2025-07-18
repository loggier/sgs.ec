import { getClientById } from '@/lib/actions';
import { getUnitsByClientId } from '@/lib/unit-actions';
import UnitList from '@/components/unit-list';
import UnitSummary from '@/components/unit-summary';
import { notFound } from 'next/navigation';
import Header from '@/components/header';

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
  const totalMonthlyAmount = units.reduce((sum, unit) => {
    if (unit.tipoContrato === 'con_contrato') {
      const monthlyCost = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
      return sum + monthlyCost;
    }
    return sum + (unit.costoMensual ?? 0);
  }, 0);
  
  const unitsByPlan = units.reduce((acc, unit) => {
    acc[unit.tipoPlan] = (acc[unit.tipoPlan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unitsByContractType = units.reduce((acc, unit) => {
    acc[unit.tipoContrato] = (acc[unit.tipoContrato] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full space-y-6">
      <Header title={`Unidades de ${client.nomSujeto}`} showBackButton backButtonHref="/" />
      <UnitSummary 
        totalUnits={totalUnits}
        totalAmount={totalMonthlyAmount}
        unitsByPlan={unitsByPlan}
        unitsByContractType={unitsByContractType}
      />
      <UnitList initialUnits={units} clientId={clientId} />
    </div>
  );
}
