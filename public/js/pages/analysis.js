/**
 * Analysis Page Main Controller
 * Handles analysis results display and interactions
 */
class AnalysisPage {
    constructor() {
        this.components = {};
        this.analysisData = null;
        this.analysisId = null;
        
        this.init();
    }

    /**
     * Initialize analysis page
     */
    init() {
        if (!this.isAnalysisPage()) return;
        
        this.extractAnalysisId();
        this.initializeComponents();
        this.bindGlobalEvents();
        this.loadAnalysisData();
    }

    /**
     * Check if current page is analysis
     */
    isAnalysisPage() {
        return document.body.classList.contains('page-analysis') || 
               window.location.pathname.includes('/analysis/');
    }

    /**
     * Extract analysis ID from URL
     */
    extractAnalysisId() {
        const pathParts = window.location.pathname.split('/');
        const analysisIndex = pathParts.indexOf('analysis');
        
        if (analysisIndex !== -1 && pathParts[analysisIndex + 1]) {
            this.analysisId = pathParts[analysisIndex + 1];
        }
    }

    /**
     * Initialize all analysis page components
     */
    initializeComponents() {
        // Results Display Component
        this.components.results = new AnalysisResults();
        
        // Export Component
        this.components.export = new AnalysisExport();
        
        // Navigation Component
        this.components.navigation = new AnalysisNavigation();
        
        // Actions Component (re-analyze, share, etc.)
        this.components.actions = new AnalysisActions();
    }

    /**
     * Bind global analysis page events
     */
    bindGlobalEvents() {
        // Listen for data load events
        document.addEventListener('analysis:data:loaded', this.handleDataLoaded.bind(this));
        document.addEventListener('analysis:data:error', this.handleDataError.bind(this));
        
        // Listen for export events
        document.addEventListener('analysis:export:start', this.handleExportStart.bind(this));
        document.addEventListener('analysis:export:complete', this.handleExportComplete.bind(this));
        
        // Listen for re-analysis events
        document.addEventListener('analysis:rerun', this.handleRerun.bind(this));
    }

