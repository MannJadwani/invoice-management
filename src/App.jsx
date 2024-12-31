import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useGlobal, GlobalProvider } from './context/GlobalContext'

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
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/auth" />} />
      )}
    </Routes>
  )
}

function App() {
  return (
    <GlobalProvider>
      <Router>
        <Toaster position="top-right" />
        <AppRoutes />
      </Router>
    </GlobalProvider>
  )
}

export default App
