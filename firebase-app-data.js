// This file handles Appointments, Treatment Plans, and Dashboard Stats using Firebase Firestore.
import { db, auth, onAuthStateChanged, signOut, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot } from "./firebase-config.js";

let currentUserUid = null;
let calendarInstance = null;
let revenueChartInstance = null;
let currentAppointments = [];
let currentTreatments = [];

// DOM Elements (Home Stats)
const homeAppointmentsToday = document.getElementById('home-appointments-today');
const weeklyAppointmentsCount = document.getElementById('weekly-appointments-count');
const weeklyNewPatients = document.getElementById('weekly-new-patients');
const weeklyRevenue = document.getElementById('weekly-revenue');
const homeRecentPatients = document.getElementById('home-recent-patients');
const homeTimelineEvents = document.getElementById('home-timeline-events');
const tomorrowTimelineEvents = document.getElementById('tomorrow-timeline-events');
const greetingMessage = document.getElementById('greetingMessage');
const currentDateDisplay = document.getElementById('currentDateDisplay');

// DOM Elements (Modals)
const treatmentsTableBody = document.getElementById('treatments-table-body');
const treatmentModal = document.getElementById('treatmentModal');
const openTreatmentModalBtn = document.getElementById('openTreatmentModalBtn');
const cancelTreatmentBtn = document.getElementById('cancelTreatmentBtn');
const treatmentForm = document.getElementById('treatmentForm');

const appointmentModal = document.getElementById('appointmentModal');
const openAppointmentModalBtn = document.getElementById('openAppointmentModalBtn');
const cancelApptBtn = document.getElementById('cancelApptBtn');
const appointmentForm = document.getElementById('appointmentForm');

// Helper to open New Appointment modal from anywhere
window.openNewAppointmentModal = function(prefillDate, prefillPatient) {
    const aModal = document.getElementById('appointmentModal');
    const aForm = document.getElementById('appointmentForm');
    const apptContainer = document.getElementById('appointmentFormContainer');
    const embeddedContainer = document.getElementById('embeddedPatientFormContainer');
    if (apptContainer) apptContainer.style.display = 'block';
    if (embeddedContainer) embeddedContainer.style.display = 'none';
    if (aForm) aForm.reset();
    const aId = document.getElementById('appointmentId');
    if (aId) aId.value = '';
    
    if (typeof window.resetApptPatientSelection === 'function') {
        window.resetApptPatientSelection();
    }

    if (prefillPatient) {
        if (typeof prefillPatient === 'object') {
            if (typeof window.selectPatientForAppointment === 'function') window.selectPatientForAppointment(prefillPatient);
        } else if (typeof prefillPatient === 'string') {
            const p = (window.currentPatients || []).find(x => x.id === prefillPatient || x.name === prefillPatient);
            if (p && typeof window.selectPatientForAppointment === 'function') {
                window.selectPatientForAppointment(p);
            }
        }
    }

    if (prefillDate) {
        const dateInput = document.getElementById('apptDate');
        if (dateInput) dateInput.value = prefillDate;
    }
    if (aModal) {
        aModal.classList.add('show');
        history.pushState({ modal: 'appointment' }, '', window.location.hash);
    }
};

// Make updateDashboardStats globally available immediately
window.updateDashboardStats = updateDashboardStats;

function setupAppControls() {
    // Quick Actions
    const quickNewPatientBtn = document.getElementById('quickNewPatientBtn');
    const quickNewAppointmentBtn = document.getElementById('quickNewAppointmentBtn');

    if (quickNewPatientBtn) {
        quickNewPatientBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof window.openNewPatientModal === 'function') {
                window.openNewPatientModal();
            } else {
                const btn = document.getElementById('openModalBtn');
                if (btn) btn.click();
            }
        };
    }
    if (quickNewAppointmentBtn) {
        quickNewAppointmentBtn.onclick = (e) => {
            e.preventDefault();
            window.openNewAppointmentModal();
        };
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.replace('index.html');
            }).catch((error) => {
                console.error("Logout error: ", error);
            });
        };
    }

    // Set Greeting & Date
    updateGreetingAndDate();
    setupGlobalPatientSearch();

    if (auth.currentUser) {
        currentUserUid = auth.currentUser.uid;
        initDashboard();
    }
}

function setupGlobalPatientSearch() {
    const searchInput = document.getElementById('globalPatientSearch');
    const resultsContainer = document.getElementById('globalSearchResults');
    if (!searchInput || !resultsContainer) return;

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (!val) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
            return;
        }

        const patients = window.currentPatients || [];
        const matches = patients.filter(p => {
            const nameMatch = p.name && p.name.toLowerCase().includes(val);
            const phoneMatch = (p.phone && p.phone.includes(val)) || (p.phone2 && p.phone2.includes(val));
            const idMatch = p.displayId && p.displayId.toLowerCase().includes(val);
            return nameMatch || phoneMatch || idMatch;
        }).slice(0, 6);

        const isAr = document.documentElement.lang === 'ar';

        if (matches.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem;">${isAr ? 'لم يتم العثور على مريض مطابق' : 'No matching patients found'}</div>`;
            resultsContainer.style.display = 'block';
            return;
        }

        resultsContainer.innerHTML = matches.map(p => {
            const callTargetPhone = (p.callPref === 'phone2' && p.phone2) ? p.phone2 : p.phone;
            const cleanCallPhone = String(callTargetPhone || '').replace(/\D/g, '');
            const waTargetPhone = (p.waPref === 'phone2' && p.phone2) ? p.phone2 : p.phone;
            const cleanWaPhone = String(waTargetPhone || '').replace(/\D/g, '');
            const waLinkPhone = cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone;

            return `
            <div style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background-color 0.15s;" 
                 onmouseover="this.style.backgroundColor='var(--bg-primary)'" onmouseout="this.style.backgroundColor='transparent'"
                 onclick="if(window.openPatientProfile){ window.openPatientProfile('${p.id}'); document.getElementById('globalSearchResults').style.display='none'; document.getElementById('globalPatientSearch').value=''; }">
                <div>
                    <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span style="color: var(--brand-primary); font-size: 0.8rem;">#${p.displayId || '-'}</span>
                        <span>${p.name}</span>
                        ${p.age ? `<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(${p.age} ${isAr ? 'سنة' : 'yrs'})</span>` : ''}
                    </div>
                    <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 8px;">
                        <span>📞 ${p.phone || '-'}</span>
                        ${p.medicalAlerts ? `<span class="status-badge status-error" style="font-size: 0.7rem; padding: 1px 6px;">⚠️ ${p.medicalAlerts}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 6px;" onclick="event.stopPropagation();">
                    <a href="tel:${cleanCallPhone}" class="btn-outline" style="padding: 4px 8px; font-size: 0.8rem; text-decoration: none;" title="${isAr ? 'اتصال' : 'Call'}">📞</a>
                    <a href="https://wa.me/${waLinkPhone}" target="_blank" class="btn-outline" style="padding: 4px 8px; font-size: 0.8rem; text-decoration: none; color: #25D366; border-color: rgba(37, 211, 102, 0.4);" title="WhatsApp">💬</a>
                </div>
            </div>
            `;
        }).join('');
        resultsContainer.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.style.display = 'none';
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        } else if (e.key === 'Escape') {
            resultsContainer.style.display = 'none';
        }
    });
}

// Run setup immediately or when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAppControls);
} else {
    setupAppControls();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        initDashboard();
    }
});

async function initDashboard() {
    await loadTreatments();
    await loadAppointments();
    updateDashboardStats();
    initCalendar();
    initChart();
    setupGlobalLedger();
}

// ---------------------------------------------------------
// Treatment Plans Logic
// ---------------------------------------------------------

if (openTreatmentModalBtn) {
    openTreatmentModalBtn.addEventListener('click', () => {
        treatmentForm.reset();
        document.getElementById('treatmentId').value = '';
        document.getElementById('treatmentPatientName').removeAttribute('data-target-id');
        treatmentModal.classList.add('show');
        history.pushState({ modal: 'treatment' }, '', window.location.hash);
    });
}

if (cancelTreatmentBtn) {
    cancelTreatmentBtn.addEventListener('click', () => {
        document.getElementById('treatmentPatientName').removeAttribute('data-target-id');
        if(window.closeModalAndPopState) window.closeModalAndPopState(treatmentModal);
        else treatmentModal.classList.remove('show');
    });
}

if (treatmentModal) {
    window.addEventListener('click', (event) => {
        if (event.target === treatmentModal) {
            document.getElementById('treatmentPatientName').removeAttribute('data-target-id');
            if(window.closeModalAndPopState) window.closeModalAndPopState(treatmentModal);
            else treatmentModal.classList.remove('show');
        }
    });
}

async function loadTreatments() {
    if (!currentUserUid) return;
    try {
        const treatmentsRef = collection(db, "users", currentUserUid, "treatments");
        const querySnapshot = await getDocs(treatmentsRef);
        currentTreatments = [];
        querySnapshot.forEach((d) => {
            currentTreatments.push({ id: d.id, ...d.data() });
        });
        renderTreatments();
        updateDashboardStats(); // Update revenue when treatments load
    } catch (e) {
        console.error("Error loading treatments: ", e);
    }
}

function getStatusBadgeClass(status) {
    if (status === 'Completed') return 'status-completed';
    if (status === 'In Progress') return 'status-inprogress';
    return 'status-pending';
}

function getStatusText(status) {
    const lang = document.documentElement.lang || 'en';
    if (lang === 'ar') {
        if (status === 'Completed') return 'مكتمل';
        if (status === 'In Progress') return 'جاري المعالجة';
        return 'قيد الانتظار';
    }
    if (status === 'Completed') return 'Completed';
    if (status === 'In Progress') return 'In Progress';
    return 'Pending';
}

function renderTreatments() {
    if (!treatmentsTableBody) return;
    treatmentsTableBody.innerHTML = '';
    const isAr = (document.documentElement.lang || 'en') === 'ar';

    currentTreatments.forEach(treatment => {
        const row = document.createElement('tr');
        const costFormatted = window.formatCurrency ? window.formatCurrency(treatment.cost) : `$${treatment.cost}`;
        const pct = parseFloat(treatment.discountPercent) || 0;
        const discountBadge = pct !== 0 ? 
            `<div style="font-size: 0.72rem; color: ${pct < 0 ? 'var(--status-completed)' : 'var(--brand-primary)'}; font-weight: 600;">${pct > 0 ? '+' : ''}${pct}% ${isAr ? (pct < 0 ? 'تخفيض' : 'زيادة') : (pct < 0 ? 'discount' : 'markup')}</div>` : '';

        row.innerHTML = `
            <td>${treatment.patientName}</td>
            <td>
                <div style="font-weight: 600;">${treatment.type}</div>
                ${discountBadge}
            </td>
            <td style="font-weight: 600;">${costFormatted}</td>
            <td><span class="status-badge ${getStatusBadgeClass(treatment.status)}">${getStatusText(treatment.status)}</span></td>
            <td>
                <button class="btn-action btn-edit" onclick="window.editTreatment('${treatment.id}')">${isAr ? 'تعديل' : 'Edit'}</button>
                <button class="btn-action btn-delete" onclick="window.deleteTreatment('${treatment.id}')">${isAr ? 'حذف' : 'Delete'}</button>
            </td>
        `;
        treatmentsTableBody.appendChild(row);
    });
}
window.renderTreatments = renderTreatments;

if (treatmentForm) {
    treatmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const idField = document.getElementById('treatmentId').value;
        const pNameInput = document.getElementById('treatmentPatientName');
        const patientName = pNameInput.value;
        const targetPatientId = pNameInput.getAttribute('data-target-id');
        const type = document.getElementById('treatmentType').value;
        const cost = parseFloat(document.getElementById('treatmentCost').value) || 0;
        const basePrice = parseFloat(document.getElementById('treatmentBasePrice')?.value) || cost;
        const discountPercent = parseFloat(document.getElementById('treatmentDiscountPercent')?.value) || 0;
        const adjustmentReason = document.getElementById('treatmentAdjustmentReason')?.value || 'none';
        const status = document.getElementById('treatmentStatus').value;
        const submitBtn = treatmentForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;

        try {
            const payload = {
                patientName,
                type,
                cost,
                basePrice,
                discountPercent,
                adjustmentReason,
                status
            };

            if (idField) {
                const treatmentRef = doc(db, "users", currentUserUid, "treatments", idField);
                await updateDoc(treatmentRef, payload);
            } else {
                const treatmentsRef = collection(db, "users", currentUserUid, "treatments");
                payload.createdAt = new Date().toISOString();
                if (targetPatientId) {
                    payload.patientId = targetPatientId;
                }
                await addDoc(treatmentsRef, payload);
            }

            await loadTreatments();
            if(window.closeModalAndPopState) window.closeModalAndPopState(treatmentModal);
            else treatmentModal.classList.remove('show');

            // If we are in a patient profile, refresh timeline
            if (targetPatientId && typeof window.loadPatientTimeline === 'function') {
                window.loadPatientTimeline(targetPatientId);
            }

            pNameInput.removeAttribute('data-target-id');
            updateDashboardStats(); // Update dashboard stats (revenue/overdue)
            initChart(); // Update chart

            const isAr = (document.documentElement.lang || 'en') === 'ar';
            if (window.showToast) {
                window.showToast(isAr ? 'تم حفظ خطة العلاج بنجاح' : 'Treatment plan saved successfully!', 'success');
            }
        } catch (e) {
            console.error("Error saving treatment: ", e);
            alert("Error saving treatment.");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

window.editTreatment = function(id) {
    const t = currentTreatments.find(x => x.id === id);
    if (t) {
        document.getElementById('treatmentId').value = t.id;
        document.getElementById('treatmentPatientName').value = t.patientName;

        // Ensure timeline refreshes by setting data-target-id if it exists
        if (t.patientId) {
            document.getElementById('treatmentPatientName').setAttribute('data-target-id', t.patientId);
        }

        document.getElementById('treatmentType').value = t.type;
        document.getElementById('treatmentCost').value = t.cost;
        document.getElementById('treatmentStatus').value = t.status;

        const baseInput = document.getElementById('treatmentBasePrice');
        const pctInput = document.getElementById('treatmentDiscountPercent');
        const reasonInput = document.getElementById('treatmentAdjustmentReason');

        if (baseInput) baseInput.value = t.basePrice || t.cost || 0;
        if (pctInput) pctInput.value = t.discountPercent || 0;
        if (reasonInput) reasonInput.value = t.adjustmentReason || 'none';

        if (typeof window.applyTreatmentPercentage === 'function') {
            window.applyTreatmentPercentage(t.discountPercent || 0, t.basePrice || t.cost || 0);
        }

        treatmentModal.classList.add('show');
    }
}

window.deleteTreatment = async function(id) {
    if (confirm('Are you sure you want to delete this treatment plan?')) {
        try {
            // Find the treatment before deleting to get its patientId
            const tRef = doc(db, "users", currentUserUid, "treatments", id);
            const tDoc = await getDoc(tRef);
            let pId = null;
            if (tDoc.exists()) pId = tDoc.data().patientId;

            await deleteDoc(tRef);
            await loadTreatments();
            updateDashboardStats(); // Update dashboard stats (revenue/overdue)
            initChart();

            // Refresh timeline if it exists
            if (pId && typeof window.loadPatientTimeline === 'function') {
                window.loadPatientTimeline(pId);
            }
        } catch (e) {
            console.error("Error deleting treatment: ", e);
        }
    }
}

// ---------------------------------------------------------

// ---------------------------------------------------------
// ---------------------------------------------------------
// Autocomplete & Dual Patient Search for Appointments
// ---------------------------------------------------------
const apptPatientInput = document.getElementById('apptPatientName');
const apptPatientFileIdInput = document.getElementById('apptPatientFileId');
const apptPatientId = document.getElementById('apptPatientId');
const apptPatientDropdown = document.getElementById('apptPatientDropdown');
const clearApptPatientSearchBtn = document.getElementById('clearApptPatientSearchBtn');
const apptSelectedPatientCard = document.getElementById('apptSelectedPatientCard');
const apptSelectedPatientName = document.getElementById('apptSelectedPatientName');
const apptSelectedPatientBadge = document.getElementById('apptSelectedPatientBadge');
const apptSelectedPatientPhone = document.getElementById('apptSelectedPatientPhone');
const btnChangeApptPatient = document.getElementById('btnChangeApptPatient');
const btnQuickAddPatient = document.getElementById('btnQuickAddPatient');

function selectPatientForAppointment(patient) {
    if (!patient) return;
    if (apptPatientInput) apptPatientInput.value = patient.name || '';
    if (apptPatientFileIdInput) apptPatientFileIdInput.value = patient.displayId || '';
    if (apptPatientId) apptPatientId.value = patient.id || '';

    if (apptSelectedPatientCard) {
        if (apptSelectedPatientName) apptSelectedPatientName.innerText = patient.name || '-';
        if (apptSelectedPatientBadge) apptSelectedPatientBadge.innerText = `#${patient.displayId || '-'}`;
        if (apptSelectedPatientPhone) {
            const phone = patient.phone ? `📱 ${patient.phone}` : '';
            apptSelectedPatientPhone.innerText = phone;
        }
        apptSelectedPatientCard.style.display = 'flex';
    }

    if (clearApptPatientSearchBtn) {
        clearApptPatientSearchBtn.style.display = 'inline-flex';
    }

    if (apptPatientDropdown) {
        apptPatientDropdown.style.display = 'none';
        apptPatientDropdown.innerHTML = '';
    }
}
window.selectPatientForAppointment = selectPatientForAppointment;

