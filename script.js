document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const form = document.getElementById('contactForm');
    const successMessage = document.getElementById('successMessage');
    const messageInput = document.getElementById('message');
    const authOverlay = document.getElementById('authOverlay');
    
    // Nav Elements
    const navLoginBtn = document.getElementById('navLoginBtn');
    const userMenu = document.getElementById('userMenu');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    const overlayLoginBtn = document.getElementById('overlayLoginBtn');
    
    // Modal Elements
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    const toggleAuthMode = document.getElementById('toggleAuthMode');
    const modalTitle = document.getElementById('modalTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authError = document.getElementById('authError');
    const authToggleText = document.getElementById('authToggleText');
    const contactEmailInput = document.getElementById('email');

    let isLoginMode = true;
    let currentUser = null;

    // --- Authentication State Management ---
    
    async function checkAuth() {
        try {
            const res = await fetch('/auth/me');
            const data = await res.json();
            if (data.user) {
                currentUser = data.user;
                updateUIForLoggedInUser();
            } else {
                currentUser = null;
                updateUIForLoggedOutUser();
            }
        } catch (e) {
            console.error("Auth check failed", e);
            updateUIForLoggedOutUser();
        }
    }

    function resetContactForm() {
        form.classList.remove('hidden');
        successMessage.classList.add('hidden');
        document.getElementById('name').value = '';
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        const btn = document.getElementById('submitBtn');
        if (btn) {
            btn.disabled = false;
            const btnText = btn.querySelector('.btn-text');
            if (btnText) btnText.textContent = 'Submit Message';
        }
    }

    function updateUIForLoggedInUser() {
        navLoginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userEmailDisplay.textContent = currentUser.email;
        
        authOverlay.classList.add('hidden');
        contactEmailInput.value = currentUser.email;
        resetContactForm();
    }

    function updateUIForLoggedOutUser() {
        navLoginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
        
        authOverlay.classList.remove('hidden');
        contactEmailInput.value = '';
        resetContactForm();
    }

    checkAuth();

    // --- Modal Interactions ---
    
    function openModal() {
        authModal.classList.remove('hidden');
        authError.textContent = '';
        authEmail.value = '';
        authPassword.value = '';
    }

    function closeAuthModal() {
        authModal.classList.add('hidden');
    }

    navLoginBtn.addEventListener('click', openModal);
    overlayLoginBtn.addEventListener('click', openModal);
    closeModal.addEventListener('click', closeAuthModal);
    
    // Close modal when clicking outside
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
    });

    authToggleText.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                modalTitle.textContent = 'Sign In';
                authSubmitBtn.textContent = 'Sign In';
                authToggleText.innerHTML = `Don't have an account? <a href="#">Sign Up</a>`;
            } else {
                modalTitle.textContent = 'Create Account';
                authSubmitBtn.textContent = 'Sign Up';
                authToggleText.innerHTML = `Already have an account? <a href="#">Sign In</a>`;
            }
            
            // Reset inputs and errors when toggling between Sign In and Sign Up
            authEmail.value = '';
            authPassword.value = '';
            authError.textContent = '';
        }
    });

    // --- Authentication Submit (Login/Signup) ---
    
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = '';
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Please wait...';

        const endpoint = isLoginMode ? '/auth/login' : '/auth/signup';
        const payload = {
            email: authEmail.value,
            password: authPassword.value
        };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                closeAuthModal();
                checkAuth(); // Refresh UI
            } else {
                authError.textContent = data.error;
            }
        } catch (err) {
            authError.textContent = 'Network error. Please try again.';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
        }
    });

    // --- Logout ---
    navLogoutBtn.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        checkAuth();
    });

    // --- Form Submission ---
    
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (form.checkValidity() && currentUser) {
            const btn = document.getElementById('submitBtn');
            const btnText = btn.querySelector('.btn-text');
            const originalText = btnText.textContent;
            
            btnText.textContent = 'Sending...';
            btn.disabled = true;

            const formData = {
                name: document.getElementById('name').value,
                email: currentUser.email,
                message: messageInput.value
            };

            try {
                const response = await fetch('/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    form.classList.add('hidden');
                    successMessage.classList.remove('hidden');
                } else {
                    alert('Error saving message: ' + result.error);
                    btn.disabled = false;
                    btnText.textContent = originalText;
                }
            } catch (error) {
                alert('Network error occurred. Please try again.');
                btn.disabled = false;
                btnText.textContent = originalText;
            }
        }
    });
});
