import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import {
  FaPlus,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaFileDownload,
  FaEllipsisV,
  FaFileInvoice,
  FaThLarge,
  FaList,
  FaFilter,
  FaSort,
  FaCalendarAlt
} from 'react-icons/fa'
import { Input, Button, Select, Card, Badge } from '../ui/FormElements'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

export default function InvoiceList() {
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState({ field: 'created_at', direction: 'desc' })
  const [showActions, setShowActions] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'kanban'
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [amountRange, setAmountRange] = useState({ min: '', max: '' })
  const [paymentTermsFilter, setPaymentTermsFilter] = useState('all')
  const [companyFilter, setCompanyFilter] = useState('')
  const [gstFilter, setGstFilter] = useState('')
  const [dueDateRange, setDueDateRange] = useState({ start: '', end: '' })
  const [invoiceNumberFilter, setInvoiceNumberFilter] = useState('')

  useEffect(() => {
    if (session?.user?.id) {
      fetchInvoices()
    }
  }, [session?.user?.id, sortBy])

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

  const handleDragEnd = async (result) => {
    if (!result.destination) return

    const { source, destination, draggableId } = result
    if (source.droppableId === destination.droppableId) return

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: destination.droppableId })
        .eq('id', draggableId)
        .eq('user_id', session.user.id)

      if (error) throw error
      
      setInvoices(prevInvoices => 
        prevInvoices.map(invoice => 
          invoice.id === draggableId 
            ? { ...invoice, status: destination.droppableId }
            : invoice
        )
      )
      
      toast.success(`Invoice status updated to ${destination.droppableId}`)
    } catch (error) {
      console.error('Error updating invoice status:', error)
      toast.error('Error updating invoice status')
    }
  }

  const filteredInvoices = invoices
    .filter(invoice => 
      (statusFilter === 'all' || invoice.status === statusFilter) &&
      (searchTerm === '' || 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.company.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!dateRange.start || new Date(invoice.issued_date) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(invoice.issued_date) <= new Date(dateRange.end)) &&
      (!dueDateRange.start || new Date(invoice.due_date) >= new Date(dueDateRange.start)) &&
      (!dueDateRange.end || new Date(invoice.due_date) <= new Date(dueDateRange.end)) &&
      (!amountRange.min || invoice.total_amount >= parseFloat(amountRange.min)) &&
      (!amountRange.max || invoice.total_amount <= parseFloat(amountRange.max)) &&
      (paymentTermsFilter === 'all' || invoice.payment_terms === paymentTermsFilter) &&
      (!invoiceNumberFilter || invoice.invoice_number.toLowerCase().includes(invoiceNumberFilter.toLowerCase())) &&
      (!companyFilter || invoice.company.name.toLowerCase().includes(companyFilter.toLowerCase())) &&
      (!gstFilter || (invoice.company.gst_number && invoice.company.gst_number.toLowerCase().includes(gstFilter.toLowerCase())))
    )

  const groupedInvoices = STATUSES.reduce((acc, status) => {
    acc[status] = filteredInvoices.filter(invoice => invoice.status === status)
    return acc
  }, {})

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view invoices.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Manage your invoices, track payments, and maintain records.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
          >
            {viewMode === 'list' ? (
              <FaThLarge className="h-5 w-5" />
            ) : (
              <FaList className="h-5 w-5" />
            )}
          </Button>
          <Button
            onClick={() => navigate('/invoices/new')}
            variant="primary"
            className="inline-flex items-center"
          >
            <FaPlus className="-ml-1 mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search invoices..."
                icon={<FaSearch className="h-4 w-4" />}
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center"
            >
              <FaFilter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <Select
              value={`${sortBy.field}-${sortBy.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-')
                setSortBy({ field, direction })
              }}
              className="w-48"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="total_amount-desc">Highest Amount</option>
              <option value="total_amount-asc">Lowest Amount</option>
              <option value="due_date-asc">Due Date (Ascending)</option>
              <option value="due_date-desc">Due Date (Descending)</option>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            <Input
              type="text"
              placeholder="Invoice Number"
              value={invoiceNumberFilter}
              onChange={(e) => setInvoiceNumberFilter(e.target.value)}
            />

            <Input
              type="text"
              placeholder="Company Name"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            />

            <Input
              type="text"
              placeholder="GST Number"
              value={gstFilter}
              onChange={(e) => setGstFilter(e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Issue Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  placeholder="End Date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Due Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dueDateRange.start}
                  onChange={(e) => setDueDateRange(prev => ({ ...prev, start: e.target.value }))}
                  placeholder="Start Date"
                />
                <Input
                  type="date"
                  value={dueDateRange.end}
                  onChange={(e) => setDueDateRange(prev => ({ ...prev, end: e.target.value }))}
                  placeholder="End Date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Amount Range</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min Amount"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                  leftIcon="₹"
                />
                <Input
                  type="number"
                  placeholder="Max Amount"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                  leftIcon="₹"
                />
              </div>
            </div>

            <Select
              value={paymentTermsFilter}
              onChange={(e) => setPaymentTermsFilter(e.target.value)}
            >
              <option value="all">All Payment Terms</option>
              <option value="net15">Net 15</option>
              <option value="net30">Net 30</option>
              <option value="net45">Net 45</option>
              <option value="net60">Net 60</option>
            </Select>
          </div>
        )}
      </div>

      {/* Invoice List/Kanban */}
      {loading ? (
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <FaFileInvoice className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No invoices</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new invoice.
          </p>
          <div className="mt-6">
            <Button
              onClick={() => navigate('/invoices/new')}
              variant="primary"
              className="inline-flex items-center"
            >
              <FaPlus className="-ml-1 mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <div className="mt-6 bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Payment Terms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    GST Number
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvoices.map((invoice) => (
                  <tr 
                    key={invoice.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {invoice.company.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{invoice.total_amount.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs 
                        font-medium capitalize ${STATUS_COLORS[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(invoice.issued_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {invoice.payment_terms || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {invoice.company.gst_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === invoice.id ? null : invoice.id)}
                          className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                        >
                          <FaEllipsisV className="h-5 w-5" />
                        </button>
                        {showActions === invoice.id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md 
                          shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full text-left"
                              >
                                <FaEye className="mr-3 h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full text-left"
                              >
                                <FaEdit className="mr-3 h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDownloadPDF(invoice)}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full text-left"
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
                                className="flex items-center px-4 py-2 text-sm text-red-700 dark:text-red-400 
                                hover:bg-red-100 dark:hover:bg-red-900/50 w-full text-left"
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
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {STATUSES.map(status => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${
                      snapshot.isDraggingOver ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {status}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {groupedInvoices[status].length} invoice{groupedInvoices[status].length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="p-4 space-y-4">
                      {groupedInvoices[status].map((invoice, index) => (
                        <Draggable
                          key={invoice.id}
                          draggableId={invoice.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                              <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {invoice.invoice_number}
                                  </span>
                                  <Badge variant={
                                    invoice.status === 'paid' ? 'success' :
                                    invoice.status === 'overdue' ? 'error' :
                                    invoice.status === 'draft' ? 'secondary' :
                                    'primary'
                                  }>
                                    {invoice.status}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {invoice.company.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    ₹{invoice.total_amount.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Due {format(new Date(invoice.due_date), 'MMM d')}
                                  </span>
                                </div>
                                <div className="flex items-center justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                                  >
                                    <FaEye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                  >
                                    <FaEdit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadPDF(invoice)}
                                  >
                                    <FaFileDownload className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  )
} 