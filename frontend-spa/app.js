/**
 * InvoiceApp Pro - Cloudflare Pages Single Page Application
 * Handles Invoicing, Payments, Stock Management, Cashflow Transactions, and PDF Export.
 */

// Initial Seed Data
const DEFAULT_PRODUCTS = [
  { id: 1, title: 'Papier Thermique Caisse 80x80 (Lot de 50)', stock_quantity: 42 },
  { id: 2, title: 'Lecteur Code-barres Laser USB', stock_quantity: 15 },
  { id: 3, title: 'Imprimante Reçu Ticket ESC/POS', stock_quantity: 8 },
  { id: 4, title: 'Tiroir-Caisse Métallique RJ11', stock_quantity: 12 }
];

const DEFAULT_INVOICES = [
  {
    id: 1,
    invoice_num: 'FACT-2026-001',
    date: '2026-10-25',
    client_name: 'SARL High-Tech Alger',
    client_address: 'Bab Ezzouar, Alger',
    total: 35000,
    remise: 2000,
    payer: 33000,
    net_total: 33000,
    items: [
      { designation: 'Lecteur Code-barres Laser USB', quantity: 2, price: 10000, total: 20000 },
      { designation: 'Papier Thermique Caisse 80x80', quantity: 3, price: 5000, total: 15000 }
    ],
    payment: {
      payment1_amount: 33000,
      payment1_date: '2026-10-25',
      remaining_amount: 0,
      status: 'Paid'
    }
  },
  {
    id: 2,
    invoice_num: 'FACT-2026-002',
    date: '2026-10-28',
    client_name: 'EURL Distribution Oran',
    client_address: 'Es Senia, Oran',
    total: 58000,
    remise: 3000,
    payer: 25000,
    net_total: 55000,
    items: [
      { designation: 'Imprimante Reçu Ticket ESC/POS', quantity: 2, price: 24000, total: 48000 },
      { designation: 'Tiroir-Caisse Métallique RJ11', quantity: 1, price: 10000, total: 10000 }
    ],
    payment: {
      payment1_amount: 25000,
      payment1_date: '2026-10-28',
      remaining_amount: 30000,
      status: 'Partial'
    }
  }
];

const DEFAULT_TRANSACTIONS = [
  { id: 1, date: '2026-10-25', description: 'Règlement Facture FACT-2026-001', person: 'SARL High-Tech Alger', type: 'income', income: 33000, expense: 0 },
  { id: 2, date: '2026-10-27', description: 'Achat consommables bureau', person: 'Fournitures Express', type: 'expense', income: 0, expense: 4500 },
  { id: 3, date: '2026-10-28', description: 'Acompte Facture FACT-2026-002', person: 'EURL Distribution Oran', type: 'income', income: 25000, expense: 0 }
];

// State Store
let store = {
  invoices: JSON.parse(localStorage.getItem('invoiceapp_invoices')) || DEFAULT_INVOICES,
  products: JSON.parse(localStorage.getItem('invoiceapp_products')) || DEFAULT_PRODUCTS,
  transactions: JSON.parse(localStorage.getItem('invoiceapp_transactions')) || DEFAULT_TRANSACTIONS,
  settings: JSON.parse(localStorage.getItem('invoiceapp_settings')) || {
    companyName: 'ETS FACTURATION & COMMERCE',
    currency: 'DZD',
    apiUrl: ''
  }
};

function saveStore() {
  localStorage.setItem('invoiceapp_invoices', JSON.stringify(store.invoices));
  localStorage.setItem('invoiceapp_products', JSON.stringify(store.products));
  localStorage.setItem('invoiceapp_transactions', JSON.stringify(store.transactions));
  localStorage.setItem('invoiceapp_settings', JSON.stringify(store.settings));
}

// Currency Formatter
function formatPrice(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (store.settings.currency || 'DZD');
}

// Navigation Router
let currentView = 'dashboard';
let financeChartInstance = null;

