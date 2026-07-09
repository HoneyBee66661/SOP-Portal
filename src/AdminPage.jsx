import { useState, useEffect } from 'react'
import QRCode from 'qrcode.react'
import { Plus, Edit3, Trash2, Copy, Check, LogOut, X } from 'lucide-react'

const EMPTY_FORM = { title: '', category: '', gdrivePath: '', description: '' }

export default function AdminPage({ data, onUpdate, onLogout }) {
  const [sops, setSops] = useState(data)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteId, setDeleteId] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setSops(data) }, [data])

  const handleSave = () => {
    if (!form.title || !form.gdrivePath) return
    let updated
    if (editing) {
      updated = sops.map(s => s.id === editing.id ? { ...form, id: editing.id } : s)
    } else {
      const maxId = sops.reduce((max, s) => Math.max(max, s.id), 0)
      updated = [...sops, { ...form, id: maxId + 1 }]
    }
    setSops(updated)
    onUpdate(updated)
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
  }

  const handleEdit = (sop) => {
    setForm({ title: sop.title, category: sop.category, gdrivePath: sop.gdrivePath, description: sop.description })
    setEditing(sop)
    setShowForm(true)
  }

  const handleDelete = () => {
    const updated = sops.filter(s => s.id !== deleteId)
    setSops(updated)
    onUpdate(updated)
    setDeleteId(null)
  }

  const handleCancel = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(false)
  }

  const handleExport = () => {
    const json = JSON.stringify(sops, null, 2)
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getQRValue = (gdrivePath) => `https://drive.google.com/file/d/${gdrivePath}/view`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pt-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-gray-600 text-sm">Manage SOP entries and their QR codes</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Export JSON'}
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              View Portal
            </a>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition mb-6"
        >
          <Plus size={20} />
          Add New SOP
        </button>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-bold text-lg text-gray-800">
                  {editing ? 'Edit SOP' : 'Add New SOP'}
                </h2>
                <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded-lg transition">
                  <X size={24} className="text-gray-600" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Safety Protocol"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Safety"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Drive File ID
                  </label>
                  <input
                    type="text"
                    value={form.gdrivePath}
                    onChange={(e) => setForm({ ...form, gdrivePath: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none font-mono text-sm"
                    placeholder="e.g. 1ABC123DEF456"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    From URL: https://drive.google.com/file/d/<strong>FILE_ID</strong>/view
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    rows={2}
                    placeholder="Brief description of this SOP"
                  />
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition"
                >
                  {editing ? 'Save Changes' : 'Add SOP'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
              <h2 className="font-bold text-lg text-gray-800 mb-2">Delete SOP?</h2>
              <p className="text-gray-600 mb-6">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SOP Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">File ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">QR Code</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sops.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-500">
                      No SOPs yet. Click "Add New SOP" to get started.
                    </td>
                  </tr>
                ) : (
                  sops.map(sop => (
                    <tr key={sop.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{sop.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{sop.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {sop.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {sop.gdrivePath.length > 20
                            ? sop.gdrivePath.slice(0, 20) + '...'
                            : sop.gdrivePath}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <QRCode value={getQRValue(sop.gdrivePath)} size={40} level="H" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleEdit(sop)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteId(sop.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats footer */}
        <div className="mt-4 text-sm text-gray-500 text-center">
          {sops.length} SOP{sops.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </div>
  )
}
