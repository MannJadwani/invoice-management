import { useState } from 'react'
import { FaBuilding, FaBox, FaFileInvoice, FaCog } from 'react-icons/fa'
import CompanySetup from './setup/CompanySetup'
import ProductSetup from './setup/ProductSetup'
import SchemaSetup from './setup/SchemaSetup'
import DefaultSettings from './setup/DefaultSettings'

export default function Setup() {
  const [activeTab, setActiveTab] = useState('companies')

  const tabs = [
    { id: 'companies', label: 'Companies', icon: <FaBuilding />, component: <CompanySetup /> },
    { id: 'products', label: 'Products', icon: <FaBox />, component: <ProductSetup /> },
    { id: 'schemas', label: 'Invoice Schemas', icon: <FaFileInvoice />, component: <SchemaSetup /> },
    { id: 'settings', label: 'Default Settings', icon: <FaCog />, component: <DefaultSettings /> },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Setup & Configuration</h1>
        <p className="text-gray-500">Configure your companies, products, and invoice settings.</p>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className={`
                mr-2 ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
              `}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="mt-8">
        {tabs.find(tab => tab.id === activeTab)?.component}
      </div>
    </div>
  )
} 