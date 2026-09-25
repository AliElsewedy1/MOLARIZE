# MOLARIZE - Enterprise Clinic Settings & Configuration Hub (Production Specification)

Enterprise-grade production architecture and specification for the **Clinic Settings & Configuration Hub** in MOLARIZE Dental Practice Management SaaS. Designed for scalable multi-tenancy, granular Role-Based Access Control (RBAC), historical financial data immutability, clinical safety rules, comprehensive branding, and full audit logging.

---

## User Review & Critical Architecture Decisions

> [!IMPORTANT]
> This production specification directly integrates the architectural requirements:
> 1. **Multi-Tenant Data Isolation**: Explicit `clinics/{clinicId}` tenant scope across Firestore models.
> 2. **RBAC & Granular Permissions**: Distinct operational matrix (Owner, Admin, Dentist, Assistant) with price-editing guards.
> 3. **Historical Data Immutability & Price Versioning**: Snapshot isolation ensuring price and currency updates never mutate past invoices or patient records.
> 4. **Clinical Safety & Prescription Templates**: Decoupled medication templates with allergy conflict warning, doctor override reason, and audit logging.
> 5. **Expanded Financial Suite**: Currency, Tax (VAT), payment channels (Cash, Cards, InstaPay/Wallets, Insurance), deposit rules, and preset discounts.
> 6. **Comprehensive Branding**: Logo, clinic stamp, doctor signature, invoice headers, and printable templates.
> 7. **Tamper-Evident Audit Log**: Structured activity trail for price revisions, profile changes, and clinical overrides.

---

## 1. Overview & Core Concept

- **What It Does**: Provides clinic owners and dental teams with an enterprise configuration center that governs clinical procedures, medication templates, tax/currency policies, billing rules, branding assets, user permissions, and compliance audit logs.
- **Target Audience**: Clinic Owners, Medical Directors, Associate Dentists, and Clinic Receptionists/Assistants.
- **Key Value**: Replaces hardcoded values with a reactive, multi-tenant settings engine that enforces financial integrity, protects historical ledgers, and streamlines clinical workflow during patient visits.

---

## 2. User Experience & Visual Design

### Information Architecture & Layout (Clean Tabs + Quick-Toggle Cards)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚙️ Clinic Settings & Operations Hub                                [Clinic: Downtown Dental Center] │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 🩺 Services & Pricing ]  [ 💊 Drugs & Templates ]  [ 💳 Financial & Tax ]  [ 🏥 Clinic Branding ] │
│ [ 🛡️ Staff & Permissions ] [ 📜 Audit Trail ]                                                     │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Tab 1: 🩺 Medical Services, Procedures & Price Versioning
- **Quick-Toggle Cards**:
  - *Enforce Price Editing Permissions* (Requires Owner/Admin authorization to discount at point-of-sale).
  - *Dynamic Quick-Fill Buttons* (Show top procedures in patient treatment charts).
- **Procedures Catalog Data Table**:
  - Columns: Service Name (AR/EN), Category (Restorative, Endodontics, Surgery, Orthodontics, Hygiene, Prosthodontics), Effective Price, Active Currency, Effective Date, Status (Active/Archived), Actions.
  - `+ Add New Service` modal with procedure codes, default duration, category, and initial price.
  - Price revision history modal tracking date-stamped adjustments.

### Tab 2: 💊 Prescription Templates & Clinical Safety Rules
- **Clinical Safety Toggles**:
  - *Strict Drug Allergy Conflict Interception* (Blocks prescription until doctor confirms override reason).
  - *Auto-append Digital Signature & License Number on PDF Prescriptions*.
- **Medication Favorites & Templates Catalog**:
  - Columns: Medication Name, Form & Strength, Standard Frequency & Route, Duration, Instructions (e.g., after meals), Category (Antibiotic, Analgesic, Anti-inflammatory, Antiseptic, Mouthwash), Actions.
  - Inline template editor for fast dosage adjustments without modifying patient history.

### Tab 3: 💳 Financial, Currency, Taxation & Payment Channels
- **Currency & Localization Card**:
  - Primary Currency selector (`EGP`, `USD`, `SAR`, `AED`, `EUR`, `KWD`) with symbol placement formatting (`prefix` / `suffix`).
  - *Rule*: Currency changes apply strictly to future invoices; historical transactions remain locked in their issued currency.
- **Taxation (VAT) Configuration**:
  - VAT Enable/Disable switch, Tax Rate % (e.g. 14% or 15%), Tax Registration Number, and Tax display on receipts.
