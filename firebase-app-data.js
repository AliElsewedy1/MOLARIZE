// This file handles Appointments, Treatment Plans, and Dashboard Stats using Firebase Firestore.
// It relies on window.db, window.auth, and Firestore methods exposed in dashboard.html.

let currentUserUid = null;
let calendarInstance = null;
let revenueChartInstance = null;
let currentAppointments = [];
let currentTreatments = [];

// DOM Elements
const todayAppointmentsTableBody = document.getElementById('today-appointments-table-body');
const totalPatientsCount = document.getElementById('total-patients-count');
const todayAppointmentsCount = document.getElementById('today-appointments-count');
const monthlyRevenueCount = document.getElementById('monthly-revenue-count');

const treatmentsTableBody = document.getElementById('treatments-table-body');
const treatmentModal = document.getElementById('treatmentModal');
const openTreatmentModalBtn = document.getElementById('openTreatmentModalBtn');
const cancelTreatmentBtn = document.getElementById('cancelTreatmentBtn');
const treatmentForm = document.getElementById('treatmentForm');

const appointmentModal = document.getElementById('appointmentModal');
const openAppointmentModalBtn = document.getElementById('openAppointmentModalBtn');
const cancelApptBtn = document.getElementById('cancelApptBtn');
const appointmentForm = document.getElementById('appointmentForm');

// Initialize modules on Auth
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.auth && window.onAuthStateChanged) {
            window.onAuthStateChanged(window.auth, (user) => {
                if (user) {
                    currentUserUid = user.uid;
                    initDashboard();
                }
            });
        }
    }, 600);
});

async function initDashboard() {
    await loadTreatments();
    await loadAppointments();
    updateDashboardStats();
    initCalendar();
    initChart();
}

// ---------------------------------------------------------
// Treatment Plans Logic
// ---------------------------------------------------------

if (openTreatmentModalBtn) {
    openTreatmentModalBtn.addEventListener('click', () => {
        treatmentForm.reset();
        document.getElementById('treatmentId').value = '';
        treatmentModal.classList.add('show');
    });
}

if (cancelTreatmentBtn) {
    cancelTreatmentBtn.addEventListener('click', () => {
        treatmentModal.classList.remove('show');
    });
}

async function loadTreatments() {
    if (!currentUserUid) return;
    try {
        const treatmentsRef = window.collection(window.db, "users", currentUserUid, "treatments");
        const querySnapshot = await window.getDocs(treatmentsRef);
        currentTreatments = [];
        querySnapshot.forEach((doc) => {
            currentTreatments.push({ id: doc.id, ...doc.data() });
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
        const patientName = document.getElementById('treatmentPatientName').value;
        const type = document.getElementById('treatmentType').value;
        const cost = parseFloat(document.getElementById('treatmentCost').value) || 0;
        const status = document.getElementById('treatmentStatus').value;
        const submitBtn = treatmentForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;

        try {
            if (idField) {
                const treatmentRef = window.doc(window.db, "users", currentUserUid, "treatments", idField);
                await window.updateDoc(treatmentRef, { patientName, type, cost, status });
            } else {
                const treatmentsRef = window.collection(window.db, "users", currentUserUid, "treatments");
                await window.addDoc(treatmentsRef, {
                    patientName, type, cost, status, createdAt: new Date().toISOString()
                });
            }
            await loadTreatments();
            treatmentModal.classList.remove('show');
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
        document.getElementById('treatmentType').value = t.type;
        document.getElementById('treatmentCost').value = t.cost;
        document.getElementById('treatmentStatus').value = t.status;
        treatmentModal.classList.add('show');
    }
}

window.deleteTreatment = async function(id) {
    if (confirm('Are you sure you want to delete this treatment plan?')) {
        try {
            await window.deleteDoc(window.doc(window.db, "users", currentUserUid, "treatments", id));
            await loadTreatments();
            initChart();
        } catch (e) {
            console.error("Error deleting treatment: ", e);
        }
    }
}

// ---------------------------------------------------------
// Appointments & Schedule Logic
// ---------------------------------------------------------

if (openAppointmentModalBtn) {
    openAppointmentModalBtn.addEventListener('click', () => {
        appointmentForm.reset();
        document.getElementById('appointmentId').value = '';
        appointmentModal.classList.add('show');
    });
}

if (cancelApptBtn) {
    cancelApptBtn.addEventListener('click', () => {
        appointmentModal.classList.remove('show');
    });
}

async function loadAppointments() {
    if (!currentUserUid) return;
    try {
        const appointmentsRef = window.collection(window.db, "users", currentUserUid, "appointments");
        const querySnapshot = await window.getDocs(appointmentsRef);
        currentAppointments = [];
        querySnapshot.forEach((doc) => {
            currentAppointments.push({ id: doc.id, ...doc.data() });
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
            if (idField) {
                const apptRef = window.doc(window.db, "users", currentUserUid, "appointments", idField);
                await window.updateDoc(apptRef, { patientName, date, time });
            } else {
                const apptsRef = window.collection(window.db, "users", currentUserUid, "appointments");
                await window.addDoc(apptsRef, { patientName, date, time, status: 'Scheduled' });
            }
            await loadAppointments();
            appointmentModal.classList.remove('show');
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
            await window.deleteDoc(window.doc(window.db, "users", currentUserUid, "appointments", id));
            await loadAppointments();
        } catch (e) {
            console.error("Error deleting appointment: ", e);
        }
    }
}

// ---------------------------------------------------------
// Dashboard Integrations
// ---------------------------------------------------------

async function updateDashboardStats() {
    if (!currentUserUid) return;

    // Total Patients
    try {
        const patientsRef = window.collection(window.db, "users", currentUserUid, "patients");
        const querySnapshot = await window.getDocs(patientsRef);
        if(totalPatientsCount) totalPatientsCount.innerText = querySnapshot.size;
    } catch(e) { console.error(e); }

    // Today's Appointments Count
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = currentAppointments.filter(a => a.date === today);
    if(todayAppointmentsCount) todayAppointmentsCount.innerText = todayAppts.length;

    // Monthly Revenue (sum of completed treatments)
    const totalRev = currentTreatments
        .filter(t => t.status === 'Completed')
        .reduce((sum, t) => sum + (t.cost || 0), 0);
    if(monthlyRevenueCount) monthlyRevenueCount.innerText = `$${totalRev}`;
}

function renderTodayAppointments() {
    if (!todayAppointmentsTableBody) return;
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = currentAppointments.filter(a => a.date === today);

    todayAppointmentsTableBody.innerHTML = '';

    if (todayAppts.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" style="text-align:center;" data-ar="لا يوجد مواعيد اليوم" data-en="No appointments today">No appointments today</td>`;
        todayAppointmentsTableBody.appendChild(row);
        return;
    }

    todayAppts.forEach(appt => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${appt.patientName}</td>
            <td>${appt.time}</td>
            <td><span class="status-badge status-inprogress">Scheduled</span></td>
        `;
        todayAppointmentsTableBody.appendChild(row);
    });
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
        events: formatEventsForCalendar(),
        eventClick: function(info) {
            // Ask to delete on click for simplicity
            window.deleteAppointmentFromCalendar(info.event.id);
        }
    });

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
