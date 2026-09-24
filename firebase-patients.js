import { db, auth, onAuthStateChanged, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot } from "./firebase-config.js";

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

        // Setup Call Phone
        const callTargetPhone = (patient.callPref === 'phone2' && patient.phone2) ? patient.phone2 : patient.phone;
        const cleanCallPhone = (callTargetPhone || '').replace(/\D/g, '');

        // Setup WhatsApp Phone
        const waTargetPhone = (patient.waPref === 'phone2' && patient.phone2) ? patient.phone2 : patient.phone;
        const cleanWaPhone = (waTargetPhone || '').replace(/\D/g, '');
        const waLinkPhone = cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone;

        let displayPhone = patient.phone;
        if (patient.phone2) displayPhone += ` / ${patient.phone2}`;

        row.style.cursor = 'pointer';
        row.innerHTML = `
            <td onclick="window.openPatientProfile('${patient.id}')">${displayId}</td>
            <td onclick="window.openPatientProfile('${patient.id}')" style="font-weight: 500; color: var(--text-primary);">${patient.name}</td>
            <td>
                <span onclick="window.openPatientProfile('${patient.id}')">${displayPhone}</span>
                <a href="tel:${cleanCallPhone}" style="color:var(--brand-primary); text-decoration:none; margin-left:0.5rem;" title="Call">📞</a>
                <a href="https://wa.me/${waLinkPhone}" target="_blank" style="color:#25D366; text-decoration:none; margin-left:0.5rem;" title="WhatsApp">💬</a>
            </td>
            <td onclick="window.openPatientProfile('${patient.id}')">${patient.lastVisit}</td>
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

        const age = document.getElementById('patientAge').value;
        const phone2 = document.getElementById('patientPhone2').value.trim();
        const callPref = document.getElementById('callPref').value;
        const waPref = document.getElementById('waPref').value;
        const notes = document.getElementById('patientNotes').value.trim();

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

        // Validation for phone 2 if provided
        if (phone2) {
            const cleanPhone2Submit = phone2.replace(/\D/g, '');
            if (cleanPhone2Submit.length !== 11) {
                alert('يجب أن يكون رقم الهاتف الإضافي مكون من 11 رقماً. / Additional phone number must be exactly 11 digits.');
                return;
            }
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
                    phone2: phone2,
                    callPref: callPref,
                    waPref: waPref,
                    age: age,
                    notes: notes,
                    gender: gender,
                    lastVisit: lastVisit
                });
            } else {
                // Add new to Firestore
                const patientsRef = collection(db, "users", currentUserUid, "patients");
                await addDoc(patientsRef, {
                    name: name,
                    phone: phone,
                    phone2: phone2,
                    callPref: callPref,
                    waPref: waPref,
                    age: age,
                    notes: notes,
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
        document.getElementById('patientPhone2').value = patient.phone2 || '';
        document.getElementById('patientAge').value = patient.age || '';
        document.getElementById('patientNotes').value = patient.notes || '';

        if (patient.callPref) {
            document.getElementById('callPref').value = patient.callPref;
        } else {
            document.getElementById('callPref').value = 'phone1';
        }

        if (patient.waPref) {
            document.getElementById('waPref').value = patient.waPref;
        } else {
            document.getElementById('waPref').value = 'phone1';
        }

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


// --- PATIENT PROFILE LOGIC ---

let currentProfilePatientId = null;

// Expose globally for onclick
window.openPatientProfile = function(patientId) {
    currentProfilePatientId = patientId;
    const patient = currentPatients.find(p => p.id === patientId);
    if (!patient) return;

    // Set Info
    document.getElementById('profilePatientName').innerText = patient.name;
    document.getElementById('profilePatientId').innerText = patient.id.substring(0, 6);
    document.getElementById('profilePatientAge').innerText = patient.age;
    document.getElementById('profilePatientGender').innerText = patient.gender;
    document.getElementById('profilePatientPhone').innerText = patient.phone;

    // Show Section
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.getElementById('patient-profile-section').style.display = 'block';

    // Reset Tabs
    document.querySelector('.tab-btn[data-tab="tab-odontogram"]').click();

    // History API
    history.pushState({ section: 'patient-profile-section', patientId: patientId }, '', '#patient-profile-section');

    // Load Patient Data
    loadOdontogram(patientId);
    setupProfileTreatmentsListener(patientId);
    setupProfilePrescriptionsListener(patientId);
};

document.getElementById('backToPatientsBtn').addEventListener('click', () => {
    document.querySelector('.sidebar-link[data-target="patients-section"]').click();
});

// --- Odontogram Logic ---
const toothBoxes = document.querySelectorAll('.tooth-box');
const saveOdontogramBtn = document.getElementById('saveOdontogramBtn');

// Handle tooth click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tooth-box')) {
        const condition = document.querySelector('input[name="toothCondition"]:checked').value;

        // Remove existing condition classes
        e.target.classList.remove('cond-decay', 'cond-filled', 'cond-missing');
        e.target.removeAttribute('data-condition');

        if (condition !== 'normal') {
            e.target.classList.add('cond-' + condition);
            e.target.setAttribute('data-condition', condition);
        }
    }
});

async function loadOdontogram(patientId) {
    // Reset visual state
    document.querySelectorAll('.tooth-box').forEach(box => {
        box.classList.remove('cond-decay', 'cond-filled', 'cond-missing');
        box.removeAttribute('data-condition');
    });

    const user = auth.currentUser;
    if (!user) return;

    try {
        const docRef = doc(db, 'users', user.uid, 'patients', patientId, 'records', 'odontogram');

        const oDoc = await getDoc(docRef);

        if (oDoc.exists()) {
            const data = oDoc.data().teeth || {};
            for (const [tooth, condition] of Object.entries(data)) {
                const el = document.querySelector(`.tooth-box[data-tooth="${tooth}"]`);
                if (el && condition !== 'normal') {
                    el.classList.add('cond-' + condition);
                    el.setAttribute('data-condition', condition);
                }
            }
        }
    } catch (e) {
        console.error("Error loading odontogram", e);
    }
}

saveOdontogramBtn.addEventListener('click', async () => {
    if (!currentProfilePatientId) return;
    const user = auth.currentUser;
    if (!user) return;

    const teethData = {};
    document.querySelectorAll('.tooth-box').forEach(box => {
        const cond = box.getAttribute('data-condition') || 'normal';
        teethData[box.getAttribute('data-tooth')] = cond;
    });

    try {
        // Use setDoc to create or overwrite the odontogram doc

        const docRef = doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'records', 'odontogram');
        await setDoc(docRef, { teeth: teethData, updatedAt: new Date().toISOString() });
        alert("Odontogram saved successfully!");
    } catch (e) {
        console.error("Error saving odontogram", e);
        alert("Error saving.");
    }
});

// --- Treatments Sub-collection Logic ---
function setupProfileTreatmentsListener(patientId) {
    const user = auth.currentUser;
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'patients', patientId, 'treatments');
    onSnapshot(ref, (snapshot) => {
        const tbody = document.getElementById('profile-treatments-body');
        tbody.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const tId = doc.id;
            const total = parseFloat(data.cost) || 0;
            const paid = parseFloat(data.paidAmount) || 0;
            const rem = total - paid;

            tbody.innerHTML += `
                <tr>
                    <td>${data.type || data.treatmentType}</td>
                    <td>${total}</td>
                    <td>${paid}</td>
                    <td style="color: ${rem > 0 ? 'var(--status-error)' : 'var(--status-completed)'}">${rem}</td>
                    <td><span class="status-badge ${data.status === 'Completed' ? 'status-completed' : (data.status === 'In Progress' ? 'status-inprogress' : 'status-pending')}">${data.status}</span></td>
                    <td>
                        ${rem > 0 ? `<button class="btn-outline" onclick="window.openPaymentModal('${tId}', '${patientId}', '${data.patientName || ''}', '${data.type || data.treatmentType}')">Pay</button>` : ''}
                        <button class="btn-outline" onclick="window.printInvoice('${tId}', '${patientId}')">Print</button>
                    </td>
                </tr>
            `;
        });
    });
}

// Payment Modal Logic
window.openPaymentModal = function(tId, pId, pName, tName) {
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentTreatmentId').value = tId;
    document.getElementById('paymentPatientId').value = pId;
    document.getElementById('paymentPatientName').value = pName;
    document.getElementById('paymentTreatmentName').value = tName;

    const paymentModal = document.getElementById('paymentModal');
    paymentModal.classList.add('show');
    history.pushState({ modal: 'payment' }, '', window.location.hash);
};

document.getElementById('cancelPaymentBtn').addEventListener('click', () => {
    window.closeModalAndPopState(document.getElementById('paymentModal'));
});

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const tId = document.getElementById('paymentTreatmentId').value;
    const pId = document.getElementById('paymentPatientId').value;
    const pName = document.getElementById('paymentPatientName').value || document.getElementById('profilePatientName').innerText;
    const tName = document.getElementById('paymentTreatmentName').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    const date = document.getElementById('paymentDate').value;

    try {
        // 1. Add to global payments ledger
        const paymentsRef = collection(db, 'users', user.uid, 'payments');
        await addDoc(paymentsRef, {
            treatmentId: tId,
            patientId: pId,
            patientName: pName,
            treatmentName: tName,
            amount: amount,
            method: method,
            date: date,
            createdAt: new Date().toISOString()
        });

        // 2. Add to patient specific payments subcollection (for invoice)
        const patientPaymentsRef = collection(db, 'users', user.uid, 'patients', pId, 'treatments', tId, 'payments');
        await addDoc(patientPaymentsRef, {
            amount: amount,
            method: method,
            date: date,
            createdAt: new Date().toISOString()
        });

        // 3. Update paidAmount on treatment document
        const tRef = doc(db, 'users', user.uid, 'patients', pId, 'treatments', tId);
        const tDoc = await getDoc(tRef);
        if (tDoc.exists()) {
            const currentPaid = parseFloat(tDoc.data().paidAmount) || 0;
            await updateDoc(tRef, { paidAmount: currentPaid + amount });
        }

        window.closeModalAndPopState(document.getElementById('paymentModal'));
        alert('Payment added successfully');
    } catch (error) {
        console.error("Error saving payment", error);
        alert("Error saving payment.");
    }
});

// Print Invoice Logic
window.printInvoice = async function(tId, pId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const tRef = doc(db, 'users', user.uid, 'patients', pId, 'treatments', tId);
        const tDoc = await getDoc(tRef);
        if (!tDoc.exists()) return;

        const data = tDoc.data();
        const total = parseFloat(data.cost) || 0;
        const paid = parseFloat(data.paidAmount) || 0;
        const rem = total - paid;

        document.getElementById('invoice-patient-name').innerText = document.getElementById('profilePatientName').innerText;
        document.getElementById('invoice-date').innerText = new Date().toLocaleDateString();
        document.getElementById('invoice-treatment').innerText = data.type || data.treatmentType;
        document.getElementById('invoice-total').innerText = total;
        document.getElementById('invoice-paid').innerText = paid;
        document.getElementById('invoice-remaining').innerText = rem;

        // Load payments for this treatment
        const paymentsRef = collection(db, 'users', user.uid, 'patients', pId, 'treatments', tId, 'payments');
        const pSnap = await getDocs(paymentsRef);

        const tbody = document.getElementById('invoice-payments-body');
        tbody.innerHTML = '';

        const sortedPayments = pSnap.docs.map(d => d.data()).sort((a,b) => new Date(a.date) - new Date(b.date));

        sortedPayments.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td style="text-align: left; padding: 0.5rem;">${p.date}</td>
                    <td style="text-align: right; padding: 0.5rem;">${p.amount}</td>
                    <td style="text-align: right; padding: 0.5rem;">${p.method}</td>
                </tr>
            `;
        });

        if(sortedPayments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No payments found.</td></tr>';
        }

        window.print();

    } catch (e) {
        console.error("Error generating invoice", e);
    }
};



