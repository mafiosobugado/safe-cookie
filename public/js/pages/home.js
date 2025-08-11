/**
 * Home Page Main Controller
 * Orchestrates all home page functionality through modular components
 */

// Import home page components
// Note: In production, these would be loaded via script tags in the HTML
// or bundled together with a build system

class HomePage {
    constructor() {
        this.components = {};
        this.init();
    }

    /**
     * Initialize home page
     */
    init() {
        if (!this.isHomePage()) return;
        
        this.waitForDependencies().then(() => {
            this.initializeComponents();
            this.bindGlobalEvents();
        });
    }

    /**
     * Wait for required components to be loaded
     */
    async waitForDependencies() {
        const requiredClasses = [
            'HomeUrlForm',
            'HomeStatsCounter', 
            'HomeFeaturesSection',
            'HomeHeroSection',
            'HomeDemoSection'
        ];
        
        // Wait for all required classes to be available
        const checkInterval = 50;
        const maxWait = 5000;
        let waited = 0;
        
        while (waited < maxWait) {
            const allLoaded = requiredClasses.every(className => 
                window[className] && typeof window[className] === 'function'
            );
            
            if (allLoaded) {
                return Promise.resolve();
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        console.warn('Some home page components may not have loaded properly');
    }

    /**
     * Check if current page is home
     */
    isHomePage() {
        return document.body.classList.contains('page-home') || 
               window.location.pathname === '/' || 
               window.location.pathname === '/index.html';
    }

    /**
     * Initialize all home page components
     */
    initializeComponents() {
        // URL Analysis Form Component
        this.components.urlForm = new HomeUrlForm();
        
        // Make globally accessible
        window.homeUrlForm = this.components.urlForm;
        
        // Stats Counter Component
        this.components.stats = new HomeStatsCounter();
        
        // Features Section Component
        this.components.features = new HomeFeaturesSection();
        
        // Hero Section Component
        this.components.hero = new HomeHeroSection();
        
        // Demo Component
        this.components.demo = new HomeDemoSection();
    }

    /**
     * Bind global home page events
     */
    bindGlobalEvents() {
        // Listen for analysis events
        document.addEventListener('analysis:start', this.handleAnalysisStart.bind(this));
        document.addEventListener('analysis:success', this.handleAnalysisSuccess.bind(this));
        document.addEventListener('analysis:error', this.handleAnalysisError.bind(this));
        
        // Keyboard shortcuts
        this.bindKeyboardShortcuts();
    }

    /**
     * Handle analysis start
     */
    handleAnalysisStart(event) {
        const { url } = event.detail;
        console.log('Analysis started for:', url);
        
        // Update stats optimistically
        this.components.stats?.incrementAnalyzedCount();
    }

    /**
     * Handle analysis success
     */
    handleAnalysisSuccess(event) {
        const data = event.detail;
        console.log('Analysis completed:', data);
        
        // Could trigger celebration animation or update UI
        this.components.hero?.showSuccessState();
    }

    /**
     * Handle analysis error
     */
    handleAnalysisError(event) {
        const error = event.detail;
        console.error('Analysis failed:', error);
        
        // Could show global error notification
    }

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus URL input
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.components.urlForm?.focusInput();
            }
        });
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components[name];
    }

    /**
     * Destroy home page and cleanup
     */
    destroy() {
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        this.components = {};
    }
}

// Initialize home page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.homePage = new HomePage();
    });
} else {
    window.homePage = new HomePage();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomePage;
}
