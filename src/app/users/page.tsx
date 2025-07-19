
import { getUsers } from '@/lib/user-actions';
import UserList from '@/components/user-list';
import Header from '@/components/header';

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="flex flex-col h-full">
       <Header title="Usuarios" />
       <UserList initialUsers={users} />
    </div>
  );
}
