import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaLock } from 'react-icons/fa'
import { supabase } from '../../supabase'
import { toast } from 'react-hot-toast'
import { useGlobal } from '../../context/GlobalContext'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'checkbox', label: 'Checkbox' }
]

const DEFAULT_SCHEMA = {
  fields: [
    { name: 'invoice_number', label: 'Invoice Number', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'due_date', label: 'Due Date', type: 'date', required: true },
    { name: 'client_name', label: 'Client Name', type: 'text', required: true },
    { name: 'client_address', label: 'Client Address', type: 'textarea', required: true },
    { name: 'subtotal', label: 'Subtotal', type: 'number', required: true },
    { name: 'tax_rate', label: 'Tax Rate (%)', type: 'number', required: false },
    { name: 'tax_amount', label: 'Tax Amount', type: 'number', required: false },
    { name: 'total', label: 'Total Amount', type: 'number', required: true },
    { name: 'notes', label: 'Notes', type: 'textarea', required: false }
  ],
  required_fields: [
    {
      name: 'payment_status',
      type: 'select',
      label: 'Payment Status',
      required: true,
      options: ['paid', 'unpaid']
    },
    {
      name: 'scanned_copy',
      type: 'file',
      label: 'Scanned Copy',
      required: true,
      accept: '.pdf,.jpg,.jpeg,.png'
    }
  ]
}

export default function SchemaSetup() {
  const { session } = useGlobal()
  const [schemas, setSchemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [currentSchema, setCurrentSchema] = useState({
    name: '',
    is_default: false,
    schema: {
      fields: [],
      required_fields: [
        {
          name: 'payment_status',
          type: 'select',
          label: 'Payment Status',
          required: true,
          options: ['paid', 'unpaid']
        },
        {
          name: 'scanned_copy',
          type: 'file',
          label: 'Scanned Copy',
          required: true,
          accept: '.pdf,.jpg,.jpeg,.png'
        }
      ]
    },
    user_id: null
  })

  useEffect(() => {
    if (session?.user?.id) {
      setCurrentSchema(prev => ({ ...prev, user_id: session.user.id }))
      fetchSchemas()
    }
  }, [session?.user?.id])

  const fetchSchemas = async () => {
    if (!session?.user?.id) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('invoice_schemas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at')
      
      if (error) throw error
      setSchemas(data || [])
    } catch (error) {
      console.error('Error fetching schemas:', error)
      toast.error('Error fetching schemas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) {
      toast.error('You must be logged in to create a schema')
      return
    }

    try {
      setLoading(true)
      const schemaData = {
        ...currentSchema,
        user_id: session.user.id,
        schema: {
          fields: currentSchema.schema.fields.map(field => ({
            ...field,
            name: field.name || field.label.toLowerCase().replace(/[^a-z0-9]/g, '_')
          })),
          required_fields: currentSchema.schema.required_fields
        }
      }

      if (isEditing) {
        const { error } = await supabase
          .from('invoice_schemas')
          .update(schemaData)
          .eq('id', currentSchema.id)
          .eq('user_id', session.user.id)

        if (error) throw error
        toast.success('Schema updated successfully')
      } else {
        const { error } = await supabase
          .from('invoice_schemas')
          .insert([schemaData])

        if (error) throw error
        toast.success('Schema created successfully')
      }

      setCurrentSchema({
        name: '',
        is_default: false,
        schema: {
          fields: [],
          required_fields: [
            {
              name: 'payment_status',
              type: 'select',
              label: 'Payment Status',
              required: true,
              options: ['paid', 'unpaid']
            },
            {
              name: 'scanned_copy',
              type: 'file',
              label: 'Scanned Copy',
              required: true,
              accept: '.pdf,.jpg,.jpeg,.png'
            }
          ]
        },
        user_id: session.user.id
      })
      setIsEditing(false)
      fetchSchemas()
    } catch (error) {
      console.error('Error saving schema:', error)
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddField = () => {
    setCurrentSchema(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [
          ...prev.schema.fields,
          {
            name: '',
            type: 'text',
            label: '',
            required: false
          }
        ]
      }
    }))
  }

  const handleFieldChange = (index, field) => {
    setCurrentSchema(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.map((f, i) => {
          if (i === index) {
            const safeName = field.name || field.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
            return {
              ...field,
              name: safeName
            };
          }
          return f;
        })
      }
    }));
  }

  const handleRemoveField = (index) => {
    setCurrentSchema(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.filter((_, i) => i !== index)
      }
    }))
  }

  const handleUseDefaultSchema = () => {
    setCurrentSchema(prev => ({
      ...prev,
      name: prev.name || 'Default Invoice Schema',
      schema: {
        fields: [...DEFAULT_SCHEMA.fields],
        required_fields: [...DEFAULT_SCHEMA.required_fields]
      }
    }))
    toast.success('Default schema template applied')
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to manage invoice schemas.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">
              {isEditing ? 'Edit Schema' : 'Create New Schema'}
            </h2>
            <button
              type="button"
              onClick={handleUseDefaultSchema}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm 
              font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Use Default Template
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Schema Name</label>
              <input
                type="text"
                value={currentSchema.name}
                onChange={(e) => setCurrentSchema({ ...currentSchema, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary 
                focus:ring-primary sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Required Fields</label>
              <div className="space-y-3">
                {currentSchema.schema.required_fields.map((field, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-md">
                    <FaLock className="text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-gray-500">{field.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Fields</label>
              <div className="space-y-3">
                {currentSchema.schema.fields.map((field, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(index, { ...field, label: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary 
                          focus:ring-primary sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, { ...field, type: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary 
                          focus:ring-primary sm:text-sm"
                        >
                          {FIELD_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(index, { ...field, required: e.target.checked })}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="ml-2 text-sm text-gray-600">Required</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveField(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddField}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 
                  shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FaPlus className="mr-2" /> Add Field
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSchema({
                      name: '',
                      is_default: false,
                      schema: {
                        fields: [],
                        required_fields: currentSchema.schema.required_fields
                      },
                      user_id: session?.user?.id
                    })
                    setIsEditing(false)
                  }}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 
                  bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
                text-white bg-primary hover:bg-primary-hover"
              >
                {isEditing ? 'Update Schema' : 'Create Schema'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-medium">Invoice Schemas</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your invoice schemas. Each schema defines the structure of your invoices.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {schemas.length === 0 ? (
                <li className="p-6 text-center text-gray-500">
                  No schemas created yet. Create your first schema using the form.
                </li>
              ) : (
                schemas.map(schema => (
                  <li key={schema.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">{schema.name}</h3>
                        <p className="text-sm text-gray-500">
                          {schema.schema.fields?.length || 0} custom fields
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setCurrentSchema(schema)
                            setIsEditing(true)
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <FaEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('invoice_schemas')
                                .delete()
                                .eq('id', schema.id)
                              if (error) throw error
                              toast.success('Schema deleted successfully')
                              fetchSchemas()
                            } catch (error) {
                              toast.error(error.message)
                            }
                          }}
                          className="text-gray-400 hover:text-danger"
                        >
                          <FaTrash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 