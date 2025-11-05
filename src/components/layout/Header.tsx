export default function Header() {
  return (
    <header className="border-b bg-primary text-primary-foreground">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold">
            {import.meta.env.VITE_APP_TITLE || 'Minha Aplicação'}
          </h1>
        </div>
      </div>
    </header>
  )
}