import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DocumentPortal from '../document-portal.jsx'
import AdminLogin from './AdminLogin.jsx'
import AdminPage from './AdminPage.jsx'
import QRPrintPage from './QRPrintPage.jsx'
import { clearAdminToken } from './lib.js'

function AdminWrapper() {
  const [authenticated, setAuthenticated] = useState(false)

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />
  }

  return <AdminPage onLogout={() => { clearAdminToken(); setAuthenticated(false) }} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DocumentPortal />} />
        <Route path="/admin" element={<AdminWrapper />} />
        <Route path="/print/qr-codes" element={<QRPrintPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