document.getElementById('addProfileTreatmentBtn').addEventListener('click', () => {
    document.getElementById('treatmentPatientName').value = document.getElementById('profilePatientName').innerText;
    // Store target patient id somewhere temporarily
    document.getElementById('treatmentPatientName').setAttribute('data-target-id', currentProfilePatientId);

    document.getElementById('treatmentForm').reset();
    document.getElementById('treatmentId').value = '';

    const treatmentModal = document.getElementById('treatmentModal');
    treatmentModal.classList.add('show');
    history.pushState({ modal: 'treatment' }, '', '#patient-profile-section');
});

// Hijack the global treatment form submit (which was previously in firebase-app-data.js, but actually we need to make sure we route it correctly).
// Note: If the main treatment modal logic is in firebase-app-data.js, we should handle sub-collection additions there or here.
// For simplicity, we will intercept the form submit here if 'data-target-id' is set.

// --- Prescriptions Sub-collection Logic ---
function setupProfilePrescriptionsListener(patientId) {
    const user = auth.currentUser;
    if (!user) return;
    const ref = collection(db, 'users', user.uid, 'patients', patientId, 'prescriptions');
    onSnapshot(ref, (snapshot) => {
        const tbody = document.getElementById('profile-prescriptions-body');
        tbody.innerHTML = '';

        const docs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.date) - new Date(a.date));

        docs.forEach(data => {
            tbody.innerHTML += `
                <tr>
                    <td>${new Date(data.date).toLocaleDateString()}</td>
                    <td>${data.medications}</td>
                </tr>
            `;
        });
    });
}

const prescriptionModal = document.getElementById('prescriptionModal');
document.getElementById('addProfilePrescriptionBtn').addEventListener('click', () => {
    document.getElementById('prescriptionForm').reset();
    prescriptionModal.classList.add('show');
    history.pushState({ modal: 'prescription' }, '', '#patient-profile-section');
});

document.getElementById('cancelPrescBtn').addEventListener('click', () => {
    window.closeModalAndPopState(prescriptionModal);
});

document.getElementById('prescriptionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProfilePatientId) return;
    const user = auth.currentUser;
    if (!user) return;

    const meds = document.getElementById('prescMeds').value;

    try {
        const ref = collection(db, 'users', user.uid, 'patients', currentProfilePatientId, 'prescriptions');
        await addDoc(ref, {
            medications: meds,
            date: new Date().toISOString()
        });
        window.closeModalAndPopState(prescriptionModal);
    } catch(err) {
        console.error(err);
        alert('Error adding prescription');
    }
});
