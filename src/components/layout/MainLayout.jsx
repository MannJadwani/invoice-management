import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useGlobal } from '../../context/GlobalContext'
import { useTheme } from '../../context/ThemeContext'
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
  FaSearch,
  FaBell,
  FaMoon,
  FaSun
} from 'react-icons/fa'
import { supabase } from '../../supabase'
import { toast } from 'react-hot-toast'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: FaHome },
  { path: '/invoices', label: 'Invoices', icon: FaFileInvoiceDollar },
  { path: '/companies', label: 'Companies', icon: FaUsers },
  { path: '/products/categories', label: 'Products', icon: FaBoxes },
  { path: '/reminders', label: 'Reminders', icon: FaBell },
  { path: '/teams', label: 'Teams', icon: FaUsers },
  { path: '/reports', label: 'Reports', icon: FaChartBar },
  { path: '/setup', label: 'Setup', icon: FaCog }
]

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useGlobal()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    if (session?.user?.id) {
      // Fetch initial unread count
      fetchUnreadCount()

      // Subscribe to new notifications
      const notificationsChannel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            setUnreadCount(prev => prev + 1)
            toast.success(payload.new.title)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            if (payload.new.read && !payload.old.read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(notificationsChannel)
      }
    }
  }, [session?.user?.id])

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false)

      if (error) throw error
      setUnreadCount(count || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

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

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.path
    const isReminders = item.path === '/reminders'

    return (
      <button
        key={item.path}
        onClick={() => handleNavigation(item.path)}
        className={`group relative flex items-center w-full px-4 py-3 text-base font-medium rounded-xl 
        transition-all duration-200 ease-in-out
        ${isActive
          ? 'bg-primary text-white shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40'
          : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
        }`}
      >
        <item.icon
          className={`mr-4 h-5 w-5 transition-colors duration-200 ${
            isActive
              ? 'text-white'
              : 'text-gray-400 group-hover:text-primary'
          }`}
        />
        {item.label}
        {isReminders && unreadCount > 0 && (
          <span className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium
            ${isActive ? 'bg-white text-primary' : 'bg-primary text-white'}`}>
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 right-4 z-50 lg:hidden bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg 
          hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        {isMobileMenuOpen ? <FaTimes className="w-6 h-6" /> : <FaBars className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-all duration-300 ease-in-out 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}
      >
        <div className="h-full flex flex-col">
          {/* Logo and Theme Toggle */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <Link to="/" className="flex items-center text-xl font-bold text-gray-800 dark:text-white transition-colors duration-200">
              <FaFileInvoiceDollar className="w-6 h-6 mr-2 text-primary-600" />
              InvoiceHub Pro
            </Link>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200
                text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <FaSun className="w-5 h-5 text-yellow-400" />
              ) : (
                <FaMoon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className="ml-3">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">
                  {session?.user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-4 w-full flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-300 
                hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
            >
              <FaSignOutAlt className="w-4 h-4" />
              <span className="ml-2">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}
          min-h-screen p-4 lg:p-8`}
      >
        <Outlet />
      </main>
    </div>
  )
} 