function resetApptPatientSelection() {
    if (apptPatientInput) apptPatientInput.value = '';
    if (apptPatientFileIdInput) apptPatientFileIdInput.value = '';
    if (apptPatientId) apptPatientId.value = '';
    if (apptSelectedPatientCard) apptSelectedPatientCard.style.display = 'none';
    if (clearApptPatientSearchBtn) clearApptPatientSearchBtn.style.display = 'none';
    if (apptPatientDropdown) {
        apptPatientDropdown.style.display = 'none';
        apptPatientDropdown.innerHTML = '';
    }
}
window.resetApptPatientSelection = resetApptPatientSelection;

function filterApptPatients() {
    if (!apptPatientDropdown) return;
    const nameTerm = (apptPatientInput ? apptPatientInput.value : '').trim().toLowerCase();
    const idTerm = (apptPatientFileIdInput ? apptPatientFileIdInput.value : '').trim().toLowerCase();
    const isFiltered = Boolean(nameTerm || idTerm);

    if (clearApptPatientSearchBtn) {
        clearApptPatientSearchBtn.style.display = isFiltered ? 'inline-flex' : 'none';
    }

    if (!isFiltered) {
        apptPatientDropdown.style.display = 'none';
        apptPatientDropdown.innerHTML = '';
        if (apptPatientId) apptPatientId.value = '';
        if (apptSelectedPatientCard) apptSelectedPatientCard.style.display = 'none';
        return;
    }

    const patients = window.currentPatients || [];
    const isAr = (document.documentElement.lang || 'en') === 'ar';

    const matches = patients.filter(p => {
        let matchNameOrPhone = true;
        let matchId = true;

        if (nameTerm) {
            const name = (p.name || '').toLowerCase();
            const phone = String(p.phone || '').toLowerCase();
            const phone2 = String(p.phone2 || '').toLowerCase();
            matchNameOrPhone = name.includes(nameTerm) || phone.includes(nameTerm) || phone2.includes(nameTerm);
        }

        if (idTerm) {
            const displayId = String(p.displayId || '').toLowerCase();
            const docId = String(p.id || '').toLowerCase();
            const cleanNumericId = displayId.replace(/\D/g, '');
            const cleanSearchNum = idTerm.replace(/\D/g, '');

            const directMatch = displayId.includes(idTerm) || docId.includes(idTerm);
            const numMatch = cleanSearchNum ? (cleanNumericId.includes(cleanSearchNum) || parseInt(cleanNumericId, 10) === parseInt(cleanSearchNum, 10)) : false;
            matchId = directMatch || numMatch;
        }

        return matchNameOrPhone && matchId;
    });

    if (matches.length > 0) {
        apptPatientDropdown.innerHTML = matches.map(p => {
            return `
            <div class="autocomplete-item" data-patient-id="${p.id}" style="padding: 10px 14px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background-color 0.15s;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.93rem;">
                        ${p.name}
                        ${p.age ? `<span style="font-size: 0.78rem; color: var(--text-muted); font-weight: normal;">(${p.age} ${isAr ? 'سنة' : 'yrs'})</span>` : ''}
                    </div>
                    <span class="status-badge status-primary" style="font-size: 0.75rem; padding: 2px 7px;">📁 #${p.displayId || '-'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">
                    <span>📱 ${p.phone || '-'} ${p.phone2 ? ` / ${p.phone2}` : ''}</span>
                    ${p.medicalAlerts ? `<span class="status-badge status-error" style="font-size: 0.68rem; padding: 1px 5px;">⚠️ ${p.medicalAlerts}</span>` : ''}
                </div>
            </div>
            `;
        }).join('');

        apptPatientDropdown.querySelectorAll('.autocomplete-item').forEach(el => {
            el.addEventListener('click', () => {
                const pId = el.getAttribute('data-patient-id');
                const p = patients.find(x => x.id === pId);
                if (p) {
                    selectPatientForAppointment(p);
                }
            });
        });

        apptPatientDropdown.style.display = 'block';
    } else {
        apptPatientDropdown.innerHTML = `<div style="padding: 0.85rem; color: var(--text-muted); text-align: center; font-size: 0.85rem;">${isAr ? 'لم يتم العثور على مريض مطابق' : 'No patients found.'}</div>`;
        apptPatientDropdown.style.display = 'block';
    }
}

if (apptPatientInput) {
    apptPatientInput.addEventListener('input', () => {
        if (apptPatientId) apptPatientId.value = '';
        if (apptSelectedPatientCard) apptSelectedPatientCard.style.display = 'none';
        filterApptPatients();
    });

    apptPatientInput.addEventListener('focus', () => {
        if (apptPatientInput.value.trim() || (apptPatientFileIdInput && apptPatientFileIdInput.value.trim())) {
            filterApptPatients();
        }
    });
}

if (apptPatientFileIdInput) {
    apptPatientFileIdInput.addEventListener('input', () => {
        if (apptPatientId) apptPatientId.value = '';
        if (apptSelectedPatientCard) apptSelectedPatientCard.style.display = 'none';
        filterApptPatients();
    });

    apptPatientFileIdInput.addEventListener('focus', () => {
        if (apptPatientFileIdInput.value.trim() || (apptPatientInput && apptPatientInput.value.trim())) {
            filterApptPatients();
        }
    });
}

if (clearApptPatientSearchBtn) {
    clearApptPatientSearchBtn.addEventListener('click', () => {
        resetApptPatientSelection();
        if (apptPatientInput) apptPatientInput.focus();
    });
}

if (btnChangeApptPatient) {
    btnChangeApptPatient.addEventListener('click', () => {
        resetApptPatientSelection();
        if (apptPatientInput) apptPatientInput.focus();
    });
}

const appointmentFormContainer = document.getElementById('appointmentFormContainer');
const embeddedPatientFormContainer = document.getElementById('embeddedPatientFormContainer');
const embeddedPatientForm = document.getElementById('embeddedPatientForm');
const btnBackToAppointment = document.getElementById('btnBackToAppointment');
const cancelEmbeddedPatientBtn = document.getElementById('cancelEmbeddedPatientBtn');
const saveEmbeddedPatientBtn = document.getElementById('saveEmbeddedPatientBtn');

const embeddedPatientName = document.getElementById('embeddedPatientName');
const embeddedPatientGender = document.getElementById('embeddedPatientGender');
const embeddedPatientAge = document.getElementById('embeddedPatientAge');
const embeddedPatientPhone = document.getElementById('embeddedPatientPhone');
const embeddedPatientPhone2 = document.getElementById('embeddedPatientPhone2');
const embeddedCallPref = document.getElementById('embeddedCallPref');
const embeddedWaPref = document.getElementById('embeddedWaPref');
const embeddedLastVisit = document.getElementById('embeddedLastVisit');
const embeddedPatientNotes = document.getElementById('embeddedPatientNotes');

function showAppointmentView() {
    if (embeddedPatientFormContainer) embeddedPatientFormContainer.style.display = 'none';
    if (appointmentFormContainer) appointmentFormContainer.style.display = 'block';
}

function showEmbeddedPatientView() {
    if (appointmentFormContainer) appointmentFormContainer.style.display = 'none';
    if (embeddedPatientFormContainer) {
        embeddedPatientFormContainer.style.display = 'block';
        if (apptPatientInput && apptPatientInput.value.trim()) {
            embeddedPatientName.value = apptPatientInput.value.trim();
        }
        if (embeddedLastVisit && !embeddedLastVisit.value) {
            embeddedLastVisit.value = new Date().toISOString().split('T')[0];
        }
        // Scroll modal to top
        const modalContent = appointmentModal.querySelector('.modal-content');
        if (modalContent) modalContent.scrollTop = 0;
        embeddedPatientPhone.focus();
    }
}

if (btnQuickAddPatient) {
    btnQuickAddPatient.addEventListener('click', () => {
        if (apptPatientDropdown) apptPatientDropdown.style.display = 'none';
        showEmbeddedPatientView();
    });
}

if (btnBackToAppointment) {
    btnBackToAppointment.addEventListener('click', showAppointmentView);
}

if (cancelEmbeddedPatientBtn) {
    cancelEmbeddedPatientBtn.addEventListener('click', showAppointmentView);
}

