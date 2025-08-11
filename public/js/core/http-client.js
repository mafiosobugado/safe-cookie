/**
 * HTTP Client - Base para todas as requisições
 * Handles requests, retries, timeouts and error processing
 */
class HttpClient {
    constructor(config = {}) {
        this.baseURL = config.baseURL || '';
        this.timeout = config.timeout || 30000;
        this.retries = config.retries || 2;
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...config.headers
        };
    }

    /**
     * Make HTTP request with retry logic
     */
    async request(url, options = {}) {
        const fullUrl = this._buildUrl(url);
        const config = this._buildConfig(options);
        
        let lastError;
        
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                const response = await this._makeRequest(fullUrl, config);
                return await this._processResponse(response);
            } catch (error) {
                lastError = error;
                
                // Don't retry for client errors (4xx)
                if (error.status >= 400 && error.status < 500 && error.status !== 429) {
                    break;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < this.retries) {
                    await this._delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * GET request
     */
    async get(url, params = {}, options = {}) {
        const urlWithParams = this._addParams(url, params);
        return this.request(urlWithParams, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * POST request
     */
    async post(url, data = {}, options = {}) {
        return this.request(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(url, data = {}, options = {}) {
        return this.request(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(url, options = {}) {
        return this.request(url, {
            ...options,
            method: 'DELETE'
        });
    }

    /**
     * Build full URL
     * @private
     */
    _buildUrl(url) {
        if (url.startsWith('http')) {
            return url;
        }
        return `${this.baseURL}${url.startsWith('/') ? url : '/' + url}`;
    }

    /**
     * Build request config
     * @private
     */
    _buildConfig(options) {
        return {
            method: 'GET',
            headers: {
                ...this.headers,
                ...options.headers
            },
            ...options,
            signal: this._createAbortSignal()
        };
    }

    /**
     * Create abort signal for timeout
     * @private
     */
    _createAbortSignal() {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), this.timeout);
        return controller.signal;
    }

    /**
     * Make actual fetch request
     * @private
     */
    async _makeRequest(url, config) {
        try {
            return await fetch(url, config);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw this._createError('TIMEOUT', 'Request timeout', 0);
            }
            throw this._createError('NETWORK', error.message, 0);
        }
    }

    /**
     * Process fetch response
     * @private
     */
    async _processResponse(response) {
        const result = {
            status: response.status,
            statusText: response.statusText,
            headers: this._parseHeaders(response.headers),
            data: null
        };

        // Try to parse JSON, fallback to text
        try {
            const text = await response.text();
            if (text) {
                try {
                    result.data = JSON.parse(text);
                } catch (parseError) {
                    result.data = text;
                }
            }
        } catch (e) {
            console.warn('Failed to read response body:', e);
            result.data = null;
        }

        if (!response.ok) {
            throw this._createError(
                'HTTP_ERROR',
                result.data?.message || response.statusText,
                response.status,
                result.data
            );
        }

        return result;
    }

    /**
     * Parse response headers
     * @private
     */
    _parseHeaders(headers) {
        const parsed = {};
        for (const [key, value] of headers.entries()) {
            parsed[key] = value;
        }
        return parsed;
    }

    /**
     * Add query parameters to URL
     * @private
     */
    _addParams(url, params) {
        if (!params || Object.keys(params).length === 0) {
            return url;
        }

        const urlObj = new URL(url, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                urlObj.searchParams.set(key, value);
            }
        });

        return urlObj.pathname + urlObj.search;
    }

    /**
     * Create standardized error
     * @private
     */
    _createError(code, message, status = 0, data = null) {
        const error = new Error(message);
        error.code = code;
        error.status = status;
        error.data = data;
        return error;
    }

    /**
     * Delay utility
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set default headers
     */
    setHeaders(headers) {
        this.headers = { ...this.headers, ...headers };
    }

    /**
     * Set timeout
     */
    setTimeout(timeout) {
        this.timeout = timeout;
    }
}

// Make globally available
window.HttpClient = HttpClient;
