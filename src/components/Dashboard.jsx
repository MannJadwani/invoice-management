import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaFileInvoice, 
  FaUsers, 
  FaBox, 
  FaChartLine, 
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaTrophy,
  FaBoxOpen,
  FaCalendarAlt,
  FaUserClock
} from 'react-icons/fa'
import { supabase } from '../supabase'
import { useGlobal } from '../context/GlobalContext'
import { toast } from 'react-hot-toast'
import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function Dashboard() {
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    invoices: 0,
    companies: 0,
    products: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    overdueAmount: 0,
    statusBreakdown: {
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0
    }
  })
  const [recentInvoices, setRecentInvoices] = useState([])
  const [monthlyData, setMonthlyData] = useState({
    labels: [],
    datasets: []
  })
  const [topCompanies, setTopCompanies] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [dueInvoices, setDueInvoices] = useState([])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    if (session?.user?.id) {
      fetchStats()
      fetchRecentInvoices()
      fetchMonthlyData()
      fetchTopCompanies()
      fetchTopProducts()
      fetchDueInvoices()
      fetchRecentActivity()
    }
  }, [session?.user?.id])

  const fetchStats = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const [invoicesCount, companiesCount, productsCount, invoiceStats] = await Promise.all([
        supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
        supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id),
        supabase
          .from('invoices')
          .select('status, total_amount, due_date')
          .eq('user_id', session.user.id)
      ])

      const statusBreakdown = {
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0
      }

      let totalRevenue = 0
      let monthlyRevenue = 0
      let overdueAmount = 0
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const today = new Date()

      invoiceStats.data?.forEach(invoice => {
        statusBreakdown[invoice.status] = (statusBreakdown[invoice.status] || 0) + 1
        
        if (invoice.status === 'paid') {
          totalRevenue += invoice.total_amount
          const invoiceDate = new Date(invoice.issued_date)
          if (invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear) {
            monthlyRevenue += invoice.total_amount
          }
        }

        if (invoice.status === 'overdue' || (invoice.due_date && new Date(invoice.due_date) < today)) {
          overdueAmount += invoice.total_amount
        }
      })

      setStats({
        invoices: invoicesCount.count || 0,
        companies: companiesCount.count || 0,
        products: productsCount.count || 0,
        totalRevenue,
        monthlyRevenue,
        overdueAmount,
        statusBreakdown
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast.error('Error loading dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTopCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          company_id,
          total_amount,
          companies (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'paid')

      if (error) throw error

      const companyTotals = data.reduce((acc, invoice) => {
        const companyId = invoice.company_id
        if (!acc[companyId]) {
          acc[companyId] = {
            name: invoice.companies?.name,
            total: 0,
            invoiceCount: 0
          }
        }
        acc[companyId].total += invoice.total_amount
        acc[companyId].invoiceCount++
        return acc
      }, {})

      const topCompanies = Object.entries(companyTotals)
        .map(([id, data]) => ({
          id,
          name: data.name,
          total: data.total,
          invoiceCount: data.invoiceCount
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      setTopCompanies(topCompanies)
    } catch (error) {
      console.error('Error fetching top companies:', error)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          quantity,
          total_price,
          products (
            name
          ),
          sub_products (
            name
          ),
          invoices!inner (
            user_id
          )
        `)
        .eq('invoices.user_id', session.user.id)

      if (error) throw error

      const productTotals = data.reduce((acc, item) => {
        const productName = item.sub_products?.name || item.products?.name
        if (!acc[productName]) {
          acc[productName] = {
            totalSales: 0,
            quantity: 0
          }
        }
        acc[productName].totalSales += item.total_price
        acc[productName].quantity += item.quantity
        return acc
      }, {})

      const topProducts = Object.entries(productTotals)
        .map(([name, data]) => ({
          name,
          totalSales: data.totalSales,
          quantity: data.quantity
        }))
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5)

      setTopProducts(topProducts)
    } catch (error) {
      console.error('Error fetching top products:', error)
    }
  }

  const fetchDueInvoices = async () => {
    try {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .in('status', ['sent', 'overdue'])
        .lte('due_date', nextWeek.toISOString())
        .order('due_date')

      if (error) throw error
      setDueInvoices(data || [])
    } catch (error) {
      console.error('Error fetching due invoices:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentActivity(data || [])
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const fetchRecentInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          companies (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentInvoices(data || [])
    } catch (error) {
      console.error('Error fetching recent invoices:', error)
      toast.error('Error loading recent invoices')
    }
  }

  const fetchMonthlyData = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('total_amount, issued_date, status')
        .eq('user_id', session.user.id)
        .eq('status', 'paid')

      if (error) throw error

      const monthlyRevenue = {}
      const last6Months = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`
        last6Months.push(monthYear)
        monthlyRevenue[monthYear] = 0
      }

      data?.forEach(invoice => {
        const date = new Date(invoice.issued_date)
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`
        if (monthlyRevenue[monthYear] !== undefined) {
          monthlyRevenue[monthYear] += invoice.total_amount
        }
      })

      setMonthlyData({
        labels: last6Months,
        datasets: [
          {
            label: 'Monthly Revenue',
            data: last6Months.map(month => monthlyRevenue[month]),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }
        ]
      })
    } catch (error) {
      console.error('Error fetching monthly data:', error)
      toast.error('Error loading monthly data')
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to view the dashboard.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => navigate('/invoices/new')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 
            transition-colors duration-200 flex items-center space-x-2"
        >
          <FaFileInvoice className="w-4 h-4" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400">Total Revenue</h3>
            <FaMoneyBillWave className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              ₹{stats.monthlyRevenue.toLocaleString()} this month
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400">Invoices</h3>
            <FaFileInvoice className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold">{stats.invoices}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {stats.statusBreakdown.paid} paid
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400">Companies</h3>
            <FaUsers className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold">{stats.companies}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Active clients
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 dark:text-gray-400">Products</h3>
            <FaBox className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">{stats.products}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            In catalog
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Overview</h3>
          <div className="h-[300px]">
            <Line
              data={monthlyData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.1)',
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Invoice Status</h3>
          <div className="h-[300px]">
            <Doughnut
              data={{
                labels: ['Draft', 'Sent', 'Paid', 'Overdue'],
                datasets: [{
                  data: [
                    stats.statusBreakdown.draft,
                    stats.statusBreakdown.sent,
                    stats.statusBreakdown.paid,
                    stats.statusBreakdown.overdue
                  ],
                  backgroundColor: [
                    '#94a3b8',
                    '#60a5fa',
                    '#22c55e',
                    '#ef4444'
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity and Due Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-2">
                  <FaUserClock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Due Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Due Invoices</h3>
          <div className="space-y-4">
            {dueInvoices.map((invoice, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <FaCalendarAlt className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Due {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-semibold">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ₹{invoice.total_amount.toLocaleString()}
                  </p>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 