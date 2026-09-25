import { db, auth, onAuthStateChanged, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot } from "./firebase-config.js";

const patientModal = document.getElementById('patientModal');
const openModalBtn = document.getElementById('openModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const patientForm = document.getElementById('patientForm');

let currentPatients = [];
let currentUserUid = null;

// Open modal
window.openNewPatientModal = function() {
    const pModal = document.getElementById('patientModal');
    const pForm = document.getElementById('patientForm');
    if (pForm) pForm.reset();
    const pId = document.getElementById('patientId');
    if (pId) pId.value = '';
    const modalTitle = document.getElementById('patientModalTitle');
    const isAr = document.documentElement.lang === 'ar';
    if (modalTitle) {
        modalTitle.innerText = isAr ? 'إضافة مريض جديد' : 'Add New Patient';
        modalTitle.setAttribute('data-ar', 'إضافة مريض جديد');
        modalTitle.setAttribute('data-en', 'Add New Patient');
    }
    const submitBtn = pForm ? pForm.querySelector('button[type="submit"]') : null;
    if (submitBtn) {
        submitBtn.innerText = isAr ? 'حفظ المريض' : 'Save Patient';
        submitBtn.setAttribute('data-ar', 'حفظ المريض');
        submitBtn.setAttribute('data-en', 'Save Patient');
    }
    document.querySelectorAll('.alert-checkbox').forEach(cb => cb.checked = false);
    if (pModal) {
        pModal.classList.add('show');
        history.pushState({ modal: 'patient' }, '', window.location.hash);
    }
};

if (openModalBtn) {
    openModalBtn.addEventListener('click', window.openNewPatientModal);
}

const quickNewPatientBtn = document.getElementById('quickNewPatientBtn');
if (quickNewPatientBtn) {
    quickNewPatientBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.openNewPatientModal();
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
// Load patients from Firestore
async function loadPatients() {
  if (!currentUserUid) {
      const user = auth.currentUser;
      if (user) currentUserUid = user.uid;
      else return;
  }

  try {
    const patientsRef = collection(db, "users", currentUserUid, "patients");
    const querySnapshot = await getDocs(patientsRef);
    let fetchedPatients = [];

    querySnapshot.forEach((d) => {
      fetchedPatients.push({ id: d.id, ...d.data() });
    });

    // Initialize displayId if not present for searching
    fetchedPatients = fetchedPatients.map(p => ({
      ...p,
      displayId: p.displayId || 'P' + p.id.substring(0, 5).toUpperCase()
    }));

    currentPatients = fetchedPatients;
    window.currentPatients = currentPatients;

    renderPatients(currentPatients);

    if (typeof window.updateDashboardStats === 'function') {
      window.updateDashboardStats();
    }
  } catch (e) {
    console.error("Error loading patients: ", e);
  }
}
window.loadPatients = loadPatients;

// Render patients table
function renderPatients(patientsToRender = currentPatients) {
  const tbody = document.getElementById('patients-table-body');
  if (!tbody) {
      console.warn("Table body not found!");
      return;
  }

  tbody.innerHTML = '';

  const sortedPatients = [...patientsToRender];

  // Sort from newest to oldest based on createdAt, fallback to numeric displayId
  sortedPatients.sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    const aId = parseInt(String(a.displayId).replace(/\D/g, '')) || 0;
    const bId = parseInt(String(b.displayId).replace(/\D/g, '')) || 0;
    return bId - aId;
  });

  sortedPatients.forEach(patient => {
    const row = document.createElement('tr');
    const displayId = patient.displayId;

    const callTargetPhone = (patient.callPref === 'phone2' && patient.phone2) ? patient.phone2 : patient.phone;
    const cleanCallPhone = String(callTargetPhone || '').replace(/\D/g, '');

    const waTargetPhone = (patient.waPref === 'phone2' && patient.phone2) ? patient.phone2 : patient.phone;
    const cleanWaPhone = String(waTargetPhone || '').replace(/\D/g, '');
    const waLinkPhone = cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone;

    let displayPhone = patient.phone || '-';
    if (patient.phone2) displayPhone += ` / ${patient.phone2}`;

    row.style.cursor = 'pointer';
    row.innerHTML = `
      <td onclick="window.openPatientProfile('${patient.id}')" style="cursor: pointer;">${displayId}</td>
      <td onclick="window.openPatientProfile('${patient.id}')" style="font-weight: 600; color: var(--brand-primary); cursor: pointer; text-decoration: underline; text-decoration-color: transparent; transition: text-decoration-color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;" onmouseover="this.style.textDecorationColor='var(--brand-primary)'" onmouseout="this.style.textDecorationColor='transparent'">${patient.name || 'Unknown'}</td>
      <td>
        <span onclick="window.openPatientProfile('${patient.id}')" style="white-space: nowrap; cursor: pointer;">${displayPhone}</span>
        <a href="tel:${cleanCallPhone}" style="color:var(--brand-primary); text-decoration:none; margin-left:0.5rem; display:inline-flex; align-items:center;" title="Call">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </a>
        <a href="https://wa.me/${waLinkPhone}" target="_blank" style="color:#25D366; text-decoration:none; margin-left:0.5rem; display:inline-flex; align-items:center;" title="WhatsApp">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </a>
      </td>
      <td onclick="window.openPatientProfile('${patient.id}')">${patient.lastVisit || '-'}</td>
      <td>
        <button class="btn-action btn-edit" onclick="window.editPatient('${patient.id}')" style="display:inline-flex; align-items:center; gap:3px;" title="تعديل بيانات المريض / Edit">
            ⚙️ <span data-ar="تعديل" data-en="Edit">Edit</span>
        </button>
        <button class="btn-action btn-delete" onclick="window.deletePatient('${patient.id}')" title="حذف / Delete">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}
window.renderPatients = renderPatients;

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
                const selectedAlerts = Array.from(document.querySelectorAll('.alert-checkbox:checked')).map(cb => cb.value).join(', ');
                await updateDoc(patientRef, {
                    name: name,
                    phone: phone,
                    phone2: phone2,
                    callPref: callPref,
                    waPref: waPref,
                    age: age,
                    notes: notes,
                    gender: gender,
                    lastVisit: lastVisit,
                    medicalAlerts: selectedAlerts,
                    updatedAt: new Date().toISOString()
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

            // If the user was viewing this patient's profile, update the profile view immediately!
            if (currentProfilePatientId === idField && typeof window.openPatientProfile === 'function') {
                window.openPatientProfile(idField);
            }

            // Also update home dashboard stats if function exists
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }

            const isAr = document.documentElement.lang === 'ar';
            if (window.showToast) {
                window.showToast(idField ? 
                    (isAr ? 'تم حفظ تعديلات المريض بنجاح' : 'Patient details updated successfully!') : 
                    (isAr ? 'تمت إضافة المريض بنجاح' : 'Patient added successfully!'), 'success');
            }

            if(window.closeModalAndPopState) window.closeModalAndPopState(patientModal);
            else patientModal.classList.remove('show');
        } catch (e) {
            console.error("Error saving patient: ", e);
            const isAr = document.documentElement.lang === 'ar';
            if (window.showToast) {
                window.showToast(isAr ? 'حدث خطأ أثناء حفظ بيانات المريض' : 'Error saving patient data. Please try again.', 'error');
            } else {
                alert("Error saving patient data. Please try again.");
            }
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

        const modalTitle = document.getElementById('patientModalTitle');
        const isAr = document.documentElement.lang === 'ar';
        if (modalTitle) {
            modalTitle.innerText = isAr ? 'تعديل بيانات المريض' : 'Edit Patient Details';
            modalTitle.setAttribute('data-ar', 'تعديل بيانات المريض');
            modalTitle.setAttribute('data-en', 'Edit Patient Details');
        }

        const submitBtn = patientForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerText = isAr ? 'حفظ التعديلات' : 'Save Changes';
            submitBtn.setAttribute('data-ar', 'حفظ التعديلات');
            submitBtn.setAttribute('data-en', 'Save Changes');
        }

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
        document.getElementById('lastVisit').value = patient.lastVisit || '';

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
window.currentProfilePatientId = null;

// Expose globally for onclick
window.openPatientProfile = function(patientId) {
    currentProfilePatientId = patientId;
    window.currentProfilePatientId = patientId;
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
        const alertLabel = alertsBox.querySelector('strong');
        if (alertLabel) {
            const isArabic = document.documentElement.getAttribute('lang') === 'ar';
            alertLabel.innerText = isArabic ? alertLabel.getAttribute('data-ar') || '⚠️ تنبيه طبي:' : alertLabel.getAttribute('data-en') || '⚠️ Medical Alert:';
        }
        alertsBox.style.display = 'flex';
    } else {
        alertsBox.style.display = 'none';
    }

    // Direct Call & WhatsApp links on profile card
    const callLink = document.getElementById('profileCallLink');
    const waLink = document.getElementById('profileWaLink');
    const callPhone = (patient.callPref === 'phone2' && patient.phone2) ? patient.phone2 : patient.phone;
    const cleanCall = String(callPhone || '').replace(/\D/g, '');
    const waPhone = (patient.waPref === 'phone2' && patient.phone2) ? patient.phone2 : patient.phone;
    const cleanWa = String(waPhone || '').replace(/\D/g, '');
    const fullWa = cleanWa.startsWith('0') ? '2' + cleanWa : '20' + cleanWa;

    if (callLink) callLink.href = cleanCall ? `tel:${cleanCall}` : '#';
    if (waLink) {
        const isAr = document.documentElement.lang === 'ar';
        const defaultMsg = isAr ? 
            `مرحباً ${patient.name}، معك عيادة الأسنان بخصوص موعدكم القادم.` : 
            `Hello ${patient.name}, this is your dental clinic regarding your upcoming appointment.`;
        waLink.href = cleanWa ? `https://wa.me/${fullWa}?text=${encodeURIComponent(defaultMsg)}` : '#';
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
    loadPatientGallery(patientId);
};

window.printPatientSummary = function() {
    window.print();
};

document.getElementById('backToPatientsBtn').addEventListener('click', () => {
    document.querySelector('.sidebar-link[data-target="patients-section"]').click();
});

// FDI Tooth Names Mapping
const toothNames = {
    1: { en: 'Central Incisor', ar: 'قاطع مركزي' },
    2: { en: 'Lateral Incisor', ar: 'قاطع جانبي' },
    3: { en: 'Canine', ar: 'ناب' },
    4: { en: 'First Premolar', ar: 'ضاحك أول' },
    5: { en: 'Second Premolar', ar: 'ضاحك ثانٍ' },
    6: { en: 'First Molar', ar: 'ضرس أول' },
    7: { en: 'Second Molar', ar: 'ضرس ثانٍ' },
    8: { en: 'Third Molar (Wisdom)', ar: 'ضرس العقل' }
};
const quadNames = {
    1: { en: 'Upper Right', ar: 'العلوي الأيمن' },
    2: { en: 'Upper Left', ar: 'العلوي الأيسر' },
    3: { en: 'Lower Left', ar: 'السفلي الأيسر' },
    4: { en: 'Lower Right', ar: 'السفلي الأيمن' }
};

function getToothDescription(num) {
    const quad = Math.floor(num / 10);
    const pos = num % 10;
    const isAr = document.documentElement.lang === 'ar';
    const q = quadNames[quad] ? (isAr ? quadNames[quad].ar : quadNames[quad].en) : '';
    const t = toothNames[pos] ? (isAr ? toothNames[pos].ar : toothNames[pos].en) : '';
    return isAr ? `${t} (${q}) - رقم ${num}` : `Tooth #${num}: ${q} ${t}`;
}

// --- Odontogram Logic ---
const toothBoxes = document.querySelectorAll('.tooth-box');
const saveOdontogramBtn = document.getElementById('saveOdontogramBtn');

// Handle tooth click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('tooth-box')) {
        const condition = document.querySelector('input[name="toothCondition"]:checked').value;
        const toothNum = parseInt(e.target.getAttribute('data-tooth'));

        // Trigger tactile micro-bounce animation
        e.target.classList.remove('tooth-bounce');
        void e.target.offsetWidth;
        e.target.classList.add('tooth-bounce');

        // Remove existing condition classes
        e.target.classList.remove('cond-decay', 'cond-filled', 'cond-missing');
        e.target.removeAttribute('data-condition');

        if (condition !== 'normal') {
            e.target.classList.add('cond-' + condition);
            e.target.setAttribute('data-condition', condition);
        }

        const infoEl = document.getElementById('odontogramSelectedToothInfo');
        if (infoEl && toothNum) {
            const isAr = document.documentElement.lang === 'ar';
            const condMap = {
                'normal': isAr ? 'سليم' : 'Normal',
                'decay': isAr ? 'تسوس' : 'Decay',
                'filled': isAr ? 'حشو' : 'Filled',
                'missing': isAr ? 'مخلوع' : 'Missing'
            };
            infoEl.innerHTML = `<span>${getToothDescription(toothNum)} &bull; <strong>${condMap[condition] || condition}</strong></span>`;
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
        const isAr = document.documentElement.lang === 'ar';
        const docRef = doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'records', 'odontogram');
        await setDoc(docRef, { teeth: teethData, updatedAt: new Date().toISOString() });
        if (window.showToast) {
            window.showToast(isAr ? 'تم حفظ مخطط الأسنان بنجاح' : 'Odontogram saved successfully!', 'success');
        } else {
            alert("Odontogram saved successfully!");
        }
    } catch (e) {
        console.error("Error saving odontogram", e);
        const isAr = document.documentElement.lang === 'ar';
        if (window.showToast) {
            window.showToast(isAr ? 'حدث خطأ أثناء حفظ مخطط الأسنان' : 'Error saving odontogram', 'error');
        } else {
            alert("Error saving.");
        }
    }
});

