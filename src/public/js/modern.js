// Initialize AOS animations
AOS.init({
    duration: 800,
    once: true,
    offset: 100,
    easing: 'ease-in-out'
});

// Initialize Bootstrap tooltips and popovers
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
});

var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
});

// Show/hide loading spinner
function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('d-none');
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form validation
const forms = document.querySelectorAll('.needs-validation');
Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        form.classList.add('was-validated');
    });
});

// Dark mode toggle
const darkModeToggle = document.querySelector('#darkModeToggle');
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        document.documentElement.setAttribute('data-bs-theme',
            document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark'
        );
        localStorage.setItem('theme',
            document.documentElement.getAttribute('data-bs-theme')
        );
    });
}

// Set initial theme
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    
    // Initialize AOS again after theme change to ensure proper animations
    AOS.refresh();
});

// Add loading state to buttons when clicked
document.addEventListener('click', e => {
    const button = e.target.closest('.btn');
    if (button && !button.classList.contains('disabled')) {
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading...';
        button.classList.add('disabled');
        
        // Reset button after 2 seconds (adjust timing as needed)
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('disabled');
        }, 2000);
    }
});