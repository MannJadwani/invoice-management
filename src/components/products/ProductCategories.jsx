import { useState, useEffect } from 'react'
import { 
  FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronRight, 
  FaFolder, FaFolderOpen, FaFileInvoiceDollar, FaThList 
} from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { 
  Input, 
  Textarea, 
  Label, 
  FormGroup, 
  Button,
  Card,
  Badge
} from '../ui/FormElements'

export default function ProductCategories() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingSubProduct, setEditingSubProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: ''
  })
  const [subProductForm, setSubProductForm] = useState({
    name: '',
    description: '',
    price: '',
    parent_product_id: null
  })
  const [showFolderView, setShowFolderView] = useState(false)
  const [invoiceEntries, setInvoiceEntries] = useState([])
  const [expandedFolders, setExpandedFolders] = useState({})

  useEffect(() => {
    if (session?.user?.id) {
      fetchCategories()
      fetchInvoiceEntries()
    }
  }, [session?.user?.id])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      // Fetch main products (categories)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, sub_products(*)')
        .eq('user_id', session.user.id)
        .order('name')

      if (productsError) throw productsError
      setCategories(productsData || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Error loading categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        user_id: session.user.id
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', editingCategory.id)
          .eq('user_id', session.user.id)

        if (error) throw error
        toast.success('Category updated successfully')
      } else {
        const { error } = await supabase
          .from('products')
          .insert([data])

        if (error) throw error
        toast.success('Category created successfully')
      }

      setFormData({ name: '', description: '', price: '' })
      setEditingCategory(null)
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      toast.error('Error saving category')
    } finally {
      setLoading(false)
    }
  }

  const handleSubProductSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const data = {
        ...subProductForm,
        price: parseFloat(subProductForm.price) || 0,
        user_id: session.user.id
      }

      if (editingSubProduct) {
        const { error } = await supabase
          .from('sub_products')
          .update(data)
          .eq('id', editingSubProduct.id)
          .eq('user_id', session.user.id)

        if (error) throw error
        toast.success('Sub-product updated successfully')
      } else {
        const { error } = await supabase
          .from('sub_products')
          .insert([data])

        if (error) throw error
        toast.success('Sub-product created successfully')
      }

      setSubProductForm({ name: '', description: '', price: '', parent_product_id: null })
      setEditingSubProduct(null)
      fetchCategories()
    } catch (error) {
      console.error('Error saving sub-product:', error)
      toast.error('Error saving sub-product')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category and all its sub-products?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Category deleted successfully')
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Error deleting category')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSubProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sub-product?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('sub_products')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Sub-product deleted successfully')
      fetchCategories()
    } catch (error) {
      console.error('Error deleting sub-product:', error)
      toast.error('Error deleting sub-product')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const fetchInvoiceEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          *,
          invoices (
            invoice_number,
            issued_date,
            total_amount,
            status
          ),
          products (
            name,
            description
          ),
          sub_products (
            name,
            description,
            parent_product_id
          )
        `)
        .eq('invoices.user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoiceEntries(data || [])
    } catch (error) {
      console.error('Error fetching invoice entries:', error)
      toast.error('Error loading invoice entries')
    }
  }

  const toggleFolder = (productId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  const groupInvoicesByProduct = () => {
    const grouped = {}
    
    invoiceEntries.forEach(entry => {
      if (entry.product_id) {
        if (!grouped[entry.product_id]) {
          grouped[entry.product_id] = {
            product: entry.products,
            entries: []
          }
        }
        grouped[entry.product_id].entries.push(entry)
      }
    })

    return grouped
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to manage product categories.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Product Categories
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your product categories and sub-products
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Form */}
        <Card className="lg:col-span-1">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormGroup>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="price">Base Price</Label>
                <Input
                  type="number"
                  id="price"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  leftIcon="₹"
                />
              </FormGroup>

              <div className="flex justify-end space-x-4">
                {editingCategory && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingCategory(null)
                      setFormData({ name: '', description: '', price: '' })
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Categories List */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Categories
              </h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && !categories.length ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : categories.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No categories found. Create your first category using the form.
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <div key={category.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCategory(category.id)}
                            className="mr-2"
                          >
                            {expandedCategories[category.id] ? (
                              <FaChevronDown className="h-4 w-4" />
                            ) : (
                              <FaChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                              {category.name}
                            </h4>
                            {category.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {category.description}
                              </p>
                            )}
                            <p className="text-sm font-medium text-primary dark:text-primary-400">
                              Base Price: ₹{parseFloat(category.price).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCategory(category)
                              setFormData({
                                name: category.name,
                                description: category.description || '',
                                price: category.price
                              })
                            }}
                          >
                            <FaEdit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sub-products */}
                      {expandedCategories[category.id] && (
                        <div className="mt-4 ml-6">
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                              Sub-products
                            </h5>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSubProductForm({
                                name: '',
                                description: '',
                                price: '',
                                parent_product_id: category.id
                              })}
                            >
                              <FaPlus className="h-4 w-4 mr-2" />
                              Add Sub-product
                            </Button>
                          </div>

                          {category.sub_products?.length > 0 ? (
                            <div className="space-y-3">
                              {category.sub_products.map((subProduct) => (
                                <div 
                                  key={subProduct.id} 
                                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h6 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {subProduct.name}
                                      </h6>
                                      {subProduct.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                          {subProduct.description}
                                        </p>
                                      )}
                                      <p className="text-sm font-medium text-primary dark:text-primary-400">
                                        ₹{parseFloat(subProduct.price).toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setEditingSubProduct(subProduct)
                                          setSubProductForm({
                                            name: subProduct.name,
                                            description: subProduct.description || '',
                                            price: subProduct.price,
                                            parent_product_id: category.id
                                          })
                                        }}
                                      >
                                        <FaEdit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                        onClick={() => handleDeleteSubProduct(subProduct.id)}
                                      >
                                        <FaTrash className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No sub-products yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Sub-product Form */}
      {(editingSubProduct || subProductForm.parent_product_id) && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              {editingSubProduct ? 'Edit Sub-product' : 'Add Sub-product'}
            </h3>
            
            <form onSubmit={handleSubProductSubmit} className="space-y-6">
              <FormGroup>
                <Label htmlFor="sub-name">Name</Label>
                <Input
                  id="sub-name"
                  value={subProductForm.name}
                  onChange={(e) => setSubProductForm({ ...subProductForm, name: e.target.value })}
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="sub-description">Description</Label>
                <Textarea
                  id="sub-description"
                  value={subProductForm.description}
                  onChange={(e) => setSubProductForm({ ...subProductForm, description: e.target.value })}
                  rows={3}
                />
              </FormGroup>

              <FormGroup>
                <Label htmlFor="sub-price">Price</Label>
                <Input
                  type="number"
                  id="sub-price"
                  min="0"
                  step="0.01"
                  required
                  value={subProductForm.price}
                  onChange={(e) => setSubProductForm({ ...subProductForm, price: e.target.value })}
                  leftIcon="₹"
                />
              </FormGroup>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingSubProduct(null)
                    setSubProductForm({ name: '', description: '', price: '', parent_product_id: null })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingSubProduct ? 'Update Sub-product' : 'Add Sub-product'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Invoice Entries */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Invoice Entries
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View all invoice entries for your products
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFolderView(!showFolderView)}
            >
              {showFolderView ? (
                <>
                  <FaThList className="h-4 w-4 mr-2" />
                  Show as List
                </>
              ) : (
                <>
                  <FaFolder className="h-4 w-4 mr-2" />
                  Show as Folders
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {showFolderView ? (
            <div className="p-6 space-y-4">
              {Object.entries(groupInvoicesByProduct()).map(([productId, data]) => (
                <div 
                  key={productId} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleFolder(productId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 
                    dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    <div className="flex items-center">
                      {expandedFolders[productId] ? (
                        <FaFolderOpen className="h-5 w-5 text-yellow-500 mr-3" />
                      ) : (
                        <FaFolder className="h-5 w-5 text-yellow-500 mr-3" />
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {data.product.name}
                      </span>
                      <Badge variant="secondary" className="ml-3">
                        {data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'}
                      </Badge>
                    </div>
                    {expandedFolders[productId] ? (
                      <FaChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FaChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFolders[productId] && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {data.entries.map(entry => (
                          <div 
                            key={entry.id} 
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 
                            transition-colors duration-150"
                          >
                            <div className="flex items-start">
                              <FaFileInvoiceDollar className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-1" />
                              <div className="ml-3">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {entry.invoices.invoice_number}
                                  </span>
                                  <Badge
                                    variant={
                                      entry.invoices.status === 'paid' ? 'success' :
                                      entry.invoices.status === 'overdue' ? 'error' :
                                      entry.invoices.status === 'draft' ? 'secondary' :
                                      'primary'
                                    }
                                    className="ml-3"
                                  >
                                    {entry.invoices.status}
                                  </Badge>
                                </div>
                                <div className="mt-1 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                                  <div>Quantity: {entry.quantity}</div>
                                  <div>Unit Price: ₹{entry.unit_price}</div>
                                  <div>Total: ₹{entry.total_price}</div>
                                  <div>Date: {new Date(entry.invoices.issued_date).toLocaleDateString()}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {Object.keys(groupInvoicesByProduct()).length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  No invoice entries found
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {invoiceEntries.map(entry => (
                    <tr 
                      key={entry.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.invoices.invoice_number}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(entry.invoices.issued_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {entry.products?.name || entry.sub_products?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {entry.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ₹{entry.total_price}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            entry.invoices.status === 'paid' ? 'success' :
                            entry.invoices.status === 'overdue' ? 'error' :
                            entry.invoices.status === 'draft' ? 'secondary' :
                            'primary'
                          }
                        >
                          {entry.invoices.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoiceEntries.length === 0 && (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  No invoice entries found
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
} 