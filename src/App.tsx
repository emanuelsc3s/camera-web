import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
import ConsultaPage from '@/pages/ConsultaPage'
import LoginPage from '@/pages/LoginPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="consulta" element={<ConsultaPage />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App