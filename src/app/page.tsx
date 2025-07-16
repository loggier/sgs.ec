import { getClients } from '@/lib/actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';

export default async function Home() {
  const clients = await getClients();

  return (
    <div className="flex flex-col h-screen">
      <Header title="Clientes" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <ClientList initialClients={clients} />
      </main>
    </div>
  );
}
