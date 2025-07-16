import { SidebarTrigger } from '@/components/ui/sidebar';

type HeaderProps = {
  title?: string;
};

export default function Header({ title = 'Clientes' }: HeaderProps) {
  return (
    <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div>
        <SidebarTrigger />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
    </header>
  );
}
