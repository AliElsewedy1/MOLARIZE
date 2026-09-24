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
    inventoryTableBody.innerHTML = '';
    items.forEach(item => {
        const isLowStock = parseInt(item.stock) <= parseInt(item.alertLimit);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${item.itemName}
                ${isLowStock ? '<span class="status-badge status-error" style="font-size: 0.7em; margin-left: 5px;">Low Stock</span>' : ''}
            </td>
            <td>${item.category}</td>
            <td style="${isLowStock ? 'color: var(--status-error); font-weight: bold;' : ''}">${item.stock}</td>
            <td>${item.alertLimit}</td>
            <td>
                <button class="btn-outline edit-btn" data-id="${item.id}">Edit</button>
                <button class="btn-outline delete-btn" style="color: var(--status-error); border-color: var(--status-error);" data-id="${item.id}">Delete</button>
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
    } catch (error) {
        console.error("Error saving inventory item:", error);
        alert("An error occurred while saving the item.");
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
    if (!confirm("Are you sure you want to delete this item?")) return;
    const id = e.target.getAttribute('data-id');
    const user = auth.currentUser;
    if (user && id) {
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'inventory', id));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Error deleting item.");
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
