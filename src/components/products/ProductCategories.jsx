import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronRight, FaFolder, FaFolderOpen, FaFileInvoiceDollar, FaThList, FaFolderPlus } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'

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
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage product categories.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        {/* Category Form */}
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Create or edit product categories to organize your products.
            </p>
          </div>
        </div>

        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Base Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      min="0"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="focus:ring-primary focus:border-primary block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null)
                      setFormData({ name: '', description: '', price: '' })
                    }}
                    className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {loading ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-product Form */}
      {(editingSubProduct || subProductForm.parent_product_id) && (
        <div className="mt-10 md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {editingSubProduct ? 'Edit Sub-product' : 'Add New Sub-product'}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Create or edit sub-products within a category.
              </p>
            </div>
          </div>

          <div className="mt-5 md:mt-0 md:col-span-2">
            <form onSubmit={handleSubProductSubmit}>
              <div className="shadow sm:rounded-md sm:overflow-hidden">
                <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                  <div>
                    <label htmlFor="sub-name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      name="sub-name"
                      id="sub-name"
                      required
                      value={subProductForm.name}
                      onChange={(e) => setSubProductForm({ ...subProductForm, name: e.target.value })}
                      className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="sub-description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="sub-description"
                      name="sub-description"
                      rows={3}
                      value={subProductForm.description}
                      onChange={(e) => setSubProductForm({ ...subProductForm, description: e.target.value })}
                      className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="sub-price" className="block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="sub-price"
                        id="sub-price"
                        min="0"
                        step="0.01"
                        required
                        value={subProductForm.price}
                        onChange={(e) => setSubProductForm({ ...subProductForm, price: e.target.value })}
                        className="focus:ring-primary focus:border-primary block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubProduct(null)
                      setSubProductForm({ name: '', description: '', price: '', parent_product_id: null })
                    }}
                    className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    {loading ? 'Saving...' : editingSubProduct ? 'Update Sub-product' : 'Add Sub-product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="mt-10">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Product Categories</h3>
        {loading && !categories.length ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No categories found. Create your first category above.</p>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {categories.map((category) => (
                <li key={category.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="mr-2 text-gray-400 hover:text-gray-500"
                        >
                          {expandedCategories[category.id] ? (
                            <FaChevronDown className="h-4 w-4" />
                          ) : (
                            <FaChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{category.name}</h4>
                          {category.description && (
                            <p className="text-sm text-gray-500">{category.description}</p>
                          )}
                          <p className="text-sm font-medium text-primary">
                            Base Price: ${parseFloat(category.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setEditingCategory(category)
                            setFormData({
                              name: category.name,
                              description: category.description || '',
                              price: category.price
                            })
                          }}
                          className="text-primary hover:text-primary-hover"
                        >
                          <FaEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTrash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-products */}
                    {expandedCategories[category.id] && (
                      <div className="mt-4 ml-6">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-sm font-medium text-gray-700">Sub-products</h5>
                          <button
                            onClick={() => setSubProductForm({
                              name: '',
                              description: '',
                              price: '',
                              parent_product_id: category.id
                            })}
                            className="inline-flex items-center text-sm text-primary hover:text-primary-hover"
                          >
                            <FaPlus className="h-4 w-4 mr-1" />
                            Add Sub-product
                          </button>
                        </div>
                        {category.sub_products?.length > 0 ? (
                          <ul className="space-y-3">
                            {category.sub_products.map((subProduct) => (
                              <li key={subProduct.id} className="bg-gray-50 rounded-md p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h6 className="text-sm font-medium text-gray-900">
                                      {subProduct.name}
                                    </h6>
                                    {subProduct.description && (
                                      <p className="text-sm text-gray-500">{subProduct.description}</p>
                                    )}
                                    <p className="text-sm font-medium text-primary">
                                      ${parseFloat(subProduct.price).toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => {
                                        setEditingSubProduct(subProduct)
                                        setSubProductForm({
                                          name: subProduct.name,
                                          description: subProduct.description || '',
                                          price: subProduct.price,
                                          parent_product_id: category.id
                                        })
                                      }}
                                      className="text-primary hover:text-primary-hover"
                                    >
                                      <FaEdit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubProduct(subProduct.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <FaTrash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No sub-products yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Invoice Entries Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Invoice Entries</h2>
          <button
            onClick={() => setShowFolderView(!showFolderView)}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white 
            border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none 
            focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {showFolderView ? (
              <>
                <FaThList className="mr-2" />
                Show as List
              </>
            ) : (
              <>
                <FaFolderPlus className="mr-2" />
                Show as Folders
              </>
            )}
          </button>
        </div>

        {showFolderView ? (
          // Folder View
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 space-y-4">
              {Object.entries(groupInvoicesByProduct()).map(([productId, data]) => (
                <div key={productId} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleFolder(productId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-t-lg"
                  >
                    <div className="flex items-center">
                      {expandedFolders[productId] ? (
                        <FaFolderOpen className="h-5 w-5 text-yellow-500 mr-3" />
                      ) : (
                        <FaFolder className="h-5 w-5 text-yellow-500 mr-3" />
                      )}
                      <span className="font-medium text-gray-900">{data.product.name}</span>
                      <span className="ml-3 text-sm text-gray-500">
                        ({data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'})
                      </span>
                    </div>
                    {expandedFolders[productId] ? (
                      <FaChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FaChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFolders[productId] && (
                    <div className="border-t border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {data.entries.map(entry => (
                          <div key={entry.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start">
                              <FaFileInvoiceDollar className="h-5 w-5 text-gray-400 mt-1" />
                              <div className="ml-3">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900">
                                    {entry.invoices.invoice_number}
                                  </span>
                                  <span
                                    className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                      ${entry.invoices.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      entry.invoices.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                      entry.invoices.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                      'bg-blue-100 text-blue-800'}`}
                                  >
                                    {entry.invoices.status}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-500">
                                  <div>Quantity: {entry.quantity}</div>
                                  <div>Unit Price: ${entry.unit_price}</div>
                                  <div>Total: ${entry.total_price}</div>
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
                <div className="text-center py-6 text-gray-500">
                  No invoice entries found
                </div>
              )}
            </div>
          </div>
        ) : (
          // List View
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoiceEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {entry.invoices.invoice_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.invoices.issued_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {entry.products?.name || entry.sub_products?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${entry.total_price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${entry.invoices.status === 'paid' ? 'bg-green-100 text-green-800' :
                          entry.invoices.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          entry.invoices.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'}`}
                      >
                        {entry.invoices.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoiceEntries.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No invoice entries found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 