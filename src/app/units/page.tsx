
import { getAllUnits } from '@/lib/unit-actions';
import GlobalUnitList from '@/components/global-unit-list';
import UnitSummary from '@/components/unit-summary';
import Header from '@/components/header';

export default async function GlobalUnitsPage() {
  const units = await getAllUnits();

  // Calculate summary data for all units
  const totalUnits = units.length;
  
  const totalMonthlyAmount = units.reduce((sum, unit) => {
    if (unit.tipoContrato === 'con_contrato') {
      const monthlyCost = (unit.costoTotalContrato ?? 0) / (unit.mesesContrato ?? 1);
      return sum + monthlyCost;
    }
    return sum + (unit.costoMensual ?? 0);
  }, 0);
  
  const unitsByPlan = units.reduce((acc, unit) => {
    const plan = unit.tipoPlan || 'desconocido';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const unitsByContractType = units.reduce((acc, unit) => {
    const contractType = unit.tipoContrato || 'desconocido';
    acc[contractType] = (acc[contractType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full space-y-6">
      <Header title="Todas las Unidades" />
      <UnitSummary 
        totalUnits={totalUnits}
        totalAmount={totalMonthlyAmount}
        unitsByPlan={unitsByPlan}
        unitsByContractType={unitsByContractType}
      />
      <GlobalUnitList initialUnits={units} />
    </div>
  );
}