function navigate(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.remove('hidden');

  // Update nav button states
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-nav') === viewName) {
      btn.classList.add('bg-slate-700', 'text-white');
    } else {
      btn.classList.remove('bg-slate-700', 'text-white');
    }
  });

  // Render view data
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'invoices') renderInvoicesTable();
  if (viewName === 'payments') renderPaymentsTable();
  if (viewName === 'stock') renderStockView();
  if (viewName === 'transactions') renderTransactionsTable();
  if (viewName === 'reports') renderReportsView();

  // Re-run Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// 1. DASHBOARD
function renderDashboard() {
  let totalInvoiced = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;
  let pendingCount = 0;

  store.invoices.forEach(inv => {
    const net = Number(inv.net_total) || 0;
    totalInvoiced += net;
    const paid = (inv.payment ? (inv.payment.payment1_amount || 0) + (inv.payment.payment2_amount || 0) + (inv.payment.payment3_amount || 0) + (inv.payment.payment4_amount || 0) : Number(inv.payer) || 0);
    totalCollected += paid;
    const rem = Math.max(0, net - paid);
    totalOutstanding += rem;
    if (rem > 0) pendingCount++;
  });

  let totalUnits = 0;
  store.products.forEach(p => totalUnits += (Number(p.stock_quantity) || 0));

  document.getElementById('kpi-invoiced').textContent = formatPrice(totalInvoiced);
  document.getElementById('kpi-invoice-count').textContent = `${store.invoices.length} factures émises`;
  document.getElementById('kpi-collected').textContent = formatPrice(totalCollected);
  const paidPct = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100;
  document.getElementById('kpi-paid-rate').textContent = `${paidPct}% du total perçu`;
  document.getElementById('kpi-outstanding').textContent = formatPrice(totalOutstanding);
  document.getElementById('kpi-pending-count').textContent = `${pendingCount} créance(s) en attente`;
  document.getElementById('kpi-products').textContent = store.products.length;
  document.getElementById('kpi-stock-units').textContent = `${totalUnits} pièces disponibles`;

  // Render Status Distribution
  const distEl = document.getElementById('status-distribution');
  let paidInvs = store.invoices.filter(i => i.payment && i.payment.status === 'Paid').length;
  let partInvs = store.invoices.filter(i => i.payment && i.payment.status === 'Partial').length;
  let pendInvs = store.invoices.filter(i => !i.payment || i.payment.status === 'Pending').length;

  distEl.innerHTML = `
    <div class="flex justify-between items-center text-xs">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Réglées (100%)</span>
      <strong class="text-slate-800">${paidInvs}</strong>
    </div>
    <div class="flex justify-between items-center text-xs">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Règlements Partiels</span>
      <strong class="text-slate-800">${partInvs}</strong>
    </div>
    <div class="flex justify-between items-center text-xs">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span> En Attente Intégrale</span>
      <strong class="text-slate-800">${pendInvs}</strong>
    </div>
  `;

  // Render Recent Invoices
  const tbody = document.getElementById('recent-invoices-tbody');
  tbody.innerHTML = '';
  store.invoices.slice(-5).reverse().forEach(inv => {
    tbody.appendChild(createInvoiceRow(inv));
  });

  // Render Finance Chart
  renderChart(totalCollected, totalOutstanding);
}

function renderChart(collected, outstanding) {
  const ctx = document.getElementById('financeChart');
  if (!ctx) return;
  if (financeChartInstance) {
    financeChartInstance.destroy();
  }
  financeChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Encaissé (Réalisé)', 'Reste à Recouvrer (Créances)'],
      datasets: [{
        label: 'Montant (DZD)',
        data: [collected, outstanding],
        backgroundColor: ['#059669', '#dc2626'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => value.toLocaleString('fr-FR') + ' DZD'
          }
        }
      }
    }
  });
}

