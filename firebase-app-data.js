// This file handles Appointments, Treatment Plans, and Dashboard Stats using Firebase Firestore.
import { db, auth, onAuthStateChanged, signOut, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from "./firebase-config.js";

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
window.openNewAppointmentModal = function() {
    const aModal = document.getElementById('appointmentModal');
    const aForm = document.getElementById('appointmentForm');
    if (aForm) aForm.reset();
    const aId = document.getElementById('appointmentId');
    if (aId) aId.value = '';
    const aDropdown = document.getElementById('apptPatientDropdown');
    if (aDropdown) aDropdown.style.display = 'none';
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
    return status;
}

function renderTreatments() {
    if (!treatmentsTableBody) return;
    treatmentsTableBody.innerHTML = '';

    currentTreatments.forEach(treatment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${treatment.patientName}</td>
            <td>${treatment.type}</td>
            <td>$${treatment.cost}</td>
            <td><span class="status-badge ${getStatusBadgeClass(treatment.status)}">${getStatusText(treatment.status)}</span></td>
            <td>
                <button class="btn-action btn-edit" onclick="window.editTreatment('${treatment.id}')">Edit</button>
                <button class="btn-action btn-delete" onclick="window.deleteTreatment('${treatment.id}')">Delete</button>
            </td>
        `;
        treatmentsTableBody.appendChild(row);
    });
}

if (treatmentForm) {
    treatmentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const idField = document.getElementById('treatmentId').value;
        const pNameInput = document.getElementById('treatmentPatientName');
        const patientName = pNameInput.value;
        const targetPatientId = pNameInput.getAttribute('data-target-id');
        const type = document.getElementById('treatmentType').value;
        const cost = parseFloat(document.getElementById('treatmentCost').value) || 0;
        const status = document.getElementById('treatmentStatus').value;
        const submitBtn = treatmentForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;

        try {
            if (idField) {
                const treatmentRef = doc(db, "users", currentUserUid, "treatments", idField);
                await updateDoc(treatmentRef, { patientName, type, cost, status });
            } else {
                const treatmentsRef = collection(db, "users", currentUserUid, "treatments");
                const payload = {
                    patientName, type, cost, status, createdAt: new Date().toISOString()
                };
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
// Autocomplete for Appointments
// ---------------------------------------------------------
const apptPatientInput = document.getElementById('apptPatientName');
const apptPatientId = document.getElementById('apptPatientId');
const apptPatientDropdown = document.getElementById('apptPatientDropdown');
const btnQuickAddPatient = document.getElementById('btnQuickAddPatient');

if (apptPatientInput) {
    apptPatientInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        apptPatientDropdown.innerHTML = '';
        apptPatientId.value = ''; // Reset ID on new typing

        if (!val) {
            apptPatientDropdown.style.display = 'none';
            return;
        }

        // We assume window.currentPatients exists from firebase-patients.js
        const patients = window.currentPatients || [];

        const matches = patients.filter(p => {
            const nameMatch = p.name && p.name.toLowerCase().includes(val);
            const phoneMatch = p.phone && p.phone.includes(val);
            const idMatch = p.displayId && p.displayId.toLowerCase().includes(val);
            return nameMatch || phoneMatch || idMatch;
        });

        if (matches.length > 0) {
            matches.forEach(p => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `
                    <div class="autocomplete-name">${p.name}</div>
                    <div class="autocomplete-details">
                        <span>ID: ${p.displayId || '-'}</span>
                        <span>📱 ${p.phone || '-'}</span>
                    </div>
                `;
                item.addEventListener('click', () => {
                    apptPatientInput.value = p.name;
                    apptPatientId.value = p.id; // store document ID
                    apptPatientDropdown.style.display = 'none';
                });
                apptPatientDropdown.appendChild(item);
            });
            apptPatientDropdown.style.display = 'block';
        } else {
            apptPatientDropdown.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No patients found.</div>';
            apptPatientDropdown.style.display = 'block';
        }
    });


    if (btnQuickAddPatient) {
        btnQuickAddPatient.addEventListener('click', () => {
            // Close appointment modal
            if(window.closeModalAndPopState) window.closeModalAndPopState(appointmentModal);
            else appointmentModal.classList.remove('show');

            // Open patient modal
            const openPatientBtn = document.getElementById('openModalBtn');
            if (openPatientBtn) openPatientBtn.click();

            // Pre-fill name if typed
            setTimeout(() => {
                const patNameInput = document.getElementById('patientName');
                if (patNameInput && apptPatientInput.value) {
                    patNameInput.value = apptPatientInput.value;
                }
            }, 100);
        });
    }

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== apptPatientInput && e.target !== apptPatientDropdown && !apptPatientDropdown.contains(e.target)) {
            apptPatientDropdown.style.display = 'none';
        }
    });
}

// Appointments & Schedule Logic
// ---------------------------------------------------------

if (openAppointmentModalBtn) {
    openAppointmentModalBtn.addEventListener('click', () => {
        appointmentForm.reset();
        document.getElementById('appointmentId').value = '';
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
        const patientName = document.getElementById('apptPatientName').value;
        const date = document.getElementById('apptDate').value;
        const time = document.getElementById('apptTime').value;
        const submitBtn = appointmentForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;

        try {
            const pId = document.getElementById('apptPatientId').value;
            if (idField) {
                const apptRef = doc(db, "users", currentUserUid, "appointments", idField);
                await updateDoc(apptRef, { patientName, patientId: pId, date, time });
            } else {
                const apptsRef = collection(db, "users", currentUserUid, "appointments");
                await addDoc(apptsRef, { patientName, patientId: pId, date, time, status: 'Scheduled' });
            }
            await loadAppointments();
            updateDashboardStats(); // Update stats
            if(window.closeModalAndPopState) window.closeModalAndPopState(appointmentModal);
            else appointmentModal.classList.remove('show');
        } catch (e) {
            console.error("Error saving appointment: ", e);
            alert("Error saving appointment.");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

window.deleteAppointmentFromCalendar = async function(id) {
    if (confirm('Delete this appointment?')) {
        try {
            await deleteDoc(doc(db, "users", currentUserUid, "appointments", id));
            await loadAppointments();
            updateDashboardStats(); // Update stats
        } catch (e) {
            console.error("Error deleting appointment: ", e);
        }
    }
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
    if(weeklyRevenue) weeklyRevenue.innerText = `$${totalRev}`;

    // Update KPI Card: Monthly Revenue
    const kpiRevenue = document.getElementById('kpi-month-revenue');
    if (kpiRevenue) kpiRevenue.innerText = `$${totalRev}`;

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
        const isAr = document.documentElement.lang === 'ar';

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
                const alertBadge = (p.medicalAlerts && p.medicalAlerts.trim()) ? 
                    `<span class="status-badge status-error" style="font-size: 0.72rem; padding: 2px 6px;">⚠️ ${p.medicalAlerts}</span>` : '';

                homeRecentPatients.innerHTML += `
                <div class="list-item" style="cursor: pointer; transition: background-color 0.2s, transform 0.2s;" onclick="if(window.openPatientProfile) window.openPatientProfile('${p.id}')">
                    <div class="list-item-left" style="gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="status-badge" style="background-color: rgba(45, 212, 191, 0.15); color: var(--brand-primary); font-size: 0.75rem; padding: 2px 7px; border-radius: 4px; font-weight: 700;">
                                #${p.displayId || '-'}
                            </span>
                            <span class="list-item-title" style="font-size: 1.05rem;">${p.name || 'Unknown'}</span>
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

function renderTimelineEvents(eventsContainer, dateString) {
    if (!eventsContainer) return;
    const dayAppts = currentAppointments.filter(a => a.date === dateString);
    eventsContainer.innerHTML = '';

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
            block.style.width = `${widthPercent}%`;
            block.innerHTML = `✓ ${appt.time}`;
            block.title = `${appt.patientName} at ${appt.time}`;

            eventsContainer.appendChild(block);
        }
    });
}

