import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { FaUser, FaSave } from 'react-icons/fa'

export default function ProfileEdit() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    avatar_url: ''
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile()
    }
  }, [session?.user?.id])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || session.user.email,
          avatar_url: data.avatar_url || ''
        })
      }
    } catch (error) {
      toast.error('Error loading profile')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Error updating profile')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to edit your profile.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Enter your display name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              Email address cannot be changed
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <FaSave />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 