if (embeddedPatientForm) {
    embeddedPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = (embeddedPatientName.value || '').trim();
        const phone = (embeddedPatientPhone.value || '').trim();
        const phone2 = (embeddedPatientPhone2.value || '').trim();
        const gender = embeddedPatientGender ? embeddedPatientGender.value : 'Male';
        const age = embeddedPatientAge ? embeddedPatientAge.value.trim() : '';
        const callPref = embeddedCallPref ? embeddedCallPref.value : 'phone1';
        const waPref = embeddedWaPref ? embeddedWaPref.value : 'phone1';
        const lastVisit = (embeddedLastVisit && embeddedLastVisit.value) ? embeddedLastVisit.value : new Date().toISOString().split('T')[0];
        const notes = (embeddedPatientNotes && embeddedPatientNotes.value) ? embeddedPatientNotes.value.trim() : '';

        const selectedAlerts = Array.from(document.querySelectorAll('.embedded-alert-checkbox:checked'))
            .map(cb => cb.value)
            .join(', ');

        const isAr = document.documentElement.lang === 'ar';

        // Validation for name (must be at least a triple name / ثلاثي)
        const nameWords = name.split(/\s+/).filter(w => w.length > 0);
        if (nameWords.length < 3) {
            if (window.showToast) {
                window.showToast(isAr ? 'لا يمكن تسجيل اسم مريض أقل من ثلاثي (أدخل 3 كلمات على الأقل)' : 'Patient name must be at least a triple name (minimum 3 words)', 'warning');
            }
            embeddedPatientName.focus();
            return;
        }

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 7) {
            if (window.showToast) window.showToast(isAr ? 'يرجى إدخال رقم هاتف صحيح (7 أرقام على الأقل)' : 'Valid phone required (at least 7 digits)', 'warning');
            embeddedPatientPhone.focus();
            return;
        }

        if (phone2) {
            const cleanPhone2 = phone2.replace(/\D/g, '');
            if (cleanPhone2.length < 7) {
                if (window.showToast) window.showToast(isAr ? 'يرجى إدخال رقم هاتف إضافي صحيح' : 'Valid additional phone required', 'warning');
                embeddedPatientPhone2.focus();
                return;
            }
        }

        if (!currentUserUid) {
            if (window.showToast) window.showToast(isAr ? 'المستخدم غير مسجل دخول' : 'User not authenticated', 'error');
            return;
        }

        const submitBtn = saveEmbeddedPatientBtn || embeddedPatientForm.querySelector('button[type="submit"]');
        const prevText = submitBtn ? submitBtn.innerText : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = '...';
        }

        try {
            // 1. Get sequential displayId from counter
            const counterRef = doc(db, "users", currentUserUid, "metadata", "counters");
            const counterDoc = await getDoc(counterRef);
            let currentCount = 0;
            if (counterDoc.exists() && counterDoc.data().patientCount) {
                currentCount = counterDoc.data().patientCount;
            }
            const newDisplayId = currentCount + 1;

            // 2. Add complete patient document
            const patientsRef = collection(db, "users", currentUserUid, "patients");
            const newDoc = await addDoc(patientsRef, {
                name: name,
                phone: phone,
                phone2: phone2,
                gender: gender,
                age: age,
                callPref: callPref,
                waPref: waPref,
                medicalAlerts: selectedAlerts,
                lastVisit: lastVisit,
                notes: notes,
                displayId: newDisplayId.toString(),
                createdAt: new Date().toISOString()
            });

            // 3. Update counter
            await setDoc(counterRef, { patientCount: newDisplayId }, { merge: true });

            const newPatientObj = {
                id: newDoc.id,
                name: name,
                phone: phone,
                phone2: phone2,
                gender: gender,
                age: age,
                callPref: callPref,
                waPref: waPref,
                medicalAlerts: selectedAlerts,
                displayId: newDisplayId.toString(),
                lastVisit: lastVisit
            };

            if (window.currentPatients) {
                window.currentPatients.push(newPatientObj);
            }

            // 4. Return to appointment view and select patient
            showAppointmentView();
            selectPatientForAppointment(newPatientObj);

            // Reset embedded form
            embeddedPatientForm.reset();

            if (window.showToast) {
                window.showToast(isAr ? `تم حفظ ملف المريض (${name}) برقم #${newDisplayId} واختياره في الموعد!` : `Patient (${name}) saved and selected!`, 'success');
            }

            // Refresh patients list in background
            if (window.loadPatients) {
                window.loadPatients();
            }
            if (typeof window.updateDashboardStats === 'function') {
                window.updateDashboardStats();
            }
        } catch (err) {
            console.error('Error saving embedded patient:', err);
            if (window.showToast) window.showToast(isAr ? 'حدث خطأ أثناء حفظ ملف المريض' : 'Error saving patient', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = prevText;
            }
        }
    });
}

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (
        apptPatientDropdown &&
        apptPatientDropdown.style.display !== 'none' &&
        e.target !== apptPatientInput &&
        e.target !== apptPatientFileIdInput &&
        e.target !== apptPatientDropdown &&
        !apptPatientDropdown.contains(e.target)
    ) {
        apptPatientDropdown.style.display = 'none';
    }
});

// Appointments & Schedule Logic
// ---------------------------------------------------------

if (openAppointmentModalBtn) {
    openAppointmentModalBtn.addEventListener('click', () => {
        const apptContainer = document.getElementById('appointmentFormContainer');
        const embeddedContainer = document.getElementById('embeddedPatientFormContainer');
        if (apptContainer) apptContainer.style.display = 'block';
        if (embeddedContainer) embeddedContainer.style.display = 'none';
        appointmentForm.reset();
        document.getElementById('appointmentId').value = '';
        resetApptPatientSelection();
        appointmentModal.classList.add('show');
        history.pushState({ modal: 'appointment' }, '', window.location.hash);
    });
}

if (cancelApptBtn) {
    cancelApptBtn.addEventListener('click', () => {
        if(window.closeModalAndPopState) window.closeModalAndPopState(appointmentModal);
        else appointmentModal.classList.remove('show');
    });
}

if (appointmentModal) {
    window.addEventListener('click', (event) => {
        if (event.target === appointmentModal) {
            if(window.closeModalAndPopState) window.closeModalAndPopState(appointmentModal);
            else appointmentModal.classList.remove('show');
        }
    });
}

async function loadAppointments() {
    if (!currentUserUid) return;
    try {
        const appointmentsRef = collection(db, "users", currentUserUid, "appointments");
        const querySnapshot = await getDocs(appointmentsRef);
        currentAppointments = [];
        querySnapshot.forEach((d) => {
            currentAppointments.push({ id: d.id, ...d.data() });
        });

        if (calendarInstance) {
            calendarInstance.removeAllEvents();
            calendarInstance.addEventSource(formatEventsForCalendar());
        }
        renderTodayAppointments();
    } catch (e) {
        console.error("Error loading appointments: ", e);
    }
}

function formatEventsForCalendar() {
    return currentAppointments.map(appt => ({
        id: appt.id,
        title: appt.patientName,
        start: `${appt.date}T${appt.time}`,
        allDay: false
    }));
}

