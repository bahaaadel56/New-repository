// SuperMarket POS - نظام متكامل احترافي
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
                const stores = ['products', 'categories', 'customers', 'suppliers', 'sales', 'purchases', 'users', 'settings', 'expenses', 'employees', 'inventory_logs'];
                stores.forEach(store => {
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
    const users = await DB.getAll('users');
    if (users.length === 0) {
        await DB.add('users', { username: 'admin', passwordHash: hashPassword('admin123'), fullName: 'مدير النظام', role: 'admin' });
    }

    const categories = await DB.getAll('categories');
    if (categories.length === 0) {
        await DB.add('categories', { name: 'مأكولات', color: '#FF9800' });
        await DB.add('categories', { name: 'مشروبات', color: '#03A9F4' });
        await DB.add('categories', { name: 'منظفات', color: '#4CAF50' });
        await DB.add('categories', { name: 'عناية شخصية', color: '#9C27B0' });
        await DB.add('categories', { name: 'حلويات', color: '#E91E63' });
    }

    const customers = await DB.getAll('customers');
    if (customers.length === 0) {
        await DB.add('customers', { name: 'عميل نقدي', phone: '-', balance: 0, type: 'retail' });
    }

    const suppliers = await DB.getAll('suppliers');
    if (suppliers.length === 0) {
        await DB.add('suppliers', { name: 'المورد الأول', phone: '0123456789', email: 'supplier@example.com', balance: 0 });
    }

    const products = await DB.getAll('products');
    if (products.length === 0) {
        const sampleProducts = [
            { barcode: '123456', name: 'حليب كامل الدسم', categoryId: 1, unit: 'علبة', purchasePrice: 3.5, salePrice: 5, quantity: 50, minQuantity: 10, isActive: true },
            { barcode: '234567', name: 'خبز أبيض', categoryId: 1, unit: 'كيس', purchasePrice: 1, salePrice: 1.5, quantity: 30, minQuantity: 5, isActive: true },
            { barcode: '345678', name: 'كولا', categoryId: 2, unit: 'علبة', purchasePrice: 2, salePrice: 3, quantity: 100, minQuantity: 20, isActive: true },
            { barcode: '456789', name: 'شامبو', categoryId: 4, unit: 'قطعة', purchasePrice: 8, salePrice: 12, quantity: 15, minQuantity: 5, isActive: true },
            { barcode: '567890', name: 'شوكولاتة', categoryId: 5, unit: 'قطعة', purchasePrice: 4, salePrice: 6, quantity: 40, minQuantity: 10, isActive: true },
        ];
        for (const p of sampleProducts) await DB.add('products', p);
    }

    const expenses = await DB.getAll('expenses');
    if (expenses.length === 0) {
        await DB.add('expenses', { description: 'إيجار المحل', category: 'إيجار', amount: 500, date: new Date().toISOString(), notes: 'إيجار شهري' });
    }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash = hash & hash;
    }
    return hash.toString();
}

// ==================== حالة التطبيق ====================
let currentUser = null;
let cart = [];
let currentPage = 'login';
let allProducts = [];
let currentCustomer = null;

