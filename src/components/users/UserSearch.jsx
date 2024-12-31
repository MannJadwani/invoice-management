import { useState } from 'react'
import { supabase } from '../../supabase'
import { toast } from 'react-hot-toast'
import { FaSearch, FaUser, FaEnvelope, FaClock, FaPhone } from 'react-icons/fa'

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) throw error
      setSearchResults(data || [])
      
      if (data.length === 0) {
        toast.info('No users found')
      }
    } catch (error) {
      toast.error('Error searching users')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">User Search</h2>
        </div>

        <div className="p-6">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Search by name or email"
              />
              <div className="absolute inset-y-0 right-0 pr-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {searchResults.map(user => (
              <div
                key={user.id}
                className="bg-gray-50 rounded-lg p-4 flex items-start space-x-4"
              >
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <FaUser className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {user.display_name || 'No display name'}
                  </p>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <FaEnvelope className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <span>{user.email}</span>
                  </div>
                  {user.phone_number && (
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <FaPhone className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <span>{user.phone_number}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <FaClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {searchResults.length === 0 && !loading && searchTerm && (
              <div className="text-center py-4 text-gray-500">
                No users found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 