function createInvoiceRow(inv) {
  const tr = document.createElement('tr');
  tr.className = 'hover:bg-slate-50/80 transition-colors';
  const status = inv.payment ? inv.payment.status : 'Pending';
  let badgeClass = 'bg-rose-100 text-rose-700';
  let badgeLabel = 'En attente';
  if (status === 'Paid') {
    badgeClass = 'bg-emerald-100 text-emerald-800';
    badgeLabel = 'Réglé';
  } else if (status === 'Partial') {
    badgeClass = 'bg-amber-100 text-amber-800';
    badgeLabel = 'Partiel';
  }

  tr.innerHTML = `
    <td class="px-6 py-4 font-semibold text-slate-900">${inv.invoice_num}</td>
    <td class="px-6 py-4 text-slate-500">${inv.date}</td>
    <td class="px-6 py-4 font-medium text-slate-800">${inv.client_name}</td>
    <td class="px-6 py-4 text-right font-bold text-slate-900">${formatPrice(inv.net_total)}</td>
    <td class="px-6 py-4 text-center">
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}">
        ${badgeLabel}
      </span>
    </td>
    <td class="px-6 py-4 text-right space-x-2">
      <button onclick="downloadPDF(${inv.id})" title="Télécharger PDF" class="p-1 text-slate-500 hover:text-blue-600">
        <i data-lucide="file-down" class="w-4 h-4 inline"></i>
      </button>
      <button onclick="openPaymentForInvoice(${inv.id})" title="Gérer Règlements" class="p-1 text-slate-500 hover:text-emerald-600">
        <i data-lucide="credit-card" class="w-4 h-4 inline"></i>
      </button>
      <button onclick="deleteInvoice(${inv.id})" title="Supprimer" class="p-1 text-slate-500 hover:text-rose-600">
        <i data-lucide="trash-2" class="w-4 h-4 inline"></i>
      </button>
    </td>
  `;
  return tr;
}

