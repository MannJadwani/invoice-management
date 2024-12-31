import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'

export default function CompanySetup() {
  const { session } = useGlobal()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    user_id: null
  })

  useEffect(() => {
    if (session?.user?.id) {
      setFormData(prev => ({ ...prev, user_id: session.user.id }))
      fetchCompanies()
    }
  }, [session?.user?.id])

  const fetchCompanies = async () => {
    if (!session?.user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Error fetching companies: ' + error.message)
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
      toast.error('You must be logged in to save a company')
      return
    }

    try {
      setLoading(true)
      const data = { ...formData, user_id: session.user.id }
      
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', editingCompany.id)
          .eq('user_id', session.user.id)

        if (error) throw error
        toast.success('Company updated successfully')
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([data])

        if (error) throw error
        toast.success('Company added successfully')
      }

      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        user_id: session.user.id
      })
      setEditingCompany(null)
      fetchCompanies()
    } catch (error) {
      console.error('Error saving company:', error)
      toast.error('Error saving company: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (company) => {
    setEditingCompany(company)
    setFormData({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      user_id: session?.user?.id
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .eq('user_id', session?.user?.id)

      if (error) throw error
      toast.success('Company deleted successfully')
      fetchCompanies()
    } catch (error) {
      toast.error('Error deleting company: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage companies.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Form */}
      <div className="card">
        <h3 className="text-lg font-medium mb-4">
          {editingCompany ? 'Edit Company' : 'Add Company'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Company Name
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={3}
              value={formData.address}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm 
              focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3">
            {editingCompany && (
              <button
                type="button"
                onClick={() => {
                  setEditingCompany(null)
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    address: '',
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
              {loading ? 'Saving...' : editingCompany ? 'Update' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="card">
        <h3 className="text-lg font-medium mb-4">Companies</h3>
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : companies.length === 0 ? (
          <p className="text-gray-500 text-center">No companies added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {companies.map(company => (
              <li key={company.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{company.name}</h4>
                    {company.email && (
                      <p className="text-sm text-gray-500">{company.email}</p>
                    )}
                    {company.phone && (
                      <p className="text-sm text-gray-500">{company.phone}</p>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEdit(company)}
                      className="text-primary hover:text-primary-hover"
                    >
                      <FaEdit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(company.id)}
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