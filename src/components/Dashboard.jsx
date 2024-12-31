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
          )
        `)
        .eq('user_id', session.user.id)

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

  const cards = [
    {
      title: 'Total Invoices',
      value: loading ? '-' : stats.invoices,
      icon: <FaFileInvoice className="h-6 w-6" />,
      color: 'bg-primary',
      link: '/invoices'
    },
    {
      title: 'Total Revenue',
      value: loading ? '-' : `$${stats.totalRevenue.toFixed(2)}`,
      icon: <FaMoneyBillWave className="h-6 w-6" />,
      color: 'bg-green-500',
      link: '/invoices'
    },
    {
      title: 'Monthly Revenue',
      value: loading ? '-' : `$${stats.monthlyRevenue.toFixed(2)}`,
      icon: <FaChartLine className="h-6 w-6" />,
      color: 'bg-blue-500',
      link: '/invoices'
    },
    {
      title: 'Overdue Amount',
      value: loading ? '-' : `$${stats.overdueAmount.toFixed(2)}`,
      icon: <FaExclamationTriangle className="h-6 w-6" />,
      color: 'bg-red-500',
      link: '/invoices'
    },
    {
      title: 'Active Companies',
      value: loading ? '-' : stats.companies,
      icon: <FaUsers className="h-6 w-6" />,
      color: 'bg-yellow-500',
      link: '/companies'
    }
  ]

  const statusColors = {
    draft: '#CBD5E0',
    sent: '#4299E1',
    paid: '#48BB78',
    overdue: '#F56565'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your invoice management system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.link)}
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer 
            transition-transform duration-200 hover:scale-105"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.color}`}>
                  {React.cloneElement(card.icon, { className: 'h-6 w-6 text-white' })}
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {card.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className={`bg-gray-50 px-5 py-3`}>
              <div className="text-sm">
                <a
                  href={card.link}
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  View details
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h2>
          <div className="h-64">
            <Line
              data={monthlyData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Invoice Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Status</h2>
          <div className="h-64">
            <Doughnut
              data={{
                labels: Object.keys(stats.statusBreakdown).map(
                  status => status.charAt(0).toUpperCase() + status.slice(1)
                ),
                datasets: [
                  {
                    data: Object.values(stats.statusBreakdown),
                    backgroundColor: Object.values(statusColors)
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Top Companies */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Companies by Revenue</h2>
            <button
              onClick={() => navigate('/companies')}
              className="text-sm text-primary hover:text-primary-hover"
            >
              View all
            </button>
          </div>
          <div className="space-y-4">
            {topCompanies.map((company, index) => (
              <div key={company.id} className="flex items-center">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                  ${index === 0 ? 'bg-yellow-100 text-yellow-600' :
                    index === 1 ? 'bg-gray-100 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-500'}`}
                >
                  {index + 1}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    <p className="text-sm font-medium text-gray-500">${company.total.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-gray-500">{company.invoiceCount} invoices</p>
                </div>
              </div>
            ))}
            {topCompanies.length === 0 && (
              <p className="text-center text-gray-500 py-4">No company data available</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <button
              onClick={() => navigate('/products/categories')}
              className="text-sm text-primary hover:text-primary-hover"
            >
              View all
            </button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                  ${index === 0 ? 'bg-green-100 text-green-600' :
                    index === 1 ? 'bg-blue-100 text-blue-600' :
                    index === 2 ? 'bg-purple-100 text-purple-600' :
                    'bg-gray-50 text-gray-500'}`}
                >
                  <FaBoxOpen className="h-4 w-4" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm font-medium text-gray-500">${product.totalSales.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center text-gray-500 py-4">No product data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Due/Overdue Invoices */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Due & Overdue Invoices</h2>
            <button
              onClick={() => navigate('/invoices')}
              className="text-sm text-primary hover:text-primary-hover"
            >
              View all
            </button>
          </div>
          <div className="space-y-4">
            {dueInvoices.map(invoice => (
              <div key={invoice.id} className="flex items-center">
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                  ${invoice.status === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}
                >
                  <FaCalendarAlt className="h-4 w-4" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {invoice.invoice_number} - {invoice.companies?.name}
                    </p>
                    <p className="text-sm font-medium text-gray-500">${invoice.total_amount.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Due: {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {dueInvoices.length === 0 && (
              <p className="text-center text-gray-500 py-4">No due or overdue invoices</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <FaUserClock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-900">
                    Invoice {activity.invoice_number} - {activity.companies?.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    Status changed to {activity.status}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(activity.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 