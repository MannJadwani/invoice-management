import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useGlobal } from '../../context/GlobalContext'
import { 
  FaHome, 
  FaCog, 
  FaSignOutAlt, 
  FaFileInvoiceDollar, 
  FaChartBar, 
  FaBars, 
  FaTimes, 
  FaBoxes, 
  FaUsers,
  FaRegLightbulb,
  FaUser,
  FaSearch
} from 'react-icons/fa'
import { supabase } from '../../supabase'
import { toast } from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: FaHome },
  { path: '/invoices', label: 'Invoices', icon: FaFileInvoiceDollar },
  { path: '/companies', label: 'Companies', icon: FaUsers },
  { path: '/products/categories', label: 'Products', icon: FaBoxes },
  { path: '/reports', label: 'Reports', icon: FaChartBar },
  { path: '/setup', label: 'Setup', icon: FaCog },
  {
    label: 'Profile',
    icon: <FaUser />,
    path: '/profile/edit'
  },
  {
    label: 'User Search',
    icon: <FaSearch />,
    path: '/users/search'
  }
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useGlobal()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully')
      navigate('/auth')
    } catch (error) {
      toast.error('Error signing out: ' + error.message)
    }
  }

  const handleNavigation = (path) => {
    navigate(path)
    setIsMobileMenuOpen(false) // Close mobile menu after navigation
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white shadow-sm fixed top-0 left-0 right-0 z-20">
        <div className="px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 
            hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          >
            {isMobileMenuOpen ? (
              <FaTimes className="h-6 w-6" />
            ) : (
              <FaBars className="h-6 w-6" />
            )}
          </button>
          <div className="flex items-center space-x-2">
            <FaRegLightbulb className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              BeaconDocuments
            </span>
          </div>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white shadow-lg transform 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-20 flex items-center justify-center border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center space-x-3">
            <FaRegLightbulb className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Beacon
              </h1>
              <h2 className="text-sm font-medium text-gray-500 -mt-1">
                Documents
              </h2>
            </div>
          </div>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`group flex items-center w-full px-4 py-3 text-base font-medium rounded-xl 
              transition-all duration-200 ease-in-out
              ${location.pathname === item.path
                ? 'bg-primary text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
                : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <item.icon
                className={`mr-4 h-5 w-5 transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-primary'
                }`}
              />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 w-full px-4">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-base font-medium 
            text-gray-600 hover:text-primary rounded-xl transition-colors duration-200
            hover:bg-gray-50"
          >
            <FaSignOutAlt className="mr-4 h-5 w-5 text-gray-400 group-hover:text-primary" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={`min-h-screen pt-16 lg:pl-72 transition-all duration-300 ease-in-out`}
      >
        <Outlet />
      </main>
    </div>
  )
} 