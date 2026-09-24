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
        document.querySelectorAll('.alert-checkbox').forEach(cb => cb.checked = false);
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

        window.currentPatients = currentPatients;
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
                <a href="tel:${cleanCallPhone}" style="color:var(--brand-primary); text-decoration:none; margin-left:0.5rem; display:inline-flex; align-items:center;" title="Call"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></a>
                <a href="https://wa.me/${waLinkPhone}" target="_blank" style="color:#25D366; text-decoration:none; margin-left:0.5rem; display:inline-flex; align-items:center;" title="WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></a>
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

                // 1. Get and increment the counter
                const counterRef = doc(db, "users", currentUserUid, "metadata", "counters");
                const counterDoc = await getDoc(counterRef);
                let currentCount = 0;

                if (counterDoc.exists() && counterDoc.data().patientCount) {
                    currentCount = counterDoc.data().patientCount;
                }

                const newDisplayId = currentCount + 1;

                // 2. Add the patient
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
                    medicalAlerts: Array.from(document.querySelectorAll('.alert-checkbox:checked')).map(cb => cb.value).join(', '),
                    displayId: newDisplayId.toString(),
                    createdAt: new Date().toISOString()
                });

                // 3. Update the counter
                await setDoc(counterRef, { patientCount: newDisplayId }, { merge: true });
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

        document.querySelectorAll('.alert-checkbox').forEach(cb => cb.checked = false);
        if (patient.medicalAlerts) {
            const alertsArr = patient.medicalAlerts.split(', ');
            document.querySelectorAll('.alert-checkbox').forEach(cb => {
                if (alertsArr.includes(cb.value)) {
                    cb.checked = true;
                }
            });
        }
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
    document.getElementById('profilePatientId').innerText = patient.displayId || patient.id.substring(0, 6);
    document.getElementById('profilePatientAge').innerText = patient.age || '-';
    document.getElementById('profilePatientGender').innerText = patient.gender || '-';
    document.getElementById('profilePatientPhone').innerText = patient.phone;

    // Medical Alerts logic
    const alertsBox = document.getElementById('profileMedicalAlertsBox');
    const alertsText = document.getElementById('profileMedicalAlerts');
    if (patient.medicalAlerts && patient.medicalAlerts.trim() !== '') {
        alertsText.innerText = patient.medicalAlerts;
        alertsBox.style.display = 'flex';
    } else {
        alertsBox.style.display = 'none';
    }

    // Show Section
    document.querySelectorAll('.app-section').forEach(sec => sec.style.display = 'none');
    document.getElementById('patient-profile-section').style.display = 'block';

    // Reset Timeline Filter
    document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.chip[data-filter="all"]').classList.add('active');

    // History API
    history.pushState({ section: 'patient-profile-section', patientId: patientId }, '', '#patient-profile-section');

    // Load Patient Data
    loadOdontogram(patientId);
    loadPatientTimeline(patientId);
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
        loadPatientTimeline(currentProfilePatientId);
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



// --- Unified Timeline Logic ---

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


window.openVisitModal = function() {
    document.getElementById('visitForm').reset();
    const visitModal = document.getElementById('visitModal');
    visitModal.classList.add('show');
    history.pushState({ modal: 'visit' }, '', window.location.hash);
};



document.getElementById('visitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProfilePatientId) return;
    const user = auth.currentUser;
    if (!user) return;

    const complaint = document.getElementById('visitChiefComplaint').value;
    const notes = document.getElementById('visitNotes').value;

    try {
        const ref = collection(db, 'users', user.uid, 'patients', currentProfilePatientId, 'visits');
        await addDoc(ref, {
            complaint,
            notes,
            timestamp: new Date().toISOString()
        });
        window.closeModalAndPopState(document.getElementById('visitModal'));
        loadPatientTimeline(currentProfilePatientId);
    } catch(err) {
        console.error("Error saving visit", err);
    }
});

let currentTimelineEvents = [];

