// Floating Toast Notification System & Alert Interceptor
(function() {
    function getContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    window.showToast = function(message, type = 'info', duration = 3500) {
        if (!document.body) return;
        const container = getContainer();
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;

        const iconEl = document.createElement('span');
        iconEl.className = 'toast-icon';
        iconEl.innerText = icons[type] || 'ℹ️';

        const msgEl = document.createElement('div');
        msgEl.className = 'toast-message';
        msgEl.innerText = message;

        const progressEl = document.createElement('div');
        progressEl.className = 'toast-progress';
        progressEl.style.animationDuration = `${duration}ms`;

        toast.appendChild(iconEl);
        toast.appendChild(msgEl);
        toast.appendChild(progressEl);

        function dismiss() {
            if (toast.classList.contains('toast-hiding')) return;
            toast.classList.add('toast-hiding');
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 280);
        }

        toast.addEventListener('click', dismiss);
        setTimeout(dismiss, duration);

        container.appendChild(toast);
    };

    // Seamlessly upgrade native window.alert to non-blocking floating toasts
    window.alert = function(msg) {
        const str = String(msg || '');
        const lower = str.toLowerCase();
        let type = 'info';
        if (lower.includes('error') || lower.includes('خطأ') || lower.includes('فشل') || lower.includes('failed')) {
            type = 'error';
        } else if (lower.includes('success') || lower.includes('بنجاح') || lower.includes('تم')) {
            type = 'success';
        } else if (lower.includes('must') || lower.includes('يرجى') || lower.includes('يجب') || lower.includes('warning') || lower.includes('تنبيه')) {
            type = 'warning';
        }
        window.showToast(str, type, 4000);
    };
})();