const prescriptionModal = document.getElementById('prescriptionModal');
const addProfileTreatmentBtn = document.getElementById('addProfileTreatmentBtn');
if (addProfileTreatmentBtn) {
    addProfileTreatmentBtn.addEventListener('click', () => {
        const treatmentForm = document.getElementById('treatmentForm');
        const treatmentModal = document.getElementById('treatmentModal');
        const patientNameInput = document.getElementById('treatmentPatientName');
        const treatmentIdInput = document.getElementById('treatmentId');

        if (treatmentForm) treatmentForm.reset();
        if (treatmentIdInput) treatmentIdInput.value = '';

        if (patientNameInput && window.currentProfilePatientId) {
            const patient = currentPatients.find(p => p.id === window.currentProfilePatientId);
            patientNameInput.value = patient ? patient.name : '';
            patientNameInput.setAttribute('data-target-id', window.currentProfilePatientId);
        }

        if (treatmentModal) {
            treatmentModal.classList.add('show');
            history.pushState({ modal: 'treatment' }, '', window.location.hash || '#patient-profile-section');
        }
    });
}

document.getElementById('addProfilePrescriptionBtn').addEventListener('click', () => {
    document.getElementById('prescriptionForm').reset();
    
    // Check patient's medical alerts / drug allergies
    const patient = currentPatients.find(p => p.id === currentProfilePatientId);
    const allergyWarning = document.getElementById('prescAllergyWarning');
    const allergyText = document.getElementById('prescAllergyText');
    if (patient && patient.medicalAlerts && patient.medicalAlerts.trim() !== '') {
        if (allergyText) allergyText.innerText = patient.medicalAlerts;
        if (allergyWarning) allergyWarning.style.display = 'flex';
    } else {
        if (allergyWarning) allergyWarning.style.display = 'none';
    }

    prescriptionModal.classList.add('show');
    history.pushState({ modal: 'prescription' }, '', '#patient-profile-section');
});

