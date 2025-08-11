/**
 * Core Loader
 * Loads and initializes all core modules in the correct order
 */
(function() {
    'use strict';

    /**
     * Core module loader
     */
    class CoreLoader {
        constructor() {
            this.modules = [];
            this.loadedModules = new Set();
            this.isLoading = false;
        }

        /**
         * Load all core modules
         */
        async loadCore() {
            if (this.isLoading) return;
            this.isLoading = true;

            try {
                console.log('[SafeCookie] Loading core modules...');

                // Define module loading order
                const moduleOrder = [
                    { name: 'HttpClient', file: '/js/core/http-client.js' },
                    { name: 'LoadingManager', file: '/js/core/loading-manager.js' },
                    { name: 'AnalysisAPI', file: '/js/core/api/analysis-api.js' },
                    { name: 'StatsAPI', file: '/js/core/api/stats-api.js' },
                    { name: 'APIClient', file: '/js/core/api-client.js' }
                ];

                // Load modules sequentially
                for (const module of moduleOrder) {
                    await this._loadModule(module);
                }

                console.log('[SafeCookie] Core modules loaded successfully');
                
                // Initialize application
                this._initializeApp();

            } catch (error) {
                console.error('[SafeCookie] Failed to load core modules:', error);
                this._handleLoadError(error);
            } finally {
                this.isLoading = false;
            }
        }

        /**
         * Load individual module
         * @private
         */
        async _loadModule(module) {
            if (this.loadedModules.has(module.name)) {
                return;
            }

            console.log(`[SafeCookie] Loading ${module.name}...`);

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = module.file;
                script.async = false;
                
                script.onload = () => {
                    // Verify module loaded
                    if (window[module.name]) {
                        this.loadedModules.add(module.name);
                        console.log(`[SafeCookie] ✓ ${module.name} loaded`);
                        resolve();
                    } else {
                        reject(new Error(`Module ${module.name} not found after loading`));
                    }
                };
                
                script.onerror = () => {
                    reject(new Error(`Failed to load ${module.file}`));
                };
                
                document.head.appendChild(script);
            });
        }

        /**
         * Initialize application after all modules loaded
         * @private
         */
        _initializeApp() {
            // Verify all required globals exist
            const requiredGlobals = ['apiClient', 'loadingManager'];
            const missing = requiredGlobals.filter(global => !window[global]);
            
            if (missing.length > 0) {
                throw new Error(`Missing required globals: ${missing.join(', ')}`);
            }

            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('safecookie:ready', {
                detail: {
                    version: '2.0.0',
                    modules: Array.from(this.loadedModules),
                    apiClient: window.apiClient
                }
            }));

            console.log('[SafeCookie] Application ready');
        }

        /**
         * Handle loading errors
         * @private
         */
        _handleLoadError(error) {
            console.error('[SafeCookie] Core loading failed:', error);
            
            // Show user-friendly error
            const errorMessage = document.createElement('div');
            errorMessage.className = 'core-load-error';
            errorMessage.innerHTML = `
                <div class="error-content">
                    <h3>Unable to load application</h3>
                    <p>Please refresh the page or check your internet connection.</p>
                    <button onclick="location.reload()" class="btn-primary">Refresh Page</button>
                </div>
            `;
            
            document.body.appendChild(errorMessage);
        }

        /**
         * Check if all modules are loaded
         */
        isReady() {
            return this.loadedModules.size > 0 && window.apiClient;
        }

        /**
         * Get loaded modules
         */
        getLoadedModules() {
            return Array.from(this.loadedModules);
        }
    }

    // Create global loader instance
    window.coreLoader = new CoreLoader();

    // Auto-load when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.coreLoader.loadCore();
        });
    } else {
        // DOM already loaded
        window.coreLoader.loadCore();
    }

})();
