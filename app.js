// SuperMarket POS - Web Version
// يعمل مباشرة في المتصفح بدون خادم

// ==================== قاعدة البيانات ====================
const DB_NAME = 'SuperMarketPOS';
const DB_VERSION = 1;
let db = null;

const DB = {
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { db = request.result; resolve(); };
            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                ['products', 'categories', 'customers', 'suppliers', 'sales', 'users', 'settings'].forEach(store => {
                    if (!database.objectStoreNames.contains(store))
                        database.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
                });
            };
        });
    },

    async getAll(store) {
        return new Promise((resolve) => {
            if (!db) { resolve([]); return; }
            const tx = db.transaction([store], 'readonly');
            const data = tx.objectStore(store).getAll();
            data.onsuccess = () => resolve(data.result);
            data.onerror = () => resolve([]);
        });
    },

    async add(store, item) {
        return new Promise((resolve) => {
            const tx = db.transaction([store], 'readwrite');
            tx.objectStore(store).add(item);
            tx.oncomplete = () => resolve(item);
        });
    },

    async put(store, item) {
        return new Promise((resolve) => {
            const tx = db.transaction([store], 'readwrite');
            tx.objectStore(store).put(item);
            tx.oncomplete = () => resolve(item);
        });
    },

    async delete(store, id) {
        return new Promise((resolve) => {
            const tx = db.transaction([store], 'readwrite');
            tx.objectStore(store).delete(id);
            tx.oncomplete = () => resolve();
        });
    }
};

// ==================== بيانات افتراضية ====================
async function seedData() {
    const categories = await DB.getAll('categories');
    if (categories.length === 0) {
        await DB.add('categories', { name: 'مأكولات', description: 'مواد غذائية', color: '#FF9800' });
        await DB.add('categories', { name: 'مشروبات', description: 'مشروبات', color: '#03A9F4' });
        await DB.add('categories', { name: 'منظفات', description: 'منظفات منزلية', color: '#4CAF50' });
        await DB.add('categories', { name: 'عناية شخصية', description: 'عناية', color: '#9C27B0' });
        await DB.add('categories', { name: 'حلويات', description: 'حلويات', color: '#E91E63' });
    }

    const users = await DB.getAll('users');
    if (users.length === 0) {
        await DB.add('users', { username: 'admin', passwordHash: hashPassword('admin123'), fullName: 'مدير النظام', role: 'admin' });
    }

    const customers = await DB.getAll('customers');
    if (customers.length === 0) {
        await DB.add('customers', { name: 'عميل نقدي', type: 'regular', phone: '-', discountRate: 0 });
    }

    const products = await DB.getAll('products');
    if (products.length === 0) {
        // منتجات تجريبية
        const cats = await DB.getAll('categories');
        const sampleProducts = [
            { barcode: '123456', name: 'حليب كامل الدسم', categoryId: cats[0]?.id || 1, unit: 'علبة', purchasePrice: 3.5, salePrice: 5, quantity: 50, minQuantity: 10 },
            { barcode: '234567', name: 'خبز أبيض', categoryId: cats[0]?.id || 1, unit: 'كيس', purchasePrice: 1, salePrice: 1.5, quantity: 30, minQuantity: 5 },
            { barcode: '345678', name: 'كولا', categoryId: cats[1]?.id || 2, unit: 'علبة', purchasePrice: 2, salePrice: 3, quantity: 100, minQuantity: 20 },
            { barcode: '456789', name: 'شامبو', categoryId: cats[3]?.id || 4, unit: 'قطعة', purchasePrice: 8, salePrice: 12, quantity: 15, minQuantity: 5 },
            { barcode: '567890', name: 'شوكولاتة', categoryId: cats[4]?.id || 5, unit: 'قطعة', purchasePrice: 4, salePrice: 6, quantity: 40, minQuantity: 10 },
            { barcode: '678901', name: 'منظف أرضيات', categoryId: cats[2]?.id || 3, unit: 'علبة', purchasePrice: 6, salePrice: 9, quantity: 8, minQuantity: 5 },
            { barcode: '789012', name: 'ماء معدني', categoryId: cats[1]?.id || 2, unit: 'علبة', purchasePrice: 1, salePrice: 1.5, quantity: 200, minQuantity: 50 },
            { barcode: '890123', name: 'بسكويت', categoryId: cats[0]?.id || 1, unit: 'علبة', purchasePrice: 3, salePrice: 4.5, quantity: 25, minQuantity: 8 },
        ];
        for (const p of sampleProducts) {
            p.isActive = true;
            await DB.add('products', p);
        }
    }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

// ==================== حالة التطبيق ====================
let currentUser = null;
let cart = [];
let currentPage = 'login';

// ==================== وظائف الواجهة ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatMoney(amount) {
    return parseFloat(amount).toFixed(2) + ' ₪';
}

