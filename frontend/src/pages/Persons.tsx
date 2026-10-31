import React, { useEffect, useState } from 'react'
import { getPersons, createPerson, deletePerson } from '../api/client'

export default function Persons() {
  const [persons, setPersons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const loadPersons = async () => {
    setLoading(true)
    try {
      const res = await getPersons()
      setPersons(res.persons || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPersons()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createPerson({ name, phone, email, notes })
      setName('')
      setPhone('')
      setEmail('')
      setNotes('')
      setShowModal(false)
      loadPersons()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce contact et toutes ses associations ?')) return
    try {
      await deletePerson(id)
      setPersons((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-people text-primary me-2"></i>Contacts & Clients
          </h3>
          <p className="text-muted small mb-0">Répertoire des personnes et suivi de leurs soldes</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-person-plus me-1"></i> Nouveau Contact
        </button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Total Revenu</th>
                <th>Total Dépense</th>
                <th>Solde</th>
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
              ) : persons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    Aucun contact trouvé.
                  </td>
                </tr>
              ) : (
                persons.map((p) => {
                  const balance = (Number(p.total_income) || 0) - (Number(p.total_expense) || 0)
                  return (
                    <tr key={p.id}>
                      <td className="fw-semibold text-dark">{p.name}</td>
                      <td className="small text-muted">{p.phone || '—'}</td>
                      <td className="small text-muted">{p.email || '—'}</td>
                      <td className="text-success small fw-medium">
                        {Number(p.total_income || 0).toFixed(2)} DH
                      </td>
                      <td className="text-danger small fw-medium">
                        {Number(p.total_expense || 0).toFixed(2)} DH
                      </td>
                      <td
                        className={`fw-bold small ${
                          balance >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {balance.toFixed(2)} DH
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-link text-danger p-0"
                          title="Supprimer"
                          onClick={() => handleDelete(p.id)}
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

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Nouveau Contact</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nom complet</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Ahmed Bennani"
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Téléphone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="06..."
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Remarques</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
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
                    {saving ? 'Enregistrement...' : 'Ajouter'}
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
