import { redirect } from 'next/navigation';
import { getUsers } from '@/lib/user-actions';
import { getCurrentUser } from '@/lib/auth';
import UserList from '@/components/user-list';

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'master') {
    redirect('/');
  }

  const users = await getUsers();

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <UserList initialUsers={users} />
      </main>
    </div>
  );
}