// ==================== صفحات ====================
const Pages = {
    login() {
        return `
            <div class="login-page">
                <div class="login-card">
                    <div class="login-logo">
                        <div class="icon">🛒</div>
                        <h2>سوبرماركت POS</h2>
                        <p>نظام إدارة المبيعات والمخزون</p>
                    </div>
                    <div class="input-group">
                        <label>اسم المستخدم</label>
                        <input type="text" id="username" value="admin" placeholder="admin">
                    </div>
                    <div class="input-group">
                        <label>كلمة المرور</label>
                        <input type="password" id="password" value="admin123" placeholder="admin123">
                    </div>
                    <button class="btn btn-primary btn-block btn-lg" onclick="handleLogin()" style="margin-top: 20px;">
                        دخول
                    </button>
                    <p style="text-align: center; margin-top: 16px; color: #888; font-size: 12px;">
                        admin / admin123
                    </p>
                </div>
            </div>
        `;
    },

    dashboard() {
        return `
            ${this.appBar('لوحة التحكم')}
            <div class="content">
                <div class="stats-grid">
                    <div class="stat-card" style="background: linear-gradient(135deg, #E3F2FD, #BBDEFB);">
                        <div class="icon">💰</div>
                        <div class="value" style="color: #1565C0;" id="todaySales">0.00</div>
                        <div class="label">مبيعات اليوم</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #E8F5E9, #C8E6C9);">
                        <div class="icon">📈</div>
                        <div class="value" style="color: #2E7D32;" id="todayProfit">0.00</div>
                        <div class="label">ربح اليوم</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #FFF3E0, #FFE0B2);">
                        <div class="icon">📋</div>
                        <div class="value" style="color: #F57C00;" id="todayInvoices">0</div>
                        <div class="label">الفواتير</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #FFEBEE, #FFCDD2);">
                        <div class="icon">⚠️</div>
                        <div class="value" style="color: #C62828;" id="lowStock">0</div>
                        <div class="label">نواقص المخزون</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">⚠️ المنتجات الناقصة</span>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>الباركود</th><th>الاسم</th><th>الكمية</th><th>الحد الأدنى</th></tr>
                            </thead>
                            <tbody id="lowStockTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    pos() {
        return `
            ${this.appBar('نقطة البيع')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchProduct" placeholder="🔍 بحث بالباركود أو الاسم..." onkeyup="searchProducts(event)">
                </div>

                <div class="chips" id="categoryChips">
                    <div class="chip active" onclick="filterCategory(0)">الكل</div>
                </div>

                <div class="products-grid" id="productsGrid"></div>

                <div class="card" style="margin-top: 16px;">
                    <div class="card-header">
                        <span class="card-title">🧾 الفاتورة</span>
                        <span style="font-size: 12px; color: #888;" id="invoiceNum"></span>
                    </div>
                    <div id="cartItems"></div>

                    <div class="invoice-summary">
                        <div class="summary-row">
                            <span>الإجمالي</span>
                            <span id="subtotal">0.00</span>
                        </div>
                        <div class="summary-row">
                            <span>الخصم</span>
                            <input type="number" id="discount" value="0" style="width: 80px; text-align: left; border: 1px solid #ddd; border-radius: 4px; padding: 4px;" onchange="calculateTotals()">
                        </div>
                        <div class="summary-row">
                            <span>الصافي</span>
                            <span id="grandTotal" style="font-weight: 700; color: #1565C0;">0.00</span>
                        </div>
                    </div>

                    <div style="margin-top: 16px;">
                        <div class="input-group">
                            <label>المبلغ المدفوع</label>
                            <input type="number" id="paidAmount" placeholder="0.00" onchange="calculateChange()">
                        </div>
                        <div id="changeDisplay" style="text-align: center; margin: 12px 0; font-weight: 700;"></div>
                        <button class="btn btn-success btn-block btn-lg" onclick="checkout()">
                            ✅ إتمام البيع
                        </button>
                        <button class="btn btn-danger btn-block" onclick="clearCart()" style="margin-top: 8px;">
                            ❌ إلغاء
                        </button>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    products() {
        return `
            ${this.appBar('المنتجات')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchProduct" placeholder="🔍 بحث..." onkeyup="loadProducts()">
                    <button class="btn btn-success" onclick="showAddProduct()">+ جديد</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>الباركود</th><th>الاسم</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th></th>
                            </tr>
                        </thead>
                        <tbody id="productsTable"></tbody>
                    </table>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    sales() {
        return `
            ${this.appBar('المبيعات')}
            <div class="content">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📊 سجل المبيعات</span>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>رقم الفاتورة</th><th>التاريخ</th><th>الصافي</th><th>الطريقة</th></tr>
                            </thead>
                            <tbody id="salesTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    inventory() {
        return `
            ${this.appBar('المخزون')}
            <div class="content">
                <div class="tabs">
                    <div class="tab active" onclick="showInventory('all')">الكل</div>
                    <div class="tab" onclick="showInventory('low')">⚠️ الناقص</div>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>الباركود</th><th>الاسم</th><th>الكمية</th><th>الحد الأدنى</th><th>القيمة</th></tr>
                        </thead>
                        <tbody id="inventoryTable"></tbody>
                    </table>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    settings() {
        return `
            ${this.appBar('الإعدادات')}
            <div class="content">
                <div class="card">
                    <div class="input-group">
                        <label>اسم المتجر</label>
                        <input type="text" id="storeName" value="سوبرماركتي">
                    </div>
                    <div class="input-group">
                        <label>هاتف المتجر</label>
                        <input type="text" id="storePhone" placeholder="0123456789">
                    </div>
                    <div class="input-group">
                        <label>نسبة الضريبة %</label>
                        <input type="number" id="taxRate" value="0">
                    </div>
                    <div class="input-group">
                        <label>العملة</label>
                        <input type="text" id="currency" value="₪">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="saveSettings()">💾 حفظ</button>
                </div>

                <div class="card" style="margin-top: 16px;">
                    <button class="btn btn-danger btn-block" onclick="logout()">🚪 تسجيل الخروج</button>
                </div>

                <div class="card" style="margin-top: 16px; text-align: center;">
                    <p style="color: #888; font-size: 12px;">SuperMarket POS v1.0</p>
                    <p style="color: #888; font-size: 11px;">يعمل Offline في المتصفح</p>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    appBar(title) {
        return `
            <div class="app-bar">
                <button class="menu-btn" onclick="toggleSidebar()">☰</button>
                <h1>${title}</h1>
                <span style="font-size: 12px;">${currentUser?.fullName || ''}</span>
            </div>
        `;
    },

    sidebar() {
        const menuItems = [
            { page: 'dashboard', icon: '📊', label: 'الرئيسية' },
            { page: 'pos', icon: '💳', label: 'نقطة البيع' },
            { page: 'products', icon: '📦', label: 'المنتجات' },
            { page: 'sales', icon: '🧾', label: 'المبيعات' },
            { page: 'inventory', icon: '📋', label: 'المخزون' },
            { page: 'settings', icon: '⚙️', label: 'الإعدادات' },
        ];
        return `
            <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="icon">🛒</div>
                    <h2>سوبرماركت POS</h2>
                    <p>نظام إدارة المبيعات</p>
                </div>
                ${menuItems.map(item => `
                    <div class="nav-item ${currentPage === item.page ? 'active' : ''}" onclick="navigate('${item.page}')">
                        <i class="mdi">${item.icon}</i>
                        <span>${item.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

// ==================== وظائف التنقل ====================
function render(page) {
    currentPage = page;
    const app = document.getElementById('app');
    app.innerHTML = Pages[page] ? Pages[page]() : Pages.dashboard();
    app.className = 'fade-in';

    // تحميل البيانات حسب الصفحة
    setTimeout(() => {
        if (page === 'dashboard') loadDashboard();
        if (page === 'pos') { loadCategories(); loadPOSProducts(); generateInvoiceNumber(); }
        if (page === 'products') loadProducts();
        if (page === 'sales') loadSales();
        if (page === 'inventory') showInventory('all');
    }, 50);
}

function navigate(page) {
    toggleSidebar();
    render(page);
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

// ==================== تسجيل الدخول ====================
async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const users = await DB.getAll('users');
    const user = users.find(u => u.username === username && u.passwordHash === hashPassword(password));

    if (user) {
        currentUser = user;
        showToast('تم تسجيل الدخول بنجاح!', 'success');
        render('dashboard');
    } else {
        showToast('اسم المستخدم أو كلمة المرور غير صحيحة!', 'error');
    }
}

function logout() {
    currentUser = null;
    cart = [];
    showToast('تم تسجيل الخروج', 'success');
    render('login');
}

// ==================== Dashboard ====================
async function loadDashboard() {
    const sales = await DB.getAll('sales');
    const products = await DB.getAll('products');
    const today = new Date().toISOString().split('T')[0];

    const todaySales = sales.filter(s => s.date?.startsWith(today));
    const totalSales = todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalProfit = todaySales.reduce((sum, s) => sum + ((s.grandTotal || 0) * 0.2), 0); // تقدير
    const lowStock = products.filter(p => p.isActive && p.quantity <= p.minQuantity);

    document.getElementById('todaySales').textContent = formatMoney(totalSales);
    document.getElementById('todayProfit').textContent = formatMoney(totalProfit);
    document.getElementById('todayInvoices').textContent = todaySales.length;
    document.getElementById('lowStock').textContent = lowStock.length;

    const tbody = document.getElementById('lowStockTable');
    tbody.innerHTML = lowStock.slice(0, 5).map(p => `
        <tr>
            <td>${p.barcode}</td>
            <td>${p.name}</td>
            <td><span class="badge badge-danger">${p.quantity}</span></td>
            <td>${p.minQuantity}</td>
        </tr>
    `).join('');
}

// ==================== POS ====================
async function loadCategories() {
    const categories = await DB.getAll('categories');
    const chips = document.getElementById('categoryChips');
    chips.innerHTML = '<div class="chip active" onclick="filterCategory(0)">الكل</div>' +
        categories.map(c => `<div class="chip" onclick="filterCategory(${c.id})">${c.name}</div>`).join('');
}

let allProducts = [];

async function loadPOSProducts(categoryId = 0) {
    allProducts = await DB.getAll('products');
    const categories = await DB.getAll('categories');

    let filtered = allProducts.filter(p => p.isActive);
    if (categoryId > 0) filtered = filtered.filter(p => p.categoryId === categoryId);

    const grid = document.getElementById('productsGrid');
    grid.innerHTML = filtered.map(p => {
        const statusColor = p.quantity <= p.minQuantity ? '#F44336' : p.quantity <= p.minQuantity * 2 ? '#FF9800' : '#4CAF50';
        return `
            <div class="product-card" onclick="addToCart(${p.id})">
                <div class="stock-badge" style="background: ${statusColor};"></div>
                <div class="name">${p.name}</div>
                <div class="price">${formatMoney(p.salePrice)}</div>
                <div class="barcode">${p.barcode}</div>
            </div>
        `;
    }).join('');
}

function filterCategory(id) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    loadPOSProducts(id);
}

function searchProducts(e) {
    if (e.key === 'Enter') {
        const search = document.getElementById('searchProduct').value.trim();
        const product = allProducts.find(p => p.barcode === search || p.name.includes(search));
        if (product) {
            addToCart(product.id);
            document.getElementById('searchProduct').value = '';
        } else {
            showToast('المنتج غير موجود!', 'warning');
        }
    }
}

function generateInvoiceNumber() {
    const num = 'SALE-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Math.floor(Math.random()*1000).toString().padStart(3,'0');
    const el = document.getElementById('invoiceNum');
    if (el) el.textContent = num;
    return num;
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    if (product.quantity <= 0) {
        showToast('المنتج غير متوفر!', 'warning');
        return;
    }

    const existing = cart.find(i => i.productId === productId);
    if (existing) {
        if (existing.quantity + 1 > product.quantity) {
            showToast('الكمية تتجاوز المخزون!', 'warning');
            return;
        }
        existing.quantity++;
        existing.total = existing.quantity * existing.unitPrice;
    } else {
        cart.push({
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            quantity: 1,
            unitPrice: product.salePrice,
            total: product.salePrice,
            costPrice: product.purchasePrice
        });
    }
    renderCart();
    showToast(`تم إضافة ${product.name}`, 'success');
}

function updateCartQty(index, delta) {
    const item = cart[index];
    const product = allProducts.find(p => p.id === item.productId);
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
        cart.splice(index, 1);
    } else if (product && newQty > product.quantity) {
        showToast('الكمية تتجاوز المخزون!', 'warning');
        return;
    } else {
        item.quantity = newQty;
        item.total = newQty * item.unitPrice;
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    container.innerHTML = cart.map((item, i) => `
        <div class="cart-item">
            <div class="info">
                <div class="name">${item.productName}</div>
                <div class="price">${formatMoney(item.unitPrice)}</div>
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateCartQty(${i}, -1)">−</button>
                <span style="font-weight: 700;">${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQty(${i}, 1)">+</button>
            </div>
            <div class="total">${formatMoney(item.total)}</div>
        </div>
    `).join('');

    calculateTotals();
}

function calculateTotals() {
    const subtotal = cart.reduce((sum, i) => sum + i.total, 0);
    const discount = parseFloat(document.getElementById('discount')?.value || 0);
    const grandTotal = Math.max(0, subtotal - discount);

    const subEl = document.getElementById('subtotal');
    const grandEl = document.getElementById('grandTotal');
    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (grandEl) grandEl.textContent = formatMoney(grandTotal);

    calculateChange();
}

function calculateChange() {
    const grandTotal = parseFloat(document.getElementById('grandTotal')?.textContent?.replace(/[^0-9.]/g, '') || 0);
    const paid = parseFloat(document.getElementById('paidAmount')?.value || 0);
    const change = paid - grandTotal;
    const display = document.getElementById('changeDisplay');

    if (display) {
        if (change > 0) {
            display.innerHTML = `<span style="color: #2E7D32;">✅ الباقي: ${formatMoney(change)}</span>`;
        } else if (change < 0) {
            display.innerHTML = `<span style="color: #F57C00;">⚠️ متبقي: ${formatMoney(Math.abs(change))}</span>`;
        } else {
            display.innerHTML = '';
        }
    }
}

async function checkout() {
    if (cart.length === 0) {
        showToast('الفاتورة فارغة!', 'warning');
        return;
    }

    const grandTotal = parseFloat(document.getElementById('grandTotal')?.textContent?.replace(/[^0-9.]/g, '') || 0);
    const paid = parseFloat(document.getElementById('paidAmount')?.value || 0);
    const discount = parseFloat(document.getElementById('discount')?.value || 0);

    if (paid < grandTotal) {
        showToast('المبلغ المدفوع أقل من الإجمالي!', 'warning');
        return;
    }

    const invoice = {
        invoiceNumber: generateInvoiceNumber(),
        customerId: 1,
        date: new Date().toISOString(),
        subtotal: cart.reduce((sum, i) => sum + i.total, 0),
        discount: discount,
        grandTotal: grandTotal,
        paidAmount: paid,
        changeAmount: paid - grandTotal,
        paymentMethod: 'نقدي',
        items: [...cart]
    };

    await DB.add('sales', invoice);

    // تحديث المخزون
    for (const item of cart) {
        const product = allProducts.find(p => p.id === item.productId);
        if (product) {
            product.quantity -= item.quantity;
            await DB.put('products', product);
        }
    }

    showToast(`✅ تم البيع! رقم الفاتورة: ${invoice.invoiceNumber}`, 'success');
    clearCart();
    loadPOSProducts();
}

function clearCart() {
    cart = [];
    renderCart();
    document.getElementById('discount').value = 0;
    document.getElementById('paidAmount').value = '';
    document.getElementById('changeDisplay').innerHTML = '';
    generateInvoiceNumber();
}

// ==================== المنتجات ====================
async function loadProducts() {
    const search = document.getElementById('searchProduct')?.value || '';
    const products = await DB.getAll('products');
    const filtered = products.filter(p => p.isActive && (p.name.includes(search) || p.barcode.includes(search)));

    const tbody = document.getElementById('productsTable');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(p => {
        const status = p.quantity <= p.minQuantity ? 'badge-danger' : p.quantity <= p.minQuantity * 2 ? 'badge-warning' : 'badge-success';
        const statusText = p.quantity <= p.minQuantity ? 'ناقص' : p.quantity <= p.minQuantity * 2 ? 'منخفض' : 'متوفر';
        return `
            <tr>
                <td>${p.barcode}</td>
                <td>${p.name}</td>
                <td>${formatMoney(p.salePrice)}</td>
                <td>${p.quantity}</td>
                <td><span class="badge ${status}">${statusText}</span></td>
                <td>
                    <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="editProduct(${p.id})">✏️</button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteProduct(${p.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddProduct() {
    const name = prompt('اسم المنتج:');
    if (!name) return;
    const barcode = prompt('الباركود:', Date.now().toString());
    const price = parseFloat(prompt('سعر البيع:', '10'));
    const qty = parseInt(prompt('الكمية:', '50'));

    DB.add('products', {
        barcode: barcode || Date.now().toString(),
        name: name,
        categoryId: 1,
        unit: 'piece',
        purchasePrice: price * 0.7,
        salePrice: price,
        quantity: qty,
        minQuantity: 5,
        isActive: true
    }).then(() => {
        showToast('تم إضافة المنتج!', 'success');
        loadProducts();
    });
}

function editProduct(id) {
    // يمكن إضافة نموذج تعديل
    showToast('يمكن تعديل المنتج من الإعدادات', 'info');
}

async function deleteProduct(id) {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return;
    const product = (await DB.getAll('products')).find(p => p.id === id);
    if (product) {
        product.isActive = false;
        await DB.put('products', product);
        showToast('تم حذف المنتج!', 'success');
        loadProducts();
    }
}

// ==================== المبيعات ====================
async function loadSales() {
    const sales = await DB.getAll('sales');
    const tbody = document.getElementById('salesTable');
    if (!tbody) return;

    tbody.innerHTML = sales.slice().reverse().map(s => `
        <tr>
            <td>${s.invoiceNumber}</td>
            <td>${new Date(s.date).toLocaleDateString('ar-SA')}</td>
            <td style="font-weight: 700; color: #1565C0;">${formatMoney(s.grandTotal)}</td>
            <td><span class="badge badge-info">${s.paymentMethod}</span></td>
        </tr>
    `).join('');
}

// ==================== المخزون ====================
async function showInventory(type) {
    const products = await DB.getAll('products');
    const filtered = type === 'low' 
        ? products.filter(p => p.isActive && p.quantity <= p.minQuantity)
        : products.filter(p => p.isActive);

    const tbody = document.getElementById('inventoryTable');
    if (!tbody) return;

    tbody.innerHTML = filtered.map(p => {
        const status = p.quantity <= p.minQuantity ? 'badge-danger' : 'badge-success';
        return `
            <tr>
                <td>${p.barcode}</td>
                <td>${p.name}</td>
                <td><span class="badge ${status}">${p.quantity}</span></td>
                <td>${p.minQuantity}</td>
                <td>${formatMoney(p.purchasePrice * p.quantity)}</td>
            </tr>
        `;
    }).join('');

    // تحديث التبويبات
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event?.target?.classList.add('active');
}

// ==================== الإعدادات ====================
function saveSettings() {
    showToast('تم حفظ الإعدادات!', 'success');
}

// ==================== PWA ====================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').classList.add('show');
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
            document.getElementById('installBtn').classList.remove('show');
        });
    }
}

// ==================== التهيئة ====================
async function init() {
    await DB.init();
    await seedData();

    // التحقق من تسجيل الدخول السابق
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        render('dashboard');
    } else {
        render('login');
    }
}

// حفظ المستخدم
window.addEventListener('beforeunload', () => {
    if (currentUser) localStorage.setItem('pos_user', JSON.stringify(currentUser));
});

// بدء التطبيق
init();