import { auth, db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from './firebase-config.js';

// DOM Elements
const inventoryModal = document.getElementById('inventoryModal');
const openInventoryModalBtn = document.getElementById('openInventoryModalBtn');
const cancelInventoryBtn = document.getElementById('cancelInventoryBtn');
const inventoryForm = document.getElementById('inventoryForm');
const inventoryTableBody = document.getElementById('inventory-table-body');
const inventorySearchInput = document.getElementById('inventorySearchInput');

let currentInventory = [];

// Open Modal
openInventoryModalBtn.addEventListener('click', () => {
    inventoryForm.reset();
    document.getElementById('inventoryItemId').value = '';
    inventoryModal.classList.add('show');
    history.pushState({ modal: 'inventory' }, '', '#inventory-section');
});

// Close Modal
cancelInventoryBtn.addEventListener('click', () => {
    window.closeModalAndPopState(inventoryModal);
});

// Auth State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        setupInventoryListener(user.uid);
    }
});

// Setup Realtime Listener
function setupInventoryListener(uid) {
    const inventoryRef = collection(db, 'users', uid, 'inventory');
    onSnapshot(inventoryRef, (snapshot) => {
        currentInventory = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderInventoryTable(currentInventory);
    });
}

// Render Table
function renderInventoryTable(items) {
    if (!inventoryTableBody) return;
    inventoryTableBody.innerHTML = '';
    const isAr = document.documentElement.lang === 'ar';

    items.forEach(item => {
        const isLowStock = parseInt(item.stock) <= parseInt(item.alertLimit);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${item.itemName}
                ${isLowStock ? `<span class="status-badge status-error" style="font-size: 0.7em; margin-inline-start: 5px;">${isAr ? 'مخزون منخفض' : 'Low Stock'}</span>` : ''}
            </td>
            <td>${item.category}</td>
            <td style="${isLowStock ? 'color: var(--status-error); font-weight: bold;' : ''}">${item.stock}</td>
            <td>${item.alertLimit}</td>
            <td>
                <button class="btn-outline edit-btn" data-id="${item.id}">${isAr ? 'تعديل' : 'Edit'}</button>
                <button class="btn-outline delete-btn" style="color: var(--status-error); border-color: var(--status-error);" data-id="${item.id}">${isAr ? 'حذف' : 'Delete'}</button>
            </td>
        `;
        inventoryTableBody.appendChild(tr);
    });

    // Attach Event Listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEditItem);
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteItem);
    });
}
window.renderInventory = () => renderInventoryTable(currentInventory);

// Add/Update Item
inventoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const itemId = document.getElementById('inventoryItemId').value;
    const itemData = {
        itemName: document.getElementById('inventoryItemName').value,
        category: document.getElementById('inventoryCategory').value,
        stock: parseInt(document.getElementById('inventoryStock').value) || 0,
        alertLimit: parseInt(document.getElementById('inventoryAlertLimit').value) || 0,
        updatedAt: new Date().toISOString()
    };

    try {
        if (itemId) {
            // Update
            const itemRef = doc(db, 'users', user.uid, 'inventory', itemId);
            await updateDoc(itemRef, itemData);
        } else {
            // Add
            const inventoryRef = collection(db, 'users', user.uid, 'inventory');
            await addDoc(inventoryRef, {
                ...itemData,
                createdAt: new Date().toISOString()
            });
        }
        window.closeModalAndPopState(inventoryModal);
        const isAr = document.documentElement.lang === 'ar';
        if (window.showToast) {
            window.showToast(isAr ? 'تم حفظ عنصر المخزون بنجاح' : 'Inventory item saved successfully', 'success');
        }
    } catch (error) {
        console.error("Error saving inventory item:", error);
        const isAr = document.documentElement.lang === 'ar';
        if (window.showToast) {
            window.showToast(isAr ? 'حدث خطأ أثناء حفظ العنصر' : 'An error occurred while saving the item', 'error');
        }
    }
});

// Edit Item
function handleEditItem(e) {
    const id = e.target.getAttribute('data-id');
    const item = currentInventory.find(i => i.id === id);
    if (item) {
        document.getElementById('inventoryItemId').value = item.id;
        document.getElementById('inventoryItemName').value = item.itemName;
        document.getElementById('inventoryCategory').value = item.category;
        document.getElementById('inventoryStock').value = item.stock;
        document.getElementById('inventoryAlertLimit').value = item.alertLimit;

        inventoryModal.classList.add('show');
        history.pushState({ modal: 'inventory' }, '', '#inventory-section');
    }
}

// Delete Item
async function handleDeleteItem(e) {
    const isAr = document.documentElement.lang === 'ar';
    if (!confirm(isAr ? 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟' : 'Are you sure you want to delete this item?')) return;
    const id = e.target.getAttribute('data-id');
    const user = auth.currentUser;
    if (user && id) {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'inventory', id));
            if (window.showToast) {
                window.showToast(isAr ? 'تم حذف العنصر بنجاح' : 'Item deleted successfully', 'success');
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            if (window.showToast) {
                window.showToast(isAr ? 'حدث خطأ أثناء حذف العنصر' : 'Error deleting item', 'error');
            }
        }
    }
}

// Search Inventory
inventorySearchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = currentInventory.filter(item =>
        item.itemName.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
    );
    renderInventoryTable(filtered);
});

// Export Inventory to CSV
const exportInventoryCsvBtn = document.getElementById('exportInventoryCsvBtn');
if (exportInventoryCsvBtn) {
    exportInventoryCsvBtn.addEventListener('click', () => {
        if (!currentInventory || currentInventory.length === 0) {
            const isAr = document.documentElement.lang === 'ar';
            if (window.showToast) window.showToast(isAr ? 'لا توجد مواد في المخزون للتصدير' : 'No inventory items to export', 'warning');
            return;
        }

        const headers = ['Item Name', 'Category', 'Current Stock', 'Low Stock Alert Limit', 'Status'];
        const rows = currentInventory.map(item => {
            const isLow = parseInt(item.stock) <= parseInt(item.alertLimit);
            return [
                `"${(item.itemName || '').replace(/"/g, '""')}"`,
                `"${(item.category || '').replace(/"/g, '""')}"`,
                `"${item.stock}"`,
                `"${item.alertLimit}"`,
                `"${isLow ? 'Low Stock' : 'Sufficient'}"`
            ];
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Molarize_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