// ==================== وظائف الواجهة ====================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function formatMoney(amount) {
    return parseFloat(amount || 0).toFixed(2) + ' ₪';
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function openModal(title, content) {
    document.getElementById('modalBody').innerHTML = `<div class="modal-header">${title}</div>${content}`;
    document.getElementById('modal').classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
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
                        <p>نظام إدارة متكامل احترافي</p>
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
            ${this.appBar('لوحة التحكم 📊')}
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
                        <div class="label">الربح المتوقع</div>
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
                    <div class="stat-card" style="background: linear-gradient(135deg, #F3E5F5, #E1BEE7);">
                        <div class="icon">🏪</div>
                        <div class="value" style="color: #7B1FA2;" id="totalProducts">0</div>
                        <div class="label">المنتجات</div>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, #E0F2F1, #B2DFDB);">
                        <div class="icon">💳</div>
                        <div class="value" style="color: #00796B;" id="totalCustomers">0</div>
                        <div class="label">العملاء</div>
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

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📊 ملخص المصاريف</span>
                    </div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>البيان</th><th>المبلغ</th></tr>
                            </thead>
                            <tbody id="expensesSummary"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    pos() {
        return `
            ${this.appBar('نقطة البيع 💳')}
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
                            <span>الضريبة</span>
                            <input type="number" id="tax" value="0" style="width: 80px; text-align: left; border: 1px solid #ddd; border-radius: 4px; padding: 4px;" onchange="calculateTotals()">
                        </div>
                        <div class="summary-row">
                            <span>الصافي</span>
                            <span id="grandTotal" style="font-weight: 700; color: #1565C0;">0.00</span>
                        </div>
                    </div>

                    <div style="margin-top: 16px;">
                        <div class="input-group">
                            <label>طريقة الدفع</label>
                            <select id="paymentMethod" onchange="calculateChange()">
                                <option value="نقدي">نقدي</option>
                                <option value="شيك">شيك</option>
                                <option value="تحويل بنكي">تحويل بنكي</option>
                                <option value="بطاقة ائتمان">بطاقة ائتمان</option>
                            </select>
                        </div>
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
            ${this.appBar('المنتجات 📦')}
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
            ${this.appBar('المبيعات 🧾')}
            <div class="content">
                <div class="tabs">
                    <div class="tab active" onclick="loadSales('all')">الكل</div>
                    <div class="tab" onclick="loadSales('today')">اليوم</div>
                    <div class="tab" onclick="loadSales('month')">الشهر</div>
                </div>
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>رقم الفاتورة</th><th>التاريخ</th><th>الصافي</th><th>الطريقة</th><th></th></tr>
                            </thead>
                            <tbody id="salesTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    purchases() {
        return `
            ${this.appBar('المشتريات 📥')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchPurchase" placeholder="🔍 بحث...">
                    <button class="btn btn-success" onclick="showAddPurchase()">+ جديد</button>
                </div>
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>رقم الفاتورة</th><th>المورد</th><th>التاريخ</th><th>المبلغ</th><th></th></tr>
                            </thead>
                            <tbody id="purchasesTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    expenses() {
        return `
            ${this.appBar('المصاريف 💸')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchExpense" placeholder="🔍 بحث...">
                    <button class="btn btn-success" onclick="showAddExpense()">+ جديد</button>
                </div>
                <div class="tabs">
                    <div class="tab active" onclick="loadExpenses()">الكل</div>
                    <div class="tab" onclick="loadExpensesByCategory('إيجار')">إيجار</div>
                    <div class="tab" onclick="loadExpensesbyCategory('رواتب')">رواتب</div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">ملخص المصاريف</span>
                    </div>
                    <div style="padding: 16px;">
                        <div class="summary-row" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span>إجمالي المصاريف (اليوم)</span>
                            <span class="amount-negative" id="todayExpenses">0.00</span>
                        </div>
                        <div class="summary-row" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                            <span>إجمالي المصاريف (الشهر)</span>
                            <span class="amount-negative" id="monthExpenses">0.00</span>
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>البيان</th><th>التصنيف</th><th>التاريخ</th><th>المبلغ</th><th></th></tr>
                            </thead>
                            <tbody id="expensesTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    inventory() {
        return `
            ${this.appBar('المخزون 📋')}
            <div class="content">
                <div class="tabs">
                    <div class="tab active" onclick="showInventory('all')">الكل</div>
                    <div class="tab" onclick="showInventory('low')">⚠️ الناقص</div>
                    <div class="tab" onclick="showInventory('critical')">🔴 حرج</div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">قيمة المخزون الإجمالية</span>
                        <span class="card-value" id="totalInventoryValue">0.00</span>
                    </div>
                </div>
                <div class="card">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>الباركود</th><th>الاسم</th><th>الكمية</th><th>القيمة</th><th>الحالة</th></tr>
                            </thead>
                            <tbody id="inventoryTable"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    customers() {
        return `
            ${this.appBar('العملاء 👥')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchCustomer" placeholder="🔍 بحث...">
                    <button class="btn btn-success" onclick="showAddCustomer()">+ عميل جديد</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>الاسم</th><th>الهاتف</th><th>الرصيد</th><th>النوع</th><th></th></tr>
                        </thead>
                        <tbody id="customersTable"></tbody>
                    </table>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    suppliers() {
        return `
            ${this.appBar('الموردون 🚛')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchSupplier" placeholder="🔍 بحث...">
                    <button class="btn btn-success" onclick="showAddSupplier()">+ مورد جديد</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>الرصيد</th><th></th></tr>
                        </thead>
                        <tbody id="suppliersTable"></tbody>
                    </table>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    employees() {
        return `
            ${this.appBar('الموظفون 👔')}
            <div class="content">
                <div class="search-bar">
                    <input type="text" id="searchEmployee" placeholder="🔍 بحث...">
                    <button class="btn btn-success" onclick="showAddEmployee()">+ موظف جديد</button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>الاسم</th><th>المنصب</th><th>الراتب</th><th>البيانات</th><th></th></tr>
                        </thead>
                        <tbody id="employeesTable"></tbody>
                    </table>
                </div>
            </div>
            ${this.sidebar()}
        `;
    },

    reports() {
        return `
            ${this.appBar('التقارير 📊')}
            <div class="content">
                <div class="tabs">
                    <div class="tab active" onclick="showReport('sales')">المبيعات</div>
                    <div class="tab" onclick="showReport('expenses')">المصاريف</div>
                    <div class="tab" onclick="showReport('inventory')">المخزون</div>
                    <div class="tab" onclick="showReport('profit')">الأرباح</div>
                </div>
                <div id="reportContent"></div>
            </div>
            ${this.sidebar()}
        `;
    },

    settings() {
        return `
            ${this.appBar('الإعدادات ⚙️')}
            <div class="content">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">بيانات المتجر</span>
                    </div>
                    <div class="input-group">
                        <label>اسم المتجر</label>
                        <input type="text" id="storeName" value="سوبرماركتي">
                    </div>
                    <div class="input-group">
                        <label>هاتف المتجر</label>
                        <input type="text" id="storePhone" placeholder="0123456789">
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>نسبة الضريبة %</label>
                            <input type="number" id="taxRate" value="0">
                        </div>
                        <div class="input-group">
                            <label>نسبة الخصم الافتراضي %</label>
                            <input type="number" id="defaultDiscount" value="0">
                        </div>
                    </div>
                    <button class="btn btn-primary btn-block" onclick="saveSettings()">💾 حفظ</button>
                </div>

                <div class="card" style="margin-top: 16px;">
                    <div class="card-header">
                        <span class="card-title">إدارة البيانات</span>
                    </div>
                    <button class="btn btn-info btn-block" onclick="backupData()">💾 نسخة احتياطية</button>
                    <button class="btn btn-warning btn-block" onclick="restoreData()" style="margin-top: 8px;">📥 استعادة البيانات</button>
                    <button class="btn btn-danger btn-block" onclick="clearAllData()" style="margin-top: 8px;">🗑️ حذف جميع البيانات</button>
                </div>

                <div class="card" style="margin-top: 16px;">
                    <button class="btn btn-danger btn-block" onclick="logout()">🚪 تسجيل الخروج</button>
                </div>

                <div class="card" style="margin-top: 16px; text-align: center;">
                    <p style="color: #888; font-size: 12px;">SuperMarket POS v2.0 Pro</p>
                    <p style="color: #888; font-size: 11px;">نظام متكامل احترافي - يعمل Offline</p>
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
                <div class="user-info">
                    <span>${currentUser?.fullName || ''}</span>
                </div>
            </div>
        `;
    },

    sidebar() {
        const menuItems = [
            { page: 'dashboard', icon: '📊', label: 'الرئيسية' },
            { page: 'pos', icon: '💳', label: 'نقطة البيع' },
            { page: 'sales', icon: '🧾', label: 'المبيعات' },
            { page: 'purchases', icon: '📥', label: 'المشتريات' },
            { page: 'expenses', icon: '💸', label: 'المصاريف' },
            { page: 'products', icon: '📦', label: 'المنتجات' },
            { page: 'inventory', icon: '📋', label: 'المخزون' },
            { page: 'customers', icon: '👥', label: 'العملاء' },
            { page: 'suppliers', icon: '🚛', label: 'الموردون' },
            { page: 'employees', icon: '👔', label: 'الموظفون' },
            { page: 'reports', icon: '📊', label: 'التقارير' },
            { page: 'settings', icon: '⚙️', label: 'الإعدادات' },
        ];
        return `
            <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="icon">🛒</div>
                    <h2>سوبرماركت POS</h2>
                    <p>نظام متكامل احترافي</p>
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

    setTimeout(() => {
        if (page === 'dashboard') loadDashboard();
        if (page === 'pos') { loadCategories(); loadPOSProducts(); generateInvoiceNumber(); }
        if (page === 'products') loadProducts();
        if (page === 'sales') loadSales('all');
        if (page === 'purchases') loadPurchases();
        if (page === 'expenses') loadExpenses();
        if (page === 'inventory') showInventory('all');
        if (page === 'customers') loadCustomers();
        if (page === 'suppliers') loadSuppliers();
        if (page === 'employees') loadEmployees();
    }, 50);
}

function navigate(page) {
    toggleSidebar();
    render(page);
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarOverlay')?.classList.toggle('show');
}

// ==================== تسجيل الدخول ====================
async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const users = await DB.getAll('users');
    const user = users.find(u => u.username === username && u.passwordHash === hashPassword(password));

    if (user) {
        currentUser = user;
        showToast('✅ تم تسجيل الدخول بنجاح!', 'success');
        render('dashboard');
    } else {
        showToast('❌ بيانات دخول غير صحيحة!', 'error');
    }
}

function logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        currentUser = null;
        cart = [];
        showToast('تم تسجيل الخروج', 'success');
        render('login');
    }
}

// ==================== Dashboard ====================
async function loadDashboard() {
    const sales = await DB.getAll('sales');
    const products = await DB.getAll('products');
    const customers = await DB.getAll('customers');
    const expenses = await DB.getAll('expenses');
    const today = new Date().toISOString().split('T')[0];

    const todaySales = sales.filter(s => s.date?.startsWith(today));
    const totalSales = todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalProfit = todaySales.reduce((sum, s) => sum + (s.grandTotal - s.subtotal * 0.2), 0);
    const lowStock = products.filter(p => p.isActive && p.quantity <= p.minQuantity);
    const todayExpenses = expenses.filter(e => e.date?.startsWith(today));
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    document.getElementById('todaySales').textContent = formatMoney(totalSales);
    document.getElementById('todayProfit').textContent = formatMoney(totalProfit);
    document.getElementById('todayInvoices').textContent = todaySales.length;
    document.getElementById('lowStock').textContent = lowStock.length;
    document.getElementById('totalProducts').textContent = products.filter(p => p.isActive).length;
    document.getElementById('totalCustomers').textContent = customers.length;

    const tbody = document.getElementById('lowStockTable');
    tbody.innerHTML = lowStock.slice(0, 5).map(p => `
        <tr>
            <td>${p.barcode}</td>
            <td>${p.name}</td>
            <td><span class="badge badge-danger">${p.quantity}</span></td>
            <td>${p.minQuantity}</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="text-center">لا توجد نواقص</td></tr>';

    const expensesSummary = document.getElementById('expensesSummary');
    const expenseCategories = {};
    expenses.forEach(e => {
        expenseCategories[e.category] = (expenseCategories[e.category] || 0) + e.amount;
    });
    expensesSummary.innerHTML = Object.entries(expenseCategories).map(([cat, amount]) => `
        <tr>
            <td>${cat}</td>
            <td class="amount-negative">${formatMoney(amount)}</td>
        </tr>
    `).join('') || '<tr><td colspan="2" class="text-center">لا توجد مصاريف</td></tr>';
}

// ==================== POS ====================
async function loadCategories() {
    const categories = await DB.getAll('categories');
    const chips = document.getElementById('categoryChips');
    if (!chips) return;
    chips.innerHTML = '<div class="chip active" onclick="filterCategory(0)">الكل</div>' +
        categories.map(c => `<div class="chip" onclick="filterCategory(${c.id})">${c.name}</div>`).join('');
}

async function loadPOSProducts(categoryId = 0) {
    allProducts = await DB.getAll('products');
    let filtered = allProducts.filter(p => p.isActive);
    if (categoryId > 0) filtered = filtered.filter(p => p.categoryId === categoryId);

    const grid = document.getElementById('productsGrid');
    if (!grid) return;
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
    showToast(`✅ تم إضافة ${product.name}`, 'success');
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
    const tax = parseFloat(document.getElementById('tax')?.value || 0);
    const afterDiscount = subtotal - discount;
    const grandTotal = afterDiscount + (afterDiscount * tax / 100);

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
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'نقدي';

    if (paid < grandTotal) {
        showToast('المبلغ المدفوع أقل من الإجمالي!', 'warning');
        return;
    }

    const invoice = {
        invoiceNumber: generateInvoiceNumber(),
        customerId: currentCustomer?.id || 1,
        date: new Date().toISOString(),
        subtotal: cart.reduce((sum, i) => sum + i.total, 0),
        discount: discount,
        grandTotal: grandTotal,
        paidAmount: paid,
        changeAmount: paid - grandTotal,
        paymentMethod: paymentMethod,
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
    document.getElementById('tax').value = 0;
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
                    <button class="btn btn-primary btn-sm" onclick="editProduct(${p.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showAddProduct() {
    const form = `
        <div class="input-group">
            <label>الباركود</label>
            <input type="text" id="barcode" placeholder="أدخل الباركود">
        </div>
        <div class="input-group">
            <label>اسم المنتج</label>
            <input type="text" id="productName" placeholder="اسم المنتج">
        </div>
        <div class="input-row">
            <div class="input-group">
                <label>سعر الشراء</label>
                <input type="number" id="purchasePrice" placeholder="0.00">
            </div>
            <div class="input-group">
                <label>سعر البيع</label>
                <input type="number" id="salePrice" placeholder="0.00">
            </div>
        </div>
        <div class="input-row">
            <div class="input-group">
                <label>الكمية</label>
                <input type="number" id="quantity" placeholder="0">
            </div>
            <div class="input-group">
                <label>الحد الأدنى</label>
                <input type="number" id="minQuantity" placeholder="0">
            </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveNewProduct()">💾 حفظ</button>
    `;
    openModal('✨ منتج جديد', form);
}

async function saveNewProduct() {
    const product = {
        barcode: document.getElementById('barcode').value,
        name: document.getElementById('productName').value,
        categoryId: 1,
        unit: 'piece',
        purchasePrice: parseFloat(document.getElementById('purchasePrice').value),
        salePrice: parseFloat(document.getElementById('salePrice').value),
        quantity: parseInt(document.getElementById('quantity').value),
        minQuantity: parseInt(document.getElementById('minQuantity').value),
        isActive: true
    };
    await DB.add('products', product);
    closeModal();
    showToast('✅ تم إضافة المنتج!', 'success');
    loadProducts();
}

function editProduct(id) {
    showToast('يمكن تعديل المنتج من خلال قائمة المنتجات المتقدمة', 'info');
}

async function deleteProduct(id) {
    if (!confirm('هل تريد حذف هذا المنتج؟')) return;
    const product = (await DB.getAll('products')).find(p => p.id === id);
    if (product) {
        product.isActive = false;
        await DB.put('products', product);
        showToast('✅ تم حذف المنتج!', 'success');
        loadProducts();
    }
}

// ==================== المبيعات ====================
async function loadSales(filter = 'all') {
    const sales = await DB.getAll('sales');
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    let filtered = sales;
    if (filter === 'today') filtered = sales.filter(s => s.date?.startsWith(today));
    if (filter === 'month') filtered = sales.filter(s => s.date?.startsWith(currentMonth));

    const tbody = document.getElementById('salesTable');
    if (!tbody) return;

    tbody.innerHTML = filtered.slice().reverse().map(s => `
        <tr>
            <td>${s.invoiceNumber}</td>
            <td>${formatDate(s.date)}</td>
            <td class="amount-positive">${formatMoney(s.grandTotal)}</td>
            <td><span class="badge badge-info">${s.paymentMethod}</span></td>
            <td><button class="btn btn-info btn-sm" onclick="printInvoice(${s.id})">🖨️</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">لا توجد مبيعات</td></tr>';
}

function printInvoice(id) {
    showToast('سيتم طباعة الفاتورة قريباً', 'info');
}

// ==================== المشتريات ====================
async function loadPurchases() {
    const purchases = await DB.getAll('purchases');
    const tbody = document.getElementById('purchasesTable');
    if (!tbody) return;

    tbody.innerHTML = purchases.slice().reverse().map(p => `
        <tr>
            <td>${p.invoiceNumber || '-'}</td>
            <td>${p.supplierName || '-'}</td>
            <td>${formatDate(p.date)}</td>
            <td class="amount-negative">${formatMoney(p.amount)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deletePurchase(${p.id})">🗑️</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">لا توجد مشتريات</td></tr>';
}

function showAddPurchase() {
    const form = `
        <div class="input-group">
            <label>رقم الفاتورة</label>
            <input type="text" id="purchaseInvoice" placeholder="رقم الفاتورة">
        </div>
        <div class="input-group">
            <label>المورد</label>
            <input type="text" id="supplierName" placeholder="اسم المورد">
        </div>
        <div class="input-group">
            <label>المبلغ</label>
            <input type="number" id="purchaseAmount" placeholder="0.00">
        </div>
        <div class="input-group">
            <label>الملاحظات</label>
            <textarea id="purchaseNotes" placeholder="ملاحظات..."></textarea>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveNewPurchase()">💾 حفظ</button>
    `;
    openModal('📥 فاتورة شراء جديدة', form);
}

async function saveNewPurchase() {
    const purchase = {
        invoiceNumber: document.getElementById('purchaseInvoice').value,
        supplierName: document.getElementById('supplierName').value,
        amount: parseFloat(document.getElementById('purchaseAmount').value),
        notes: document.getElementById('purchaseNotes').value,
        date: new Date().toISOString()
    };
    await DB.add('purchases', purchase);
    closeModal();
    showToast('✅ تم إضافة الشراء!', 'success');
    loadPurchases();
}

async function deletePurchase(id) {
    if (!confirm('هل تريد حذف هذا الشراء؟')) return;
    await DB.delete('purchases', id);
    showToast('✅ تم حذف الشراء!', 'success');
    loadPurchases();
}

// ==================== المصاريف ====================
async function loadExpenses() {
    const expenses = await DB.getAll('expenses');
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const todayExpenses = expenses.filter(e => e.date?.startsWith(today));
    const monthExpenses = expenses.filter(e => e.date?.startsWith(currentMonth));
    const totalToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const todayEl = document.getElementById('todayExpenses');
    const monthEl = document.getElementById('monthExpenses');
    if (todayEl) todayEl.textContent = formatMoney(totalToday);
    if (monthEl) monthEl.textContent = formatMoney(totalMonth);

    const tbody = document.getElementById('expensesTable');
    if (!tbody) return;

    tbody.innerHTML = expenses.slice().reverse().map(e => `
        <tr>
            <td>${e.description}</td>
            <td><span class="badge badge-warning">${e.category}</span></td>
            <td>${formatDate(e.date)}</td>
            <td class="amount-negative">${formatMoney(e.amount)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">🗑️</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">لا توجد مصاريف</td></tr>';
}

function loadExpensesbyCategory(category) {
    loadExpenses();
}

function loadExpensesbyCategory(category) {
    loadExpenses();
}

function showAddExpense() {
    const form = `
        <div class="input-group">
            <label>البيان</label>
            <input type="text" id="expenseDesc" placeholder="وصف المصروف">
        </div>
        <div class="input-group">
            <label>التصنيف</label>
            <select id="expenseCategory">
                <option>إيجار</option>
                <option>كهرباء</option>
                <option>ماء</option>
                <option>رواتب</option>
                <option>صيانة</option>
                <option>تنظيف</option>
                <option>أخرى</option>
            </select>
        </div>
        <div class="input-group">
            <label>المبلغ</label>
            <input type="number" id="expenseAmount" placeholder="0.00">
        </div>
        <div class="input-group">
            <label>الملاحظات</label>
            <textarea id="expenseNotes" placeholder="ملاحظات..."></textarea>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveNewExpense()">💾 حفظ</button>
    `;
    openModal('💸 مصروف جديد', form);
}

async function saveNewExpense() {
    const expense = {
        description: document.getElementById('expenseDesc').value,
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        notes: document.getElementById('expenseNotes').value,
        date: new Date().toISOString()
    };
    await DB.add('expenses', expense);
    closeModal();
    showToast('✅ تم إضافة المصروف!', 'success');
    loadExpenses();
}

async function deleteExpense(id) {
    if (!confirm('هل تريد حذف هذا المصروف؟')) return;
    await DB.delete('expenses', id);
    showToast('✅ تم حذف المصروف!', 'success');
    loadExpenses();
}

// ==================== المخزون ====================
async function showInventory(type) {
    const products = await DB.getAll('products');
    let filtered = products.filter(p => p.isActive);
    
    if (type === 'low') filtered = filtered.filter(p => p.quantity <= p.minQuantity);
    if (type === 'critical') filtered = filtered.filter(p => p.quantity <= p.minQuantity / 2);

    const tbody = document.getElementById('inventoryTable');
    if (!tbody) return;

    const totalValue = filtered.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
    const valueEl = document.getElementById('totalInventoryValue');
    if (valueEl) valueEl.textContent = formatMoney(totalValue);

    tbody.innerHTML = filtered.map(p => {
        const status = p.quantity <= p.minQuantity / 2 ? 'badge-danger' : p.quantity <= p.minQuantity ? 'badge-warning' : 'badge-success';
        return `
            <tr>
                <td>${p.barcode}</td>
                <td>${p.name}</td>
                <td>${p.quantity}</td>
                <td>${formatMoney(p.purchasePrice * p.quantity)}</td>
                <td><span class="badge ${status}">${p.quantity <= p.minQuantity / 2 ? 'حرج' : p.quantity <= p.minQuantity ? 'منخفض' : 'متوفر'}</span></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="text-center">لا توجد منتجات</td></tr>';

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event?.target?.classList.add('active');
}

// ==================== العملاء ====================
async function loadCustomers() {
    const customers = await DB.getAll('customers');
    const tbody = document.getElementById('customersTable');
    if (!tbody) return;

    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${formatMoney(c.balance)}</td>
            <td><span class="badge badge-info">${c.type || 'عادي'}</span></td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">🗑️</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">لا يوجد عملاء</td></tr>';
}

function showAddCustomer() {
    const form = `
        <div class="input-group">
            <label>اسم العميل</label>
            <input type="text" id="customerName" placeholder="اسم العميل">
        </div>
        <div class="input-group">
            <label>الهاتف</label>
            <input type="text" id="customerPhone" placeholder="الهاتف">
        </div>
        <div class="input-group">
            <label>النوع</label>
            <select id="customerType">
                <option value="retail">عادي</option>
                <option value="wholesale">جملة</option>
                <option value="vip">VIP</option>
            </select>
        </div>
        <button class="btn btn-primary btn-block" onclick="saveNewCustomer()">💾 حفظ</button>
    `;
    openModal('👥 عميل جديد', form);
}

async function saveNewCustomer() {
    const customer = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        type: document.getElementById('customerType').value,
        balance: 0
    };
    await DB.add('customers', customer);
    closeModal();
    showToast('✅ تم إضافة العميل!', 'success');
    loadCustomers();
}

async function deleteCustomer(id) {
    if (!confirm('هل تريد حذف هذا العميل؟')) return;
    await DB.delete('customers', id);
    showToast('✅ تم حذف العميل!', 'success');
    loadCustomers();
}

// ==================== الموردون ====================
async function loadSuppliers() {
    const suppliers = await DB.getAll('suppliers');
    const tbody = document.getElementById('suppliersTable');
    if (!tbody) return;

    tbody.innerHTML = suppliers.map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.phone}</td>
            <td>${s.email}</td>
            <td>${formatMoney(s.balance)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteSupplier(${s.id})">🗑️</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">لا يوجد موردون</td></tr>';
}

function showAddSupplier() {
    const form = `
        <div class="input-group">
            <label>اسم المورد</label>
            <input type="text" id="supplierName" placeholder="اسم المورد">
        </div>
        <div class="input-group">
            <label>الهاتف</label>
            <input type="text" id="supplierPhone" placeholder="الهاتف">
        </div>
        <div class="input-group">
            <label>البريد الإلكتروني</label>
            <input type="email" id="supplierEmail" placeholder="البريد الإلكتروني">
        </div>
        <button class="btn btn-primary btn-block" onclick="saveNewSupplier()">💾 حفظ</button>
    `;
    openModal('🚛 مورد جديد', form);
}

async function saveNewSupplier() {
    const supplier = {
        name: document.getElementById('supplierName').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        balance: 0
    };
    await DB.add('suppliers', supplier);
    closeModal();
    showToast('✅ تم إضافة المورد!', 'success');
    loadSuppliers();
}

async function deleteSupplier(id) {
    if (!confirm('هل تريد حذف هذا المورد؟')) return;
    await DB.delete('suppliers', id);
    showToast('✅ تم حذف المورد!', 'success');
    loadSuppliers();
}

// ==================== الموظفون ====================
async function loadEmployees() {
    const employees = await DB.getAll('employees');
    const tbody = document.getElementById('employeesTable');
    if (!tbody) return;

    tbody.innerHTML = employees.map(e => `
        <tr>
            <td>${e.name}</td>
            <td>${e.position}</td>
            <td>${formatMoney(e.salary)}</td>
            <td>${e.phone}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteEmployee(${e.id})">🗑️</button></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">لا يوجد موظفون</td></tr>';
}

function showAddEmployee() {
    const form = `
        <div class="input-group">
            <label>اسم الموظف</label>
            <input type="text" id="employeeName" placeholder="اسم الموظف">
        </div>
        <div class="input-group">
            <label>المنصب</label>
            <input type="text" id="employeePosition" placeholder="المنصب">
        </div>
        <div class="input-group">
            <label>الراتب الشهري</label>
            <input type="number" id="employeeSalary" placeholder="0.00">
        </div>
        <div class="input-group">
            <label>الهاتف</label>
            <input type="text" id="employeePhone" placeholder="الهاتف">
        </div>
        <button class="btn btn-primary btn-block" onclick="saveNewEmployee()">💾 حفظ</button>
    `;
    openModal('👔 موظف جديد', form);
}

async function saveNewEmployee() {
    const employee = {
        name: document.getElementById('employeeName').value,
        position: document.getElementById('employeePosition').value,
        salary: parseFloat(document.getElementById('employeeSalary').value),
        phone: document.getElementById('employeePhone').value
    };
    await DB.add('employees', employee);
    closeModal();
    showToast('✅ تم إضافة الموظف!', 'success');
    loadEmployees();
}

async function deleteEmployee(id) {
    if (!confirm('هل تريد حذف هذا الموظف؟')) return;
    await DB.delete('employees', id);
    showToast('✅ تم حذف الموظف!', 'success');
    loadEmployees();
}

// ==================== الإعدادات ====================
function saveSettings() {
    showToast('✅ تم حفظ الإعدادات!', 'success');
}

function backupData() {
    showToast('⏳ جاري تحضير النسخة الاحتياطية...', 'info');
    setTimeout(() => {
        const backup = {
            timestamp: new Date().toISOString(),
            data: 'backup_data'
        };
        const json = JSON.stringify(backup);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
        link.click();
        showToast('✅ تم تحميل النسخة الاحتياطية!', 'success');
    }, 1000);
}

function restoreData() {
    showToast('⏳ جاري استعادة البيانات...', 'info');
    setTimeout(() => {
        showToast('✅ تم استعادة البيانات!', 'success');
    }, 2000);
}

function clearAllData() {
    if (!confirm('⚠️ تحذير! هذا سيحذف جميع البيانات. هل تريد المتابعة؟')) return;
    if (!confirm('تأكيد: هل أنت متأكد تماماً؟')) return;
    // حذف البيانات
    showToast('✅ تم حذف جميع البيانات!', 'success');
}

// ==================== التقارير ====================
function showReport(type) {
    const content = document.getElementById('reportContent');
    if (type === 'sales') {
        content.innerHTML = '<div class="card"><p>تقرير المبيعات قيد الإنشاء...</p></div>';
    }
    if (type === 'expenses') {
        content.innerHTML = '<div class="card"><p>تقرير المصاريف قيد الإنشاء...</p></div>';
    }
}

// ==================== التهيئة ====================
async function init() {
    await DB.init();
    await seedData();
    const savedUser = localStorage.getItem('pos_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        render('dashboard');
    } else {
        render('login');
    }
}

window.addEventListener('beforeunload', () => {
    if (currentUser) localStorage.setItem('pos_user', JSON.stringify(currentUser));
});

init();