- **Payment Methods Matrix**:
  - Cash (`كاش`) [Active/Inactive Toggle]
  - Credit/Debit Card (`بطاقة ائتمان`) [Active/Inactive Toggle]
  - Electronic Wallets & InstaPay (`محافظ إلكترونية / إنستاباي`) [Active/Inactive Toggle + Payment phone/link note]
  - Health Insurance Providers (`تأمين صحي`) [Active/Inactive Toggle + Policy claim field toggle]
- **Preset Discount & Deposit Rules**:
  - Configurable discount quick-buttons (e.g. 5%, 10%, 15%, 20%, Family Plan).
  - Minimum advance deposit policy for long multi-session treatments.

### Tab 4: 🏥 Clinic Profile, Branding & Printable Assets
- **Clinic Identity**: Official Clinic Name, Medical Director/Doctor Name, Specialty & Credentials, Medical License Number.
- **Contact & Location**: Phone 1, Phone 2 (WhatsApp enabled), Email, Website, Clinic Address with Google Maps link.
- **Digital Assets**:
  - Clinic Logo upload & preview.
  - Official Stamp & Doctor Signature upload (for automated receipt and prescription stamping).
  - Invoice Header & Footer custom notes (e.g., warranties, return policy, emergency instructions).

### Tab 5: 🛡️ Staff Roles & Granular Permissions (RBAC)
- **Role Permissions Matrix Table**:
  - Owner: Full access (All clinical, financial, pricing, settings, and audit logs).
  - Admin: Full management (Clinical, financial, inventory, settings without deleting logs).
  - Dentist: Clinical records, patient charts, prescriptions, treatment creation (View prices, restricted price modifications).
  - Assistant: Appointment booking, patient intake, inventory view, receipt collection (View only for clinical/pricing).

### Tab 6: 📜 Activity Audit Trail & Compliance Log
- Live searchable audit table capturing: Timestamp, User Name, Role, Action Type (`PRICE_UPDATED`, `SERVICE_ADDED`, `CURRENCY_CHANGED`, `ALLERGY_OVERRIDE`, `MEDICATION_UPDATED`), Old Value, New Value, Reason/Notes.

---

## 3. Key Product Decisions & Trade-Offs

- **Multi-Tenant Schema with Sub-Collections vs. Single Mega-Doc**:
  - *Chosen Approach*: `clinics/{clinicId}/settings/config` for global flags + dedicated sub-collections `clinics/{clinicId}/services` and `clinics/{clinicId}/medication_templates`.
  - *Why*: Supports limitless scaling, prevents Firestore document size limits (1MB), avoids write contention, and enables granular document security rules.
- **Immutable Financial & Clinical Snapshots**:
  - *Chosen Approach*: When a treatment or invoice is created, it captures an immutable snapshot: `{ serviceId, serviceName, chargedAmount, currency: "EGP", taxAmount, timestamp }`.
  - *Why*: Modifying service prices or changing clinic currency in Settings never retroactively distorts past financial books or invoices.
- **Decoupled Medication Templates**:
  - *Chosen Approach*: The medication settings catalog acts purely as reusable templates. When added to a patient chart, a discrete prescription record is created.
  - *Why*: Updating dosage templates never alters existing clinical patient charts.

---

## 4. Technical Architecture & Data Strategy

```
                                  MOLARIZE
                                      │
                         Enterprise Settings Engine
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
  Clinical Engine              Financial Engine             Branding & Security
         │                            │                            │
   • Services & Pricing         • Currency & Formatting      • Clinic Logo & Stamp
   • Price Versioning           • Tax / VAT Policies         • Doctor Signature
   • Medication Templates       • Payment Channels Matrix    • RBAC Matrix
   • Allergy Safety Intercept   • Preset Discounts Rules     • Audit Trail Engine
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                        Reactive Central Settings Store
                         (`window.SettingsManager`)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
  Treatment Modal             Prescription Modal            Billing & Reports
(Dynamic Procedures)         (Dynamic Drug Chips)        (Currency & Tax Rules)
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                      Multi-Tenant Firestore Cloud Store
                    `clinics/{clinicId}/settings/config`
                    `clinics/{clinicId}/services/{id}`
                    `clinics/{clinicId}/medications/{id}`
                    `clinics/{clinicId}/audit_logs/{id}`
```

### Firestore Schema Specification

