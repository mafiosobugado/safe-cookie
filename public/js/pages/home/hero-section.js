/**
 * Home Hero Section Component
 * Handles hero section animations and interactions
 */
class HomeHeroSection {
    constructor() {
        this.heroSection = null;
        this.heroTitle = null;
        this.heroSubtitle = null;
        this.heroForm = null;
        this.backgroundVideo = null;
        
        this.init();
    }

    /**
     * Initialize hero section component
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.initializeAnimations();
        this.setupBackgroundEffects();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.heroSection = document.querySelector('.hero-section');
        this.heroTitle = document.querySelector('.hero-title');
        this.heroSubtitle = document.querySelector('.hero-subtitle');
        this.heroForm = document.querySelector('.hero-form');
        this.backgroundVideo = document.querySelector('.hero-background-video');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Scroll effects
        window.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Resize effects
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Video events
        if (this.backgroundVideo) {
            this.backgroundVideo.addEventListener('loadeddata', this.handleVideoLoaded.bind(this));
            this.backgroundVideo.addEventListener('error', this.handleVideoError.bind(this));
        }
    }

    /**
     * Initialize entrance animations
     */
    initializeAnimations() {
        if (!this.heroSection) return;
        
        // Stagger entrance animations
        const animationSequence = [
            { element: this.heroTitle, delay: 100 },
            { element: this.heroSubtitle, delay: 300 },
            { element: this.heroForm, delay: 500 }
        ];
        
        animationSequence.forEach(({ element, delay }) => {
            if (element) {
                setTimeout(() => {
                    element.classList.add('animate-in');
                }, delay);
            }
        });
    }

    /**
     * Setup background effects
     */
    setupBackgroundEffects() {
        // Initialize video background if available
        if (this.backgroundVideo) {
            this.initializeBackgroundVideo();
        }
        
        // Setup parallax effect
        this.setupParallaxEffect();
    }

    /**
     * Initialize background video
     */
    initializeBackgroundVideo() {
        // Ensure video is muted and autoplays
        this.backgroundVideo.muted = true;
        this.backgroundVideo.autoplay = true;
        this.backgroundVideo.loop = true;
        this.backgroundVideo.playsInline = true;
        
        // Try to play the video
        const playPromise = this.backgroundVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Video autoplay failed:', error);
                this.handleVideoError();
            });
        }
    }

    /**
     * Handle video loaded
     */
    handleVideoLoaded() {
        if (this.backgroundVideo) {
            this.backgroundVideo.classList.add('video-loaded');
        }
    }

    /**
     * Handle video error
     */
    handleVideoError() {
        if (this.backgroundVideo) {
            this.backgroundVideo.style.display = 'none';
            // Fallback to static background
            if (this.heroSection) {
                this.heroSection.classList.add('hero-fallback-bg');
            }
        }
    }

    /**
     * Setup parallax effect
     */
    setupParallaxEffect() {
        if (!this.heroSection) return;
        
        // Only enable on desktop for performance
        if (window.innerWidth <= 768) return;
        
        this.parallaxEnabled = true;
        this.handleScroll();
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        if (!this.parallaxEnabled || !this.heroSection) return;
        
        const scrollY = window.pageYOffset;
        const heroHeight = this.heroSection.offsetHeight;
        
        // Only apply parallax while hero is visible
        if (scrollY < heroHeight) {
            const parallaxSpeed = 0.5;
            const translateY = scrollY * parallaxSpeed;
            
            if (this.backgroundVideo) {
                this.backgroundVideo.style.transform = `translateY(${translateY}px)`;
            }
            
            // Fade out hero content as user scrolls
            const opacity = Math.max(0, 1 - (scrollY / heroHeight) * 1.5);
            const heroContent = this.heroSection.querySelector('.hero-content');
            if (heroContent) {
                heroContent.style.opacity = opacity;
            }
        }
    }

    /**
     * Handle resize events
     */
    handleResize() {
        // Disable parallax on mobile
        this.parallaxEnabled = window.innerWidth > 768;
        
        if (!this.parallaxEnabled && this.backgroundVideo) {
            this.backgroundVideo.style.transform = '';
        }
    }

    /**
     * Show success state after analysis
     */
    showSuccessState() {
        if (!this.heroSection) return;
        
        // Add success animation class
        this.heroSection.classList.add('hero-success');
        
        // Create success indicator
        this.createSuccessIndicator();
        
        // Reset after animation
        setTimeout(() => {
            this.heroSection.classList.remove('hero-success');
            this.removeSuccessIndicator();
        }, 3000);
    }

    /**
     * Create success indicator
     */
    createSuccessIndicator() {
        let indicator = document.getElementById('hero-success-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'hero-success-indicator';
            indicator.className = 'hero-success-indicator';
            indicator.innerHTML = `
                <div class="success-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <div class="success-text">Analysis Started!</div>
            `;
            
            this.heroSection.appendChild(indicator);
        }
        
        // Trigger animation
        setTimeout(() => {
            indicator.classList.add('show');
        }, 100);
    }

    /**
     * Remove success indicator
     */
    removeSuccessIndicator() {
        const indicator = document.getElementById('hero-success-indicator');
        if (indicator) {
            indicator.classList.remove('show');
            setTimeout(() => {
                indicator.remove();
            }, 300);
        }
    }

    /**
     * Destroy component
     */
    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
        }
        
        this.removeSuccessIndicator();
    }
}

// Make globally available
window.HomeHeroSection = HomeHeroSection;