// Quick medication buttons handler
document.querySelectorAll('.quick-med-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const med = btn.getAttribute('data-med');
        const textarea = document.getElementById('prescMeds');
        if (!textarea) return;
        if (textarea.value.trim() === '') {
            textarea.value = med;
        } else {
            textarea.value = textarea.value.trim() + '\n' + med;
        }
    });
});

// Quick clinical complaint buttons
document.querySelectorAll('.quick-complaint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const input = document.getElementById('visitChiefComplaint');
        if (input) input.value = text;
    });
});

// Quick clinical notes buttons
document.querySelectorAll('.quick-notes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        const textarea = document.getElementById('visitNotes');
        if (!textarea) return;
        if (textarea.value.trim() === '') {
            textarea.value = text;
        } else {
            textarea.value = textarea.value.trim() + '\n' + text;
        }
    });
});

// Quick treatment plan buttons
document.querySelectorAll('.quick-fill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-val');
        const cost = btn.getAttribute('data-cost');
        const typeInput = document.getElementById('treatmentType');
        const costInput = document.getElementById('treatmentCost');
        if (typeInput) typeInput.value = type;
        if (costInput && (!costInput.value || costInput.value === '0')) costInput.value = cost;
    });
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

    const pId = document.getElementById('prescriptionId').value;
    try {
        if (pId) {
            const ref = doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'prescriptions', pId);
            await updateDoc(ref, { medications: meds });
        } else {
            const ref = collection(db, 'users', user.uid, 'patients', currentProfilePatientId, 'prescriptions');
            await addDoc(ref, {
                medications: meds,
                date: new Date().toISOString()
            });
        }
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

    const vId = document.getElementById('visitId').value;
    try {
        if (vId) {
            const ref = doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'visits', vId);
            await updateDoc(ref, { complaint, notes });
        } else {
            const ref = collection(db, 'users', user.uid, 'patients', currentProfilePatientId, 'visits');
            await addDoc(ref, {
                complaint,
                notes,
                timestamp: new Date().toISOString()
            });
        }
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
                <div style="margin-top: 1rem;">
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="window.editVisit('${event.id}')">Edit</button>
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: var(--status-error); border-color: var(--status-error);" onclick="window.deleteVisit('${event.id}')">Delete</button>
                </div>
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
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="window.editTreatment('${event.id}')">Edit</button>
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: var(--status-error); border-color: var(--status-error);" onclick="window.deleteTreatment('${event.id}')">Delete</button>
                </div>
            `;
        } else if (event.type === 'payment') {
            icon = '🟢';
            title = 'Payment Received';
            details = `
                <p><strong>Amount:</strong> <span style="color: var(--status-completed); font-weight: bold;">${event.data.amount}</span></p>
                <p><strong>Method:</strong> ${event.data.method}</p>
                <p><strong>For Treatment:</strong> ${event.data.treatmentName}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="window.editPayment('${event.id}')">Edit</button>
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: var(--status-error); border-color: var(--status-error);" onclick="window.deletePayment('${event.id}', '${event.data.treatmentId}', ${parseFloat(event.data.amount) || 0})">Delete</button>
                </div>
            `;
        } else if (event.type === 'prescription') {
            icon = '💊';
            title = 'Prescription';
            details = `
                <p style="white-space: pre-wrap;"><strong>Medications:</strong><br>${escapeHtml(event.data.medications)}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="window.editPrescription('${event.id}')">Edit</button>
                    <button class="btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: var(--status-error); border-color: var(--status-error);" onclick="window.deletePrescription('${event.id}')">Delete</button>
                </div>
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

