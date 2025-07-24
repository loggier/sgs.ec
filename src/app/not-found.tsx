'use client' 

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="text-center p-8">
      <h1 className="text-4xl font-bold">404</h1>
      <Button asChild className="mt-4">
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  )
}