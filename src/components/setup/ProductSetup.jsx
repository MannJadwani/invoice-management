import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'

export default function ProductSetup() {
  const { session } = useGlobal()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    user_id: null
  })

  useEffect(() => {
    if (session?.user?.id) {
      setFormData(prev => ({ ...prev, user_id: session.user.id }))
      fetchProducts()
    }
  }, [session?.user?.id])

  const fetchProducts = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      toast.error('Error fetching products: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast.error('Please sign in to manage products')
      return
    }

    try {
      setLoading(true)
      const data = { 
        ...formData,
        price: parseFloat(formData.price) || 0,
        user_id: session.user.id 
      }
      
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(data)
          .eq('id', editingProduct.id)
          .eq('user_id', session.user.id)

        if (error) throw error
        toast.success('Product updated successfully')
      } else {
        const { error } = await supabase
          .from('products')
          .insert([data])

        if (error) throw error
        toast.success('Product added successfully')
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        user_id: session.user.id
      })
      setEditingProduct(null)
      fetchProducts()
    } catch (error) {
      toast.error('Error saving product: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price?.toString() || '',
      user_id: session?.user?.id
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('user_id', session?.user?.id)

      if (error) throw error
      toast.success('Product deleted successfully')
      fetchProducts()
    } catch (error) {
      toast.error('Error deleting product: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage products.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Form */}
      <div className="card">
        <h3 className="text-lg font-medium mb-4">
          {editingProduct ? 'Edit Product' : 'Add Product'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-primary focus:ring-primary sm:text-sm"
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
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                id="price"
                name="price"
                required
                value={formData.price}
                onChange={handleInputChange}
                className="block w-full rounded-md border-gray-300 pl-7 
                focus:border-primary focus:ring-primary sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            {editingProduct && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null)
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    user_id: session?.user?.id
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm 
                font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none 
                focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent 
              shadow-sm text-sm font-medium rounded-md text-white bg-primary 
              hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 
              focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingProduct ? 'Update' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h3 className="text-lg font-medium mb-4">Products</h3>
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center">No products added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {products.map(product => (
              <li key={product.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                    {product.description && (
                      <p className="text-sm text-gray-500">{product.description}</p>
                    )}
                    <p className="text-sm font-medium text-primary">${product.price}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-primary hover:text-primary-hover"
                    >
                      <FaEdit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FaTrash className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
} 