const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener('click', () => {
        window.closeModalAndPopState(document.getElementById('paymentModal'));
    });
}

const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    // Store original amount when editing so we can adjust the treatment paidAmount correctly
    let originalPaymentAmount = 0;

    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const payId = document.getElementById('paymentId').value;
        const tId = document.getElementById('paymentTreatmentId').value;
        const pId = document.getElementById('paymentPatientId').value;
        const pName = document.getElementById('paymentPatientName').value || document.getElementById('profilePatientName').innerText;
        const tName = document.getElementById('paymentTreatmentName').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value) || 0;
        const method = document.getElementById('paymentMethod').value;
        const date = document.getElementById('paymentDate').value;

        try {
            if (payId) {
                // UPDATE EXISTING PAYMENT
                const payRef = doc(db, 'users', user.uid, 'payments', payId);
                await updateDoc(payRef, { amount, method, date });

                // Adjust parent treatment paidAmount (subtract old, add new)
                const tRef = doc(db, 'users', user.uid, 'treatments', tId);
                const tDoc = await getDoc(tRef);
                if (tDoc.exists()) {
                    const currentPaid = parseFloat(tDoc.data().paidAmount) || 0;
                    const newPaid = (currentPaid - originalPaymentAmount) + amount;
                    await updateDoc(tRef, { paidAmount: newPaid });
                }
                alert('Payment updated successfully');
            } else {
                // CREATE NEW PAYMENT
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

                // Update paidAmount on global treatment document
                const tRef = doc(db, 'users', user.uid, 'treatments', tId);
                const tDoc = await getDoc(tRef);
                if (tDoc.exists()) {
                    const currentPaid = parseFloat(tDoc.data().paidAmount) || 0;
                    await updateDoc(tRef, { paidAmount: currentPaid + amount });
                }
                alert('Payment added successfully');
            }

            window.closeModalAndPopState(document.getElementById('paymentModal'));
            loadPatientTimeline(pId);
        } catch (error) {
            console.error("Error saving payment", error);
            alert("Error saving payment.");
        }
    });

    window.editPayment = function(id) {
        const event = currentTimelineEvents.find(e => e.id === id && e.type === 'payment');
        if (!event) return;

        document.getElementById('paymentId').value = event.id;
        document.getElementById('paymentTreatmentId').value = event.data.treatmentId;
        document.getElementById('paymentPatientId').value = event.data.patientId;
        document.getElementById('paymentAmount').value = event.data.amount;
        document.getElementById('paymentMethod').value = event.data.method;
        document.getElementById('paymentDate').value = event.data.date;

        originalPaymentAmount = parseFloat(event.data.amount) || 0;

        const paymentModal = document.getElementById('paymentModal');
        paymentModal.classList.add('show');
        history.pushState({ modal: 'payment' }, '', window.location.hash);
    };

    window.deletePayment = async function(payId, tId, amount) {
        if (!confirm('Are you sure you want to delete this payment?')) return;
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Delete payment
            await deleteDoc(doc(db, 'users', user.uid, 'payments', payId));

            // Adjust treatment paidAmount
            const tRef = doc(db, 'users', user.uid, 'treatments', tId);
            const tDoc = await getDoc(tRef);
            if (tDoc.exists()) {
                const currentPaid = parseFloat(tDoc.data().paidAmount) || 0;
                await updateDoc(tRef, { paidAmount: Math.max(0, currentPaid - amount) });
            }

            loadPatientTimeline(currentProfilePatientId);
        } catch(e) { console.error(e); }
    };

}

