// Authentication UI Controller
let authMode = 'signin'; // 'signin' or 'signup'

// Update auth button based on authentication status
function updateAuthButton() {
    const authButton = document.getElementById('authButton');
    if (!authButton) return;

    if (isAuthenticated()) {
        const user = getCurrentUser();
        authButton.textContent = `👤 ${user.email}`;
        authButton.onclick = showUserMenu;
    } else {
        authButton.textContent = '🔐 Login';
        authButton.onclick = openAuthModal;
    }
}

// Show user menu (sign out option)
function showUserMenu() {
    if (confirm('Sign out?')) {
        handleSignOut();
    }
}

// Open authentication modal
function openAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';
}

// Close authentication modal
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Toggle between sign in and sign up
function toggleAuthMode() {
    authMode = authMode === 'signin' ? 'signup' : 'signin';

    const title = document.getElementById('authTitle');
    const submitBtn = document.getElementById('authSubmit');
    const toggle = document.getElementById('authToggle');

    if (authMode === 'signup') {
        title.textContent = 'Sign Up';
        submitBtn.textContent = 'Sign Up';
        toggle.textContent = 'Already have an account? Sign in';
    } else {
        title.textContent = 'Sign In';
        submitBtn.textContent = 'Sign In';
        toggle.textContent = "Don't have an account? Sign up";
    }

    document.getElementById('authError').style.display = 'none';
    document.getElementById('authSuccess').style.display = 'none';

    return false; // Prevent default link behavior
}

// Handle authentication (sign in or sign up)
async function handleAuth() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorDiv = document.getElementById('authError');
    const successDiv = document.getElementById('authSuccess');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    if (!email || !password) {
        errorDiv.textContent = 'Please enter email and password';
        errorDiv.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
    }

    const submitBtn = document.getElementById('authSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';

    try {
        let result;

        if (authMode === 'signup') {
            result = await signUp(email, password);

            if (result.success) {
                successDiv.textContent = 'Account created! Check your email to verify.';
                successDiv.style.display = 'block';

                setTimeout(() => {
                    authMode = 'signin';
                    toggleAuthMode();
                }, 2000);
            } else {
                errorDiv.textContent = result.error || 'Sign up failed';
                errorDiv.style.display = 'block';
            }
        } else {
            result = await signIn(email, password);

            if (result.success) {
                successDiv.textContent = 'Signed in successfully!';
                successDiv.style.display = 'block';

                setTimeout(() => {
                    closeAuthModal();
                    updateAuthButton();
                }, 1000);
            } else {
                errorDiv.textContent = result.error || 'Sign in failed';
                errorDiv.style.display = 'block';
            }
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred';
        errorDiv.style.display = 'block';
        console.error('Auth error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = authMode === 'signin' ? 'Sign In' : 'Sign Up';
    }
}

// Handle sign out
async function handleSignOut() {
    const result = await signOut();

    if (result.success) {
        updateAuthButton();
        alert('Signed out successfully');
    } else {
        alert('Sign out failed: ' + result.error);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('authModal');
    if (event.target === modal) {
        closeAuthModal();
    }
};

// Update button on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to initialize
    setTimeout(updateAuthButton, 500);
});

// Listen for auth state changes from supabase-client.js
if (typeof supabaseClient !== 'undefined') {
    supabaseClient.auth.onAuthStateChange(() => {
        updateAuthButton();
    });
}
