/**
 * Helper utilities for Safe Cookie Application
 * Common functions used across the application
 */

/**
 * DOM Helpers
 */
const DOM = {
    /**
     * Get element by ID
     */
    get(id) {
        return document.getElementById(id);
    },

    /**
     * Get elements by class name
     */
    getByClass(className) {
        return document.getElementsByClassName(className);
    },

    /**
     * Query selector
     */
    query(selector) {
        return document.querySelector(selector);
    },

    /**
     * Query all selectors
     */
    queryAll(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Create element with attributes
     */
    create(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class') {
                element.className = value;
            } else if (key === 'data') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.setAttribute(`data-${dataKey}`, dataValue);
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        if (content) {
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else {
                element.appendChild(content);
            }
        }

        return element;
    },

    /**
     * Add class to element
     */
    addClass(element, className) {
        if (element && className) {
            element.classList.add(className);
        }
    },

    /**
     * Remove class from element
     */
    removeClass(element, className) {
        if (element && className) {
            element.classList.remove(className);
        }
    },

    /**
     * Toggle class on element
     */
    toggleClass(element, className) {
        if (element && className) {
            element.classList.toggle(className);
        }
    },

    /**
     * Check if element has class
     */
    hasClass(element, className) {
        return element && className && element.classList.contains(className);
    },

    /**
     * Show element
     */
    show(element) {
        if (element) {
            this.removeClass(element, 'hidden');
            element.style.display = '';
        }
    },

    /**
     * Hide element
     */
    hide(element) {
        if (element) {
            this.addClass(element, 'hidden');
        }
    },

    /**
     * Check if element is visible
     */
    isVisible(element) {
        return element && !this.hasClass(element, 'hidden') && element.style.display !== 'none';
    }
};

/**
 * Validation Helpers
 */
const Validation = {
    /**
     * Validate URL
     */
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    },

    /**
     * Validate email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Check if string is empty or only whitespace
     */
    isEmpty(str) {
        return !str || str.trim().length === 0;
    },

    /**
     * Validate form field
     */
    validateField(element, rules = {}) {
        const value = element.value;
        const errors = [];

        if (rules.required && this.isEmpty(value)) {
            errors.push('Este campo é obrigatório');
        }

        if (rules.minLength && value.length < rules.minLength) {
            errors.push(`Mínimo de ${rules.minLength} caracteres`);
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Máximo de ${rules.maxLength} caracteres`);
        }

        if (rules.url && !this.isEmpty(value) && !this.isValidUrl(value)) {
            errors.push('URL inválida');
        }

        if (rules.email && !this.isEmpty(value) && !this.isValidEmail(value)) {
            errors.push('Email inválido');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
};

/**
 * Utility Functions
 */
const Utils = {
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
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Format date
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return new Intl.DateTimeFormat('pt-BR', { ...defaultOptions, ...options })
            .format(new Date(date));
    },

    /**
     * Format number
     */
    formatNumber(number, options = {}) {
        return new Intl.NumberFormat('pt-BR', options).format(number);
    },

    /**
     * Generate random ID
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Merge objects
     */
    merge(target, ...sources) {
        return Object.assign(target, ...sources);
    },

    /**
     * Get nested property safely
     */
    get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;

        for (const key of keys) {
            if (result == null || typeof result !== 'object') {
                return defaultValue;
            }
            result = result[key];
        }

        return result !== undefined ? result : defaultValue;
    },

    /**
     * Set nested property
     */
    set(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;

        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[lastKey] = value;
        return obj;
    },

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Convert to title case
     */
    titleCase(str) {
        return str.replace(/\w\S*/g, txt => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },

    /**
     * Truncate string
     */
    truncate(str, length = 100, suffix = '...') {
        if (str.length <= length) return str;
        return str.substr(0, length) + suffix;
    },

    /**
     * Parse query string
     */
    parseQuery(queryString = window.location.search) {
        const params = new URLSearchParams(queryString);
        const result = {};
        
        for (const [key, value] of params) {
            result[key] = value;
        }
        
        return result;
    },

    /**
     * Build query string
     */
    buildQuery(params) {
        const searchParams = new URLSearchParams();
        
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                searchParams.append(key, value);
            }
        });
        
        return searchParams.toString();
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    },

    /**
     * Download data as file
     */
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Format file size
     */
    formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Get security grade color
     */
    getGradeColor(grade) {
        const colors = {
            'A+': '#4caf50',
            'A': '#66bb6a',
            'B': '#ffb74d',
            'C': '#ff8a65',
            'D': '#ef5350',
            'F': '#d32f2f'
        };
        return colors[grade] || colors['F'];
    },

    /**
     * Get severity color
     */
    getSeverityColor(severity) {
        const colors = {
            'critical': '#d32f2f',
            'high': '#ff5722',
            'medium': '#ff9800',
            'low': '#ffc107',
            'info': '#2196f3'
        };
        return colors[severity] || colors['info'];
    }
};

/**
 * Event Helpers
 */
const Events = {
    /**
     * Add event listener with automatic cleanup
     */
    on(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        
        return () => {
            element.removeEventListener(event, handler, options);
        };
    },

    /**
     * Add one-time event listener
     */
    once(element, event, handler) {
        return this.on(element, event, handler, { once: true });
    },

    /**
     * Trigger custom event
     */
    trigger(element, eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        element.dispatchEvent(event);
    },

    /**
     * Wait for DOM to be ready
     */
    ready(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }
};

/**
 * Storage Helpers
 */
const Storage = {
    /**
     * Set item in localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
            return false;
        }
    },

    /**
     * Get item from localStorage
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error('Failed to read from localStorage:', err);
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (err) {
            console.error('Failed to remove from localStorage:', err);
            return false;
        }
    },

    /**
     * Clear all localStorage
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (err) {
            console.error('Failed to clear localStorage:', err);
            return false;
        }
    }
};

/**
 * Quick analyze function for preset URLs
 */
function quickAnalyze(url) {
    const urlInput = document.getElementById('url-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    
    if (urlInput) {
        urlInput.value = url;
        urlInput.focus();
        
        // Trigger analysis if button exists
        if (analyzeBtn) {
            analyzeBtn.click();
        }
    }
}

// Make function globally available
window.quickAnalyze = quickAnalyze;

// Make helpers globally available
window.DOM = DOM;
window.Validation = Validation;
window.Utils = Utils;
window.Events = Events;
window.Storage = Storage;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DOM,
        Validation,
        Utils,
        Events,
        Storage,
        quickAnalyze
    };
} else {
    // Original export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            DOM,
            Validation,
            Utils,
            Events,
            Storage
        };
    }
}
