import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1>404 - Página no encontrada</h1>
      <Link href="/" className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
        Volver al inicio
      </Link>
    </div>
  );
}