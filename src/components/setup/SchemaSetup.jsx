import { useState, useEffect } from 'react'
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa'
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

export default function SchemaSetup() {
  const { session } = useGlobal()
  const [loading, setLoading] = useState(false)
  const [schemas, setSchemas] = useState([])
  const [editingSchema, setEditingSchema] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schema: {
      fields: []
    }
  })
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    required: false
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchSchemas()
    }
  }, [session?.user?.id])

  const fetchSchemas = async () => {
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
      toast.error('Error loading schemas')
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = () => {
    if (!newField.name.trim()) {
      toast.error('Field name is required')
      return
    }

    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [...prev.schema.fields, { ...newField }]
      }
    }))

    setNewField({
      name: '',
      type: 'text',
      required: false
    })
  }

  const handleRemoveField = (index) => {
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.filter((_, i) => i !== index)
      }
    }))
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

      if (editingSchema) {
        const { error } = await supabase
          .from('invoice_schemas')
          .update(data)
          .eq('id', editingSchema.id)
          .eq('user_id', session.user.id)

        if (error) throw error
        toast.success('Schema updated successfully')
      } else {
        const { error } = await supabase
          .from('invoice_schemas')
          .insert([data])

        if (error) throw error
        toast.success('Schema created successfully')
      }

      setFormData({
        name: '',
        description: '',
        schema: {
          fields: []
        }
      })
      setEditingSchema(null)
      fetchSchemas()
    } catch (error) {
      console.error('Error saving schema:', error)
      toast.error('Error saving schema')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (schema) => {
    setEditingSchema(schema)
    setFormData({
      name: schema.name,
      description: schema.description || '',
      schema: schema.schema || { fields: [] }
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schema? This action cannot be undone.')) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('invoice_schemas')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error
      toast.success('Schema deleted successfully')
      fetchSchemas()
    } catch (error) {
      console.error('Error deleting schema:', error)
      toast.error('Error deleting schema')
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to manage invoice schemas.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
            {editingSchema ? 'Edit Schema' : 'Create Schema'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormGroup>
              <Label htmlFor="name">Schema Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </FormGroup>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Custom Fields</h4>
              
              <div className="space-y-4">
                {formData.schema.fields.map((field, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {field.type} {field.required && '(required)'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => handleRemoveField(index)}
                    >
                      <FaTrash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="space-y-4">
                  <FormGroup>
                    <Label htmlFor="fieldName">Field Name</Label>
                    <Input
                      id="fieldName"
                      value={newField.name}
                      onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                      placeholder="Enter field name"
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label htmlFor="fieldType">Field Type</Label>
                    <select
                      id="fieldType"
                      value={newField.type}
                      onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm 
                      focus:border-primary focus:ring-primary"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="url">URL</option>
                    </select>
                  </FormGroup>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="fieldRequired"
                      checked={newField.required}
                      onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 
                      text-primary focus:ring-primary dark:bg-gray-700"
                    />
                    <label 
                      htmlFor="fieldRequired" 
                      className="ml-2 block text-sm text-gray-900 dark:text-white"
                    >
                      Required field
                    </label>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddField}
                    className="w-full"
                  >
                    <FaPlus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              {editingSchema && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingSchema(null)
                    setFormData({
                      name: '',
                      description: '',
                      schema: {
                        fields: []
                      }
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
                {loading ? 'Saving...' : editingSchema ? 'Update Schema' : 'Create Schema'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoice Schemas</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your invoice schemas. Each schema defines the structure of your invoices.
            </p>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && !schemas.length ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : schemas.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                No schemas created yet. Create your first schema using the form.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {schemas.map(schema => (
                  <li 
                    key={schema.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {schema.name}
                        </h4>
                        {schema.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {schema.description}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {schema.schema.fields?.length || 0} custom fields
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(schema)}
                        >
                          <FaEdit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => handleDelete(schema.id)}
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
    </div>
  )
} 