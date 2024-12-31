import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaDownload } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

export default function InvoiceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    if (session?.user?.id && id) {
      fetchInvoiceDetails()
    }
  }, [session?.user?.id, id])

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies (
            name,
            email,
            phone,
            address
          )
        `)
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (error) throw error
      if (!data) throw new Error('Invoice not found')
      
      setInvoice(data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Error loading invoice details')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice?.scanned_copy_url) {
      toast.error('No file attached to this invoice')
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.storage
        .from('invoice-files')
        .download(invoice.scanned_copy_url)

      if (error) throw error

      // Create a download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Error downloading file')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Invoice not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/invoices')}
            className="mr-4 text-gray-400 hover:text-gray-500"
          >
            <FaArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Invoice Details</h1>
        </div>
        {invoice.scanned_copy_url && (
          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FaDownload className="mr-2" />
            Download PDF
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Information</h3>
              <dl className="grid grid-cols-1 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">{invoice.invoice_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'}`}
                    >
                      {invoice.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(invoice.issued_date), 'PPP')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {invoice.due_date ? format(new Date(invoice.due_date), 'PPP') : 'Not set'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    ${parseFloat(invoice.total_amount).toFixed(2)}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
              <dl className="grid grid-cols-1 gap-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{invoice.company.name}</dd>
                </div>
                {invoice.company.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{invoice.company.email}</dd>
                  </div>
                )}
                {invoice.company.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{invoice.company.phone}</dd>
                  </div>
                )}
                {invoice.company.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {invoice.company.address}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {invoice.notes && (
              <div className="sm:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <div className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                  {invoice.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 