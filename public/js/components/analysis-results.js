/**
 * Analysis Results Component
 * Handles display and interaction with security analysis results
 */
class AnalysisResults {
    constructor(container, data) {
        this.container = typeof container === 'string' ? DOM.get(container) : container;
        this.data = data;
        this.init();
    }

    /**
     * Initialize analysis results
     */
    init() {
        if (!this.container || !this.data) return;
        
        this.render();
        this.attachEvents();
        this.animateCounters();
    }

    /**
     * Render analysis results
     */
    render() {
        // Results are already rendered by EJS, just enhance them
        this.enhanceScoreDisplay();
        this.enhanceVulnerabilityList();
        this.enhanceCookieDisplay();
        this.enhanceHeadersDisplay();
    }

    /**
     * Enhance score display with animations
     */
    enhanceScoreDisplay() {
        const scoreCircle = DOM.query('.score-circle');
        if (scoreCircle) {
            const score = parseInt(scoreCircle.querySelector('.score-number')?.textContent) || 0;
            this.animateScore(scoreCircle, score);
        }

        // Animate category scores
        const categoryScores = DOM.queryAll('.category-score .score-number');
        categoryScores.forEach(scoreElement => {
            const score = parseInt(scoreElement.textContent) || 0;
            this.animateCounter(scoreElement, 0, score, 1000);
        });
    }

    /**
     * Animate score circle
     */
    animateScore(circle, score) {
        // Add visual enhancement to score circle
        const grade = circle.querySelector('.score-value')?.textContent || 'F';
        const color = Utils.getGradeColor(grade);
        
        circle.style.setProperty('--score-color', color);
        circle.style.setProperty('--score-progress', `${score}%`);
        
        // Animate the score number
        const numberElement = circle.querySelector('.score-number');
        if (numberElement) {
            this.animateCounter(numberElement, 0, score, 1500);
        }
    }

    /**
     * Enhance vulnerability list
     */
    enhanceVulnerabilityList() {
        const vulnerabilities = DOM.queryAll('.vulnerability-item');
        
        vulnerabilities.forEach((vuln, index) => {
            // Add severity color
            const severity = this.getSeverityFromClass(vuln.className);
            const color = Utils.getSeverityColor(severity);
            vuln.style.setProperty('--severity-color', color);
            
            // Animate in with delay
            setTimeout(() => {
                DOM.addClass(vuln, 'animate-in');
            }, index * 100);
            
            // Add click handler for details
            vuln.addEventListener('click', () => {
                this.toggleVulnerabilityDetails(vuln);
            });
        });
    }

    /**
     * Enhance cookie display
     */
    enhanceCookieDisplay() {
        const cookieItems = DOM.queryAll('.cookie-item');
        
        cookieItems.forEach(cookie => {
            const flags = cookie.querySelectorAll('.flag');
            
            flags.forEach(flag => {
                const isPresent = DOM.hasClass(flag, 'flag-present');
                flag.style.setProperty('--flag-color', isPresent ? '#4caf50' : '#f44336');
            });
            
            // Add expand/collapse functionality
            const header = cookie.querySelector('.cookie-header');
            if (header) {
                header.addEventListener('click', () => {
                    DOM.toggleClass(cookie, 'expanded');
                });
            }
        });
    }

    /**
     * Enhance headers display
     */
    enhanceHeadersDisplay() {
        const headerItems = DOM.queryAll('.header-item');
        
        headerItems.forEach(item => {
            const isPresent = DOM.hasClass(item, 'header-present');
            const status = item.querySelector('.header-status');
            
            if (status) {
                status.style.setProperty('--status-color', isPresent ? '#4caf50' : '#f44336');
            }
            
            // Add tooltip with header description
            const headerName = item.querySelector('.header-name')?.textContent;
            if (headerName) {
                item.title = this.getHeaderDescription(headerName);
            }
        });
    }

    /**
     * Get header description for tooltip
     */
    getHeaderDescription(headerName) {
        const descriptions = {
            'Content-Security-Policy': 'Previne ataques XSS especificando fontes de conteúdo permitidas',
            'Strict-Transport-Security': 'Força o uso de HTTPS para todas as comunicações',
            'X-Frame-Options': 'Protege contra ataques de clickjacking',
            'X-Content-Type-Options': 'Previne MIME type sniffing',
            'Referrer-Policy': 'Controla informações de referência enviadas',
            'Permissions-Policy': 'Controla acesso a APIs do navegador',
            'X-XSS-Protection': 'Ativa proteção XSS em navegadores antigos'
        };
        
        return descriptions[headerName] || 'Header de segurança';
    }

    /**
     * Get severity from CSS class
     */
    getSeverityFromClass(className) {
        const severities = ['critical', 'high', 'medium', 'low', 'info'];
        return severities.find(severity => className.includes(`severity-${severity}`)) || 'info';
    }

