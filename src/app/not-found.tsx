// app/not-found.tsx
export default function NotFound() {
  return (
    <html>
      <body style={{ textAlign: 'center', padding: '50px' }}>
        <h1>404 - Página no encontrada</h1>
        <a href="/">Volver al inicio</a> {/* Usa <a> en lugar de <Link> */}
      </body>
    </html>
  )
}