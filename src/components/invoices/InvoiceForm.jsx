import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import {
  FaArrowLeft,
  FaBuilding,
  FaBox,
  FaCalendarAlt,
  FaClipboard,
  FaUpload,
  FaFileInvoiceDollar,
  FaTags,
  FaPlus,
  FaMinus
} from 'react-icons/fa'
import {
  Input,
  Button,
  Select,
  Textarea,
  FormGroup,
  Label,
  Card,
  Badge
} from '../ui/FormElements'

export default function InvoiceForm({ invoice = null }) {
  const navigate = useNavigate()
  const { session } = useGlobal()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [products, setProducts] = useState([])
  const [subProducts, setSubProducts] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [items, setItems] = useState([{
    product_id: '',
    sub_product_id: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0
  }])
  const [formData, setFormData] = useState({
    invoice_number: '',
    company_id: '',
    issued_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    total_amount: 0,
    notes: '',
    user_id: null
  })

  useEffect(() => {
    if (session?.user?.id) {
      setFormData(prev => ({ ...prev, user_id: session.user.id }))
      fetchCompanies()
      fetchProducts()
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (invoice) {
      setFormData({
        invoice_number: invoice.invoice_number,
        company_id: invoice.company_id,
        issued_date: invoice.issued_date,
        due_date: invoice.due_date || '',
        status: invoice.status,
        total_amount: invoice.total_amount,
        notes: invoice.notes || '',
        user_id: invoice.user_id,
        scanned_copy_url: invoice.scanned_copy_url
      })

      if (invoice.invoice_items?.length > 0) {
        setItems(invoice.invoice_items.map(item => ({
          product_id: item.product_id || '',
          sub_product_id: item.sub_product_id || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        })))

        // Fetch subproducts for each product
        invoice.invoice_items.forEach(item => {
          if (item.product_id) {
            fetchSubProducts(item.product_id)
          }
        })
      }
    }
  }, [invoice])

  const fetchCompanies = async () => {
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
    try {
      const { data, error } = await supabase
        .from('sub_products')
        .select('*')
        .eq('parent_product_id', productId)
        .order('name')

      if (error) throw error
      setSubProducts(prev => {
        const existing = prev.filter(p => p.parent_product_id !== productId)
        return [...existing, ...(data || [])]
      })
    } catch (error) {
      console.error('Error fetching sub-products:', error)
      toast.error('Error loading sub-products')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }

      // Update unit price if sub-product is selected
      if (field === 'sub_product_id' && value) {
        const subProduct = subProducts.find(p => p.id === value)
        if (subProduct) {
          newItems[index].unit_price = subProduct.price
          newItems[index].total_price = subProduct.price * newItems[index].quantity
        }
      }

      // Update total price when quantity changes
      if (field === 'quantity') {
        newItems[index].total_price = newItems[index].unit_price * value
      }

      // Calculate total amount
      const total = newItems.reduce((sum, item) => sum + item.total_price, 0)
      setFormData(prev => ({ ...prev, total_amount: total }))

      return newItems
    })
  }

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      product_id: '',
      sub_product_id: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }])
  }

  const handleRemoveItem = (index) => {
    setItems(prev => {
      const newItems = prev.filter((_, i) => i !== index)
      const total = newItems.reduce((sum, item) => sum + item.total_price, 0)
      setFormData(prev => ({ ...prev, total_amount: total }))
      return newItems
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setLoading(true)

      // Upload file if selected
      let scanned_copy_url = invoice?.scanned_copy_url
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const filePath = `${session.user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('invoice-files')
          .upload(filePath, selectedFile, {
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100
              setUploadProgress(percent)
            }
          })

        if (uploadError) throw uploadError
        scanned_copy_url = `invoice-files/${filePath}`
      }

      const invoiceData = {
        ...formData,
        scanned_copy_url
      }

      let result
      if (invoice) {
        // Update existing invoice
        const { data, error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id)
          .eq('user_id', session.user.id)
          .select()
          .single()

        if (error) throw error
        result = data

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoice.id)

        if (deleteError) throw deleteError
      } else {
        // Create new invoice
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (error) throw error
        result = data
      }

      // Insert invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items.map(item => ({
          ...item,
          invoice_id: result.id
        })))

      if (itemsError) throw itemsError

      toast.success(invoice ? 'Invoice updated successfully' : 'Invoice created successfully')
      navigate('/invoices')
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast.error('Error saving invoice: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">
          Please sign in to {invoice ? 'edit' : 'create'} invoices.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/invoices')}
            className="mr-4"
          >
            <FaArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {invoice ? 'Edit Invoice' : 'Create New Invoice'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-center text-gray-900 dark:text-white mb-4">
              <FaFileInvoiceDollar className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium">Invoice Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormGroup>
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="company_id">Company</Label>
                <Select
                  id="company_id"
                  name="company_id"
                  value={formData.company_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="issued_date">Issue Date</Label>
                <Input
                  type="date"
                  id="issued_date"
                  name="issued_date"
                  value={formData.issued_date}
                  onChange={handleInputChange}
                  required
                  icon={<FaCalendarAlt className="h-4 w-4" />}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  required
                  icon={<FaCalendarAlt className="h-4 w-4" />}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input
                  type="number"
                  id="total_amount"
                  name="total_amount"
                  value={formData.total_amount}
                  readOnly
                  leftIcon="₹"
                />
              </FormGroup>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between text-gray-900 dark:text-white mb-4">
              <div className="flex items-center">
                <FaBox className="h-5 w-5 mr-2" />
                <h2 className="text-lg font-medium">Invoice Items</h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddItem}
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Item {index + 1}
                    </h3>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <FaMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormGroup>
                      <Label htmlFor={`product_${index}`}>Product</Label>
                      <Select
                        id={`product_${index}`}
                        value={item.product_id}
                        onChange={(e) => {
                          handleItemChange(index, 'product_id', e.target.value)
                          if (e.target.value) {
                            fetchSubProducts(e.target.value)
                          }
                        }}
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>

                    {item.product_id && subProducts.filter(p => p.parent_product_id === item.product_id).length > 0 && (
                      <FormGroup>
                        <Label htmlFor={`sub_product_${index}`}>Sub Product</Label>
                        <Select
                          id={`sub_product_${index}`}
                          value={item.sub_product_id}
                          onChange={(e) => handleItemChange(index, 'sub_product_id', e.target.value)}
                        >
                          <option value="">Select a sub product</option>
                          {subProducts
                            .filter(p => p.parent_product_id === item.product_id)
                            .map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name} - ₹{product.price}
                              </option>
                            ))}
                        </Select>
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label htmlFor={`quantity_${index}`}>Quantity</Label>
                      <Input
                        type="number"
                        id={`quantity_${index}`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                        required
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Total</Label>
                      <Input
                        type="number"
                        value={item.total_price}
                        readOnly
                        leftIcon="₹"
                      />
                    </FormGroup>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 space-y-6">
            <div className="flex items-center text-gray-900 dark:text-white mb-4">
              <FaClipboard className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium">Additional Information</h2>
            </div>

            <FormGroup>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="file">
                {invoice ? 'Update Attachment' : 'Attachment'}
              </Label>
              <Input
                type="file"
                id="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                  file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-400"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </FormGroup>
          </div>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/invoices')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
} 