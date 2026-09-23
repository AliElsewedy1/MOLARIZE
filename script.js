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
