(() => {
  'use strict';

  const STORAGE_KEY = 'rahuy-expenses-v1';
  const categories = {
    'Їжа': { icon: '🍽️', className: 'food' },
    'Транспорт': { icon: '🚲', className: 'transport' },
    'Покупки': { icon: '🛍️', className: 'shopping' },
    'Інше': { icon: '✳', className: 'other' }
  };
  const money = new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' });
  const byId = (id) => document.getElementById(id);
  const form = byId('expenseForm');
  let expenses = loadExpenses();

  function loadExpenses() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(stored)) return [];
      return stored.filter((item) => item && typeof item.title === 'string' && Number.isFinite(Number(item.amount)) && categories[item.category])
        .map((item) => ({ ...item, amount: Number(item.amount) }));
    } catch {
      return [];
    }
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {
      window.alert('Не вдалося зберегти дані у браузері. Перевірте налаштування LocalStorage.');
    }
  }

  function formatMoney(value) {
    return money.format(value).replace(/\u00a0/g, ' ');
  }

  function render() {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    byId('totalAmount').textContent = formatMoney(total);
    byId('expenseCount').textContent = String(expenses.length);
    byId('averageAmount').textContent = formatMoney(expenses.length ? total / expenses.length : 0);
    byId('todayLabel').textContent = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    renderCategoryStats();
    renderExpenseList();
  }

  function renderCategoryStats() {
    const container = byId('categoryStats');
    const totals = Object.keys(categories).map((category) => ({
      category,
      amount: expenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0)
    }));
    const max = Math.max(...totals.map((item) => item.amount), 1);
    if (!expenses.length) {
      container.innerHTML = '<p class="category-empty">Додайте витрати, щоб побачити статистику.</p>';
      return;
    }
    container.innerHTML = totals.map(({ category, amount }) => {
      const { icon } = categories[category];
      const width = amount ? Math.max(5, (amount / max) * 100) : 0;
      return `<div class="category-row"><span class="category-emoji" aria-hidden="true">${icon}</span><div class="category-info"><div class="category-name">${category}</div><div class="category-track"><div class="category-fill" style="width:${width}%"></div></div></div><span class="category-amount">${formatMoney(amount)}</span></div>`;
    }).join('');
  }

  function renderExpenseList() {
    const query = byId('searchInput').value.trim().toLocaleLowerCase('uk');
    const category = byId('categoryFilter').value;
    const filtered = expenses.filter((item) => item.title.toLocaleLowerCase('uk').includes(query) && (category === 'Усі' || item.category === category));
    const list = byId('expenseList');
    byId('listCount').textContent = String(filtered.length);
    list.innerHTML = filtered.map((item) => {
      const meta = categories[item.category];
      const date = new Date(item.createdAt);
      const dateText = Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
      return `<article class="expense-row"><span class="expense-symbol ${meta.className}" aria-hidden="true">${meta.icon}</span><div class="expense-main"><div class="expense-title">${escapeHtml(item.title)}</div><div class="expense-meta">${item.category}${dateText ? ` · ${dateText}` : ''}</div></div><span class="expense-amount">− ${formatMoney(item.amount)}</span><button class="delete-button" type="button" data-delete-id="${escapeHtml(item.id)}" aria-label="Видалити витрату ${escapeHtml(item.title)}" title="Видалити">×</button></article>`;
    }).join('');
    const empty = byId('emptyState');
    empty.classList.toggle('visible', filtered.length === 0);
    if (expenses.length && filtered.length === 0) empty.querySelector('strong').textContent = 'Нічого не знайдено';
    else empty.querySelector('strong').textContent = 'Тут поки порожньо';
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function showError(id, message) {
    byId(id).textContent = message;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = byId('expenseTitle').value.trim();
    const amount = Number(byId('expenseAmount').value);
    let valid = true;
    showError('expenseTitleError', '');
    showError('expenseAmountError', '');
    if (!title) { showError('expenseTitleError', 'Вкажіть назву витрати.'); valid = false; }
    if (!Number.isFinite(amount) || amount <= 0) { showError('expenseAmountError', 'Сума має бути більшою за нуль.'); valid = false; }
    if (!valid) return;
    expenses.unshift({ id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), title, amount, category: byId('expenseCategory').value, createdAt: new Date().toISOString() });
    saveExpenses();
    form.reset();
    render();
    byId('expenseTitle').focus();
  });

  byId('expenseList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-id]');
    if (!button) return;
    expenses = expenses.filter((item) => String(item.id) !== button.dataset.deleteId);
    saveExpenses();
    render();
  });

  byId('clearExpenses').addEventListener('click', () => {
    if (!expenses.length) return;
    if (!window.confirm('Видалити всі витрати? Цю дію не можна скасувати.')) return;
    expenses = [];
    saveExpenses();
    render();
  });
  byId('searchInput').addEventListener('input', renderExpenseList);
  byId('categoryFilter').addEventListener('change', renderExpenseList);

  const registrationForm = byId('registrationForm');
  const registrationFields = ['username', 'email', 'password', 'confirmPassword'];
  registrationFields.forEach((field) => byId(field).addEventListener('input', () => {
    showError(`${field}Error`, '');
    byId('registrationSuccess').textContent = '';
  }));
  byId('terms').addEventListener('change', () => showError('termsError', ''));

  registrationForm.addEventListener('submit', (event) => {
    event.preventDefault();
    registrationFields.forEach((field) => showError(`${field}Error`, ''));
    showError('termsError', '');
    byId('registrationSuccess').textContent = '';
    const username = byId('username').value.trim();
    const email = byId('email').value.trim();
    const password = byId('password').value;
    const confirmPassword = byId('confirmPassword').value;
    let valid = true;
    if (username.length < 3) { showError('usernameError', 'Ім’я має містити щонайменше 3 символи.'); valid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { showError('emailError', 'Введіть коректну адресу email.'); valid = false; }
    if (password.length < 8) { showError('passwordError', 'Пароль має містити щонайменше 8 символів.'); valid = false; }
    if (confirmPassword !== password || !confirmPassword) { showError('confirmPasswordError', 'Паролі мають збігатися.'); valid = false; }
    if (!byId('terms').checked) { showError('termsError', 'Потрібно погодитися з умовами.'); valid = false; }
    if (!valid) return;
    byId('registrationSuccess').textContent = 'Реєстрація успішна!';
    registrationForm.reset();
  });

  render();
})();
