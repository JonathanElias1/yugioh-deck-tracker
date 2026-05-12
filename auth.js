// Authentication check for all pages
(function() {
    const SESSION_KEY = 'yugioh_authenticated';
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    const checkAuth = () => {
        // Don't check auth on login page
        if (window.location.pathname.includes('login.html')) {
            return;
        }

        const authData = localStorage.getItem(SESSION_KEY);
        if (!authData) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const { timestamp } = JSON.parse(authData);
            const now = Date.now();

            if (now - timestamp >= SESSION_DURATION) {
                // Session expired
                localStorage.removeItem(SESSION_KEY);
                window.location.href = 'login.html';
                return;
            }
        } catch (e) {
            // Invalid auth data
            localStorage.removeItem(SESSION_KEY);
            window.location.href = 'login.html';
        }
    };

    // Check authentication
    checkAuth();

    // Add logout functionality
    window.logout = () => {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
    };
})();
