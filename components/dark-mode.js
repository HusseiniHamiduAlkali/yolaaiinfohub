// Dark mode functionality
function setupDarkMode() {
    // Deprecated: use theme-switcher.js
    const theme = (window.getTheme && window.getTheme()) || localStorage.getItem('theme');
    if(theme === 'dark'){
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Toggle dark mode function
window.toggleDarkMode = function() {
    const isDark = document.body.classList.contains('dark-mode');
    // switch to the opposite theme
    if(window.setTheme){
        window.setTheme(isDark ? 'light' : 'dark');
    } else {
        // fallback
        document.body.classList.toggle('dark-mode');
    }
    updateDarkModeToggleButtons();
};

// Update the visual state of all toggle buttons
function updateDarkModeToggleButtons() {
    const toggles = document.querySelectorAll('.dark-mode-toggle, .dark-mode-toggle-settings');
    const theme = (window.getTheme && window.getTheme()) || localStorage.getItem('theme') || 'light';
    const isDarkMode = theme === 'dark';
    toggles.forEach(toggle => {
        if (isDarkMode) {
            toggle.classList.add('active');
            const textSpan = toggle.querySelector('.toggle-text');
            if (textSpan) textSpan.textContent = 'On';
        } else {
            toggle.classList.remove('active');
            const textSpan = toggle.querySelector('.toggle-text');
            if (textSpan) textSpan.textContent = 'Off';
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
