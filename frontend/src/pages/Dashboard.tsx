import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboard } from '../api/client'

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboard()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div className="mt-2 text-muted">Chargement du tableau de bord…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        Erreur: {error}
      </div>
    )
  }

  const formatPrice = (val: number | undefined) => {
    return (val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const isPositive = (stats?.net_balance || 0) >= 0

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-speedometer2 me-2 text-primary"></i>Tableau de bord
          </h3>
          <p className="text-muted small mb-0">Aperçu financier et gestion de vos factures</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/transactions" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-plus-lg me-1"></i> Transaction
          </Link>
          <Link to="/invoices" className="btn btn-primary btn-sm">
            <i className="bi bi-file-earmark-plus me-1"></i> Facture
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-4">
          <div className={`card h-100 border-start border-4 ${isPositive ? 'border-success' : 'border-danger'}`}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted small fw-medium">Solde actuel</span>
                  <h4 className={`fw-bold mb-0 mt-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                    {formatPrice(stats?.net_balance)} DH
                  </h4>
                </div>
                <div className={`p-3 rounded-circle bg-${isPositive ? 'success' : 'danger'}-subtle`}>
                  <i className={`bi bi-wallet2 fs-4 text-${isPositive ? 'success' : 'danger'}`}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card h-100 border-start border-4 border-primary">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted small fw-medium">Total Revenus</span>
                  <h4 className="fw-bold text-primary mb-0 mt-1">
                    {formatPrice(stats?.total_income)} DH
                  </h4>
                </div>
                <div className="p-3 rounded-circle bg-primary-subtle">
                  <i className="bi bi-arrow-down-left-circle fs-4 text-primary"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card h-100 border-start border-4 border-warning">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="text-muted small fw-medium">Total Dépenses</span>
                  <h4 className="fw-bold text-warning mb-0 mt-1">
                    {formatPrice(stats?.total_expense)} DH
                  </h4>
                </div>
                <div className="p-3 rounded-circle bg-warning-subtle">
                  <i className="bi bi-arrow-up-right-circle fs-4 text-warning"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small">Total Factures</span>
                <h4 className="fw-bold text-dark mb-0 mt-1">{stats?.invoice_count || 0}</h4>
              </div>
              <div className="p-3 rounded-circle bg-info-subtle">
                <i className="bi bi-receipt fs-4 text-info"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small">Clients & Contacts</span>
                <h4 className="fw-bold text-dark mb-0 mt-1">{stats?.person_count || 0}</h4>
              </div>
              <div className="p-3 rounded-circle bg-secondary-subtle">
                <i className="bi bi-people fs-4 text-secondary"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <span className="text-muted small">Paiements en attente</span>
                <h4 className="fw-bold text-danger mb-0 mt-1">{stats?.pending_payments || 0}</h4>
              </div>
              <div className="p-3 rounded-circle bg-danger-subtle">
                <i className="bi bi-clock-history fs-4 text-danger"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h6 className="fw-bold mb-0">Raccourcis & Actions rapides</h6>
        </div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-6 col-md-3">
              <Link to="/transactions" className="btn btn-light border w-100 p-3 text-start">
                <i className="bi bi-cash-stack text-success fs-5 d-block mb-1"></i>
                <div className="fw-bold text-dark">Transactions</div>
                <small className="text-muted">Gérer entrées & sorties</small>
              </Link>
            </div>
            <div className="col-6 col-md-3">
              <Link to="/invoices" className="btn btn-light border w-100 p-3 text-start">
                <i className="bi bi-file-earmark-spreadsheet text-primary fs-5 d-block mb-1"></i>
                <div className="fw-bold text-dark">Factures</div>
                <small className="text-muted">Créer et exporter PDF</small>
              </Link>
            </div>
            <div className="col-6 col-md-3">
              <Link to="/payments" className="btn btn-light border w-100 p-3 text-start">
                <i className="bi bi-credit-card text-warning fs-5 d-block mb-1"></i>
                <div className="fw-bold text-dark">Paiements</div>
                <small className="text-muted">Suivi des échéances</small>
              </Link>
            </div>
            <div className="col-6 col-md-3">
              <Link to="/stock" className="btn btn-light border w-100 p-3 text-start">
                <i className="bi bi-box-seam text-info fs-5 d-block mb-1"></i>
                <div className="fw-bold text-dark">Stock</div>
                <small className="text-muted">Gestion d'inventaire</small>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
