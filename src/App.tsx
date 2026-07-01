import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireAuth } from '@/components/auth/RequireAuth'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
import ConsultaPage from '@/pages/ConsultaPage'
import LoginPage from '@/pages/LoginPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="consulta" element={<ConsultaPage />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App
