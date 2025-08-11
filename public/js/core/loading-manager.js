/**
 * Loading Manager
 * Handles loading states for buttons and UI elements
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.loaderId = 0;
    }

    /**
     * Show loading state on button
     */
    showButtonLoader(button, options = {}) {
        if (!button) return null;

        const loaderId = ++this.loaderId;
        const config = {
            text: options.text || 'Loading...',
            spinner: options.spinner !== false,
            disable: options.disable !== false,
            ...options
        };

        // Store original state
        const originalState = {
            innerHTML: button.innerHTML,
            disabled: button.disabled,
            classList: Array.from(button.classList)
        };

        this.activeLoaders.set(loaderId, {
            element: button,
            originalState,
            config
        });

        // Apply loading state
        this._applyLoadingState(button, config);

        return loaderId;
    }

    /**
     * Hide loading state by loader ID
     */
    hideButtonLoader(loaderId) {
        if (!loaderId || !this.activeLoaders.has(loaderId)) return;

        const loader = this.activeLoaders.get(loaderId);
        this._restoreOriginalState(loader.element, loader.originalState);
        this.activeLoaders.delete(loaderId);
    }

    /**
     * Hide loading state by button element
     */
    hideButtonLoaderByElement(button) {
        for (const [loaderId, loader] of this.activeLoaders.entries()) {
            if (loader.element === button) {
                this.hideButtonLoader(loaderId);
                break;
            }
        }
    }

    /**
     * Show global loading overlay
     */
    showGlobalLoader(message = 'Loading...') {
        let overlay = document.getElementById('global-loading-overlay');
        
        if (!overlay) {
            overlay = this._createGlobalOverlay();
            document.body.appendChild(overlay);
        }

        const messageEl = overlay.querySelector('.loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }

        overlay.style.display = 'flex';
        document.body.classList.add('loading');

        return 'global-loader';
    }

    /**
     * Hide global loading overlay
     */
    hideGlobalLoader() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        document.body.classList.remove('loading');
    }

    /**
     * Apply loading state to button
     * @private
     */
    _applyLoadingState(button, config) {
        // Disable button
        if (config.disable) {
            button.disabled = true;
        }

        // Add loading class
        button.classList.add('btn-loading');

        // Create loading content
        const loadingHTML = this._createLoadingHTML(config);
        button.innerHTML = loadingHTML;
    }

    /**
     * Create loading HTML
     * @private
     */
    _createLoadingHTML(config) {
        let html = '';

        if (config.spinner) {
            html += '<span class="btn-spinner"></span>';
        }

        html += `<span class="btn-loading-text">${config.text}</span>`;

        return html;
    }

    /**
     * Restore original button state
     * @private
     */
    _restoreOriginalState(button, originalState) {
        button.innerHTML = originalState.innerHTML;
        button.disabled = originalState.disabled;
        
        // Restore classes
        button.className = '';
        originalState.classList.forEach(cls => {
            button.classList.add(cls);
        });
    }

    /**
     * Create global loading overlay
     * @private
     */
    _createGlobalOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'global-loading-overlay';
        overlay.className = 'loading-overlay';
        
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">Loading...</div>
            </div>
        `;

        return overlay;
    }

    /**
     * Clear all active loaders
     */
    clearAll() {
        for (const loaderId of this.activeLoaders.keys()) {
            this.hideButtonLoader(loaderId);
        }
        this.hideGlobalLoader();
    }

    /**
     * Get active loader count
     */
    getActiveCount() {
        return this.activeLoaders.size;
    }

    /**
     * Check if element has active loader
     */
    hasActiveLoader(element) {
        for (const loader of this.activeLoaders.values()) {
            if (loader.element === element) {
                return true;
            }
        }
        return false;
    }
}

// Create global instance
window.loadingManager = new LoadingManager();

// Make class available
window.LoadingManager = LoadingManager;
