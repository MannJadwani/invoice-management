import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'

export default function EditInvoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [products, setProducts] = useState([])
  const [subProducts, setSubProducts] = useState([])
  const [formData, setFormData] = useState({
    invoice_number: '',
    company_id: '',
    product_id: '',
    sub_product_id: '',
    quantity: 1,
    issued_date: '',
    due_date: '',
    status: '',
    total_amount: '',
    notes: '',
    user_id: null
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (session?.user?.id) {
      setFormData(prev => ({ ...prev, user_id: session.user.id }))
      fetchCompanies()
      fetchProducts()
      fetchInvoiceDetails()
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (formData.product_id) {
      fetchSubProducts(formData.product_id)
    } else {
      setSubProducts([])
    }
  }, [formData.product_id])

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

      // Get the first invoice item (assuming one item per invoice for now)
      const invoiceItem = data.invoice_items[0]

      setFormData({
        invoice_number: data.invoice_number,
        company_id: data.company_id,
        product_id: invoiceItem?.product_id || '',
        sub_product_id: invoiceItem?.sub_product_id || '',
        quantity: invoiceItem?.quantity || 1,
        issued_date: data.issued_date,
        due_date: data.due_date || '',
        status: data.status,
        total_amount: data.total_amount,
        notes: data.notes || '',
        user_id: data.user_id,
        scanned_copy_url: data.scanned_copy_url
      })

      // Fetch subproducts if a product is selected
      if (invoiceItem?.product_id) {
        await fetchSubProducts(invoiceItem.product_id)
      }
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Error loading invoice')
      navigate('/invoices')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Error loading companies')
    }
  }

  const fetchProducts = async () => {
    if (!session?.user?.id) return

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Error loading products')
    }
  }

  const fetchSubProducts = async (productId) => {
    if (!session?.user?.id || !productId) return

    try {
      const { data, error } = await supabase
        .from('sub_products')
        .select('*')
        .eq('parent_product_id', productId)
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setSubProducts(data || [])
    } catch (error) {
      console.error('Error fetching sub-products:', error)
      toast.error('Error loading sub-products')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
        toast.error('Please upload a PDF or image file')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadFile = async () => {
    if (!selectedFile) return formData.scanned_copy_url
    
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const filePath = `${session.user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('invoice-files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            setUploadProgress((progress.loaded / progress.total) * 100)
          }
        })

      if (uploadError) throw uploadError
      
      return filePath
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error('Error uploading file: ' + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Calculate total amount based on product/subproduct price and quantity
      let unitPrice = 0
      let product_id = null
      let sub_product_id = null

      if (formData.sub_product_id) {
        const subProduct = subProducts.find(sp => sp.id === formData.sub_product_id)
        unitPrice = subProduct ? subProduct.price : 0
        sub_product_id = formData.sub_product_id
      } else if (formData.product_id) {
        const product = products.find(p => p.id === formData.product_id)
        unitPrice = product ? product.price : 0
        product_id = formData.product_id
      }

      const totalPrice = unitPrice * formData.quantity

      // Upload file if selected
      let scannedCopyUrl = formData.scanned_copy_url
      if (selectedFile) {
        scannedCopyUrl = await uploadFile()
      }

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          invoice_number: formData.invoice_number,
          company_id: formData.company_id,
          issued_date: formData.issued_date,
          due_date: formData.due_date,
          status: formData.status,
          total_amount: totalPrice,
          notes: formData.notes,
          scanned_copy_url: scannedCopyUrl
        })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (invoiceError) throw invoiceError

      // Update invoice item
      const { error: itemError } = await supabase
        .from('invoice_items')
        .update({
          product_id,
          sub_product_id,
          quantity: formData.quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        })
        .eq('invoice_id', id)

      if (itemError) throw itemError

      toast.success('Invoice updated successfully')
      navigate('/invoices')
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Error updating invoice: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }

      // Reset sub_product_id when product_id changes
      if (name === 'product_id') {
        newData.sub_product_id = ''
      }

      return newData
    })
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to edit invoices.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Edit Invoice</h1>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  id="invoice_number"
                  required
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="company_id" className="block text-sm font-medium text-gray-700">
                  Company
                </label>
                <select
                  name="company_id"
                  id="company_id"
                  required
                  value={formData.company_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  <option value="">Select a company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
                  Product
                </label>
                <select
                  name="product_id"
                  id="product_id"
                  required
                  value={formData.product_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ${product.price}
                    </option>
                  ))}
                </select>
              </div>

              {formData.product_id && (
                <div>
                  <label htmlFor="sub_product_id" className="block text-sm font-medium text-gray-700">
                    Sub-Product
                  </label>
                  <select
                    name="sub_product_id"
                    id="sub_product_id"
                    value={formData.sub_product_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                    focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  >
                    <option value="">Select a sub-product (optional)</option>
                    {subProducts.map(subProduct => (
                      <option key={subProduct.id} value={subProduct.id}>
                        {subProduct.name} - ${subProduct.price}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="issued_date" className="block text-sm font-medium text-gray-700">
                  Issue Date
                </label>
                <input
                  type="date"
                  name="issued_date"
                  id="issued_date"
                  required
                  value={formData.issued_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  id="due_date"
                  required
                  value={formData.due_date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  id="status"
                  required
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload Invoice File (PDF or Image)
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-white
                    hover:file:cursor-pointer hover:file:bg-primary-hover
                    hover:file:text-white"
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {formData.scanned_copy_url && !selectedFile && (
                  <p className="mt-2 text-sm text-gray-500">
                    Current file: {formData.scanned_copy_url.split('/').pop()}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 
                  focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/invoices')}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md 
                text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                focus:ring-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md 
                text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 
                focus:ring-primary disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Invoice'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 