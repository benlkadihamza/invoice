// API base — empty string uses vite proxy in dev, direct in prod
const BASE = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Auth
export const login = (username: string, password: string) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
export const logout = () => request('/api/auth/logout', { method: 'POST' })
export const getMe = () => request<{ user: any }>('/api/auth/me')
export const changePassword = (current_password: string, new_password: string) =>
  request('/api/auth/password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) })

// Dashboard
export const getDashboard = () => request<any>('/api/dashboard')

// Transactions
export const getTransactions = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<{ transactions: any[] }>(`/api/transactions${qs}`)
}
export const createTransaction = (data: any) =>
  request('/api/transactions', { method: 'POST', body: JSON.stringify(data) })
export const updateTransaction = (id: number, data: any) =>
  request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteTransaction = (id: number) =>
  request(`/api/transactions/${id}`, { method: 'DELETE' })

// Persons
export const getPersons = () => request<{ persons: any[] }>('/api/persons')
export const createPerson = (data: any) =>
  request('/api/persons', { method: 'POST', body: JSON.stringify(data) })
export const updatePerson = (id: number, data: any) =>
  request(`/api/persons/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deletePerson = (id: number) =>
  request(`/api/persons/${id}`, { method: 'DELETE' })

// Invoices
export const getInvoices = () => request<{ invoices: any[] }>('/api/invoices')
export const createInvoice = (data: any) =>
  request('/api/invoices', { method: 'POST', body: JSON.stringify(data) })
export const updateInvoice = (id: number, data: any) =>
  request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteInvoice = (id: number) =>
  request(`/api/invoices/${id}`, { method: 'DELETE' })
export const downloadInvoicePdf = (id: number) =>
  `${BASE}/api/invoices/${id}/pdf`

// Payments
export const getPayments = () => request<{ payments: any[] }>('/api/payments')
export const createPayment = (data: any) =>
  request('/api/payments', { method: 'POST', body: JSON.stringify(data) })
export const updatePayment = (id: number, data: any) =>
  request(`/api/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// Products / Stock
export const getProducts = () => request<{ products: any[] }>('/api/products')
export const deleteProduct = (id: number) =>
  request(`/api/products/${id}`, { method: 'DELETE' })
export const adjustStock = (id: number, change_type: 'add' | 'remove', quantity: number) =>
  request(`/api/products/${id}/stock`, { method: 'POST', body: JSON.stringify({ change_type, quantity }) })

// Reports
export const getReportDaily = (date: string) =>
  request<any>(`/api/reports/daily?date=${date}`)
export const getReportMonthly = (year: string, month: string) =>
  request<any>(`/api/reports/monthly?year=${year}&month=${month}`)
export const getReportYearly = (year: string) =>
  request<any>(`/api/reports/yearly?year=${year}`)
export const getReportPerson = (id: number) =>
  request<any>(`/api/reports/person/${id}`)

// Settings
export const getSettings = () => request<any>('/api/settings')
export const updateSettings = (data: any) =>
  request('/api/settings', { method: 'PUT', body: JSON.stringify(data) })

// Categories
export const getCategories = () => request<{ categories: any[] }>('/api/categories')
export const createCategory = (data: any) =>
  request('/api/categories', { method: 'POST', body: JSON.stringify(data) })
export const deleteCategory = (id: number) =>
  request(`/api/categories/${id}`, { method: 'DELETE' })

// Exports
export const monthlyBackupUrl = (year: string, month: string) =>
  `${BASE}/api/exports/monthly-backup?year=${year}&month=${month}`
