import React, { useState } from 'react'
import {
  getReportDaily,
  getReportMonthly,
  getReportYearly,
  monthlyBackupUrl,
} from '../api/client'

export default function Reports() {
  const [tab, setTab] = useState<'daily' | 'monthly' | 'yearly'>('daily')

  // Daily state
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10))
  const [dailyData, setDailyData] = useState<any | null>(null)
  const [loadingDaily, setLoadingDaily] = useState(false)

  // Monthly state
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [monthlyData, setMonthlyData] = useState<any | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Yearly state
  const [yearlyYear, setYearlyYear] = useState(String(new Date().getFullYear()))
  const [yearlyData, setYearlyData] = useState<any | null>(null)
  const [loadingYearly, setLoadingYearly] = useState(false)

  const fetchDaily = async () => {
    setLoadingDaily(true)
    try {
      const data = await getReportDaily(dailyDate)
      setDailyData(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingDaily(false)
    }
  }

  const fetchMonthly = async () => {
    setLoadingMonthly(true)
    try {
      const data = await getReportMonthly(year, month)
      setMonthlyData(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingMonthly(false)
    }
  }

  const fetchYearly = async () => {
    setLoadingYearly(true)
    try {
      const data = await getReportYearly(yearlyYear)
      setYearlyData(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoadingYearly(false)
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-bar-chart-line text-primary me-2"></i>Rapports Financiers
          </h3>
          <p className="text-muted small mb-0">Bilans d’activité journaliers, mensuels et annuels</p>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'daily' ? 'active' : ''}`}
            onClick={() => setTab('daily')}
          >
            Rapport Journalier
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'monthly' ? 'active' : ''}`}
            onClick={() => setTab('monthly')}
          >
            Rapport Mensuel
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'yearly' ? 'active' : ''}`}
            onClick={() => setTab('yearly')}
          >
            Rapport Annuel
          </button>
        </li>
      </ul>

      {/* Daily Tab */}
      {tab === 'daily' && (
        <div className="card border-0 shadow-sm p-4">
          <div className="row g-2 align-items-end mb-4" style={{ maxWidth: '400px' }}>
            <div className="col">
              <label className="form-label small fw-semibold">Choisir une date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button
                className="btn btn-primary btn-sm"
                onClick={fetchDaily}
                disabled={loadingDaily}
              >
                {loadingDaily ? 'Chargement...' : 'Afficher'}
              </button>
            </div>
          </div>

          {dailyData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card bg-success-subtle border-0 p-3">
                    <span className="small text-success fw-bold">Revenu du jour</span>
                    <h4 className="fw-bold text-success mb-0">
                      {Number(dailyData.total_income || 0).toFixed(2)} DH
                    </h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-danger-subtle border-0 p-3">
                    <span className="small text-danger fw-bold">Dépense du jour</span>
                    <h4 className="fw-bold text-danger mb-0">
                      {Number(dailyData.total_expense || 0).toFixed(2)} DH
                    </h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-primary-subtle border-0 p-3">
                    <span className="small text-primary fw-bold">Marge nette</span>
                    <h4 className="fw-bold text-primary mb-0">
                      {(
                        Number(dailyData.total_income || 0) -
                        Number(dailyData.total_expense || 0)
                      ).toFixed(2)}{' '}
                      DH
                    </h4>
                  </div>
                </div>
              </div>

              <h6 className="fw-bold mb-3">Détail des opérations du {dailyDate}</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Description</th>
                      <th>Contact</th>
                      <th>Revenu</th>
                      <th>Dépense</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dailyData.transactions || []).map((t: any) => (
                      <tr key={t.id}>
                        <td>{t.description}</td>
                        <td className="small text-muted">{t.person_name || '—'}</td>
                        <td className="text-success fw-semibold">
                          {t.income > 0 ? `+${Number(t.income).toFixed(2)} DH` : '—'}
                        </td>
                        <td className="text-danger fw-semibold">
                          {t.expense > 0 ? `-${Number(t.expense).toFixed(2)} DH` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly Tab */}
      {tab === 'monthly' && (
        <div className="card border-0 shadow-sm p-4">
          <div className="row g-2 align-items-end mb-4" style={{ maxWidth: '500px' }}>
            <div className="col">
              <label className="form-label small fw-semibold">Mois</label>
              <select
                className="form-select form-select-sm"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Mois {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="col">
              <label className="form-label small fw-semibold">Année</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button
                className="btn btn-primary btn-sm"
                onClick={fetchMonthly}
                disabled={loadingMonthly}
              >
                {loadingMonthly ? 'Chargement...' : 'Afficher'}
              </button>
            </div>
            <div className="col-auto">
              <a
                href={monthlyBackupUrl(year, month)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-success btn-sm"
              >
                <i className="bi bi-file-earmark-arrow-down me-1"></i> Export CSV
              </a>
            </div>
          </div>

          {monthlyData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card bg-success-subtle border-0 p-3">
                    <span className="small text-success fw-bold">Revenu Total</span>
                    <h4 className="fw-bold text-success mb-0">
                      {Number(monthlyData.total_income || 0).toFixed(2)} DH
                    </h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-danger-subtle border-0 p-3">
                    <span className="small text-danger fw-bold">Dépense Totale</span>
                    <h4 className="fw-bold text-danger mb-0">
                      {Number(monthlyData.total_expense || 0).toFixed(2)} DH
                    </h4>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-primary-subtle border-0 p-3">
                    <span className="small text-primary fw-bold">Bilan Net</span>
                    <h4 className="fw-bold text-primary mb-0">
                      {(
                        Number(monthlyData.total_income || 0) -
                        Number(monthlyData.total_expense || 0)
                      ).toFixed(2)}{' '}
                      DH
                    </h4>
                  </div>
                </div>
              </div>

              <h6 className="fw-bold mb-3">Évolution journalière</h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Total Revenus</th>
                      <th>Total Dépenses</th>
                      <th>Différence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(monthlyData.daily || []).map((d: any, idx: number) => {
                      const diff = Number(d.income) - Number(d.expense)
                      return (
                        <tr key={idx}>
                          <td className="small text-muted">{d.date}</td>
                          <td className="text-success fw-semibold">
                            +{Number(d.income).toFixed(2)} DH
                          </td>
                          <td className="text-danger fw-semibold">
                            -{Number(d.expense).toFixed(2)} DH
                          </td>
                          <td
                            className={`fw-bold ${
                              diff >= 0 ? 'text-success' : 'text-danger'
                            }`}
                          >
                            {diff.toFixed(2)} DH
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Yearly Tab */}
      {tab === 'yearly' && (
        <div className="card border-0 shadow-sm p-4">
          <div className="row g-2 align-items-end mb-4" style={{ maxWidth: '350px' }}>
            <div className="col">
              <label className="form-label small fw-semibold">Année</label>
              <input
                type="number"
                className="form-control form-control-sm"
                value={yearlyYear}
                onChange={(e) => setYearlyYear(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button
                className="btn btn-primary btn-sm"
                onClick={fetchYearly}
                disabled={loadingYearly}
              >
                {loadingYearly ? 'Chargement...' : 'Afficher'}
              </button>
            </div>
          </div>

          {yearlyData && (
            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Mois</th>
                    <th>Revenu</th>
                    <th>Dépense</th>
                    <th>Résultat Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(yearlyData.monthly || []).map((m: any, idx: number) => {
                    const diff = Number(m.income) - Number(m.expense)
                    return (
                      <tr key={idx}>
                        <td className="fw-semibold">Mois {m.month}</td>
                        <td className="text-success">+{Number(m.income).toFixed(2)} DH</td>
                        <td className="text-danger">-{Number(m.expense).toFixed(2)} DH</td>
                        <td className={`fw-bold ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
                          {diff.toFixed(2)} DH
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
