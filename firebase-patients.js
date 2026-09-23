// This file handles patient management using Firebase Realtime Database.
// It relies on window.db and RTDB methods exposed in dashboard.html.

const patientModal = document.getElementById('patientModal');
const openModalBtn = document.getElementById('openModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const patientForm = document.getElementById('patientForm');
const patientsTableBody = document.getElementById('patients-table-body');

let currentPatients = [];

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

// Load patients from Realtime Database
async function loadPatients() {
    try {
        const patientsRef = window.ref(window.db, "patients");
        const snapshot = await window.get(patientsRef);
        currentPatients = [];

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                currentPatients.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
        }
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
        // If they don't have a specific readable ID, just use a slice of the document ID
        const displayId = patient.displayId || 'P' + patient.id.substring(0, 5).toUpperCase();

        row.innerHTML = `
            <td>${displayId}</td>
            <td>${patient.name}</td>
            <td>${patient.phone}</td>
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

        // Show loading state on button (optional but good for UX)
        const submitBtn = patientForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = '...';
        submitBtn.disabled = true;

        try {
            if (idField) {
                // Edit existing in Realtime Database
                const patientRef = window.ref(window.db, "patients/" + idField);
                await window.update(patientRef, {
                    name: name,
                    phone: phone,
                    lastVisit: lastVisit
                });
            } else {
                // Add new to Realtime Database
                const patientsListRef = window.ref(window.db, "patients");
                const newPatientRef = window.push(patientsListRef);
                await window.set(newPatientRef, {
                    name: name,
                    phone: phone,
                    lastVisit: lastVisit,
                    displayId: 'P' + Date.now().toString().slice(-6)
                });
            }

            // Reload and render
            await loadPatients();
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

// Edit Patient Function (Global scope for onclick)
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

// Delete Patient Function (Global scope for onclick)
window.deletePatient = async function(id) {
    if (confirm('Are you sure you want to delete this patient?')) {
        try {
            const patientRef = window.ref(window.db, "patients/" + id);
            await window.remove(patientRef);
            await loadPatients();
        } catch (e) {
            console.error("Error deleting patient: ", e);
            alert("Error deleting patient.");
        }
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // We can call loadPatients immediately since this script is module and runs after DOM is parsed.
    // However, window.db is populated by the preceding inline script which is also module.
    // So we just call it.
    setTimeout(loadPatients, 500); // Wait a bit for firebase to init just in case
});
