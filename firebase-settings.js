// firebase-settings.js
// Enterprise Settings & Practice Operations Controller for MOLARIZE
import { db, auth, onAuthStateChanged, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot } from "./firebase-config.js";

// ==========================================
// 1. DEFAULT DATA DEFINITIONS & SEEDS
// ==========================================
export const DEFAULT_CLINIC_CONFIG = {
    clinicId: "primary_clinic",
    clinicName: "",
    doctorName: "",
    credentials: "",
    licenseNumber: "",
    phone: "",
    phoneWhatsApp: "",
    email: "",
    address: "",
    logoUrl: "",
    signatureUrl: "",
    stampUrl: "",
    invoiceHeader: "",
    invoiceFooter: "",
    financial: {
        currencyCode: "EGP",
        currencySymbol: "ج.م",
        symbolPosition: "suffix",
        taxEnabled: false,
        taxRatePercentage: 14,
        taxRegistrationNumber: "",
        paymentMethods: {
            cash: true,
            card: true,
            instapay: true,
            vodafoneCash: true,
            bankTransfer: true,
            insurance: true,
            installment: true
        },
        discountPresets: [5, 10, 15, 20, 25, 30, 50],
        depositRequired: false,
        minimumDepositPercentage: 20
    },
    clinicalRules: {
        enableAllergyWarning: true,
        requireOverrideReason: true,
        autoSignatureOnPrescription: true,
        allowDentistPriceEdit: true
    },
    currentRole: "Owner" // Default role for active session (Owner, Admin, Dentist, Assistant)
};

