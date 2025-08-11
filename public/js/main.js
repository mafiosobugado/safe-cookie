/**
 * Safe Cookie Application Main Entry Point
 * Handles global initialization and coordination between all components
 */
class SafeCookieApp {
    constructor() {
        this.version = '2.0.0';
        this.environment = this.detectEnvironment();
        this.isInitialized = false;
        this.globalComponents = {};
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        if (this.isInitialized) return;
        
        console.log(`🍪 Safe Cookie v${this.version} - ${this.environment}`);
        
        this.setupGlobalErrorHandling();
        this.initializeGlobalComponents();
        this.bindGlobalEvents();
        this.setupServiceWorker();
        this.checkForUpdates();
        
        this.isInitialized = true;
        
        // Emit app ready event
        document.dispatchEvent(new CustomEvent('app:ready', {
            detail: { version: this.version, environment: this.environment }
        }));
    }

    /**
     * Detect application environment
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('staging') || hostname.includes('test')) {
            return 'staging';
        } else {
            return 'production';
        }
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleGlobalError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                type: 'unhandled_promise',
                message: event.reason?.message || 'Unhandled promise rejection',
                reason: event.reason
            });
        });

        // Handle API errors
        document.addEventListener('api:error', (event) => {
            this.handleApiError(event.detail);
        });
    }

    /**
     * Handle global errors
     */
    handleGlobalError(errorInfo) {
        console.error('Global error:', errorInfo);
        
        // In production, could send to error tracking service
        if (this.environment === 'production') {
            this.reportError(errorInfo);
        }
        
        // Show user-friendly error if it's critical
        if (this.isCriticalError(errorInfo)) {
            this.showCriticalErrorMessage();
        }
    }

    /**
     * Handle API errors
     */
    handleApiError(error) {
        console.warn('API error:', error);
        
        // Show appropriate user feedback based on error type
        if (error.status === 429) {
            this.showRateLimitMessage();
        } else if (error.status >= 500) {
            this.showServerErrorMessage();
        }
    }

    /**
     * Check if error is critical
     */
    isCriticalError(errorInfo) {
        const criticalErrors = [
            'Cannot read property',
            'Cannot read properties',
            'is not a function',
            'Network Error'
        ];
        
        return criticalErrors.some(pattern => 
            errorInfo.message?.includes(pattern)
        );
    }

    /**
     * Initialize global components
     */
    initializeGlobalComponents() {
        // Theme manager is already initialized
        this.globalComponents.theme = window.themeManager;
        
        // Loading manager is already initialized
        this.globalComponents.loading = window.loadingManager;
        
        // API client is already initialized
        this.globalComponents.api = window.apiClient;
        
        // Initialize notification system
        this.globalComponents.notifications = this.initializeNotifications();
        
        // Initialize keyboard shortcuts
        this.globalComponents.shortcuts = this.initializeKeyboardShortcuts();
        
        // Initialize performance monitoring
        this.globalComponents.performance = this.initializePerformanceMonitoring();
    }

    /**
     * Initialize notification system
     */
    initializeNotifications() {
        const notifications = {
            container: null,
            
            show: (message, type = 'info', duration = 3000) => {
                this.createNotification(message, type, duration);
            },
            
            success: (message, duration) => notifications.show(message, 'success', duration),
            error: (message, duration) => notifications.show(message, 'error', duration),
            warning: (message, duration) => notifications.show(message, 'warning', duration),
            info: (message, duration) => notifications.show(message, 'info', duration)
        };
        
        // Create notifications container
        notifications.container = document.createElement('div');
        notifications.container.className = 'notifications-container';
        document.body.appendChild(notifications.container);
        
        return notifications;
    }

