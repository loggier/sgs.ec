
import { getClients } from '@/lib/actions';
import ClientList from '@/components/client-list';
import Header from '@/components/header';

export default async function Home() {
  const clients = await getClients();

  return (
    <>
      <Header title="Clientes" />
      <ClientList initialClients={clients} />
    </>
  );
}
