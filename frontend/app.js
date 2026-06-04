/* ============================================================
   NewsHub — Frontend Application
   Hash-based SPA router, API service, all page views.
   ============================================================ */

// ─── Constants ───────────────────────────────────────────
const API_BASE = window.location.origin;  // 同源部署自动获取；独立运行时改为 'http://localhost:8000'
const TOKEN_KEY = 'newshub_token';
const USER_KEY = 'newshub_user';

// ─── DOM Cache ───────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const DOM = {
    get main() { return $('#main-content'); },
    get headerActions() { return $('#header-actions'); },
    get mobileAuthLinks() { return $('#mobile-auth-links'); },
    get mobileMenu() { return $('#mobile-menu'); },
    get mobileMenuBtn() { return $('#mobile-menu-btn'); },
    get toastContainer() { return $('#toast-container'); },
};

// ─── Store ───────────────────────────────────────────────
const store = {
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: null,
    isAuthenticated: false,

    init() {
        const raw = localStorage.getItem(USER_KEY);
        if (raw) {
            try { this.user = JSON.parse(raw); } catch (_) { this.user = null; }
        }
        this.isAuthenticated = !!(this.token && this.user);
    },

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        this.isAuthenticated = true;
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    updateUser(user) {
        this.user = { ...this.user, ...user };
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    },

    clearAuth() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
};

// ─── API Service ─────────────────────────────────────────
const api = {
    async request(method, path, { body, params } = {}) {
        const url = new URL(path, API_BASE);
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
            });
        }

        const headers = { 'Content-Type': 'application/json' };
        if (store.token) {
            headers['Authorization'] = `Bearer ${store.token}`;
        }

        const opts = { method, headers };
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
            opts.body = JSON.stringify(body);
        }

        const res = await fetch(url.toString(), opts);
        const json = await res.json();

        if (!res.ok || json.code !== 200) {
            const msg = json.message || `请求失败 (${res.status})`;
            const err = new Error(msg);
            err.code = json.code || res.status;
            throw err;
        }

        return json;
    },

    get(path, params) { return this.request('GET', path, { params }); },
    post(path, body) { return this.request('POST', path, { body }); },
    put(path, body) { return this.request('PUT', path, { body }); },
    del(path, params) { return this.request('DELETE', path, { params }); }
};

