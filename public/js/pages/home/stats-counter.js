/**
 * Home Stats Counter Component
 * Handles animated statistics counters
 */
class HomeStatsCounter {
    constructor() {
        this.counters = {};
        this.hasAnimated = false;
        this.observer = null;
        this.apiClientReady = false;
        
        this.init();
    }

    /**
     * Load fallback statistics when API is not available
     */
    loadFallbackStats() {
        console.log('[Stats Counter] Loading fallback stats');
        this.updateStatsData({
            analyzed: 52847,
            vulnerabilities: 16234,
            secured: 36613,
            users: 11205
        });
    }

    /**
     * Initialize stats counter component
     */
    init() {
        this.bindElements();
        this.setupIntersectionObserver();
        
        // Check if apiClient is ready
        if (window.apiClient) {
            this.apiClientReady = true;
            this.loadStats();
        } else {
            // Wait for apiClient to be ready
            document.addEventListener('safecookie:ready', () => {
                this.apiClientReady = true;
                this.loadStats();
            });
            
            // Fallback timeout
            setTimeout(() => {
                if (!this.apiClientReady) {
                    console.warn('[Stats Counter] Timeout waiting for apiClient, using fallback');
                    this.loadFallbackStats();
                }
            }, 2000);
        }
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        // Find stat elements by data-target attribute instead of specific IDs
        const statElements = document.querySelectorAll('[data-target]');
        this.counters = {};
        
        statElements.forEach((element, index) => {
            const statNames = ['analyzed', 'vulnerabilities', 'secured', 'users'];
            if (statNames[index]) {
                this.counters[statNames[index]] = element;
            }
        });
    }

    /**
     * Load statistics from API
     */
    async loadStats() {
        try {
            console.log('[Stats Counter] Loading stats from API');
            const response = await window.apiClient.getStats();
            
            if (response.data) {
                console.log('[Stats Counter] Stats loaded successfully:', response.data);
                this.updateStatsData(response.data);
            } else {
                this.loadFallbackStats();
            }
        } catch (error) {
            console.warn('[Stats Counter] Could not load stats:', error);
            this.loadFallbackStats();
        }
    }

    /**
     * Update stats data
     */
    updateStatsData(stats) {
        Object.entries(this.counters).forEach(([key, element]) => {
            if (element && stats[key] !== undefined) {
                element.dataset.count = stats[key];
                element.dataset.originalCount = stats[key];
            }
        });
    }

    /**
     * Setup intersection observer for animation trigger
     */
    setupIntersectionObserver() {
        const statsSection = document.querySelector('.stats-section');
        if (!statsSection) return;

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasAnimated) {
                    this.animateCounters();
                    this.hasAnimated = true;
                }
            });
        }, { 
            threshold: 0.5,
            rootMargin: '0px 0px -100px 0px'
        });

        this.observer.observe(statsSection);
    }

    /**
     * Animate all counters
     */
    animateCounters() {
        Object.entries(this.counters).forEach(([key, element], index) => {
            if (!element) return;

            // Stagger animations
            setTimeout(() => {
                this.animateCounter(element);
            }, index * 200);
        });
    }

    /**
     * Animate individual counter
     */
    animateCounter(element) {
        const finalValue = parseInt(element.dataset.count) || 0;
        const duration = 2000;
        const startTime = performance.now();
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (finalValue - startValue) * easeOut);
            
            element.textContent = this.formatNumber(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = this.formatNumber(finalValue);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Format numbers with K/M suffixes
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Increment analyzed count (optimistic update)
     */
    incrementAnalyzedCount() {
        const element = this.counters.analyzed;
        if (!element) return;

        const currentCount = parseInt(element.dataset.count) || 0;
        const newCount = currentCount + 1;
        
        element.dataset.count = newCount;
        element.textContent = this.formatNumber(newCount);
        
        // Add flash animation
        element.classList.add('stats-flash');
        setTimeout(() => {
            element.classList.remove('stats-flash');
        }, 600);
    }

    /**
     * Reset animation state (for testing)
     */
    resetAnimation() {
        this.hasAnimated = false;
        
        Object.values(this.counters).forEach(element => {
            if (element) {
                element.textContent = '0';
            }
        });
    }

    /**
     * Update specific stat
     */
    updateStat(statName, value) {
        const element = this.counters[statName];
        if (element) {
            element.dataset.count = value;
            
            if (this.hasAnimated) {
                // If already animated, just update the value
                element.textContent = this.formatNumber(value);
            }
        }
    }

    /**
     * Get current stat value
     */
    getStat(statName) {
        const element = this.counters[statName];
        return element ? parseInt(element.dataset.count) || 0 : 0;
    }

    /**
     * Force animate specific counter
     */
    animateSpecificCounter(statName) {
        const element = this.counters[statName];
        if (element) {
            this.animateCounter(element);
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Make globally available
window.HomeStatsCounter = HomeStatsCounter;