// Print Invoice Logic
window.printInvoice = async function(tId, pId) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const tRef = doc(db, 'users', user.uid, 'treatments', tId);
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

        // Load payments for this treatment from global payments
        const paymentsRef = collection(db, 'users', user.uid, 'payments');
        const pSnap = await getDocs(paymentsRef);

        const tbody = document.getElementById('invoice-payments-body');
        tbody.innerHTML = '';

        // filter global payments for this treatmentId
        const filteredP = pSnap.docs.map(d => d.data()).filter(d => d.treatmentId === tId);
        const sortedPayments = filteredP.sort((a,b) => new Date(a.date) - new Date(b.date));

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


window.editVisit = function(id) {
    const event = currentTimelineEvents.find(e => e.id === id && e.type === 'visit');
    if (!event) return;
    document.getElementById('visitId').value = event.id;
    document.getElementById('visitChiefComplaint').value = event.data.complaint;
    document.getElementById('visitNotes').value = event.data.notes;

    const visitModal = document.getElementById('visitModal');
    visitModal.classList.add('show');
    history.pushState({ modal: 'visit' }, '', window.location.hash);
};

window.deleteVisit = async function(id) {
    if (!confirm('Are you sure you want to delete this visit?')) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'visits', id));
        loadPatientTimeline(currentProfilePatientId);
    } catch(e) { console.error(e); }
};

