import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  FaFileDownload,
  FaChartBar,
  FaChartPie,
  FaChartLine,
  FaFilter
} from 'react-icons/fa'
import { Button, Card, Select } from '../ui/FormElements'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function Reports() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('last6months')
  const [revenueData, setRevenueData] = useState({
    labels: [],
    datasets: []
  })
  const [statusData, setStatusData] = useState({
    labels: [],
    datasets: []
  })
  const [topCompaniesData, setTopCompaniesData] = useState({
    labels: [],
    datasets: []
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchRevenueData()
      fetchStatusData()
      fetchTopCompanies()
    }
  }, [session?.user?.id, dateRange])

  const getDateRange = () => {
    const endDate = endOfMonth(new Date())
    let startDate
    switch (dateRange) {
      case 'last3months':
        startDate = startOfMonth(subMonths(endDate, 2))
        break
      case 'last6months':
        startDate = startOfMonth(subMonths(endDate, 5))
        break
      case 'last12months':
        startDate = startOfMonth(subMonths(endDate, 11))
        break
      default:
        startDate = startOfMonth(subMonths(endDate, 5))
    }
    return { startDate, endDate }
  }

  const fetchRevenueData = async () => {
    try {
      const { startDate, endDate } = getDateRange()
      const { data, error } = await supabase
        .from('invoices')
        .select('created_at, total_amount, status')
        .eq('user_id', session.user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at')

      if (error) throw error

      // Group by month and calculate total revenue
      const monthlyRevenue = {}
      data.forEach(invoice => {
        const month = format(new Date(invoice.created_at), 'MMM yyyy')
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + invoice.total_amount
      })

      setRevenueData({
        labels: Object.keys(monthlyRevenue),
        datasets: [{
          label: 'Monthly Revenue',
          data: Object.values(monthlyRevenue),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.4,
          fill: true
        }]
      })
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      toast.error('Error loading revenue data')
    }
  }

  const fetchStatusData = async () => {
    try {
      const { startDate, endDate } = getDateRange()
      const { data, error } = await supabase
        .from('invoices')
        .select('status')
        .eq('user_id', session.user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) throw error

      const statusCounts = {
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0
      }

      data.forEach(invoice => {
        statusCounts[invoice.status] = (statusCounts[invoice.status] || 0) + 1
      })

      setStatusData({
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            'rgba(156, 163, 175, 0.8)', // draft - gray
            'rgba(59, 130, 246, 0.8)',  // sent - blue
            'rgba(34, 197, 94, 0.8)',   // paid - green
            'rgba(239, 68, 68, 0.8)',   // overdue - red
            'rgba(107, 114, 128, 0.8)'  // cancelled - gray
          ]
        }]
      })
    } catch (error) {
      console.error('Error fetching status data:', error)
      toast.error('Error loading status data')
    }
  }

  const fetchTopCompanies = async () => {
    try {
      const { startDate, endDate } = getDateRange()
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          total_amount,
          company:companies(name)
        `)
        .eq('user_id', session.user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) throw error

      // Group by company and calculate total revenue
      const companyRevenue = {}
      data.forEach(invoice => {
        const companyName = invoice.company.name
        companyRevenue[companyName] = (companyRevenue[companyName] || 0) + invoice.total_amount
      })

      // Sort and get top 5 companies
      const sortedCompanies = Object.entries(companyRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)

      setTopCompaniesData({
        labels: sortedCompanies.map(([name]) => name),
        datasets: [{
          label: 'Revenue by Company',
          data: sortedCompanies.map(([,amount]) => amount),
          backgroundColor: [
            'rgba(99, 102, 241, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(147, 51, 234, 0.8)',
            'rgba(236, 72, 153, 0.8)',
            'rgba(234, 88, 12, 0.8)'
          ]
        }]
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching company data:', error)
      toast.error('Error loading company data')
    }
  }

  const exportToCSV = async () => {
    try {
      const { startDate, endDate } = getDateRange()
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(name)
        `)
        .eq('user_id', session.user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (error) throw error

      // Convert data to CSV format
      const headers = [
        'Invoice Number',
        'Company',
        'Issue Date',
        'Due Date',
        'Status',
        'Total Amount',
        'GST Number',
        'Payment Terms'
      ]

      const csvData = data.map(invoice => [
        invoice.invoice_number,
        invoice.company.name,
        format(new Date(invoice.created_at), 'yyyy-MM-dd'),
        format(new Date(invoice.due_date), 'yyyy-MM-dd'),
        invoice.status,
        invoice.total_amount,
        invoice.gst_number || '',
        invoice.payment_terms || ''
      ])

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `invoice_report_${format(new Date(), 'yyyy-MM-dd')}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Report exported successfully')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Error exporting report')
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view reports.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            View and export your invoice data and analytics.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="w-40"
          >
            <option value="last3months">Last 3 Months</option>
            <option value="last6months">Last 6 Months</option>
            <option value="last12months">Last 12 Months</option>
          </Select>
          <Button
            variant="primary"
            onClick={exportToCSV}
            className="flex items-center space-x-2"
          >
            <FaFileDownload className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Revenue Over Time
              </h2>
              <FaChartLine className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-80">
              <Line
                data={revenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: value => `₹${value.toLocaleString()}`
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Invoice Status Distribution
              </h2>
              <FaChartPie className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-80">
              <Doughnut
                data={statusData}
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
          </Card>

          {/* Top Companies */}
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Top Companies by Revenue
              </h2>
              <FaChartBar className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-80">
              <Bar
                data={topCompaniesData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: value => `₹${value.toLocaleString()}`
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  )
} 