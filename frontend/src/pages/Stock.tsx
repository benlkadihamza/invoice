import React, { useEffect, useState } from 'react'
import { getProducts, adjustStock, deleteProduct } from '../api/client'

export default function Stock() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState<any | null>(null)

  // Add Product form state
  const [title, setTitle] = useState('')
  const [initialStock, setInitialStock] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  // Adjust stock form state
  const [changeType, setChangeType] = useState<'add' | 'remove'>('add')
  const [quantity, setQuantity] = useState(1)

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await getProducts()
      setProducts(res.products || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('stock_quantity', String(initialStock))
      if (photoFile) {
        formData.append('photo', photoFile)
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) throw new Error('Erreur lors de la création')

      setShowAddModal(false)
      setTitle('')
      setInitialStock(0)
      setPhotoFile(null)
      loadProducts()
    } catch (err: any) {
      alert(err.message || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingProduct || quantity <= 0) return
    setSaving(true)
    try {
      await adjustStock(adjustingProduct.id, changeType, quantity)
      setAdjustingProduct(null)
      setQuantity(1)
      loadProducts()
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’ajustement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet article ?')) return
    try {
      await deleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erreur')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-box-seam text-info me-2"></i>Gestion de Stock
          </h3>
          <p className="text-muted small mb-0">Inventaire des produits, entrées et sorties de marchandise</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> Nouveau Produit
        </button>
      </div>

      <div className="row g-3">
        {loading ? (
          <div className="col-12 text-center py-5 text-muted">Chargement...</div>
        ) : products.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">Aucun article dans l'inventaire.</div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="col-12 col-sm-6 col-md-4 col-xl-3">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="fw-bold text-dark mb-0">{p.title}</h6>
                    <button
                      className="btn btn-link text-danger p-0"
                      onClick={() => handleDelete(p.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <small className="text-muted d-block">Quantité en stock</small>
                      <span
                        className={`fs-4 fw-bold ${
                          p.stock_quantity > 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {p.stock_quantity}
                      </span>
                    </div>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setAdjustingProduct(p)}
                    >
                      <i className="bi bi-arrow-left-right me-1"></i> Ajuster
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Ajouter un Produit</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddProduct}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Titre / Désignation</label>
                    <input
                      type="text"
                      className="form-control"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Quantité Initiale</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={initialStock}
                      onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Photo (Optionnel)</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowAddModal(false)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Ajout...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingProduct && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  Ajuster le stock: {adjustingProduct.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAdjustingProduct(null)}
                ></button>
              </div>
              <form onSubmit={handleAdjustStock}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Opération</label>
                    <select
                      className="form-select"
                      value={changeType}
                      onChange={(e) => setChangeType(e.target.value as any)}
                    >
                      <option value="add">Entrée (+) Ajouter au stock</option>
                      <option value="remove">Sortie (-) Retirer du stock</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                  <div className="small text-muted">
                    Stock actuel: <strong>{adjustingProduct.stock_quantity}</strong> → Nouveau stock:{' '}
                    <strong>
                      {changeType === 'add'
                        ? adjustingProduct.stock_quantity + quantity
                        : Math.max(0, adjustingProduct.stock_quantity - quantity)}
                    </strong>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setAdjustingProduct(null)}
                  >
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Validation...' : 'Valider'}
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
