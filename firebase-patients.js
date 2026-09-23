import { db, auth, onAuthStateChanged, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "./firebase-config.js";

const patientModal = document.getElementById('patientModal');
const openModalBtn = document.getElementById('openModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const patientForm = document.getElementById('patientForm');
const patientsTableBody = document.getElementById('patients-table-body');

let currentPatients = [];
let currentUserUid = null;

// Open modal
if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
        patientForm.reset();
        document.getElementById('patientId').value = '';
        patientModal.classList.add('show');
    });
}

// Close modal
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        patientModal.classList.remove('show');
    });
}

// Close when clicking outside the modal content
if (patientModal) {
    window.addEventListener('click', (event) => {
        if (event.target === patientModal) {
            patientModal.classList.remove('show');
        }
    });
}

// Load patients from Firestore
async function loadPatients() {
    if (!currentUserUid) return;
    try {
        const patientsRef = collection(db, "users", currentUserUid, "patients");
        const querySnapshot = await getDocs(patientsRef);
        currentPatients = [];
        querySnapshot.forEach((d) => {
            currentPatients.push({ id: d.id, ...d.data() });
        });
        renderPatients();
    } catch (e) {
        console.error("Error loading patients: ", e);
    }
}

// Render patients table
function renderPatients() {
    if (!patientsTableBody) return;

    patientsTableBody.innerHTML = '';

    currentPatients.forEach(patient => {
        const row = document.createElement('tr');
        const displayId = patient.displayId || 'P' + patient.id.substring(0, 5).toUpperCase();
        const cleanPhone = (patient.phone || '').replace(/\D/g, '');

        row.innerHTML = `
            <td>${displayId}</td>
            <td>${patient.name}</td>
            <td>
                ${patient.phone}
                <a href="tel:${cleanPhone}" style="color:var(--brand-primary); text-decoration:none; margin-left:0.5rem;" title="Call">📞</a>
                <a href="https://wa.me/${cleanPhone}" target="_blank" style="color:#25D366; text-decoration:none; margin-left:0.5rem;" title="WhatsApp">💬</a>
            </td>
            <td>${patient.lastVisit}</td>
            <td>
                <button class="btn-action btn-edit" onclick="window.editPatient('${patient.id}')">Edit</button>
                <button class="btn-action btn-delete" onclick="window.deletePatient('${patient.id}')">Delete</button>
            </td>
        `;
        patientsTableBody.appendChild(row);
    });
}

// Handle form submission (Add/Edit)
if (patientForm) {
    patientForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const idField = document.getElementById('patientId').value;
        const name = document.getElementById('patientName').value;
        const phone = document.getElementById('patientPhone').value;
        const lastVisit = document.getElementById('lastVisit').value;

        const submitBtn = patientForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = '...';
        submitBtn.disabled = true;

        try {
            if (!currentUserUid) {
                alert("User not authenticated.");
                return;
            }
            if (idField) {
                // Edit existing in Firestore
                const patientRef = doc(db, "users", currentUserUid, "patients", idField);
                await updateDoc(patientRef, {
                    name: name,
                    phone: phone,
                    lastVisit: lastVisit
                });
            } else {
                // Add new to Firestore
                const patientsRef = collection(db, "users", currentUserUid, "patients");
                await addDoc(patientsRef, {
                    name: name,
                    phone: phone,
                    lastVisit: lastVisit,
                    displayId: 'P' + Date.now().toString().slice(-6)
                });
            }

            // Reload and render
            await loadPatients();

            // Also update home dashboard stats if function exists
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }

            patientModal.classList.remove('show');
        } catch (e) {
            console.error("Error saving patient: ", e);
            alert("Error saving patient data. Please try again.");
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Edit Patient Function
window.editPatient = function(id) {
    const patient = currentPatients.find(p => p.id === id);

    if (patient) {
        document.getElementById('patientId').value = patient.id;
        document.getElementById('patientName').value = patient.name;
        document.getElementById('patientPhone').value = patient.phone;
        document.getElementById('lastVisit').value = patient.lastVisit;
        patientModal.classList.add('show');
    }
}

// Delete Patient Function
window.deletePatient = async function(id) {
    if (!currentUserUid) return;
    if (confirm('Are you sure you want to delete this patient?')) {
        try {
            await deleteDoc(doc(db, "users", currentUserUid, "patients", id));
            await loadPatients();

            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
        } catch (e) {
            console.error("Error deleting patient: ", e);
            alert("Error deleting patient.");
        }
    }
}

// Auth Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        loadPatients();
    } else {
        window.location.replace('index.html');
    }
});