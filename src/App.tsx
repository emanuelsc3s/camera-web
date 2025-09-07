import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  )
}

export default App