export const DEFAULT_SERVICES = [
    {
        id: "srv_composite_filling",
        code: "D2391",
        nameAr: "حشو تجميلي كومبوزيت",
        nameEn: "Composite Filling",
        category: "restorative",
        currentPrice: 500,
        currency: "EGP",
        durationMinutes: 45,
        isActive: true,
        priceHistory: [{ price: 500, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_root_canal",
        code: "D3330",
        nameAr: "علاج جذور وعصب",
        nameEn: "Root Canal Treatment",
        category: "endodontics",
        currentPrice: 1200,
        currency: "EGP",
        durationMinutes: 60,
        isActive: true,
        priceHistory: [{ price: 1200, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_scaling_polishing",
        code: "D1110",
        nameAr: "تنظيف وتلميع وإزالة جير",
        nameEn: "Teeth Scaling & Polishing",
        category: "hygiene",
        currentPrice: 400,
        currency: "EGP",
        durationMinutes: 30,
        isActive: true,
        priceHistory: [{ price: 400, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_simple_extraction",
        code: "D7140",
        nameAr: "خلع سن بسيط",
        nameEn: "Simple Extraction",
        category: "surgery",
        currentPrice: 350,
        currency: "EGP",
        durationMinutes: 30,
        isActive: true,
        priceHistory: [{ price: 350, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_surgical_extraction",
        code: "D7210",
        nameAr: "خلع جراحي لضرس العقل",
        nameEn: "Surgical Wisdom Extraction",
        category: "surgery",
        currentPrice: 950,
        currency: "EGP",
        durationMinutes: 45,
        isActive: true,
        priceHistory: [{ price: 950, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_zirconia_crown",
        code: "D2740",
        nameAr: "طربوش زيركونيا عالي النقاء",
        nameEn: "Zirconia Crown",
        category: "prosthodontics",
        currentPrice: 1800,
        currency: "EGP",
        durationMinutes: 45,
        isActive: true,
        priceHistory: [{ price: 1800, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_teeth_whitening",
        code: "D9972",
        nameAr: "تبييض أسنان ليزر بالعيادة",
        nameEn: "In-Office Laser Whitening",
        category: "cosmetic",
        currentPrice: 1500,
        currency: "EGP",
        durationMinutes: 60,
        isActive: true,
        priceHistory: [{ price: 1500, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    },
    {
        id: "srv_dental_implant",
        code: "D6010",
        nameAr: "غرسة وزراعة أسنان تيتانيوم",
        nameEn: "Titanium Dental Implant",
        category: "implant",
        currentPrice: 8500,
        currency: "EGP",
        durationMinutes: 90,
        isActive: true,
        priceHistory: [{ price: 8500, currency: "EGP", effectiveDate: "2026-01-01", updatedBy: "System" }]
    }
];

export const DEFAULT_MEDICATIONS = [
    {
        id: "med_augmentin_1g",
        name: "Augmentin 1g Tab (Amoxicillin / Clavulanate)",
        dosageStrength: "1g (1000mg)",
        route: "Oral",
        frequency: "Every 12 hours",
        duration: "5-7 days",
        instructionsAr: "قرص واحد كل 12 ساعة بعد الأكل مباشرة لمدة أسبوع",
        instructionsEn: "1 tablet every 12 hours immediately after meals for 7 days",
        category: "Antibiotic",
        contraindications: ["Penicillin", "Amoxicillin", "Allergies"],
        isActive: true
    },
    {
        id: "med_cataflam_50mg",
        name: "Cataflam 50mg Tab (Diclofenac Potassium)",
        dosageStrength: "50mg",
        route: "Oral",
        frequency: "TID (3 times daily)",
        duration: "3-5 days",
        instructionsAr: "قرص بعد الأكل 3 مرات يومياً عند اللزوم",
        instructionsEn: "1 tablet after meals 3 times daily as needed for pain",
        category: "Analgesic",
        contraindications: ["Bleeding", "Gastric Ulcer", "Aspirin", "Pregnancy", "Hypertension"],
        isActive: true
    },
    {
        id: "med_panadol_extra",
        name: "Panadol Extra Tab (Paracetamol + Caffeine)",
        dosageStrength: "500mg / 65mg",
        route: "Oral",
        frequency: "PRN (When needed)",
        duration: "As needed",
        instructionsAr: "1-2 قرص عند الألم كل 6-8 ساعات (بحد أقصى 6 أقراص يومياً)",
        instructionsEn: "1-2 tablets every 6-8 hours when needed for mild to moderate pain",
        category: "Analgesic",
        contraindications: ["Liver Disease"],
        isActive: true
    },
    {
        id: "med_flagyl_500mg",
        name: "Flagyl 500mg Tab (Metronidazole)",
        dosageStrength: "500mg",
        route: "Oral",
        frequency: "TID (3 times daily)",
        duration: "5-7 days",
        instructionsAr: "قرص 3 مرات يومياً وسط الأكل (مضاد للبكتيريا اللاهوائية)",
        instructionsEn: "1 tablet 3 times daily with meals for anaerobic oral infection",
        category: "Antibiotic",
        contraindications: ["Alcohol", "Pregnancy", "Allergies"],
        isActive: true
    },
    {
        id: "med_chlorhexidine_mouthwash",
        name: "Chlorhexidine 0.12% Antiseptic Mouthwash",
        dosageStrength: "0.12% 250ml",
        route: "Rinse",
        frequency: "BID (Twice daily)",
        duration: "7-10 days",
        instructionsAr: "مضمضة 15 مل لمدة دقيقة مرتين يومياً بعد تفريش الأسنان بنصف ساعة",
        instructionsEn: "Rinse with 15ml for 60 seconds twice daily after brushing",
        category: "Antiseptic",
        contraindications: [],
        isActive: true
    },
    {
        id: "med_brufen_600mg",
        name: "Brufen 600mg Tab (Ibuprofen)",
        dosageStrength: "600mg",
        route: "Oral",
        frequency: "BID (Twice daily)",
        duration: "3-5 days",
        instructionsAr: "قرص بعد الأكل مرتين يومياً للحد من التورم والالتهاب",
        instructionsEn: "1 tablet twice daily after meals to relieve swelling and inflammation",
        category: "Anti-inflammatory",
        contraindications: ["Bleeding", "Gastric Ulcer", "Pregnancy", "Hypertension"],
        isActive: true
    },
    {
        id: "med_dalacin_300mg",
        name: "Dalacin C 300mg Cap (Clindamycin)",
        dosageStrength: "300mg",
        route: "Oral",
        frequency: "QID (Every 6 hours)",
        duration: "5 days",
        instructionsAr: "كبسولة كل 6 ساعات مع كوب ماء كبير (بديل ممتاز لمرضى حساسية البنسلين)",
        instructionsEn: "1 capsule every 6 hours with a full glass of water (penicillin-allergic patients)",
        category: "Antibiotic",
        contraindications: ["Clindamycin Allergy", "Colitis"],
        isActive: true
    }
];

// ==========================================
// 2. REACTIVE SETTINGS STATE STORE
// ==========================================
class SettingsStore {
    constructor() {
        this.config = { ...DEFAULT_CLINIC_CONFIG };
        this.services = [...DEFAULT_SERVICES];
        this.medications = [...DEFAULT_MEDICATIONS];
        this.auditLogs = [];
        this.listeners = new Set();
        this.isInitialized = false;
        this.tenantClinicId = "primary_clinic";
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        for (const listener of this.listeners) {
            try {
                listener({
                    config: this.config,
                    services: this.services,
                    medications: this.medications,
                    auditLogs: this.auditLogs
                });
            } catch (err) {
                console.error("Settings listener error:", err);
            }
        }
    }

    // Full unrestricted capabilities for settings management
    hasPermission(action) {
        return true;
    }

    getCurrencySymbol() {
        return this.config?.financial?.currencySymbol || "ج.م";
    }

    formatCurrency(amount) {
        const num = parseFloat(amount || 0);
        const symbol = this.getCurrencySymbol();
        const pos = this.config?.financial?.symbolPosition || "suffix";
        const formattedNum = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        return pos === "prefix" ? `${symbol} ${formattedNum}` : `${formattedNum} ${symbol}`;
    }
}

export const settingsStore = new SettingsStore();
window.settingsStore = settingsStore;

// ==========================================
// 3. FIRESTORE PERSISTENCE & SYNC
// ==========================================
// Helper functions to get authenticated path references nested under the secure users/{uid} node
function getClinicDocRef() {
    const uid = auth.currentUser?.uid || "fallback_default";
    return doc(db, "users", uid, "clinic_settings", "config");
}

function getServicesColRef() {
    const uid = auth.currentUser?.uid || "fallback_default";
    return collection(db, "users", uid, "clinic_services");
}

function getMedsColRef() {
    const uid = auth.currentUser?.uid || "fallback_default";
    return collection(db, "users", uid, "clinic_medications");
}

function getAuditLogsColRef() {
    const uid = auth.currentUser?.uid || "fallback_default";
    return collection(db, "users", uid, "clinic_audit_logs");
}

export async function initializeSettings() {
    const user = auth.currentUser;
    if (!user) return; // Wait for onAuthStateChanged to trigger once logged in

    try {
        // 1. Load Global Clinic Config
        const configDocRef = getClinicDocRef();
        const configSnap = await getDoc(configDocRef);
        
        if (configSnap.exists()) {
            const data = configSnap.data();
            settingsStore.config = {
                ...DEFAULT_CLINIC_CONFIG,
                ...data,
                financial: { ...DEFAULT_CLINIC_CONFIG.financial, ...(data.financial || {}) },
                clinicalRules: { ...settingsStore.config.clinicalRules, ...(data.clinicalRules || {}) }
            };
        } else {
            // Seed initial config
            await setDoc(configDocRef, DEFAULT_CLINIC_CONFIG);
            settingsStore.config = { ...DEFAULT_CLINIC_CONFIG };
        }

        // 2. Load Services
        const servicesColRef = getServicesColRef();
        const servicesSnap = await getDocs(servicesColRef);
        if (!servicesSnap.empty) {
            const list = [];
            servicesSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
            settingsStore.services = list;
        } else {
            // Seed initial services in batch
            for (const s of DEFAULT_SERVICES) {
                await setDoc(doc(servicesColRef, s.id), s);
            }
            settingsStore.services = [...DEFAULT_SERVICES];
        }

        // 3. Load Medications
        const medsColRef = getMedsColRef();
        const medsSnap = await getDocs(medsColRef);
        if (!medsSnap.empty) {
            const list = [];
            medsSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
            settingsStore.medications = list;
        } else {
            // Seed initial medications in batch
            for (const m of DEFAULT_MEDICATIONS) {
                await setDoc(doc(medsColRef, m.id), m);
            }
            settingsStore.medications = [...DEFAULT_MEDICATIONS];
        }

        // 4. Load Audit Logs (recent 50)
        await loadAuditLogs();

        // 5. Setup Real-time Listeners
        onSnapshot(configDocRef, (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                settingsStore.config = {
                    ...settingsStore.config,
                    ...d,
                    financial: { ...settingsStore.config.financial, ...(d.financial || {}) },
                    clinicalRules: { ...settingsStore.config.clinicalRules, ...(d.clinicalRules || {}) }
                };
                settingsStore.notify();
                updateDynamicUI();
            }
        });

        onSnapshot(servicesColRef, (snap) => {
            const list = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            if (list.length > 0) {
                settingsStore.services = list;
                settingsStore.notify();
                updateDynamicUI();
            }
        });

        onSnapshot(medsColRef, (snap) => {
            const list = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            if (list.length > 0) {
                settingsStore.medications = list;
                settingsStore.notify();
                updateDynamicUI();
            }
        });

        settingsStore.isInitialized = true;
        settingsStore.notify();
        updateDynamicUI();
        console.log("MOLARIZE Enterprise Settings initialized successfully.");
    } catch (err) {
        console.warn("Using offline fallback defaults for settings:", err);
        settingsStore.isInitialized = true;
        settingsStore.notify();
        updateDynamicUI();
    }
}

// Audit Trail Logger
export async function logAuditEvent(action, targetEntity, details = {}) {
    try {
        const logEntry = {
            timestamp: new Date().toISOString(),
            userId: auth.currentUser?.uid || "current_user",
            userName: settingsStore.config.doctorName || "Doctor / الطبيب",
            userRole: settingsStore.config.currentRole || "Owner",
            action: action,
            targetEntity: targetEntity,
            details: details
        };

        const colRef = getAuditLogsColRef();
        const docRef = await addDoc(colRef, logEntry);
        logEntry.id = docRef.id;
        
        settingsStore.auditLogs.unshift(logEntry);
        if (settingsStore.auditLogs.length > 100) settingsStore.auditLogs.pop();
        settingsStore.notify();
        renderAuditLogsTable();
    } catch (err) {
        console.warn("Could not write audit log to Firestore:", err);
        // In-memory fallback
        settingsStore.auditLogs.unshift({
            id: 'local_' + Date.now(),
            timestamp: new Date().toISOString(),
            userId: "current_user",
            userName: settingsStore.config.doctorName || "Dr. Ahmed",
            userRole: settingsStore.config.currentRole || "Owner",
            action,
            targetEntity,
            details
        });
        settingsStore.notify();
        renderAuditLogsTable();
    }
}

async function loadAuditLogs() {
    try {
        const snap = await getDocs(getAuditLogsColRef());
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        settingsStore.auditLogs = list.slice(0, 50);
    } catch (e) {
        settingsStore.auditLogs = [];
    }
}

// ==========================================
// 4. SETTINGS MUTATION METHODS
// ==========================================
export async function saveGlobalConfig(newPartialConfig) {
    if (!settingsStore.hasPermission("EDIT_GLOBAL_SETTINGS")) {
        if (window.showToast) window.showToast("Permission denied / ليس لديك صلاحية تعديل الإعدادات العامة", "error");
        return false;
    }

    try {
        const merged = {
            ...settingsStore.config,
            ...newPartialConfig,
            updatedAt: new Date().toISOString()
        };

        const oldVal = { ...settingsStore.config };
        await setDoc(getClinicDocRef(), merged);
        settingsStore.config = merged;
        settingsStore.notify();

        await logAuditEvent("CLINIC_CONFIG_UPDATED", "clinic_settings/config", {
            updatedFields: Object.keys(newPartialConfig),
            newConfig: newPartialConfig
        });

        if (window.showToast) window.showToast("تم حفظ الإعدادات بنجاح / Settings saved", "success");
        return true;
    } catch (err) {
        console.error("Save config error:", err);
        if (window.showToast) window.showToast("حدث خطأ أثناء حفظ الإعدادات", "error");
        return false;
    }
}

export async function saveService(serviceData) {
    if (serviceData.id) {
        // Editing existing
        const existing = settingsStore.services.find(s => s.id === serviceData.id);
        const isPriceChanged = existing && parseFloat(existing.currentPrice) !== parseFloat(serviceData.currentPrice);
        
        if (isPriceChanged && !settingsStore.hasPermission("EDIT_SERVICE_PRICE")) {
            if (window.showToast) window.showToast("ليس لديك صلاحية تعديل أسعار الخدمات الطبية", "error");
            return false;
        }

        const priceHistory = existing?.priceHistory ? [...existing.priceHistory] : [];
        if (isPriceChanged) {
            priceHistory.push({
                price: parseFloat(serviceData.currentPrice),
                currency: serviceData.currency || settingsStore.getCurrencySymbol(),
                effectiveDate: new Date().toISOString().split('T')[0],
                updatedBy: settingsStore.config.doctorName || "Admin"
            });
        }

        const updatedService = {
            ...existing,
            ...serviceData,
            priceHistory,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(getServicesColRef(), serviceData.id), updatedService);
        const idx = settingsStore.services.findIndex(s => s.id === serviceData.id);
        if (idx !== -1) settingsStore.services[idx] = updatedService;
        
        await logAuditEvent(isPriceChanged ? "PRICE_UPDATED" : "SERVICE_UPDATED", serviceData.nameEn || serviceData.nameAr, {
            serviceId: serviceData.id,
            oldPrice: existing?.currentPrice,
            newPrice: serviceData.currentPrice,
            category: serviceData.category
        });
    } else {
        // Adding new
        const newId = "srv_" + Date.now();
        const newService = {
            ...serviceData,
            id: newId,
            isActive: true,
            priceHistory: [{
                price: parseFloat(serviceData.currentPrice),
                currency: serviceData.currency || settingsStore.getCurrencySymbol(),
                effectiveDate: new Date().toISOString().split('T')[0],
                updatedBy: settingsStore.config.doctorName || "Admin"
            }],
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(getServicesColRef(), newId), newService);
        settingsStore.services.push(newService);

        await logAuditEvent("SERVICE_ADDED", newService.nameEn || newService.nameAr, {
            serviceId: newId,
            price: newService.currentPrice,
            category: newService.category
        });
    }

    settingsStore.notify();
    updateDynamicUI();
    if (window.showToast) window.showToast("تم حفظ الخدمة بنجاح / Service saved", "success");
    return true;
}

export async function deleteService(serviceId) {
    if (!settingsStore.hasPermission("EDIT_GLOBAL_SETTINGS")) {
        if (window.showToast) window.showToast("ليس لديك صلاحية حذف الخدمات الطبية", "error");
        return false;
    }

    const srv = settingsStore.services.find(s => s.id === serviceId);
    if (!srv) return false;

    await deleteDoc(doc(getServicesColRef(), serviceId));
    settingsStore.services = settingsStore.services.filter(s => s.id !== serviceId);
    
    await logAuditEvent("SERVICE_DELETED", srv.nameEn || srv.nameAr, { serviceId });
    settingsStore.notify();
    updateDynamicUI();
    if (window.showToast) window.showToast("تم حذف الخدمة / Service removed", "success");
    return true;
}

export async function saveMedication(medData) {
    if (medData.id) {
        const existing = settingsStore.medications.find(m => m.id === medData.id);
        const updatedMed = {
            ...existing,
            ...medData,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(getMedsColRef(), medData.id), updatedMed);
        const idx = settingsStore.medications.findIndex(m => m.id === medData.id);
        if (idx !== -1) settingsStore.medications[idx] = updatedMed;

        await logAuditEvent("MEDICATION_UPDATED", medData.name, {
            medicationId: medData.id,
            category: medData.category
        });
    } else {
        const newId = "med_" + Date.now();
        const newMed = {
            ...medData,
            id: newId,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(getMedsColRef(), newId), newMed);
        settingsStore.medications.push(newMed);

        await logAuditEvent("MEDICATION_ADDED", newMed.name, {
            medicationId: newId,
            category: newMed.category
        });
    }

    settingsStore.notify();
    updateDynamicUI();
    if (window.showToast) window.showToast("تم حفظ الدواء بنجاح / Medication template saved", "success");
    return true;
}

export async function deleteMedication(medId) {
    const med = settingsStore.medications.find(m => m.id === medId);
    if (!med) return false;

    await deleteDoc(doc(getMedsColRef(), medId));
    settingsStore.medications = settingsStore.medications.filter(m => m.id !== medId);

    await logAuditEvent("MEDICATION_DELETED", med.name, { medicationId: medId });
    settingsStore.notify();
    updateDynamicUI();
    if (window.showToast) window.showToast("تم حذف الدواء / Medication removed", "success");
    return true;
}

// ==========================================
// 5. DYNAMIC UI SYNCHRONIZATION
// ==========================================
export function updateDynamicUI() {
    renderServicesTable();
    renderMedicationsTable();
    renderFinancialSettingsForm();
    renderClinicBrandingForm();
    renderAuditLogsTable();

    // 1. Synchronize Treatment Modal quick procedure templates
    syncTreatmentModalTemplates();

    // 2. Synchronize Prescription Modal quick medication buttons & allergy checks
    syncPrescriptionModalTemplates();

    // 3. Synchronize Currency Displays across headers
    syncCurrencyDisplays();
}

function syncTreatmentModalTemplates() {
    const container = document.getElementById('quickTreatmentButtonsContainer') || 
                      document.querySelector('#treatmentType')?.parentElement?.querySelector('div[style*="display: flex; gap:"]');
    
    const activeServices = (settingsStore.services || []).filter(s => s.isActive !== false);
    const isAr = document.documentElement.getAttribute('dir') === 'rtl';

    if (container) {
        let html = `<span style="font-size: 0.75rem; color: var(--text-muted); width: 100%;" data-ar="إجراءات شائعة من جدول الخدمات:" data-en="Quick procedure templates:">${isAr ? 'إجراءات شائعة من جدول الخدمات:' : 'Quick procedure templates:'}</span>`;
        
        activeServices.slice(0, 10).forEach(s => {
            const displayName = isAr ? (s.nameAr || s.nameEn) : (s.nameEn || s.nameAr);
            const price = parseFloat(s.currentPrice) || 0;
            html += `<button type="button" class="btn-outline quick-fill-btn dynamic-service-btn" style="padding: 2px 7px; font-size: 0.75rem; border-radius: 6px; transition: all 0.2s;" data-val="${s.nameEn || s.nameAr}" data-cost="${price}" data-ar="${s.nameAr || s.nameEn}" data-en="${s.nameEn || s.nameAr}" title="${settingsStore.formatCurrency(price)}">${displayName} (${price})</button>`;
        });

        container.innerHTML = html;

        // Attach click handlers
        container.querySelectorAll('.dynamic-service-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.getAttribute('data-val') || btn.innerText;
                const cost = parseFloat(btn.getAttribute('data-cost')) || 0;
                setTreatmentProcedure(val, cost);
            };
        });
    }

    // Also sync visit modal quick procedure templates
    syncVisitModalTemplates(activeServices, isAr);

    // Refresh percentage chips based on clinic settings
    syncPercentageAdjustmentChips();
}

function syncVisitModalTemplates(activeServices, isAr) {
    const visitProcContainer = document.getElementById('quickVisitProcedureButtons');
    if (visitProcContainer) {
        let html = '';
        activeServices.slice(0, 6).forEach(s => {
            const displayName = isAr ? (s.nameAr || s.nameEn) : (s.nameEn || s.nameAr);
            const price = parseFloat(s.currentPrice) || 0;
            html += `<button type="button" class="btn-outline quick-visit-proc-btn" style="padding: 2px 7px; font-size: 0.75rem;" data-val="${s.nameEn || s.nameAr}" data-cost="${price}">${displayName} (${price})</button>`;
        });
        visitProcContainer.innerHTML = html;

        visitProcContainer.querySelectorAll('.quick-visit-proc-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.getAttribute('data-val') || btn.innerText;
                const cost = parseFloat(btn.getAttribute('data-cost')) || 0;
                setVisitProcedure(val, cost);
            };
        });
    }
}

// -----------------------------------------------------------------
// Interactive Percentage Adjustment Logic for Treatments & Visits
// -----------------------------------------------------------------

export function setTreatmentProcedure(procName, basePrice) {
    const typeInput = document.getElementById('treatmentType');
    const baseInput = document.getElementById('treatmentBasePrice');
    const catalogBadge = document.getElementById('treatmentCatalogPriceBadge');
    const costInput = document.getElementById('treatmentCost');

    if (typeInput) typeInput.value = procName;
    if (baseInput) baseInput.value = basePrice;
    
    if (catalogBadge) {
        catalogBadge.style.display = 'inline-block';
        catalogBadge.innerText = `السعر بالكتالوج: ${settingsStore.formatCurrency(basePrice)}`;
    }

    // Reset to 0% standard or current custom percentage
    const activeChip = document.querySelector('#treatmentPercentChips .treatment-pct-chip.active');
    const currentPct = activeChip ? parseFloat(activeChip.getAttribute('data-pct') || '0') : 0;
    
    applyTreatmentPercentage(currentPct, basePrice);
}
window.setTreatmentProcedure = setTreatmentProcedure;

export function applyTreatmentPercentage(pct, optionalBasePrice = null) {
    const baseInput = document.getElementById('treatmentBasePrice');
    const costInput = document.getElementById('treatmentCost');
    const pctInput = document.getElementById('treatmentDiscountPercent');
    const customPctInput = document.getElementById('treatmentCustomPctInput');
    const baseEl = document.getElementById('treatmentCalcBasePrice');
    const modEl = document.getElementById('treatmentCalcModBadge');
    const finalEl = document.getElementById('treatmentCalcFinalPrice');

    let base = optionalBasePrice !== null ? optionalBasePrice : (parseFloat(baseInput?.value) || parseFloat(costInput?.value) || 0);
    if (baseInput) baseInput.value = base;

    const percentage = parseFloat(pct) || 0;
    if (pctInput) pctInput.value = percentage;

    const modAmount = Math.round(base * (percentage / 100));
    let finalCost = Math.max(0, base + modAmount);

    if (costInput) costInput.value = finalCost;

    const isAr = document.documentElement.getAttribute('dir') === 'rtl';

    if (baseEl) baseEl.innerText = settingsStore.formatCurrency(base);
    if (modEl) {
        if (percentage === 0) {
            modEl.innerText = isAr ? '0% (بدون تعديل)' : '0% (Standard)';
            modEl.style.color = 'var(--text-primary)';
        } else if (percentage < 0) {
            modEl.innerText = `${percentage}% (${settingsStore.formatCurrency(modAmount)})`;
            modEl.style.color = 'var(--status-completed)';
        } else {
            modEl.innerText = `+${percentage}% (+${settingsStore.formatCurrency(modAmount)})`;
            modEl.style.color = 'var(--brand-primary)';
        }
    }
    if (finalEl) finalEl.innerText = settingsStore.formatCurrency(finalCost);

    // Highlight matching chip
    document.querySelectorAll('#treatmentPercentChips .treatment-pct-chip').forEach(chip => {
        const chipPct = parseFloat(chip.getAttribute('data-pct'));
        if (chipPct === percentage) {
            chip.classList.add('active');
            chip.style.background = 'var(--brand-primary)';
            chip.style.color = '#fff';
        } else {
            chip.classList.remove('active');
            chip.style.background = 'transparent';
            chip.style.color = 'var(--text-primary)';
        }
    });

    if (customPctInput && percentage !== 0) {
        customPctInput.value = percentage;
    }
}
window.applyTreatmentPercentage = applyTreatmentPercentage;

export function setVisitProcedure(procName, basePrice) {
    const typeInput = document.getElementById('visitProcedureType');
    const baseInput = document.getElementById('visitProcedureBasePrice');
    const finalInput = document.getElementById('visitProcedureFinalCost');
    const catalogBadge = document.getElementById('visitBaseCatalogPriceBadge');

    if (typeInput) typeInput.value = procName;
    if (baseInput) baseInput.value = basePrice;
    
    if (catalogBadge) {
        catalogBadge.innerText = `الأساسي: ${settingsStore.formatCurrency(basePrice)}`;
    }

    applyVisitPercentage(0, basePrice);
}
window.setVisitProcedure = setVisitProcedure;

export function applyVisitPercentage(pct, optionalBasePrice = null) {
    const baseInput = document.getElementById('visitProcedureBasePrice');
    const finalInput = document.getElementById('visitProcedureFinalCost');
    const pctInput = document.getElementById('visitProcedureDiscountPercent');
    const customPctInput = document.getElementById('visitCustomPctInput');
    const calcBase = document.getElementById('visitCalcBase');
    const calcMod = document.getElementById('visitCalcMod');
    const calcFinal = document.getElementById('visitCalcFinal');

    let base = optionalBasePrice !== null ? optionalBasePrice : (parseFloat(baseInput?.value) || parseFloat(finalInput?.value) || 0);
    if (baseInput) baseInput.value = base;

    const percentage = parseFloat(pct) || 0;
    if (pctInput) pctInput.value = percentage;

    const modAmount = Math.round(base * (percentage / 100));
    let finalCost = Math.max(0, base + modAmount);

    if (finalInput) finalInput.value = finalCost;

    if (calcBase) calcBase.innerText = settingsStore.formatCurrency(base);
    if (calcMod) {
        calcMod.innerText = percentage !== 0 ? `${percentage > 0 ? '+' : ''}${percentage}% (${settingsStore.formatCurrency(modAmount)})` : '0%';
        calcMod.style.color = percentage < 0 ? 'var(--status-completed)' : (percentage > 0 ? 'var(--brand-primary)' : 'var(--text-primary)');
    }
    if (calcFinal) calcFinal.innerText = settingsStore.formatCurrency(finalCost);

    // Highlight matching chip
    document.querySelectorAll('#visitPercentChips .visit-pct-chip').forEach(chip => {
        const chipPct = parseFloat(chip.getAttribute('data-pct'));
        if (chipPct === percentage) {
            chip.classList.add('active');
            chip.style.background = 'var(--brand-primary)';
            chip.style.color = '#fff';
        } else {
            chip.classList.remove('active');
            chip.style.background = 'transparent';
            chip.style.color = 'var(--text-primary)';
        }
    });

    if (customPctInput && percentage !== 0) {
        customPctInput.value = percentage;
    }
}
window.applyVisitPercentage = applyVisitPercentage;

function syncPercentageAdjustmentChips() {
    const rawPresets = settingsStore.config?.financial?.discountPresets || [5, 10, 15, 20, 25, 30, 50];
    const isDoctorAllowed = settingsStore.config?.clinicalRules?.allowDentistPriceEdit !== false;

    // Show/hide percentage price adjustment section if doctor modification is allowed
    const adjustSection = document.getElementById('treatmentPriceAdjustSection');
    if (adjustSection) {
        adjustSection.style.display = isDoctorAllowed ? 'block' : 'none';
    }

    // Populate treatment percentage chips
    const treatmentChipsContainer = document.getElementById('treatmentPercentChips');
    if (treatmentChipsContainer && isDoctorAllowed) {
        let chipsHtml = `
            <button type="button" class="btn-outline treatment-pct-chip active" data-pct="0" style="padding: 3px 8px; font-size: 0.78rem; font-weight: 600;">0% (الأساسي)</button>
        `;
        rawPresets.forEach(p => {
            chipsHtml += `<button type="button" class="btn-outline treatment-pct-chip" data-pct="-${p}" style="padding: 3px 8px; font-size: 0.78rem; color: var(--status-completed); border-color: rgba(34, 197, 94, 0.3); font-weight: 600;">-${p}%</button>`;
        });
        chipsHtml += `
            <button type="button" class="btn-outline treatment-pct-chip" data-pct="10" style="padding: 3px 8px; font-size: 0.78rem; color: var(--brand-primary); border-color: rgba(45, 212, 191, 0.3); font-weight: 600;">+10%</button>
            <button type="button" class="btn-outline treatment-pct-chip" data-pct="20" style="padding: 3px 8px; font-size: 0.78rem; color: var(--brand-primary); border-color: rgba(45, 212, 191, 0.3); font-weight: 600;">+20%</button>
            <button type="button" class="btn-outline treatment-pct-chip" data-pct="-100" style="padding: 3px 8px; font-size: 0.78rem; color: var(--status-error); border-color: rgba(239, 68, 68, 0.3); font-weight: 600;">-100% (مجاناً)</button>
        `;
        treatmentChipsContainer.innerHTML = chipsHtml;

        treatmentChipsContainer.querySelectorAll('.treatment-pct-chip').forEach(btn => {
            btn.onclick = () => {
                const pct = parseFloat(btn.getAttribute('data-pct') || '0');
                applyTreatmentPercentage(pct);
            };
        });
    }

    // Populate visit percentage chips
    const visitChipsContainer = document.getElementById('visitPercentChips');
    if (visitChipsContainer && isDoctorAllowed) {
        let chipsHtml = `
            <button type="button" class="btn-outline visit-pct-chip active" data-pct="0" style="padding: 2px 7px; font-size: 0.75rem; font-weight: 600;">0% (الأساسي)</button>
        `;
        rawPresets.forEach(p => {
            chipsHtml += `<button type="button" class="btn-outline visit-pct-chip" data-pct="-${p}" style="padding: 2px 7px; font-size: 0.75rem; color: var(--status-completed); border-color: rgba(34, 197, 94, 0.3); font-weight: 600;">-${p}%</button>`;
        });
        chipsHtml += `
            <button type="button" class="btn-outline visit-pct-chip" data-pct="10" style="padding: 2px 7px; font-size: 0.75rem; color: var(--brand-primary); border-color: rgba(45, 212, 191, 0.3); font-weight: 600;">+10%</button>
            <button type="button" class="btn-outline visit-pct-chip" data-pct="20" style="padding: 2px 7px; font-size: 0.75rem; color: var(--brand-primary); border-color: rgba(45, 212, 191, 0.3); font-weight: 600;">+20%</button>
        `;
        visitChipsContainer.innerHTML = chipsHtml;

        visitChipsContainer.querySelectorAll('.visit-pct-chip').forEach(btn => {
            btn.onclick = () => {
                const pct = parseFloat(btn.getAttribute('data-pct') || '0');
                applyVisitPercentage(pct);
            };
        });
    }

    // Bind custom percentage input listeners
    const customPctInput = document.getElementById('treatmentCustomPctInput');
    if (customPctInput) {
        customPctInput.oninput = () => {
            const val = parseFloat(customPctInput.value);
            if (!isNaN(val)) applyTreatmentPercentage(val);
        };
    }

    const visitCustomPctInput = document.getElementById('visitCustomPctInput');
    if (visitCustomPctInput) {
        visitCustomPctInput.oninput = () => {
            const val = parseFloat(visitCustomPctInput.value);
            if (!isNaN(val)) applyVisitPercentage(val);
        };
    }

    // Two-way sync: when doctor edits final cost directly, recalculate implied percentage
    const treatmentCostInput = document.getElementById('treatmentCost');
    if (treatmentCostInput) {
        treatmentCostInput.oninput = () => {
            const base = parseFloat(document.getElementById('treatmentBasePrice')?.value) || 0;
            const finalVal = parseFloat(treatmentCostInput.value) || 0;
            if (base > 0) {
                const impliedPct = Math.round(((finalVal - base) / base) * 100);
                const pctInput = document.getElementById('treatmentDiscountPercent');
                if (pctInput) pctInput.value = impliedPct;
                const modEl = document.getElementById('treatmentCalcModBadge');
                if (modEl) modEl.innerText = `${impliedPct > 0 ? '+' : ''}${impliedPct}% (${settingsStore.formatCurrency(finalVal - base)})`;
                const finalEl = document.getElementById('treatmentCalcFinalPrice');
                if (finalEl) finalEl.innerText = settingsStore.formatCurrency(finalVal);
            }
        };
    }

    const visitFinalCostInput = document.getElementById('visitProcedureFinalCost');
    if (visitFinalCostInput) {
        visitFinalCostInput.oninput = () => {
            const base = parseFloat(document.getElementById('visitProcedureBasePrice')?.value) || 0;
            const finalVal = parseFloat(visitFinalCostInput.value) || 0;
            if (base > 0) {
                const impliedPct = Math.round(((finalVal - base) / base) * 100);
                const pctInput = document.getElementById('visitProcedureDiscountPercent');
                if (pctInput) pctInput.value = impliedPct;
                const calcMod = document.getElementById('visitCalcMod');
                if (calcMod) calcMod.innerText = `${impliedPct > 0 ? '+' : ''}${impliedPct}% (${settingsStore.formatCurrency(finalVal - base)})`;
                const calcFinal = document.getElementById('visitCalcFinal');
                if (calcFinal) calcFinal.innerText = settingsStore.formatCurrency(finalVal);
            }
        };
    }

    // Visit procedure toggle show/hide
    const visitToggle = document.getElementById('visitIncludeTreatmentToggle');
    const visitProcSection = document.getElementById('visitProcedureSection');
    if (visitToggle && visitProcSection) {
        visitToggle.onchange = () => {
            visitProcSection.style.display = visitToggle.checked ? 'block' : 'none';
        };
    }
}

function syncPrescriptionModalTemplates() {
    const container = document.querySelector('#prescriptionModal .quick-med-templates-container') ||
                      document.querySelector('#prescMeds')?.parentElement?.querySelector('div[style*="display: flex; gap:"]');
    
    if (!container) return;

    const activeMeds = settingsStore.medications.filter(m => m.isActive !== false);
    const isAr = document.documentElement.getAttribute('dir') === 'rtl';

    let html = `<span style="font-size: 0.75rem; color: var(--text-muted); width: 100%;" data-ar="أدوية شائعة بنقرة واحدة (من الإعدادات):" data-en="Quick common meds (From Settings):">${isAr ? 'أدوية شائعة بنقرة واحدة (من الإعدادات):' : 'Quick common meds (From Settings):'}</span>`;
    
    activeMeds.slice(0, 8).forEach(m => {
        const shortLabel = m.name.split('(')[0].trim();
        const formattedMedString = `${m.name} [${m.dosageStrength}] - ${isAr ? m.instructionsAr : m.instructionsEn} (${m.duration})`;
        const contraindications = JSON.stringify(m.contraindications || []);

        html += `<button type="button" class="btn-outline quick-med-btn dynamic-med-btn" style="padding: 3px 8px; font-size: 0.78rem; border-radius: 6px; transition: all 0.2s;" data-med="${formattedMedString.replace(/"/g, '&quot;')}" data-name="${m.name}" data-contraindications='${contraindications}'>💊 ${shortLabel}</button>`;
    });

    container.innerHTML = html;

    // Attach allergy-aware click handlers
    container.querySelectorAll('.dynamic-med-btn').forEach(btn => {
        btn.onclick = () => {
            const medText = btn.getAttribute('data-med');
            const medName = btn.getAttribute('data-name');
            let contraindications = [];
            try {
                contraindications = JSON.parse(btn.getAttribute('data-contraindications') || '[]');
            } catch(e) {}

            checkAllergyAndInsertMedication(medText, medName, contraindications);
        };
    });
}

// Check allergy safety and doctor override
export function checkAllergyAndInsertMedication(medText, medName, contraindications = []) {
    const patientAlertsEl = document.getElementById('profileMedicalAlerts');
    const patientAlertsText = (patientAlertsEl?.innerText || '').toLowerCase();
    
    const conflicts = contraindications.filter(c => patientAlertsText.includes(c.toLowerCase()));
    const enableAllergyWarning = settingsStore.config?.clinicalRules?.enableAllergyWarning ?? true;

    if (enableAllergyWarning && conflicts.length > 0) {
        // Trigger Safety Alert Interception Modal
        openAllergyOverrideModal(medText, medName, conflicts);
    } else {
        // Safe to insert directly
        insertMedicationIntoTextarea(medText);
    }
}

function insertMedicationIntoTextarea(medText) {
    const textarea = document.getElementById('prescMeds');
    if (!textarea) return;
    if (textarea.value.trim() === '') {
        textarea.value = medText;
    } else {
        textarea.value += '\n' + medText;
    }
    if (window.showToast) window.showToast("تمت إضافة الدواء إلى الروشتة / Medication added", "info");
}

function openAllergyOverrideModal(medText, medName, conflicts) {
    const modal = document.getElementById('allergyOverrideModal');
    if (!modal) {
        // Fallback alert with confirmation
        const reason = prompt(`⚠️ تحذير طبي: المريض يعاني من (${conflicts.join(', ')}). هل أنت متأكد من وصف ${medName}؟ يرجى إدخال سبب التجاوز:`);
        if (reason) {
            insertMedicationIntoTextarea(medText);
            logAuditEvent("ALLERGY_OVERRIDE", medName, {
                patientId: window.currentProfilePatientId || "unknown",
                conflicts: conflicts,
                doctorReason: reason
            });
        }
        return;
    }

    const warningText = document.getElementById('allergyWarningDetails');
    if (warningText) {
        warningText.innerHTML = `⚠️ تنبيه حرج: يحتوي <strong>${medName}</strong> على مواد تتعارض مع تحذيرات المريض الطبية: <span style="color: var(--status-error); font-weight: bold;">[${conflicts.join(', ')}]</span>`;
    }

    modal.classList.add('show');

    const confirmBtn = document.getElementById('confirmAllergyOverrideBtn');
    const cancelBtn = document.getElementById('cancelAllergyOverrideBtn');
    const reasonInput = document.getElementById('allergyOverrideReason');

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            const reason = (reasonInput?.value || '').trim();
            if (!reason) {
                if (window.showToast) window.showToast("يرجى كتابة سبب التجاوز الطبي للمتابعة", "error");
                return;
            }

            modal.classList.remove('show');
            insertMedicationIntoTextarea(medText);
            
            await logAuditEvent("ALLERGY_OVERRIDE", medName, {
                patientId: window.currentProfilePatientId || "unknown",
                conflicts: conflicts,
                doctorReason: reason
            });

            if (reasonInput) reasonInput.value = '';
            if (window.showToast) window.showToast("تم تسجيل التجاوز الطبي وإضافة الدواء بنجاح", "warning");
        };
    }

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modal.classList.remove('show');
            if (reasonInput) reasonInput.value = '';
        };
    }
}

function syncCurrencyDisplays() {
    const symbol = settingsStore.getCurrencySymbol();
    document.querySelectorAll('.currency-symbol-label').forEach(el => {
        el.innerText = symbol;
    });
}

// ==========================================
// 6. FILTER STATE & RENDER SETTINGS VIEWS
// ==========================================
let servicesSearchQuery = '';
let servicesFilterCategory = 'all';

let medsSearchQuery = '';
let medsFilterCategory = 'all';

let auditSearchQuery = '';
let auditFilterType = 'all';

export function updateServicePriceInline(serviceId, newPrice) {
    const srv = settingsStore.services.find(s => s.id === serviceId);
    if (!srv) return;
    const oldPrice = srv.currentPrice;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
        if (window.showToast) window.showToast("يرجى إدخال سعر صحيح", "error");
        return;
    }
    if (priceNum === oldPrice) return;

    srv.currentPrice = priceNum;
    if (!srv.priceHistory) srv.priceHistory = [];
    srv.priceHistory.push({
        price: priceNum,
        currency: srv.currency || settingsStore.config?.financial?.currencyCode || "EGP",
        effectiveDate: new Date().toISOString(),
        updatedBy: "Doctor"
    });

    // Save to Firestore in background
    setDoc(doc(getServicesColRef(), serviceId), srv, { merge: true }).catch(err => console.error(err));
    logAuditEvent("PRICE_UPDATED", srv.nameEn || srv.nameAr, {
        serviceId: serviceId,
        oldPrice: oldPrice,
        newPrice: priceNum
    });

    settingsStore.notify();
    updateDynamicUI();
    if (window.showToast) window.showToast(`تم تحديث سعر (${srv.nameAr || srv.nameEn}) إلى ${settingsStore.formatCurrency(priceNum)}`, "success");
}

function renderServicesTable() {
    const tbody = document.getElementById('settingsServicesTableBody');
    if (!tbody) return;

    const isAr = document.documentElement.getAttribute('dir') === 'rtl';
    let services = settingsStore.services;

    // Apply category filter
    if (servicesFilterCategory !== 'all') {
        services = services.filter(s => (s.category || '').toLowerCase() === servicesFilterCategory.toLowerCase());
    }

    // Apply search query
    if (servicesSearchQuery.trim() !== '') {
        const q = servicesSearchQuery.toLowerCase().trim();
        services = services.filter(s => 
            (s.nameAr || '').toLowerCase().includes(q) ||
            (s.nameEn || '').toLowerCase().includes(q) ||
            (s.code || '').toLowerCase().includes(q) ||
            (s.category || '').toLowerCase().includes(q)
        );
    }

    if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">${isAr ? 'لا توجد نتائج مطابقة للبحث أو الفئة' : 'No matching procedures found'}</td></tr>`;
        return;
    }

    let html = '';
    services.forEach(s => {
        const catLabel = s.category.toUpperCase();
        const priceFmt = settingsStore.formatCurrency(s.currentPrice);
        const nameDisplay = isAr ? (s.nameAr || s.nameEn) : (s.nameEn || s.nameAr);
        const secName = isAr ? s.nameEn : s.nameAr;
        const statusBadge = s.isActive !== false ? 
            `<span style="color: var(--status-completed); font-size: 0.8rem; font-weight: 600;">● ${isAr ? 'نشط' : 'Active'}</span>` : 
            `<span style="color: var(--text-muted); font-size: 0.8rem;">○ ${isAr ? 'معطل' : 'Inactive'}</span>`;

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="font-family: monospace; font-size: 0.85rem; color: var(--text-muted);">${s.code || '-'}</td>
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${nameDisplay}</div>
                    ${secName ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${secName}</div>` : ''}
                </td>
                <td><span style="background: rgba(56, 189, 248, 0.1); color: var(--brand-primary); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${catLabel}</span></td>
                <td>
                    <div class="inline-price-wrapper" style="display: flex; align-items: center; gap: 0.4rem;">
                        <span class="inline-price-badge" style="font-weight: 700; font-family: monospace; font-size: 0.95rem; color: var(--brand-primary); cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px dashed transparent; transition: all 0.2s;" title="${isAr ? 'انقر لتعديل السعر فوراً' : 'Click to quick-edit price'}" data-id="${s.id}">${priceFmt} ✏️</span>
                    </div>
                </td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${s.durationMinutes || 30} ${isAr ? 'دقيقة' : 'min'}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        <button type="button" class="btn-outline edit-service-btn" data-id="${s.id}" style="padding: 3px 8px; font-size: 0.75rem;">✏️ ${isAr ? 'تعديل' : 'Edit'}</button>
                        <button type="button" class="btn-outline delete-service-btn" data-id="${s.id}" style="padding: 3px 8px; font-size: 0.75rem; color: var(--status-error); border-color: rgba(239, 68, 68, 0.3);">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Attach inline quick-price click handlers
    tbody.querySelectorAll('.inline-price-badge').forEach(el => {
        el.onclick = () => {
            const id = el.getAttribute('data-id');
            const srv = settingsStore.services.find(s => s.id === id);
            if (!srv) return;
            const parent = el.parentElement;
            parent.innerHTML = `
                <div style="display: inline-flex; align-items: center; gap: 4px;">
                    <input type="number" class="inline-price-input" value="${srv.currentPrice}" style="width: 85px; padding: 2px 6px; font-size: 0.85rem; border-radius: 4px; border: 1px solid var(--brand-primary); background: var(--bg-primary); color: var(--text-primary); font-family: monospace;">
                    <button type="button" class="btn-primary inline-price-save-btn" style="padding: 2px 6px; font-size: 0.75rem; border-radius: 4px;">✓</button>
                    <button type="button" class="btn-secondary inline-price-cancel-btn" style="padding: 2px 6px; font-size: 0.75rem; border-radius: 4px;">✕</button>
                </div>
            `;
            const input = parent.querySelector('.inline-price-input');
            const saveBtn = parent.querySelector('.inline-price-save-btn');
            const cancelBtn = parent.querySelector('.inline-price-cancel-btn');
            input.focus();
            input.select();

            const doSave = () => {
                const val = input.value;
                updateServicePriceInline(id, val);
            };

            saveBtn.onclick = doSave;
            cancelBtn.onclick = () => renderServicesTable();
            input.onkeydown = (e) => {
                if (e.key === 'Enter') { e.preventDefault(); doSave(); }
                if (e.key === 'Escape') { e.preventDefault(); renderServicesTable(); }
            };
        };
    });

    // Attach modal buttons
    tbody.querySelectorAll('.edit-service-btn').forEach(b => {
        b.onclick = () => openServiceModal(b.getAttribute('data-id'));
    });
    tbody.querySelectorAll('.delete-service-btn').forEach(b => {
        b.onclick = async () => {
            const id = b.getAttribute('data-id');
            if (confirm(isAr ? 'هل أنت متأكد من حذف هذه الخدمة الطبية؟' : 'Are you sure you want to delete this service?')) {
                await deleteService(id);
            }
        };
    });
}

function renderMedicationsTable() {
    const tbody = document.getElementById('settingsMedsTableBody');
    if (!tbody) return;

    const isAr = document.documentElement.getAttribute('dir') === 'rtl';
    let meds = settingsStore.medications;

    // Apply category filter
    if (medsFilterCategory !== 'all') {
        meds = meds.filter(m => (m.category || '').toLowerCase() === medsFilterCategory.toLowerCase());
    }

    // Apply search query
    if (medsSearchQuery.trim() !== '') {
        const q = medsSearchQuery.toLowerCase().trim();
        meds = meds.filter(m => 
            (m.name || '').toLowerCase().includes(q) ||
            (m.dosageStrength || '').toLowerCase().includes(q) ||
            (m.category || '').toLowerCase().includes(q) ||
            (m.contraindications || []).some(c => c.toLowerCase().includes(q))
        );
    }

    if (meds.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">${isAr ? 'لا توجد أدوية مطابقة للبحث أو الفئة' : 'No matching medication templates found'}</td></tr>`;
        return;
    }

    let html = '';
    meds.forEach(m => {
        const contra = (m.contraindications || []).map(c => `<span style="background: rgba(239, 68, 68, 0.1); color: var(--status-error); padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-inline-end: 4px;">⚠️ ${c}</span>`).join('');

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td>
                    <div style="font-weight: 600; color: var(--text-primary);">💊 ${m.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${m.dosageStrength} · ${m.route}</div>
                </td>
                <td><span style="background: rgba(168, 85, 247, 0.1); color: #a855f7; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${m.category}</span></td>
                <td style="font-size: 0.85rem;">
                    <div>${isAr ? m.instructionsAr : m.instructionsEn}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${m.duration}</div>
                </td>
                <td>${contra || '<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>'}</td>
                <td>
                    <div style="display: flex; gap: 0.35rem;">
                        <button type="button" class="btn-outline edit-med-btn" data-id="${m.id}" style="padding: 3px 8px; font-size: 0.75rem;">✏️ ${isAr ? 'تعديل' : 'Edit'}</button>
                        <button type="button" class="btn-outline delete-med-btn" data-id="${m.id}" style="padding: 3px 8px; font-size: 0.75rem; color: var(--status-error); border-color: rgba(239, 68, 68, 0.3);">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('.edit-med-btn').forEach(b => {
        b.onclick = () => openMedicationModal(b.getAttribute('data-id'));
    });
    tbody.querySelectorAll('.delete-med-btn').forEach(b => {
        b.onclick = async () => {
            const id = b.getAttribute('data-id');
            if (confirm(isAr ? 'هل أنت متأكد من حذف هذا القالب الدوائي؟' : 'Are you sure you want to delete this medication template?')) {
                await deleteMedication(id);
            }
        };
    });
}

function renderFinancialSettingsForm() {
    const fin = settingsStore.config?.financial || DEFAULT_CLINIC_CONFIG.financial;
    
    const curSelect = document.getElementById('settingCurrencySelect');
    if (curSelect && curSelect.value !== fin.currencyCode) curSelect.value = fin.currencyCode;

    const curSymbol = document.getElementById('settingCurrencySymbol');
    if (curSymbol) curSymbol.value = fin.currencySymbol;

    const taxToggle = document.getElementById('settingTaxEnabled');
    if (taxToggle) taxToggle.checked = !!fin.taxEnabled;

    const taxRate = document.getElementById('settingTaxRate');
    if (taxRate) taxRate.value = fin.taxRatePercentage || 14;

    const taxNum = document.getElementById('settingTaxNumber');
    if (taxNum) taxNum.value = fin.taxRegistrationNumber || '';

    // Payment methods
    const pm = fin.paymentMethods || {};
    const pmCash = document.getElementById('settingPmCash') || document.getElementById('payMethodCash');
    const pmCard = document.getElementById('settingPmCard') || document.getElementById('payMethodCard');
    const pmInsta = document.getElementById('settingPmInstapay') || document.getElementById('payMethodInstapay');
    const pmVodafone = document.getElementById('settingPmVodafone');
    const pmBank = document.getElementById('settingPmBank');
    const pmInsur = document.getElementById('settingPmInsurance') || document.getElementById('payMethodInsurance');
    const pmInstallment = document.getElementById('settingPmInstallment');

    if (pmCash) pmCash.checked = pm.cash !== false;
    if (pmCard) pmCard.checked = pm.card !== false;
    if (pmInsta) pmInsta.checked = pm.instapay !== false;
    if (pmVodafone) pmVodafone.checked = pm.vodafoneCash !== false;
    if (pmBank) pmBank.checked = pm.bankTransfer !== false;
    if (pmInsur) pmInsur.checked = pm.insurance !== false;
    if (pmInstallment) pmInstallment.checked = pm.installment !== false;

    // Presets
    const presetsInput = document.getElementById('settingDiscountPresets') || document.getElementById('settingDiscounts');
    if (presetsInput) presetsInput.value = (fin.discountPresets || [5, 10, 15, 20, 25, 30, 50]).join(', ');

    // Doctor visit price modification toggle
    const dentistPriceToggle = document.getElementById('settingAllowDentistPriceEdit');
    if (dentistPriceToggle) {
        dentistPriceToggle.checked = settingsStore.config?.clinicalRules?.allowDentistPriceEdit !== false;
    }
}

function renderClinicBrandingForm() {
    const cfg = settingsStore.config || DEFAULT_CLINIC_CONFIG;
    
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('settingClinicName', cfg.clinicName);
    setVal('settingDoctorName', cfg.doctorName);
    setVal('settingCredentials', cfg.credentials);
    setVal('settingLicenseNumber', cfg.licenseNumber);
    setVal('settingPhone', cfg.phone);
    setVal('settingWhatsApp', cfg.phoneWhatsApp);
    setVal('settingEmail', cfg.email);
    setVal('settingAddress', cfg.address);
    setVal('settingInvoiceHeader', cfg.invoiceHeader);
    setVal('settingInvoiceFooter', cfg.invoiceFooter);

    // Clinical rules
    const cr = cfg.clinicalRules || {};
    const allergyToggle = document.getElementById('settingEnableAllergyWarning');
    const overrideToggle = document.getElementById('settingRequireOverrideReason');
    const sigToggle = document.getElementById('settingAutoSignature');
    const dentistPriceToggle = document.getElementById('settingAllowDentistPriceEdit');

    if (allergyToggle) allergyToggle.checked = cr.enableAllergyWarning !== false;
    if (overrideToggle) overrideToggle.checked = cr.requireOverrideReason !== false;
    if (sigToggle) sigToggle.checked = cr.autoSignatureOnPrescription !== false;
    if (dentistPriceToggle) dentistPriceToggle.checked = cr.allowDentistPriceEdit !== false;
}

function renderAuditLogsTable() {
    const tbody = document.getElementById('settingsAuditLogsTableBody');
    if (!tbody) return;

    const isAr = document.documentElement.getAttribute('dir') === 'rtl';
    let logs = settingsStore.auditLogs;

    // Apply action type filter
    if (auditFilterType !== 'all') {
        logs = logs.filter(l => (l.action || '').toUpperCase().includes(auditFilterType.toUpperCase()));
    }

    // Apply search query
    if (auditSearchQuery.trim() !== '') {
        const q = auditSearchQuery.toLowerCase().trim();
        logs = logs.filter(l => 
            (l.action || '').toLowerCase().includes(q) ||
            (l.targetEntity || '').toLowerCase().includes(q) ||
            (l.userName || '').toLowerCase().includes(q) ||
            JSON.stringify(l.details || {}).toLowerCase().includes(q)
        );
    }

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">${isAr ? 'لا توجد سجلات تتبع مطابقة' : 'No matching audit records'}</td></tr>`;
        return;
    }

    let html = '';
    logs.forEach(l => {
        const dt = new Date(l.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        let actionColor = "var(--brand-primary)";
        if (l.action.includes('PRICE') || l.action.includes('OVERRIDE')) actionColor = "var(--status-pending)";
        if (l.action.includes('DELETED')) actionColor = "var(--status-error)";
        if (l.action.includes('ADDED')) actionColor = "var(--status-completed)";

        const detailsSummary = l.details?.reason || l.details?.doctorReason || 
            (l.details?.newPrice ? `Price: ${l.details.oldPrice || 0} → ${l.details.newPrice}` : JSON.stringify(l.details || {}));

        html += `
            <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.85rem;">
                <td style="font-family: monospace; color: var(--text-muted); white-space: nowrap;">${dt}</td>
                <td>
                    <div style="font-weight: 600;">${l.userName || 'User'}</div>
                    <span style="font-size: 0.72rem; background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 3px;">${l.userRole || 'Admin'}</span>
                </td>
                <td><span style="color: ${actionColor}; font-weight: 600; font-family: monospace;">${l.action}</span></td>
                <td style="font-weight: 500;">${l.targetEntity}</td>
                <td style="color: var(--text-muted); font-size: 0.8rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${detailsSummary}">${detailsSummary}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ==========================================
// 7. MODALS CONTROLLERS
// ==========================================
export function openServiceModal(serviceId = null) {
    const modal = document.getElementById('serviceModal');
    const form = document.getElementById('serviceForm');
    const titleEl = document.getElementById('serviceModalTitle');
    if (!modal || !form) return;

    const isAr = document.documentElement.getAttribute('dir') === 'rtl';
    form.reset();
    document.getElementById('serviceId').value = '';

    if (serviceId) {
        const s = settingsStore.services.find(x => x.id === serviceId);
        if (s) {
            document.getElementById('serviceId').value = s.id;
            document.getElementById('serviceCode').value = s.code || '';
            document.getElementById('serviceNameAr').value = s.nameAr || '';
            document.getElementById('serviceNameEn').value = s.nameEn || '';
            document.getElementById('serviceCategory').value = s.category || 'general';
            document.getElementById('servicePrice').value = s.currentPrice || 0;
            document.getElementById('serviceDuration').value = s.durationMinutes || 30;
            document.getElementById('serviceIsActive').checked = s.isActive !== false;

            if (titleEl) {
                titleEl.innerText = isAr ? `✏️ تعديل خدمة: ${s.nameAr || s.nameEn}` : `✏️ Edit Service: ${s.nameEn || s.nameAr}`;
            }
        }
    } else {
        if (titleEl) {
            titleEl.innerText = isAr ? '🩺 إضافة خدمة طبية جديدة' : '🩺 Add New Clinical Service';
        }
        document.getElementById('serviceDuration').value = 30;
        document.getElementById('serviceIsActive').checked = true;
    }

    modal.classList.add('show');
}

export function openMedicationModal(medId = null) {
    const modal = document.getElementById('medicationModal');
    const form = document.getElementById('medicationForm');
    const titleEl = document.getElementById('medicationModalTitle');
    if (!modal || !form) return;

    const isAr = document.documentElement.getAttribute('dir') === 'rtl';
    form.reset();
    document.getElementById('medicationId').value = '';

    if (medId) {
        const m = settingsStore.medications.find(x => x.id === medId);
        if (m) {
            document.getElementById('medicationId').value = m.id;
            document.getElementById('medName').value = m.name || '';
            document.getElementById('medDosage').value = m.dosageStrength || '';
            document.getElementById('medRoute').value = m.route || 'Oral';
            document.getElementById('medCategory').value = m.category || 'Antibiotic';
            document.getElementById('medFrequency').value = m.frequency || '';
            document.getElementById('medDuration').value = m.duration || '';
            document.getElementById('medInstructionsAr').value = m.instructionsAr || '';
            document.getElementById('medInstructionsEn').value = m.instructionsEn || '';
            document.getElementById('medContraindications').value = (m.contraindications || []).join(', ');

            if (titleEl) {
                titleEl.innerText = isAr ? `✏️ تعديل قالب دواء: ${m.name}` : `✏️ Edit Medication: ${m.name}`;
            }
        }
    } else {
        if (titleEl) {
            titleEl.innerText = isAr ? '💊 إضافة قالب دواء جديد' : '💊 Add New Medication Template';
        }
    }

    modal.classList.add('show');
}

// Close all active modals helper
export function closeAllActiveModals() {
    document.querySelectorAll('.modal.show, .modal[style*="display: block"]').forEach(m => {
        m.classList.remove('show');
        if (m.style.display === 'block') m.style.display = 'none';
    });
}

// ==========================================
// 8. INITIALIZE DOM LISTENERS & FAST CONTROLLERS
// ==========================================
export function setupSettingsUIEventListeners() {
    // 1. Settings Sub-Tabs Navigation
    const tabBtns = document.querySelectorAll('.settings-nav-tab');
    const tabPanes = document.querySelectorAll('.settings-tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.style.display = 'none');

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.style.display = 'block';
        });
    });

    // 2. Services Live Search & Filter Chips
    const srvSearch = document.getElementById('servicesSearchInput');
    if (srvSearch) {
        srvSearch.addEventListener('input', (e) => {
            servicesSearchQuery = e.target.value;
            renderServicesTable();
        });
    }

    const srvChips = document.querySelectorAll('#servicesCategoryChips .chip');
    srvChips.forEach(chip => {
        chip.addEventListener('click', () => {
            srvChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            servicesFilterCategory = chip.getAttribute('data-filter') || 'all';
            renderServicesTable();
        });
    });

    // 3. Medications Live Search & Filter Chips
    const medSearch = document.getElementById('medicationsSearchInput');
    if (medSearch) {
        medSearch.addEventListener('input', (e) => {
            medsSearchQuery = e.target.value;
            renderMedicationsTable();
        });
    }

    const medChips = document.querySelectorAll('#medsCategoryChips .chip');
    medChips.forEach(chip => {
        chip.addEventListener('click', () => {
            medChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            medsFilterCategory = chip.getAttribute('data-filter') || 'all';
            renderMedicationsTable();
        });
    });

    // 4. Audit Trail Live Search & Filter Chips
    const auditSearch = document.getElementById('auditSearchInput');
    if (auditSearch) {
        auditSearch.addEventListener('input', (e) => {
            auditSearchQuery = e.target.value;
            renderAuditLogsTable();
        });
    }

    const auditChips = document.querySelectorAll('#auditTypeChips .chip');
    auditChips.forEach(chip => {
        chip.addEventListener('click', () => {
            auditChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            auditFilterType = chip.getAttribute('data-filter') || 'all';
            renderAuditLogsTable();
        });
    });

    // 5. Add Service & Add Medication Buttons
    const addSrvBtn = document.getElementById('btnAddNewService');
    if (addSrvBtn) addSrvBtn.onclick = () => openServiceModal();

    const addMedBtn = document.getElementById('btnAddNewMedication');
    if (addMedBtn) addMedBtn.onclick = () => openMedicationModal();

    // 6. Fast Auto-Save on Toggle Switches
    const autoSaveSwitches = [
        'settingAllowDentistPriceEdit',
        'settingEnableAllergyWarning',
        'settingRequireOverrideReason',
        'settingAutoSignature',
        'settingTaxEnabled',
        'payMethodCash',
        'payMethodCard',
        'payMethodInstapay',
        'payMethodInsurance'
    ];

    autoSaveSwitches.forEach(switchId => {
        const el = document.getElementById(switchId);
        if (el) {
            el.addEventListener('change', async () => {
                // Update config object
                if (switchId === 'settingAllowDentistPriceEdit' || switchId === 'settingEnableAllergyWarning' || switchId === 'settingRequireOverrideReason' || switchId === 'settingAutoSignature') {
                    if (!settingsStore.config.clinicalRules) settingsStore.config.clinicalRules = {};
                    settingsStore.config.clinicalRules.allowDentistPriceEdit = document.getElementById('settingAllowDentistPriceEdit')?.checked ?? true;
                    settingsStore.config.clinicalRules.enableAllergyWarning = document.getElementById('settingEnableAllergyWarning')?.checked ?? true;
                    settingsStore.config.clinicalRules.requireOverrideReason = document.getElementById('settingRequireOverrideReason')?.checked ?? true;
                    settingsStore.config.clinicalRules.autoSignatureOnPrescription = document.getElementById('settingAutoSignature')?.checked ?? true;
                    await saveGlobalConfig({ clinicalRules: settingsStore.config.clinicalRules });
                } else {
                    if (!settingsStore.config.financial) settingsStore.config.financial = { ...DEFAULT_CLINIC_CONFIG.financial };
                    settingsStore.config.financial.taxEnabled = document.getElementById('settingTaxEnabled')?.checked ?? false;
                    settingsStore.config.financial.paymentMethods = {
                        cash: document.getElementById('payMethodCash')?.checked ?? true,
                        card: document.getElementById('payMethodCard')?.checked ?? true,
                        instapay: document.getElementById('payMethodInstapay')?.checked ?? true,
                        insurance: document.getElementById('payMethodInsurance')?.checked ?? false
                    };
                    await saveGlobalConfig({ financial: settingsStore.config.financial });
                }
            });
        }
    });

    // 7. Save Service Form Submit
    const srvForm = document.getElementById('serviceForm');
    if (srvForm) {
        srvForm.onsubmit = async (e) => {
            e.preventDefault();
            const serviceData = {
                id: document.getElementById('serviceId').value || null,
                code: document.getElementById('serviceCode').value.trim(),
                nameAr: document.getElementById('serviceNameAr').value.trim(),
                nameEn: document.getElementById('serviceNameEn').value.trim(),
                category: document.getElementById('serviceCategory').value,
                currentPrice: parseFloat(document.getElementById('servicePrice').value) || 0,
                durationMinutes: parseInt(document.getElementById('serviceDuration').value) || 30,
                isActive: document.getElementById('serviceIsActive').checked
            };

            const success = await saveService(serviceData);
            if (success) {
                document.getElementById('serviceModal').classList.remove('show');
            }
        };
    }

    const cancelSrvBtn = document.getElementById('cancelServiceModalBtn');
    if (cancelSrvBtn) cancelSrvBtn.onclick = () => document.getElementById('serviceModal').classList.remove('show');

    // 8. Save Medication Form Submit
    const medForm = document.getElementById('medicationForm');
    if (medForm) {
        medForm.onsubmit = async (e) => {
            e.preventDefault();
            const rawContra = document.getElementById('medContraindications').value;
            const contraindications = rawContra.split(',').map(s => s.trim()).filter(Boolean);

            const medData = {
                id: document.getElementById('medicationId').value || null,
                name: document.getElementById('medName').value.trim(),
                dosageStrength: document.getElementById('medDosage').value.trim(),
                route: document.getElementById('medRoute').value,
                category: document.getElementById('medCategory').value,
                frequency: document.getElementById('medFrequency').value.trim(),
                duration: document.getElementById('medDuration').value.trim(),
                instructionsAr: document.getElementById('medInstructionsAr').value.trim(),
                instructionsEn: document.getElementById('medInstructionsEn').value.trim(),
                contraindications
            };

            const success = await saveMedication(medData);
            if (success) {
                document.getElementById('medicationModal').classList.remove('show');
            }
        };
    }

    const cancelMedBtn = document.getElementById('cancelMedicationModalBtn');
    if (cancelMedBtn) cancelMedBtn.onclick = () => document.getElementById('medicationModal').classList.remove('show');

    // 9. Save Financial Form Submit
    const finForm = document.getElementById('financialSettingsForm');
    if (finForm) {
        finForm.onsubmit = async (e) => {
            e.preventDefault();
            const curCode = document.getElementById('settingCurrencySelect')?.value || 'EGP';
            const curSymbol = document.getElementById('settingCurrencySymbol')?.value.trim() || 'ج.م';
            const presetsEl = document.getElementById('settingDiscountPresets') || document.getElementById('settingDiscounts');
            const rawPresets = presetsEl ? presetsEl.value : '5, 10, 15, 20, 25, 30, 50';
            const discountPresets = rawPresets.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));

            const pmCash = document.getElementById('settingPmCash') || document.getElementById('payMethodCash');
            const pmCard = document.getElementById('settingPmCard') || document.getElementById('payMethodCard');
            const pmInsta = document.getElementById('settingPmInstapay') || document.getElementById('payMethodInstapay');
            const pmVodafone = document.getElementById('settingPmVodafone');
            const pmBank = document.getElementById('settingPmBank');
            const pmInsur = document.getElementById('settingPmInsurance') || document.getElementById('payMethodInsurance');
            const pmInstallment = document.getElementById('settingPmInstallment');

            const allowDentistPriceEdit = document.getElementById('settingAllowDentistPriceEdit')?.checked ?? true;

            const financial = {
                currencyCode: curCode,
                currencySymbol: curSymbol,
                symbolPosition: 'suffix',
                taxEnabled: document.getElementById('settingTaxEnabled')?.checked ?? false,
                taxRatePercentage: parseFloat(document.getElementById('settingTaxRate')?.value) || 0,
                taxRegistrationNumber: document.getElementById('settingTaxNumber')?.value.trim() || '',
                paymentMethods: {
                    cash: pmCash ? pmCash.checked : true,
                    card: pmCard ? pmCard.checked : true,
                    instapay: pmInsta ? pmInsta.checked : true,
                    vodafoneCash: pmVodafone ? pmVodafone.checked : true,
                    bankTransfer: pmBank ? pmBank.checked : true,
                    insurance: pmInsur ? pmInsur.checked : true,
                    installment: pmInstallment ? pmInstallment.checked : true
                },
                discountPresets: discountPresets.length > 0 ? discountPresets : [5, 10, 15, 20, 25, 30, 50]
            };

            const clinicalRules = {
                ...(settingsStore.config.clinicalRules || {}),
                allowDentistPriceEdit: allowDentistPriceEdit
            };

            await saveGlobalConfig({ financial, clinicalRules });
        };
    }

    // 10. Save Clinic Branding Form Submit
    const brandForm = document.getElementById('brandingSettingsForm');
    if (brandForm) {
        brandForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                clinicName: document.getElementById('settingClinicName').value.trim(),
                doctorName: document.getElementById('settingDoctorName').value.trim(),
                credentials: document.getElementById('settingCredentials').value.trim(),
                licenseNumber: document.getElementById('settingLicenseNumber').value.trim(),
                phone: document.getElementById('settingPhone').value.trim(),
                phoneWhatsApp: document.getElementById('settingWhatsApp').value.trim(),
                email: document.getElementById('settingEmail').value.trim(),
                address: document.getElementById('settingAddress').value.trim(),
                invoiceHeader: document.getElementById('settingInvoiceHeader').value.trim(),
                invoiceFooter: document.getElementById('settingInvoiceFooter').value.trim(),
                clinicalRules: {
                    enableAllergyWarning: document.getElementById('settingEnableAllergyWarning').checked,
                    requireOverrideReason: document.getElementById('settingRequireOverrideReason').checked,
                    autoSignatureOnPrescription: document.getElementById('settingAutoSignature').checked,
                    allowDentistPriceEdit: document.getElementById('settingAllowDentistPriceEdit').checked
                }
            };

            await saveGlobalConfig(payload);
        };
    }

    // 11. Export Full Clinic Configuration JSON
    window.exportClinicConfigToJson = function() {
        const isAr = (document.documentElement.lang || 'en') === 'ar';
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            clinicConfig: settingsStore.config,
            services: settingsStore.services,
            medicationTemplates: settingsStore.medications,
            auditLogs: settingsStore.auditLogs,
            exportedAt: new Date().toISOString()
        }, null, 2));

        const a = document.createElement('a');
        a.setAttribute('href', dataStr);
        a.setAttribute('download', `molarize_clinic_settings_${Date.now()}.json`);
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (window.showToast) {
            window.showToast(isAr ? 'تم تحميل ملف النسخ الاحتياطي للإعدادات JSON بنجاح' : 'Clinic settings backup JSON downloaded successfully', 'success');
        }
    };

    const exportConfigBtn = document.getElementById('exportFullConfigJsonBtn');
    if (exportConfigBtn) {
        exportConfigBtn.onclick = (e) => {
            e.preventDefault();
            window.exportClinicConfigToJson();
        };
    }

    // 12. Global Keyboard Shortcuts: Escape to close modals, Ctrl+K for search
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllActiveModals();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalPatientSearch') || 
                               document.getElementById('servicesSearchInput') || 
                               document.getElementById('patientSearchInput');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    });

    // 13. Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modalEl => {
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) {
                modalEl.classList.remove('show');
            }
        });
    });
}

// --- Restore Settings JSON Backup Handler ---
window.handleSettingsJsonFileSelected = async function(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const isAr = (document.documentElement.lang || 'en') === 'ar';
    const triggerBtnText = document.getElementById('triggerRestoreSettingsBtnText');
    const originalBtnText = triggerBtnText ? triggerBtnText.innerText : '';

    if (triggerBtnText) {
        triggerBtnText.innerText = isAr ? 'جاري قراءة واستعادة الإعدادات...' : 'Restoring settings...';
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            if (window.showToast) window.showToast(isAr ? 'يجب تسجيل الدخول أولاً' : 'Please sign in first', 'error');
            return;
        }

        const text = await file.text();
        const data = JSON.parse(text);

        if (!data || typeof data !== 'object') {
            throw new Error(isAr ? 'تنسيق الملف غير صالح' : 'Invalid file format');
        }

        // 1. Restore Clinic Config
        if (data.clinicConfig && typeof data.clinicConfig === 'object') {
            await setDoc(getClinicDocRef(), data.clinicConfig, { merge: true });
            settingsStore.config = { ...settingsStore.config, ...data.clinicConfig };
        }

        // 2. Restore Services
        if (Array.isArray(data.services) && data.services.length > 0) {
            for (const srv of data.services) {
                if (srv.id) {
                    await setDoc(doc(getServicesColRef(), srv.id), srv, { merge: true });
                } else {
                    await addDoc(getServicesColRef(), srv);
                }
            }
            settingsStore.services = data.services;
        }

        // 3. Restore Medication Templates
        if (Array.isArray(data.medicationTemplates) && data.medicationTemplates.length > 0) {
            for (const med of data.medicationTemplates) {
                if (med.id) {
                    await setDoc(doc(getMedsColRef(), med.id), med, { merge: true });
                } else {
                    await addDoc(getMedsColRef(), med);
                }
            }
            settingsStore.medications = data.medicationTemplates;
        }

        settingsStore.notify();
        updateDynamicUI();

        if (window.showToast) {
            window.showToast(isAr ? 'تمت استعادة كافة إعدادات العيادة والأسعار وقوالب الروشتات بنجاح!' : 'Clinic settings, pricing, and medication templates restored successfully!', 'success');
        }
    } catch (err) {
        console.error("Error restoring settings JSON:", err);
        if (window.showToast) {
            window.showToast(isAr ? `حدث خطأ أثناء استعادة الإعدادات: ${err.message}` : `Error restoring settings: ${err.message}`, 'error');
        }
    } finally {
        if (triggerBtnText && originalBtnText) {
            triggerBtnText.innerText = originalBtnText;
        }
        if (event?.target) {
            event.target.value = '';
        }
    }
};

// Global window exposures
window.openServiceModal = openServiceModal;
window.editService = openServiceModal;
window.deleteService = deleteService;
window.openMedicationModal = openMedicationModal;
window.editMedicationTemplate = openMedicationModal;
window.deleteMedication = deleteMedication;
window.closeAllActiveModals = closeAllActiveModals;
window.settingsStore = settingsStore;
window.saveService = saveService;
window.saveMedication = saveMedication;
window.saveGlobalConfig = saveGlobalConfig;
window.handleSettingsJsonFileSelected = window.handleSettingsJsonFileSelected;


// Auto-run initialization on load when the user is authenticated
let isUIEventListenersSetup = false;

onAuthStateChanged(auth, (user) => {
    if (user) {
        initializeSettings();
        if (!isUIEventListenersSetup) {
            setupSettingsUIEventListeners();
            isUIEventListenersSetup = true;
        }
    }
});

