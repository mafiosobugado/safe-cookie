/**
 * Home URL Form Component (Simplified)
 * Handles URL input, validation, and analysis submission
 */
class HomeUrlForm {
    constructor() {
        this.urlForm = null;
        this.urlInput = null;
        this.analyzeButton = null;
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.setupValidation();
    }

    bindElements() {
        this.urlForm = document.getElementById('url-analysis-form');
        this.urlInput = document.getElementById('url-input');
        this.analyzeButton = document.getElementById('analyze-btn');
    }

    bindEvents() {
        if (!this.urlForm || !this.urlInput || !this.analyzeButton) return;

        this.urlForm.addEventListener('submit', this.handleSubmit.bind(this));
        this.analyzeButton.addEventListener('click', this.handleAnalyzeClick.bind(this));
        this.urlInput.addEventListener('input', this.handleInput.bind(this));
        this.urlInput.addEventListener('paste', this.handlePaste.bind(this));
        this.urlInput.addEventListener('focus', this.handleFocus.bind(this));
        this.urlInput.addEventListener('blur', this.handleBlur.bind(this));
        this.urlInput.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    async handleSubmit(event) {
        event.preventDefault();
        await this.performAnalysis();
    }

    async handleAnalyzeClick(event) {
        event.preventDefault();
        await this.performAnalysis();
    }

    handleInput(event) {
        const url = event.target.value.trim();
        this.clearMessages();
        this.updateButtonState(url);
        
        if (url && !this.validateUrl(url, false)) {
            this.showWarning('Please enter a valid URL format');
        }
    }

    handlePaste(event) {
        setTimeout(() => {
            const url = this.urlInput.value.trim();
            const formattedUrl = this.formatUrl(url);
            
            if (formattedUrl !== url) {
                this.urlInput.value = formattedUrl;
            }
            
            this.updateButtonState(formattedUrl);
        }, 10);
    }

    handleFocus(event) {
        this.urlInput.parentElement?.classList.add('focused');
        this.clearMessages();
    }

    handleBlur(event) {
        this.urlInput.parentElement?.classList.remove('focused');
        
        const url = this.urlInput.value.trim();
        if (url) {
            const formattedUrl = this.formatUrl(url);
            if (formattedUrl !== url) {
                this.urlInput.value = formattedUrl;
                this.updateButtonState(formattedUrl);
            }
        }
    }

    handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.performAnalysis();
        }
    }

    async performAnalysis() {
        const url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL to analyze');
            this.focusInput();
            return;
        }

        if (!this.validateUrl(url)) {
            this.showError('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        try {
            this.clearMessages();
            
            // Show loading
            const loaderId = window.loadingManager.showButtonLoader(this.analyzeButton, {
                text: 'Analyzing...'
            });

            // Emit analysis start event
            document.dispatchEvent(new CustomEvent('analysis:start', {
                detail: { url }
            }));

            // Call API
            const response = await window.apiClient.analyzeUrl(url, {
                checkCookies: true,
                checkSSL: true,
                checkHeaders: true
            });

            // Hide loading
            window.loadingManager.hideButtonLoader(loaderId);

            // Check if analysis was successful
            if (response.data && !response.data.error) {
                this.handleSuccess(response.data);
            } else {
                throw new Error(response.data?.message || 'Invalid response from server');
            }

        } catch (error) {
            window.loadingManager.hideButtonLoader(this.analyzeButton);
            this.handleError(error);
        }
    }

    handleSuccess(data) {
        console.log('[URL Form] Analysis success:', data);
        
        // Store analysis data
        sessionStorage.setItem('latestAnalysis', JSON.stringify(data));
        
        // Emit success event
        document.dispatchEvent(new CustomEvent('analysis:success', {
            detail: data
        }));

        // Show success message with options
        this.showSuccessWithOptions(data);
    }

    handleError(error) {
        console.error('Analysis error:', error);
        
        // Emit error event
        document.dispatchEvent(new CustomEvent('analysis:error', {
            detail: error
        }));

        // Show user-friendly error
        let message = 'An error occurred during analysis. Please try again.';
        
        switch (error.status) {
            case 400:
                message = error.message || 'Invalid URL provided.';
                break;
            case 429:
                message = 'Too many requests. Please wait and try again.';
                break;
            case 500:
            case 502:
            case 503:
                message = 'Server error. Please try again later.';
                break;
        }
        
        if (error.code === 'TIMEOUT') {
            message = 'Request timed out. Please try again.';
        }

        this.showError(message);
    }

    openFullReport(data) {
        try {
            // Use the ReportGenerator component
            const reportHTML = window.ReportGenerator.generateFullReportHTML(data || JSON.parse(sessionStorage.getItem('latestAnalysis')));
            
            // Try to open in new tab
            const newWindow = window.open('', '_blank');
            
            if (newWindow) {
                // Success - write content
                newWindow.document.write(reportHTML);
                newWindow.document.close();
                newWindow.document.title = `Relatório de Segurança - ${data?.url || 'Análise'}`;
                
                // Focus the new window
                newWindow.focus();
            } else {
                // Pop-up blocked - fallback to download
                console.warn('[SafeCookie] Pop-up blocked, creating download link');
                this.downloadReport(reportHTML, data?.url || 'analise');
            }
        } catch (error) {
            console.error('[SafeCookie] Error opening report:', error);
            
            // Final fallback - show alert with instructions
            alert('Não foi possível abrir o relatório automaticamente. Por favor, permita pop-ups para este site ou tente novamente.');
        }
    }

    /**
     * Download report as HTML file (fallback)
     */
    downloadReport(htmlContent, urlName) {
        try {
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-seguranca-${urlName.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            // Show success message
            this.showSuccess('Relatório baixado! Abra o arquivo HTML para visualizar.');
        } catch (error) {
            console.error('[SafeCookie] Error downloading report:', error);
            alert('Erro ao baixar relatório. Tente habilitar pop-ups ou usar outro navegador.');
        }
    }

    validateUrl(url, strict = true) {
        if (!url) return false;
        
        try {
            const urlObj = new URL(url);
            
            if (strict && !['http:', 'https:'].includes(urlObj.protocol)) {
                return false;
            }
            
            if (!urlObj.hostname) {
                return false;
            }
            
            return true;
        } catch (e) {
            if (!strict && !url.includes('://')) {
                try {
                    new URL(`https://${url}`);
                    return true;
                } catch (e2) {
                    return false;
                }
            }
            return false;
        }
    }

    formatUrl(url) {
        if (!url) return url;
        
        url = url.trim();
        
        if (!url.includes('://') && !url.startsWith('/')) {
            url = `https://${url}`;
        }
        
        return url;
    }

    updateButtonState(url) {
        if (!this.analyzeButton) return;
        
        const isValid = url && this.validateUrl(this.formatUrl(url));
        this.analyzeButton.disabled = !isValid;
        this.analyzeButton.classList.toggle('btn-primary', isValid);
        this.analyzeButton.classList.toggle('btn-secondary', !isValid);
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show success with report options
     */
    showSuccessWithOptions(data) {
        this.clearMessages();
        
        // Create success message with buttons
        let messageEl = document.getElementById('url-message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'url-message';
            messageEl.className = 'form-message';
            this.urlInput.parentElement.insertAdjacentElement('afterend', messageEl);
        }
        
        messageEl.className = 'form-message form-message--success form-message--with-actions';
        messageEl.style.display = 'block';
        
        messageEl.innerHTML = `
            <div class="success-content">
                <div class="success-text">
                    ✅ <strong>Análise concluída!</strong><br>
                    <small>Nota: ${data.grade} (${data.score}/100) | ${data.stats?.totalVulnerabilities || 0} vulnerabilidades encontradas</small>
                </div>
                <div class="success-actions">
                    <button class="btn btn-primary btn-sm" onclick="window.homeUrlForm.openFullReport()">
                        📊 Abrir Relatório
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.homeUrlForm.downloadCurrentReport()">
                        💾 Baixar HTML
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.homeUrlForm.startNewAnalysis()">
                        🔄 Nova Análise
                    </button>
                </div>
            </div>
        `;
        
        this.urlInput.classList.add('input--success');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (messageEl && messageEl.style.display !== 'none') {
                this.clearMessages();
            }
        }, 10000);
    }

    clearMessages() {
        const messageEl = document.getElementById('url-message');
        if (messageEl) {
            messageEl.style.display = 'none';
        }
        
        this.urlInput.classList.remove('input--error', 'input--warning', 'input--success');
    }

    showMessage(message, type = 'error') {
        let messageEl = document.getElementById('url-message');
        
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'url-message';
            messageEl.className = 'form-message';
            this.urlInput.parentElement.insertAdjacentElement('afterend', messageEl);
        }
        
        messageEl.textContent = message;
        messageEl.className = `form-message form-message--${type}`;
        messageEl.style.display = 'block';
        
        this.urlInput.classList.add(`input--${type}`);
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => this.clearMessages(), 3000);
        }
    }

    downloadCurrentReport() {
        const data = JSON.parse(sessionStorage.getItem('latestAnalysis'));
        if (data) {
            const reportHTML = window.ReportGenerator.generateFullReportHTML(data);
            this.downloadReport(reportHTML, data.url || 'analise');
        }
    }

    startNewAnalysis() {
        this.clearMessages();
        this.urlInput.value = '';
        this.focusInput();
        this.updateButtonState('');
    }

    focusInput() {
        if (this.urlInput) {
            this.urlInput.focus();
            this.urlInput.select();
        }
    }

    setUrl(url) {
        if (this.urlInput) {
            this.urlInput.value = url;
            this.updateButtonState(url);
            this.focusInput();
        }
    }

    setupValidation() {
        if (!this.urlInput) return;
        
        this.urlInput.setAttribute('required', 'true');
        this.urlInput.setAttribute('type', 'url');
        this.urlInput.setAttribute('placeholder', 'Enter website URL (e.g., https://example.com)');
        
        // Initial state
        this.updateButtonState(this.urlInput.value);
    }

    destroy() {
        this.clearMessages();
    }
}

// Make globally available
window.HomeUrlForm = HomeUrlForm;