import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { toast } from 'react-hot-toast'

const GlobalContext = createContext({
  session: null,
  userSettings: null,
  companies: [],
  products: [],
  schemas: [],
  loading: false,
  error: null,
  fetchUserSettings: () => {},
  updateUserSettings: () => {},
  fetchCompanies: () => {},
  fetchProducts: () => {},
  fetchSchemas: () => {}
})

export function GlobalProvider({ children }) {
  const [session, setSession] = useState(null)
  const [userSettings, setUserSettings] = useState(null)
  const [companies, setCompanies] = useState([])
  const [products, setProducts] = useState([])
  const [schemas, setSchemas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Separate useEffect for data fetching
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserSettings()
      fetchCompanies()
      fetchProducts()
      fetchSchemas()
    } else {
      // Clear data when no session
      setUserSettings(null)
      setCompanies([])
      setProducts([])
      setSchemas([])
    }
  }, [session?.user?.id])

  const fetchUserSettings = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        // If settings don't exist, create them
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('user_settings')
            .insert([{ user_id: session.user.id }])
            .select()
            .single()

          if (createError) throw createError
          setUserSettings(newSettings)
        } else {
          throw error
        }
      } else {
        setUserSettings(data)
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
      toast.error('Error fetching user settings: ' + error.message)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  const updateUserSettings = async (updates) => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single()

      if (error) throw error
      setUserSettings(data)
      toast.success('Settings updated successfully')
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Error updating settings: ' + error.message)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

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
      setError(error)
    } finally {
      setLoading(false)
    }
  }

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
      console.error('Error fetching products:', error)
      toast.error('Error fetching products: ' + error.message)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchemas = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoice_schemas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      setSchemas(data || [])
    } catch (error) {
      console.error('Error fetching schemas:', error)
      toast.error('Error fetching schemas: ' + error.message)
      setError(error)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    session,
    userSettings,
    companies,
    products,
    schemas,
    loading,
    error,
    fetchUserSettings,
    updateUserSettings,
    fetchCompanies,
    fetchProducts,
    fetchSchemas
  }

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  )
}

export const useGlobal = () => {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error('useGlobal must be used within a GlobalProvider')
  }
  return context
} 