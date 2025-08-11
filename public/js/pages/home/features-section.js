/**
 * Home Features Section Component
 * Handles feature cards interactions and animations
 */
class HomeFeaturesSection {
    constructor() {
        this.featureCards = [];
        this.observer = null;
        
        this.init();
    }

    /**
     * Initialize features section component
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.setupAnimations();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.featureCards = Array.from(document.querySelectorAll('.feature-card'));
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.featureCards.forEach((card, index) => {
            // Hover effects
            card.addEventListener('mouseenter', () => this.handleCardHover(card, true));
            card.addEventListener('mouseleave', () => this.handleCardHover(card, false));
            
            // Click effects for mobile
            card.addEventListener('click', (e) => this.handleCardClick(card, e));
            
            // Focus effects for keyboard navigation
            card.addEventListener('focus', () => this.handleCardFocus(card, true));
            card.addEventListener('blur', () => this.handleCardFocus(card, false));
        });
    }

    /**
     * Handle card hover
     */
    handleCardHover(card, isHovering) {
        if (window.innerWidth <= 768) return; // Skip on mobile
        
        card.classList.toggle('feature-card--hover', isHovering);
        
        // Add subtle animation to other cards
        if (isHovering) {
            this.featureCards.forEach(otherCard => {
                if (otherCard !== card) {
                    otherCard.classList.add('feature-card--dimmed');
                }
            });
        } else {
            this.featureCards.forEach(otherCard => {
                otherCard.classList.remove('feature-card--dimmed');
            });
        }
    }

    /**
     * Handle card click (mobile)
     */
    handleCardClick(card, event) {
        if (window.innerWidth > 768) return; // Skip on desktop
        
        event.preventDefault();
        
        // Toggle active state
        const isActive = card.classList.contains('feature-card--active');
        
        // Close all other cards
        this.featureCards.forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.classList.remove('feature-card--active');
            }
        });
        
        // Toggle current card
        card.classList.toggle('feature-card--active', !isActive);
    }

    /**
     * Handle card focus (keyboard navigation)
     */
    handleCardFocus(card, isFocused) {
        card.classList.toggle('feature-card--focused', isFocused);
        
        if (isFocused) {
            // Ensure card is visible
            this.scrollCardIntoView(card);
        }
    }

    /**
     * Scroll card into view smoothly
     */
    scrollCardIntoView(card) {
        card.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
        });
    }

    /**
     * Setup scroll animations
     */
    setupAnimations() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Stagger animation based on card position
                    const cardIndex = this.featureCards.indexOf(entry.target);
                    setTimeout(() => {
                        entry.target.classList.add('animate-in');
                    }, cardIndex * 150);
                    
                    // Stop observing once animated
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe all feature cards
        this.featureCards.forEach(card => {
            this.observer.observe(card);
        });
    }

    /**
     * Highlight specific feature
     */
    highlightFeature(featureId) {
        const card = document.querySelector(`[data-feature="${featureId}"]`);
        if (!card) return;

        // Remove existing highlights
        this.featureCards.forEach(c => c.classList.remove('feature-card--highlighted'));
        
        // Add highlight
        card.classList.add('feature-card--highlighted');
        
        // Scroll into view
        this.scrollCardIntoView(card);
        
        // Auto-remove highlight after 3 seconds
        setTimeout(() => {
            card.classList.remove('feature-card--highlighted');
        }, 3000);
    }

    /**
     * Show feature details modal (if needed)
     */
    showFeatureDetails(featureId) {
        const featureData = this.getFeatureData(featureId);
        if (!featureData) return;

        // Could implement modal or expanded view
        console.log('Show feature details:', featureData);
    }

    /**
     * Get feature data by ID
     */
    getFeatureData(featureId) {
        const features = {
            'cookie-analysis': {
                title: 'Cookie Analysis',
                description: 'Comprehensive analysis of HTTP cookies for security vulnerabilities',
                details: [
                    'Secure flag validation',
                    'HttpOnly flag checking',
                    'SameSite attribute analysis',
                    'Expiration date validation',
                    'Domain and path security'
                ]
            },
            'ssl-analysis': {
                title: 'SSL/TLS Analysis',
                description: 'Deep inspection of SSL certificates and TLS configuration',
                details: [
                    'Certificate validity checking',
                    'Cipher suite analysis',
                    'Protocol version validation',
                    'Certificate chain verification',
                    'HSTS policy checking'
                ]
            },
            'header-analysis': {
                title: 'Security Headers',
                description: 'Analysis of HTTP security headers and their configurations',
                details: [
                    'Content Security Policy',
                    'X-Frame-Options',
                    'X-Content-Type-Options',
                    'Referrer-Policy',
                    'Permissions-Policy'
                ]
            }
        };

        return features[featureId];
    }

    /**
     * Add feature card dynamically (for future use)
     */
    addFeatureCard(featureData) {
        const card = document.createElement('div');
        card.className = 'feature-card';
        card.dataset.feature = featureData.id;
        
        card.innerHTML = `
            <div class="feature-card__icon">
                <i class="${featureData.icon}"></i>
            </div>
            <div class="feature-card__content">
                <h3 class="feature-card__title">${featureData.title}</h3>
                <p class="feature-card__description">${featureData.description}</p>
            </div>
        `;

        // Add event listeners
        card.addEventListener('mouseenter', () => this.handleCardHover(card, true));
        card.addEventListener('mouseleave', () => this.handleCardHover(card, false));
        card.addEventListener('click', (e) => this.handleCardClick(card, e));

        // Add to features container
        const container = document.querySelector('.features-grid');
        if (container) {
            container.appendChild(card);
            this.featureCards.push(card);
            
            // Setup observer for new card
            if (this.observer) {
                this.observer.observe(card);
            }
        }

        return card;
    }

    /**
     * Filter features (for search functionality)
     */
    filterFeatures(searchTerm) {
        if (!searchTerm) {
            this.showAllFeatures();
            return;
        }

        this.featureCards.forEach(card => {
            const title = card.querySelector('.feature-card__title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.feature-card__description')?.textContent.toLowerCase() || '';
            
            const matches = title.includes(searchTerm.toLowerCase()) || 
                          description.includes(searchTerm.toLowerCase());
            
            card.style.display = matches ? 'block' : 'none';
        });
    }

    /**
     * Show all features
     */
    showAllFeatures() {
        this.featureCards.forEach(card => {
            card.style.display = 'block';
        });
    }

    /**
     * Get feature card by ID
     */
    getFeatureCard(featureId) {
        return this.featureCards.find(card => card.dataset.feature === featureId);
    }

    /**
     * Reset all card states
     */
    resetCardStates() {
        this.featureCards.forEach(card => {
            card.classList.remove(
                'feature-card--hover',
                'feature-card--active',
                'feature-card--focused',
                'feature-card--highlighted',
                'feature-card--dimmed'
            );
        });
    }

    /**
     * Destroy component
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.resetCardStates();
    }
}

// Make globally available
window.HomeFeaturesSection = HomeFeaturesSection;
