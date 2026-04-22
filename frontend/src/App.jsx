import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from '../app/src/pages/Dashboard'

// Composant de protection de route
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('fs_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const token = localStorage.getItem('fs_token')
  
  return (
    <BrowserRouter>
      <Routes>
        {/* Si déjà connecté sur /login, rediriger vers dashboard */}
        <Route 
          path="/login" 
          element={token ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
