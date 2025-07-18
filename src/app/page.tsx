import { getClients } from '@/lib/actions';
import ClientList from '@/components/client-list';

export default async function Home() {
  const clients = await getClients();

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="flex flex-col gap-6">
          <ClientList initialClients={clients} />
        </div>
      </main>
    </div>
  );
}
