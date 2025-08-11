/**
 * Loading Spinner Component
 * Manages loading states and animations
 */
class LoadingSpinner {
    constructor() {
        this.overlay = null;
        this.isVisible = false;
        this.init();
    }

    /**
     * Initialize loading spinner
     */
    init() {
        this.overlay = DOM.get('loading-overlay');
        if (!this.overlay) {
            this.createOverlay();
        }
    }

    /**
     * Create loading overlay if it doesn't exist
     */
    createOverlay() {
        this.overlay = DOM.create('div', {
            id: 'loading-overlay',
            class: 'loading-overlay hidden'
        }, `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p class="loading-text">Carregando...</p>
            </div>
        `);

        document.body.appendChild(this.overlay);
    }

    /**
     * Show loading spinner
     */
    show(message = 'Carregando...') {
        if (!this.overlay) {
            this.createOverlay();
        }

        const textElement = this.overlay.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }

        DOM.removeClass(this.overlay, 'hidden');
        this.isVisible = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Emit event
        Events.trigger(document, 'loading:show', { message });
    }

    /**
     * Hide loading spinner
     */
    hide() {
        if (this.overlay) {
            DOM.addClass(this.overlay, 'hidden');
        }

        this.isVisible = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Emit event
        Events.trigger(document, 'loading:hide');
    }

    /**
     * Update loading message
     */
    updateMessage(message) {
        if (this.overlay) {
            const textElement = this.overlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    /**
     * Check if loading is visible
     */
    get visible() {
        return this.isVisible;
    }
}

/**
 * Button Loading State Manager
 */
class ButtonLoader {
    constructor(button) {
        this.button = button;
        this.originalText = button.textContent;
        this.originalDisabled = button.disabled;
        this.isLoading = false;
    }

    /**
     * Start loading state
     */
    start(loadingText = 'Carregando...') {
        if (this.isLoading) return;

        this.isLoading = true;
        this.button.disabled = true;
        
        // Hide normal text, show loading text
        const textSpan = this.button.querySelector('.btn-text');
        const loadingSpan = this.button.querySelector('.btn-loading');
        
        if (textSpan && loadingSpan) {
            DOM.addClass(textSpan, 'hidden');
            DOM.removeClass(loadingSpan, 'hidden');
        } else {
            this.button.textContent = loadingText;
        }

        DOM.addClass(this.button, 'loading');
    }

    /**
     * Stop loading state
     */
    stop() {
        if (!this.isLoading) return;

        this.isLoading = false;
        this.button.disabled = this.originalDisabled;
        
        // Show normal text, hide loading text
        const textSpan = this.button.querySelector('.btn-text');
        const loadingSpan = this.button.querySelector('.btn-loading');
        
        if (textSpan && loadingSpan) {
            DOM.removeClass(textSpan, 'hidden');
            DOM.addClass(loadingSpan, 'hidden');
        } else {
            this.button.textContent = this.originalText;
        }

        DOM.removeClass(this.button, 'loading');
    }

    /**
     * Check if button is loading
     */
    get loading() {
        return this.isLoading;
    }
}

/**
 * Progress Bar Component
 */
class ProgressBar {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? DOM.get(container) : container;
        this.options = {
            showPercentage: true,
            showLabel: true,
            animated: true,
            ...options
        };
        
        this.progress = 0;
        this.label = '';
        this.init();
    }

    /**
     * Initialize progress bar
     */
    init() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="progress-bar">
                ${this.options.showLabel ? '<div class="progress-label"></div>' : ''}
                <div class="progress-track">
                    <div class="progress-fill ${this.options.animated ? 'animated' : ''}"></div>
                </div>
                ${this.options.showPercentage ? '<div class="progress-percentage">0%</div>' : ''}
            </div>
        `;

        this.fillElement = this.container.querySelector('.progress-fill');
        this.labelElement = this.container.querySelector('.progress-label');
        this.percentageElement = this.container.querySelector('.progress-percentage');
    }

    /**
     * Update progress
     */
    update(progress, label = '') {
        this.progress = Math.max(0, Math.min(100, progress));
        this.label = label;

        if (this.fillElement) {
            this.fillElement.style.width = `${this.progress}%`;
        }

        if (this.labelElement && label) {
            this.labelElement.textContent = label;
        }

        if (this.percentageElement) {
            this.percentageElement.textContent = `${Math.round(this.progress)}%`;
        }

        // Emit event
        Events.trigger(this.container, 'progress:update', {
            progress: this.progress,
            label: this.label
        });
    }

    /**
     * Reset progress
     */
    reset() {
        this.update(0, '');
    }

    /**
     * Complete progress
     */
    complete(label = 'Concluído') {
        this.update(100, label);
    }
}

/**
 * Skeleton Loader Component
 */
class SkeletonLoader {
    constructor(container, config = {}) {
        this.container = typeof container === 'string' ? DOM.get(container) : container;
        this.config = {
            lines: 3,
            animated: true,
            ...config
        };
    }

    /**
     * Show skeleton
     */
    show() {
        if (!this.container) return;

        const skeletonHTML = Array(this.config.lines).fill(0).map((_, index) => 
            `<div class="skeleton-line ${this.config.animated ? 'animated' : ''}" style="width: ${Math.random() * 40 + 60}%"></div>`
        ).join('');

        this.container.innerHTML = `<div class="skeleton-loader">${skeletonHTML}</div>`;
        DOM.addClass(this.container, 'skeleton-loading');
    }

    /**
     * Hide skeleton
     */
    hide() {
        if (!this.container) return;

        DOM.removeClass(this.container, 'skeleton-loading');
    }
}

/**
 * Global Loading Manager
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.globalSpinner = new LoadingSpinner();
    }

    /**
     * Register a loader
     */
    register(id) {
        this.activeLoaders.add(id);
        this.updateGlobalState();
    }

    /**
     * Unregister a loader
     */
    unregister(id) {
        this.activeLoaders.delete(id);
        this.updateGlobalState();
    }

    /**
     * Update global loading state
     */
    updateGlobalState() {
        if (this.activeLoaders.size > 0) {
            if (!this.globalSpinner.visible) {
                this.globalSpinner.show();
            }
        } else {
            if (this.globalSpinner.visible) {
                this.globalSpinner.hide();
            }
        }
    }

    /**
     * Check if any loader is active
     */
    get isLoading() {
        return this.activeLoaders.size > 0;
    }

    /**
     * Get active loaders count
     */
    get count() {
        return this.activeLoaders.size;
    }
}

// Create global instances
const loadingManager = new LoadingManager();

// Helper functions
function showLoading(message) {
    loadingManager.globalSpinner.show(message);
}

function hideLoading() {
    loadingManager.globalSpinner.hide();
}

function createButtonLoader(button) {
    return new ButtonLoader(button);
}

function createProgressBar(container, options) {
    return new ProgressBar(container, options);
}

function createSkeletonLoader(container, config) {
    return new SkeletonLoader(container, config);
}

// Make classes globally available
window.LoadingSpinner = LoadingSpinner;
window.ButtonLoader = ButtonLoader;
window.ProgressBar = ProgressBar;
window.SkeletonLoader = SkeletonLoader;
window.LoadingManager = LoadingManager;

// Make helper functions globally available
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.createButtonLoader = createButtonLoader;
window.createProgressBar = createProgressBar;
window.createSkeletonLoader = createSkeletonLoader;
window.loadingManager = loadingManager;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LoadingSpinner,
        ButtonLoader,
        ProgressBar,
        SkeletonLoader,
        LoadingManager,
        showLoading,
        hideLoading,
        createButtonLoader,
        createProgressBar,
        createSkeletonLoader
    };
}