if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const idField = document.getElementById('appointmentId').value;
        const patientName = (document.getElementById('apptPatientName').value || '').trim();
        const date = document.getElementById('apptDate').value;
        const time = document.getElementById('apptTime').value;
        const submitBtn = appointmentForm.querySelector('button[type="submit"]');
        const isAr = (document.documentElement.lang || 'en') === 'ar';

        if (!patientName) {
            if (window.showToast) window.showToast(isAr ? 'يرجى اختيار أو كتابة اسم المريض' : 'Please select or enter patient name', 'warning');
            return;
        }

        submitBtn.disabled = true;

        try {
            let pId = document.getElementById('apptPatientId').value;
            const fileIdVal = (document.getElementById('apptPatientFileId')?.value || '').trim();

            // Auto-match patient from currentPatients if pId is empty
            if (!pId && window.currentPatients) {
                const matched = window.currentPatients.find(p => 
                    (fileIdVal && p.displayId === fileIdVal) || 
                    (p.name && p.name.trim().toLowerCase() === patientName.toLowerCase())
                );
                if (matched) pId = matched.id;
            }

            if (idField) {
                const apptRef = doc(db, "users", currentUserUid, "appointments", idField);
                await updateDoc(apptRef, { patientName, patientId: pId, date, time });
            } else {
                const apptsRef = collection(db, "users", currentUserUid, "appointments");
                await addDoc(apptsRef, { patientName, patientId: pId, date, time, status: 'Scheduled' });
            }
            await loadAppointments();
            updateDashboardStats(); // Update stats
            if (window.showToast) {
                window.showToast(isAr ? 'تم حفظ الموعد بنجاح!' : 'Appointment saved successfully!', 'success');
            }
            if(window.closeModalAndPopState) window.closeModalAndPopState(appointmentModal);
            else appointmentModal.classList.remove('show');
            resetApptPatientSelection();
        } catch (e) {
            console.error("Error saving appointment: ", e);
            if (window.showToast) window.showToast(isAr ? 'حدث خطأ أثناء حفظ الموعد' : 'Error saving appointment', 'error');
            else alert("Error saving appointment.");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// ---------------------------------------------------------
// Appointment Action & Cancellation Modal Logic
// ---------------------------------------------------------
let activeAppointmentToDelete = null;

const appointmentActionModal = document.getElementById('appointmentActionModal');
const closeApptActionModalBtn = document.getElementById('closeApptActionModalBtn');
const cancelApptActionDismissBtn = document.getElementById('cancelApptActionDismissBtn');
const confirmDeleteApptBtn = document.getElementById('confirmDeleteApptBtn');
const actionModalPatientName = document.getElementById('actionModalPatientName');
const actionModalDate = document.getElementById('actionModalDate');
const actionModalTime = document.getElementById('actionModalTime');
const actionModalPhone = document.getElementById('actionModalPhone');
const actionModalPhoneWrapper = document.getElementById('actionModalPhoneWrapper');

window.openAppointmentActionModal = async function(apptOrId) {
    let appt = null;
    if (typeof apptOrId === 'string') {
        appt = currentAppointments.find(a => a.id === apptOrId);
        if (!appt && (currentUserUid || auth.currentUser)) {
            const uid = currentUserUid || auth.currentUser.uid;
            try {
                const snap = await getDoc(doc(db, "users", uid, "appointments", apptOrId));
                if (snap.exists()) {
                    appt = { id: snap.id, ...snap.data() };
                }
            } catch(e) { console.error(e); }
        }
    } else {
        appt = apptOrId;
    }

    if (!appt) {
        console.warn("Appointment not found:", apptOrId);
        if (window.showToast) {
            const isAr = (document.documentElement.lang || 'en') === 'ar';
            window.showToast(isAr ? 'لم يتم العثور على بيانات الموعد' : 'Appointment not found', 'warning');
        }
        return;
    }

    activeAppointmentToDelete = appt;

    if (actionModalPatientName) actionModalPatientName.innerText = appt.patientName || '-';
    if (actionModalDate) actionModalDate.innerText = appt.date || '-';
    if (actionModalTime) actionModalTime.innerText = window.formatTime ? window.formatTime(appt.time) : (appt.time || '-');

    const actionModalEditDate = document.getElementById('actionModalEditDate');
    const actionModalEditTime = document.getElementById('actionModalEditTime');
    if (actionModalEditDate) actionModalEditDate.value = appt.date || '';
    if (actionModalEditTime) actionModalEditTime.value = appt.time || '';

    // Find patient phone if available
    const patient = (window.currentPatients || []).find(p => p.id === appt.patientId || p.name === appt.patientName);
    const actionModalPhone2 = document.getElementById('actionModalPhone2');
    const actionModalPhone2Wrapper = document.getElementById('actionModalPhone2Wrapper');
    const actionModalPhoneActions = document.getElementById('actionModalPhoneActions');
    const actionModalPhone2Actions = document.getElementById('actionModalPhone2Actions');
    const isAr = (document.documentElement.lang || 'en') === 'ar';

    const p1 = patient ? (patient.phone || appt.patientPhone) : appt.patientPhone;
    const p2 = (patient && patient.phone2) ? patient.phone2 : null;

    const callPref = (patient && patient.callPref) ? patient.callPref : 'phone1';
    const waPref = (patient && patient.waPref) ? patient.waPref : 'phone1';

    const targetCallPhone = (callPref === 'phone2' && p2) ? p2 : p1;
    const cleanCallPhone = String(targetCallPhone || '').replace(/\D/g, '');

    const targetWaPhone = (waPref === 'phone2' && p2) ? p2 : p1;
    const cleanWaPhone = String(targetWaPhone || '').replace(/\D/g, '');
    const waLink = cleanWaPhone ? (cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone) : '';

    const formattedTime = window.formatTime ? window.formatTime(appt.time) : (appt.time || '--:--');
    const waReminderMsg = encodeURIComponent(
        isAr ? `مرحباً ${appt.patientName || 'يا فندم'}، نود تذكيركم بموعدكم يوم ${appt.date} الساعة ${formattedTime} في عيادة MOLARIZE للأسنان.` :
        `Hello ${appt.patientName || ''}, this is a reminder for your appointment on ${appt.date} at ${formattedTime} at MOLARIZE Dental Clinic.`
    );

    if (p1 && actionModalPhone && actionModalPhoneWrapper) {
        let p1Badge = '';
        if (p2) {
            if (callPref === 'phone1' && waPref === 'phone1') p1Badge = ` <span class="pref-tag pref-tag-both">⭐ ${isAr ? 'مفضل للاتصال والواتساب' : 'Preferred'}</span>`;
            else if (callPref === 'phone1') p1Badge = ` <span class="pref-tag pref-tag-call">📞 ${isAr ? 'مفضل للاتصال' : 'Preferred Call'}</span>`;
            else if (waPref === 'phone1') p1Badge = ` <span class="pref-tag pref-tag-wa">💬 ${isAr ? 'مفضل للواتساب' : 'Preferred WA'}</span>`;
        }
        actionModalPhone.innerHTML = `${p1}${p1Badge}`;
        actionModalPhoneWrapper.style.display = 'block';

        if (actionModalPhoneActions) {
            actionModalPhoneActions.innerHTML = `
                ${cleanCallPhone ? `<a href="tel:${cleanCallPhone}" class="agenda-action-btn agenda-action-call" style="padding: 2px 8px; font-size: 0.78rem;" title="${isAr ? `اتصال بالرقم المحدد في الملف (${targetCallPhone})` : `Call preferred (${targetCallPhone})`}">📞 ${isAr ? 'اتصال' : 'Call'}</a>` : ''}
                ${cleanWaPhone ? `<a href="https://wa.me/${waLink}?text=${waReminderMsg}" target="_blank" class="agenda-action-btn agenda-action-wa" style="padding: 2px 8px; font-size: 0.78rem;" title="${isAr ? `واتساب للرقم المحدد في الملف (${targetWaPhone})` : `WhatsApp preferred (${targetWaPhone})`}">💬 ${isAr ? 'واتساب' : 'WhatsApp'}</a>` : ''}
            `;
        }
    } else if (actionModalPhoneWrapper) {
        actionModalPhoneWrapper.style.display = 'none';
    }

    if (p2 && actionModalPhone2 && actionModalPhone2Wrapper) {
        let p2Badge = '';
        if (callPref === 'phone2' && waPref === 'phone2') p2Badge = ` <span class="pref-tag pref-tag-both">⭐ ${isAr ? 'مفضل للاتصال والواتساب' : 'Preferred'}</span>`;
        else if (callPref === 'phone2') p2Badge = ` <span class="pref-tag pref-tag-call">📞 ${isAr ? 'مفضل للاتصال' : 'Preferred Call'}</span>`;
        else if (waPref === 'phone2') p2Badge = ` <span class="pref-tag pref-tag-wa">💬 ${isAr ? 'مفضل للواتساب' : 'Preferred WA'}</span>`;

        actionModalPhone2.innerHTML = `${p2}${p2Badge}`;
        actionModalPhone2Wrapper.style.display = 'block';

        if (actionModalPhone2Actions) {
            actionModalPhone2Actions.innerHTML = '';
        }
    } else if (actionModalPhone2Wrapper) {
        actionModalPhone2Wrapper.style.display = 'none';
    }

    if (appointmentActionModal) {
        appointmentActionModal.classList.add('show');
        history.pushState({ modal: 'appointmentAction' }, '', window.location.hash);
    }
};

window.deleteAppointmentFromCalendar = function(id) {
    window.openAppointmentActionModal(id);
};

// Reschedule Appointment Handler
const btnRescheduleAppt = document.getElementById('btnRescheduleAppt');
if (btnRescheduleAppt) {
    btnRescheduleAppt.addEventListener('click', async () => {
        if (!activeAppointmentToDelete) return;
        const apptId = activeAppointmentToDelete.id;
        const uid = currentUserUid || (auth.currentUser ? auth.currentUser.uid : null);
        const isAr = (document.documentElement.lang || 'en') === 'ar';

        if (!uid) {
            if (window.showToast) window.showToast(isAr ? 'المستخدم غير مسجل دخول' : 'User not authenticated', 'error');
            return;
        }

        const actionModalEditDate = document.getElementById('actionModalEditDate');
        const actionModalEditTime = document.getElementById('actionModalEditTime');
        const newDate = actionModalEditDate ? actionModalEditDate.value : '';
        const newTime = actionModalEditTime ? actionModalEditTime.value : '';

        if (!newDate || !newTime) {
            if (window.showToast) window.showToast(isAr ? 'يرجى تحديد التاريخ والوقت الجديدين' : 'Please select a new date and time', 'warning');
            return;
        }

        btnRescheduleAppt.disabled = true;
        const prevText = btnRescheduleAppt.innerText;
        btnRescheduleAppt.innerText = isAr ? '... جاري الحفظ' : 'Saving...';

        try {
            const apptRef = doc(db, "users", uid, "appointments", apptId);
            await updateDoc(apptRef, {
                date: newDate,
                time: newTime,
                updatedAt: new Date().toISOString()
            });

            // Update local array
            const foundIdx = currentAppointments.findIndex(a => a.id === apptId);
            if (foundIdx !== -1) {
                currentAppointments[foundIdx].date = newDate;
                currentAppointments[foundIdx].time = newTime;
            }

            // Close modal
            if (window.closeModalAndPopState) window.closeModalAndPopState(appointmentActionModal);
            else appointmentActionModal.classList.remove('show');

            // Refresh FullCalendar
            if (calendarInstance) {
                calendarInstance.removeAllEvents();
                calendarInstance.addEventSource(formatEventsForCalendar());
            }

            // Refresh timelines & stats
            renderTodayAppointments();
            updateDashboardStats();

            // Refresh focused day list if visible
            if (typeof window.refreshCurrentDayAppointmentsList === 'function') {
                window.refreshCurrentDayAppointmentsList();
            }

            // Refresh patient profile timeline if open
            if (typeof window.loadPatientTimeline === 'function' && window.currentProfilePatientId) {
                window.loadPatientTimeline(window.currentProfilePatientId);
            }

            if (window.showToast) {
                window.showToast(isAr ? 'تم تعديل وتغيير موعد الحجز بنجاح' : 'Appointment rescheduled successfully', 'success');
            }
        } catch (e) {
            console.error("Error rescheduling appointment: ", e);
            if (window.showToast) {
                window.showToast(isAr ? 'حدث خطأ أثناء تغيير الموعد' : 'Error rescheduling appointment', 'error');
            }
        } finally {
            btnRescheduleAppt.disabled = false;
            btnRescheduleAppt.innerText = prevText;
        }
    });
}

if (closeApptActionModalBtn) {
    closeApptActionModalBtn.addEventListener('click', () => {
        if (window.closeModalAndPopState) window.closeModalAndPopState(appointmentActionModal);
        else appointmentActionModal.classList.remove('show');
    });
}

if (cancelApptActionDismissBtn) {
    cancelApptActionDismissBtn.addEventListener('click', () => {
        if (window.closeModalAndPopState) window.closeModalAndPopState(appointmentActionModal);
        else appointmentActionModal.classList.remove('show');
    });
}

if (appointmentActionModal) {
    window.addEventListener('click', (e) => {
        if (e.target === appointmentActionModal) {
            if (window.closeModalAndPopState) window.closeModalAndPopState(appointmentActionModal);
            else appointmentActionModal.classList.remove('show');
        }
    });
}

if (confirmDeleteApptBtn) {
    confirmDeleteApptBtn.addEventListener('click', async () => {
        if (!activeAppointmentToDelete) return;
        const apptId = activeAppointmentToDelete.id;
        const uid = currentUserUid || (auth.currentUser ? auth.currentUser.uid : null);
        const isAr = (document.documentElement.lang || 'en') === 'ar';

        if (!uid) {
            if (window.showToast) window.showToast(isAr ? 'المستخدم غير مسجل دخول' : 'User not authenticated', 'error');
            return;
        }

        confirmDeleteApptBtn.disabled = true;
        const prevText = confirmDeleteApptBtn.innerText;
        confirmDeleteApptBtn.innerText = isAr ? '... جاري الإلغاء' : 'Cancelling...';

        try {
            await deleteDoc(doc(db, "users", uid, "appointments", apptId));
            
            // Remove from local array
            currentAppointments = currentAppointments.filter(a => a.id !== apptId);

            // Close modal
            if (window.closeModalAndPopState) window.closeModalAndPopState(appointmentActionModal);
            else appointmentActionModal.classList.remove('show');

            // Refresh FullCalendar
            if (calendarInstance) {
                calendarInstance.removeAllEvents();
                calendarInstance.addEventSource(formatEventsForCalendar());
            }

            // Refresh timelines & stats
            renderTodayAppointments();
            updateDashboardStats();

            // Refresh day list view if currently active
            if (typeof window.refreshCurrentDayAppointmentsList === 'function') {
                window.refreshCurrentDayAppointmentsList();
            }

            // Refresh patient profile timeline if open
            if (typeof window.loadPatientTimeline === 'function' && window.currentProfilePatientId) {
                window.loadPatientTimeline(window.currentProfilePatientId);
            }

            if (window.showToast) {
                window.showToast(isAr ? 'تم إلغاء الموعد وحذفه بنجاح' : 'Appointment cancelled successfully', 'success');
            }
        } catch (e) {
            console.error("Error deleting appointment: ", e);
            if (window.showToast) {
                window.showToast(isAr ? 'حدث خطأ أثناء إلغاء الموعد' : 'Error cancelling appointment', 'error');
            }
        } finally {
            confirmDeleteApptBtn.disabled = false;
            confirmDeleteApptBtn.innerText = prevText;
            activeAppointmentToDelete = null;
        }
    });
}

// ---------------------------------------------------------
// Dashboard Integrations
// ---------------------------------------------------------

function updateGreetingAndDate() {
    if(!greetingMessage || !currentDateDisplay) return;
    const hour = new Date().getHours();
    const isAr = document.documentElement.lang === 'ar';

    let enGreet = 'Good evening';
    let arGreet = 'مساء الخير';
    if (hour < 12) { enGreet = 'Good morning'; arGreet = 'صباح الخير'; }
    else if (hour < 18) { enGreet = 'Good afternoon'; arGreet = 'طاب مساؤك'; }

    greetingMessage.setAttribute('data-en', `${enGreet}, Admin`);
    greetingMessage.setAttribute('data-ar', `${arGreet}، المشرف`);
    greetingMessage.innerText = isAr ? `${arGreet}، المشرف` : `${enGreet}, Admin`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateDisplay.innerText = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', options);
}

async function updateDashboardStats() {
    if (!currentUserUid) {
        const user = auth.currentUser;
        if (user) currentUserUid = user.uid;
        else return;
    }

    let allPatients = [];
    if (window.currentPatients && window.currentPatients.length > 0) {
        allPatients = [...window.currentPatients];
    } else {
        try {
            const patientsRef = collection(db, "users", currentUserUid, "patients");
            const querySnapshot = await getDocs(patientsRef);
            querySnapshot.forEach((d) => {
                allPatients.push({ id: d.id, ...d.data() });
            });
            allPatients = allPatients.map(p => ({
                ...p,
                displayId: p.displayId || 'P' + p.id.substring(0, 5).toUpperCase()
            }));
            window.currentPatients = allPatients;
        } catch(e) { console.error("Error fetching patients in updateDashboardStats:", e); }
    }

    if(weeklyNewPatients) {
        // Show total patients count
        weeklyNewPatients.innerText = allPatients.length;
    }

    // Update KPI Card: Total Patients
    const kpiPatients = document.getElementById('kpi-total-patients');
    if (kpiPatients) kpiPatients.innerText = allPatients.length;

    // Today's Appointments Count
    const localOffset = new Date().getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - localOffset).toISOString().split('T')[0];
    const todayAppts = currentAppointments.filter(a => a.date === localToday);

    if(homeAppointmentsToday) {
        const isAr = document.documentElement.lang === 'ar';
        homeAppointmentsToday.innerHTML = `<span class="pulse-dot"></span>${todayAppts.length} ${isAr ? 'مواعيد' : 'Appointments'}`;
    }

    // Update KPI Card: Today's Appointments
    const kpiAppts = document.getElementById('kpi-today-appts');
    if (kpiAppts) kpiAppts.innerText = todayAppts.length;

    if(weeklyAppointmentsCount) weeklyAppointmentsCount.innerText = currentAppointments.length; // Demo: total as weekly

    // Revenue
    const totalRev = currentTreatments
        .filter(t => t.status === 'Completed')
        .reduce((sum, t) => sum + (t.cost || 0), 0);
    const revFormatted = window.formatCurrency ? window.formatCurrency(totalRev) : `$${totalRev}`;
    if(weeklyRevenue) weeklyRevenue.innerText = revFormatted;

    // Update KPI Card: Monthly Revenue
    const kpiRevenue = document.getElementById('kpi-month-revenue');
    if (kpiRevenue) kpiRevenue.innerText = revFormatted;

    // Update KPI Card: Low Stock Alerts
    const kpiStock = document.getElementById('kpi-low-stock');
    if (kpiStock && currentUserUid) {
        try {
            const invRef = collection(db, 'users', currentUserUid, 'inventory');
            getDocs(invRef).then(snap => {
                let lowCount = 0;
                snap.forEach(d => {
                    const item = d.data();
                    if (parseInt(item.stock || 0) <= parseInt(item.alertLimit || 0)) {
                        lowCount++;
                    }
                });
                kpiStock.innerText = lowCount;
                if (lowCount > 0) {
                    kpiStock.style.color = 'var(--status-error)';
                } else {
                    kpiStock.style.color = 'inherit';
                }
            }).catch(() => {});
        } catch(e) {}
    }

    // Render Recent Patients List (Last 5 Added)
    if(homeRecentPatients) {
        homeRecentPatients.innerHTML = '';
        const isAr = (document.documentElement.lang || 'en') === 'ar';

        if(allPatients.length === 0) {
            homeRecentPatients.innerHTML = `
                <div class="list-item" style="justify-content: center; padding: 1.5rem; text-align: center; color: var(--text-muted);">
                    <div>
                        <p style="margin: 0 0 0.5rem 0;">${isAr ? 'لا يوجد مرضى مضافون بعد' : 'No patients added yet'}</p>
                        <button class="btn-outline" onclick="if(window.openNewPatientModal) window.openNewPatientModal(); else document.getElementById('openModalBtn')?.click();" style="font-size: 0.85rem;">
                            ${isAr ? '+ إضافة مريض جديد' : '+ Add New Patient'}
                        </button>
                    </div>
                </div>`;
        } else {
            // Helper to get reliable sort priority for recent patients
            const getPatientSortValue = (p) => {
                const dateVal = p.createdAt || p.timestamp || p.date || p.created;
                if (dateVal) {
                    if (typeof dateVal === 'string') {
                        const ms = new Date(dateVal).getTime();
                        if (!isNaN(ms) && ms > 0) return ms;
                    } else if (typeof dateVal === 'number') {
                        return dateVal;
                    } else if (dateVal.toMillis) {
                        return dateVal.toMillis();
                    } else if (dateVal.seconds) {
                        return dateVal.seconds * 1000;
                    }
                }
                if (p.displayId) {
                    const num = parseInt(String(p.displayId).replace(/\D/g, ''));
                    if (!isNaN(num) && num > 0) {
                        return num * 1000;
                    }
                }
                return 0;
            };

            // Sort descending: newest created / highest ID first
            allPatients.sort((a, b) => {
                const valA = getPatientSortValue(a);
                const valB = getPatientSortValue(b);
                if (valA !== valB) {
                    return valB - valA;
                }
                const idA = parseInt(String(a.displayId || a.id).replace(/\D/g, '')) || 0;
                const idB = parseInt(String(b.displayId || b.id).replace(/\D/g, '')) || 0;
                return idB - idA;
            });

            const recentFive = allPatients.slice(0, 5);

            recentFive.forEach(p => {
                const callTargetPhone = (p.callPref === 'phone2' && p.phone2) ? p.phone2 : p.phone;
                const cleanCallPhone = String(callTargetPhone || '').replace(/\D/g, '');

                const waTargetPhone = (p.waPref === 'phone2' && p.phone2) ? p.phone2 : p.phone;
                const cleanWaPhone = String(waTargetPhone || '').replace(/\D/g, '');
                const waLinkPhone = cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone;

                let displayPhone = p.phone || '-';
                if (p.phone2) displayPhone += ` / ${p.phone2}`;

                const ageText = p.age ? `• ${p.age} ${isAr ? 'سنة' : 'yrs'}` : '';
                const translatedAlerts = window.translateMedicalAlerts ? window.translateMedicalAlerts(p.medicalAlerts, isAr) : p.medicalAlerts;
                const alertBadge = (p.medicalAlerts && p.medicalAlerts.trim()) ? 
                    `<span class="status-badge status-error" style="font-size: 0.72rem; padding: 2px 6px;">⚠️ ${translatedAlerts}</span>` : '';

                homeRecentPatients.innerHTML += `
                <div class="list-item" style="cursor: pointer; transition: background-color 0.2s, transform 0.2s;" onclick="if(window.openPatientProfile) window.openPatientProfile('${p.id}')">
                    <div class="list-item-left" style="gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="status-badge" style="background-color: rgba(45, 212, 191, 0.15); color: var(--brand-primary); font-size: 0.75rem; padding: 2px 7px; border-radius: 4px; font-weight: 700;">
                                #${p.displayId || '-'}
                            </span>
                            <span class="list-item-title" style="font-size: 1.05rem;">${p.name || (isAr ? 'غير محدد' : 'Unknown')}</span>
                            <span style="font-size: 0.85rem; color: var(--text-muted);">${ageText}</span>
                            ${alertBadge}
                        </div>
                        <div class="list-item-sub" style="display: flex; align-items: center; gap: 8px;">
                            <span>📞 ${displayPhone}</span>
                        </div>
                    </div>
                    <div class="list-item-right" style="display: flex; align-items: center; gap: 0.5rem;" onclick="event.stopPropagation();">
                        <a href="tel:${cleanCallPhone}" class="btn-outline" style="padding: 0.45rem 0.65rem; font-size: 0.85rem; display: inline-flex; align-items: center; text-decoration: none;" title="${isAr ? 'اتصال' : 'Call'}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </a>
                        <a href="https://wa.me/${waLinkPhone}" target="_blank" class="btn-outline" style="padding: 0.45rem 0.65rem; font-size: 0.85rem; display: inline-flex; align-items: center; text-decoration: none; color: #25D366; border-color: rgba(37, 211, 102, 0.4);" title="WhatsApp">
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        </a>
                        <span style="color: var(--text-muted); font-size: 1.1rem; margin-inline-start: 4px; pointer-events: none;">›</span>
                    </div>
                </div>`;
            });
        }
    }

    // Refresh today & tomorrow visual timeline natively on stat refresh
    renderTodayAppointments();
}
window.updateDashboardStats = updateDashboardStats;