window.editPrescription = function(id) {
    const event = currentTimelineEvents.find(e => e.id === id && e.type === 'prescription');
    if (!event) return;
    document.getElementById('prescriptionId').value = event.id;
    document.getElementById('prescMeds').value = event.data.medications;

    const pModal = document.getElementById('prescriptionModal');
    pModal.classList.add('show');
    history.pushState({ modal: 'prescription' }, '', window.location.hash);
};

window.deletePrescription = async function(id) {
    if (!confirm('Are you sure you want to delete this prescription?')) return;
    const user = auth.currentUser;
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'prescriptions', id));
        loadPatientTimeline(currentProfilePatientId);
    } catch(e) { console.error(e); }
};

// --- Patient X-Rays & Photos Gallery Logic ---
const toggleGalleryBtn = document.getElementById('toggleGalleryBtn');
const galleryContent = document.getElementById('galleryContent');
const galleryIcon = document.getElementById('galleryIcon');
const triggerUploadImageBtn = document.getElementById('triggerUploadImageBtn');
const patientImageFileInput = document.getElementById('patientImageFileInput');
const patientGalleryGrid = document.getElementById('patientGalleryGrid');

if (toggleGalleryBtn) {
    toggleGalleryBtn.addEventListener('click', () => {
        const isHidden = galleryContent.style.display === 'none';
        galleryContent.style.display = isHidden ? 'block' : 'none';
        if (galleryIcon) galleryIcon.innerText = isHidden ? '▲' : '▼';
    });
}

if (triggerUploadImageBtn && patientImageFileInput) {
    triggerUploadImageBtn.addEventListener('click', () => {
        patientImageFileInput.click();
    });

    patientImageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentProfilePatientId) return;

        const user = auth.currentUser;
        if (!user) return;

        const isAr = document.documentElement.lang === 'ar';
        if (window.showToast) window.showToast(isAr ? 'جاري معالجة ورفع الصورة...' : 'Processing and uploading photo...', 'info', 3000);

        try {
            // Compress image using canvas for quick storage
            const reader = new FileReader();
            reader.onload = async (event) => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const maxDim = 1200;
                    let width = img.width;
                    let height = img.height;
                    if (width > height && width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

                    const photoRef = collection(db, 'users', user.uid, 'patients', currentProfilePatientId, 'photos');
                    await addDoc(photoRef, {
                        imageData: dataUrl,
                        name: file.name,
                        createdAt: new Date().toISOString()
                    });

                    if (window.showToast) window.showToast(isAr ? 'تم رفع الصورة بنجاح!' : 'Photo uploaded successfully!', 'success');
                    loadPatientGallery(currentProfilePatientId);
                    patientImageFileInput.value = '';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Error uploading photo', err);
            if (window.showToast) window.showToast(isAr ? 'فشل رفع الصورة' : 'Failed to upload photo', 'error');
        }
    });
}

