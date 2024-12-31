import { useState, useEffect } from 'react'
import { FaEdit, FaTrash } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { 
  Input, 
  Textarea, 
  Label, 
  FormGroup, 
  Button 
} from '../ui/FormElements'

export default function CompanySetup() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [editingCompany, setEditingCompany] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchCompanies()
    }
  }, [session?.user?.id])

  const fetchCompanies = async () => {
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
      toast.error('Error loading companies')
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
        user_id: session.user.id
      }

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
        toast.success('Company created successfully')
      }

      setFormData({ name: '', email: '', phone: '', address: '' })
      setEditingCompany(null)
      fetchCompanies()
    } catch (error) {
      console.error('Error saving company:', error)
      toast.error('Error saving company')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company? All associated invoices will be affected.')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Company deleted successfully')
      fetchCompanies()
    } catch (error) {
      console.error('Error deleting company:', error)
      toast.error('Error deleting company')
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
      address: company.address || ''
    })
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to manage companies.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          {editingCompany ? 'Edit Company' : 'Add Company'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormGroup>
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="phone">Phone</Label>
            <Input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
            />
          </FormGroup>

          <div className="flex justify-end space-x-4">
            {editingCompany && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingCompany(null)
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    address: ''
                  })
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
              {loading ? 'Saving...' : editingCompany ? 'Update' : 'Add Company'}
            </Button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Companies</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading && !companies.length ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No companies added yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {companies.map(company => (
                <li 
                  key={company.id} 
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {company.name}
                      </h4>
                      {company.email && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {company.email}
                        </p>
                      )}
                      {company.phone && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {company.phone}
                        </p>
                      )}
                      {company.address && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-line">
                          {company.address}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(company)}
                      >
                        <FaEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => handleDelete(company.id)}
                      >
                        <FaTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
} 