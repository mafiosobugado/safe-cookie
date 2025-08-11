/**
 * Home Demo Section Component
 * Handles demo buttons and example URLs
 */
class HomeDemoSection {
    constructor() {
        this.demoButtons = [];
        this.exampleUrls = [
            'https://github.com',
            'https://stackoverflow.com',
            'https://medium.com',
            'https://dev.to'
        ];
        
        this.init();
    }

    /**
     * Initialize demo section component
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.setupExamples();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.demoButtons = Array.from(document.querySelectorAll('[data-demo-url]'));
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.demoButtons.forEach(button => {
            button.addEventListener('click', this.handleDemoClick.bind(this));
        });

        // Add "Try Random URL" button functionality
        const randomButton = document.getElementById('try-random-url');
        if (randomButton) {
            randomButton.addEventListener('click', this.handleRandomUrlClick.bind(this));
        }
    }

    /**
     * Setup example URLs in demo buttons
     */
    setupExamples() {
        this.demoButtons.forEach((button, index) => {
            if (!button.dataset.demoUrl && this.exampleUrls[index]) {
                button.dataset.demoUrl = this.exampleUrls[index];
                
                // Update button text if needed
                if (!button.textContent.trim()) {
                    const url = new URL(this.exampleUrls[index]);
                    button.textContent = `Try ${url.hostname}`;
                }
            }
        });
    }

