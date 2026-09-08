/**
 * Discover Travel Uzbekistan - Internationalization (i18n) Engine
 * Supports: English (en), Uzbek (uz), Russian (ru)
 */

(function () {
    const LANGUAGES = [
        { code: 'en', name: 'English', flag: '🇬🇧' },
        { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' }
    ];

    // Common translation dictionary
    const DICTIONARY = {
        en: {
            home: "Home",
            about: "About Us",
            historical: "Historical Info",
            destinations: "Destinations",
            services: "Services",
            contact: "Contact",
            attractions: "Attractions",
            hotels: "Hotels & Stays",
            restaurants: "Restaurants",
            agencies: "Travel Agencies",
            guides: "Local Guides",
            location: "Route Planner",
            emergency: "Emergency Contacts",
            partner_login: "Partner Login",
            back: "Back",
            back_to_home: "Back to Home",
            search: "Search...",
            view_details: "View Details",
            book_now: "Book Now",
            share: "Share",
            reviews: "Reviews",
            rating: "Rating",
            address: "Address",
            phone: "Phone",
            website: "Website",
            filter_all: "All",
            transport_guide: "Transport Guide",
            yandex_go: "Yandex Go",
            shared_taxi: "Shared Taxi",
            train: "Train",
            bus: "Bus"
        },
        uz: {
            home: "Bosh sahifa",
            about: "Biz haqimizda",
            historical: "Tarixiy ma'lumotlar",
            destinations: "Manzillar",
            services: "Xizmatlar",
            contact: "Aloqa",
            attractions: "Diqqatga sazovor joylar",
            hotels: "Mehmonxonalar",
            restaurants: "Restoranlar",
            agencies: "Sayyohlik agentliklari",
            guides: "Gidlar",
            location: "Yo'nalish rejalashtiruvchi",
            emergency: "Shoshilinch aloqalar",
            partner_login: "Hamkorlar kirishi",
            back: "Orqaga",
            back_to_home: "Bosh sahifaga qaytish",
            search: "Qidirish...",
            view_details: "Batafsil ko'rish",
            book_now: "Band qilish",
            share: "Ulashish",
            reviews: "Sharhlar",
            rating: "Baho",
            address: "Manzil",
            phone: "Telefon",
            website: "Veb-sayt",
            filter_all: "Barchasi",
            transport_guide: "Transport yo'riqnomasi",
            yandex_go: "Yandex Go",
            shared_taxi: "Yuvurma taksi",
            train: "Poyezd",
            bus: "Avtobus"
        },
        ru: {
            home: "Главная",
            about: "О нас",
            historical: "Исторические инфо",
            destinations: "Направления",
            services: "Услуги",
            contact: "Контакты",
            attractions: "Достопримечательности",
            hotels: "Отели и Жилье",
            restaurants: "Рестораны",
            agencies: "Турагентства",
            guides: "Гиды",
            location: "Планировщик маршрута",
            emergency: "Экстренные службы",
            partner_login: "Вход для партнеров",
            back: "Назад",
            back_to_home: "Назад на главную",
            search: "Поиск...",
            view_details: "Подробнее",
            book_now: "Забронировать",
            share: "Поделиться",
            reviews: "Отзывы",
            rating: "Рейтинг",
            address: "Адрес",
            phone: "Телефон",
            website: "Веб-сайт",
            filter_all: "Все",
            transport_guide: "Гид по транспорту",
            yandex_go: "Яндекс Го",
            shared_taxi: "Маршрутное такси",
            train: "Поезд",
            bus: "Автобус"
        }
    };

    // Auto phrase map for dynamic text node translation
    const AUTO_PHRASES = {
        "Home": { en: "Home", uz: "Bosh sahifa", ru: "Главная" },
        "Back to Home": { en: "Back to Home", uz: "Bosh sahifaga qaytish", ru: "Назад на главную" },
        "← Back to Home": { en: "← Back to Home", uz: "← Bosh sahifaga qaytish", ru: "← Назад на главную" },
        "← Home": { en: "← Home", uz: "← Bosh sahifa", ru: "← Главная" },
        "← Back": { en: "← Back", uz: "← Orqaga", ru: "← Назад" },
        "Back": { en: "Back", uz: "Orqaga", ru: "Назад" },
        "Historical Information": { en: "Historical Information", uz: "Tarixiy ma'lumotlar", ru: "Историческая информация" },
        "Historical Info": { en: "Historical Info", uz: "Tarixiy ma'lumotlar", ru: "Исторические инфо" },
        "Destinations": { en: "Destinations", uz: "Manzillar", ru: "Направления" },
        "Services": { en: "Services", uz: "Xizmatlar", ru: "Услуги" },
        "Contact": { en: "Contact", uz: "Aloqa", ru: "Контакты" },
        "About Us": { en: "About Us", uz: "Biz haqimizda", ru: "О нас" },
        "Attractions": { en: "Attractions", uz: "Diqqatga sazovor joylar", ru: "Достопримечательности" },
        "Hotels": { en: "Hotels", uz: "Mehmonxonalar", ru: "Отели" },
        "Hotels & Stays": { en: "Hotels & Stays", uz: "Mehmonxonalar", ru: "Отели и Жилье" },
        "Restaurants": { en: "Restaurants", uz: "Restoranlar", ru: "Рестораны" },
        "Travel Agencies": { en: "Travel Agencies", uz: "Sayyohlik agentliklari", ru: "Турагентства" },
        "Local Guides": { en: "Local Guides", uz: "Mahalliy gidlar", ru: "Гиды" },
        "Route Planner": { en: "Route Planner", uz: "Yo'nalish rejalashtiruvchi", ru: "Планировщик маршрута" },
        "Emergency": { en: "Emergency", uz: "Shoshilinch aloqalar", ru: "Экстренные службы" },
        "Emergency Contacts": { en: "Emergency Contacts", uz: "Shoshilinch aloqalar", ru: "Экстренные службы" },
        "Partner Login": { en: "Partner Login", uz: "Hamkorlar kirishi", ru: "Вход для партнеров" },
        "Transport Guide": { en: "Transport Guide", uz: "Transport yo'riqnomasi", ru: "Гид по транспорту" },
        "Search...": { en: "Search...", uz: "Qidirish...", ru: "Поиск..." },
        "Search": { en: "Search", uz: "Qidirish", ru: "Поиск" },
        "All": { en: "All", uz: "Barchasi", ru: "Все" },
        "View Details": { en: "View Details", uz: "Batafsil ko'rish", ru: "Подробнее" },
        "Book Now": { en: "Book Now", uz: "Band qilish", ru: "Забронировать" },
        "DISCOVER TRAVEL UZBEKISTAN": { en: "DISCOVER TRAVEL UZBEKISTAN", uz: "O'ZBEKISTONNI KASHF ETING", ru: "ОТКРОЙТЕ УЗБЕКИСТАН" },
        "Discover Travel Uzbekistan": { en: "Discover Travel Uzbekistan", uz: "O'zbekistonni Kashf Eting", ru: "Откройте Узбекистан" }
    };

    let currentLang = localStorage.getItem('userLanguage') || 'en';

    function getSelectedLangObj(code) {
        return LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
    }

    // Set & Apply Language
    window.setLanguage = function (langCode) {
        if (!LANGUAGES.some(l => l.code === langCode)) return;
        currentLang = langCode;
        localStorage.setItem('userLanguage', langCode);

        // Update elements with explicit data-en, data-uz, data-ru attributes
        document.querySelectorAll('[data-en], [data-uz], [data-ru]').forEach(elem => {
            let text = elem.getAttribute(`data-${currentLang}`);
            if (!text && currentLang === 'ru') {
                text = elem.getAttribute('data-en') || elem.getAttribute('data-uz');
            }
            if (text) {
                if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                    elem.placeholder = text;
                } else {
                    elem.textContent = text;
                }
            }
        });

        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            const key = elem.getAttribute('data-i18n');
            if (DICTIONARY[currentLang] && DICTIONARY[currentLang][key]) {
                if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA') {
                    elem.placeholder = DICTIONARY[currentLang][key];
                } else {
                    elem.textContent = DICTIONARY[currentLang][key];
                }
            }
        });

        // Auto translate common navigation text nodes & placeholders
        document.querySelectorAll('a, button, h1, h2, h3, p, span, input').forEach(elem => {
            if (elem.classList.contains('i18n-btn') || elem.closest('.i18n-switcher-container')) return;

            if (elem.placeholder && AUTO_PHRASES[elem.placeholder.trim()]) {
                const phrase = AUTO_PHRASES[elem.placeholder.trim()];
                if (phrase && phrase[currentLang]) {
                    elem.placeholder = phrase[currentLang];
                }
            }

            const trimmedText = elem.textContent.trim();
            if (AUTO_PHRASES[trimmedText]) {
                const phrase = AUTO_PHRASES[trimmedText];
                if (phrase && phrase[currentLang]) {
                    if (elem.children.length === 0) {
                        elem.textContent = phrase[currentLang];
                    }
                }
            }
        });

        // Update language button label
        const langBtnLabel = document.getElementById('currentLangLabel');
        if (langBtnLabel) {
            const activeObj = getSelectedLangObj(currentLang);
            langBtnLabel.innerHTML = `${activeObj.flag} ${activeObj.code.toUpperCase()}`;
        }

        // Update active dropdown item styles
        document.querySelectorAll('.lang-dropdown-item').forEach(item => {
            const code = item.getAttribute('data-lang');
            item.classList.toggle('active', code === currentLang);
        });

        // Dispatch custom language change event for dynamic content renderers
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: currentLang } }));
    };

    window.getCurrentLanguage = function () {
        return currentLang;
    };

    // Inject Language Switcher Component into Header or Body
    function injectLanguageSwitcher() {
        if (document.getElementById('i18nLanguageSwitcher')) return;

        // Hide legacy lang-toggle button if present
        const legacyBtn = document.querySelector('.lang-toggle');
        if (legacyBtn) legacyBtn.style.display = 'none';

        const activeObj = getSelectedLangObj(currentLang);

        const switcherContainer = document.createElement('div');
        switcherContainer.id = 'i18nLanguageSwitcher';
        switcherContainer.className = 'i18n-switcher-container';

        switcherContainer.innerHTML = `
            <button type="button" class="i18n-btn" onclick="toggleLangDropdown(event)" aria-label="Select Language">
                <span id="currentLangLabel">${activeObj.flag} ${activeObj.code.toUpperCase()}</span>
                <i class="fas fa-chevron-down i18n-arrow"></i>
            </button>
            <div class="i18n-dropdown" id="langDropdownMenu">
                ${LANGUAGES.map(l => `
                    <button type="button" class="lang-dropdown-item ${l.code === currentLang ? 'active' : ''}" data-lang="${l.code}" onclick="selectLang('${l.code}', event)">
                        <span>${l.flag} ${l.name}</span>
                    </button>
                `).join('')}
            </div>
        `;

        // Find optimal mounting point
        const mountPoint = document.querySelector('.header-right') ||
            document.querySelector('.nav-actions') ||
            document.querySelector('.header-content') ||
            document.querySelector('.top-nav') ||
            document.querySelector('.header-inner') ||
            document.querySelector('header') ||
            document.querySelector('nav') ||
            document.body;

        if (mountPoint) {
            const logoutBtn = mountPoint.querySelector('.logout-btn, #logoutBtn, [onclick*="logout"]');
            if (logoutBtn) {
                mountPoint.insertBefore(switcherContainer, logoutBtn);
            } else {
                mountPoint.appendChild(switcherContainer);
            }
        }
    }

    // Dropdown toggle functions
    window.toggleLangDropdown = function (e) {
        if (e) e.stopPropagation();
        const menu = document.getElementById('langDropdownMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    };

    window.selectLang = function (code, e) {
        if (e) e.stopPropagation();
        setLanguage(code);
        const menu = document.getElementById('langDropdownMenu');
        if (menu) menu.classList.remove('show');
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
        const menu = document.getElementById('langDropdownMenu');
        if (menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    });

    // Inject CSS styles for Language Switcher
    function injectStyles() {
        if (document.getElementById('i18nStyles')) return;
        const style = document.createElement('style');
        style.id = 'i18nStyles';
        style.textContent = `
            .i18n-switcher-container {
                position: relative;
                display: inline-flex;
                align-items: center;
                z-index: 1100;
                font-family: 'Plus Jakarta Sans', 'Outfit', -apple-system, sans-serif;
            }
            body > .i18n-switcher-container {
                position: fixed;
                top: 15px;
                right: 20px;
                z-index: 9999;
            }
            .i18n-btn {
                background: rgba(79, 70, 229, 0.08);
                border: 1px solid rgba(79, 70, 229, 0.2);
                color: #4f46e5;
                padding: 6px 14px;
                border-radius: 20px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s ease;
            }
            header .i18n-btn, nav .i18n-btn {
                color: inherit;
            }
            header[style*="background: #000"] .i18n-btn, 
            header[style*="background: rgba(0"] .i18n-btn,
            body:not([class*="light"]) header .i18n-btn,
            .header:not([style*="background: var(--surface)"]) .i18n-btn {
                background: rgba(255, 255, 255, 0.12);
                border-color: rgba(255, 255, 255, 0.25);
                color: #ffffff;
            }
            .i18n-btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            .i18n-arrow {
                font-size: 10px;
                opacity: 0.8;
                transition: transform 0.2s;
            }
            .i18n-dropdown {
                display: none;
                position: absolute;
                top: calc(100% + 6px);
                right: 0;
                background: #ffffff;
                border: 1px solid #e5e3ff;
                border-radius: 12px;
                padding: 6px;
                min-width: 145px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                z-index: 1200;
            }
            body:not([class*="light"]) .i18n-dropdown,
            header:not([style*="background: var(--surface)"]) .i18n-dropdown {
                background: #181822;
                border-color: rgba(255, 255, 255, 0.18);
                box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
            }
            .i18n-dropdown.show {
                display: block;
                animation: fadeInDown 0.2s ease-out;
            }
            .lang-dropdown-item {
                width: 100%;
                background: transparent;
                border: none;
                color: #1e1b4b;
                padding: 8px 12px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                text-align: left;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: all 0.15s ease;
            }
            body:not([class*="light"]) .lang-dropdown-item,
            header:not([style*="background: var(--surface)"]) .lang-dropdown-item {
                color: #e2e8f0;
            }
            .lang-dropdown-item:hover {
                background: rgba(79, 70, 229, 0.1);
                color: #4f46e5;
            }
            .lang-dropdown-item.active {
                background: rgba(79, 70, 229, 0.2);
                color: #4f46e5;
                font-weight: 800;
            }
            @keyframes fadeInDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize on DOM Ready
    function init() {
        injectStyles();
        injectLanguageSwitcher();
        setLanguage(currentLang);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
