// Form validation
document.addEventListener('DOMContentLoaded', () => {
    // Enable form validation styles
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // Password confirmation validation
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    if (passwordField && confirmPasswordField) {
        confirmPasswordField.addEventListener('input', () => {
            if (passwordField.value !== confirmPasswordField.value) {
                confirmPasswordField.setCustomValidity('Passwords do not match');
            } else {
                confirmPasswordField.setCustomValidity('');
            }
        });
    }

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-bs-theme', savedTheme);
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
    }

    // Theme toggle handler
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            htmlElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.add('fade');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    });
});

// AJAX form submissions with fetch API
function submitFormAsync(formElement, callback) {
    formElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const formData = new FormData(formElement);
            const response = await fetch(formElement.action, {
                method: formElement.method,
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            callback(null, data);
        } catch (error) {
            callback(error);
        }
    });
}