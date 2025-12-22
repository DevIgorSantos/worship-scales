import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import AppLayout from "./layouts/AppLayout"
import Dashboard from "./pages/Dashboard"
import Schedules from "./pages/Schedules"
import Songs from "./pages/Songs"
import ServiceDetail from "./pages/ServiceDetail"
import Profile from "./pages/Profile"
import Login from "./pages/Login"
import Members from "./pages/Admin/Members"
import ImportHarpa from "./pages/Admin/ImportHarpa"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground">Carregando...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/escalas" element={<Schedules />} />
            <Route path="/escalas/:id" element={<ServiceDetail />} />
            <Route path="/musicas" element={<Songs />} />
            <Route path="/gestao" element={<Members />} />
            <Route path="/gestao/importar-harpa" element={<ImportHarpa />} />
            <Route path="/perfil" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