function renderTodayAppointments() {
    const localOffset = new Date().getTimezoneOffset() * 60000;
    const today = new Date(Date.now() - localOffset).toISOString().split('T')[0];
    renderTimelineEvents(homeTimelineEvents, today);

    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tomorrow = new Date(tmrw.getTime() - localOffset).toISOString().split('T')[0];
    renderTimelineEvents(tomorrowTimelineEvents, tomorrow);
}

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
            // Ask to delete on click for simplicity
            window.deleteAppointmentFromCalendar(info.event.id);
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

    revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'In Progress', 'Completed (Revenue)'],
            datasets: [{
                label: 'Treatment Value ($)',
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


// --- Ledger Logic ---
function setupGlobalLedger() {
    const user = auth.currentUser;
    if (!user) return;
    const ledgerRef = collection(db, 'users', user.uid, 'payments');
    onSnapshot(ledgerRef, (snapshot) => {
        const tbody = document.getElementById('ledger-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        let todayRev = 0;
        let monthRev = 0;

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

        const sorted = snapshot.docs.map(d => d.data()).sort((a,b) => new Date(b.date) - new Date(a.date));

        sorted.forEach(data => {
            const amount = parseFloat(data.amount) || 0;
            const dateIso = new Date(data.date).toISOString();

            if (dateIso >= startOfDay) todayRev += amount;
            if (dateIso >= startOfMonth) monthRev += amount;

            tbody.innerHTML += `
                <tr>
                    <td>${data.date}</td>
                    <td>${data.patientName}</td>
                    <td>${data.treatmentName}</td>
                    <td style="color: var(--status-completed); font-weight: bold;">${amount}</td>
                    <td>${data.method}</td>
                </tr>
            `;
        });

        if (document.getElementById('ledger-today-revenue')) {
            document.getElementById('ledger-today-revenue').innerText = todayRev;
            document.getElementById('ledger-month-revenue').innerText = monthRev;
        }
    });
}
