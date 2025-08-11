/**
 * Theme Management System
 * Manages theme switching and persistence across the application
 */
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || 'light';
        this.themes = ['light', 'dark', 'high-contrast'];
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        this.init();
    }

    /**
     * Initialize theme manager
     */
    init() {
        // Apply initial theme
        this.applyTheme(this.currentTheme);
        
        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', (e) => {
            if (this.currentTheme === 'auto') {
                this.applySystemTheme();
            }
        });

        // Listen for theme toggle events
        document.addEventListener('theme:toggle', (e) => {
            this.toggleTheme();
        });

        // Listen for specific theme change events
        document.addEventListener('theme:change', (e) => {
            if (e.detail && e.detail.theme) {
                this.setTheme(e.detail.theme);
            }
        });
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        try {
            return localStorage.getItem('safe-cookie-theme');
        } catch (error) {
            console.warn('Could not access localStorage for theme:', error);
            return null;
        }
    }

    /**
     * Store theme in localStorage
     */
    storeTheme(theme) {
        try {
            localStorage.setItem('safe-cookie-theme', theme);
        } catch (error) {
            console.warn('Could not store theme in localStorage:', error);
        }
    }

    /**
     * Set a specific theme
     */
    setTheme(theme) {
        if (!this.themes.includes(theme) && theme !== 'auto') {
            console.warn(`Invalid theme: ${theme}`);
            return;
        }

        this.currentTheme = theme;
        this.applyTheme(theme);
        this.storeTheme(theme);
        this.notifyThemeChange(theme);
    }

    /**
     * Toggle between themes
     */
    toggleTheme() {
        let nextTheme;
        
        switch (this.currentTheme) {
            case 'light':
                nextTheme = 'dark';
                break;
            case 'dark':
                nextTheme = 'light';
                break;
            case 'high-contrast':
                nextTheme = 'light';
                break;
            default:
                nextTheme = 'light';
        }

        this.setTheme(nextTheme);
    }

    /**
     * Apply theme to the document
     */
    applyTheme(theme) {
        const root = document.documentElement;
        
        // Remove all theme classes
        this.themes.forEach(t => {
            root.classList.remove(`theme-${t}`);
        });

        // Handle auto theme
        if (theme === 'auto') {
            this.applySystemTheme();
            return;
        }

        // Apply specific theme
        root.classList.add(`theme-${theme}`);
        root.setAttribute('data-theme', theme);

        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);
    }

    /**
     * Apply system preferred theme
     */
    applySystemTheme() {
        const systemTheme = this.mediaQuery.matches ? 'dark' : 'light';
        const root = document.documentElement;
        
        // Remove all theme classes
        this.themes.forEach(t => {
            root.classList.remove(`theme-${t}`);
        });

        root.classList.add(`theme-${systemTheme}`);
        root.setAttribute('data-theme', systemTheme);
        this.updateMetaThemeColor(systemTheme);
    }

    /**
     * Support for high contrast theme
     */
    setHighContrast(enabled) {
        if (enabled) {
            this.setTheme('high-contrast');
        } else {
            // Return to previous theme or default to light
            const previousTheme = this.getStoredTheme() || 'light';
            this.setTheme(previousTheme === 'high-contrast' ? 'light' : previousTheme);
        }
    }

    /**
     * Update meta theme-color for mobile browsers
     */
    updateMetaThemeColor(theme) {
        let themeColor;
        
        switch (theme) {
            case 'dark':
                themeColor = '#1a1a1a';
                break;
            case 'high-contrast':
                themeColor = '#000000';
                break;
            default:
                themeColor = '#ffffff';
        }

        // Update existing meta tag or create new one
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = themeColor;
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return [...this.themes, 'auto'];
    }

    /**
     * Check if current theme is dark
     */
    isDarkTheme() {
        if (this.currentTheme === 'auto') {
            return this.mediaQuery.matches;
        }
        return this.currentTheme === 'dark' || this.currentTheme === 'high-contrast';
    }

    /**
     * Check if high contrast is enabled
     */
    isHighContrast() {
        return this.currentTheme === 'high-contrast';
    }

    /**
     * Notify other components of theme change
     */
    notifyThemeChange(theme) {
        const event = new CustomEvent('theme:changed', {
            detail: { 
                theme,
                isDark: this.isDarkTheme(),
                isHighContrast: this.isHighContrast()
            }
        });
        document.dispatchEvent(event);
    }

    /**
     * Initialize theme toggle buttons
     */
    initThemeToggles() {
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTheme = button.dataset.themeToggle;
                
                if (targetTheme) {
                    this.setTheme(targetTheme);
                } else {
                    this.toggleTheme();
                }
                
                // Update button states
                this.updateToggleButtonStates();
            });
        });

        // Initial button state update
        this.updateToggleButtonStates();
    }

    /**
     * Update toggle button states
     */
    updateToggleButtonStates() {
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        
        toggleButtons.forEach(button => {
            const targetTheme = button.dataset.themeToggle;
            const isActive = targetTheme === this.currentTheme || 
                           (!targetTheme && this.currentTheme !== 'light');
            
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive.toString());
        });
    }

    /**
     * Create theme selector dropdown
     */
    createThemeSelector(container) {
        if (!container) return;

        const select = document.createElement('select');
        select.className = 'theme-selector';
        select.setAttribute('aria-label', 'Select theme');

        const themes = this.getAvailableThemes();
        themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = this.getThemeDisplayName(theme);
            option.selected = theme === this.currentTheme;
            select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });

        container.appendChild(select);
        return select;
    }

    /**
     * Get display name for theme
     */
    getThemeDisplayName(theme) {
        const names = {
            'light': 'Light',
            'dark': 'Dark',
            'high-contrast': 'High Contrast',
            'auto': 'Auto (System)'
        };
        return names[theme] || theme;
    }

    /**
     * Preload theme-specific assets
     */
    preloadThemeAssets(theme) {
        // This could be extended to preload theme-specific images, icons, etc.
        const themeSpecificAssets = {
            'dark': ['/images/dark-logo.png'],
            'light': ['/images/light-logo.png'],
            'high-contrast': ['/images/hc-logo.png']
        };

        const assets = themeSpecificAssets[theme];
        if (!assets) return;

        assets.forEach(assetUrl => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = assetUrl;
            link.as = 'image';
            document.head.appendChild(link);
        });
    }

    /**
     * Cleanup event listeners (useful for SPA)
     */
    destroy() {
        this.mediaQuery.removeEventListener('change', this.applySystemTheme);
        document.removeEventListener('theme:toggle', this.toggleTheme);
        document.removeEventListener('theme:change', this.setTheme);
    }
}

// Initialize theme manager when DOM is ready
let themeManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new ThemeManager();
        themeManager.initThemeToggles();
        
        // Make it globally available
        window.themeManager = themeManager;
    });
} else {
    themeManager = new ThemeManager();
    themeManager.initThemeToggles();
    
    // Make it globally available
    window.themeManager = themeManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