// --- Download Inventory CSV Template ---
window.downloadInventoryTemplateCsv = function() {
    const isAr = (document.documentElement.lang || 'en') === 'ar';
    const sampleHeaders = ['Item Name', 'Category', 'Current Stock', 'Low Stock Alert Limit'];
    const sampleRows = [
        [isAr ? 'حشوة كمبوزيت A2' : 'Composite Resin A2', isAr ? 'مواد الحشو' : 'Restorative Materials', '15', '5'],
        [isAr ? 'بنج موضعي ليدوكايين' : 'Lidocaine Anesthetic 2%', isAr ? 'التخدير' : 'Anesthesia', '40', '10'],
        [isAr ? 'قفازات لاتكس طبية' : 'Latex Examination Gloves', isAr ? 'مستهلكات عامة' : 'General Consumables', '8', '15']
    ];

    const csvContent = '\uFEFF' + [
        sampleHeaders.join(','),
        ...sampleRows.map(r => r.map(f => `"${(f || '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Molarize_Inventory_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.showToast) {
        window.showToast(isAr ? 'تم تحميل نموذج ملف المخزون CSV بنجاح' : 'Inventory CSV template downloaded successfully', 'info');
    }
};

// --- Import Inventory CSV File Handler ---
window.handleInventoryCsvFileSelected = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const isAr = (document.documentElement.lang || 'en') === 'ar';
    const triggerBtnText = document.getElementById('triggerImportInventoryBtnText');
    const originalBtnText = triggerBtnText ? triggerBtnText.innerText : '';

    if (triggerBtnText) {
        triggerBtnText.innerText = isAr ? 'جاري استيراد المخزون...' : 'Importing inventory...';
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            if (window.showToast) window.showToast(isAr ? 'يجب تسجيل الدخول أولاً' : 'Please sign in first', 'error');
            return;
        }

        const text = await file.text();
        // Parse rows taking quotes into account
        const rows = [];
        const rawLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        for (const line of rawLines) {
            if (!line.trim()) continue;
            const cells = line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
            rows.push(cells);
        }

        if (rows.length < 2) {
            if (window.showToast) window.showToast(isAr ? 'الملف فارغ أو لا يحتوي على عناصر' : 'The CSV file is empty', 'warning');
            return;
        }

        const headerRow = rows[0].map(h => h.toLowerCase().trim());
        const findColIndex = (keywords) => headerRow.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));

        const nameIdx = findColIndex(['item name', 'اسم الصنف', 'اسم المادة', 'المادة', 'name', 'item']);
        const catIdx = findColIndex(['category', 'تصنيف', 'النوع', 'القسم', 'cat']);
        const stockIdx = findColIndex(['stock', 'كمية', 'الكمية', 'current', 'count', 'qty']);
        const limitIdx = findColIndex(['alert', 'حد', 'تنبيه', 'limit', 'min']);

        if (nameIdx === -1) {
            if (window.showToast) window.showToast(isAr ? 'خطأ: لم يتم العثور على عمود اسم الصنف في الملف' : 'Error: "Item Name" column not found', 'error');
            return;
        }

        const inventoryRef = collection(db, 'users', user.uid, 'inventory');
        let importedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx].trim() : '';
            if (!rawName) continue;

            const rawCat = catIdx !== -1 && row[catIdx] ? row[catIdx].trim() : 'عام';
            const rawStock = stockIdx !== -1 && row[stockIdx] ? (parseInt(row[stockIdx]) || 0) : 0;
            const rawLimit = limitIdx !== -1 && row[limitIdx] ? (parseInt(row[limitIdx]) || 5) : 5;

            // Check if item already exists in local array
            const existing = currentInventory.find(it => it.itemName.toLowerCase() === rawName.toLowerCase());
            if (existing) {
                const itemDocRef = doc(db, 'users', user.uid, 'inventory', existing.id);
                await updateDoc(itemDocRef, {
                    category: rawCat,
                    stock: rawStock,
                    alertLimit: rawLimit,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(inventoryRef, {
                    itemName: rawName,
                    category: rawCat,
                    stock: rawStock,
                    alertLimit: rawLimit,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            importedCount++;
        }

        if (window.showToast) {
            window.showToast(isAr ? `تم استيراد وتحديث ${importedCount} صنف في المخزون بنجاح!` : `Imported ${importedCount} inventory items successfully!`, 'success');
        }
    } catch (err) {
        console.error("Error importing inventory CSV:", err);
        if (window.showToast) {
            window.showToast(isAr ? `حدث خطأ أثناء استيراد المخزون: ${err.message}` : `Error importing inventory: ${err.message}`, 'error');
        }
    } finally {
        if (triggerBtnText && originalBtnText) {
            triggerBtnText.innerText = originalBtnText;
        }
        if (event?.target) {
            event.target.value = '';
        }
    }
};