    /**
     * Handle demo button click
     */
    handleDemoClick(event) {
        event.preventDefault();
        
        const button = event.currentTarget;
        const demoUrl = button.dataset.demoUrl;
        
        if (!demoUrl) return;

        // Get URL form component
        const urlForm = window.homePage?.getComponent('urlForm');
        if (urlForm) {
            urlForm.setUrl(demoUrl);
            
            // Scroll to form
            const form = document.getElementById('url-analysis-form');
            if (form) {
                form.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
            
            // Add visual feedback
            this.showDemoFeedback(button, demoUrl);
        }
    }

    /**
     * Handle random URL button click
     */
    handleRandomUrlClick(event) {
        event.preventDefault();
        
        const randomUrl = this.getRandomExampleUrl();
        const button = event.currentTarget;
        
        // Create temporary demo data
        button.dataset.demoUrl = randomUrl;
        
        // Handle as regular demo click
        this.handleDemoClick(event);
        
        // Clean up temporary data
        delete button.dataset.demoUrl;
    }

    /**
     * Get random example URL
     */
    getRandomExampleUrl() {
        const additionalUrls = [
            'https://example.com',
            'https://httpbin.org',
            'https://jsonplaceholder.typicode.com',
            'https://reqres.in',
            'https://httpstat.us'
        ];
        
        const allUrls = [...this.exampleUrls, ...additionalUrls];
        return allUrls[Math.floor(Math.random() * allUrls.length)];
    }

    /**
     * Show demo feedback
     */
    showDemoFeedback(button, url) {
        // Add clicked state
        button.classList.add('demo-clicked');
        
        // Create feedback tooltip
        const feedback = document.createElement('div');
        feedback.className = 'demo-feedback';
        feedback.textContent = `URL set: ${new URL(url).hostname}`;
        
        // Position relative to button
        button.style.position = 'relative';
        button.appendChild(feedback);
        
        // Show feedback
        setTimeout(() => {
            feedback.classList.add('show');
        }, 50);
        
        // Remove feedback after delay
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => {
                feedback.remove();
                button.classList.remove('demo-clicked');
            }, 300);
        }, 2000);
    }

    /**
     * Add new demo URL
     */
    addDemoUrl(url, label = null) {
        if (!label) {
            try {
                const urlObj = new URL(url);
                label = `Try ${urlObj.hostname}`;
            } catch (e) {
                label = 'Try URL';
            }
        }

        // Create new demo button
        const button = document.createElement('button');
        button.className = 'btn btn-outline-secondary demo-btn';
        button.dataset.demoUrl = url;
        button.textContent = label;
        
        // Add event listener
        button.addEventListener('click', this.handleDemoClick.bind(this));
        
        // Add to demo buttons array
        this.demoButtons.push(button);
        
        // Add to DOM (assuming there's a demo container)
        const demoContainer = document.querySelector('.demo-urls');
        if (demoContainer) {
            demoContainer.appendChild(button);
        }
        
        return button;
    }

    /**
     * Remove demo URL
     */
    removeDemoUrl(url) {
        const button = this.demoButtons.find(btn => btn.dataset.demoUrl === url);
        if (button) {
            button.remove();
            this.demoButtons = this.demoButtons.filter(btn => btn !== button);
        }
    }

    /**
     * Get all demo URLs
     */
    getDemoUrls() {
        return this.demoButtons.map(button => button.dataset.demoUrl).filter(Boolean);
    }

    /**
     * Update demo button state
     */
    updateDemoButtonState(url, state) {
        const button = this.demoButtons.find(btn => btn.dataset.demoUrl === url);
        if (!button) return;

        // Remove existing state classes
        button.classList.remove('demo-success', 'demo-error', 'demo-loading');
        
        // Add new state class
        if (state) {
            button.classList.add(`demo-${state}`);
        }
    }

    /**
     * Highlight popular demo URLs
     */
    highlightPopularUrls() {
        const popularUrls = ['https://github.com', 'https://stackoverflow.com'];
        
        this.demoButtons.forEach(button => {
            if (popularUrls.includes(button.dataset.demoUrl)) {
                button.classList.add('demo-popular');
                
                // Add popular badge
                if (!button.querySelector('.popular-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'popular-badge';
                    badge.textContent = 'Popular';
                    button.appendChild(badge);
                }
            }
        });
    }

    /**
     * Create demo URL carousel (for mobile)
     */
    createMobileCarousel() {
        if (window.innerWidth > 768) return;

        const demoContainer = document.querySelector('.demo-urls');
        if (!demoContainer || demoContainer.classList.contains('carousel-enabled')) return;

        demoContainer.classList.add('carousel-enabled');
        
        // Add touch/swipe support
        let startX = 0;
        let currentX = 0;
        let isDragging = false;

        demoContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });

        demoContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            demoContainer.style.transform = `translateX(${deltaX}px)`;
        });

        demoContainer.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaX = currentX - startX;
            const threshold = 50;
            
            if (Math.abs(deltaX) > threshold) {
                // Snap to next/previous
                const containerWidth = demoContainer.offsetWidth;
                const buttonWidth = 120; // Approximate button width
                const direction = deltaX > 0 ? -1 : 1;
                const translateX = direction * buttonWidth;
                
                demoContainer.style.transform = `translateX(${translateX}px)`;
                demoContainer.style.transition = 'transform 0.3s ease';
                
                setTimeout(() => {
                    demoContainer.style.transition = '';
                }, 300);
            } else {
                // Snap back
                demoContainer.style.transform = 'translateX(0)';
                demoContainer.style.transition = 'transform 0.3s ease';
                
                setTimeout(() => {
                    demoContainer.style.transition = '';
                }, 300);
            }
        });
    }

    /**
     * Show demo tutorial
     */
    showDemoTutorial() {
        const tutorial = document.createElement('div');
        tutorial.className = 'demo-tutorial';
        tutorial.innerHTML = `
            <div class="tutorial-content">
                <h4>Try Demo URLs</h4>
                <p>Click any of the example URLs below to quickly test the security analysis:</p>
                <ul>
                    <li>🔒 SSL/TLS Certificate Analysis</li>
                    <li>🍪 Cookie Security Scanning</li>
                    <li>🛡️ Security Headers Check</li>
                </ul>
                <button class="btn btn-sm btn-primary" id="close-tutorial">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(tutorial);
        
        // Show tutorial
        setTimeout(() => {
            tutorial.classList.add('show');
        }, 100);
        
        // Close tutorial
        tutorial.querySelector('#close-tutorial').addEventListener('click', () => {
            tutorial.classList.remove('show');
            setTimeout(() => {
                tutorial.remove();
            }, 300);
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (tutorial.parentNode) {
                tutorial.classList.remove('show');
                setTimeout(() => {
                    tutorial.remove();
                }, 300);
            }
        }, 10000);
    }

    /**
     * Destroy component
     */
    destroy() {
        this.demoButtons.forEach(button => {
            const feedback = button.querySelector('.demo-feedback');
            if (feedback) {
                feedback.remove();
            }
            button.classList.remove('demo-clicked', 'demo-success', 'demo-error', 'demo-loading');
        });
    }
}

// Make globally available
window.HomeDemoSection = HomeDemoSection;