```typescript
// 1. Tenant Global Configuration: `clinics/{clinicId}/settings/config`
interface ClinicSettingsConfig {
  clinicId: string;
  clinicName: string;
  doctorName: string;
  credentials: string;
  licenseNumber: string;
  phone: string;
  phoneWhatsApp: string;
  email: string;
  address: string;
  logoUrl?: string;
  signatureUrl?: string;
  stampUrl?: string;
  
  // Financial Configuration
  financial: {
    currencyCode: 'EGP' | 'USD' | 'SAR' | 'AED' | 'EUR' | 'KWD';
    currencySymbol: string;
    symbolPosition: 'prefix' | 'suffix';
    taxEnabled: boolean;
    taxRatePercentage: number;
    taxRegistrationNumber: string;
    paymentMethods: {
      cash: boolean;
      card: boolean;
      instapay: boolean;
      insurance: boolean;
    };
    discountPresets: number[]; // [5, 10, 15, 20]
    depositRequired: boolean;
    minimumDepositPercentage: number;
  };

  // Clinical Safety Rules
  clinicalRules: {
    enableAllergyWarning: boolean;
    requireOverrideReason: boolean;
    autoSignatureOnPrescription: boolean;
  };

  updatedAt: string;
  updatedBy: string;
}

// 2. Services & Procedures Collection: `clinics/{clinicId}/services/{serviceId}`
interface ClinicServiceItem {
  id: string;
  clinicId: string;
  code?: string;
  nameAr: string;
  nameEn: string;
  category: 'restorative' | 'surgery' | 'endodontics' | 'orthodontics' | 'hygiene' | 'prosthodontics' | 'general';
  currentPrice: number;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
  priceHistory: Array<{
    price: number;
    currency: string;
    effectiveDate: string;
    updatedBy: string;
  }>;
}

// 3. Medication Templates Collection: `clinics/{clinicId}/medications/{medicationId}`
interface MedicationTemplate {
  id: string;
  clinicId: string;
  name: string;
  dosageStrength: string;
  route: 'Oral' | 'Topical' | 'Injection' | 'Sublingual' | 'Rinse';
  frequency: string;       // e.g. "Every 12 hours" / "TID"
  duration: string;        // e.g. "5 days"
  instructionsAr: string;  // e.g. "قرص بعد الأكل كل 12 ساعة"
  instructionsEn: string;  // e.g. "1 tablet after meals every 12 hrs"
  category: 'Antibiotic' | 'Analgesic' | 'Anti-inflammatory' | 'Antiseptic' | 'Mouthwash' | 'Other';
  contraindications: string[]; // ["Penicillin", "Aspirin"]
  isActive: boolean;
}

// 4. Audit Log Collection: `clinics/{clinicId}/audit_logs/{logId}`
interface ClinicAuditLog {
  id: string;
  clinicId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: 'Owner' | 'Admin' | 'Dentist' | 'Assistant';
  action: 'PRICE_UPDATED' | 'SERVICE_ADDED' | 'SERVICE_DELETED' | 'MEDICATION_ADDED' | 'MEDICATION_UPDATED' | 'CURRENCY_CHANGED' | 'TAX_UPDATED' | 'PAYMENT_METHOD_TOGGLED' | 'PROFILE_UPDATED' | 'ALLERGY_OVERRIDE';
  targetEntity: string;
  details: {
    oldValue?: any;
    newValue?: any;
    reason?: string;
  };
}
```

---

## 5. Implementation & Rollout Stages

1. **Stage 1: Multi-Tenant Settings Controller & Store (`firebase-settings.js`)**:
   - Initialize `SettingsManager` with reactive event dispatching.
   - Cache settings in memory on app boot with automatic Firestore real-time sync.
2. **Stage 2: Responsive Settings UI in `dashboard.html`**:
   - Tab bar with 6 functional views: Services & Pricing, Medication Templates, Financial & Tax, Branding & Assets, Permissions, and Audit Trail.
   - Quick-toggle switch cards with immediate feedback.
3. **Stage 3: Procedure & Drug Catalog Management Modals**:
   - Add/Edit Procedure modal with price version logging.
   - Add/Edit Medication Template modal with allergy contraindication tags.
4. **Stage 4: Dynamic Synchronization across Clinical Views**:
   - Automatically populate Treatment modal quick-fill procedure chips from active services.
   - Automatically populate Prescription modal quick-medication chips from active medication templates.
   - Integrate allergy conflict modal when a prescribed drug matches patient allergies.
5. **Stage 5: Verification & Safety Testing**:
   - Verify historical transactions and past invoices remain immutable when changing active prices or currencies.
   - Verify non-admin role restrictions and audit trail logging.
   - Run compilation and linting suites.