    /**
     * Load analysis data
     */
    async loadAnalysisData() {
        if (!this.analysisId) {
            this.handleNoAnalysisId();
            return;
        }

        try {
            // Show loading state
            window.loadingManager.showGlobalLoader({
                text: 'Loading analysis results...',
                type: 'spinner'
            });

            // Try to get from session storage first
            const sessionData = sessionStorage.getItem('currentAnalysis');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                if (data.analysisId === this.analysisId) {
                    this.handleDataLoaded({ detail: data });
                    window.loadingManager.hideGlobalLoader();
                    return;
                }
            }

            // Fetch from API
            const response = await window.apiClient.getAnalysis(this.analysisId);
            
            if (response.data) {
                this.analysisData = response.data;
                
                // Emit data loaded event
                document.dispatchEvent(new CustomEvent('analysis:data:loaded', {
                    detail: response.data
                }));
            } else {
                throw new Error('No analysis data received');
            }

        } catch (error) {
            console.error('Failed to load analysis data:', error);
            
            // Emit error event
            document.dispatchEvent(new CustomEvent('analysis:data:error', {
                detail: error
            }));
        } finally {
            window.loadingManager.hideGlobalLoader();
        }
    }

    /**
     * Handle analysis data loaded
     */
    handleDataLoaded(event) {
        this.analysisData = event.detail;
        console.log('Analysis data loaded:', this.analysisData);
        
        // Update page title
        this.updatePageTitle();
        
        // Update components
        Object.values(this.components).forEach(component => {
            if (component && typeof component.updateData === 'function') {
                component.updateData(this.analysisData);
            }
        });
    }

    /**
     * Handle analysis data error
     */
    handleDataError(event) {
        const error = event.detail;
        console.error('Analysis data error:', error);
        
        // Show error message
        this.showErrorMessage(error);
    }

    /**
     * Handle no analysis ID
     */
    handleNoAnalysisId() {
        this.showErrorMessage({
            message: 'No analysis ID provided. Please start a new analysis.',
            redirectUrl: '/',
            redirectText: 'Go to Home'
        });
    }

    /**
     * Handle export start
     */
    handleExportStart(event) {
        const { format } = event.detail;
        console.log('Export started:', format);
    }

    /**
     * Handle export complete
     */
    handleExportComplete(event) {
        const { format, url } = event.detail;
        console.log('Export completed:', format, url);
        
        // Could show success notification
        this.showSuccessMessage(`Analysis exported as ${format.toUpperCase()}`);
    }

    /**
     * Handle analysis rerun
     */
    async handleRerun(event) {
        const { url } = event.detail;
        
        if (!url) {
            console.error('No URL provided for rerun');
            return;
        }

        try {
            // Show loading
            window.loadingManager.showGlobalLoader({
                text: 'Re-analyzing URL...',
                type: 'spinner'
            });

            // Start new analysis
            const response = await window.apiClient.analyzeUrl(url);
            
            if (response.data?.analysisId) {
                // Redirect to new analysis
                window.location.href = `/analysis/${response.data.analysisId}`;
            } else {
                throw new Error('Failed to start new analysis');
            }

        } catch (error) {
            console.error('Rerun failed:', error);
            this.showErrorMessage(error);
            window.loadingManager.hideGlobalLoader();
        }
    }

    /**
     * Update page title
     */
    updatePageTitle() {
        if (!this.analysisData?.url) return;
        
        try {
            const urlObj = new URL(this.analysisData.url);
            document.title = `Analysis Results - ${urlObj.hostname} | Safe Cookie`;
            
            // Update page heading if exists
            const pageHeading = document.querySelector('.page-title, .analysis-title');
            if (pageHeading) {
                pageHeading.textContent = `Analysis Results for ${urlObj.hostname}`;
            }
        } catch (e) {
            document.title = 'Analysis Results | Safe Cookie';
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(error) {
        const errorContainer = this.createMessageContainer('error');
        
        let message = 'An error occurred while loading the analysis.';
        let actions = '';
        
        if (typeof error === 'object') {
            message = error.message || message;
            
            if (error.redirectUrl) {
                actions = `<a href="${error.redirectUrl}" class="btn btn-primary">${error.redirectText || 'Continue'}</a>`;
            }
        } else if (typeof error === 'string') {
            message = error;
        }
        
        errorContainer.innerHTML = `
            <div class="alert alert-danger">
                <div class="alert-content">
                    <h4>Error</h4>
                    <p>${message}</p>
                    ${actions}
                </div>
            </div>
        `;
        
        this.showMessageContainer(errorContainer);
    }

    /**
     * Show success message
     */
    showSuccessMessage(message) {
        const successContainer = this.createMessageContainer('success');
        
        successContainer.innerHTML = `
            <div class="alert alert-success">
                <div class="alert-content">
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        this.showMessageContainer(successContainer);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successContainer.remove();
        }, 3000);
    }

    /**
     * Create message container
     */
    createMessageContainer(type) {
        const container = document.createElement('div');
        container.className = `message-container message-${type}`;
        return container;
    }

    /**
     * Show message container
     */
    showMessageContainer(container) {
        // Remove existing messages of same type
        const existing = document.querySelector(`.${container.className}`);
        if (existing) {
            existing.remove();
        }
        
        // Add to page
        const main = document.querySelector('main, .main-content');
        if (main) {
            main.insertBefore(container, main.firstChild);
        } else {
            document.body.appendChild(container);
        }
        
        // Animate in
        setTimeout(() => {
            container.classList.add('show');
        }, 100);
    }

    /**
     * Get analysis data
     */
    getAnalysisData() {
        return this.analysisData;
    }

    /**
     * Get analysis ID
     */
    getAnalysisId() {
        return this.analysisId;
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components[name];
    }

    /**
     * Refresh analysis data
     */
    async refreshData() {
        // Clear session storage
        sessionStorage.removeItem('currentAnalysis');
        
        // Reload data
        await this.loadAnalysisData();
    }

    /**
     * Destroy analysis page and cleanup
     */
    destroy() {
        Object.values(this.components).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        this.components = {};
        this.analysisData = null;
    }
}

// Initialize analysis page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analysisPage = new AnalysisPage();
    });
} else {
    window.analysisPage = new AnalysisPage();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnalysisPage;
}
