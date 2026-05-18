// Supabase Client Configuration
const SUPABASE_URL = 'https://bfkkxpprhzysupqitspt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJma2t4cHByaHp5c3VwcWl0c3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjQ3NzEsImV4cCI6MjA5Mzc0MDc3MX0.GrTg6injuBsbYWuq62nz0P0GYW8uSTl6PygF1RZVBpg';

// Auto-login credentials
const AUTO_LOGIN_EMAIL = 'jonathanelias3223@gmail.com';
const AUTO_LOGIN_PASSWORD = 'admin12345';

// Production URL for email redirects
const SITE_URL = 'https://jonathanelias1.github.io/yugioh-deck-tracker';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global auth state
let currentUser = null;

// Initialize auth state
async function initAuth() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();

        if (error) throw error;

        if (session) {
            currentUser = session.user;
            console.log('✅ User authenticated:', currentUser.email);
            return currentUser;
        } else {
            console.log('ℹ️ No active session, attempting auto-login...');
            // Auto-login with hardcoded credentials
            const loginResult = await signIn(AUTO_LOGIN_EMAIL, AUTO_LOGIN_PASSWORD);
            if (loginResult.success) {
                console.log('✅ Auto-login successful');
                return loginResult.user;
            } else {
                console.log('ℹ️ Auto-login failed (account may not exist yet):', loginResult.error);
                return null;
            }
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        return null;
    }
}

// Listen for auth changes
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);

    if (session) {
        currentUser = session.user;
        console.log('✅ User signed in:', currentUser.email);

        // Sync local data to Supabase when user signs in
        // Only syncs if there's local data to push (doesn't reload page)
        if (window.deckSync && event === 'SIGNED_IN') {
            window.deckSync.syncAllDecks();
        }
    } else {
        currentUser = null;
        console.log('ℹ️ User signed out');
    }
});

// Sign in with email/password
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

// Sign up with email/password
async function signUp(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: `${SITE_URL}/index.html`
            }
        });

        if (error) throw error;

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

// Sign out
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// Send password reset email
async function resetPassword(email) {
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${SITE_URL}/index.html`
        });

        if (error) throw error;

        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: error.message };
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Auto-initialize disabled - called from deck-sync.js instead
// if (typeof window !== 'undefined') {
//     window.addEventListener('DOMContentLoaded', () => {
//         initAuth();
//     });
// }
