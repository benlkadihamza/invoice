import React, { useEffect, useState } from 'react'
import {
  getTransactions,
  createTransaction,
  deleteTransaction,
  getPersons,
  getCategories,
} from '../api/client'

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [persons, setPersons] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('income')
  const [amount, setAmount] = useState<number>(0)
  const [personId, setPersonId] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterPerson, setFilterPerson] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [txRes, pRes, cRes] = await Promise.all([
        getTransactions(filterPerson ? { person_id: filterPerson } : undefined),
        getPersons(),
        getCategories(),
      ])
      setTransactions(txRes.transactions || [])
      setPersons(pRes.persons || [])
      setCategories(cRes.categories || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filterPerson])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!personId || !description || amount <= 0) {
      alert('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setSaving(true)
    try {
      await createTransaction({
        date,
        description,
        income: type === 'income' ? amount : 0,
        expense: type === 'expense' ? amount : 0,
        person_id: Number(personId),
        notes,
      })
      setShowModal(false)
      setDescription('')
      setAmount(0)
      setNotes('')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return
    try {
      await deleteTransaction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-cash-stack text-success me-2"></i>Transactions
          </h3>
          <p className="text-muted small mb-0">Gestion des recettes et dépenses quotidiennes</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <select
            className="form-select form-select-sm"
            style={{ width: '200px' }}
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
          >
            <option value="">Tous les contacts</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <i className="bi bi-plus-circle me-1"></i> Nouvelle Transaction
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Contact</th>
                <th>Revenu</th>
                <th>Dépense</th>
                <th>Notes</th>
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
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Aucune transaction trouvée.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="small text-muted">{t.date}</td>
                    <td className="fw-medium text-dark">{t.description}</td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary">
                        {t.person_name || '—'}
                      </span>
                    </td>
                    <td className="text-success fw-bold">
                      {t.income > 0 ? `+${Number(t.income).toFixed(2)} DH` : '—'}
                    </td>
                    <td className="text-danger fw-bold">
                      {t.expense > 0 ? `-${Number(t.expense).toFixed(2)} DH` : '—'}
                    </td>
                    <td className="small text-muted">{t.notes || '—'}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-link text-danger p-0 ms-2"
                        title="Supprimer"
                        onClick={() => handleDelete(t.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Nouvelle Transaction</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Type</label>
                      <select
                        className="form-select"
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                      >
                        <option value="income">Revenu (+)</option>
                        <option value="expense">Dépense (-)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Description / Catégorie</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ex: Vente marchandise, Loyer..."
                        list="categories-list"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                      <datalist id="categories-list">
                        {categories.map((c) => (
                          <option key={c.id} value={c.name} />
                        ))}
                      </datalist>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Montant (DH)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        placeholder="0.00"
                        value={amount || ''}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Contact / Personne</label>
                      <select
                        className="form-select"
                        value={personId}
                        onChange={(e) => setPersonId(e.target.value ? Number(e.target.value) : '')}
                        required
                      >
                        <option value="">Sélectionner...</option>
                        {persons.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Notes (Optionnel)</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      ></textarea>
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
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
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
