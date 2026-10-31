import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const nav = [
  { to: '/', label: '🏠 Dashboard' },
  { to: '/transactions', label: '💰 Transactions' },
  { to: '/persons', label: '👥 Personnes' },
  { to: '/invoices', label: '🧾 Factures' },
  { to: '/payments', label: '💳 Paiements' },
  { to: '/stock', label: '📦 Stock' },
  { to: '/reports', label: '📊 Rapports' },
  { to: '/settings', label: '⚙️ Paramètres' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: '#1a1a2e', color: '#fff', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid #333', marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#c9a84c' }}>Invoice App</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{user?.username}</div>
        </div>
        {nav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 20px',
              color: isActive ? '#c9a84c' : '#ccc',
              textDecoration: 'none',
              background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
              borderLeft: isActive ? '3px solid #c9a84c' : '3px solid transparent',
              fontSize: 14,
            })}
          >
            {label}
          </NavLink>
        ))}
        <div style={{ marginTop: 'auto', padding: '20px' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px', background: '#c0392b', color: '#fff',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}>
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
