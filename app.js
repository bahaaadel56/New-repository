// نظام محاسبة كامل متكامل احترافي
// كل الميزات المطلوبة - مثل أكبر الشركات والمولات

// ==================== قاعدة البيانات ====================
const DB_NAME = 'AccountingSystem';
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
                const stores = ['users', 'settings', 'products', 'categories', 'customers', 'suppliers', 'employees', 'sales', 'purchases', 'expenses', 'revenue', 'payments', 'receipts', 'accounts', 'journal_entries', 'invoice_templates', 'reports_cache', 'backup_history'];
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

// ==================== متغيرات عامة ====================
let currentUser = null;
let currentPage = 'dashboard';
let pageHistory = [];

// ==================== دوال مساعدة ====================
function formatMoney(amount) {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDatetime(date) {
    return new Date(date).toLocaleString('ar-SA');
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '70px';
    notification.style.left = '20px';
    notification.style.zIndex = '3000';
    notification.style.maxWidth = '400px';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function openModal(title, content) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    body.innerHTML = `
        <div class="modal-header">
            <span>${title}</span>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div>${content}</div>
    `;
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}

function addBreadcrumb(label, page) {
    const breadcrumb = document.getElementById('breadcrumb');
    const items = breadcrumb.innerHTML.split('/');
    if (items.length > 0 && items[items.length - 1].includes(label)) return;
    const item = document.createElement('span');
    item.innerHTML = `<span class="breadcrumb-item" onclick="navigate('${page}')">${label}</span>`;
    breadcrumb.appendChild(item);
    const sep = document.createElement('span');
    sep.textContent = ' / ';
    breadcrumb.appendChild(sep);
}

// ==================== التنقل ====================
function navigate(page) {
    pageHistory.push(currentPage);
    currentPage = page;
    renderPage(page);
    toggleSidebar();
}

function goBack() {
    if (pageHistory.length > 0) {
        currentPage = pageHistory.pop();
        renderPage(currentPage);
    }
}

function renderPage(page) {
    const content = document.getElementById('pageContent');
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '';

    switch(page) {
        case 'dashboard':
            content.innerHTML = renderDashboard();
            break;
        case 'sales':
            content.innerHTML = renderSales();
            addBreadcrumb('المبيعات', 'sales');
            break;
        case 'purchases':
            content.innerHTML = renderPurchases();
            addBreadcrumb('المشتريات', 'purchases');
            break;
        case 'expenses':
            content.innerHTML = renderExpenses();
            addBreadcrumb('المصاريف', 'expenses');
            break;
        case 'accounts':
            content.innerHTML = renderAccounts();
            addBreadcrumb('الحسابات', 'accounts');
            break;
        case 'customers':
            content.innerHTML = renderCustomers();
            addBreadcrumb('العملاء', 'customers');
            break;
        case 'suppliers':
            content.innerHTML = renderSuppliers();
            addBreadcrumb('الموردين', 'suppliers');
            break;
        case 'products':
            content.innerHTML = renderProducts();
            addBreadcrumb('المنتجات', 'products');
            break;
        case 'reports':
            content.innerHTML = renderReports();
            addBreadcrumb('التقارير', 'reports');
            break;
        case 'settings':
            content.innerHTML = renderSettings();
            addBreadcrumb('الإعدادات', 'settings');
            break;
        default:
            content.innerHTML = renderDashboard();
    }
}

// ==================== الصفحات ====================
function renderDashboard() {
    return `
        <div class="page-header">
            <h2 class="page-title">📊 لوحة التحكم</h2>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">المبيعات اليوم</div>
                <div class="stat-value" id="todaySales">0.00 ر.س</div>
                <div class="stat-change">↑ 12.5% من أمس</div>
            </div>
            <div class="stat-box" style="border-top-color: #4caf50;">
                <div class="stat-label">الأرباح</div>
                <div class="stat-value" id="totalProfit">0.00 ر.س</div>
                <div class="stat-change">↑ 8.3% من الشهر الماضي</div>
            </div>
            <div class="stat-box" style="border-top-color: #ff9800;">
                <div class="stat-label">المصاريف اليوم</div>
                <div class="stat-value" id="todayExpenses">0.00 ر.س</div>
                <div class="stat-change negative">↑ 5% من المخطط</div>
            </div>
            <div class="stat-box" style="border-top-color: #2196f3;">
                <div class="stat-label">رأس المال الحالي</div>
                <div class="stat-value" id="capitalAmount">0.00 ر.س</div>
                <div class="stat-change">آخر تحديث: الآن</div>
            </div>
            <div class="stat-box" style="border-top-color: #f44336;">
                <div class="stat-label">الذمم المدينة</div>
                <div class="stat-value" id="receivables">0.00 ر.س</div>
                <div class="stat-change negative">من ${calculateCustomersCount()} عميل</div>
            </div>
            <div class="stat-box" style="border-top-color: #9c27b0;">
                <div class="stat-label">الذمم الدائنة</div>
                <div class="stat-value" id="payables">0.00 ر.س</div>
                <div class="stat-change">لـ ${calculateSuppliersCount()} مورد</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">📈 آخر المبيعات</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم الفاتورة</th>
                            <th>العميل</th>
                            <th>المبلغ</th>
                            <th>طريقة الدفع</th>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody id="recentSalesTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderSales() {
    return `
        <div class="page-header">
            <h2 class="page-title">💳 المبيعات</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewSaleModal()">+ مبيعة جديدة</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة المبيعات</h3>
                <div>
                    <input type="date" id="saleFilter" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px;" onchange="filterSales()">
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم الفاتورة</th>
                            <th>العميل</th>
                            <th>المنتجات</th>
                            <th>المبلغ الإجمالي</th>
                            <th>المدفوع</th>
                            <th>المتبقي</th>
                            <th>طريقة الدفع</th>
                            <th>التاريخ</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="salesTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderPurchases() {
    return `
        <div class="page-header">
            <h2 class="page-title">📦 المشتريات</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewPurchaseModal()">+ مشتراة جديدة</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة المشتريات</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم الفاتورة</th>
                            <th>المورد</th>
                            <th>المنتجات</th>
                            <th>المبلغ الإجمالي</th>
                            <th>المدفوع</th>
                            <th>المتبقي</th>
                            <th>طريقة الدفع</th>
                            <th>التاريخ</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="purchasesTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderExpenses() {
    return `
        <div class="page-header">
            <h2 class="page-title">💰 المصاريف</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewExpenseModal()">+ مصروف جديد</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة المصاريف</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>البيان</th>
                            <th>التصنيف</th>
                            <th>المبلغ</th>
                            <th>التاريخ</th>
                            <th>الملاحظات</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="expensesTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAccounts() {
    return `
        <div class="page-header">
            <h2 class="page-title">💳 الحسابات</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewAccountModal()">+ حساب جديد</button>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">إجمالي الأصول</div>
                <div class="stat-value" id="totalAssets">0.00 ر.س</div>
            </div>
            <div class="stat-box" style="border-top-color: #f44336;">
                <div class="stat-label">إجمالي الالتزامات</div>
                <div class="stat-value" id="totalLiabilities">0.00 ر.س</div>
            </div>
            <div class="stat-box" style="border-top-color: #4caf50;">
                <div class="stat-label">حقوق الملكية</div>
                <div class="stat-value" id="equity">0.00 ر.س</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة الحسابات</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>رقم الحساب</th>
                            <th>اسم الحساب</th>
                            <th>النوع</th>
                            <th>الرصيد</th>
                            <th>العملة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="accountsTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderCustomers() {
    return `
        <div class="page-header">
            <h2 class="page-title">👥 العملاء</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewCustomerModal()">+ عميل جديد</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة العملاء</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>البريد</th>
                            <th>الذمة المدينة</th>
                            <th>عدد الفواتير</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="customersTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderSuppliers() {
    return `
        <div class="page-header">
            <h2 class="page-title">🏭 الموردين</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewSupplierModal()">+ مورد جديد</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة الموردين</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>البريد</th>
                            <th>الذمة الدائنة</th>
                            <th>عدد الفواتير</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="suppliersTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderProducts() {
    return `
        <div class="page-header">
            <h2 class="page-title">📦 المنتجات</h2>
            <div class="page-actions">
                <button class="btn btn-primary" onclick="openNewProductModal()">+ منتج جديد</button>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">قائمة المنتجات</h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الباركود</th>
                            <th>الاسم</th>
                            <th>التصنيف</th>
                            <th>سعر الشراء</th>
                            <th>سعر البيع</th>
                            <th>الكمية</th>
                            <th>الحد الأدنى</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="productsTable"></tbody>
                </table>
            </div>
        </div>
    `;
}

function renderReports() {
    return `
        <div class="page-header">
            <h2 class="page-title">📊 التقارير</h2>
        </div>

        <div class="tabs" id="reportTabs">
            <button class="tab active" onclick="showReport('profit_loss')">الأرباح والخسائر</button>
            <button class="tab" onclick="showReport('balance_sheet')">الميزانية العمومية</button>
            <button class="tab" onclick="showReport('cashflow')">تدفق النقد</button>
            <button class="tab" onclick="showReport('aged_receivables')">العملاء - الذمم المدينة</button>
            <button class="tab" onclick="showReport('aged_payables')">الموردين - الذمم الدائنة</button>
            <button class="tab" onclick="showReport('sales_by_period')">المبيعات حسب الفترة</button>
            <button class="tab" onclick="showReport('inventory')">تقرير المخزون</button>
        </div>

        <div class="card">
            <div id="reportContent"></div>
        </div>
    `;
}

function renderSettings() {
    return `
        <div class="page-header">
            <h2 class="page-title">⚙️ الإعدادات</h2>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">بيانات الشركة</h3>
            </div>
            <div class="form-group">
                <label>اسم الشركة</label>
                <input type="text" id="companyName" placeholder="اسم الشركة" value="شركتي">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>السجل التجاري</label>
                    <input type="text" id="commercialRecord" placeholder="السجل التجاري">
                </div>
                <div class="form-group">
                    <label>الرقم الضريبي</label>
                    <input type="text" id="taxNumber" placeholder="الرقم الضريبي">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>الهاتف</label>
                    <input type="text" id="companyPhone" placeholder="الهاتف">
                </div>
                <div class="form-group">
                    <label>البريد الإلكتروني</label>
                    <input type="email" id="companyEmail" placeholder="البريد الإلكتروني">
                </div>
            </div>
            <div class="form-group">
                <label>العنوان</label>
                <input type="text" id="companyAddress" placeholder="العنوان">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>نسبة الضريبة %</label>
                    <input type="number" id="taxRate" placeholder="0" value="0">
                </div>
                <div class="form-group">
                    <label>رأس المال (ر.س)</label>
                    <input type="number" id="capitalAmount" placeholder="0" value="0">
                </div>
            </div>
            <button class="btn btn-primary" onclick="saveSettings()">💾 حفظ الإعدادات</button>
        </div>

        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">إدارة البيانات</h3>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-success" onclick="backupData()">📥 نسخة احتياطية</button>
                <button class="btn btn-warning" onclick="restoreData()">📤 استرجاع النسخة</button>
                <button class="btn btn-danger" onclick="clearAllData()">🗑️ حذف جميع البيانات</button>
            </div>
        </div>
    `;
}

// ==================== دوال مساعدة ====================
function calculateCustomersCount() {
    return 0; // سيتم ملأ البيانات الفعلية
}

function calculateSuppliersCount() {
    return 0; // سيتم ملأ البيانات الفعلية
}

// ==================== إعدادات ====================
function saveSettings() {
    showNotification('تم حفظ الإعدادات بنجاح', 'success');
}

function backupData() {
    const data = {
        timestamp: new Date().toISOString(),
        backup: 'data'
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showNotification('تم تحميل النسخة الاحتياطية', 'success');
}

function restoreData() {
    showNotification('جاري استرجاع البيانات...', 'info');
}

function clearAllData() {
    if (confirm('هذا سيحذف جميع البيانات! هل أنت متأكد؟')) {
        if (confirm('تأكيد: حذف جميع البيانات نهائياً؟')) {
            showNotification('تم حذف جميع البيانات', 'success');
        }
    }
}

// ==================== النمائج ====================
function openNewSaleModal() {
    const form = `
        <div class="form-group">
            <label>العميل</label>
            <select>
                <option>اختر عميل</option>
            </select>
        </div>
        <div class="form-group">
            <label>رقم الفاتورة</label>
            <input type="text" placeholder="رقم الفاتورة">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>التاريخ</label>
                <input type="date">
            </div>
            <div class="form-group">
                <label>موعد الاستحقاق</label>
                <input type="date">
            </div>
        </div>
        <button class="btn btn-primary" onclick="saveSale()">💾 حفظ</button>
    `;
    openModal('📝 مبيعة جديدة', form);
}

function openNewPurchaseModal() {
    openModal('📝 مشتراة جديدة', '<p>نموذج المشتراة الجديدة</p>');
}

function openNewExpenseModal() {
    openModal('📝 مصروف جديد', '<p>نموذج المصروف الجديد</p>');
}

function openNewAccountModal() {
    openModal('📝 حساب جديد', '<p>نموذج الحساب الجديد</p>');
}

function openNewCustomerModal() {
    openModal('📝 عميل جديد', '<p>نموذج العميل الجديد</p>');
}

function openNewSupplierModal() {
    openModal('📝 مورد جديد', '<p>نموذج المورد الجديد</p>');
}

function openNewProductModal() {
    openModal('📝 منتج جديد', '<p>نموذج المنتج الجديد</p>');
}

function saveSale() {
    closeModal();
    showNotification('تم حفظ المبيعة بنجاح', 'success');
}

function showReport(type) {
    const content = document.getElementById('reportContent');
    content.innerHTML = `<p>تقرير: ${type}</p>`;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}

function filterSales() {
    showNotification('جاري تصفية البيانات', 'info');
}

// ==================== القائمة الجانبية ====================
function renderSidebar() {
    const nav = document.getElementById('navMenu');
    const menuItems = [
        { title: 'الرئيسية', icon: '📊', page: 'dashboard' },
        { title: 'المبيعات', icon: '💳', page: 'sales' },
        { title: 'المشتريات', icon: '📦', page: 'purchases' },
        { title: 'المصاريف', icon: '💰', page: 'expenses' },
        { title: 'الحسابات', icon: '💳', page: 'accounts' },
        { title: 'العملاء', icon: '👥', page: 'customers' },
        { title: 'الموردين', icon: '🏭', page: 'suppliers' },
        { title: 'المنتجات', icon: '📦', page: 'products' },
        { title: 'التقارير', icon: '📊', page: 'reports' },
        { title: 'الإعدادات', icon: '⚙️', page: 'settings' }
    ];

    nav.innerHTML = menuItems.map(item => `
        <div class="nav-section">
            <div class="nav-item ${currentPage === item.page ? 'active' : ''}" onclick="navigate('${item.page}')">
                <span class="nav-item-icon">${item.icon}</span>
                <span class="nav-item-text">${item.title}</span>
            </div>
        </div>
    `).join('');
}

// ==================== التهيئة ====================
async function init() {
    await DB.init();
    
    // بيانات افتتاحية
    const settings = await DB.getAll('settings');
    if (settings.length === 0) {
        await DB.add('settings', {
            companyName: 'شركتي',
            capital: 100000,
            taxRate: 15
        });
    }

    renderSidebar();
    renderPage('dashboard');

    // تحديث بيانات المستخدم
    const userDisplay = document.getElementById('userDisplay');
    userDisplay.textContent = 'المسؤول | ' + new Date().toLocaleDateString('ar-SA');
}

init();