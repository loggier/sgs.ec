import { SidebarTrigger } from '@/components/ui/sidebar';

export default function Header() {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <h1 className="text-xl font-semibold">Clientes</h1>
    </header>
  );
}
