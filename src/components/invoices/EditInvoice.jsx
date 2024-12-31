import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import InvoiceForm from './InvoiceForm'

export default function EditInvoice() {
  const { id } = useParams()
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
          invoice_items (
            id,
            product_id,
            sub_product_id,
            quantity,
            unit_price,
            total_price
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
    } finally {
      setLoading(false)
    }
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

  return <InvoiceForm invoice={invoice} />
} 