import React, { useEffect, useState } from 'react'
import {
  getSettings,
  updateSettings,
  changePassword,
  getCategories,
  createCategory,
  deleteCategory,
} from '../api/client'

export default function Settings() {
  // Preferences
  const [showDecimals, setShowDecimals] = useState(false)
  const [showDailyTotals, setShowDailyTotals] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Password change
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [passMsg, setPassMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [savingPass, setSavingPass] = useState(false)

  // Categories
  const [categories, setCategories] = useState<any[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const loadAll = async () => {
    try {
      const [sRes, cRes] = await Promise.all([getSettings(), getCategories()])
      if (sRes.settings) {
        setShowDecimals(!!sRes.settings.show_decimals)
        setShowDailyTotals(!!sRes.settings.show_daily_totals)
      }
      setCategories(cRes.categories || [])
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPrefs(true)
    try {
      await updateSettings({
        show_decimals: showDecimals,
        show_daily_totals: showDailyTotals,
      })
      alert('Préférences mises à jour avec succès.')
    } catch (err: any) {
      alert(err.message || 'Erreur')
    } finally {
      setSavingPrefs(false)
    }
  }

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPass(true)
    setPassMsg(null)
    try {
      await changePassword(curPass, newPass)
      setPassMsg({ text: 'Mot de passe modifié avec succès.', ok: true })
      setCurPass('')
      setNewPass('')
    } catch (err: any) {
      setPassMsg({ text: err.message || 'Erreur lors du changement', ok: false })
    } finally {
      setSavingPass(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      await createCategory({ name: newCatName.trim() })
      setNewCatName('')
      const cRes = await getCategories()
      setCategories(cRes.categories || [])
    } catch (err: any) {
      alert(err.message || 'Erreur')
    } finally {
      setSavingCat(false)
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    try {
      await deleteCategory(id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erreur')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-gear text-secondary me-2"></i>Paramètres
          </h3>
          <p className="text-muted small mb-0">Sécurité, préférences d'affichage et catégories</p>
        </div>
      </div>

      <div className="row g-4">
        {/* Preferences */}
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-sliders me-2 text-primary"></i>Préférences d'affichage
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleSavePrefs}>
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showDec"
                    checked={showDecimals}
                    onChange={(e) => setShowDecimals(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="showDec">
                    Afficher les décimales dans les montants
                  </label>
                </div>
                <div className="form-check form-switch mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="showDaily"
                    checked={showDailyTotals}
                    onChange={(e) => setShowDailyTotals(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="showDaily">
                    Afficher les totaux quotidiens groupés
                  </label>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingPrefs}>
                  {savingPrefs ? 'Enregistrement...' : 'Enregistrer les préférences'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-shield-lock me-2 text-danger"></i>Sécurité du compte
              </h6>
            </div>
            <div className="card-body">
              {passMsg && (
                <div
                  className={`alert ${
                    passMsg.ok ? 'alert-success' : 'alert-danger'
                  } py-2 small`}
                >
                  {passMsg.text}
                </div>
              )}
              <form onSubmit={handleChangePass}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Mot de passe actuel</label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    value={curPass}
                    onChange={(e) => setCurPass(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nouveau mot de passe</label>
                  <input
                    type="password"
                    className="form-control form-control-sm"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-danger btn-sm" disabled={savingPass}>
                  {savingPass ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-tags me-2 text-warning"></i>Gestion des Catégories de Transaction
              </h6>
            </div>
            <div className="card-body">
              <form onSubmit={handleAddCategory} className="row g-2 mb-4" style={{ maxWidth: '450px' }}>
                <div className="col">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Nouvelle catégorie (ex: Carburant)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                  />
                </div>
                <div className="col-auto">
                  <button type="submit" className="btn btn-success btn-sm" disabled={savingCat}>
                    <i className="bi bi-plus-lg me-1"></i> Ajouter
                  </button>
                </div>
              </form>

              <div className="d-flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c.id}
                    className="badge bg-light text-dark border p-2 d-flex align-items-center gap-2"
                  >
                    <span>{c.name}</span>
                    <button
                      type="button"
                      className="btn-close"
                      style={{ fontSize: '0.65rem' }}
                      onClick={() => handleDeleteCategory(c.id)}
                    ></button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
