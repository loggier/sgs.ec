import { getClients } from '@/lib/actions';
import ClientList from '@/components/client-list';

export default async function Home() {
  const clients = await getClients();

  return (
    <ClientList initialClients={clients} />
  );
}