window.loadPatientGallery = async function(patientId) {
    if (!patientGalleryGrid) return;
    const user = auth.currentUser;
    if (!user) return;

    const isAr = document.documentElement.lang === 'ar';
    patientGalleryGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1rem;">${isAr ? 'جاري تحميل المعرض...' : 'Loading gallery...'}</div>`;

    try {
        const photosRef = collection(db, 'users', user.uid, 'patients', patientId, 'photos');
        const snap = await getDocs(photosRef);
        patientGalleryGrid.innerHTML = '';

        if (snap.empty) {
            patientGalleryGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 1rem;">${isAr ? 'لا توجد صور أو أشعة مرفوعة بعد' : 'No photos or X-Rays uploaded yet'}</div>`;
            return;
        }

        let currentPatientPhotos = [];
        snap.forEach(d => {
            const data = d.data();
            currentPatientPhotos.push({ id: d.id, ...data });
        });
        window._currentPatientPhotos = currentPatientPhotos;

        currentPatientPhotos.forEach((data, index) => {
            const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '';
            const card = document.createElement('div');
            card.style.cssText = 'position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: var(--bg-surface); aspect-ratio: 1; box-shadow: var(--shadow-sm); cursor: pointer; group;';
            card.innerHTML = `
                <img src="${data.imageData}" alt="X-Ray" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.72rem; padding: 4px 6px; display: flex; justify-content: space-between; align-items: center;">
                    <span>${dateStr}</span>
                    <button class="delete-photo-btn" data-id="${data.id}" style="background: none; border: none; color: #ef4444; font-weight: bold; cursor: pointer; padding: 0 4px; font-size: 0.9rem;" title="Delete">✕</button>
                </div>
            `;

            // Open full view in fullscreen gallery modal
            card.querySelector('img').addEventListener('click', () => {
                window.openFullscreenGallery(index);
            });

            // Delete photo
            card.querySelector('.delete-photo-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm(isAr ? 'هل تريد حذف هذه الصورة؟' : 'Delete this image?')) return;
                try {
                    await deleteDoc(doc(db, 'users', user.uid, 'patients', currentProfilePatientId, 'photos', data.id));
                    loadPatientGallery(currentProfilePatientId);
                } catch (delErr) {
                    console.error(delErr);
                }
            });

            patientGalleryGrid.appendChild(card);
        });
    } catch (e) {
        console.error('Error loading gallery', e);
        patientGalleryGrid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--status-error); text-align: center;">Error loading images.</div>`;
    }
};

// --- Interactive Fullscreen Gallery Logic ---
let activeGalleryIndex = 0;
let isZoomed = false;

window.openFullscreenGallery = function(startIndex = 0) {
    const photos = window._currentPatientPhotos || [];
    if (!photos.length) return;

    activeGalleryIndex = Math.max(0, Math.min(startIndex, photos.length - 1));
    const modal = document.getElementById('imageGalleryModal');
    if (!modal) return;

    modal.classList.add('show');
    history.pushState({ modal: 'fullscreen-gallery' }, '', window.location.hash || '#patient-profile-section');
    renderActiveGalleryItem();
    setupGalleryControls();
};

