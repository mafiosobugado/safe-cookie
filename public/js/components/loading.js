/**
 * Loading Manager
 * Handles all loading states and animations throughout the application
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.loadingOverlay = null;
        this.defaultConfig = {
            type: 'spinner', // spinner, progress, skeleton, dots
            size: 'medium', // small, medium, large
            color: 'primary',
            text: 'Loading...',
            backdrop: true,
            dismissible: false,
            timeout: null
        };
        
        this.init();
    }

    /**
     * Initialize loading manager
     */
    init() {
        this.createLoadingOverlay();
        this.bindEvents();
    }

    /**
     * Create global loading overlay
     */
    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.className = 'loading-overlay';
        this.loadingOverlay.innerHTML = `
            <div class="loading-backdrop"></div>
            <div class="loading-content">
                <div class="loading-spinner loading-spinner--large">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="loading-text"></div>
                <div class="loading-progress" style="display: none;">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">0%</div>
                </div>
            </div>
        `;
        
        // Add to body but keep hidden
        document.body.appendChild(this.loadingOverlay);
        this.hideGlobalLoader();
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Listen for global loading events
        document.addEventListener('loading:show', (e) => {
            this.showGlobalLoader(e.detail);
        });

        document.addEventListener('loading:hide', (e) => {
            this.hideGlobalLoader(e.detail?.id);
        });

        document.addEventListener('loading:progress', (e) => {
            this.updateProgress(e.detail.progress, e.detail.text);
        });

        // Listen for API request events
        document.addEventListener('api:request:start', () => {
            this.showGlobalLoader({
                text: 'Analyzing URL...',
                type: 'spinner'
            });
        });

        document.addEventListener('api:request:end', () => {
            this.hideGlobalLoader();
        });

        // ESC key to dismiss if dismissible
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGlobalLoaderVisible()) {
                const config = this.currentGlobalConfig;
                if (config && config.dismissible) {
                    this.hideGlobalLoader();
                }
            }
        });
    }

    /**
     * Show global loading overlay
     */
    showGlobalLoader(config = {}) {
        const finalConfig = { ...this.defaultConfig, ...config };
        this.currentGlobalConfig = finalConfig;

        // Update loading content
        this.updateLoadingContent(finalConfig);
        
        // Show overlay
        this.loadingOverlay.classList.add('active');
        document.body.classList.add('loading-active');

        // Auto-hide if timeout is set
        if (finalConfig.timeout) {
            setTimeout(() => {
                this.hideGlobalLoader();
            }, finalConfig.timeout);
        }

        // Emit event
        document.dispatchEvent(new CustomEvent('loading:shown', {
            detail: finalConfig
        }));

        return this.generateLoaderId();
    }

    /**
     * Hide global loading overlay
     */
    hideGlobalLoader(id = null) {
        // If specific ID provided, only hide if it matches current
        if (id && this.currentGlobalId !== id) {
            return;
        }

        this.loadingOverlay.classList.remove('active');
        document.body.classList.remove('loading-active');
        this.currentGlobalConfig = null;
        this.currentGlobalId = null;

        // Reset progress
        this.updateProgress(0);

        // Emit event
        document.dispatchEvent(new CustomEvent('loading:hidden'));
    }

    /**
     * Check if global loader is visible
     */
    isGlobalLoaderVisible() {
        return this.loadingOverlay.classList.contains('active');
    }

    /**
     * Update loading content based on config
     */
    updateLoadingContent(config) {
        const content = this.loadingOverlay.querySelector('.loading-content');
        const spinner = content.querySelector('.loading-spinner');
        const text = content.querySelector('.loading-text');
        const progress = content.querySelector('.loading-progress');

        // Update spinner type and size
        spinner.className = `loading-spinner loading-spinner--${config.size}`;
        
        if (config.type === 'dots') {
            spinner.innerHTML = `
                <div class="loading-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
        } else if (config.type === 'progress') {
            spinner.style.display = 'none';
            progress.style.display = 'block';
        } else {
            spinner.innerHTML = `
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">${config.text}</span>
                </div>
            `;
        }

        // Update text
        text.textContent = config.text;
        text.style.display = config.text ? 'block' : 'none';

        // Update backdrop
        const backdrop = this.loadingOverlay.querySelector('.loading-backdrop');
        backdrop.style.display = config.backdrop ? 'block' : 'none';

        // Update color theme
        content.setAttribute('data-loading-color', config.color);
    }

    /**
     * Update progress for progress-type loaders
     */
    updateProgress(percentage, text = null) {
        const progressBar = this.loadingOverlay.querySelector('.progress-bar');
        const progressText = this.loadingOverlay.querySelector('.progress-text');
        const loadingText = this.loadingOverlay.querySelector('.loading-text');

        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }

        if (progressText) {
            progressText.textContent = `${Math.round(percentage)}%`;
        }

        if (text && loadingText) {
            loadingText.textContent = text;
        }
    }

    /**
     * Show inline loader for specific element
     */
    showInlineLoader(element, config = {}) {
        if (!element) return null;

        const finalConfig = { ...this.defaultConfig, ...config };
        const loaderId = this.generateLoaderId();

        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }

        // Create loader HTML
        const loaderHTML = this.createLoaderHTML(finalConfig);
        
        // Add loading class and replace content
        element.classList.add('loading');
        element.innerHTML = loaderHTML;
        element.setAttribute('data-loader-id', loaderId);

        // Store in active loaders
        this.activeLoaders.add({
            id: loaderId,
            element,
            config: finalConfig,
            type: 'inline'
        });

        return loaderId;
    }

    /**
     * Hide inline loader
     */
    hideInlineLoader(elementOrId) {
        let element, loaderId;

        if (typeof elementOrId === 'string') {
            // Find by loader ID
            const loader = Array.from(this.activeLoaders).find(l => l.id === elementOrId);
            if (loader) {
                element = loader.element;
                loaderId = elementOrId;
            }
        } else {
            // Direct element reference
            element = elementOrId;
            loaderId = element?.getAttribute('data-loader-id');
        }

        if (!element || !loaderId) return;

        // Restore original content
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }

        // Remove loading state
        element.classList.remove('loading');
        element.removeAttribute('data-loader-id');

        // Remove from active loaders
        this.activeLoaders.forEach(loader => {
            if (loader.id === loaderId) {
                this.activeLoaders.delete(loader);
            }
        });
    }

    /**
     * Show skeleton loader for content area
     */
    showSkeletonLoader(element, config = {}) {
        if (!element) return null;

        const finalConfig = {
            lines: 3,
            animation: 'pulse',
            ...config
        };

        const loaderId = this.generateLoaderId();
        
        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }

        // Create skeleton HTML
        const skeletonHTML = this.createSkeletonHTML(finalConfig);
        
        element.classList.add('skeleton-loading');
        element.innerHTML = skeletonHTML;
        element.setAttribute('data-loader-id', loaderId);

        // Store in active loaders
        this.activeLoaders.add({
            id: loaderId,
            element,
            config: finalConfig,
            type: 'skeleton'
        });

        return loaderId;
    }

    /**
     * Create loader HTML based on type
     */
    createLoaderHTML(config) {
        const sizeClass = `loading-${config.size}`;
        const colorClass = `loading-${config.color}`;

        switch (config.type) {
            case 'dots':
                return `
                    <div class="loading-dots ${sizeClass} ${colorClass}">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                    ${config.text ? `<span class="loading-text">${config.text}</span>` : ''}
                `;

            case 'progress':
                return `
                    <div class="loading-progress ${sizeClass}">
                        <div class="progress">
                            <div class="progress-bar ${colorClass}" role="progressbar" style="width: 0%"></div>
                        </div>
                        ${config.text ? `<span class="loading-text">${config.text}</span>` : ''}
                    </div>
                `;

            default: // spinner
                return `
                    <div class="loading-spinner ${sizeClass}">
                        <div class="spinner-border ${colorClass}" role="status">
                            <span class="visually-hidden">${config.text}</span>
                        </div>
                        ${config.text ? `<span class="loading-text">${config.text}</span>` : ''}
                    </div>
                `;
        }
    }

    /**
     * Create skeleton HTML
     */
    createSkeletonHTML(config) {
        const lines = Array.from({ length: config.lines }, (_, i) => {
            const width = i === config.lines - 1 ? '60%' : '100%';
            return `<div class="skeleton-line" style="width: ${width}"></div>`;
        }).join('');

        return `
            <div class="skeleton-loader skeleton-${config.animation}">
                ${lines}
            </div>
        `;
    }

    /**
     * Show button loading state
     */
    showButtonLoader(button, config = {}) {
        if (!button) return null;

        const finalConfig = {
            text: 'Loading...',
            disableButton: true,
            ...config
        };

        const loaderId = this.generateLoaderId();

        // Store original state
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
            button.dataset.originalDisabled = button.disabled;
        }

        // Update button
        button.classList.add('btn-loading');
        button.innerHTML = `
            <span class="loading-spinner loading-small">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </span>
            <span class="loading-text">${finalConfig.text}</span>
        `;

        if (finalConfig.disableButton) {
            button.disabled = true;
        }

        button.setAttribute('data-loader-id', loaderId);

        // Store in active loaders
        this.activeLoaders.add({
            id: loaderId,
            element: button,
            config: finalConfig,
            type: 'button'
        });

        return loaderId;
    }

    /**
     * Hide button loading state
     */
    hideButtonLoader(buttonOrId) {
        let button, loaderId;

        if (typeof buttonOrId === 'string') {
            const loader = Array.from(this.activeLoaders).find(l => l.id === buttonOrId);
            if (loader) {
                button = loader.element;
                loaderId = buttonOrId;
            }
        } else {
            button = buttonOrId;
            loaderId = button?.getAttribute('data-loader-id');
        }

        if (!button || !loaderId) return;

        // Restore original state
        button.classList.remove('btn-loading');
        
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }

        if (button.dataset.originalDisabled !== undefined) {
            button.disabled = button.dataset.originalDisabled === 'true';
            delete button.dataset.originalDisabled;
        }

        button.removeAttribute('data-loader-id');

        // Remove from active loaders
        this.activeLoaders.forEach(loader => {
            if (loader.id === loaderId) {
                this.activeLoaders.delete(loader);
            }
        });
    }

    /**
     * Generate unique loader ID
     */
    generateLoaderId() {
        return `loader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Hide all active loaders
     */
    hideAllLoaders() {
        // Hide global loader
        this.hideGlobalLoader();

        // Hide all inline loaders
        this.activeLoaders.forEach(loader => {
            if (loader.type === 'inline' || loader.type === 'skeleton') {
                this.hideInlineLoader(loader.id);
            } else if (loader.type === 'button') {
                this.hideButtonLoader(loader.id);
            }
        });
    }

    /**
     * Get active loaders count
     */
    getActiveLoadersCount() {
        return this.activeLoaders.size + (this.isGlobalLoaderVisible() ? 1 : 0);
    }

    /**
     * Check if any loader is active
     */
    hasActiveLoaders() {
        return this.getActiveLoadersCount() > 0;
    }

    /**
     * Create loading wrapper for async functions
     */
    withLoading(asyncFn, config = {}) {
        return async (...args) => {
            const loaderId = this.showGlobalLoader(config);
            try {
                const result = await asyncFn(...args);
                return result;
            } finally {
                this.hideGlobalLoader(loaderId);
            }
        };
    }

    /**
     * Create loading wrapper for button clicks
     */
    withButtonLoading(button, asyncFn, config = {}) {
        return async (...args) => {
            const loaderId = this.showButtonLoader(button, config);
            try {
                const result = await asyncFn(...args);
                return result;
            } finally {
                this.hideButtonLoader(loaderId);
            }
        };
    }

    /**
     * Simulate progress (useful for fake progress indicators)
     */
    simulateProgress(duration = 3000, callback = null) {
        return new Promise((resolve) => {
            let progress = 0;
            const increment = 100 / (duration / 100);
            
            const interval = setInterval(() => {
                progress += increment;
                
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    setTimeout(() => {
                        resolve(100);
                    }, 200);
                }
                
                this.updateProgress(progress);
                
                if (callback) {
                    callback(progress);
                }
            }, 100);
        });
    }

    /**
     * Destroy loading manager
     */
    destroy() {
        this.hideAllLoaders();
        
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
            this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
        
        document.body.classList.remove('loading-active');
        this.activeLoaders.clear();
    }
}

// Create global loading manager instance
const loadingManager = new LoadingManager();

// Make it globally available
window.loadingManager = loadingManager;

// Convenience methods for global access
window.showLoader = (config) => loadingManager.showGlobalLoader(config);
window.hideLoader = (id) => loadingManager.hideGlobalLoader(id);
window.showProgress = (progress, text) => loadingManager.updateProgress(progress, text);

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingManager;
}
