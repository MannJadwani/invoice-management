import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import {
  FaBell,
  FaCalendarAlt,
  FaFileInvoice,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEdit
} from 'react-icons/fa'
import { Button, Card, Badge } from '../ui/FormElements'

export default function Reminders() {
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [upcomingInvoices, setUpcomingInvoices] = useState([])
  const [overdueInvoices, setOverdueInvoices] = useState([])

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
      fetchInvoices()
    }
  }, [session?.user?.id])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Error loading notifications')
    }
  }

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(name)
        `)
        .eq('user_id', session.user.id)
        .not('status', 'eq', 'paid')
        .not('status', 'eq', 'cancelled')

      if (error) throw error

      const today = new Date()
      const upcoming = []
      const overdue = []

      data.forEach(invoice => {
        const dueDate = new Date(invoice.due_date)
        if (isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 7))) {
          upcoming.push(invoice)
        } else if (isBefore(dueDate, today)) {
          overdue.push(invoice)
        }
      })

      setUpcomingInvoices(upcoming)
      setOverdueInvoices(overdue)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Error loading invoices')
    } finally {
      setLoading(false)
    }
  }

  const markNotificationAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Error updating notification')
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view reminders.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reminders</h1>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Stay on top of your invoices with notifications and reminders.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notifications */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent Notifications
              </h2>
              <Badge variant="primary">
                {notifications.filter(n => !n.read).length} New
              </Badge>
            </div>
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <Card>
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </div>
                </Card>
              ) : (
                notifications.map(notification => (
                  <Card key={notification.id}>
                    <div className="p-4 flex items-start space-x-4">
                      <div className={`rounded-full p-2 ${
                        notification.read
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'bg-primary-50 dark:bg-primary-900'
                      }`}>
                        <FaBell className={`w-4 h-4 ${
                          notification.read
                            ? 'text-gray-500 dark:text-gray-400'
                            : 'text-primary-600 dark:text-primary-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${
                          notification.read
                            ? 'text-gray-600 dark:text-gray-300'
                            : 'text-gray-900 dark:text-white font-medium'
                        }`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <FaCheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Invoice Reminders */}
          <div className="space-y-6">
            {/* Overdue Invoices */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Overdue Invoices
                </h2>
                <Badge variant="error">
                  {overdueInvoices.length} Overdue
                </Badge>
              </div>
              <div className="space-y-4">
                {overdueInvoices.length === 0 ? (
                  <Card>
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No overdue invoices
                    </div>
                  </Card>
                ) : (
                  overdueInvoices.map(invoice => (
                    <Card key={invoice.id}>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FaExclamationTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </span>
                          </div>
                          <Badge variant="error">
                            {Math.ceil((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))} days overdue
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {invoice.company.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{invoice.total_amount.toFixed(2)}
                          </p>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                            >
                              <FaEye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            >
                              <FaEdit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Due Invoices */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Due Soon
                </h2>
                <Badge variant="warning">
                  {upcomingInvoices.length} Upcoming
                </Badge>
              </div>
              <div className="space-y-4">
                {upcomingInvoices.length === 0 ? (
                  <Card>
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No upcoming due invoices
                    </div>
                  </Card>
                ) : (
                  upcomingInvoices.map(invoice => (
                    <Card key={invoice.id}>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FaCalendarAlt className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </span>
                          </div>
                          <Badge variant="warning">
                            Due in {Math.ceil((new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {invoice.company.name}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{invoice.total_amount.toFixed(2)}
                          </p>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                            >
                              <FaEye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            >
                              <FaEdit className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 