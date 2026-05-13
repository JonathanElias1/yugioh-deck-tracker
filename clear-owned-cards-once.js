// One-time script to clear all owned cards checkboxes
// This will run once per browser and then never again

(function() {
    const clearFlagKey = 'ownedCardsCleared_2026_05_13';

    // Check if we've already cleared
    if (localStorage.getItem(clearFlagKey)) {
        console.log('✅ Owned cards already cleared previously');
        return;
    }

    console.log('🔄 Clearing all owned cards checkboxes...');

    let cleared = 0;

    // Clear all localStorage keys related to owned cards
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('ownedCards_') ||
                    key.startsWith('removedCards_') ||
                    key.startsWith('customCards_'))) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleared++;
    });

    // Set flag so we don't clear again
    localStorage.setItem(clearFlagKey, 'true');

    console.log(`✅ Cleared ${cleared} owned card entries`);
    console.log('📝 You can now manually check off cards as you organize them!');

    // Show a brief notification to the user
    if (cleared > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #27ae60, #229954);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            animation: slideIn 0.5s ease-out;
        `;
        notification.innerHTML = `
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">✅ Checkboxes Reset!</div>
            <div style="font-size: 14px;">You can now manually check off cards as you organize them.</div>
        `;

        document.body.appendChild(notification);

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        // Remove notification after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
    }
})();