window.loadPatientTimeline = async function(patientId) {
    const user = auth.currentUser;
    if (!user) return;

    const container = document.getElementById('patientTimelineContainer');
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading timeline...</div>';

    try {
        // Fetch all subcollections
        const visitsP = getDocs(collection(db, 'users', user.uid, 'patients', patientId, 'visits'));

        const treatmentsP = getDocs(collection(db, 'users', user.uid, 'treatments'));
        const paymentsP = getDocs(collection(db, 'users', user.uid, 'payments')); // We query global payments for this patient


        const prescriptionsP = getDocs(collection(db, 'users', user.uid, 'patients', patientId, 'prescriptions'));
        const [visitsSnap, treatmentsSnap, paymentsSnap, prescriptionsSnap] = await Promise.all([visitsP, treatmentsP, paymentsP, prescriptionsP]);


        const patientName = document.getElementById('profilePatientName').innerText;

        let events = [];

        visitsSnap.forEach(doc => {
            const data = doc.data();
            events.push({ id: doc.id, type: 'visit', date: data.timestamp, data });
        });

        treatmentsSnap.forEach(doc => {
            const data = doc.data();
            // Filter global treatments for this patient (by id or exact name match)
            if (data.patientId === patientId || data.patientName === patientName) {
                events.push({ id: doc.id, type: 'treatment', date: data.createdAt || data.timestamp, data });
            }
        });

        prescriptionsSnap.forEach(doc => {
            const data = doc.data();
            events.push({ id: doc.id, type: 'prescription', date: data.date, data });
        });
            }
        });

        paymentsSnap.forEach(doc => {
            const data = doc.data();
            if (data.patientId === patientId) {
                events.push({ id: doc.id, type: 'payment', date: data.createdAt || data.date, data });
            }
        });

        events.sort((a, b) => new Date(b.date) - new Date(a.date));
        currentTimelineEvents = events;
        renderTimeline();

    } catch (e) {
        console.error("Error loading timeline", e);
        container.innerHTML = '<div style="color: var(--status-error); text-align: center;">Error loading data.</div>';
    }
};

function renderTimeline(filter = 'all') {
    const container = document.getElementById('patientTimelineContainer');
    container.innerHTML = '';

    const filtered = currentTimelineEvents.filter(e => filter === 'all' || e.type === filter);

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No events found.</div>';
        return;
    }

    filtered.forEach(event => {
        const el = document.createElement('div');
        el.className = `timeline-event type-${event.type}`;

        let icon = '';
        let title = '';
        let details = '';
        const displayDate = new Date(event.date).toLocaleDateString() + ' ' + new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        if (event.type === 'visit') {
            icon = '🔵';
            title = 'Clinical Visit';
            details = `
                <p><strong>Chief Complaint:</strong> ${escapeHtml(event.data.complaint)}</p>
                <p style="white-space: pre-wrap;"><strong>Notes:</strong><br>${escapeHtml(event.data.notes)}</p>
            `;
        } else if (event.type === 'treatment') {
            icon = '🟣';
            const typeStr = event.data.type || event.data.treatmentType;
            title = 'Treatment: ' + typeStr;
            const total = parseFloat(event.data.cost) || 0;
            const paid = parseFloat(event.data.paidAmount) || 0;
            const rem = total - paid;

            details = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <span><strong>Total:</strong> ${total}</span>
                    <span><strong>Paid:</strong> ${paid}</span>
                    <span style="color: ${rem > 0 ? 'var(--status-error)' : 'var(--status-completed)'}"><strong>Remaining:</strong> ${rem}</span>
                    <span><strong>Status:</strong> <span class="status-badge ${event.data.status === 'Completed' ? 'status-completed' : (event.data.status === 'In Progress' ? 'status-inprogress' : 'status-pending')}">${event.data.status}</span></span>
                </div>
                <div>
                    ${rem > 0 ? `<button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="window.openPaymentModal('${event.id}', '${currentProfilePatientId}', '${document.getElementById('profilePatientName').innerText}', '${typeStr}')">Pay Now</button>` : ''}
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="window.printInvoice('${event.id}', '${currentProfilePatientId}')">Print Invoice</button>
                </div>
            `;
        } else if (event.type === 'payment') {
            icon = '🟢';
            title = 'Payment Received';
            details = `
                <p><strong>Amount:</strong> <span style="color: var(--status-completed); font-weight: bold;">${event.data.amount}</span></p>
                <p><strong>Method:</strong> ${event.data.method}</p>
                <p><strong>For Treatment:</strong> ${event.data.treatmentName}</p>
            `;
        } else if (event.type === 'prescription') {
            icon = '💊';
            title = 'Prescription';
            details = `
                <p style="white-space: pre-wrap;"><strong>Medications:</strong><br>${escapeHtml(event.data.medications)}</p>
            `;
        }</span></p>
                <p><strong>Method:</strong> ${event.data.method}</p>
                <p><strong>For Treatment:</strong> ${event.data.treatmentName}</p>
            `;
        }

        el.innerHTML = `
            <div class="timeline-icon">${icon}</div>
            <div class="event-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="event-title">${title}</div>
                <div class="event-date">${displayDate}</div>
            </div>
            <div class="event-details">${details}</div>
        `;
        container.appendChild(el);
    });
}

// Attach filter listeners
document.querySelectorAll('.filter-chips .chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        renderTimeline(e.target.getAttribute('data-filter'));
    });
});
