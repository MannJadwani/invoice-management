import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FaPlus, FaSearch, FaFilter, FaEllipsisV, FaFileInvoice,
  FaEye, FaEdit, FaTrash, FaFileDownload
} from 'react-icons/fa'
import { format } from 'date-fns'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-100 text-blue-500',
  paid: 'bg-green-100 text-green-500',
  overdue: 'bg-red-100 text-red-500',
  cancelled: 'bg-gray-100 text-gray-700'
}

export default function InvoiceList() {
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState({ field: 'created_at', direction: 'desc' })
  const [showActions, setShowActions] = useState(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchInvoices()
    }
  }, [session?.user?.id])

  const handleDownloadPDF = async (invoice) => {
    if (!session?.user?.id) return
    
    try {
      // Get the invoice details including the file URL
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(name)
        `)
        .eq('id', invoice.id)
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      if (!data.scanned_copy_url) {
        toast.error('No PDF file found for this invoice')
        return
      }

      // Get the file from storage
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('invoice-files')
        .download(data.scanned_copy_url.replace('invoice-files/', ''))

      if (downloadError) throw downloadError

      // Create a download link
      const blob = new Blob([fileData], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Invoice-${data.invoice_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Error downloading PDF: ' + error.message)
    }
  }

  const fetchInvoices = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(name)
        `)
        .eq('user_id', session.user.id)
        .order(sortBy.field, { ascending: sortBy.direction === 'asc' })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Error fetching invoices: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!session?.user?.id) return
    
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Invoice deleted successfully')
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Error deleting invoice: ' + error.message)
    }
  }

  const filteredInvoices = invoices
    .filter(invoice => 
      (statusFilter === 'all' || invoice.status === statusFilter) &&
      (searchTerm === '' || 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.company.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to view invoices.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your invoices, track payments, and maintain records.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/invoices/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent 
            rounded-md shadow-sm text-sm font-medium text-white bg-primary 
            hover:bg-primary-hover focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-primary"
          >
            <FaPlus className="-ml-1 mr-2 h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md 
              leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary 
              focus:border-primary sm:text-sm"
              placeholder="Search invoices..."
            />
          </div>
          <div className="ml-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 
              rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="mt-6 bg-white shadow overflow-hidden rounded-md">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-8 text-center">
            <FaFileInvoice className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new invoice.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/invoices/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent 
                rounded-md shadow-sm text-sm font-medium text-white bg-primary 
                hover:bg-primary-hover focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-primary"
              >
                <FaPlus className="-ml-1 mr-2 h-4 w-4" />
                New Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${invoice.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs 
                        font-medium capitalize ${STATUS_COLORS[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === invoice.id ? null : invoice.id)}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <FaEllipsisV className="h-5 w-5" />
                        </button>
                        {showActions === invoice.id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md 
                          shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 
                                hover:bg-gray-100 w-full text-left"
                              >
                                <FaEye className="mr-3 h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 
                                hover:bg-gray-100 w-full text-left"
                              >
                                <FaEdit className="mr-3 h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(invoice)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 
                                hover:bg-gray-100 w-full text-left"
                              >
                                <FaFileDownload className="mr-3 h-4 w-4" />
                                Download PDF
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this invoice?')) {
                                    handleDelete(invoice.id)
                                  }
                                }}
                                className="flex items-center px-4 py-2 text-sm text-red-700 
                                hover:bg-red-100 w-full text-left"
                              >
                                <FaTrash className="mr-3 h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
} 