function renderTimelineEvents(eventsContainer, dateString) {
    if (!eventsContainer) return;
    const dayAppts = currentAppointments.filter(a => a.date === dateString);
    eventsContainer.innerHTML = '';
    const isAr = (document.documentElement.lang || 'en') === 'ar';

    dayAppts.forEach(appt => {
        if(!appt.time) return;
        const parts = appt.time.split(':');
        const hour = parseInt(parts[0]);
        const min = parseInt(parts[1]);

        if(hour >= 8 && hour <= 21) {
            const minutesFrom8 = ((hour - 8) * 60) + min;
            const totalTimelineMinutes = 13 * 60;
            const leftPercent = (minutesFrom8 / totalTimelineMinutes) * 100;
            const widthPercent = (60 / totalTimelineMinutes) * 100;

            const block = document.createElement('div');
            block.className = 'timeline-block';
            block.style.left = `${leftPercent}%`;
            block.style.width = `${Math.max(widthPercent, 4)}%`;
            block.style.cursor = 'pointer';
            const formattedTime = window.formatTime ? window.formatTime(appt.time) : appt.time;
            block.innerHTML = `✓ ${formattedTime}`;
            block.title = isAr ? `${appt.patientName} (${formattedTime}) - اضغط للتفاصيل أو الإلغاء` : `${appt.patientName} (${formattedTime}) - Click for details or to cancel`;
            block.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openAppointmentActionModal(appt);
            });

            eventsContainer.appendChild(block);
        }
    });
}

function renderAgendaItemsList(containerElement, appointments, targetDateIso, isToday) {
    if (!containerElement) return;
    containerElement.innerHTML = '';
    const isAr = (document.documentElement.lang || 'en') === 'ar';

    if (!appointments || appointments.length === 0) {
        const emptyMsg = isToday ? 
            (isAr ? 'لا توجد مواعيد مجدولة لليوم' : 'No appointments scheduled for today') :
            (isAr ? 'لا توجد مواعيد مجدولة لغداً' : 'No appointments scheduled for tomorrow');
        const emptySub = isAr ? 'يمكنك حجز موعد جديد في أي وقت' : 'You can schedule a new appointment anytime';
        const addBtnText = isToday ? (isAr ? '+ حجز موعد لليوم' : '+ Book for Today') : (isAr ? '+ حجز موعد لغداً' : '+ Book for Tomorrow');

        containerElement.innerHTML = `
            <div class="agenda-empty-state">
                <span style="font-size: 1.6rem; margin-bottom: 0.35rem; opacity: 0.7;">✨</span>
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">${emptyMsg}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin: 0.2rem 0 0.75rem;">${emptySub}</div>
                <button type="button" class="btn-outline" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;" onclick="window.openNewAppointmentModal('${targetDateIso}')">
                    ${addBtnText}
                </button>
            </div>
        `;
        return;
    }

    appointments.forEach(appt => {
        const patient = (window.currentPatients || []).find(p => p.id === appt.patientId || p.name === appt.patientName);
        
        // Primary and Secondary phones
        const p1 = patient ? (patient.phone || appt.patientPhone) : (appt.patientPhone || '');
        const p2 = (patient && patient.phone2) ? patient.phone2 : null;

        // Preferred phone settings from patient profile
        const callPref = (patient && patient.callPref) ? patient.callPref : 'phone1';
        const waPref = (patient && patient.waPref) ? patient.waPref : 'phone1';

        // Preferred target for Call
        const targetCallPhone = (callPref === 'phone2' && p2) ? p2 : p1;
        const cleanCallPhone = String(targetCallPhone || '').replace(/\D/g, '');

        // Preferred target for WhatsApp
        const targetWaPhone = (waPref === 'phone2' && p2) ? p2 : p1;
        const cleanWaPhone = String(targetWaPhone || '').replace(/\D/g, '');
        const waLinkPhone = cleanWaPhone ? (cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone) : '';

        const formattedTime = window.formatTime ? window.formatTime(appt.time) : (appt.time || '--:--');
        const dayWord = isToday ? (isAr ? 'اليوم' : 'today') : (isAr ? 'غداً' : 'tomorrow');
        
        const waMsg = encodeURIComponent(
            isAr ? `مرحباً ${appt.patientName || 'يا فندم'}، نود تذكيركم بموعدكم ${dayWord} الساعة ${formattedTime} في عيادة MOLARIZE للأسنان.` :
            `Hello ${appt.patientName || ''}, this is a reminder for your appointment ${dayWord} at ${formattedTime} at MOLARIZE Dental Clinic.`
        );

        const ageText = (patient && patient.age) ? `${patient.age} ${isAr ? 'سنة' : 'yrs'}` : '';
        const genderText = (patient && patient.gender) ? (patient.gender === 'Female' ? (isAr ? 'أنثى' : 'Female') : (isAr ? 'ذكر' : 'Male')) : '';
        const patientMetaInfo = [genderText, ageText].filter(Boolean).join(' • ');

        const translatedAlerts = (patient && patient.medicalAlerts && window.translateMedicalAlerts) ? 
            window.translateMedicalAlerts(patient.medicalAlerts, isAr) : (patient ? patient.medicalAlerts : '');
        const alertBadge = (translatedAlerts && translatedAlerts.trim()) ? 
            `<span class="status-badge status-error" style="font-size: 0.72rem; padding: 2px 7px; font-weight: 600;">⚠️ ${translatedAlerts}</span>` : '';

        const displayId = (patient && patient.displayId) ? patient.displayId : '-';

        // Build preferred badges for phone numbers if secondary phone exists
        let p1Badge = '';
        let p2Badge = '';
        if (p2) {
            if (callPref === 'phone1' && waPref === 'phone1') {
                p1Badge = `<span class="pref-tag pref-tag-both" title="${isAr ? 'المفضل للاتصال والواتساب' : 'Preferred for Call & WhatsApp'}">⭐ ${isAr ? 'مفضل لاتصال وواتساب' : 'Preferred'}</span>`;
            } else if (callPref === 'phone1') {
                p1Badge = `<span class="pref-tag pref-tag-call" title="${isAr ? 'المفضل للاتصال' : 'Preferred for Calls'}">📞 ${isAr ? 'مفضل للاتصال' : 'Preferred Call'}</span>`;
            } else if (waPref === 'phone1') {
                p1Badge = `<span class="pref-tag pref-tag-wa" title="${isAr ? 'المفضل للواتساب' : 'Preferred for WhatsApp'}">💬 ${isAr ? 'مفضل للواتساب' : 'Preferred WA'}</span>`;
            }

            if (callPref === 'phone2' && waPref === 'phone2') {
                p2Badge = `<span class="pref-tag pref-tag-both" title="${isAr ? 'المفضل للاتصال والواتساب' : 'Preferred for Call & WhatsApp'}">⭐ ${isAr ? 'مفضل لاتصال وواتساب' : 'Preferred'}</span>`;
            } else if (callPref === 'phone2') {
                p2Badge = `<span class="pref-tag pref-tag-call" title="${isAr ? 'المفضل للاتصال' : 'Preferred for Calls'}">📞 ${isAr ? 'مفضل للاتصال' : 'Preferred Call'}</span>`;
            } else if (waPref === 'phone2') {
                p2Badge = `<span class="pref-tag pref-tag-wa" title="${isAr ? 'المفضل للواتساب' : 'Preferred for WhatsApp'}">💬 ${isAr ? 'مفضل للواتساب' : 'Preferred WA'}</span>`;
            }
        }

        const itemCard = document.createElement('div');
        itemCard.className = 'agenda-item-card';
        itemCard.onclick = () => {
            window.openAppointmentActionModal(appt.id || appt);
        };

        itemCard.innerHTML = `
            <div class="agenda-item-left">
                <div class="agenda-time-pill">
                    <span>${formattedTime}</span>
                </div>
                <div class="agenda-item-info">
                    <div style="display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap;">
                        <span class="agenda-item-patient-name" onclick="event.stopPropagation(); if('${appt.patientId}' && window.openPatientProfile) window.openPatientProfile('${appt.patientId}')" title="${isAr ? 'عرض ملف المريض الكامل' : 'View Patient Profile'}">${appt.patientName || (isAr ? 'غير محدد' : 'Unknown')}</span>
                        <span class="status-badge" style="background-color: rgba(45, 212, 191, 0.15); color: var(--brand-primary); font-size: 0.74rem; padding: 1px 7px; font-weight: 700; border-radius: 4px;">#${displayId}</span>
                    </div>

                    <div class="agenda-item-badges">
                        ${patientMetaInfo ? `<span style="font-size: 0.78rem; color: var(--text-muted);">${patientMetaInfo}</span>` : ''}
                        ${alertBadge}
                    </div>

                    <div class="agenda-item-phones-wrap">
                        ${p1 ? `
                        <div class="agenda-phone-entry">
                            <span class="agenda-phone-label">${isAr ? '📞 الهاتف:' : '📞 Phone:'}</span>
                            <span class="agenda-phone-num">${p1}</span>
                            ${p1Badge}
                        </div>` : ''}
                        ${p2 ? `
                        <div class="agenda-phone-entry agenda-phone-secondary">
                            <span class="agenda-phone-label">${isAr ? '📱 هاتف إضافي:' : '📱 Secondary:'}</span>
                            <span class="agenda-phone-num">${p2}</span>
                            ${p2Badge}
                        </div>` : ''}
                    </div>
                </div>
            </div>

            <div class="agenda-item-actions" onclick="event.stopPropagation();">
                ${cleanCallPhone ? `
                <a href="tel:${cleanCallPhone}" class="agenda-action-btn agenda-action-call" title="${isAr ? `اتصال بالرقم المحدد في الملف (${targetCallPhone})` : `Call preferred number (${targetCallPhone})`}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    <span>${isAr ? 'اتصال' : 'Call'}</span>
                </a>` : ''}

                ${cleanWaPhone ? `
                <a href="https://wa.me/${waLinkPhone}?text=${waMsg}" target="_blank" class="agenda-action-btn agenda-action-wa" title="${isAr ? `إرسال تذكير واتساب للرقم المحدد في الملف (${targetWaPhone})` : `WhatsApp preferred number (${targetWaPhone})`}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                    <span>${isAr ? 'واتساب' : 'WhatsApp'}</span>
                </a>` : ''}

                <button type="button" class="agenda-action-btn" style="color: var(--status-error); border-color: rgba(239, 68, 68, 0.35);" onclick="window.openAppointmentActionModal('${appt.id || appt}')" title="${isAr ? 'تغيير الموعد أو مسحه' : 'Reschedule or Delete Appointment'}">
                    🗑️
                </button>
            </div>
        `;
        containerElement.appendChild(itemCard);
    });
}

