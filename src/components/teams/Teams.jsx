import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useGlobal } from '../../context/GlobalContext'
import { toast } from 'react-hot-toast'
import { 
  FaUsers, FaPlus, FaEdit, FaTrash, FaCrown, 
  FaUser, FaFileInvoiceDollar, FaSearch 
} from 'react-icons/fa'
import { 
  Input, 
  Button, 
  FormGroup, 
  Label,
  Modal,
  Card,
  Badge
} from '../ui/FormElements'

export default function Teams() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [showNewTeamModal, setShowNewTeamModal] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', description: '' })
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [teamInvoices, setTeamInvoices] = useState([])

  useEffect(() => {
    if (session?.user?.id) {
      fetchTeams()
      fetchTeamInvoices()
    }
  }, [session?.user?.id])

  const fetchTeams = async () => {
    try {
      // Get teams where user is owner
      const { data: ownedTeams, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', session.user.id)

      if (ownedError) throw ownedError

      // Get team where user is a member
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', session.user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') throw profileError

      let memberTeam = null
      if (userProfile?.team_id) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', userProfile.team_id)
          .single()

        if (teamError) throw teamError
        memberTeam = teamData
      }

      // Combine owned teams with member team (if any)
      const allTeams = [...(ownedTeams || []), ...(memberTeam ? [memberTeam] : [])]
      const uniqueTeams = Array.from(new Map(allTeams.map(team => [team.id, team])).values())

      // Get team members (profiles) for all teams
      const { data: teamMembers, error: membersError } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          email,
          team_id
        `)
        .in('team_id', uniqueTeams.map(team => team.id))

      if (membersError) throw membersError

      // Combine the data
      const teamsWithMembers = uniqueTeams.map(team => ({
        ...team,
        members: teamMembers.filter(member => member.team_id === team.id)
      }))

      setTeams(teamsWithMembers)
    } catch (error) {
      toast.error('Error loading teams')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert([{
          name: newTeam.name,
          description: newTeam.description,
          owner_id: session.user.id
        }])
        .select()
        .single()

      if (teamError) throw teamError

      // Update owner's profile with team_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: team.id })
        .eq('id', session.user.id)

      if (profileError) throw profileError

      toast.success('Team created successfully')
      setShowNewTeamModal(false)
      setNewTeam({ name: '', description: '' })
      fetchTeams()
    } catch (error) {
      toast.error('Error creating team')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Are you sure you want to delete this team? All members will be removed from the team.')) return

    try {
      setLoading(true)
      
      // First update all member profiles to remove team_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('team_id', teamId)

      if (profileError) throw profileError

      // Then delete the team
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('owner_id', session.user.id)

      if (teamError) throw teamError

      toast.success('Team deleted successfully')
      fetchTeams()
    } catch (error) {
      toast.error('Error deleting team')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchUsers = async (e) => {
    e.preventDefault()
    if (!searchEmail.trim()) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${searchEmail}%`)
        .limit(5)

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

  const handleAddMember = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: selectedTeam.id })
        .eq('id', userId)

      if (error) throw error

      toast.success('Member added successfully')
      setShowAddMemberModal(false)
      fetchTeams()
    } catch (error) {
      toast.error('Error adding member')
      console.error('Error:', error)
    }
  }

  const handleRemoveMember = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ team_id: null })
        .eq('id', userId)

      if (error) throw error

      toast.success('Member removed successfully')
      fetchTeams()
    } catch (error) {
      toast.error('Error removing member')
      console.error('Error:', error)
    }
  }

  const getRoleIcon = (member, team) => {
    if (team.owner_id === member.id) {
      return <FaCrown className="text-yellow-500" title="Owner" />
    }
    return <FaUser className="text-gray-500 dark:text-gray-400" title="Member" />
  }

  const fetchTeamInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          companies (
            id,
            name,
            email
          ),
          teams (
            id,
            name
          )
        `)
        .not('team_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTeamInvoices(data || [])
    } catch (error) {
      console.error('Error fetching team invoices:', error)
      toast.error('Error loading team invoices')
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to manage teams.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Teams</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your teams and team members
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowNewTeamModal(true)}
        >
          <FaPlus className="h-4 w-4 mr-2" />
          New Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && !teams.length ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : teams.length === 0 ? (
          <div className="col-span-full">
            <Card className="text-center py-12">
              <FaUsers className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No teams yet
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Create your first team to start collaborating
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setShowNewTeamModal(true)}
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </Card>
          </div>
        ) : (
          teams.map(team => (
            <Card key={team.id} className="relative">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {team.name}
                    </h3>
                    {team.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {team.description}
                      </p>
                    )}
                  </div>
                  {team.owner_id === session.user.id && (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowAddMemberModal(true)
                        }}
                      >
                        <FaPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => handleDeleteTeam(team.id)}
                      >
                        <FaTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Members ({team.members?.length || 0})
                  </h4>
                  <ul className="space-y-3">
                    {team.members?.map(member => (
                      <li 
                        key={member.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          {getRoleIcon(member, team)}
                          <span className="ml-2 text-sm text-gray-900 dark:text-white">
                            {member.display_name || member.email}
                          </span>
                        </div>
                        {team.owner_id === session.user.id && member.id !== session.user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <FaTrash className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {teamInvoices.filter(invoice => invoice.team_id === team.id).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <FaFileInvoiceDollar className="h-4 w-4 mr-2" />
                      <span>
                        {teamInvoices.filter(invoice => invoice.team_id === team.id).length} Invoices
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* New Team Modal */}
      <Modal
        isOpen={showNewTeamModal}
        onClose={() => setShowNewTeamModal(false)}
        title="Create New Team"
      >
        <form onSubmit={handleCreateTeam} className="space-y-6">
          <FormGroup>
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="teamDescription">Description</Label>
            <Input
              id="teamDescription"
              value={newTeam.description}
              onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
              placeholder="Optional team description"
            />
          </FormGroup>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNewTeamModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false)
          setSearchEmail('')
          setSearchResults([])
        }}
        title="Add Team Member"
      >
        <form onSubmit={handleSearchUsers} className="space-y-6">
          <FormGroup>
            <Label htmlFor="searchEmail">Search by Email</Label>
            <div className="flex space-x-4">
              <Input
                id="searchEmail"
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter email address"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={loading}
              >
                <FaSearch className="h-4 w-4" />
              </Button>
            </div>
          </FormGroup>

          {searchResults.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Search Results
              </h4>
              <ul className="space-y-3">
                {searchResults.map(user => (
                  <li 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.display_name || user.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => handleAddMember(user.id)}
                      disabled={user.team_id === selectedTeam?.id}
                    >
                      {user.team_id === selectedTeam?.id ? 'Already Member' : 'Add'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
} 