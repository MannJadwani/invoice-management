import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useGlobal, GlobalProvider } from './context/GlobalContext'
import { ThemeProvider } from './context/ThemeContext'

import MainLayout from './components/layout/MainLayout'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import Setup from './components/Setup'
import InvoiceList from './components/invoices/InvoiceList'
import NewInvoice from './components/invoices/NewInvoice'
import InvoiceDetails from './components/invoices/InvoiceDetails'
import EditInvoice from './components/invoices/EditInvoice'
import ProductCategories from './components/products/ProductCategories'
import CompanyManagement from './components/companies/CompanyManagement'
import ProfileEdit from './components/profile/ProfileEdit'
import UserSearch from './components/users/UserSearch'
import Teams from './components/teams/Teams'
import Reminders from './components/reminders/Reminders'
import Reports from './components/reports/Reports'

// Initialize theme from localStorage or system preference
const initializeTheme = () => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      document.documentElement.classList.add(savedTheme)
      return
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.add('light')
    }
  }
}

// Initialize theme immediately
initializeTheme()

function AppRoutes() {
  const { session } = useGlobal()

  return (
    <Routes>
      <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" />} />
      
      {/* Protected routes */}
      {session ? (
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/invoices/:id" element={<InvoiceDetails />} />
          <Route path="/invoices/:id/edit" element={<EditInvoice />} />
          <Route path="/products/categories" element={<ProductCategories />} />
          <Route path="/companies" element={<CompanyManagement />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/users/search" element={<UserSearch />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/auth" />} />
      )}
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <GlobalProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
            <Toaster 
              position="top-right"
              toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white',
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                },
              }}
            />
            <AppRoutes />
          </div>
        </ThemeProvider>
      </GlobalProvider>
    </Router>
  )
}