// 2. INVOICES
function renderInvoicesTable() {
  const query = (document.getElementById('invoice-search')?.value || '').toLowerCase();
  const filter = document.getElementById('invoice-status-filter')?.value || 'all';

  const tbody = document.getElementById('invoices-tbody');
  tbody.innerHTML = '';

  const filtered = store.invoices.filter(inv => {
    const matchQuery = inv.invoice_num.toLowerCase().includes(query) || inv.client_name.toLowerCase().includes(query);
    const invStatus = inv.payment ? inv.payment.status : 'Pending';
    const matchFilter = (filter === 'all') || (invStatus === filter);
    return matchQuery && matchFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">Aucune facture trouvée.</td></tr>`;
    return;
  }

  filtered.forEach(inv => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50/80 transition-colors';
    const status = inv.payment ? inv.payment.status : 'Pending';
    let badgeClass = 'bg-rose-100 text-rose-700';
    let badgeLabel = 'En attente';
    if (status === 'Paid') {
      badgeClass = 'bg-emerald-100 text-emerald-800';
      badgeLabel = 'Réglé';
    } else if (status === 'Partial') {
      badgeClass = 'bg-amber-100 text-amber-800';
      badgeLabel = 'Partiel';
    }

    tr.innerHTML = `
      <td class="px-6 py-4 font-semibold text-slate-900">${inv.invoice_num}</td>
      <td class="px-6 py-4 text-slate-500">${inv.date}</td>
      <td class="px-6 py-4 font-medium text-slate-800">${inv.client_name}</td>
      <td class="px-6 py-4 text-right text-slate-600">${formatPrice(inv.total)}</td>
      <td class="px-6 py-4 text-right text-rose-600">${inv.remise > 0 ? '-' + formatPrice(inv.remise) : '0,00'}</td>
      <td class="px-6 py-4 text-right font-bold text-slate-900">${formatPrice(inv.net_total)}</td>
      <td class="px-6 py-4 text-center">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}">
          ${badgeLabel}
        </span>
      </td>
      <td class="px-6 py-4 text-right space-x-2">
        <button onclick="downloadPDF(${inv.id})" class="text-xs px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">PDF</button>
        <button onclick="openPaymentForInvoice(${inv.id})" class="text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">Régler</button>
        <button onclick="deleteInvoice(${inv.id})" class="text-xs px-2 py-1 rounded text-rose-600 hover:bg-rose-50 font-medium"><i data-lucide="trash-2" class="w-3.5 h-3.5 inline"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) window.lucide.createIcons();
}

// 3. PAYMENTS
function renderPaymentsTable() {
  const tbody = document.getElementById('payments-tbody');
  tbody.innerHTML = '';

  store.invoices.forEach(inv => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';
    const pay = inv.payment || { status: 'Pending', remaining_amount: inv.net_total };
    const paid = (pay.payment1_amount || 0) + (pay.payment2_amount || 0) + (pay.payment3_amount || 0) + (pay.payment4_amount || 0);

    let badge = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">En attente</span>';
    if (pay.status === 'Paid') badge = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">Réglé (100%)</span>';
    if (pay.status === 'Partial') badge = '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Partiel</span>';

    tr.innerHTML = `
      <td class="px-6 py-4 font-semibold text-slate-900">${inv.invoice_num}</td>
      <td class="px-6 py-4 font-medium text-slate-800">${inv.client_name}</td>
      <td class="px-6 py-4 text-right font-medium">${formatPrice(inv.net_total)}</td>
      <td class="px-6 py-4 text-right text-emerald-600 font-semibold">${formatPrice(paid)}</td>
      <td class="px-6 py-4 text-right text-rose-600 font-bold">${formatPrice(pay.remaining_amount)}</td>
      <td class="px-6 py-4 text-center">${badge}</td>
      <td class="px-6 py-4 text-right">
        <button onclick="openPaymentForInvoice(${inv.id})" class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm">
          Éditer Règlements
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. STOCK
function renderStockView() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  store.products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4';
    const isLow = p.stock_quantity < 5;
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between">
          <div class="p-2.5 rounded-lg bg-slate-100 text-slate-700">
            <i data-lucide="package" class="w-5 h-5"></i>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
            ${isLow ? 'Stock Faible' : 'Disponible'}
          </span>
        </div>
        <h3 class="font-bold text-slate-900 mt-3 text-base">${p.title}</h3>
        <p class="text-xs text-slate-400 mt-0.5">Réf: PRD-${p.id.toString().padStart(4, '0')}</p>
      </div>

      <div class="border-t border-slate-100 pt-3 flex items-center justify-between">
        <div>
          <span class="text-xs text-slate-500">Quantité en stock</span>
          <p class="text-2xl font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}">${p.stock_quantity} <span class="text-xs font-normal text-slate-500">unités</span></p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="adjustStock(${p.id}, -1)" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold">-</button>
          <button onclick="adjustStock(${p.id}, 1)" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold">+</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
  if (window.lucide) window.lucide.createIcons();
}

function adjustStock(productId, delta) {
  const prod = store.products.find(p => p.id === productId);
  if (!prod) return;
  prod.stock_quantity = Math.max(0, prod.stock_quantity + delta);
  saveStore();
  renderStockView();
}

// 5. TRANSACTIONS
function renderTransactionsTable() {
  const tbody = document.getElementById('transactions-tbody');
  tbody.innerHTML = '';

  store.transactions.slice().reverse().forEach((tx, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';
    tr.innerHTML = `
      <td class="px-6 py-4 text-slate-500">${tx.date}</td>
      <td class="px-6 py-4 font-medium text-slate-900">${tx.description}</td>
      <td class="px-6 py-4 text-slate-600">${tx.person || '-'}</td>
      <td class="px-6 py-4 text-slate-500 text-xs uppercase font-semibold">Caisse / Virement</td>
      <td class="px-6 py-4 text-right font-bold text-emerald-600">${tx.income > 0 ? '+' + formatPrice(tx.income) : '-'}</td>
      <td class="px-6 py-4 text-right font-bold text-rose-600">${tx.expense > 0 ? '-' + formatPrice(tx.expense) : '-'}</td>
      <td class="px-6 py-4 text-right">
        <button onclick="deleteTransaction(${tx.id})" class="text-slate-400 hover:text-rose-600"><i data-lucide="trash" class="w-4 h-4 inline"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) window.lucide.createIcons();
}

// MODAL INTERACTIONS

// Invoices
function openNewInvoiceModal() {
  document.getElementById('invoice-form').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = today;
  document.getElementById('inv-num').value = `FACT-${new Date().getFullYear()}-${(store.invoices.length + 1).toString().padStart(3, '0')}`;
  
  const container = document.getElementById('invoice-items-container');
  container.innerHTML = '';
  addInvoiceItemRow(); // start with one line item
  recalcInvoiceModal();

  document.getElementById('invoice-modal').classList.remove('hidden');
}

function closeInvoiceModal() {
  document.getElementById('invoice-modal').classList.add('hidden');
}

function addInvoiceItemRow(desc = '', qty = 1, price = 0) {
  const container = document.getElementById('invoice-items-container');
  const row = document.createElement('div');
  row.className = 'grid grid-cols-12 gap-2 items-center item-row';
  row.innerHTML = `
    <div class="col-span-6">
      <input type="text" placeholder="Désignation de l'article" value="${desc}" required class="item-desc w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm">
    </div>
    <div class="col-span-2">
      <input type="number" min="1" step="1" value="${qty}" oninput="recalcInvoiceModal()" required class="item-qty w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm text-center">
    </div>
    <div class="col-span-3">
      <input type="number" min="0" step="any" value="${price}" oninput="recalcInvoiceModal()" required class="item-price w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm text-right">
    </div>
    <div class="col-span-1 text-center">
      <button type="button" onclick="this.closest('.item-row').remove(); recalcInvoiceModal();" class="text-slate-400 hover:text-rose-600">
        <i data-lucide="x" class="w-4 h-4 inline"></i>
      </button>
    </div>
  `;
  container.appendChild(row);
  if (window.lucide) window.lucide.createIcons();
}

function recalcInvoiceModal() {
  let gross = 0;
  document.querySelectorAll('#invoice-items-container .item-row').forEach(row => {
    const qty = Number(row.querySelector('.item-qty')?.value) || 0;
    const price = Number(row.querySelector('.item-price')?.value) || 0;
    gross += (qty * price);
  });
  const remise = Number(document.getElementById('inv-remise')?.value) || 0;
  const net = Math.max(0, gross - remise);
  document.getElementById('inv-net-display').textContent = formatPrice(net);
}

function saveInvoice(e) {
  e.preventDefault();
  const num = document.getElementById('inv-num').value.trim();
  const date = document.getElementById('inv-date').value;
  const client = document.getElementById('inv-client').value.trim();
  const address = document.getElementById('inv-address').value.trim();
  const remise = Number(document.getElementById('inv-remise').value) || 0;
  const payer = Number(document.getElementById('inv-payer').value) || 0;

  let gross = 0;
  const items = [];
  document.querySelectorAll('#invoice-items-container .item-row').forEach(row => {
    const desc = row.querySelector('.item-desc').value.trim();
    const qty = Number(row.querySelector('.item-qty').value) || 1;
    const price = Number(row.querySelector('.item-price').value) || 0;
    const lineTotal = qty * price;
    gross += lineTotal;
    items.push({ designation: desc, quantity: qty, price: price, total: lineTotal });
  });

  const netTotal = Math.max(0, gross - remise);
  const remaining = Math.max(0, netTotal - payer);
  let status = 'Pending';
  if (remaining <= 0) status = 'Paid';
  else if (payer > 0) status = 'Partial';

  const newInvoice = {
    id: Date.now(),
    invoice_num: num,
    date: date,
    client_name: client,
    client_address: address,
    total: gross,
    remise: remise,
    payer: payer,
    net_total: netTotal,
    items: items,
    payment: {
      payment1_amount: payer,
      payment1_date: payer > 0 ? date : '',
      payment2_amount: 0,
      payment2_date: '',
      payment3_amount: 0,
      payment3_date: '',
      remaining_amount: remaining,
      status: status
    }
  };

  store.invoices.push(newInvoice);

  // If immediate payment, record transaction
  if (payer > 0) {
    store.transactions.push({
      id: Date.now() + 1,
      date: date,
      description: `Règlement initial ${num}`,
      person: client,
      type: 'income',
      income: payer,
      expense: 0
    });
  }

  saveStore();
  closeInvoiceModal();
  navigate('invoices');
}

function deleteInvoice(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) return;
  store.invoices = store.invoices.filter(i => i.id !== id);
  saveStore();
  renderInvoicesTable();
  if (currentView === 'dashboard') renderDashboard();
}

// Payments Modal
function openPaymentForInvoice(id) {
  const inv = store.invoices.find(i => i.id === id);
  if (!inv) return;
  document.getElementById('pay-inv-id').value = inv.id;
  document.getElementById('pay-client-name').textContent = `${inv.client_name} (${inv.invoice_num})`;
  document.getElementById('pay-total-val').textContent = formatPrice(inv.net_total);

  const pay = inv.payment || {};
  document.getElementById('pay1-amt').value = pay.payment1_amount || '';
  document.getElementById('pay1-date').value = pay.payment1_date || '';
  document.getElementById('pay2-amt').value = pay.payment2_amount || '';
  document.getElementById('pay2-date').value = pay.payment2_date || '';
  document.getElementById('pay3-amt').value = pay.payment3_amount || '';
  document.getElementById('pay3-date').value = pay.payment3_date || '';

  document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
}

function savePaymentInstallments(e) {
  e.preventDefault();
  const id = Number(document.getElementById('pay-inv-id').value);
  const inv = store.invoices.find(i => i.id === id);
  if (!inv) return;

  const p1 = Number(document.getElementById('pay1-amt').value) || 0;
  const d1 = document.getElementById('pay1-date').value;
  const p2 = Number(document.getElementById('pay2-amt').value) || 0;
  const d2 = document.getElementById('pay2-date').value;
  const p3 = Number(document.getElementById('pay3-amt').value) || 0;
  const d3 = document.getElementById('pay3-date').value;

  const totalPaid = p1 + p2 + p3;
  const remaining = Math.max(0, inv.net_total - totalPaid);
  let status = 'Pending';
  if (remaining <= 0) status = 'Paid';
  else if (totalPaid > 0) status = 'Partial';

  inv.payment = {
    payment1_amount: p1,
    payment1_date: d1,
    payment2_amount: p2,
    payment2_date: d2,
    payment3_amount: p3,
    payment3_date: d3,
    remaining_amount: remaining,
    status: status
  };

  saveStore();
  closePaymentModal();
  navigate(currentView);
}

// Stock Modal
function openNewProductModal() {
  document.getElementById('product-form').reset();
  document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}
function saveProduct(e) {
  e.preventDefault();
  const title = document.getElementById('prod-title').value.trim();
  const qty = Number(document.getElementById('prod-qty').value) || 0;
  store.products.push({
    id: Date.now(),
    title: title,
    stock_quantity: qty
  });
  saveStore();
  closeProductModal();
  renderStockView();
}

// Transactions Modal
function openNewTransactionModal() {
  document.getElementById('tx-form').reset();
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('transaction-modal').classList.remove('hidden');
}
function closeTransactionModal() {
  document.getElementById('transaction-modal').classList.add('hidden');
}
function saveTransaction(e) {
  e.preventDefault();
  const date = document.getElementById('tx-date').value;
  const flow = document.getElementById('tx-flow').value;
  const desc = document.getElementById('tx-desc').value.trim();
  const person = document.getElementById('tx-person').value.trim();
  const amount = Number(document.getElementById('tx-amount').value) || 0;

  store.transactions.push({
    id: Date.now(),
    date: date,
    description: desc,
    person: person,
    type: flow,
    income: flow === 'income' ? amount : 0,
    expense: flow === 'expense' ? amount : 0
  });

  saveStore();
  closeTransactionModal();
  renderTransactionsTable();
}
function deleteTransaction(id) {
  if (!confirm('Supprimer cette écriture comptable ?')) return;
  store.transactions = store.transactions.filter(t => t.id !== id);
  saveStore();
  renderTransactionsTable();
}

// Settings Modal
function openSettingsModal() {
  document.getElementById('cfg-api-url').value = store.settings.apiUrl || '';
  document.getElementById('cfg-company-name').value = store.settings.companyName || 'ETS FACTURATION ALGERIE';
  document.getElementById('cfg-currency').value = store.settings.currency || 'DZD';
  document.getElementById('settings-modal').classList.remove('hidden');
}
function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}
function saveSettings() {
  store.settings.apiUrl = document.getElementById('cfg-api-url').value.trim();
  store.settings.companyName = document.getElementById('cfg-company-name').value.trim();
  store.settings.currency = document.getElementById('cfg-currency').value.trim();
  saveStore();
  closeSettingsModal();
  navigate(currentView);
}

// PDF Generation using jsPDF & AutoTable (Native Client-Side & Edge Compatible)
function downloadPDF(id) {
  const inv = store.invoices.find(i => i.id === id);
  if (!inv) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Company Header
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text(store.settings.companyName || 'FACTURE COMMERCIALE', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Solutions Professionnelles & Systèmes de Facturation', 14, 26);
  doc.text('Déploiement Cloudflare Pages Edge', 14, 30);

  // Invoice Meta
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`FACTURE N°: ${inv.invoice_num}`, 130, 20);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Date d'émission: ${inv.date}`, 130, 27);
  doc.text(`Client: ${inv.client_name}`, 130, 34);
  doc.text(`Adresse: ${inv.client_address || 'Non spécifiée'}`, 130, 41);

  // Table Items
  const tableData = inv.items.map(it => [
    it.designation,
    it.quantity.toString(),
    formatPrice(it.price),
    formatPrice(it.total)
  ]);

  doc.autoTable({
    startY: 50,
    head: [['Désignation', 'Quantité', 'Prix Unitaire', 'Total']],
    body: tableData,
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    styles: { font: 'helvetica', fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  // Totals Box
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Total Brut: ${formatPrice(inv.total)}`, 130, finalY);
  doc.text(`Remise: -${formatPrice(inv.remise)}`, 130, finalY + 6);

  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text(`Net à Payer: ${formatPrice(inv.net_total)}`, 130, finalY + 14);

  // Status Stamp
  const status = inv.payment ? inv.payment.status : 'Pending';
  doc.setFontSize(11);
  if (status === 'Paid') {
    doc.setTextColor(5, 150, 105);
    doc.text('STATUT: FACTURE ENTIÈREMENT RÉGLÉE', 14, finalY + 14);
  } else {
    doc.setTextColor(220, 38, 38);
    const rem = inv.payment ? inv.payment.remaining_amount : inv.net_total;
    doc.text(`STATUT: RESTE DÛ = ${formatPrice(rem)}`, 14, finalY + 14);
  }

  doc.save(`${inv.invoice_num}.pdf`);
}

function downloadFinancialSummaryPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text('RAPPORT DE SYNTHÈSE COMPTABLE', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 26);

  const tableData = store.invoices.map(i => [
    i.invoice_num,
    i.date,
    i.client_name,
    formatPrice(i.net_total),
    i.payment ? i.payment.status : 'Pending'
  ]);

  doc.autoTable({
    startY: 35,
    head: [['N° Facture', 'Date', 'Client', 'Net à Payer', 'Statut']],
    body: tableData,
    headStyles: { fillColor: [30, 58, 95] }
  });

  doc.save('Rapport_Financier_Synthese.pdf');
}

// Backup & CSV Export
function exportData() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(store, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `Sauvegarde_InvoiceApp_${new Date().toISOString().split('T')[0]}.json`);
  dlAnchor.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.invoices && data.products) {
        store = data;
        saveStore();
        alert('Sauvegarde restaurée avec succès !');
        navigate('dashboard');
      }
    } catch (err) {
      alert('Format de fichier invalide');
    }
  };
  reader.readAsText(file);
}

function exportCSV() {
  let csv = 'Numero,Date,Client,NetTotal,Statut\n';
  store.invoices.forEach(i => {
    const status = i.payment ? i.payment.status : 'Pending';
    csv += `"${i.invoice_num}","${i.date}","${i.client_name}",${i.net_total},"${status}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Factures_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
});
