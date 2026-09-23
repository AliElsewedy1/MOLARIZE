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

            // Show the target section
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }
            }
        });
    });
}

// Logout button logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (window.auth && window.signOut) {
            window.signOut(window.auth).then(() => {
                window.location.href = 'index.html';
            });
        }
    });
}

// Re-render chart on tab switch (fixes canvas size issue)
document.querySelector('[data-target="payments-section"]')?.addEventListener('click', () => {
    if (typeof revenueChartInstance !== 'undefined' && revenueChartInstance) {
        setTimeout(() => {
            revenueChartInstance.resize();
        }, 50);
    }
});
