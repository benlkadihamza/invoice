import React, { useEffect, useState } from 'react'
import { getPayments, updatePayment } from '../api/client'

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  // Payment installment editing state
  const [p1, setP1] = useState(0)
  const [d1, setD1] = useState('')
  const [n1, setN1] = useState('')

  const [p2, setP2] = useState(0)
  const [d2, setD2] = useState('')
  const [n2, setN2] = useState('')

  const [p3, setP3] = useState(0)
  const [d3, setD3] = useState('')
  const [n3, setN3] = useState('')

  const [p4, setP4] = useState(0)
  const [d4, setD4] = useState('')
  const [n4, setN4] = useState('')

  const loadPayments = async () => {
    setLoading(true)
    try {
      const res = await getPayments()
      setPayments(res.payments || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const openEdit = (p: any) => {
    setSelectedPayment(p)
    setP1(Number(p.payment1_amount) || 0)
    setD1(p.payment1_date || '')
    setN1(p.payment1_notes || '')

    setP2(Number(p.payment2_amount) || 0)
    setD2(p.payment2_date || '')
    setN2(p.payment2_notes || '')

    setP3(Number(p.payment3_amount) || 0)
    setD3(p.payment3_date || '')
    setN3(p.payment3_notes || '')

    setP4(Number(p.payment4_amount) || 0)
    setD4(p.payment4_date || '')
    setN4(p.payment4_notes || '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return
    setSaving(true)
    try {
      await updatePayment(selectedPayment.id, {
        payment1_amount: p1,
        payment1_date: d1,
        payment1_notes: n1,
        payment2_amount: p2,
        payment2_date: d2,
        payment2_notes: n2,
        payment3_amount: p3,
        payment3_date: d3,
        payment3_notes: n3,
        payment4_amount: p4,
        payment4_date: d4,
        payment4_notes: n4,
      })
      setSelectedPayment(null)
      loadPayments()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-credit-card text-warning me-2"></i>Suivi des Paiements
          </h3>
          <p className="text-muted small mb-0">Gestion des règlements échelonnés et créances clients</p>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Facture</th>
                <th>Client</th>
                <th>Total Facture</th>
                <th>Total Payé</th>
                <th>Reste à Payer</th>
                <th>Statut</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Chargement...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Aucun paiement enregistré.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const totalPaid =
                    (Number(p.payment1_amount) || 0) +
                    (Number(p.payment2_amount) || 0) +
                    (Number(p.payment3_amount) || 0) +
                    (Number(p.payment4_amount) || 0)
                  const remaining = Number(p.remaining_amount) || 0
                  return (
                    <tr key={p.id}>
                      <td className="fw-semibold text-muted">
                        {p.invoice_number || `#${p.invoice_id}`}
                      </td>
                      <td className="fw-medium text-dark">
                        {p.customer_name || p.client_name || '—'}
                      </td>
                      <td className="fw-medium">
                        {Number(p.invoice_total || 0).toFixed(2)} DH
                      </td>
                      <td className="text-success fw-bold">
                        {totalPaid.toFixed(2)} DH
                      </td>
                      <td
                        className={`fw-bold ${
                          remaining > 0 ? 'text-danger' : 'text-muted'
                        }`}
                      >
                        {remaining.toFixed(2)} DH
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === 'Paid'
                              ? 'bg-success'
                              : p.status === 'Partial'
                              ? 'bg-info text-dark'
                              : 'bg-warning text-dark'
                          }`}
                        >
                          {p.status === 'Paid'
                            ? 'Payé'
                            : p.status === 'Partial'
                            ? 'Partiel'
                            : 'En attente'}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-outline-primary btn-sm py-1 px-2"
                          onClick={() => openEdit(p)}
                        >
                          <i className="bi bi-pencil-square me-1"></i> Régler
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

      {/* Edit Payment Modal */}
      {selectedPayment && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Règlements - {selectedPayment.customer_name || 'Client'} (Facture{' '}
                  {selectedPayment.invoice_number})
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedPayment(null)}
                ></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="alert alert-info py-2 small mb-3">
                    Total Facture:{' '}
                    <strong>{Number(selectedPayment.invoice_total).toFixed(2)} DH</strong>
                  </div>

                  {/* Tranche 1 */}
                  <h6 className="fw-bold mb-2">Tranche 1</h6>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        placeholder="Montant (DH)"
                        value={p1}
                        onChange={(e) => setP1(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={d1}
                        onChange={(e) => setD1(e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Note / Réf"
                        value={n1}
                        onChange={(e) => setN1(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tranche 2 */}
                  <h6 className="fw-bold mb-2">Tranche 2</h6>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        placeholder="Montant (DH)"
                        value={p2}
                        onChange={(e) => setP2(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={d2}
                        onChange={(e) => setD2(e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Note / Réf"
                        value={n2}
                        onChange={(e) => setN2(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tranche 3 */}
                  <h6 className="fw-bold mb-2">Tranche 3</h6>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        placeholder="Montant (DH)"
                        value={p3}
                        onChange={(e) => setP3(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={d3}
                        onChange={(e) => setD3(e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Note / Réf"
                        value={n3}
                        onChange={(e) => setN3(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tranche 4 */}
                  <h6 className="fw-bold mb-2">Tranche 4</h6>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        placeholder="Montant (DH)"
                        value={p4}
                        onChange={(e) => setP4(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={d4}
                        onChange={(e) => setD4(e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Note / Réf"
                        value={n4}
                        onChange={(e) => setN4(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setSelectedPayment(null)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Mettre à jour'}
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
