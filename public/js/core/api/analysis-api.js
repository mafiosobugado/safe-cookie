/**
 * Analysis API Module
 * Handles all analysis-related API calls
 */
class AnalysisAPI {
    constructor(httpClient) {
        this.http = httpClient;
        this.endpoints = {
            analyze: '/api/analyze',
            checkUrl: '/api/check-url',
            getAnalysis: '/analysis'
        };
    }

    /**
     * Analyze a URL for security issues
     */
    async analyzeUrl(url, options = {}) {
        const payload = {
            url: this._normalizeUrl(url),
            options: {
                checkCookies: true,
                checkSSL: true,
                checkHeaders: true,
                checkHtml: true,
                ...options
            }
        };

        try {
            const response = await this.http.post(this.endpoints.analyze, payload);
            
            // Add analysisId for compatibility if not present
            if (response.data && !response.data.analysisId) {
                response.data.analysisId = this._generateAnalysisId(url);
                response.data.success = true;
            }

            return response;
        } catch (error) {
            throw this._enhanceError(error, 'ANALYZE_FAILED');
        }
    }

    /**
     * Quick URL health check
     */
    async checkUrl(url) {
        try {
            const response = await this.http.get(this.endpoints.checkUrl, { url });
            return response;
        } catch (error) {
            throw this._enhanceError(error, 'URL_CHECK_FAILED');
        }
    }

    /**
     * Get analysis by ID (for future use)
     */
    async getAnalysis(analysisId) {
        try {
            const response = await this.http.get(`${this.endpoints.getAnalysis}/${analysisId}`);
            return response;
        } catch (error) {
            throw this._enhanceError(error, 'GET_ANALYSIS_FAILED');
        }
    }

    /**
     * Validate URL before analysis
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { isValid: false, error: 'URL is required' };
        }

        try {
            const normalized = this._normalizeUrl(url);
            const urlObj = new URL(normalized);
            
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
            }

            if (!urlObj.hostname) {
                return { isValid: false, error: 'URL must have a valid hostname' };
            }

            return { isValid: true, normalizedUrl: normalized };
        } catch (error) {
            return { isValid: false, error: 'Invalid URL format' };
        }
    }

    /**
     * Normalize URL (add protocol if missing)
     * @private
     */
    _normalizeUrl(url) {
        if (!url) return url;
        
        url = url.trim();
        
        // Add protocol if missing
        if (!url.includes('://')) {
            url = `https://${url}`;
        }

        return url;
    }

    /**
     * Generate analysis ID for compatibility
     * @private
     */
    _generateAnalysisId(url) {
        const timestamp = Date.now();
        const hash = this._simpleHash(url);
        return `${hash}-${timestamp}`;
    }

    /**
     * Simple hash function for analysis ID
     * @private
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Enhance error with context
     * @private
     */
    _enhanceError(error, context) {
        error.context = context;
        
        // Add user-friendly messages based on error codes
        if (error.status === 400) {
            if (error.data?.code === 'INVALID_URL') {
                error.userMessage = 'URL inválida. Verifique o formato e tente novamente.';
            } else if (error.data?.code === 'HTTP_ERROR') {
                error.userMessage = error.data.message || 'Erro ao acessar o site.';
            } else {
                error.userMessage = 'URL fornecida é inválida. Verifique o formato.';
            }
        } else if (error.status === 429) {
            if (error.data?.code === 'RATE_LIMITED') {
                error.userMessage = 'Site bloqueou muitas requisições. Aguarde alguns minutos.';
            } else {
                error.userMessage = 'Muitas requisições. Aguarde e tente novamente.';
            }
        } else if (error.status >= 500) {
            if (error.data?.code === 'SERVER_ERROR') {
                error.userMessage = 'Servidor do site está com problemas. Tente mais tarde.';
            } else {
                error.userMessage = 'Erro no servidor. Tente novamente mais tarde.';
            }
        } else if (error.code === 'TIMEOUT') {
            error.userMessage = 'Tempo limite esgotado. Tente novamente.';
        } else if (error.code === 'NETWORK') {
            error.userMessage = 'Erro de rede. Verifique sua conexão.';
        } else {
            error.userMessage = error.data?.message || 'Erro inesperado. Tente novamente.';
        }

        return error;
    }

    /**
     * Get supported analysis options
     */
    getSupportedOptions() {
        return {
            checkCookies: {
                name: 'Cookie Analysis',
                description: 'Analyze cookie security flags and configuration'
            },
            checkSSL: {
                name: 'SSL/TLS Analysis',
                description: 'Check certificate validity and encryption strength'
            },
            checkHeaders: {
                name: 'Security Headers',
                description: 'Verify presence and configuration of security headers'
            },
            checkHtml: {
                name: 'HTML Analysis',
                description: 'Scan HTML for security vulnerabilities'
            }
        };
    }
}

// Make globally available
window.AnalysisAPI = AnalysisAPI;
