/**
 * Safe Cookie - Utilities
 * Funções utilitárias para a aplicação
 */

window.SafeCookie = window.SafeCookie || {};

// Utilitários gerais
window.SafeCookie.Utils = {
  
  /**
   * Faz requisição para API
   */
  async apiRequest(url, options = {}) {
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  },

  /**
   * Mostra notificação
   */
  showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, duration);
    }
  },

  /**
   * Cria container de notificações se não existir
   */
  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
  },

  /**
   * Mostra/esconde loading global
   */
  showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  },

  /**
   * Valida URL
   */
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  },

  /**
   * Formata número com separadores
   */
  formatNumber(num) {
    return new Intl.NumberFormat('pt-BR').format(num);
  },

  /**
   * Anima contador
   */
  animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current).toLocaleString('pt-BR');
    }, 16);
  },

  /**
   * Copia texto para clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Copiado para a área de transferência!', 'success', 2000);
      return true;
    } catch (err) {
      console.error('Erro ao copiar:', err);
      this.showNotification('Erro ao copiar texto', 'error');
      return false;
    }
  },

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  },

  /**
   * Scroll suave para elemento
   */
  scrollTo(element, offset = 0) {
    const target = typeof element === 'string' ? document.querySelector(element) : element;
    if (target) {
      const targetPosition = target.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  },

  /**
   * Formata grade de segurança
   */
  formatSecurityGrade(score) {
    if (score >= 90) return { grade: 'A+', class: 'grade-a-plus' };
    if (score >= 80) return { grade: 'A', class: 'grade-a' };
    if (score >= 70) return { grade: 'B', class: 'grade-b' };
    if (score >= 60) return { grade: 'C', class: 'grade-c' };
    if (score >= 50) return { grade: 'D', class: 'grade-d' };
    return { grade: 'F', class: 'grade-f' };
  },

  /**
   * Formata severidade de vulnerabilidade
   */
  formatSeverity(severity) {
    const severityMap = {
      'critical': { label: 'Crítico', class: 'text-critical' },
      'high': { label: 'Alto', class: 'text-high' },
      'medium': { label: 'Médio', class: 'text-medium' },
      'low': { label: 'Baixo', class: 'text-low' },
      'info': { label: 'Info', class: 'text-info' }
    };
    return severityMap[severity] || { label: severity, class: 'text-gray-600' };
  }
};

// CSS para notificações
const notificationStyles = `
  .notification-container {
    pointer-events: none;
  }
  
  .notification {
    pointer-events: auto;
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border-left: 4px solid;
    animation: slideIn 0.3s ease;
    overflow: hidden;
  }
  
  .notification--success { border-left-color: var(--color-success); }
  .notification--warning { border-left-color: var(--color-warning); }
  .notification--error { border-left-color: var(--color-error); }
  .notification--info { border-left-color: var(--color-info); }
  
  .notification-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
  }
  
  .notification-message {
    flex: 1;
    font-size: 0.875rem;
    color: var(--color-gray-800);
  }
  
  .notification-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--color-gray-500);
    cursor: pointer;
    padding: 0;
    margin-left: 1rem;
    line-height: 1;
  }
  
  .notification-close:hover {
    color: var(--color-gray-800);
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
  }
  
  .loading-spinner {
    text-align: center;
  }
`;

// Adiciona estilos das notificações
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = notificationStyles;
  document.head.appendChild(style);
}
