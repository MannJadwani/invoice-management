import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import {
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaDownload,
  FaEnvelope,
  FaPrint,
  FaShare,
  FaClock,
  FaBuilding,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaClipboard
} from 'react-icons/fa'
import { Button, Card, Badge } from '../ui/FormElements'

const STATUS_COLORS = {
  draft: 'secondary',
  sent: 'primary',
  paid: 'success',
  overdue: 'error',
  cancelled: 'secondary'
}

export default function InvoiceDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { session } = useGlobal()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id && id) {
      fetchInvoice()
    }
  }, [session?.user?.id, id])

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies(*),
          invoice_items (
            id,
            product_id,
            sub_product_id,
            quantity,
            unit_price,
            total_price,
            products (name),
            sub_products (name)
          )
        `)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Error loading invoice details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Invoice deleted successfully')
      navigate('/invoices')
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error('Error deleting invoice')
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice.scanned_copy_url) {
      toast.error('No PDF file available for this invoice')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.storage
        .from('invoice-files')
        .download(invoice.scanned_copy_url.replace('invoice-files/', ''))

      if (error) throw error

      const blob = new Blob([data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Error downloading invoice PDF')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice.invoice_number}`,
        text: `Invoice details for ${invoice.company.name}`,
        url: window.location.href
      }).catch(error => console.error('Error sharing:', error))
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Invoice not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/invoices')}
            className="mr-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Details</h1>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="ghost"
            onClick={handleShare}
            title="Share Invoice"
          >
            <FaShare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={handlePrint}
            title="Print Invoice"
          >
            <FaPrint className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.href = `mailto:${invoice.company.email}`}
            title="Send Email"
            disabled={!invoice.company.email}
          >
            <FaEnvelope className="h-4 w-4" />
          </Button>
          {invoice.scanned_copy_url && (
            <Button
              variant="ghost"
              onClick={handleDownloadPDF}
              disabled={loading}
              title="Download PDF"
            >
              <FaDownload className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate(`/invoices/${id}/edit`)}
          >
            <FaEdit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
          >
            <FaTrash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Invoice Number</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </div>
                </div>
                <Badge variant={STATUS_COLORS[invoice.status]} size="lg">
                  {invoice.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                    <FaFileInvoiceDollar className="h-4 w-4 mr-2" />
                    Amount
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{invoice.total_amount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                    <FaCalendarAlt className="h-4 w-4 mr-2" />
                    Issue Date
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {format(new Date(invoice.issued_date), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-1">
                    <FaClock className="h-4 w-4 mr-2" />
                    Due Date
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <FaClipboard className="h-4 w-4 mr-2" />
                    Notes
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {invoice.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Invoice Items
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {invoice.invoice_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {item.sub_products?.name || item.products?.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          ₹{item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          ₹{item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                        Total Amount:
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                        ₹{invoice.total_amount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center text-gray-900 dark:text-white mb-4">
                <FaBuilding className="h-5 w-5 mr-2" />
                <h3 className="text-lg font-medium">Company Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.company.name}
                  </div>
                  {invoice.company.email && (
                    <a
                      href={`mailto:${invoice.company.email}`}
                      className="text-sm text-primary hover:text-primary-dark dark:text-primary-400"
                    >
                      {invoice.company.email}
                    </a>
                  )}
                </div>
                {invoice.company.phone && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      {invoice.company.phone}
                    </div>
                  </div>
                )}
                {invoice.company.address && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Address</div>
                    <div className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                      {invoice.company.address}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Timeline
              </h3>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <FaFileInvoiceDollar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Invoice Created
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
                {invoice.status !== 'draft' && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <FaEnvelope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Invoice Sent
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(invoice.updated_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                )}
                {invoice.status === 'paid' && (
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <FaCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Payment Received
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(invoice.payment_date || invoice.updated_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 