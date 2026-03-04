// Dark mode functionality
function setupDarkMode() {
    const body = document.body;

    // Check for saved preference in localStorage
    if (localStorage.getItem('darkMode') === 'enabled') {
        body.classList.add('dark-mode');
    }
}

// Toggle dark mode function
window.toggleDarkMode = function() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
    } else {
        localStorage.setItem('darkMode', 'disabled');
    }
    
    // Update all dark mode toggle buttons
    updateDarkModeToggleButtons();
};

// Update the visual state of all toggle buttons
function updateDarkModeToggleButtons() {
    const toggles = document.querySelectorAll('.dark-mode-toggle, .dark-mode-toggle-settings');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    toggles.forEach(toggle => {
        if (isDarkMode) {
            toggle.classList.add('active');
            // Update text if it's a settings button
            const textSpan = toggle.querySelector('.toggle-text');
            if (textSpan) {
                textSpan.textContent = 'On';
            }
        } else {
            toggle.classList.remove('active');
            // Update text if it's a settings button
            const textSpan = toggle.querySelector('.toggle-text');
            if (textSpan) {
                textSpan.textContent = 'Off';
            }
        }
    });
}

// Initial setup - run this when DOM is ready
function initDarkMode() {
    setupDarkMode();
    updateDarkModeToggleButtons();
}

// If DOM is already loaded, run immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
} else {
    initDarkMode();
}
