import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { toast } from 'react-hot-toast'
import { useGlobal } from '../../context/GlobalContext'

export default function DefaultSettings() {
  const { session } = useGlobal()
  const [settings, setSettings] = useState({
    default_company_id: '',
    default_schema_id: '',
    default_products: []
  })
  const [companies, setCompanies] = useState([])
  const [schemas, setSchemas] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      fetchData()
    }
  }, [session?.user?.id])

  const fetchData = async () => {
    if (!session?.user?.id) return

    try {
      const [companiesRes, schemasRes, productsRes, settingsRes] = await Promise.all([
        supabase
          .from('companies')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name'),
        supabase
          .from('invoice_schemas')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name'),
        supabase
          .from('products')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name'),
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
      ])

      if (companiesRes.error) throw companiesRes.error
      if (schemasRes.error) throw schemasRes.error
      if (productsRes.error) throw productsRes.error

      setCompanies(companiesRes.data || [])
      setSchemas(schemasRes.data || [])
      setProducts(productsRes.data || [])

      if (settingsRes.data) {
        setSettings(settingsRes.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error fetching data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast.error('You must be logged in to save settings')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          ...settings,
          user_id: session.user.id
        })

      if (error) throw error
      toast.success('Settings updated successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage settings.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-6">Default Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="default_company" className="block text-sm font-medium text-gray-700">
              Default Company
            </label>
            <select
              id="default_company"
              value={settings.default_company_id || ''}
              onChange={(e) => setSettings({ ...settings, default_company_id: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none 
              focus:ring-primary focus:border-primary rounded-md"
            >
              <option value="">Select a default company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="default_schema" className="block text-sm font-medium text-gray-700">
              Default Invoice Schema
            </label>
            <select
              id="default_schema"
              value={settings.default_schema_id || ''}
              onChange={(e) => setSettings({ ...settings, default_schema_id: e.target.value })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none 
              focus:ring-primary focus:border-primary rounded-md"
            >
              <option value="">Select a default schema</option>
              {schemas.map((schema) => (
                <option key={schema.id} value={schema.id}>
                  {schema.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Products
            </label>
            <div className="space-y-2">
              {products.map((product) => (
                <label key={product.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.default_products?.includes(product.id)}
                    onChange={(e) => {
                      const newProducts = e.target.checked
                        ? [...(settings.default_products || []), product.id]
                        : (settings.default_products || []).filter(id => id !== product.id)
                      setSettings({ ...settings, default_products: newProducts })
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-900">{product.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium 
              rounded-md shadow-sm text-white bg-primary hover:bg-primary-hover focus:outline-none 
              focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 
              disabled:cursor-not-allowed"
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
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 