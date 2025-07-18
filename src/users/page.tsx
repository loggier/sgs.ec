
import { redirect } from 'next/navigation';
import { getUsers } from '@/lib/user-actions';
import { getLoginSession } from '@/lib/auth';
import UserList from '@/components/user-list';
import Header from '@/components/header';

export default async function UsersPage() {
  const session = await getLoginSession();

  if (!session || session.role !== 'master') {
    redirect('/');
  }

  const users = await getUsers();

  return (
    <div className="flex flex-col h-full space-y-6">
       <Header title="Usuarios" />
      <UserList initialUsers={users} />
    </div>
  );
}
