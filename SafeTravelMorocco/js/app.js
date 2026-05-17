// App Core Logic
const App = {
    state: {
        theme: localStorage.getItem('theme') || 'light',
        language: localStorage.getItem('language') || 'en',
        currentPage: null,
        data: {
            cities: [],
            hotels: [],
            restaurants: [],
            activities: [],
            guides: []
        }
    },

    init: async function() {
        this.applyTheme();
        this.setupNavigation();
        
        // Preload data
        await this.loadData();

        // Initial route
        const isFirstVisit = !localStorage.getItem('visited');
        if (isFirstVisit) {
            this.navigate('splash');
        } else {
            this.navigate('home');
        }
    },

    applyTheme: function() {
        if (this.state.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    toggleTheme: function() {
        this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.state.theme);
        this.applyTheme();
    },

    async loadData() {
        try {
            const [cities, hotels, restaurants, activities, guides] = await Promise.all([
                fetch('data/cities.json?v=2').then(r => r.json()),
                fetch('data/hotels.json?v=2').then(r => r.json()),
                fetch('data/restaurants.json?v=2').then(r => r.json()),
                fetch('data/activities.json?v=2').then(r => r.json()),
                fetch('data/guides.json?v=2').then(r => r.json())
            ]);
            
            this.state.data = { cities, hotels, restaurants, activities, guides };
        } catch (e) {
            console.error("Failed to load mock data. If using file:// protocol, CORS might block fetch().", e);
        }
    },

    setupNavigation: function() {
        const bottomNav = document.getElementById('bottom-nav');
        const navItems = bottomNav.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const target = item.getAttribute('data-target');
                if (target) {
                    this.navigate(target);
                    // Update active state
                    navItems.forEach(nav => {
                        nav.classList.remove('text-primary', 'active');
                        nav.classList.add('text-gray-400');
                    });
                    if (!item.querySelector('.bg-gradient-to-tr')) { // Exclude scanner middle button
                        item.classList.remove('text-gray-400');
                        item.classList.add('text-primary', 'active');
                    }
                }
            });
        });

        // Back button
        document.getElementById('back-btn').addEventListener('click', () => {
            this.navigate('home'); // Simple fallback, in a real app use history stack
        });
    },

    updateHeader: function(title, showBack = true) {
        const header = document.getElementById('app-header');
        const headerTitle = document.getElementById('header-title');
        const backBtn = document.getElementById('back-btn');
        const bottomNav = document.getElementById('bottom-nav');

        headerTitle.textContent = title;
        
        if (title === 'Splash' || title === 'Welcome') {
            header.classList.add('hidden');
            bottomNav.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
            if (title === 'Home') {
                backBtn.classList.add('invisible');
                bottomNav.classList.remove('hidden');
            } else {
                backBtn.classList.remove('invisible');
                // Keep bottom nav visible except on specific pages
                if (['Scanner', 'Translation', 'SOS', 'Budget'].includes(title)) {
                    bottomNav.classList.add('hidden');
                } else {
                    bottomNav.classList.remove('hidden');
                }
            }
        }
    },

    navigate: async function(page) {
        if (this.state.currentPage === page) return;
        
        const contentArea = document.getElementById('app-content');
        
        // Exit animation for current
        if (this.state.currentPage) {
            contentArea.classList.add('page-exit');
            await new Promise(r => setTimeout(r, 200));
        }

        this.state.currentPage = page;
        
        // Setup Header logic based on page
        const titles = {
            'home': 'Home',
            'splash': 'Splash',
            'welcome': 'Welcome',
            'planner': 'Budget',
            'scanner': 'Scanner',
            'product-scanner': 'Product Price',
            'translation': 'Translation',
            'transportation': 'Transportation',
            'guides': 'Local Guides',
            'sos': 'SOS',
            'notifications': 'Alerts',
            'profile': 'Profile',
            'settings': 'Settings'
        };

        this.updateHeader(titles[page] || 'SafeTravel');

        // Render Page (Using fetch to get HTML, fallback to generating JS if CORS fails)
        try {
            const response = await fetch(`pages/${page}.html?v=2`);
            if (response.ok) {
                const html = await response.text();
                contentArea.innerHTML = html;
            } else {
                throw new Error("Page not found");
            }
        } catch (e) {
            console.error(e);
            contentArea.innerHTML = `<div class="p-6 text-center text-red-500">Error loading page. Ensure you are running a local server.</div>`;
        }

        // Initialize page specific logic
        this.initPageLogic(page);

        // Enter animation
        contentArea.classList.remove('page-exit');
        contentArea.classList.add('page-enter');
        setTimeout(() => contentArea.classList.remove('page-enter'), 300);
    },

    initPageLogic: function(page) {
        // Depending on page, call specific JS setup
        switch(page) {
            case 'splash':
                setTimeout(() => this.navigate('welcome'), 3000);
                break;
            case 'welcome':
                const startBtn = document.getElementById('start-btn');
                if(startBtn) {
                    startBtn.addEventListener('click', () => {
                        localStorage.setItem('visited', 'true');
                        this.navigate('home');
                    });
                }
                break;
            case 'home':
                this.renderHome();
                break;
            case 'planner':
                this.initPlanner();
                break;
            case 'scanner':
                this.initScanner();
                break;
            case 'settings':
                this.initSettings();
                break;
            case 'guides':
                this.renderGuides();
                break;
            // Add other page initializers here
        }
    },

    // --- Specific Page Logics ---

    renderHome: function() {
        const carousel = document.getElementById('featured-carousel');
        const popularList = document.getElementById('popular-list');
        
        if (!carousel || !popularList) return;

        // Render Cities if data is loaded, else show skeleton
        if (this.state.data.cities.length > 0) {
            carousel.innerHTML = '';
            popularList.innerHTML = '';

            this.state.data.cities.forEach(city => {
                // Featured
                carousel.innerHTML += `
                    <div class="flex-shrink-0 w-64 h-80 rounded-2xl overflow-hidden relative shadow-soft ml-4 snap-center cursor-pointer hover:scale-[1.02] transition-transform">
                        <img src="${city.image}" class="w-full h-full object-cover" alt="${city.name}">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div class="absolute bottom-4 left-4 text-white">
                            <h3 class="text-xl font-heading font-semibold">${city.name}</h3>
                            <p class="text-sm text-gray-200"><i class="fas fa-map-marker-alt text-primary mr-1"></i>Morocco</p>
                        </div>
                    </div>
                `;

                // Popular
                popularList.innerHTML += `
                    <div class="glass-card flex p-3 gap-4 mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-darkCard transition-colors">
                        <img src="${city.image}" class="w-20 h-20 rounded-xl object-cover" alt="${city.name}">
                        <div class="flex-1 py-1">
                            <h4 class="font-heading font-semibold">${city.name}</h4>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${city.description}</p>
                            <div class="flex gap-2 mt-2">
                                ${city.category.map(c => `<span class="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full">${c}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        // Link action cards
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-action');
                if (target) this.navigate(target);
            });
        });
    },

    initPlanner: function() {
        const form = document.getElementById('budget-form');
        const resultArea = document.getElementById('budget-result');
        
        if(form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Show loading skeleton
                resultArea.innerHTML = `
                    <div class="mt-8 space-y-4 slide-up">
                        <h3 class="font-heading font-semibold text-lg">AI Recommendations</h3>
                        <div class="h-40 skeleton"></div>
                        <div class="h-24 skeleton"></div>
                        <div class="h-24 skeleton"></div>
                    </div>
                `;
                resultArea.classList.remove('hidden');

                // Simulate AI processing
                setTimeout(() => {
                    const budget = document.getElementById('budget-input').value;
                    const hotel = this.state.data.hotels[0];
                    const activity = this.state.data.activities[0];

                    resultArea.innerHTML = `
                        <div class="mt-8 space-y-6 slide-up">
                            <div class="flex justify-between items-end">
                                <h3 class="font-heading font-semibold text-lg">Your Smart Itinerary</h3>
                                <span class="text-sm text-primary font-medium">Under Budget!</span>
                            </div>
                            
                            <!-- Summary Card -->
                            <div class="glass-card p-5 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                                <div class="flex justify-between mb-2">
                                    <span class="text-sm text-gray-600 dark:text-gray-400">Estimated Total</span>
                                    <span class="font-bold text-xl">$${(hotel?.price_per_night || 0) + (activity?.price || 0)}</span>
                                </div>
                                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                                    <div class="bg-primary h-2 rounded-full" style="width: 65%"></div>
                                </div>
                                <span class="text-xs text-gray-500">65% of your $${budget} budget</span>
                            </div>

                            <!-- Recommended Hotel -->
                            <div>
                                <h4 class="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wider">Stay</h4>
                                <div class="glass-card flex p-3 gap-4">
                                    <img src="${hotel?.image || 'https://via.placeholder.com/150'}" class="w-20 h-20 rounded-xl object-cover">
                                    <div class="flex-1 py-1">
                                        <div class="flex justify-between">
                                            <h4 class="font-heading font-semibold text-sm">${hotel?.name || 'Hotel'}</h4>
                                            <span class="text-primary font-bold text-sm">$${hotel?.price_per_night || 0}/n</span>
                                        </div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1"><i class="fas fa-star text-yellow-400"></i> ${hotel?.rating || 5.0} • ${hotel?.category || 'Stay'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Recommended Activity -->
                            <div>
                                <h4 class="text-sm font-semibold mb-3 text-gray-500 uppercase tracking-wider">Experience</h4>
                                <div class="glass-card flex p-3 gap-4">
                                    <img src="${activity?.image || 'https://via.placeholder.com/150'}" class="w-20 h-20 rounded-xl object-cover">
                                    <div class="flex-1 py-1">
                                        <div class="flex justify-between">
                                            <h4 class="font-heading font-semibold text-sm">${activity?.name || 'Activity'}</h4>
                                            <span class="text-primary font-bold text-sm">$${activity?.price || 0}</span>
                                        </div>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1"><i class="fas fa-clock text-gray-400"></i> ${activity?.duration || '2h'} • ${activity?.category || 'Fun'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }, 1500);
            });
        }
    },

    initScanner: function() {
        const scanBtn = document.getElementById('scan-btn');
        const scannerUi = document.getElementById('scanner-ui');
        const resultCard = document.getElementById('scan-result');

        if(scanBtn && scannerUi && resultCard) {
            scanBtn.addEventListener('click', () => {
                scannerUi.classList.add('hidden');
                resultCard.classList.remove('hidden');
            });
        }
    },

    initSettings: function() {
        const themeToggle = document.getElementById('theme-toggle');
        if(themeToggle) {
            themeToggle.checked = this.state.theme === 'dark';
            themeToggle.addEventListener('change', () => {
                this.toggleTheme();
            });
        }
    },

    renderGuides: function() {
        const container = document.getElementById('guides-container');
        if(!container) return;

        if (this.state.data.guides.length > 0) {
            container.innerHTML = '';
            this.state.data.guides.forEach(guide => {
                container.innerHTML += `
                    <div class="glass-card p-4 flex gap-4 items-center">
                        <img src="${guide.image}" class="w-16 h-16 rounded-full object-cover border-2 border-primary">
                        <div class="flex-1">
                            <h4 class="font-heading font-semibold">${guide.name}</h4>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <i class="fas fa-star text-yellow-400"></i> ${guide.rating} (${guide.reviews} reviews)
                            </p>
                            <div class="flex gap-1 flex-wrap">
                                ${guide.languages.map(l => `<span class="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">${l}</span>`).join('')}
                            </div>
                        </div>
                        <button class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                            <i class="fas fa-comment-dots"></i>
                        </button>
                    </div>
                `;
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.App = App;
