import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useGlobal } from '../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import InvoiceModal from './InvoiceModal'

export default function InvoiceList() {
  const { session } = useGlobal()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)

  useEffect(() => {
    fetchInvoices()
  }, [session?.user?.id])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          company:companies (
            id,
            name,
            email
          )
        `)
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      toast.error('Error fetching invoices: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', session?.user?.id)

      if (error) throw error
      toast.success('Invoice deleted successfully')
      fetchInvoices()
    } catch (error) {
      toast.error('Error deleting invoice: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice)
    setIsModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all your invoices including their number, company, status, and amount.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setEditingInvoice(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent 
            text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FaPlus className="mr-2" />
            Add Invoice
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No invoices found. Create your first invoice!</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                        Invoice Number
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Company
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Due Date
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {invoice.company?.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              invoice.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          ${invoice.total_amount}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="text-primary hover:text-primary-hover mr-4"
                          >
                            <FaEdit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FaTrash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <InvoiceModal
          invoice={editingInvoice}
          onClose={() => {
            setIsModalOpen(false)
            setEditingInvoice(null)
          }}
          onSuccess={() => {
            setIsModalOpen(false)
            setEditingInvoice(null)
            fetchInvoices()
          }}
        />
      )}
    </div>
  )
} 