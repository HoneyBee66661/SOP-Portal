import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SOPPortal from '../sop-portal.jsx'
import AdminLogin from './AdminLogin.jsx'
import AdminPage from './AdminPage.jsx'
import QRPrintPage from './QRPrintPage.jsx'

const DEFAULT_SOP_DATA = [
  {
    id: 1,
    title: 'Receiving Procedure',
    category: 'Receiving',
    gdrivePath: '1ABC123DEF456',
    description: 'Step-by-step guide for incoming goods inspection',
  },
  {
    id: 2,
    title: 'Storage & Binning',
    category: 'Warehouse',
    gdrivePath: '2GHI789JKL012',
    description: 'Proper placement and organization of materials',
  },
  {
    id: 3,
    title: 'Picking & Packing',
    category: 'Warehouse',
    gdrivePath: '3MNO345PQR678',
    description: 'Efficient order fulfillment process',
  },
  {
    id: 4,
    title: 'Shipping Documentation',
    category: 'Shipping',
    gdrivePath: '4STU901VWX234',
    description: 'Required docs and labeling standards',
  },
  {
    id: 5,
    title: 'Inventory Audit',
    category: 'Inventory',
    gdrivePath: '5YZA567BCD890',
    description: 'Quarterly physical count procedures',
  },
  {
    id: 6,
    title: 'Safety & PPE',
    category: 'Safety',
    gdrivePath: '6EFG123HIJ456',
    description: 'Required protective equipment and protocols',
  },
]

function getSOPData() {
  const stored = localStorage.getItem('sop-portal-data')
  if (stored) {
    try { return JSON.parse(stored) } catch { /* ignore */ }
  }
  return DEFAULT_SOP_DATA
}

function saveSOPData(data) {
  localStorage.setItem('sop-portal-data', JSON.stringify(data))
}

function AdminWrapper() {
  const [authenticated, setAuthenticated] = useState(false)
  const [sopData, setSopData] = useState(getSOPData)

  const handleUpdate = (data) => {
    setSopData(data)
    saveSOPData(data)
  }

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />
  }

  return (
    <AdminPage
      data={sopData}
      onUpdate={handleUpdate}
      onLogout={() => setAuthenticated(false)}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SOPPortal />} />
        <Route path="/admin" element={<AdminWrapper />} />
        <Route path="/print/qr-codes" element={<QRPrintPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
