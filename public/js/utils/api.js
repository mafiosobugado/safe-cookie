/**
 * API Client for Safe Cookie Application
 * Handles all HTTP requests to the backend API
 */
class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiVersion = 'v1';
        this.timeout = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second

        // Request interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        this.init();
    }

    /**
     * Initialize API client
     */
    init() {
        // Add default request interceptors
        this.addRequestInterceptor(this.addDefaultHeaders.bind(this));
        this.addRequestInterceptor(this.addCSRFToken.bind(this));
        
        // Add default response interceptors
        this.addResponseInterceptor(this.handleSuccess.bind(this), this.handleError.bind(this));
    }

    /**
     * Add request interceptor
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * Add response interceptor
     */
    addResponseInterceptor(successHandler, errorHandler) {
        this.responseInterceptors.push({ success: successHandler, error: errorHandler });
    }

    /**
     * Default headers for all requests
     */
    addDefaultHeaders(config) {
        config.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...config.headers
        };
        return config;
    }

    /**
     * Add CSRF token to requests
     */
    addCSRFToken(config) {
        const token = this.getCSRFToken();
        if (token) {
            config.headers['X-CSRF-Token'] = token;
        }
        return config;
    }

    /**
     * Get CSRF token from meta tag
     */
    getCSRFToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : null;
    }

    /**
     * Handle successful responses
     */
    handleSuccess(response) {
        return response;
    }

    /**
     * Handle error responses
     */
    handleError(error) {
        // Log error for debugging
        console.error('API Error:', error);

        // Create standardized error object
        const apiError = {
            message: error.message || 'An unexpected error occurred',
            status: error.status || 0,
            code: error.code || 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString(),
            url: error.url || '',
            method: error.method || ''
        };

        // Emit global error event
        document.dispatchEvent(new CustomEvent('api:error', {
            detail: apiError
        }));

        throw apiError;
    }

    /**
     * Process request through interceptors
     */
    async processRequest(config) {
        let processedConfig = { ...config };
        
        for (const interceptor of this.requestInterceptors) {
            processedConfig = await interceptor(processedConfig);
        }
        
        return processedConfig;
    }

    /**
     * Process response through interceptors
     */
    async processResponse(response, error = null) {
        for (const interceptor of this.responseInterceptors) {
            if (error && interceptor.error) {
                try {
                    return await interceptor.error(error);
                } catch (err) {
                    error = err;
                }
            } else if (!error && interceptor.success) {
                response = await interceptor.success(response);
            }
        }
        
        if (error) throw error;
        return response;
    }

    /**
     * Make HTTP request with retry logic
     */
    async request(config) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const processedConfig = await this.processRequest(config);
                const response = await this.makeRequest(processedConfig);
                return await this.processResponse(response);
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx) or last attempt
                if (this.shouldNotRetry(error) || attempt === this.retryAttempts) {
                    break;
                }
                
                // Wait before retry
                await this.delay(this.retryDelay * attempt);
            }
        }
        
        return await this.processResponse(null, lastError);
    }

    /**
     * Check if request should not be retried
     */
    shouldNotRetry(error) {
        // Don't retry client errors (4xx) except 408 (timeout)
        return error.status >= 400 && error.status < 500 && error.status !== 408;
    }

    /**
     * Delay helper for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Make the actual HTTP request
     */
    async makeRequest(config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout || this.timeout);

        try {
            const response = await fetch(config.url, {
                method: config.method || 'GET',
                headers: config.headers,
                body: config.body,
                signal: controller.signal,
                ...config.options
            });

            clearTimeout(timeoutId);

            // Clone response for potential retry
            const clonedResponse = response.clone();

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.statusText = response.statusText;
                error.url = config.url;
                error.method = config.method;
                
                // Try to get error details from response body
                try {
                    const errorData = await response.json();
                    error.data = errorData;
                    error.message = errorData.message || error.message;
                    error.code = errorData.code || error.code;
                } catch (e) {
                    // Response body is not JSON, use default error
                }
                
                throw error;
            }

            // Parse response based on content type
            const contentType = response.headers.get('content-type');
            let data;

            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }

            return {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                response: clonedResponse
            };

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                const timeoutError = new Error('Request timeout');
                timeoutError.code = 'TIMEOUT';
                timeoutError.status = 408;
                timeoutError.url = config.url;
                timeoutError.method = config.method;
                throw timeoutError;
            }
            
            // Network or other errors
            error.url = config.url;
            error.method = config.method;
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(url, config = {}) {
        return this.request({
            url: this.buildUrl(url),
            method: 'GET',
            ...config
        });
    }

    /**
     * POST request
     */
    async post(url, data = null, config = {}) {
        return this.request({
            url: this.buildUrl(url),
            method: 'POST',
            body: data ? JSON.stringify(data) : null,
            ...config
        });
    }

    /**
     * PUT request
     */
    async put(url, data = null, config = {}) {
        return this.request({
            url: this.buildUrl(url),
            method: 'PUT',
            body: data ? JSON.stringify(data) : null,
            ...config
        });
    }

    /**
     * DELETE request
     */
    async delete(url, config = {}) {
        return this.request({
            url: this.buildUrl(url),
            method: 'DELETE',
            ...config
        });
    }

    /**
     * PATCH request
     */
    async patch(url, data = null, config = {}) {
        return this.request({
            url: this.buildUrl(url),
            method: 'PATCH',
            body: data ? JSON.stringify(data) : null,
            ...config
        });
    }

    /**
     * Upload file
     */
    async upload(url, file, config = {}) {
        const formData = new FormData();
        formData.append('file', file);

        // Add additional fields if provided
        if (config.fields) {
            Object.entries(config.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }

        return this.request({
            url: this.buildUrl(url),
            method: 'POST',
            headers: {
                // Don't set Content-Type, let browser set it with boundary
                ...config.headers
            },
            body: formData,
            ...config
        });
    }

    /**
     * Build full URL
     */
    buildUrl(endpoint) {
        // If it's already a full URL, return as is
        if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
            return endpoint;
        }

        // Remove leading slash if present
        endpoint = endpoint.replace(/^\//, '');
        
        return `${this.baseUrl}/api/${this.apiVersion}/${endpoint}`;
    }

    // API Methods for Safe Cookie Application

    /**
     * Analyze URL for security issues
     */
    async analyzeUrl(url, options = {}) {
        return this.post('analyze', {
            url,
            options: {
                checkCookies: true,
                checkSSL: true,
                checkHeaders: true,
                ...options
            }
        });
    }

    /**
     * Get analysis results by ID
     */
    async getAnalysis(analysisId) {
        return this.get(`analysis/${analysisId}`);
    }

    /**
     * Get analysis history
     */
    async getAnalysisHistory(page = 1, limit = 10) {
        return this.get(`analysis?page=${page}&limit=${limit}`);
    }

    /**
     * Export analysis results
     */
    async exportAnalysis(analysisId, format = 'json') {
        return this.get(`analysis/${analysisId}/export?format=${format}`);
    }

    /**
     * Get application statistics
     */
    async getStats() {
        return this.get('stats');
    }

    /**
     * Check if URL is valid for analysis
     */
    async validateUrl(url) {
        return this.post('validate-url', { url });
    }

    /**
     * Get supported domains/patterns
     */
    async getSupportedDomains() {
        return this.get('domains');
    }

    /**
     * Report issue or feedback
     */
    async reportIssue(data) {
        return this.post('feedback', data);
    }

    /**
     * Health check endpoint
     */
    async healthCheck() {
        return this.get('health');
    }
}

// Create global API client instance
const apiClient = new ApiClient();

// Make it globally available
window.apiClient = apiClient;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}