// ─── Toast ────────────────────────────────────────────────
const toast = {
    icons: {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    },

    show(message, type = 'info', duration = 3500) {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `
            <span class="toast-icon">${this.icons[type] || this.icons.info}</span>
            <span class="toast-message">${escapeHTML(message)}</span>
            <button class="toast-close" aria-label="关闭通知">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        el.querySelector('.toast-close').addEventListener('click', () => this._remove(el));

        DOM.toastContainer.appendChild(el);

        if (duration > 0) {
            setTimeout(() => this._remove(el), duration);
        }
    },

    _remove(el) {
        if (el.classList.contains('removing')) return;
        el.classList.add('removing');
        setTimeout(() => { if (el.parentNode) el.remove(); }, 250);
    },

    success(msg, dur) { this.show(msg, 'success', dur); },
    error(msg, dur) { this.show(msg, 'error', dur); },
    warning(msg, dur) { this.show(msg, 'warning', dur); },
    info(msg, dur) { this.show(msg, 'info', dur); },
};

// ─── Helpers ──────────────────────────────────────────────
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    if (y === now.getFullYear()) return `${m}-${day}`;
    return `${y}-${m}-${day}`;
}

function formatNumber(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

function debounce(fn, ms) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ─── Loading / Empty / Error Templates ───────────────────
function renderLoading(text = '加载中...') {
    return `
        <div class="loading-container">
            <div class="loading-spinner"><div class="spinner-ring"></div></div>
            <p class="loading-text">${escapeHTML(text)}</p>
        </div>
    `;
}

function renderEmpty(title = '暂无内容', desc = '') {
    return `
        <div class="empty-state">
            <div class="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="8" y1="15" x2="16" y2="15"></line>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
            </div>
            <p class="empty-title">${escapeHTML(title)}</p>
            ${desc ? `<p class="empty-desc">${escapeHTML(desc)}</p>` : ''}
        </div>
    `;
}

function renderError(message = '加载失败，请检查网络连接后重试') {
    return `
        <div class="error-state">
            <div class="error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <p class="error-title">加载失败</p>
            <p class="error-desc">${escapeHTML(message)}</p>
            <button class="btn btn-outline" onclick="window.location.reload()">重新加载</button>
        </div>
    `;
}

// ─── Pagination Component ─────────────────────────────────
function renderPagination(currentPage, total, pageSize, onPageChange) {
    const totalPages = Math.ceil(total / pageSize) || 1;
    if (totalPages <= 1) return '';

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    let html = '<nav class="pagination" aria-label="分页导航">';
    html += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} aria-label="上一页">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    </button>`;

    if (start > 1) {
        html += `<button class="pagination-btn" data-page="1">1</button>`;
        if (start > 2) html += `<span class="pagination-info">...</span>`;
    }

    pages.forEach(p => {
        html += `<button class="pagination-btn${p === currentPage ? ' active' : ''}" data-page="${p}" ${p === currentPage ? 'disabled' : ''}>${p}</button>`;
    });

    if (end < totalPages) {
        if (end < totalPages - 1) html += `<span class="pagination-info">...</span>`;
        html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    html += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} aria-label="下一页">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </button>`;
    html += `<span class="pagination-info">${currentPage} / ${totalPages} 页</span>`;
    html += '</nav>';

    // Delegate click events
    setTimeout(() => {
        $$('.pagination-btn:not([disabled])', DOM.main).forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                if (page && page !== currentPage) onPageChange(page);
            });
        });
    }, 0);

    return html;
}

// ─── Render Header ────────────────────────────────────────
function renderHeader() {
    const actions = DOM.headerActions;
    const mobileAuth = DOM.mobileAuthLinks;

    if (store.isAuthenticated && store.user) {
        const avatar = store.user.avatar || '';
        const nickname = store.user.nickname || store.user.username;
        actions.innerHTML = `
            <div class="dropdown" id="user-dropdown">
                <button class="header-user-info" id="dropdown-toggle" aria-haspopup="true" aria-expanded="false">
                    ${avatar
                        ? `<img class="header-avatar" src="${escapeHTML(avatar)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                        : ''}
                    <span class="header-avatar-placeholder" style="display:${avatar ? 'none' : 'flex'};width:32px;height:32px;border-radius:50%;background:var(--color-accent-light);align-items:center;justify-content:center;font-size:0.85rem;color:var(--color-accent);font-weight:700;flex-shrink:0">${escapeHTML(nickname.charAt(0).toUpperCase())}</span>
                    <span class="header-username">${escapeHTML(nickname)}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="dropdown-menu">
                    <a href="#/profile" class="dropdown-item" data-close-dropdown>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        个人资料
                    </a>
                    <a href="#/favorites" class="dropdown-item" data-close-dropdown>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        我的收藏
                    </a>
                    <a href="#/history" class="dropdown-item" data-close-dropdown>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        浏览历史
                    </a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item danger" id="btn-logout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        退出登录
                    </button>
                </div>
            </div>
        `;
        mobileAuth.innerHTML = `
            <a href="#/profile" class="mobile-nav-link">个人资料</a>
            <button class="mobile-nav-link" id="btn-logout-mobile" style="width:100%;text-align:left;color:rgba(255,255,255,0.6)">退出登录</button>
        `;
    } else {
        actions.innerHTML = `
            <a href="#/login" class="btn btn-header">登录</a>
            <a href="#/login?tab=register" class="btn btn-header btn-header-accent">注册</a>
        `;
        mobileAuth.innerHTML = `
            <a href="#/login" class="mobile-nav-link">登录</a>
            <a href="#/login?tab=register" class="mobile-nav-link">注册</a>
        `;
    }

    // Wire up dropdown
    setupDropdown();
    // Wire up logout
    $('#btn-logout')?.addEventListener('click', handleLogout);
    $('#btn-logout-mobile')?.addEventListener('click', handleLogout);
    // Update nav links active state
    updateNavActive();
    // Show/hide auth-required nav links
    updateAuthLinks();
}

function setupDropdown() {
    const dropdown = $('#user-dropdown');
    if (!dropdown) return;
    const toggle = $('#dropdown-toggle');
    const menu = $('.dropdown-menu', dropdown);

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = dropdown.classList.contains('active');
        closeAllDropdowns();
        if (!isActive) dropdown.classList.add('active');
        toggle.setAttribute('aria-expanded', !isActive);
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Close dropdown when a link is clicked
    $$('[data-close-dropdown]', menu).forEach(el => {
        el.addEventListener('click', () => {
            dropdown.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}

function closeAllDropdowns() {
    $$('.dropdown.active').forEach(d => d.classList.remove('active'));
}

function updateNavActive() {
    const hash = location.hash || '#/';
    const route = hash.split('?')[0];

    $$('.nav-link, .mobile-nav-link').forEach(link => {
        const linkRoute = link.getAttribute('href');
        if (!linkRoute) return;
        const linkHash = linkRoute.split('?')[0];
        link.classList.toggle('active', linkHash === route);
    });
}

function updateAuthLinks() {
    const authed = store.isAuthenticated;
    $$('[data-auth="true"]').forEach(el => {
        if (authed) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

async function handleLogout() {
    store.clearAuth();
    toast.info('已退出登录');
    renderHeader();
    closeAllDropdowns();
    closeMobileMenu();
    router.navigate('/');
}

// ─── Mobile Menu ──────────────────────────────────────────
function setupMobileMenu() {
    const btn = DOM.mobileMenuBtn;
    const menu = DOM.mobileMenu;

    btn.addEventListener('click', () => {
        const isOpen = menu.classList.contains('open');
        if (isOpen) {
            closeMobileMenu();
        } else {
            menu.classList.add('open');
            btn.classList.add('active');
            btn.setAttribute('aria-expanded', 'true');
            menu.setAttribute('aria-hidden', 'false');
        }
    });

    // Close on link click
    menu.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) {
            closeMobileMenu();
        }
    });
}

function closeMobileMenu() {
    DOM.mobileMenu.classList.remove('open');
    DOM.mobileMenuBtn.classList.remove('active');
    DOM.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    DOM.mobileMenu.setAttribute('aria-hidden', 'true');
}

// ─── Route Guard ──────────────────────────────────────────
function requireAuth() {
    if (!store.isAuthenticated) {
        toast.warning('请先登录');
        router.navigate('/login');
        return false;
    }
    return true;
}

function redirectIfAuth() {
    if (store.isAuthenticated) {
        router.navigate('/');
        return true;
    }
    return false;
}

// ─── Router ───────────────────────────────────────────────
const router = {
    routes: {
        '/': { render: renderHomePage, title: '首页' },
        '/news': { render: renderDetailPage, title: '新闻详情' },
        '/login': { render: renderAuthPage, title: '登录 / 注册' },
        '/profile': { render: renderProfilePage, title: '个人资料', auth: true },
        '/favorites': { render: renderFavoritesPage, title: '我的收藏', auth: true },
        '/history': { render: renderHistoryPage, title: '浏览历史', auth: true },
    },

    navigate(path) {
        location.hash = path;
    },

    async handle() {
        const hash = location.hash || '#/';
        const [route, queryStr] = hash.substring(1).split('?');
        const params = new URLSearchParams(queryStr || '');
        const query = Object.fromEntries(params.entries());

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Close mobile menu
        closeMobileMenu();
        closeAllDropdowns();

        // Parse route - check for /news/:id pattern
        let matchedRoute = this.routes[route];
        let routeParams = {};

        if (!matchedRoute && route.startsWith('/news/')) {
            const newsId = route.split('/')[2];
            if (newsId) {
                matchedRoute = this.routes['/news'];
                routeParams = { id: newsId };
            }
        }

        if (!matchedRoute) {
            this.navigate('/');
            return;
        }

        // Auth guard
        if (matchedRoute.auth && !requireAuth()) return;

        // Update title
        document.title = `${matchedRoute.title} — NewsHub`;

        // Update nav
        updateNavActive();
        updateAuthLinks();

        // Render
        DOM.main.innerHTML = renderLoading();
        try {
            const html = await matchedRoute.render({ query, params: routeParams });
            DOM.main.innerHTML = html;
            // Trigger any post-render setup
            if (matchedRoute.onRendered) matchedRoute.onRendered();
        } catch (err) {
            console.error('Route render error:', err);
            DOM.main.innerHTML = renderError(err.message);
        }
    },

    init() {
        window.addEventListener('hashchange', () => this.handle());
        // Initial render
        this.handle();
    }
};

// ─── Pages ───────────────────────────────────────────────

// --- Home Page ---
async function renderHomePage({ query }) {
    // Fetch categories first
    let categories = [];
    try {
        const res = await api.get('/api/news/categories', { skip: 0, limit: 100 });
        categories = res.data || [];
    } catch (err) {
        return renderError('加载分类失败: ' + err.message);
    }

    if (!categories.length) {
        return renderEmpty('暂无分类', '请先添加新闻分类');
    }

    // Default to first category or from query
    const activeCategoryId = parseInt(query.categoryId) || categories[0]?.id || 0;
    const page = parseInt(query.page) || 1;
    const pageSize = 10;

    let newsData = null;
    let fetchError = null;
    try {
        const res = await api.get('/api/news/list', { categoryId: activeCategoryId, page, pageSize });
        newsData = res.data || { list: [], total: 0, hasMore: false };
    } catch (err) {
        fetchError = err.message;
    }

    // Build category tabs
    let catTabs = categories.map(c => {
        const active = c.id === activeCategoryId;
        return `<button class="category-tab${active ? ' active' : ''}" data-category-id="${c.id}">${escapeHTML(c.name)}</button>`;
    }).join('');

    // Wire category tab clicks
    setTimeout(() => {
        $$('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const catId = tab.dataset.categoryId;
                location.hash = `/?categoryId=${catId}`;
            });
        });
    }, 0);

    // Build news cards
    let newsContent = '';
    if (fetchError) {
        newsContent = renderError('加载新闻列表失败: ' + fetchError);
    } else if (!newsData.list.length) {
        newsContent = renderEmpty('暂无新闻', '该分类下还没有新闻内容');
    } else {
        newsContent = '<div class="news-grid">' + newsData.list.map(news => `
            <article class="news-card" data-news-id="${news.id}" tabindex="0" role="link" aria-label="${escapeHTML(news.title)}">
                <div class="news-card-image">
                    ${news.image
                        ? `<img src="${escapeHTML(news.image)}" alt="${escapeHTML(news.title)}" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'news-card-image-placeholder\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\' ry=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div>'">`
                        : `<div class="news-card-image-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
                    }
                </div>
                <div class="news-card-body">
                    <span class="news-card-category">${escapeHTML(categories.find(c => c.id === news.categoryId)?.name || '')}</span>
                    <h3 class="news-card-title">${escapeHTML(news.title)}</h3>
                    ${news.description ? `<p class="news-card-desc">${escapeHTML(news.description)}</p>` : ''}
                    <div class="news-card-meta">
                        <span class="news-card-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${escapeHTML(news.author || '匿名')}
                        </span>
                        <span class="news-card-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${formatDate(news.publishTime)}
                        </span>
                        <span class="news-card-meta-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            ${formatNumber(news.views)}
                        </span>
                    </div>
                </div>
            </article>
        `).join('') + '</div>';
    }

    // Wire news card clicks
    setTimeout(() => {
        $$('.news-card').forEach(card => {
            const handler = () => {
                const id = card.dataset.newsId;
                router.navigate(`/news/${id}`);
            };
            card.addEventListener('click', handler);
            card.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
        });
    }, 0);

    const pagination = fetchError ? '' : renderPagination(page, newsData.total, pageSize, (newPage) => {
        location.hash = `/?categoryId=${activeCategoryId}&page=${newPage}`;
    });

    return `
        <div class="home-page">
            <nav class="category-bar" aria-label="新闻分类">${catTabs}</nav>
            ${newsContent}
            ${pagination}
        </div>
    `;
}

// --- Detail Page ---
async function renderDetailPage({ params, query }) {
    const newsId = parseInt(params.id) || parseInt(query.id);
    if (!newsId) {
        router.navigate('/');
        return '';
    }

    let news;
    try {
        const res = await api.get('/api/news/detail', { id: newsId });
        news = res.data;
    } catch (err) {
        return renderError('加载新闻详情失败: ' + err.message);
    }

    if (!news) {
        return renderEmpty('新闻不存在', '该新闻可能已被删除');
    }

    // Add to history (fire and forget)
    if (store.isAuthenticated) {
        api.post('/api/history/add', { newsId }).catch(() => {});
    }

    // Check favorite status
    let isFavorite = false;
    if (store.isAuthenticated) {
        try {
            const favRes = await api.get('/api/favorite/check', { newsId });
            isFavorite = favRes.data?.isFavorite || false;
        } catch (_) {}
    }

    const relatedHTML = (news.relatedNews && news.relatedNews.length)
        ? news.relatedNews.map(r => `
            <article class="related-news-item" data-news-id="${r.id}" tabindex="0">
                <div class="related-news-image">
                    ${r.image
                        ? `<img src="${escapeHTML(r.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
                        : ''}
                </div>
                <div class="related-news-info">
                    <h4 class="related-news-title">${escapeHTML(r.title)}</h4>
                    <span class="related-news-views">${formatNumber(r.views)} 次阅读</span>
                </div>
            </article>
        `).join('')
        : '<p style="color:var(--color-text-muted);font-size:0.875rem;padding:var(--space-md) 0">暂无相关新闻</p>';

    // Wire up post-render
    setTimeout(() => {
        // Related news click
        $$('.related-news-item').forEach(item => {
            item.addEventListener('click', () => {
                router.navigate(`/news/${item.dataset.newsId}`);
            });
        });
        // Favorite button
        const favBtn = $('#btn-favorite');
        if (favBtn) {
            favBtn.addEventListener('click', handleFavoriteToggle);
        }
    }, 0);

    return `
        <div class="detail-page">
            <article class="detail-main">
                <header class="article-header">
                    <span class="article-category">新闻</span>
                    <h1 class="article-title">${escapeHTML(news.title)}</h1>
                    <div class="article-meta">
                        <span class="article-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            ${escapeHTML(news.author || '匿名作者')}
                        </span>
                        <span class="article-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${formatDate(news.publishTime)}
                        </span>
                        <span class="article-meta-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            ${formatNumber(news.views)} 次阅读
                        </span>
                    </div>
                </header>
                ${news.image ? `
                    <figure class="article-cover">
                        <img src="${escapeHTML(news.image)}" alt="${escapeHTML(news.title)}" onerror="this.style.display='none'">
                    </figure>
                ` : ''}
                <div class="article-content">${news.content || ''}</div>
                <div class="article-actions">
                    <button class="btn-favorite${isFavorite ? ' is-favorite' : ''}" id="btn-favorite" data-news-id="${newsId}" data-is-favorite="${isFavorite}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span id="fav-text">${isFavorite ? '已收藏' : '收藏文章'}</span>
                    </button>
                </div>
            </article>
            <aside class="detail-sidebar">
                <div class="sidebar-card">
                    <h3 class="sidebar-title">相关新闻</h3>
                    ${relatedHTML}
                </div>
            </aside>
        </div>
    `;
}

async function handleFavoriteToggle(e) {
    if (!requireAuth()) return;
    const btn = e.currentTarget;
    const newsId = parseInt(btn.dataset.newsId);
    const isFav = btn.dataset.isFavorite === 'true';

    btn.disabled = true;
    try {
        if (isFav) {
            await api.del('/api/favorite/remove', { newsId });
            btn.dataset.isFavorite = 'false';
            btn.classList.remove('is-favorite');
            btn.querySelector('svg').setAttribute('fill', 'none');
            $('#fav-text').textContent = '收藏文章';
            toast.success('已取消收藏');
        } else {
            await api.post('/api/favorite/add', { newsId });
            btn.dataset.isFavorite = 'true';
            btn.classList.add('is-favorite');
            btn.querySelector('svg').setAttribute('fill', 'currentColor');
            $('#fav-text').textContent = '已收藏';
            toast.success('已添加收藏');
        }
    } catch (err) {
        toast.error(err.message);
    } finally {
        btn.disabled = false;
    }
}

// --- Auth Page ---
function renderAuthPage({ query }) {
    if (redirectIfAuth()) return '';
    const activeTab = query.tab === 'register' ? 'register' : 'login';

    // Post-render setup
    setTimeout(() => setupAuthForm(activeTab), 0);

    return `
        <div class="auth-page">
            <div class="auth-card">
                <div class="auth-tabs">
                    <button class="auth-tab${activeTab === 'login' ? ' active' : ''}" data-tab="login">登录</button>
                    <button class="auth-tab${activeTab === 'register' ? ' active' : ''}" data-tab="register">注册</button>
                </div>
                <h2 class="auth-title" id="auth-title">${activeTab === 'login' ? '欢迎回来' : '创建账号'}</h2>
                <p class="auth-subtitle" id="auth-subtitle">${activeTab === 'login' ? '登录您的 NewsHub 账号' : '注册 NewsHub 账号，开始阅读'}</p>
                <form class="auth-form" id="auth-form" novalidate>
                    <div class="form-group">
                        <label class="form-label" for="auth-username">用户名</label>
                        <input class="form-input" type="text" id="auth-username" name="username" placeholder="请输入用户名" required autocomplete="username">
                        <p class="form-error" id="username-error"></p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="auth-password">密码</label>
                        <input class="form-input" type="password" id="auth-password" name="password" placeholder="请输入密码" required autocomplete="${activeTab === 'login' ? 'current-password' : 'new-password'}">
                        <p class="form-error" id="password-error"></p>
                    </div>
                    <button type="submit" class="btn btn-primary btn-lg auth-submit" id="auth-submit">
                        ${activeTab === 'login' ? '登录' : '注册'}
                    </button>
                </form>
                <p class="form-error text-center mt-lg" id="auth-error"></p>
            </div>
        </div>
    `;
}

function setupAuthForm(initialTab) {
    let activeTab = initialTab;

    const tabs = $$('.auth-tab');
    const title = $('#auth-title');
    const subtitle = $('#auth-subtitle');
    const submitBtn = $('#auth-submit');
    const form = $('#auth-form');
    const authError = $('#auth-error');

    function updateTabUI(tab) {
        activeTab = tab;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        if (tab === 'login') {
            title.textContent = '欢迎回来';
            subtitle.textContent = '登录您的 NewsHub 账号';
            submitBtn.textContent = '登录';
        } else {
            title.textContent = '创建账号';
            subtitle.textContent = '注册 NewsHub 账号，开始阅读';
            submitBtn.textContent = '注册';
        }
        // Clear errors
        $('#username-error').textContent = '';
        $('#password-error').textContent = '';
        authError.textContent = '';
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            updateTabUI(tab.dataset.tab);
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = $('#auth-username').value.trim();
        const password = $('#auth-password').value.trim();

        // Validate
        let hasError = false;
        if (!username) {
            $('#username-error').textContent = '请输入用户名';
            hasError = true;
        } else {
            $('#username-error').textContent = '';
        }
        if (!password) {
            $('#password-error').textContent = '请输入密码';
            hasError = true;
        } else if (activeTab === 'register' && password.length < 6) {
            $('#password-error').textContent = '密码长度至少 6 位';
            hasError = true;
        } else {
            $('#password-error').textContent = '';
        }
        if (hasError) return;

        submitBtn.disabled = true;
        submitBtn.textContent = '处理中...';
        authError.textContent = '';

        try {
            const endpoint = activeTab === 'login' ? '/api/user/login' : '/api/user/register';
            const res = await api.post(endpoint, { username, password });
            const { token, userInfo } = res.data;
            store.setAuth(token, userInfo);
            toast.success(activeTab === 'login' ? '登录成功' : '注册成功');
            renderHeader();
            router.navigate('/');
        } catch (err) {
            authError.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = activeTab === 'login' ? '登录' : '注册';
        }
    });
}

// --- Profile Page ---
async function renderProfilePage() {
    if (!requireAuth()) return '';

    let user;
    try {
        const res = await api.get('/api/user/info');
        user = res.data;
        store.updateUser(user);
    } catch (err) {
        return renderError('加载用户信息失败: ' + err.message);
    }

    const genderLabels = { male: '男', female: '女', unknown: '保密' };

    // Post-render
    setTimeout(() => setupProfileForms(user), 0);

    return `
        <div class="profile-page">
            <div class="profile-header">
                ${user.avatar
                    ? `<img class="profile-avatar" src="${escapeHTML(user.avatar)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                    : ''}
                <div class="profile-avatar-placeholder" style="display:${user.avatar ? 'none' : 'flex'}">
                    ${escapeHTML((user.nickname || user.username || '?').charAt(0).toUpperCase())}
                </div>
                <div class="profile-info">
                    <h2 class="profile-name">${escapeHTML(user.nickname || user.username)}</h2>
                    <p class="profile-username">@${escapeHTML(user.username)}</p>
                    ${user.bio ? `<p class="profile-bio">${escapeHTML(user.bio)}</p>` : ''}
                </div>
            </div>

            <!-- Edit Profile Section -->
            <div class="profile-section" id="profile-edit-section">
                <div class="profile-section-header">
                    <h3 class="profile-section-title">编辑资料</h3>
                </div>
                <div class="profile-section-body">
                    <form id="profile-form" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="prof-nickname">昵称</label>
                            <input class="form-input" type="text" id="prof-nickname" name="nickname" value="${escapeHTML(user.nickname || '')}" placeholder="设置昵称">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="prof-avatar">头像链接</label>
                            <input class="form-input" type="url" id="prof-avatar" name="avatar" value="${escapeHTML(user.avatar || '')}" placeholder="https://...">
                            <p class="form-hint">输入图片 URL 地址</p>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="prof-gender">性别</label>
                            <select class="form-select" id="prof-gender" name="gender">
                                <option value="unknown" ${user.gender === 'unknown' ? 'selected' : ''}>保密</option>
                                <option value="male" ${user.gender === 'male' ? 'selected' : ''}>男</option>
                                <option value="female" ${user.gender === 'female' ? 'selected' : ''}>女</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="prof-bio">个人简介</label>
                            <textarea class="form-input" id="prof-bio" name="bio" placeholder="介绍一下自己..." rows="3">${escapeHTML(user.bio || '')}</textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="prof-phone">手机号</label>
                            <input class="form-input" type="tel" id="prof-phone" name="phone" value="${escapeHTML(user.phone || '')}" placeholder="输入手机号">
                        </div>
                        <p class="form-error text-center" id="profile-error"></p>
                        <button type="submit" class="btn btn-primary">保存修改</button>
                    </form>
                </div>
            </div>

            <!-- Change Password Section -->
            <div class="profile-section">
                <div class="profile-section-header">
                    <h3 class="profile-section-title">修改密码</h3>
                </div>
                <div class="profile-section-body">
                    <form id="password-form" novalidate>
                        <div class="form-group">
                            <label class="form-label" for="pwd-old">当前密码</label>
                            <input class="form-input" type="password" id="pwd-old" name="oldPassword" placeholder="输入当前密码" required>
                            <p class="form-error" id="pwd-old-error"></p>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="pwd-new">新密码</label>
                            <input class="form-input" type="password" id="pwd-new" name="newPassword" placeholder="输入新密码（至少6位）" required minlength="6">
                            <p class="form-error" id="pwd-new-error"></p>
                        </div>
                        <p class="form-error text-center" id="pwd-error"></p>
                        <button type="submit" class="btn btn-outline">更新密码</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function setupProfileForms(user) {
    // Profile update form
    const profileForm = $('#profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = $('button[type="submit"]', profileForm);
            const errEl = $('#profile-error');
            errEl.textContent = '';

            const data = {};
            const nickname = $('#prof-nickname').value.trim();
            const avatar = $('#prof-avatar').value.trim();
            const gender = $('#prof-gender').value;
            const bio = $('#prof-bio').value.trim();
            const phone = $('#prof-phone').value.trim();

            if (nickname !== (user.nickname || '')) data.nickname = nickname;
            if (avatar !== (user.avatar || '')) data.avatar = avatar;
            if (gender !== (user.gender || 'unknown')) data.gender = gender;
            if (bio !== (user.bio || '')) data.bio = bio;
            if (phone !== (user.phone || '')) data.phone = phone;

            if (!Object.keys(data).length) {
                errEl.textContent = '没有修改任何信息';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = '保存中...';
            try {
                const res = await api.put('/api/user/update', data);
                store.updateUser(res.data);
                toast.success('资料已更新');
                renderHeader();
                // Refresh page to show updated info
                router.handle();
            } catch (err) {
                errEl.textContent = err.message;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '保存修改';
            }
        });
    }

    // Password change form
    const pwdForm = $('#password-form');
    if (pwdForm) {
        pwdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = $('button[type="submit"]', pwdForm);
            const errEl = $('#pwd-error');
            const oldErr = $('#pwd-old-error');
            const newErr = $('#pwd-new-error');

            oldErr.textContent = '';
            newErr.textContent = '';
            errEl.textContent = '';

            const oldPassword = $('#pwd-old').value;
            const newPassword = $('#pwd-new').value;

            let hasErr = false;
            if (!oldPassword) { oldErr.textContent = '请输入当前密码'; hasErr = true; }
            if (!newPassword) { newErr.textContent = '请输入新密码'; hasErr = true; }
            else if (newPassword.length < 6) { newErr.textContent = '新密码至少 6 位'; hasErr = true; }
            if (hasErr) return;

            submitBtn.disabled = true;
            submitBtn.textContent = '更新中...';
            try {
                await api.put('/api/user/password', { oldPassword, newPassword });
                toast.success('密码修改成功，请重新登录');
                // Clear form
                $('#pwd-old').value = '';
                $('#pwd-new').value = '';
                // Logout
                setTimeout(() => {
                    store.clearAuth();
                    renderHeader();
                    router.navigate('/login');
                }, 1500);
            } catch (err) {
                errEl.textContent = err.message;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '更新密码';
            }
        });
    }
}

// --- Favorites Page ---
async function renderFavoritesPage({ query }) {
    if (!requireAuth()) return '';
    const page = parseInt(query.page) || 1;
    const pageSize = 10;

    let data;
    try {
        const res = await api.get('/api/favorite/list', { page, pageSize });
        data = res.data || { list: [], total: 0, hasMore: false };
    } catch (err) {
        return renderError('加载收藏列表失败: ' + err.message);
    }

    if (!data.list.length) {
        return `
            <div class="list-page">
                <div class="list-page-header">
                    <h1 class="list-page-title">我的收藏</h1>
                </div>
                ${renderEmpty('暂无收藏', '浏览新闻时点击收藏按钮即可收藏')}
            </div>
        `;
    }

    // Post-render wiring
    setTimeout(() => {
        $$('.list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.list-item-actions')) return;
                router.navigate(`/news/${item.dataset.newsId}`);
            });
        });
        $$('.btn-remove-fav').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const newsId = btn.dataset.newsId;
                try {
                    await api.del('/api/favorite/remove', { newsId });
                    toast.success('已取消收藏');
                    router.handle();
                } catch (err) {
                    toast.error(err.message);
                }
            });
        });
        $('#btn-clear-fav')?.addEventListener('click', async () => {
            if (!confirm('确定要清空所有收藏吗？此操作不可撤销。')) return;
            try {
                await api.del('/api/favorite/clear');
                toast.success('已清空收藏');
                router.handle();
            } catch (err) {
                toast.error(err.message);
            }
        });
    }, 0);

    const pagination = renderPagination(page, data.total, pageSize, (newPage) => {
        location.hash = `#/favorites?page=${newPage}`;
    });

    return `
        <div class="list-page">
            <div class="list-page-header">
                <h1 class="list-page-title">我的收藏</h1>
                <button class="btn btn-danger btn-sm" id="btn-clear-fav">清空收藏</button>
            </div>
            ${data.list.map(item => `
                <article class="list-item" data-news-id="${item.id}">
                    <div class="list-item-image">
                        ${item.image
                            ? `<img src="${escapeHTML(item.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
                            : ''}
                    </div>
                    <div class="list-item-body">
                        <h3 class="list-item-title">${escapeHTML(item.title)}</h3>
                        ${item.description ? `<p class="list-item-desc">${escapeHTML(item.description)}</p>` : ''}
                        <div class="list-item-meta">
                            <span>${escapeHTML(item.author || '匿名')}</span>
                            <span>${formatNumber(item.views)} 阅读</span>
                            <span>收藏于 ${formatDate(item.favoriteTime)}</span>
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-ghost btn-sm btn-remove-fav" data-news-id="${item.id}" title="取消收藏">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </article>
            `).join('')}
            ${pagination}
        </div>
    `;
}

// --- History Page ---
async function renderHistoryPage({ query }) {
    if (!requireAuth()) return '';
    const page = parseInt(query.page) || 1;
    const pageSize = 10;

    let data;
    try {
        const res = await api.get('/api/history/list', { page, pageSize });
        data = res.data || { list: [], total: 0, hasMore: false };
    } catch (err) {
        return renderError('加载浏览历史失败: ' + err.message);
    }

    if (!data.list.length) {
        return `
            <div class="list-page">
                <div class="list-page-header">
                    <h1 class="list-page-title">浏览历史</h1>
                </div>
                ${renderEmpty('暂无浏览历史', '浏览新闻时会自动记录')}
            </div>
        `;
    }

    // Post-render wiring
    setTimeout(() => {
        $$('.list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.list-item-actions')) return;
                router.navigate(`/news/${item.dataset.newsId}`);
            });
        });
        $$('.btn-del-history').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const historyId = btn.dataset.historyId;
                try {
                    await api.del(`/api/history/delete/${historyId}`);
                    toast.success('已删除记录');
                    router.handle();
                } catch (err) {
                    toast.error(err.message);
                }
            });
        });
        $('#btn-clear-history')?.addEventListener('click', async () => {
            if (!confirm('确定要清空所有浏览历史吗？此操作不可撤销。')) return;
            try {
                await api.del('/api/history/clear');
                toast.success('已清空浏览历史');
                router.handle();
            } catch (err) {
                toast.error(err.message);
            }
        });
    }, 0);

    const pagination = renderPagination(page, data.total, pageSize, (newPage) => {
        location.hash = `#/history?page=${newPage}`;
    });

    return `
        <div class="list-page">
            <div class="list-page-header">
                <h1 class="list-page-title">浏览历史</h1>
                <button class="btn btn-danger btn-sm" id="btn-clear-history">清空历史</button>
            </div>
            ${data.list.map(item => `
                <article class="list-item" data-news-id="${item.id}">
                    <div class="list-item-image">
                        ${item.image
                            ? `<img src="${escapeHTML(item.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
                            : ''}
                    </div>
                    <div class="list-item-body">
                        <h3 class="list-item-title">${escapeHTML(item.title)}</h3>
                        ${item.description ? `<p class="list-item-desc">${escapeHTML(item.description)}</p>` : ''}
                        <div class="list-item-meta">
                            <span>${escapeHTML(item.author || '匿名')}</span>
                            <span>${formatNumber(item.views)} 阅读</span>
                            <span>浏览于 ${formatDate(item.viewTime)}</span>
                        </div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-ghost btn-sm btn-del-history" data-history-id="${item.historyId}" title="删除记录">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </article>
            `).join('')}
            ${pagination}
        </div>
    `;
}

// ─── AI Chat ──────────────────────────────────────────────
const aiChat = {
    isOpen: false,
    messages: [],       // { role: 'user'|'assistant', content: '...' }
    isLoading: false,

    // DOM refs (lazy)
    get overlay() { return $('#ai-chat-overlay'); },
    get panel() { return $('#ai-chat-panel'); },
    get fab() { return $('#ai-chat-fab'); },
    get messagesEl() { return $('#ai-chat-messages'); },
    get inputEl() { return $('#ai-chat-input'); },
    get sendBtn() { return $('#ai-chat-send'); },
    get closeBtn() { return $('#ai-chat-close'); },

    init() {
        // FAB button
        this.fab.addEventListener('click', () => this.toggle());
        // Close button
        this.closeBtn.addEventListener('click', () => this.close());
        // Overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        // Send button
        this.sendBtn.addEventListener('click', () => this.send());
        // Enter to send, Shift+Enter for newline
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.send();
            }
        });
        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    },

    toggle() {
        this.isOpen ? this.close() : this.open();
    },

    open() {
        this.isOpen = true;
        this.overlay.classList.add('open');
        this.overlay.setAttribute('aria-hidden', 'false');
        this.fab.classList.add('active');
        this.fab.setAttribute('aria-label', '关闭AI助手');
        // Focus input
        setTimeout(() => this.inputEl.focus(), 300);
        // Scroll to bottom
        this.scrollToBottom();
    },

    close() {
        this.isOpen = false;
        this.overlay.classList.remove('open');
        this.overlay.setAttribute('aria-hidden', 'true');
        this.fab.classList.remove('active');
        this.fab.setAttribute('aria-label', '打开AI助手');
    },

    async send() {
        const question = this.inputEl.value.trim();
        if (!question || this.isLoading) return;

        // Clear input
        this.inputEl.value = '';
        this.inputEl.style.height = 'auto';

        // Add user message
        this.addMessage('user', question);
        this.messages.push({ role: 'user', content: question });

        // Show typing indicator
        this.isLoading = true;
        this.sendBtn.disabled = true;
        this.showTyping();

        try {
            const res = await api.post('/api/ai/chat', {
                question,
                history: this.messages.slice(0, -1)  // Exclude the just-added message
            });
            // Remove typing indicator
            this.removeTyping();
            // Add AI response
            const answer = res.data?.answer || '抱歉，AI 没有返回有效回答。';
            this.addMessage('assistant', answer);
            this.messages.push({ role: 'assistant', content: answer });
        } catch (err) {
            this.removeTyping();
            this.addErrorMessage(err.message);
        } finally {
            this.isLoading = false;
            this.sendBtn.disabled = false;
            this.inputEl.focus();
        }
    },

    addMessage(role, content) {
        const el = document.createElement('div');
        el.className = `ai-message ai-message-${role === 'user' ? 'user' : 'bot'}`;
        const avatarText = role === 'user'
            ? (store.user?.nickname || store.user?.username || '我').charAt(0).toUpperCase()
            : 'AI';
        el.innerHTML = `
            <div class="ai-message-avatar">${escapeHTML(avatarText)}</div>
            <div class="ai-message-bubble">${role === 'user' ? escapeHTML(content) : simpleMarkdown(content)}</div>
        `;
        this.messagesEl.appendChild(el);
        this.scrollToBottom();
    },

    addErrorMessage(msg) {
        const el = document.createElement('div');
        el.className = 'ai-message ai-message-bot ai-message-error';
        el.innerHTML = `
            <div class="ai-message-avatar">AI</div>
            <div class="ai-message-bubble">⚠️ ${escapeHTML(msg)}</div>
        `;
        this.messagesEl.appendChild(el);
        this.scrollToBottom();
    },

    showTyping() {
        const el = document.createElement('div');
        el.className = 'ai-message ai-message-bot';
        el.id = 'ai-typing-indicator';
        el.innerHTML = `
            <div class="ai-message-avatar">AI</div>
            <div class="ai-message-bubble">
                <div class="ai-typing"><span></span><span></span><span></span></div>
            </div>
        `;
        this.messagesEl.appendChild(el);
        this.scrollToBottom();
    },

    removeTyping() {
        const el = $('#ai-typing-indicator');
        if (el) el.remove();
    },

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        });
    }
};

// Simple markdown-like rendering for AI responses
function simpleMarkdown(text) {
    if (!text) return '';
    let html = escapeHTML(text);

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headings: ### text
    html = html.replace(/^### (.+)$/gm, '<strong>$1</strong>');
    html = html.replace(/^## (.+)$/gm, '<strong>$1</strong>');
    // Unordered lists: - item or * item
    html = html.replace(/^[-*] (.+)$/gm, '• $1');
    // Numbered lists: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '• $1');
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    // Wrap in paragraph
    html = '<p>' + html + '</p>';

    return html;
}

// ─── App Initialization ───────────────────────────────────
async function initApp() {
    // Init store (load token/user from localStorage)
    store.init();

    // If authenticated, verify token is still valid
    if (store.isAuthenticated) {
        try {
            const res = await api.get('/api/user/info');
            store.updateUser(res.data);
        } catch (err) {
            // Token expired or invalid — clear auth silently
            store.clearAuth();
        }
    }

    // Render header
    renderHeader();

    // Setup mobile menu
    setupMobileMenu();

    // Setup AI chat
    aiChat.init();

    // Start router
    router.init();
}

// ─── Start ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initApp);