    /**
     * Create notification
     */
    createNotification(message, type, duration) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Close">×</button>
            </div>
        `;
        
        // Add to container
        this.globalComponents.notifications.container.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto-hide
        const hideTimeout = setTimeout(() => {
            this.hideNotification(notification);
        }, duration);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(hideTimeout);
            this.hideNotification(notification);
        });
        
        return notification;
    }

    /**
     * Hide notification
     */
    hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Initialize keyboard shortcuts
     */
    initializeKeyboardShortcuts() {
        const shortcuts = {
            'ctrl+k': () => {
                // Focus URL input if on home page
                const urlInput = document.getElementById('url-input');
                if (urlInput) {
                    urlInput.focus();
                    urlInput.select();
                }
            },
            'ctrl+shift+t': () => {
                // Toggle theme
                if (this.globalComponents.theme) {
                    this.globalComponents.theme.toggleTheme();
                }
            },
            'escape': () => {
                // Close modals, dropdowns, etc.
                this.closeAllOverlays();
            }
        };
        
        document.addEventListener('keydown', (event) => {
            const key = this.getShortcutKey(event);
            const handler = shortcuts[key];
            
            if (handler) {
                event.preventDefault();
                handler(event);
            }
        });
        
        return shortcuts;
    }

    /**
     * Get shortcut key string
     */
    getShortcutKey(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('ctrl');
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        if (event.metaKey) parts.push('meta');
        
        const key = event.key.toLowerCase();
        if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
            parts.push(key);
        }
        
        return parts.join('+');
    }

    /**
     * Close all overlays
     */
    closeAllOverlays() {
        // Close modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
        
        // Close dropdowns
        const dropdowns = document.querySelectorAll('.dropdown.open');
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('open');
        });
        
        // Hide loading if dismissible
        if (this.globalComponents.loading?.isGlobalLoaderVisible()) {
            const config = this.globalComponents.loading.currentGlobalConfig;
            if (config?.dismissible) {
                this.globalComponents.loading.hideGlobalLoader();
            }
        }
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        const performance = {
            metrics: {},
            
            mark: (name) => {
                if (window.performance && window.performance.mark) {
                    window.performance.mark(name);
                }
            },
            
            measure: (name, startMark, endMark) => {
                if (window.performance && window.performance.measure) {
                    window.performance.measure(name, startMark, endMark);
                    
                    const measure = window.performance.getEntriesByName(name)[0];
                    if (measure) {
                        performance.metrics[name] = measure.duration;
                        console.log(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`);
                    }
                }
            }
        };
        
        // Mark app initialization
        performance.mark('app-init-start');
        
        // Measure when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                performance.mark('dom-ready');
                performance.measure('dom-load-time', 'navigationStart', 'dom-ready');
            });
        }
        
        // Measure when page is fully loaded
        window.addEventListener('load', () => {
            performance.mark('page-loaded');
            performance.measure('page-load-time', 'navigationStart', 'page-loaded');
            performance.measure('app-init-time', 'app-init-start', 'page-loaded');
        });
        
        return performance;
    }

    /**
     * Bind global events
     */
    bindGlobalEvents() {
        // Theme change events
        document.addEventListener('theme:changed', (event) => {
            console.log('Theme changed to:', event.detail.theme);
        });
        
        // Analysis events
        document.addEventListener('analysis:start', (event) => {
            this.globalComponents.notifications.info('Analysis started...');
        });
        
        document.addEventListener('analysis:success', (event) => {
            this.globalComponents.notifications.success('Analysis completed successfully!');
        });
        
        document.addEventListener('analysis:error', (event) => {
            this.globalComponents.notifications.error('Analysis failed. Please try again.');
        });
        
        // Online/offline events
        window.addEventListener('online', () => {
            this.globalComponents.notifications.success('Connection restored');
        });
        
        window.addEventListener('offline', () => {
            this.globalComponents.notifications.warning('Connection lost. Some features may not work.');
        });
    }

    /**
     * Setup service worker (for future PWA features)
     */
    setupServiceWorker() {
        if ('serviceWorker' in navigator && this.environment === 'production') {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    /**
     * Check for application updates
     */
    checkForUpdates() {
        // Simple version check (in real app, would check against server)
        const lastVersion = localStorage.getItem('app-version');
        
        if (lastVersion && lastVersion !== this.version) {
            this.showUpdateNotification();
        }
        
        localStorage.setItem('app-version', this.version);
    }

    /**
     * Show update notification
     */
    showUpdateNotification() {
        this.globalComponents.notifications.info(
            'Safe Cookie has been updated! New features and improvements are now available.',
            5000
        );
    }

    /**
     * Show critical error message
     */
    showCriticalErrorMessage() {
        this.globalComponents.notifications.error(
            'A critical error occurred. Please refresh the page.',
            10000
        );
    }

    /**
     * Show rate limit message
     */
    showRateLimitMessage() {
        this.globalComponents.notifications.warning(
            'Too many requests. Please wait a moment before trying again.',
            5000
        );
    }

    /**
     * Show server error message
     */
    showServerErrorMessage() {
        this.globalComponents.notifications.error(
            'Server error. Please try again later.',
            5000
        );
    }

    /**
     * Report error to tracking service
     */
    reportError(errorInfo) {
        // In production, would send to error tracking service like Sentry
        console.log('Error reported:', errorInfo);
    }

    /**
     * Get application info
     */
    getAppInfo() {
        return {
            version: this.version,
            environment: this.environment,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Destroy application
     */
    destroy() {
        Object.values(this.globalComponents).forEach(component => {
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        });
        
        this.globalComponents = {};
        this.isInitialized = false;
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.safeCookieApp = new SafeCookieApp();
    });
} else {
    window.safeCookieApp = new SafeCookieApp();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeCookieApp;
}
