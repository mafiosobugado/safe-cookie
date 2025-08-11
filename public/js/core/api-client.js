/**
 * Main API Client
 * Orchestrates all API modules and provides unified interface
 */
class APIClient {
    constructor(config = {}) {
        // Initialize HTTP client
        this.http = new HttpClient({
            baseURL: config.baseURL || '',
            timeout: config.timeout || 30000,
            retries: config.retries || 2,
            headers: config.headers || {}
        });

        // Initialize API modules
        this.analysis = new AnalysisAPI(this.http);
        this.stats = new StatsAPI(this.http);
        
        // Configuration
        this.config = {
            enableLogging: config.enableLogging !== false,
            enableRetries: config.enableRetries !== false,
            enableCache: config.enableCache !== false,
            ...config
        };

        // Initialize
        this._setupErrorHandling();
        this._setupLogging();
    }

    /**
     * Main analysis method (primary interface)
     */
    async analyzeUrl(url, options = {}) {
        this._log('info', 'Starting URL analysis', { url, options });
        
        try {
            const result = await this.analysis.analyzeUrl(url, options);
            
            this._log('success', 'Raw API response', { 
                url, 
                hasData: !!result.data,
                status: result.status,
                dataKeys: result.data ? Object.keys(result.data) : []
            });
            
            // Update stats optimistically
            if (this.config.enableCache) {
                this.stats.updateStatsOptimistic('analyzed', 1);
            }
            
            this._log('success', 'Analysis completed', { url, score: result.data?.score });
            return result;
        } catch (error) {
            this._log('error', 'Analysis failed', { url, error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * Get application statistics
     */
    async getStats(useCache = true) {
        this._log('info', 'Fetching stats', { useCache });
        
        try {
            const result = await this.stats.getStats(useCache);
            this._log('success', 'Stats loaded', { count: Object.keys(result.data || {}).length });
            return result;
        } catch (error) {
            this._log('warn', 'Stats loading failed, using fallback', { error: error.message });
            throw error;
        }
    }

    /**
     * Quick URL validation and check
     */
    async checkUrl(url) {
        this._log('info', 'Quick URL check', { url });
        
        // Validate first
        const validation = this.analysis.validateUrl(url);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        try {
            const result = await this.analysis.checkUrl(url);
            this._log('success', 'URL check completed', { url, available: result.data?.isAvailable });
            return result;
        } catch (error) {
            this._log('error', 'URL check failed', { url, error: error.message });
            throw error;
        }
    }

    /**
     * Validate URL format
     */
    validateUrl(url) {
        return this.analysis.validateUrl(url);
    }

    /**
     * Get health status
     */
    async getHealth() {
        try {
            return await this.stats.getHealth();
        } catch (error) {
            this._log('warn', 'Health check failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Get API information
     */
    async getInfo() {
        try {
            return await this.stats.getInfo();
        } catch (error) {
            this._log('warn', 'Info request failed', { error: error.message });
            throw error;
        }
    }

    /**
     * Set authentication token (for future use)
     */
    setAuthToken(token) {
        this.http.setHeaders({
            'Authorization': `Bearer ${token}`
        });
        this._log('info', 'Auth token set');
    }

    /**
     * Clear authentication
     */
    clearAuth() {
        this.http.setHeaders({
            'Authorization': undefined
        });
        this._log('info', 'Auth cleared');
    }

    /**
     * Configure client
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.timeout) {
            this.http.setTimeout(newConfig.timeout);
        }
        
        if (newConfig.headers) {
            this.http.setHeaders(newConfig.headers);
        }
        
        this._log('info', 'Client reconfigured', newConfig);
    }

    /**
     * Get supported analysis options
     */
    getSupportedOptions() {
        return this.analysis.getSupportedOptions();
    }

    /**
     * Subscribe to stats updates
     */
    subscribeToStatsUpdates(callback) {
        return this.stats.subscribeToUpdates(callback);
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.stats.clearCache();
        this._log('info', 'Caches cleared');
    }

    /**
     * Setup error handling
     * @private
     */
    _setupErrorHandling() {
        // Global error handler for API client
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.context) {
                this._log('error', 'Unhandled API error', {
                    context: event.reason.context,
                    message: event.reason.message
                });
            }
        });
    }

    /**
     * Setup logging
     * @private
     */
    _setupLogging() {
        if (!this.config.enableLogging) return;

        // Create console group for API logs
        this.logGroup = 'SafeCookie API';
    }

    /**
     * Internal logging
     * @private
     */
    _log(level, message, data = {}) {
        if (!this.config.enableLogging) return;

        const logData = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...data
        };

        switch (level) {
            case 'error':
                console.error(`[${this.logGroup}]`, message, logData);
                break;
            case 'warn':
                console.warn(`[${this.logGroup}]`, message, logData);
                break;
            case 'success':
                console.log(`[${this.logGroup}] ✅`, message, logData);
                break;
            default:
                console.log(`[${this.logGroup}]`, message, logData);
        }
    }

    /**
     * Get client status
     */
    getStatus() {
        return {
            version: '2.0.0',
            config: this.config,
            endpoints: {
                analysis: this.analysis.endpoints,
                stats: this.stats.endpoints
            }
        };
    }
}

// Create global instance
window.apiClient = new APIClient({
    enableLogging: true,
    enableRetries: true,
    enableCache: true
});

// Also make class available for custom instances
window.APIClient = APIClient;
