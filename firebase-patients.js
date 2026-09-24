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
        history.pushState({ modal: 'patient' }, '', window.location.hash);
    });
}

// Close modal
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        if(window.closeModalAndPopState) window.closeModalAndPopState(patientModal);
        else patientModal.classList.remove('show');
    });
}

// Close when clicking outside the modal content
if (patientModal) {
    window.addEventListener('click', (event) => {
        if (event.target === patientModal) {
            if(window.closeModalAndPopState) window.closeModalAndPopState(patientModal);
            else patientModal.classList.remove('show');
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

        // Initialize displayId if not present for searching
        currentPatients = currentPatients.map(p => ({
            ...p,
            displayId: p.displayId || 'P' + p.id.substring(0, 5).toUpperCase()
        }));

        renderPatients(currentPatients);
    } catch (e) {
        console.error("Error loading patients: ", e);
    }
}

// Render patients table
function renderPatients(patientsToRender = currentPatients) {
    if (!patientsTableBody) return;

    patientsTableBody.innerHTML = '';

    patientsToRender.forEach(patient => {
        const row = document.createElement('tr');
        const displayId = patient.displayId;
        const cleanPhone = (patient.phone || '').replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('0') ? '2' + cleanPhone : '20' + cleanPhone;

        row.innerHTML = `
            <td>${displayId}</td>
            <td>${patient.name}</td>
            <td>
                ${patient.phone}
                <a href="tel:${cleanPhone}" style="color:var(--brand-primary); text-decoration:none; margin-left:0.5rem;" title="Call">📞</a>
                <a href="https://wa.me/${waPhone}" target="_blank" style="color:#25D366; text-decoration:none; margin-left:0.5rem;" title="WhatsApp">💬</a>
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

// Search Logic
const patientSearchInput = document.getElementById('patientSearchInput');
if (patientSearchInput) {
    patientSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        const filtered = currentPatients.filter(p => {
            const nameMatch = (p.name || '').toLowerCase().includes(searchTerm);
            const phoneMatch = (p.phone || '').toLowerCase().includes(searchTerm);
            const idMatch = (p.displayId || '').toLowerCase().includes(searchTerm);
            return nameMatch || phoneMatch || idMatch;
        });

        renderPatients(filtered);
    });
}

// Helper: basic local prediction for Arabic/English names
function predictGender(nameStr) {
    const name = nameStr.trim().split(' ')[0].toLowerCase();

    // Some common female name endings and known names
    if (name.endsWith('a') || name.endsWith('ة') || name.endsWith('اء')) {
        // Exclude some common male exceptions if needed:
        const maleExceptions = ['usama', 'osama', 'hamza', 'أسامة', 'حمزة', 'موسى', 'عيسى', 'يحيى', 'mustafa', 'مصطفى', 'طالبة', 'عطية', 'معاوية', 'طلحة', 'خليفة', 'عنترة'];
        if (!maleExceptions.includes(name)) {
            return 'Female';
        }
    }

    // Known female names lacking standard endings
    const femaleNames = ['maryam', 'مريم', 'زينب', 'zaynab', 'nour', 'نور', 'سعاد', 'هند', 'مي', 'ندى', 'فرح'];
    if (femaleNames.includes(name)) return 'Female';

    // Default
    return 'Male';
}

const patientNameInput = document.getElementById('patientName');
const patientGenderSelect = document.getElementById('patientGender');

if (patientNameInput && patientGenderSelect) {
    patientNameInput.addEventListener('blur', () => {
        if (patientNameInput.value) {
            patientGenderSelect.value = predictGender(patientNameInput.value);
        }
    });
}

// Handle form submission (Add/Edit)
if (patientForm) {
    patientForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const idField = document.getElementById('patientId').value;
        const name = document.getElementById('patientName').value.trim();
        const phone = document.getElementById('patientPhone').value.trim();
        const gender = document.getElementById('patientGender').value;
        const lastVisit = document.getElementById('lastVisit').value;

        // Validation for 3 words
        if (name.split(/\s+/).length < 3) {
            alert('يرجى إدخال اسم المريض الثلاثي (3 كلمات على الأقل). / Please enter the full name (at least 3 words).');
            return;
        }

        // Validation for 11 digits
        const cleanPhoneSubmit = phone.replace(/\D/g, '');
        if (cleanPhoneSubmit.length !== 11) {
            alert('يجب أن يكون رقم الهاتف مكون من 11 رقماً. / Phone number must be exactly 11 digits.');
            return;
        }

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
                    gender: gender,
                    lastVisit: lastVisit
                });
            } else {
                // Add new to Firestore
                const patientsRef = collection(db, "users", currentUserUid, "patients");
                await addDoc(patientsRef, {
                    name: name,
                    phone: phone,
                    gender: gender,
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

            if(window.closeModalAndPopState) window.closeModalAndPopState(patientModal);
            else patientModal.classList.remove('show');
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
        if (patient.gender) {
            document.getElementById('patientGender').value = patient.gender;
        }
        document.getElementById('lastVisit').value = patient.lastVisit;
        patientModal.classList.add('show');
        history.pushState({ modal: 'patient' }, '', window.location.hash);
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