function renderActiveGalleryItem() {
    const photos = window._currentPatientPhotos || [];
    if (!photos.length) return;

    const current = photos[activeGalleryIndex];
    const mainImg = document.getElementById('galleryMainImg');
    const counter = document.getElementById('galleryCounter');
    const dateCaption = document.getElementById('galleryDateCaption');
    const downloadBtn = document.getElementById('galleryDownloadBtn');
    const thumbnailsBar = document.getElementById('galleryThumbnailsBar');

    // Reset Zoom
    isZoomed = false;
    if (mainImg) {
        mainImg.src = current.imageData;
        mainImg.style.transform = 'scale(1)';
        mainImg.style.cursor = 'zoom-in';
    }

    if (counter) counter.innerText = `${activeGalleryIndex + 1} / ${photos.length}`;
    if (dateCaption) {
        const dateStr = current.createdAt ? new Date(current.createdAt).toLocaleString() : '';
        dateCaption.innerText = (current.name ? current.name + ' • ' : '') + dateStr;
    }

    if (downloadBtn) {
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = current.imageData;
            a.download = current.name || `dental_xray_${activeGalleryIndex + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    }

    // Render Thumbnails Filmstrip
    if (thumbnailsBar) {
        thumbnailsBar.innerHTML = '';
        photos.forEach((p, idx) => {
            const thumb = document.createElement('img');
            thumb.src = p.imageData;
            thumb.style.cssText = `width: 50px; height: 50px; object-fit: cover; border-radius: 6px; cursor: pointer; opacity: ${idx === activeGalleryIndex ? '1' : '0.5'}; border: 2px solid ${idx === activeGalleryIndex ? 'var(--brand-primary)' : 'transparent'}; transition: opacity 0.2s, transform 0.2s;`;
            thumb.onclick = (e) => {
                e.stopPropagation();
                activeGalleryIndex = idx;
                renderActiveGalleryItem();
            };
            thumbnailsBar.appendChild(thumb);
        });
    }
}

let galleryControlsBound = false;
function setupGalleryControls() {
    if (galleryControlsBound) return;
    galleryControlsBound = true;

    const modal = document.getElementById('imageGalleryModal');
    const closeBtn = document.getElementById('galleryCloseBtn');
    const prevBtn = document.getElementById('galleryPrevBtn');
    const nextBtn = document.getElementById('galleryNextBtn');
    const mainImg = document.getElementById('galleryMainImg');
    const container = document.getElementById('galleryImageContainer');

    function closeGallery() {
        if (window.closeModalAndPopState) {
            window.closeModalAndPopState(modal);
        } else {
            modal.classList.remove('show');
        }
    }

    if (closeBtn) closeBtn.onclick = closeGallery;

    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            const photos = window._currentPatientPhotos || [];
            if (!photos.length) return;
            activeGalleryIndex = (activeGalleryIndex - 1 + photos.length) % photos.length;
            renderActiveGalleryItem();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            const photos = window._currentPatientPhotos || [];
            if (!photos.length) return;
            activeGalleryIndex = (activeGalleryIndex + 1) % photos.length;
            renderActiveGalleryItem();
        };
    }

    // Toggle Zoom on click
    if (mainImg) {
        mainImg.onclick = (e) => {
            e.stopPropagation();
            isZoomed = !isZoomed;
            if (isZoomed) {
                mainImg.style.transform = 'scale(1.85)';
                mainImg.style.cursor = 'zoom-out';
            } else {
                mainImg.style.transform = 'scale(1)';
                mainImg.style.cursor = 'zoom-in';
            }
        };
    }

    // Click outside image closes zoom or modal
    if (container) {
        container.onclick = (e) => {
            if (e.target === container) {
                if (isZoomed) {
                    isZoomed = false;
                    mainImg.style.transform = 'scale(1)';
                    mainImg.style.cursor = 'zoom-in';
                } else {
                    closeGallery();
                }
            }
        };
    }

    // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
    window.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('show')) return;
        if (e.key === 'Escape') {
            closeGallery();
        } else if (e.key === 'ArrowLeft') {
            const isRTL = document.documentElement.dir === 'rtl';
            if (isRTL) nextBtn.click();
            else prevBtn.click();
        } else if (e.key === 'ArrowRight') {
            const isRTL = document.documentElement.dir === 'rtl';
            if (isRTL) prevBtn.click();
            else nextBtn.click();
        }
    });
}

// --- Export Patients to CSV ---
const exportPatientsCsvBtn = document.getElementById('exportPatientsCsvBtn');
if (exportPatientsCsvBtn) {
    exportPatientsCsvBtn.addEventListener('click', () => {
        if (!currentPatients || currentPatients.length === 0) {
            const isAr = document.documentElement.lang === 'ar';
            if (window.showToast) window.showToast(isAr ? 'لا توجد بيانات مرضى للتصدير' : 'No patients to export', 'warning');
            return;
        }

        const headers = ['Display ID', 'Name', 'Gender', 'Age', 'Phone', 'Phone 2', 'Medical Alerts', 'Last Visit', 'Notes'];
        const rows = currentPatients.map(p => [
            `"${(p.displayId || '').replace(/"/g, '""')}"`,
            `"${(p.name || '').replace(/"/g, '""')}"`,
            `"${(p.gender || '').replace(/"/g, '""')}"`,
            `"${(p.age || '')}"`,
            `"${(p.phone || '').replace(/"/g, '""')}"`,
            `"${(p.phone2 || '').replace(/"/g, '""')}"`,
            `"${(p.medicalAlerts || '').replace(/"/g, '""')}"`,
            `"${(p.lastVisit || '')}"`,
            `"${(p.notes || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Molarize_Patients_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}
