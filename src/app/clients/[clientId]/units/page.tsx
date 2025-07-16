import { getClientById } from '@/lib/actions';
import { getUnitsByClientId } from '@/lib/unit-actions';
import Header from '@/components/header';
import UnitList from '@/components/unit-list';
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

  return (
    <div className="flex flex-col h-screen">
      <Header title={`Unidades de ${client.nomSujeto}`} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <UnitList initialUnits={units} clientId={clientId} />
      </main>
    </div>
  );
}
