/**
 * Global Functions
 * Functions that are called directly from HTML
 */

/**
 * Quick analyze function for demo buttons
 */
window.quickAnalyze = function(url) {
    console.log('[SafeCookie] Quick analyze triggered:', url);
    
    // Set URL in the form if available
    if (window.homeUrlForm && window.homeUrlForm.setUrl) {
        window.homeUrlForm.setUrl(url);
    } else {
        // Fallback: set directly in input
        const urlInput = document.getElementById('url-input');
        if (urlInput) {
            urlInput.value = url;
            urlInput.focus();
            
            // Trigger analyze button if available
            const analyzeBtn = document.getElementById('analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.click();
            }
        }
    }
};

/**
 * Initialize page function (called from layout)
 */
window.initPage = function() {
    console.log('[SafeCookie] Page initialization started');
    
    // Page-specific initialization can be added here
    const currentPage = document.body.className;
    
    switch (currentPage) {
        case 'home':
            console.log('[SafeCookie] Home page initialized');
            break;
        case 'analysis':
            console.log('[SafeCookie] Analysis page initialized');
            break;
        default:
            console.log('[SafeCookie] Default page initialized');
    }
};

/**
 * Handle global errors
 */
window.addEventListener('error', function(event) {
    console.error('[SafeCookie] Global error:', event.error);
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('[SafeCookie] Unhandled promise rejection:', event.reason);
});
