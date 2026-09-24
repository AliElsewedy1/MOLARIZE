// Safe replacement for window.alert in iframe environments
window.alert = function(message) {
    console.warn("[MOLARIZE Alert]", message);
    let toast = document.getElementById('molarize-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'molarize-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.right = '24px';
        toast.style.zIndex = '99999';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '8px';
        toast.style.backgroundColor = '#1e293b';
        toast.style.color = '#f8fafc';
        toast.style.border = '1px solid rgba(45, 212, 191, 0.4)';
        toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        toast.style.fontFamily = "'Tajawal', sans-serif";
        toast.style.fontSize = '14px';
        toast.style.maxWidth = '360px';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
    }, 4000);
};

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

    // Refresh dashboard stats to update JS-rendered translations
    if (typeof updateDashboardStats === 'function') {
        updateDashboardStats();
    }
});

// Patient Management Logic has been moved to firebase-patients.js
// to use Firebase Firestore instead of Local Storage.

// --- Mobile Menu Toggle ---
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');

function closeMobileMenu() {
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        mobileOverlay.classList.remove('active');
    }
}

if (mobileMenuBtn && sidebar && mobileOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        mobileOverlay.classList.add('active');
    });

    mobileOverlay.addEventListener('click', closeMobileMenu);
}

// --- Sidebar Navigation (SPA style) ---
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const appSections = document.querySelectorAll('.app-section');

if (sidebarLinks.length > 0) {
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Show the target section
            const targetId = this.getAttribute('data-target');

            // History API: Push state when navigating to a new section
            if (targetId && window.location.hash !== `#${targetId}`) {
                history.pushState({ section: targetId }, '', `#${targetId}`);
            }

            // Close mobile menu on link click
            closeMobileMenu();

            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');

            // Hide all sections
            appSections.forEach(section => {
                section.style.display = 'none';
            });

            if (targetId) {
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }
            }
        });
    });
}

// Helper to safely close modals and pop the modal state
window.closeModalAndPopState = function(modalElement) {
    modalElement.classList.remove('show');
    // If the top state in history is a modal state, pop it so we don't trap the user
    if (history.state && history.state.modal) {
        history.back();
    }
};

// Handle Mobile Back Button and Modals
window.addEventListener('popstate', (e) => {
    const openModals = document.querySelectorAll('.modal.show');

    // 1. If any modal is open, close it. The back button has already popped the state,
    // so we don't need to push it back. The hash remains the section hash.
    if (openModals.length > 0) {
        openModals.forEach(modal => modal.classList.remove('show'));
        // If there's still a modal state after popping, it means there was a mismatch,
        // let's try to restore the section state
        if (e.state && e.state.modal) {
            // we should technically be in a section state now, if not we wait for next pop
             return;
        }
        // If we popped into a section state, just return and stay there
        return;
    }

    // 2. Otherwise, handle section navigation
    if (e.state && e.state.section) {
        const targetSidebarLink = document.querySelector(`.sidebar-link[data-target="${e.state.section}"]`);
        if (targetSidebarLink) {
            // Avoid pushing state again in the click handler by simulating the logic
            sidebarLinks.forEach(l => l.classList.remove('active'));
            targetSidebarLink.classList.add('active');
            appSections.forEach(sec => sec.style.display = 'none');
            const targetSec = document.getElementById(e.state.section);
            if(targetSec) targetSec.style.display = 'block';
        }
    } else {
        // Default to dashboard if no state (e.g., just landed on page)
        const dashboardLink = document.querySelector('.sidebar-link[data-target="dashboard-section"]');
        if (dashboardLink) {
            dashboardLink.click();
        }
    }
});

// Set initial state on load
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.hash) {
        history.replaceState({ section: 'dashboard-section' }, '', '#dashboard-section');
    } else {
        const hash = window.location.hash.substring(1);
        history.replaceState({ section: hash }, '', window.location.hash);
    }
});

// Ensure in-page nav-links (like 'View all') switch sections via the same mechanism
const navLinks = document.querySelectorAll('.nav-link[data-target-section]');
navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('data-target-section');
        const correspondingSidebarLink = document.querySelector(`.sidebar-link[data-target="${targetId}"]`);
        if (correspondingSidebarLink) {
            correspondingSidebarLink.click();
        }
    });
});

// Logout logic has been moved to firebase-app-data.js
// to take advantage of the centralized module imports.

// Re-render chart on tab switch (fixes canvas size issue)
document.querySelector('[data-target="payments-section"]')?.addEventListener('click', () => {
    if (typeof revenueChartInstance !== 'undefined' && revenueChartInstance) {
        setTimeout(() => {
            revenueChartInstance.resize();
        }, 50);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    // Generate teeth
    const upperTeethContainer = document.getElementById('upper-teeth');
    const lowerTeethContainer = document.getElementById('lower-teeth');

    if (upperTeethContainer && lowerTeethContainer) {
        let upperTeethHTML = '';
        let lowerTeethHTML = '';

        // FDI Notation
        // Upper Right: 18 to 11
        for(let i=18; i>=11; i--) upperTeethHTML += `<div class="tooth-box" data-tooth="${i}">${i}</div>`;
        // Upper Left: 21 to 28
        for(let i=21; i<=28; i++) upperTeethHTML += `<div class="tooth-box" data-tooth="${i}">${i}</div>`;

        // Lower Right: 48 to 41
        for(let i=48; i>=41; i--) lowerTeethHTML += `<div class="tooth-box" data-tooth="${i}">${i}</div>`;
        // Lower Left: 31 to 38
        for(let i=31; i<=38; i++) lowerTeethHTML += `<div class="tooth-box" data-tooth="${i}">${i}</div>`;

        upperTeethContainer.innerHTML = upperTeethHTML;
        lowerTeethContainer.innerHTML = lowerTeethHTML;
    }


    // Odontogram Collapse Logic
    const toggleOdontogramBtn = document.getElementById('toggleOdontogramBtn');
    const odontogramContent = document.getElementById('odontogramContent');
    const odontogramIcon = document.getElementById('odontogramIcon');

    if (toggleOdontogramBtn && odontogramContent) {
        toggleOdontogramBtn.addEventListener('click', () => {
            if (odontogramContent.style.display === 'none') {
                odontogramContent.style.display = 'block';
                odontogramIcon.innerText = '▲';
            } else {
                odontogramContent.style.display = 'none';
                odontogramIcon.innerText = '▼';
            }
        });
    }

    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.style.display = 'none');

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).style.display = 'block';
        });
    });
});