function renderTodayAppointments() {
    const localOffset = new Date().getTimezoneOffset() * 60000;
    const now = new Date();
    const todayIso = new Date(Date.now() - localOffset).toISOString().split('T')[0];

    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tomorrowIso = new Date(tmrw.getTime() - localOffset).toISOString().split('T')[0];

    const isAr = (document.documentElement.lang || 'en') === 'ar';

    const todayAppts = currentAppointments.filter(a => a.date === todayIso);
    const tomorrowAppts = currentAppointments.filter(a => a.date === tomorrowIso);

    // Sort chronologically
    todayAppts.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    tomorrowAppts.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    // Update Counts & Badges
    const badgeToday = document.getElementById('badgeTodayCount');
    const badgeTomorrow = document.getElementById('badgeTomorrowCount');
    const tabCountToday = document.getElementById('tabCountToday');
    const tabCountTomorrow = document.getElementById('tabCountTomorrow');
    const agendaTotalSummary = document.getElementById('agendaTotalSummary');

    if (badgeToday) {
        badgeToday.innerText = isAr ? 
            `${todayAppts.length} ${todayAppts.length === 1 ? 'موعد' : todayAppts.length === 2 ? 'موعدان' : todayAppts.length <= 10 ? 'مواعيد' : 'موعد'}` : 
            `${todayAppts.length} ${todayAppts.length === 1 ? 'Appointment' : 'Appointments'}`;
    }
    if (badgeTomorrow) {
        badgeTomorrow.innerText = isAr ? 
            `${tomorrowAppts.length} ${tomorrowAppts.length === 1 ? 'موعد' : tomorrowAppts.length === 2 ? 'موعدان' : tomorrowAppts.length <= 10 ? 'مواعيد' : 'موعد'}` : 
            `${tomorrowAppts.length} ${tomorrowAppts.length === 1 ? 'Appointment' : 'Appointments'}`;
    }
    if (tabCountToday) tabCountToday.innerText = todayAppts.length;
    if (tabCountTomorrow) tabCountTomorrow.innerText = tomorrowAppts.length;

    if (homeAppointmentsToday) homeAppointmentsToday.innerText = todayAppts.length;
    const kpiToday = document.getElementById('kpi-today-appts');
    if (kpiToday) kpiToday.innerText = todayAppts.length;

    if (agendaTotalSummary) {
        const total48h = todayAppts.length + tomorrowAppts.length;
        agendaTotalSummary.innerText = isAr ? 
            `مجموع المواعيد: ${total48h} موعد خلال 48 ساعة (${todayAppts.length} اليوم • ${tomorrowAppts.length} غداً)` : 
            `Total: ${total48h} appointments in next 48h (${todayAppts.length} Today • ${tomorrowAppts.length} Tomorrow)`;
    }

    // Format display dates & Calendar Icons
    const dateTodayDisp = document.getElementById('agendaTodayDateDisplay');
    const dateTmrwDisp = document.getElementById('agendaTomorrowDateDisplay');

    const todayCalMonth = document.getElementById('agendaTodayCalMonth');
    const todayCalDay = document.getElementById('agendaTodayCalDay');
    const tmrwCalMonth = document.getElementById('agendaTomorrowCalMonth');
    const tmrwCalDay = document.getElementById('agendaTomorrowCalDay');

    if (todayCalMonth) todayCalMonth.innerText = now.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short' });
    if (todayCalDay) todayCalDay.innerText = now.getDate();

    if (tmrwCalMonth) tmrwCalMonth.innerText = tmrw.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { month: 'short' });
    if (tmrwCalDay) tmrwCalDay.innerText = tmrw.getDate();

    if (dateTodayDisp) {
        const formattedToday = now.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });
        dateTodayDisp.innerText = formattedToday;
    }
    if (dateTmrwDisp) {
        const formattedTmrw = tmrw.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' });
        dateTmrwDisp.innerText = formattedTmrw;
    }

    // Wire quick add buttons
    const btnAddToday = document.getElementById('btnAddApptToday');
    if (btnAddToday) {
        btnAddToday.onclick = () => window.openNewAppointmentModal(todayIso);
    }
    const btnAddTmrw = document.getElementById('btnAddApptTomorrow');
    if (btnAddTmrw) {
        btnAddTmrw.onclick = () => window.openNewAppointmentModal(tomorrowIso);
    }

    // Rich Lists
    const homeTodayList = document.getElementById('homeTodayApptsList');
    const homeTomorrowList = document.getElementById('homeTomorrowApptsList');

    renderAgendaItemsList(homeTodayList, todayAppts, todayIso, true);
    renderAgendaItemsList(homeTomorrowList, tomorrowAppts, tomorrowIso, false);
}
window.renderTodayAppointments = renderTodayAppointments;

window.filterAgendaView = function(view) {
    const tabAll = document.getElementById('tabAgendaAll');
    const tabToday = document.getElementById('tabAgendaToday');
    const tabTomorrow = document.getElementById('tabAgendaTomorrow');

    const panelToday = document.getElementById('agendaTodayPanel');
    const panelTomorrow = document.getElementById('agendaTomorrowPanel');
    const dualGrid = document.getElementById('agendaDualGrid');

    [tabAll, tabToday, tabTomorrow].forEach(t => {
        if (t) t.classList.remove('active');
    });

    if (view === 'today') {
        if (tabToday) tabToday.classList.add('active');
        if (panelToday) panelToday.style.display = 'flex';
        if (panelTomorrow) panelTomorrow.style.display = 'none';
        if (dualGrid) dualGrid.style.gridTemplateColumns = '1fr';
    } else if (view === 'tomorrow') {
        if (tabTomorrow) tabTomorrow.classList.add('active');
        if (panelToday) panelToday.style.display = 'none';
        if (panelTomorrow) panelTomorrow.style.display = 'flex';
        if (dualGrid) dualGrid.style.gridTemplateColumns = '1fr';
    } else {
        if (tabAll) tabAll.classList.add('active');
        if (panelToday) panelToday.style.display = 'flex';
        if (panelTomorrow) panelTomorrow.style.display = 'flex';
        if (dualGrid) dualGrid.style.gridTemplateColumns = '';
    }
};

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '09:00:00',
        slotMaxTime: '22:00:00',
        events: formatEventsForCalendar(),
        eventClick: function(info) {
            window.openAppointmentActionModal(info.event.id);
        },
        windowResize: function(arg) {
            if (window.innerWidth < 768) {
                calendarInstance.changeView('timeGridDay');
            } else {
                calendarInstance.changeView('timeGridWeek');
            }
        }
    });

    // Auto-switch view if initializing on mobile
    if (window.innerWidth < 768) {
        calendarInstance.changeView('timeGridDay');
    }

    // Re-render when tab becomes visible
    document.querySelector('[data-target="schedule-section"]').addEventListener('click', () => {
        setTimeout(() => { calendarInstance.render(); }, 100);
    });
}

function initChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Calculate revenue by status
    let pending = 0, inProgress = 0, completed = 0;
    currentTreatments.forEach(t => {
        if(t.status === 'Pending') pending += t.cost;
        if(t.status === 'In Progress') inProgress += t.cost;
        if(t.status === 'Completed') completed += t.cost;
    });

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    const brandPrimary = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#38BDF8';
    const statusSuccess = getComputedStyle(document.documentElement).getPropertyValue('--status-success').trim() || '#34D399';
    const statusPending = getComputedStyle(document.documentElement).getPropertyValue('--status-pending').trim() || '#FBBF24';

    const isAr = (document.documentElement.lang || 'en') === 'ar';
    revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: isAr ? ['قيد الانتظار', 'جاري المعالجة', 'مكتمل (الإيرادات)'] : ['Pending', 'In Progress', 'Completed (Revenue)'],
            datasets: [{
                label: isAr ? 'قيمة العلاج (ج.م)' : 'Treatment Value (EGP)',
                data: [pending, inProgress, completed],
                backgroundColor: [statusPending, brandPrimary, statusSuccess],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}
window.initChart = initChart;

// --- Payment Sources Helpers & Utilities ---
export function getPaymentSourceInfo(method) {
    const isAr = (document.documentElement.lang || 'en') === 'ar';
    const m = String(method || '').trim();
    const mLower = m.toLowerCase();

    if (mLower === 'cash' || mLower.includes('نقد') || mLower.includes('كاش')) {
        return {
            key: 'Cash',
            label: isAr ? '💵 نقداً / كاش' : '💵 Cash',
            icon: '💵',
            badgeClass: 'badge-cash'
        };
    } else if (mLower === 'card' || mLower === 'visa' || mLower.includes('بطاق') || mLower.includes('فيزا') || mLower.includes('pos')) {
        return {
            key: 'Card',
            label: isAr ? '💳 بطاقة / فيزا POS' : '💳 Card / POS',
            icon: '💳',
            badgeClass: 'badge-card'
        };
    } else if (mLower === 'instapay' || mLower.includes('انستا') || mLower.includes('إنستا')) {
        return {
            key: 'InstaPay',
            label: isAr ? '⚡ إنستاباي (InstaPay)' : '⚡ InstaPay IPN',
            icon: '⚡',
            badgeClass: 'badge-instapay'
        };
    } else if (mLower.includes('vodafone') || mLower.includes('فودافون') || mLower.includes('wallet') || mLower.includes('محفظ')) {
        return {
            key: 'Vodafone Cash',
            label: isAr ? '📱 فودافون كاش ومحافظ' : '📱 Vodafone Cash / Wallet',
            icon: '📱',
            badgeClass: 'badge-vodafone'
        };
    } else if (mLower.includes('bank') || mLower.includes('تحويل') || mLower.includes('بنك') || mLower.includes('wire')) {
        return {
            key: 'Bank Transfer',
            label: isAr ? '🏦 تحويل بنكي / شيك' : '🏦 Bank Transfer',
            icon: '🏦',
            badgeClass: 'badge-bank'
        };
    } else if (mLower.includes('insur') || mLower.includes('تأمين')) {
        return {
            key: 'Insurance',
            label: isAr ? '🛡️ تأمين طبي' : '🛡️ Insurance',
            icon: '🛡️',
            badgeClass: 'badge-insurance'
        };
    } else if (mLower.includes('install') || mLower.includes('تقسيط') || mLower.includes('valu') || mLower.includes('فاليو') || mLower.includes('tabby') || mLower.includes('tamara')) {
        return {
            key: 'Installment',
            label: isAr ? '🛍️ تقسيط / فاليو' : '🛍️ Installment / BNPL',
            icon: '🛍️',
            badgeClass: 'badge-installment'
        };
    } else {
        return {
            key: 'Other',
            label: m ? `🏷️ ${m}` : (isAr ? '🏷️ أخرى' : '🏷️ Other'),
            icon: '🏷️',
            badgeClass: 'badge-other'
        };
    }
}
window.getPaymentSourceInfo = getPaymentSourceInfo;

// --- Ledger Logic ---
let globalPaymentsList = [];
let activeLedgerMethodFilter = 'all';

function renderLedgerRows() {
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody || !globalPaymentsList) return;
    tbody.innerHTML = '';
    const isAr = (document.documentElement.lang || 'en') === 'ar';

    let todayRev = 0;
    let monthRev = 0;

    // Monthly channel breakdowns
    let sumCash = 0, countCash = 0;
    let sumCard = 0, countCard = 0;
    let sumInsta = 0, countInsta = 0;
    let sumVodafone = 0, countVodafone = 0;
    let sumBank = 0, countBank = 0;
    let sumOther = 0, countOther = 0;

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    globalPaymentsList.forEach(data => {
        const amount = parseFloat(data.amount) || 0;
        const dateIso = data.date ? new Date(data.date).toISOString() : new Date().toISOString();

        if (dateIso >= startOfDay) todayRev += amount;
        if (dateIso >= startOfMonth) {
            monthRev += amount;
            const srcInfo = getPaymentSourceInfo(data.method);
            if (srcInfo.key === 'Cash') { sumCash += amount; countCash++; }
            else if (srcInfo.key === 'Card') { sumCard += amount; countCard++; }
            else if (srcInfo.key === 'InstaPay') { sumInsta += amount; countInsta++; }
            else if (srcInfo.key === 'Vodafone Cash') { sumVodafone += amount; countVodafone++; }
            else if (srcInfo.key === 'Bank Transfer') { sumBank += amount; countBank++; }
            else { sumOther += amount; countOther++; }
        }
    });

    // Update Income Sources Breakdown UI Cards
    const formatCur = (val) => window.formatCurrency ? window.formatCurrency(val) : (val + ' ج.م');
    const updateSrcCard = (type, sum, count) => {
        const totalEl = document.getElementById(`srcTotal-${type}`);
        const countEl = document.getElementById(`srcCount-${type}`);
        if (totalEl) totalEl.innerText = formatCur(sum);
        if (countEl) countEl.innerText = `${count} ${isAr ? 'عملية' : 'txns'}`;
    };

    updateSrcCard('cash', sumCash, countCash);
    updateSrcCard('card', sumCard, countCard);
    updateSrcCard('instapay', sumInsta, countInsta);
    updateSrcCard('vodafone', sumVodafone, countVodafone);
    updateSrcCard('bank', sumBank, countBank);
    updateSrcCard('other', sumOther, countOther);

    // Apply Payment Source Filter to Table
    let filteredPayments = globalPaymentsList;
    if (activeLedgerMethodFilter !== 'all') {
        filteredPayments = globalPaymentsList.filter(data => {
            const src = getPaymentSourceInfo(data.method).key;
            return src === activeLedgerMethodFilter;
        });
    }

    if (filteredPayments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">${isAr ? 'لا توجد مقبوضات مالية مطابقة لمصدر الدفع المحدد' : 'No transactions found for this payment channel'}</td></tr>`;
    } else {
        filteredPayments.forEach(data => {
            const amount = parseFloat(data.amount) || 0;
            const srcInfo = getPaymentSourceInfo(data.method);
            const formattedDate = window.formatDate ? window.formatDate(data.date) : data.date;

            const referenceVal = data.reference || data.ref;
            let detailsHtml = '';
            if (referenceVal && data.notes) {
                detailsHtml = `<div><strong style="font-family: monospace; color: var(--brand-primary); font-size: 0.8rem;">#${escapeHtml(referenceVal)}</strong></div><div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(data.notes)}</div>`;
            } else if (referenceVal) {
                detailsHtml = `<span style="font-family: monospace; color: var(--brand-primary); font-size: 0.82rem; font-weight: 600;">#${escapeHtml(referenceVal)}</span>`;
            } else if (data.notes) {
                detailsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(data.notes)}</span>`;
            } else {
                detailsHtml = `<span style="color: var(--text-muted); font-size: 0.78rem;">-</span>`;
            }

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted); white-space: nowrap;">${formattedDate}</td>
                    <td style="font-weight: 600; color: var(--brand-primary); cursor: pointer;" onclick="if(window.openPatientProfile && '${data.patientId}') window.openPatientProfile('${data.patientId}')">${data.patientName || '-'}</td>
                    <td>${data.treatmentName || '-'}</td>
                    <td style="color: var(--status-completed); font-weight: 800; font-family: monospace; font-size: 0.95rem;">${window.formatCurrency ? window.formatCurrency(amount) : amount}</td>
                    <td>
                        <span class="payment-source-badge ${srcInfo.badgeClass}">${srcInfo.label}</span>
                    </td>
                    <td>${detailsHtml}</td>
                    <td>
                        <div style="display: flex; gap: 0.35rem; align-items: center;">
                            <button type="button" class="btn-outline" style="padding: 2px 7px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 3px;" onclick="window.openOfficialReceipt('${data.id}')" title="${isAr ? 'طباعة سند قبض مالي رسمي' : 'Print Official Receipt'}">
                                🧾 <span>${isAr ? 'سند قبض' : 'Receipt'}</span>
                            </button>
                            <button type="button" class="btn-outline" style="padding: 2px 7px; font-size: 0.78rem;" onclick="if(window.editPayment) window.editPayment('${data.id}')" title="${isAr ? 'تعديل' : 'Edit'}">✏️</button>
                            <button type="button" class="btn-outline" style="padding: 2px 7px; font-size: 0.78rem; color: var(--status-error); border-color: rgba(239, 68, 68, 0.3);" onclick="if(window.deletePayment) window.deletePayment('${data.id}', '${data.treatmentId}', ${amount})" title="${isAr ? 'حذف' : 'Delete'}">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }

    if (document.getElementById('ledger-today-revenue')) {
        document.getElementById('ledger-today-revenue').innerText = window.formatCurrency ? window.formatCurrency(todayRev) : todayRev;
        document.getElementById('ledger-month-revenue').innerText = window.formatCurrency ? window.formatCurrency(monthRev) : monthRev;
    }
}
window.renderLedgerRows = renderLedgerRows;

// Bind Payment Source Filter Buttons for Ledger Table
function setupLedgerSourceFilterListeners() {
    const filterButtons = document.querySelectorAll('.ledger-method-filter-btn');
    filterButtons.forEach(btn => {
        btn.onclick = () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeLedgerMethodFilter = btn.getAttribute('data-method') || 'all';
            renderLedgerRows();
        };
    });
}

// Official Payment Receipt Generator & Modal Display
window.openOfficialReceipt = async function(paymentId) {
    let pay = globalPaymentsList.find(p => p.id === paymentId);
    
    // Fallback: If not in memory, query Firestore
    if (!pay) {
        const user = auth.currentUser;
        if (user && paymentId) {
            try {
                const payDoc = await getDoc(doc(db, 'users', user.uid, 'payments', paymentId));
                if (payDoc.exists()) {
                    pay = { id: payDoc.id, ...payDoc.data() };
                }
            } catch (err) {
                console.error("Error fetching payment doc for receipt", err);
            }
        }
    }

    if (!pay) {
        if (window.showToast) {
            const isAr = (document.documentElement.lang || 'en') === 'ar';
            window.showToast(isAr ? 'لم يتم العثور على بيانات المعاملة' : 'Payment record not found', 'warning');
        }
        return;
    }

    const isAr = (document.documentElement.lang || 'en') === 'ar';
    const amount = parseFloat(pay.amount) || 0;
    const formattedAmount = window.formatCurrency ? window.formatCurrency(amount) : (amount + ' EGP');
    const srcInfo = getPaymentSourceInfo(pay.method);

    // Get patient details
    const patient = (window.currentPatients || []).find(p => p.id === pay.patientId || p.name === pay.patientName);
    const fileId = patient?.displayId || pay.patientId?.substring(0, 5)?.toUpperCase() || '--';
    const phone = patient?.phone || '-';

    // Get parent treatment details
    let totalCost = amount;
    let paidSoFar = amount;
    let remaining = 0;
    const treatment = (window.currentTreatments || []).find(t => t.id === pay.treatmentId);
    if (treatment) {
        totalCost = parseFloat(treatment.cost) || amount;
        paidSoFar = parseFloat(treatment.paidAmount) || amount;
        remaining = Math.max(0, totalCost - paidSoFar);
    }

    // Populate Receipt Modal elements
    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    setTxt('receiptNumber', `REC-${(pay.id || '0000').substring(0, 8).toUpperCase()}`);
    setTxt('receiptDate', pay.date ? (window.formatDate ? window.formatDate(pay.date) : pay.date) : new Date().toLocaleDateString());
    setTxt('receiptPatientName', pay.patientName || '-');
    setTxt('receiptPatientFileId', `#${fileId}`);
    setTxt('receiptPatientPhone', phone);
    setTxt('receiptTreatmentName', pay.treatmentName || (isAr ? 'علاج أسنان' : 'Dental Treatment'));
    setTxt('receiptTreatmentTotal', window.formatCurrency ? window.formatCurrency(totalCost) : totalCost);
    setTxt('receiptAmountDisplay', formattedAmount);

    // Source Badge
    const badgeEl = document.getElementById('receiptSourceBadge');
    if (badgeEl) {
        badgeEl.className = `payment-source-badge ${srcInfo.badgeClass}`;
        badgeEl.innerHTML = `${srcInfo.icon} ${srcInfo.label}`;
    }

    // Ref & Notes
    const refWrap = document.getElementById('receiptRefWrapper');
    const refTxt = document.getElementById('receiptRefText');
    const notesWrap = document.getElementById('receiptNotesWrapper');
    const notesTxt = document.getElementById('receiptNotesText');

    const paymentRef = pay.reference || pay.ref;
    if (paymentRef || pay.notes) {
        if (refWrap) {
            refWrap.style.display = paymentRef ? 'block' : 'none';
            if (refTxt) refTxt.innerText = paymentRef || '';
        }
        if (notesWrap) {
            notesWrap.style.display = pay.notes ? 'block' : 'none';
            if (notesTxt) notesTxt.innerText = pay.notes || '';
        }
    } else {
        if (refWrap) refWrap.style.display = 'none';
        if (notesWrap) notesWrap.style.display = 'none';
    }

    // Financial statement
    setTxt('receiptStmtTotal', window.formatCurrency ? window.formatCurrency(totalCost) : totalCost);
    setTxt('receiptStmtPaid', window.formatCurrency ? window.formatCurrency(paidSoFar) : paidSoFar);
    setTxt('receiptStmtRemaining', window.formatCurrency ? window.formatCurrency(remaining) : remaining);

    // Clinic config if available
    const cfg = window.currentClinicConfig || (window.settingsStore ? window.settingsStore.config : null);
    if (cfg) {
        if (cfg.clinicName) setTxt('receiptClinicName', cfg.clinicName);
        if (cfg.doctorName) setTxt('receiptDoctorName', cfg.doctorName);
        if (cfg.credentials) setTxt('receiptDoctorCreds', cfg.credentials);
        if (cfg.phone) setTxt('receiptClinicPhone', `Phone: ${cfg.phone}`);
        if (cfg.financial?.taxRegistrationNumber) setTxt('receiptTaxNumber', cfg.financial.taxRegistrationNumber);
    }

    const receiptModal = document.getElementById('paymentReceiptModal');
    if (receiptModal) {
        receiptModal.classList.add('show');
        history.pushState({ modal: 'receipt' }, '', window.location.hash);
    }
};

function setupGlobalLedger() {
    const user = auth.currentUser;
    if (!user) return;
    const ledgerRef = collection(db, 'users', user.uid, 'payments');
    onSnapshot(ledgerRef, (snapshot) => {
        globalPaymentsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.date) - new Date(a.date));
        renderLedgerRows();
        renderOutstandingBalancesTable();
        setupLedgerSourceFilterListeners();
    });
}

// Render Outstanding balances table
function renderOutstandingBalancesTable() {
    const tbody = document.getElementById('outstanding-balances-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const isAr = (document.documentElement.lang || 'en') === 'ar';
    let totalOutstanding = 0;
    const pendingWithBalance = currentTreatments.filter(t => {
        const cost = parseFloat(t.cost) || 0;
        const paid = parseFloat(t.paidAmount) || 0;
        return (cost - paid) > 0;
    });

    if (pendingWithBalance.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">${isAr ? 'لا توجد مبالغ متبقية، كل الحسابات مسددة بالكامل 🎉' : 'No outstanding balances found! All paid in full 🎉'}</td></tr>`;
        const outDisplay = document.getElementById('ledger-outstanding');
        if (outDisplay) outDisplay.innerText = window.formatCurrency ? window.formatCurrency(0) : '0';
        return;
    }

    pendingWithBalance.forEach(t => {
        const cost = parseFloat(t.cost) || 0;
        const paid = parseFloat(t.paidAmount) || 0;
        const rem = cost - paid;
        totalOutstanding += rem;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 600; color: var(--brand-primary); cursor: pointer;" onclick="if(window.openPatientProfile && '${t.patientId}') window.openPatientProfile('${t.patientId}')">${t.patientName}</td>
                <td>${t.treatmentType || t.type}</td>
                <td>${window.formatCurrency ? window.formatCurrency(cost) : cost}</td>
                <td style="color: var(--status-completed);">${window.formatCurrency ? window.formatCurrency(paid) : paid}</td>
                <td style="color: var(--status-error); font-weight: bold;">${window.formatCurrency ? window.formatCurrency(rem) : rem}</td>
                <td>
                    <button class="btn-primary" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" onclick="if(window.openPaymentModal) window.openPaymentModal('${t.id}', '${t.patientId || ''}', '${t.patientName}', '${t.treatmentType || t.type}')">${isAr ? 'تحصيل الآن' : 'Pay Now'}</button>
                </td>
            </tr>
        `;
    });

    const outDisplay = document.getElementById('ledger-outstanding');
    if (outDisplay) outDisplay.innerText = window.formatCurrency ? window.formatCurrency(totalOutstanding) : totalOutstanding;
}
window.renderOutstandingBalancesTable = renderOutstandingBalancesTable;

// Payments Ledger & Outstanding Tabs Toggle
const tabLedgerAll = document.getElementById('tabLedgerAll');
const tabLedgerBalances = document.getElementById('tabLedgerBalances');
const ledgerMainTable = document.getElementById('ledgerMainTable');
const outstandingBalancesTable = document.getElementById('outstandingBalancesTable');

if (tabLedgerAll && tabLedgerBalances) {
    tabLedgerAll.addEventListener('click', () => {
        tabLedgerAll.classList.add('active');
        tabLedgerBalances.classList.remove('active');
        ledgerMainTable.style.display = 'table';
        outstandingBalancesTable.style.display = 'none';
    });

    tabLedgerBalances.addEventListener('click', () => {
        tabLedgerBalances.classList.add('active');
        tabLedgerAll.classList.remove('active');
        ledgerMainTable.style.display = 'none';
        outstandingBalancesTable.style.display = 'table';
        renderOutstandingBalancesTable();
    });
}

// Export Ledger CSV with Full Payment Channel Breakdown & Ref
const exportLedgerCsvBtn = document.getElementById('exportLedgerCsvBtn');
if (exportLedgerCsvBtn) {
    exportLedgerCsvBtn.addEventListener('click', () => {
        if (!globalPaymentsList || globalPaymentsList.length === 0) {
            const isAr = document.documentElement.lang === 'ar';
            if (window.showToast) window.showToast(isAr ? 'لا توجد معاملات مالية للتصدير' : 'No transactions to export', 'warning');
            return;
        }

        const headers = ['Date', 'Patient Name', 'Treatment', 'Amount', 'Payment Method & Channel', 'Reference Slip #', 'Notes'];
        const rows = globalPaymentsList.map(p => {
            const src = getPaymentSourceInfo(p.method);
            return [
                `"${(p.date || '')}"`,
                `"${(p.patientName || '').replace(/"/g, '""')}"`,
                `"${(p.treatmentName || '').replace(/"/g, '""')}"`,
                `"${(p.amount || 0)}"`,
                `"${(src.label || p.method || '')}"`,
                `"${(p.ref || '')}"`,
                `"${(p.notes || '').replace(/"/g, '""')}"`
            ];
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Molarize_Income_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

// --- Schedule Filter Toolbar & Day List Logic with WhatsApp Reminder ---
const filterCalAll = document.getElementById('filterCalAll');
const filterCalToday = document.getElementById('filterCalToday');
const filterCalTomorrow = document.getElementById('filterCalTomorrow');
const dayAppointmentsListView = document.getElementById('dayAppointmentsListView');
const mainCalendarWrapper = document.getElementById('mainCalendarWrapper');
const dayAppointmentsTableBody = document.getElementById('dayAppointmentsTableBody');
const dayListTitle = document.getElementById('dayListTitle');

let lastFocusedDayIso = null;
let lastFocusedDayTitle = '';

function renderFocusedDayList(targetDateIso, titleText) {
    lastFocusedDayIso = targetDateIso;
    lastFocusedDayTitle = titleText;

    if (!dayAppointmentsTableBody) return;
    dayAppointmentsTableBody.innerHTML = '';
    if (dayListTitle) dayListTitle.innerText = titleText;

    const filtered = currentAppointments
        .filter(a => a.date === targetDateIso)
        .sort((a,b) => (a.time || '').localeCompare(b.time || ''));

    const isAr = document.documentElement.lang === 'ar';

    if (filtered.length === 0) {
        dayAppointmentsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">${isAr ? 'لا توجد مواعيد مسجلة لهذا اليوم' : 'No appointments scheduled for this day.'}</td></tr>`;
        return;
    }

    filtered.forEach(appt => {
        // Find patient phone
        const patient = (window.currentPatients || []).find(p => p.id === appt.patientId || p.name === appt.patientName);
        const p1 = patient ? (patient.phone || appt.patientPhone) : (appt.patientPhone || '-');
        const p2 = (patient && patient.phone2) ? patient.phone2 : null;

        const callPref = (patient && patient.callPref) ? patient.callPref : 'phone1';
        const waPref = (patient && patient.waPref) ? patient.waPref : 'phone1';

        const targetCallPhone = (callPref === 'phone2' && p2) ? p2 : p1;
        const cleanCallPhone = String(targetCallPhone || '').replace(/\D/g, '');

        const targetWaPhone = (waPref === 'phone2' && p2) ? p2 : p1;
        const cleanWaPhone = String(targetWaPhone || '').replace(/\D/g, '');
        const waLink = cleanWaPhone ? (cleanWaPhone.startsWith('0') ? '2' + cleanWaPhone : '20' + cleanWaPhone) : '';

        const formattedTime = window.formatTime ? window.formatTime(appt.time) : appt.time;
        const reminderMsg = isAr ? 
            `مرحباً ${appt.patientName || 'يا فندم'}، نذكرك بموعدك في عيادة MOLARIZE للأسنان في تمام الساعة ${formattedTime}. نتمنى لك دوام الصحة والعافية.` :
            `Hello ${appt.patientName || ''}, this is a gentle reminder of your dental appointment at MOLARIZE Dental Clinic at ${formattedTime}. See you soon!`;

        let p1Badge = '';
        let p2Badge = '';
        if (p2) {
            if (callPref === 'phone1' && waPref === 'phone1') p1Badge = ` <span class="pref-tag pref-tag-both">⭐ ${isAr ? 'مفضل لاتصال وواتساب' : 'Preferred'}</span>`;
            else if (callPref === 'phone1') p1Badge = ` <span class="pref-tag pref-tag-call">📞 ${isAr ? 'مفضل للاتصال' : 'Preferred Call'}</span>`;
            else if (waPref === 'phone1') p1Badge = ` <span class="pref-tag pref-tag-wa">💬 ${isAr ? 'مفضل للواتساب' : 'Preferred WA'}</span>`;

            if (callPref === 'phone2' && waPref === 'phone2') p2Badge = ` <span class="pref-tag pref-tag-both">⭐ ${isAr ? 'مفضل لاتصال وواتساب' : 'Preferred'}</span>`;
            else if (callPref === 'phone2') p2Badge = ` <span class="pref-tag pref-tag-call">📞 ${isAr ? 'مفضل للاتصال' : 'Preferred Call'}</span>`;
            else if (waPref === 'phone2') p2Badge = ` <span class="pref-tag pref-tag-wa">💬 ${isAr ? 'مفضل للواتساب' : 'Preferred WA'}</span>`;
        }

        let phonesHtml = `<div style="display: flex; flex-direction: column; gap: 3px;">`;
        if (p1 && p1 !== '-') {
            phonesHtml += `<span style="font-weight: 600; font-size: 0.86rem;">📞 ${p1}${p1Badge}</span>`;
        }
        if (p2) {
            phonesHtml += `<span style="color: var(--brand-primary); font-size: 0.84rem; font-weight: 600;">📱 ${p2} <small style="opacity:0.8;">(${isAr ? 'إضافي' : 'Secondary'})</small>${p2Badge}</span>`;
        }
        if (!p1 && !p2) {
            phonesHtml += `<span style="color: var(--text-muted);">-</span>`;
        }
        phonesHtml += `</div>`;

        let waButtonsHtml = `<div style="display: flex; gap: 4px; flex-wrap: wrap;">`;
        if (cleanWaPhone) {
            waButtonsHtml += `
                <a href="https://wa.me/${waLink}?text=${encodeURIComponent(reminderMsg)}" target="_blank" class="btn-outline" style="padding: 0.25rem 0.55rem; font-size: 0.78rem; text-decoration: none; color: #25D366; border-color: rgba(37, 211, 102, 0.4); display: inline-flex; align-items: center; gap: 3px;" title="${isAr ? `إرسال تذكير واتساب للرقم المحدد في الملف (${targetWaPhone})` : `Send WhatsApp to preferred number (${targetWaPhone})`}">
                    💬 <span>${isAr ? 'إرسال تذكير واتساب' : 'Send WA Reminder'}</span>
                </a>`;
        } else {
            waButtonsHtml += `<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>`;
        }
        waButtonsHtml += `</div>`;

        dayAppointmentsTableBody.innerHTML += `
            <tr>
                <td style="font-weight: 700; color: var(--brand-primary); white-space: nowrap;">${formattedTime}</td>
                <td style="font-weight: 700; cursor: pointer; word-break: break-word;" onclick="if(window.openPatientProfile && '${appt.patientId || ''}') window.openPatientProfile('${appt.patientId}')" title="${isAr ? 'فتح ملف المريض' : 'Open Profile'}">${appt.patientName}</td>
                <td>${phonesHtml}</td>
                <td>${waButtonsHtml}</td>
                <td>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        ${cleanCallPhone ? `
                        <a href="tel:${cleanCallPhone}" class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 3px;" title="${isAr ? `اتصال (${targetCallPhone})` : `Call (${targetCallPhone})`}">
                            📞 ${isAr ? 'اتصال' : 'Call'}
                        </a>` : ''}
                        <button type="button" class="btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.8rem; color: var(--status-error); border-color: var(--status-error);" onclick="window.openAppointmentActionModal('${appt.id}')">${isAr ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

window.refreshCurrentDayAppointmentsList = function() {
    if (dayAppointmentsListView && dayAppointmentsListView.style.display !== 'none' && lastFocusedDayIso) {
        const isAr = (document.documentElement.lang || 'en') === 'ar';
        const isToday = lastFocusedDayIso === new Date().toISOString().split('T')[0];
        const title = isToday ? 
            (isAr ? 'مواعيد اليوم (مع تذكير الواتساب)' : "Today's Appointments (with WhatsApp Reminder)") :
            (isAr ? 'مواعيد الغد (مع تذكير الواتساب)' : "Tomorrow's Appointments (with WhatsApp Reminder)");
        renderFocusedDayList(lastFocusedDayIso, title);
    }
};

if (filterCalAll && filterCalToday && filterCalTomorrow) {
    filterCalAll.addEventListener('click', () => {
        filterCalAll.classList.add('active');
        filterCalToday.classList.remove('active');
        filterCalTomorrow.classList.remove('active');
        if (dayAppointmentsListView) dayAppointmentsListView.style.display = 'none';
        if (mainCalendarWrapper) mainCalendarWrapper.style.display = 'block';
        if (calendarInstance) calendarInstance.render();
    });

    filterCalToday.addEventListener('click', () => {
        filterCalToday.classList.add('active');
        filterCalAll.classList.remove('active');
        filterCalTomorrow.classList.remove('active');
        if (mainCalendarWrapper) mainCalendarWrapper.style.display = 'none';
        if (dayAppointmentsListView) dayAppointmentsListView.style.display = 'block';
        const todayIso = new Date().toISOString().split('T')[0];
        const isAr = document.documentElement.lang === 'ar';
        renderFocusedDayList(todayIso, isAr ? 'مواعيد اليوم (مع تذكير الواتساب)' : "Today's Appointments (with WhatsApp Reminder)");
    });

    filterCalTomorrow.addEventListener('click', () => {
        filterCalTomorrow.classList.add('active');
        filterCalAll.classList.remove('active');
        filterCalToday.classList.remove('active');
        if (mainCalendarWrapper) mainCalendarWrapper.style.display = 'none';
        if (dayAppointmentsListView) dayAppointmentsListView.style.display = 'block';
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        const tomorrowIso = tmrw.toISOString().split('T')[0];
        const isAr = document.documentElement.lang === 'ar';
        renderFocusedDayList(tomorrowIso, isAr ? 'مواعيد الغد (مع تذكير الواتساب)' : "Tomorrow's Appointments (with WhatsApp Reminder)");
    });
}

