import { Navigate, Outlet } from 'react-router-dom'
import { useGlobal } from '../context/GlobalContext'

export default function ProtectedRoute() {
  const { session } = useGlobal()

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
} 