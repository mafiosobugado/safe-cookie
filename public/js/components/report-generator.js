/**
 * Report Generator
 * Handles generation of security analysis reports
 */
class ReportGenerator {
    /**
     * Generate full report HTML
     */
    static generateFullReportHTML(data) {
        if (!data) return '<html><body><h1>Nenhum dado de análise encontrado</h1></body></html>';
        
        const gradeClass = data.grade.toLowerCase().replace('+', 'plus');
        const timestamp = new Date(data.timestamp).toLocaleString('pt-BR');
        
        return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Segurança - ${data.url}</title>
    <style>
        ${this.getReportCSS()}
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1 class="report-title">🔒 Relatório de Segurança</h1>
            <div class="report-url">${data.url}</div>
            <div class="report-meta">
                Análise realizada em: ${timestamp}<br>
                Status HTTP: ${data.httpStatus} | HTTPS: ${data.isHttps ? 'Sim' : 'Não'}
            </div>
        </div>
        
        <div class="grade-section">
            <div class="grade-display">
                <div class="grade-circle grade-${gradeClass}">
                    <div>${data.grade}</div>
                    <div class="grade-score">${data.score}/100</div>
                </div>
                
                <div class="vuln-overview">
                    <div class="vuln-stat critical">
                        <span class="vuln-count">${data.stats?.criticalVulnerabilities || 0}</span>
                        <span class="vuln-label">Críticas</span>
                    </div>
                    <div class="vuln-stat high">
                        <span class="vuln-count">${data.stats?.highVulnerabilities || 0}</span>
                        <span class="vuln-label">Altas</span>
                    </div>
                    <div class="vuln-stat medium">
                        <span class="vuln-count">${data.stats?.mediumVulnerabilities || 0}</span>
                        <span class="vuln-label">Médias</span>
                    </div>
                    <div class="vuln-stat low">
                        <span class="vuln-count">${data.stats?.lowVulnerabilities || 0}</span>
                        <span class="vuln-label">Baixas</span>
                    </div>
                </div>
            </div>
        </div>
        
        ${this.generateSSLSection(data.ssl)}
        ${this.generateHeadersSection(data.headers)}
        ${this.generateCookiesSection(data.cookies)}
        ${this.generateHTMLSection(data.html)}
        ${this.generateScoresSection(data.stats?.scores)}
        ${this.generateRecommendationsSection(data.recommendations)}
        
        <div class="footer">
            Relatório gerado por Safe Cookie v2.0 | © 2025 Safe Cookie Project
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get CSS for report
     */
    static getReportCSS() {
        return `
        :root {
            --color-primary: #2563eb;
            --color-primary-dark: #1d4ed8;
            --color-success: #10b981;
            --color-success-bg: #d1fae5;
            --color-success-dark: #059669;
            --color-warning: #f59e0b;
            --color-warning-bg: #fef3c7;
            --color-warning-dark: #d97706;
            --color-error: #ef4444;
            --color-error-bg: #fee2e2;
            --color-error-dark: #dc2626;
            --color-security-critical: #dc2626;
            --color-security-high: #ea580c;
            --color-security-medium: #d97706;
            --color-security-low: #65a30d;
            --color-grade-a-plus: #059669;
            --color-grade-b: #65a30d;
            --color-grade-c: #ca8a04;
            --color-grade-d: #ea580c;
            --color-grade-f: #dc2626;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
            padding: 20px;
        }
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .report-header {
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .report-title {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .report-url {
            font-size: 1.2rem;
            opacity: 0.9;
            word-break: break-all;
        }
        .report-meta {
            margin-top: 15px;
            font-size: 0.9rem;
            opacity: 0.8;
        }
        .grade-section {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-bottom: 1px solid #e9ecef;
        }
        .grade-display {
            display: flex;
            align-items: center;
            gap: 30px;
            background: white;
            padding: 20px 40px;
            border-radius: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            flex-wrap: wrap;
            justify-content: center;
            max-width: 800px;
            margin: 0 auto;
        }
        .grade-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 2rem;
            flex-shrink: 0;
        }
        .grade-a, .grade-aplus { background: var(--color-grade-a-plus); }
        .grade-b { background: var(--color-grade-b); }
        .grade-c { background: var(--color-grade-c); color: #212529; }
        .grade-d { background: var(--color-grade-d); }
        .grade-f { background: var(--color-grade-f); }
        .grade-score { font-size: 1.2rem; margin-top: 5px; }
        .vuln-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 15px;
            flex: 1;
            min-width: 300px;
        }
        .vuln-stat {
            text-align: center;
            padding: 15px 10px;
            border-radius: 8px;
            background: white;
            border-left: 4px solid;
        }
        .vuln-stat.critical { border-left-color: var(--color-security-critical); }
        .vuln-stat.high { border-left-color: var(--color-security-high); }
        .vuln-stat.medium { border-left-color: var(--color-security-medium); }
        .vuln-stat.low { border-left-color: var(--color-security-low); }
        .vuln-count {
            font-size: 1.8rem;
            font-weight: bold;
            display: block;
        }
        .vuln-label {
            font-size: 0.8rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            padding: 30px;
            border-bottom: 1px solid #e9ecef;
        }
        .section:last-child { border-bottom: none; }
        .section-title {
            font-size: 1.8rem;
            margin-bottom: 20px;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .section-score {
            background: #e9ecef;
            color: #495057;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 1rem;
            font-weight: 600;
        }
        .section-score.good { background: var(--color-success-bg); color: var(--color-success-dark); }
        .section-score.warning { background: var(--color-warning-bg); color: var(--color-warning-dark); }
        .section-score.danger { background: var(--color-error-bg); color: var(--color-error-dark); }
        .issue-list {
            margin-top: 20px;
        }
        .issue-item {
            background: #f8f9fa;
            border-left: 4px solid #6c757d;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 0 8px 8px 0;
        }
        .issue-item.critical { border-left-color: var(--color-security-critical); background: var(--color-error-bg); }
        .issue-item.high { border-left-color: var(--color-security-high); background: #fef3c7; }
        .issue-item.medium { border-left-color: var(--color-security-medium); background: var(--color-warning-bg); }
        .issue-item.low { border-left-color: var(--color-security-low); background: #f8f9fa; }
        .issue-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #495057;
        }
        .issue-desc {
            color: #6c757d;
            font-size: 0.9rem;
        }
        .issue-impact {
            font-size: 0.85rem;
            margin-top: 8px;
            padding: 8px;
            background: rgba(0,0,0,0.05);
            border-radius: 4px;
            font-style: italic;
        }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .score-card {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .score-value {
            font-size: 2rem;
            font-weight: bold;
            color: #495057;
        }
        .score-label {
            color: #6c757d;
            margin-top: 5px;
            font-size: 0.9rem;
        }
        .recommendations {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .rec-title {
            color: #004085;
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        .rec-list {
            list-style: none;
        }
        .rec-item {
            padding: 8px 0;
            border-bottom: 1px solid #cce7ff;
            color: #004085;
        }
        .rec-item:last-child { border-bottom: none; }
        .rec-item:before {
            content: '✓';
            color: #28a745;
            font-weight: bold;
            margin-right: 10px;
        }
        .footer {
            background: #343a40;
            color: white;
            padding: 20px 30px;
            text-align: center;
            font-size: 0.9rem;
        }
        @media (max-width: 768px) {
            .grade-display {
                flex-direction: column;
                gap: 20px;
            }
            .vuln-overview {
                min-width: 100%;
                grid-template-columns: repeat(2, 1fr);
            }
            .section-title {
                font-size: 1.5rem;
            }
            .score-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        `;
    }

    /**
     * Generate SSL section
     */
    static generateSSLSection(ssl) {
        if (!ssl) return '';
        
        const scoreClass = ssl.score >= 70 ? 'good' : ssl.score >= 40 ? 'warning' : 'danger';
        let issues = ssl.vulnerabilities || [];
        
        return `
        <div class="section">
            <h2 class="section-title">
                🔒 Certificados SSL/TLS
                <span class="section-score ${scoreClass}">${ssl.score || 0}/100</span>
            </h2>
            
            ${ssl.isSecure === false ? 
                '<div class="issue-item critical"><div class="issue-title">Site não usa HTTPS</div><div class="issue-desc">A conexão não é criptografada, permitindo interceptação de dados.</div></div>' : ''}
            
            ${issues.length > 0 ? `
                <div class="issue-list">
                    ${issues.map(issue => `
                        <div class="issue-item ${issue.severity}">
                            <div class="issue-title">${issue.message}</div>
                            ${issue.impact ? `<div class="issue-impact">Impacto: ${issue.impact}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #28a745;">✅ Nenhum problema SSL encontrado.</p>'}
        </div>`;
    }

    /**
     * Generate Headers section
     */
    static generateHeadersSection(headers) {
        if (!headers) return '';
        
        const scoreClass = headers.score >= 70 ? 'good' : headers.score >= 40 ? 'warning' : 'danger';
        let issues = headers.vulnerabilities || [];
        
        return `
        <div class="section">
            <h2 class="section-title">
                🛡️ Headers de Segurança
                <span class="section-score ${scoreClass}">${headers.score || 0}/100</span>
            </h2>
            
            ${issues.length > 0 ? `
                <div class="issue-list">
                    ${issues.map(issue => `
                        <div class="issue-item ${issue.severity}">
                            <div class="issue-title">${issue.message}</div>
                            <div class="issue-desc">${issue.type === 'missing_header' ? 'Header ausente' : 'Problema no header'}</div>
                            ${issue.impact ? `<div class="issue-impact">Impacto: ${issue.impact}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #28a745;">✅ Headers de segurança configurados adequadamente.</p>'}
        </div>`;
    }

    /**
     * Generate Cookies section
     */
    static generateCookiesSection(cookies) {
        if (!cookies) return '';
        
        const scoreClass = cookies.score >= 70 ? 'good' : cookies.score >= 40 ? 'warning' : 'danger';
        let issues = cookies.vulnerabilities || [];
        
        return `
        <div class="section">
            <h2 class="section-title">
                🍪 Análise de Cookies
                <span class="section-score ${scoreClass}">${cookies.score || 0}/100</span>
            </h2>
            
            <p><strong>Total de cookies:</strong> ${cookies.cookieCount || 0}</p>
            
            ${issues.length > 0 ? `
                <div class="issue-list">
                    ${issues.map(issue => `
                        <div class="issue-item ${issue.severity}">
                            <div class="issue-title">${issue.message}</div>
                            ${issue.cookieName ? `<div class="issue-desc">Cookie: ${issue.cookieName}</div>` : ''}
                            ${issue.impact ? `<div class="issue-impact">Impacto: ${issue.impact}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #28a745;">✅ Cookies configurados com segurança.</p>'}
        </div>`;
    }

    /**
     * Generate HTML section
     */
    static generateHTMLSection(html) {
        if (!html) return '';
        
        const scoreClass = html.score >= 70 ? 'good' : html.score >= 40 ? 'warning' : 'danger';
        let issues = html.vulnerabilities || [];
        
        return `
        <div class="section">
            <h2 class="section-title">
                📝 Análise HTML
                <span class="section-score ${scoreClass}">${html.score || 0}/100</span>
            </h2>
            
            <div style="margin-bottom: 15px;">
                <strong>Formulários:</strong> ${html.forms?.length || 0} | 
                <strong>Scripts externos:</strong> ${html.scripts?.length || 0}
            </div>
            
            ${issues.length > 0 ? `
                <div class="issue-list">
                    ${issues.map(issue => `
                        <div class="issue-item ${issue.severity}">
                            <div class="issue-title">${issue.message}</div>
                            ${issue.impact ? `<div class="issue-impact">Impacto: ${issue.impact}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p style="color: #28a745;">✅ Nenhum problema HTML encontrado.</p>'}
        </div>`;
    }

    /**
     * Generate Scores section
     */
    static generateScoresSection(scores) {
        if (!scores) return '';
        
        return `
        <div class="section">
            <h2 class="section-title">📊 Pontuações Detalhadas</h2>
            <div class="score-grid">
                <div class="score-card">
                    <div class="score-value">${scores.ssl || 0}</div>
                    <div class="score-label">SSL/TLS</div>
                </div>
                <div class="score-card">
                    <div class="score-value">${scores.headers || 0}</div>
                    <div class="score-label">Headers</div>
                </div>
                <div class="score-card">
                    <div class="score-value">${scores.cookies || 0}</div>
                    <div class="score-label">Cookies</div>
                </div>
                <div class="score-card">
                    <div class="score-value">${scores.html || 0}</div>
                    <div class="score-label">HTML</div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Generate Recommendations section
     */
    static generateRecommendationsSection(recommendations) {
        if (!recommendations || !recommendations.length) return '';
        
        return `
        <div class="section">
            <h2 class="section-title">💡 Recomendações</h2>
            <div class="recommendations">
                <div class="rec-title">Ações para melhorar a segurança:</div>
                <ul class="rec-list">
                    ${recommendations.map(rec => `<li class="rec-item">${rec}</li>`).join('')}
                </ul>
            </div>
        </div>`;
    }
}

// Make globally available
window.ReportGenerator = ReportGenerator;