import { useState, useEffect } from 'react'
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaChevronDown, 
  FaChevronRight, 
  FaFolder, 
  FaFolderOpen, 
  FaFileInvoiceDollar,
  FaThList,
  FaBuilding
} from 'react-icons/fa'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'

export default function CompanyManagement() {
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
  const [showFolderView, setShowFolderView] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [expandedFolders, setExpandedFolders] = useState({})

  useEffect(() => {
    if (session?.user?.id) {
      fetchCompanies()
      fetchInvoices()
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

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          companies (
            name,
            email
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Error loading invoices')
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

  const handleDeleteCompany = async (id) => {
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

  const toggleFolder = (companyId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }))
  }

  const groupInvoicesByCompany = () => {
    const grouped = {}
    
    invoices.forEach(invoice => {
      if (!grouped[invoice.company_id]) {
        grouped[invoice.company_id] = {
          company: invoice.companies,
          invoices: []
        }
      }
      grouped[invoice.company_id].invoices.push(invoice)
    })

    return grouped
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage companies.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        {/* Company Form */}
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {editingCompany ? 'Edit Company' : 'Add New Company'}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Manage your client companies and their information.
            </p>
          </div>
        </div>

        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Company Name
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                {editingCompany && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCompany(null)
                      setFormData({ name: '', email: '', phone: '', address: '' })
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
                  {loading ? 'Saving...' : editingCompany ? 'Update Company' : 'Add Company'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Companies List */}
      <div className="mt-10">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Companies</h3>
        {loading && !companies.length ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : companies.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No companies found. Add your first company above.</p>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {companies.map((company) => (
                <li key={company.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{company.name}</h4>
                        {company.email && (
                          <p className="text-sm text-gray-500">{company.email}</p>
                        )}
                        {company.phone && (
                          <p className="text-sm text-gray-500">{company.phone}</p>
                        )}
                        {company.address && (
                          <p className="text-sm text-gray-500">{company.address}</p>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setEditingCompany(company)
                            setFormData({
                              name: company.name,
                              email: company.email || '',
                              phone: company.phone || '',
                              address: company.address || ''
                            })
                          }}
                          className="text-primary hover:text-primary-hover"
                        >
                          <FaEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <FaTrash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Company Invoices</h2>
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
                <FaFolder className="mr-2" />
                Show as Folders
              </>
            )}
          </button>
        </div>

        {showFolderView ? (
          // Folder View
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 space-y-4">
              {Object.entries(groupInvoicesByCompany()).map(([companyId, data]) => (
                <div key={companyId} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleFolder(companyId)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-t-lg"
                  >
                    <div className="flex items-center">
                      {expandedFolders[companyId] ? (
                        <FaFolderOpen className="h-5 w-5 text-yellow-500 mr-3" />
                      ) : (
                        <FaFolder className="h-5 w-5 text-yellow-500 mr-3" />
                      )}
                      <span className="font-medium text-gray-900">{data.company.name}</span>
                      <span className="ml-3 text-sm text-gray-500">
                        ({data.invoices.length} {data.invoices.length === 1 ? 'invoice' : 'invoices'})
                      </span>
                    </div>
                    {expandedFolders[companyId] ? (
                      <FaChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <FaChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFolders[companyId] && (
                    <div className="border-t border-gray-200">
                      <div className="divide-y divide-gray-200">
                        {data.invoices.map(invoice => (
                          <div key={invoice.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start">
                              <FaFileInvoiceDollar className="h-5 w-5 text-gray-400 mt-1" />
                              <div className="ml-3">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900">
                                    {invoice.invoice_number}
                                  </span>
                                  <span
                                    className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                      ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                      invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                      'bg-blue-100 text-blue-800'}`}
                                  >
                                    {invoice.status}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-gray-500">
                                  <div>Total Amount: ${invoice.total_amount}</div>
                                  <div>Date: {new Date(invoice.issued_date).toLocaleDateString()}</div>
                                  {invoice.due_date && (
                                    <div>Due: {new Date(invoice.due_date).toLocaleDateString()}</div>
                                  )}
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
              {Object.keys(groupInvoicesByCompany()).length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  No invoices found
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
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.companies?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${invoice.total_amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.issued_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No invoices found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 