    /**
     * Toggle vulnerability details
     */
    toggleVulnerabilityDetails(vuln) {
        const details = vuln.querySelector('.vulnerability-details');
        if (details) {
            DOM.toggleClass(details, 'hidden');
        } else {
            // Create details if they don't exist
            const impact = vuln.querySelector('.vulnerability-impact')?.textContent;
            if (impact) {
                const detailsElement = DOM.create('div', {
                    class: 'vulnerability-details'
                }, `<p><strong>Impacto:</strong> ${impact}</p>`);
                
                vuln.appendChild(detailsElement);
            }
        }
    }

    /**
     * Animate counter from start to end
     */
    animateCounter(element, start, end, duration = 1000) {
        if (!element) return;
        
        const startTime = performance.now();
        const difference = end - start;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (difference * easeOut));
            
            element.textContent = element.textContent.includes('/') 
                ? `${current}/100` 
                : current.toString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Animate counters in stats section
     */
    animateCounters() {
        const statValues = DOM.queryAll('.stat-value');
        
        // Use Intersection Observer to trigger animation when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const targetValue = parseInt(element.textContent) || 0;
                    
                    if (targetValue > 0) {
                        this.animateCounter(element, 0, targetValue, 1500);
                    }
                    
                    observer.unobserve(element);
                }
            });
        }, { threshold: 0.5 });
        
        statValues.forEach(stat => observer.observe(stat));
    }

    /**
     * Attach event handlers
     */
    attachEvents() {
        // Export functionality
        const exportBtn = DOM.query('[onclick="exportToJSON()"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportToJSON();
            });
        }
        
        // Print functionality
        const printBtn = DOM.query('[onclick="window.print()"]');
        if (printBtn) {
            printBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.printReport();
            });
        }
        
        // Category card toggle
        const categoryHeaders = DOM.queryAll('.category-header');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const card = header.closest('.category-card');
                DOM.toggleClass(card, 'collapsed');
            });
        });
        
        // Vulnerability filtering
        this.setupVulnerabilityFiltering();
    }

    /**
     * Setup vulnerability filtering
     */
    setupVulnerabilityFiltering() {
        // Create filter controls
        const filterContainer = DOM.create('div', {
            class: 'vulnerability-filters'
        }, `
            <div class="filter-group">
                <label>Filtrar por severidade:</label>
                <select id="severity-filter">
                    <option value="all">Todas</option>
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                    <option value="info">Info</option>
                </select>
            </div>
        `);
        
        // Insert before vulnerabilities list
        const firstVulnList = DOM.query('.vulnerabilities-list');
        if (firstVulnList) {
            firstVulnList.parentNode.insertBefore(filterContainer, firstVulnList);
            
            // Add event listener
            const severityFilter = DOM.get('severity-filter');
            severityFilter.addEventListener('change', (e) => {
                this.filterVulnerabilities(e.target.value);
            });
        }
    }

    /**
     * Filter vulnerabilities by severity
     */
    filterVulnerabilities(severity) {
        const vulnerabilities = DOM.queryAll('.vulnerability-item');
        
        vulnerabilities.forEach(vuln => {
            if (severity === 'all' || vuln.className.includes(`severity-${severity}`)) {
                DOM.show(vuln);
            } else {
                DOM.hide(vuln);
            }
        });
    }

    /**
     * Export analysis to JSON
     */
    exportToJSON() {
        if (!this.data) return;
        
        const filename = `security-analysis-${new Date().toISOString().split('T')[0]}.json`;
        const jsonData = JSON.stringify(this.data, null, 2);
        
        Utils.downloadFile(jsonData, filename, 'application/json');
        
        // Show success message
        this.showMessage('Relatório exportado com sucesso!', 'success');
    }

    /**
     * Print report
     */
    printReport() {
        // Add print styles
        const printStyles = `
            <style media="print">
                .analysis-actions, .vulnerability-filters { display: none !important; }
                .category-card { break-inside: avoid; }
                .vulnerability-item { break-inside: avoid; }
                body { font-size: 12px; }
                .score-circle { width: 80px; height: 80px; }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', printStyles);
        
        window.print();
    }

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        const messageElement = DOM.create('div', {
            class: `message message-${type}`,
            'data-timeout': '3000'
        }, message);
        
        // Insert at top of container
        this.container.insertBefore(messageElement, this.container.firstChild);
        
        // Auto remove after timeout
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }

    /**
     * Update analysis data
     */
    updateData(newData) {
        this.data = newData;
        this.render();
    }

    /**
     * Get analysis summary
     */
    getSummary() {
        if (!this.data) return null;
        
        return {
            url: this.data.url,
            score: this.data.score,
            grade: this.data.grade,
            vulnerabilityCount: this.data.vulnerabilities?.length || 0,
            cookieCount: this.data.cookies?.count || 0,
            timestamp: this.data.timestamp
        };
    }
}

// Make classes globally available
window.AnalysisResults = AnalysisResults;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AnalysisResults
    };
}
