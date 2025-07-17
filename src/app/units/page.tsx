import { getAllUnits } from '@/lib/unit-actions';
import GlobalUnitList from '@/components/global-unit-list';
import Header from '@/components/header';

export default async function GlobalUnitsPage() {
  const units = await getAllUnits();

  return (
    <div className="flex flex-col h-screen">
      <Header title="Todas las Unidades" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <GlobalUnitList initialUnits={units} />
      </main>
    </div>
  );
}
