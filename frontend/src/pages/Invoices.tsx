import React, { useEffect, useState } from 'react'
import {
  getInvoices,
  createInvoice,
  deleteInvoice,
  downloadInvoicePdf,
} from '../api/client'

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Invoice creation form state
  const [invoiceNum, setInvoiceNum] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [remise, setRemise] = useState(0)
  const [payer, setPayer] = useState(0)
  const [showFactureNum, setShowFactureNum] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ])
  const [saving, setSaving] = useState(false)

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const res = await getInvoices()
      setInvoices(res.invoices || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (idx: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  // Calculate totals
  const subTotal = items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unit_price || 0), 0)
  const netTotal = Math.max(0, subTotal - (remise || 0))
  const reste = Math.max(0, netTotal - (payer || 0))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) {
      alert('Veuillez entrer le nom du client.')
      return
    }
    setSaving(true)
    try {
      await createInvoice({
        invoice_num: invoiceNum,
        date,
        client_name: clientName,
        client_address: clientAddress,
        total: subTotal,
        remise,
        payer,
        net_total: netTotal,
        items,
        show_facture_num: showFactureNum,
      })
      setShowModal(false)
      // reset
      setClientName('')
      setClientAddress('')
      setInvoiceNum('')
      setRemise(0)
      setPayer(0)
      setItems([{ description: '', quantity: 1, unit_price: 0 }])
      loadInvoices()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création de la facture')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette facture ?')) return
    try {
      await deleteInvoice(id)
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-file-earmark-spreadsheet text-primary me-2"></i>Factures
          </h3>
          <p className="text-muted small mb-0">Création, gestion et impression des factures PDF</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Créer une Facture
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>N°</th>
                <th>Date</th>
                <th>Client</th>
                <th>Montant Net</th>
                <th>Payé</th>
                <th>Statut</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Chargement...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Aucune facture enregistrée.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isPaid = Number(inv.payer) >= Number(inv.net_total)
                  return (
                    <tr key={inv.id}>
                      <td className="fw-semibold text-muted">
                        {inv.invoice_num || `#${inv.id}`}
                      </td>
                      <td className="small text-muted">{inv.date}</td>
                      <td className="fw-medium text-dark">{inv.client_name}</td>
                      <td className="fw-bold">{Number(inv.net_total).toFixed(2)} DH</td>
                      <td className="small text-muted">{Number(inv.payer).toFixed(2)} DH</td>
                      <td>
                        <span
                          className={`badge ${
                            isPaid ? 'bg-success' : 'bg-warning text-dark'
                          }`}
                        >
                          {isPaid ? 'Payée' : 'En attente'}
                        </span>
                      </td>
                      <td className="text-end">
                        <a
                          href={downloadInvoicePdf(inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-danger btn-sm py-1 px-2 me-2"
                          title="Télécharger PDF"
                        >
                          <i className="bi bi-file-earmark-pdf me-1"></i> PDF
                        </a>
                        <button
                          className="btn btn-link text-danger p-0"
                          title="Supprimer"
                          onClick={() => handleDelete(inv.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {showModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Créer une nouvelle facture</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">N° Facture</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ex: 2026/001"
                        value={invoiceNum}
                        onChange={(e) => setInvoiceNum(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4 d-flex align-items-end">
                      <div className="form-check mb-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="showNum"
                          checked={showFactureNum}
                          onChange={(e) => setShowFactureNum(e.target.checked)}
                        />
                        <label className="form-check-label small" htmlFor="showNum">
                          Afficher N° sur PDF
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Client</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Nom du client"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Adresse du client</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Ville, rue..."
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className="fw-bold mb-2">Articles & Prestations</h6>
                  <div className="table-responsive mb-3">
                    <table className="table table-bordered table-sm align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Description</th>
                          <th style={{ width: '100px' }}>Quantité</th>
                          <th style={{ width: '120px' }}>Prix Unitaire</th>
                          <th style={{ width: '120px' }}>Total</th>
                          <th style={{ width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Article ou prestation"
                                value={it.description}
                                onChange={(e) =>
                                  updateItem(idx, 'description', e.target.value)
                                }
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm"
                                value={it.quantity}
                                onChange={(e) =>
                                  updateItem(idx, 'quantity', parseInt(e.target.value) || 0)
                                }
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-control form-control-sm"
                                value={it.unit_price}
                                onChange={(e) =>
                                  updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)
                                }
                                required
                              />
                            </td>
                            <td className="text-end fw-semibold">
                              {((it.quantity || 0) * (it.unit_price || 0)).toFixed(2)} DH
                            </td>
                            <td className="text-center">
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0"
                                  onClick={() => removeItem(idx)}
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm mb-4"
                    onClick={addItem}
                  >
                    <i className="bi bi-plus-circle me-1"></i> Ajouter une ligne
                  </button>

                  <div className="row g-2 justify-content-end">
                    <div className="col-12 col-md-5">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="small text-muted">Sous-total:</span>
                        <span className="fw-semibold">{subTotal.toFixed(2)} DH</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small text-muted">Remise:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-sm"
                          style={{ width: '120px' }}
                          value={remise}
                          onChange={(e) => setRemise(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="d-flex justify-content-between mb-2 border-top pt-2">
                        <span className="fw-bold">Net à payer:</span>
                        <span className="fw-bold text-primary fs-5">
                          {netTotal.toFixed(2)} DH
                        </span>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="small text-muted">Montant Payé:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-sm"
                          style={{ width: '120px' }}
                          value={payer}
                          onChange={(e) => setPayer(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="d-flex justify-content-between border-top pt-2">
                        <span className="small text-muted">Reste à payer:</span>
                        <span className="fw-bold text-danger">{reste.toFixed(2)} DH</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Génération...' : 'Créer la Facture'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
