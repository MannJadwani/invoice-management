import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { 
  Label, 
  FormGroup, 
  Button,
  Select
} from '../ui/FormElements'

export default function DefaultSettings() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState([])
  const [products, setProducts] = useState([])
  const [schemas, setSchemas] = useState([])
  const [settings, setSettings] = useState({
    default_company_id: '',
    default_schema_id: '',
    default_products: []
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchCompanies()
      fetchProducts()
      fetchSchemas()
      fetchSettings()
    }
  }, [session?.user?.id])

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

  const fetchSchemas = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_schemas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setSchemas(data || [])
    } catch (error) {
      console.error('Error fetching schemas:', error)
      toast.error('Error loading schemas')
    }
  }

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, use defaults
          return
        }
        throw error
      }

      setSettings({
        default_company_id: data.default_company_id || '',
        default_schema_id: data.default_schema_id || '',
        default_products: data.default_products || []
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Error loading settings')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      const settingsData = {
        ...settings,
        user_id: session.user.id
      }

      if (existingSettings) {
        const { error } = await supabase
          .from('user_settings')
          .update(settingsData)
          .eq('user_id', session.user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert([settingsData])

        if (error) throw error
      }

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error saving settings')
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to manage settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Default Settings
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormGroup>
            <Label htmlFor="default_company">Default Company</Label>
            <Select
              id="default_company"
              value={settings.default_company_id}
              onChange={(e) => setSettings({ ...settings, default_company_id: e.target.value })}
            >
              <option value="">Select a default company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This company will be pre-selected when creating new invoices.
            </p>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="default_schema">Default Invoice Schema</Label>
            <Select
              id="default_schema"
              value={settings.default_schema_id}
              onChange={(e) => setSettings({ ...settings, default_schema_id: e.target.value })}
            >
              <option value="">Select a default schema</option>
              {schemas.map((schema) => (
                <option key={schema.id} value={schema.id}>
                  {schema.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This schema will be used as the default template for new invoices.
            </p>
          </FormGroup>

          <FormGroup>
            <Label>Default Products</Label>
            <div className="mt-2 space-y-2">
              {products.map((product) => (
                <label 
                  key={product.id} 
                  className="flex items-center"
                >
                  <input
                    type="checkbox"
                    checked={settings.default_products?.includes(product.id)}
                    onChange={(e) => {
                      const newProducts = e.target.checked
                        ? [...(settings.default_products || []), product.id]
                        : (settings.default_products || []).filter(id => id !== product.id)
                      setSettings({ ...settings, default_products: newProducts })
                    }}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 
                    text-primary focus:ring-primary dark:bg-gray-700"
                  />
                  <span className="ml-2 text-sm text-gray-900 dark:text-white">
                    {product.name}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              These products will be pre-selected when creating new invoices.
            </p>
          </FormGroup>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 