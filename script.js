const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

themeToggle.addEventListener('click', () => {
    if (htmlElement.getAttribute('data-theme') === 'dark') {
        htmlElement.removeAttribute('data-theme');
        themeToggle.innerText = '🌙 Dark Mode';
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
        themeToggle.innerText = '☀️ Light Mode';
    }
});

const langToggle = document.getElementById('langToggle');

langToggle.addEventListener('click', () => {
    const currentLang = htmlElement.getAttribute('lang');
    const elementsToTranslate = document.querySelectorAll('[data-ar], [data-en]');

    if (currentLang === 'ar') {
        htmlElement.setAttribute('lang', 'en');
        htmlElement.setAttribute('dir', 'ltr'); 
        
        elementsToTranslate.forEach(el => {
            el.innerText = el.getAttribute('data-en');
        });
    } else {
        htmlElement.setAttribute('lang', 'ar');
        htmlElement.setAttribute('dir', 'rtl'); 
        
        elementsToTranslate.forEach(el => {
            el.innerText = el.getAttribute('data-ar');
        });
    }
});

// Patient Management Logic
const patientModal = document.getElementById('patientModal');
const openModalBtn = document.getElementById('openModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const patientForm = document.getElementById('patientForm');
const patientsTableBody = document.getElementById('patients-table-body');

// Local storage key
const PATIENTS_STORAGE_KEY = 'molarize_patients';

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

// Load patients from local storage
function loadPatients() {
    const patientsStr = localStorage.getItem(PATIENTS_STORAGE_KEY);
    return patientsStr ? JSON.parse(patientsStr) : [];
}

// Save patients to local storage
function savePatients(patients) {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}

// Render patients table
function renderPatients() {
    if (!patientsTableBody) return;

    const patients = loadPatients();
    patientsTableBody.innerHTML = '';

    patients.forEach(patient => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.phone}</td>
            <td>${patient.lastVisit}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editPatient('${patient.id}')">Edit</button>
                <button class="btn-action btn-delete" onclick="deletePatient('${patient.id}')">Delete</button>
            </td>
        `;
        patientsTableBody.appendChild(row);
    });
}

// Handle form submission (Add/Edit)
if (patientForm) {
    patientForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const idField = document.getElementById('patientId').value;
        const name = document.getElementById('patientName').value;
        const phone = document.getElementById('patientPhone').value;
        const lastVisit = document.getElementById('lastVisit').value;

        let patients = loadPatients();

        if (idField) {
            // Edit existing
            const index = patients.findIndex(p => p.id === idField);
            if (index !== -1) {
                patients[index] = { id: idField, name, phone, lastVisit };
            }
        } else {
            // Add new
            const newId = 'P' + Date.now().toString().slice(-6); // Generate simple ID
            patients.push({ id: newId, name, phone, lastVisit });
        }

        savePatients(patients);
        renderPatients();
        patientModal.classList.remove('show');
    });
}

// Edit Patient Function (Global scope for onclick)
window.editPatient = function(id) {
    const patients = loadPatients();
    const patient = patients.find(p => p.id === id);

    if (patient) {
        document.getElementById('patientId').value = patient.id;
        document.getElementById('patientName').value = patient.name;
        document.getElementById('patientPhone').value = patient.phone;
        document.getElementById('lastVisit').value = patient.lastVisit;
        patientModal.classList.add('show');
    }
}

// Delete Patient Function (Global scope for onclick)
window.deletePatient = function(id) {
    if (confirm('Are you sure you want to delete this patient?')) {
        let patients = loadPatients();
        patients = patients.filter(p => p.id !== id);
        savePatients(patients);
        renderPatients();
    }
}

// Initial render
renderPatients();
