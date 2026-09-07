// ── CONSTANTS ─────────────────────────────────────────────────
const ADMIN_KEY = "668e4a2d545ddcdd0a8d40e0cf7a8079fadeeb21872198a1354cd6c4a9b739b6";
const PARTNER_PAGE_SIZE = 10;
let _allPartners = [], _filtPartners = [], _partnerPage = 0;

// How long a verification link is valid for, in minutes. Must match the
// timedelta used in routers/partner_application.py's /verify-email
// endpoint — if you change one, change the other.
const VERIFY_EXPIRY_MINUTES = 30;

// ── API HELPER ────────────────────────────────────────────────
async function fetchAPI(endpoint, options = {}) {
    try {
        options.headers = {
            ...options.headers,
            'X-Admin-Key': ADMIN_KEY,
            'Content-Type': 'application/json'
        };
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Request failed');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function loadDashboard() {
    try {
        const stats = await fetchAPI('/admin/stats');
        document.getElementById('s-restaurants').textContent = stats.restaurants?.total ?? '—';
        document.getElementById('s-hotels').textContent = stats.hotels?.total ?? '—';
        document.getElementById('s-attractions').textContent = stats.attractions?.total ?? '—';
        document.getElementById('s-reviews').textContent = stats.reviews?.total ?? '—';

        fetchAPI('/admin/travel-agencies').then(res => {
            document.getElementById('s-agencies').textContent = (res.agencies || []).length;
        }).catch(() => { });

        fetch(`${API_BASE}/api/partner-applications/admin/list?status=approved`, {
            headers: { 'X-Admin-Key': ADMIN_KEY }
        }).then(r => r.json()).then(d => {
            document.getElementById('s-partners').textContent = d.length || 0;
        }).catch(() => { });

        fetch(`${API_BASE}/api/guides`).then(r => r.json()).then(d => {
            document.getElementById('s-guides').textContent = Array.isArray(d) ? d.length : 0;
        }).catch(() => { document.getElementById('s-guides').textContent = '0'; });

    } catch (e) { console.error('Stats error:', e); }

    loadPendingApprovals(true);
}

// ── PENDING APPROVALS ─────────────────────────────────────────
async function loadPendingApprovals(dashboardOnly = false) {
    try {
        const [pendingRestaurants, pendingMenuItems, pendingHotels,
            pendingRooms, pendingTours, pendingNewApps, pendingGuideListings] = await Promise.all([
                fetchAPI('/api/admin-approval/restaurants/pending'),
                fetchAPI('/api/admin-approval/menu-items/pending'),
                fetchAPI('/api/admin-approval/hotels/pending'),
                fetchAPI('/api/admin-approval/hotel-rooms/pending'),
                fetchAPI('/api/admin-approval/tours/pending'),
                fetchAPI('/api/partner-applications/admin/list?status=email_verified'),
                fetchAPI('/api/admin-approval/guides/pending'),
            ]);

        const total = pendingRestaurants.length + pendingMenuItems.length +
            pendingHotels.length + pendingRooms.length + pendingTours.length +
            pendingNewApps.length + pendingGuideListings.length;

        ['nav-pending-badge', 'nav-pending-badge2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = total; el.style.display = total > 0 ? 'inline-block' : 'none'; }
        });

        const dashCard = document.getElementById('dashboard-pending');
        if (dashCard) {
            if (total > 0) {
                dashCard.innerHTML = `
                    <div class="card-header">
                        <div class="card-title">⏰ Pending Approvals
                            <span class="badge badge-warning" style="margin-left:0.5rem;">${total}</span>
                        </div>
                        <button class="btn btn-primary btn-sm"
                            onclick="showSection('approvals',document.querySelector('[onclick*=approvals]'))">
                            Review All →
                        </button>
                    </div>
                    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
                        ${pendingRestaurants.length ? `<div class="badge badge-warning">🍽️ ${pendingRestaurants.length} Restaurants</div>` : ''}
                        ${pendingMenuItems.length ? `<div class="badge badge-info">🍴 ${pendingMenuItems.length} Menu Items</div>` : ''}
                        ${pendingHotels.length ? `<div class="badge badge-warning">🏨 ${pendingHotels.length} Hotels</div>` : ''}
                        ${pendingRooms.length ? `<div class="badge badge-info">🛏 ${pendingRooms.length} Rooms</div>` : ''}
                        ${pendingTours.length ? `<div class="badge badge-info">🗺️ ${pendingTours.length} Tours</div>` : ''}
                        ${pendingNewApps.length ? `<div class="badge badge-warning">📋 ${pendingNewApps.length} Partner Applications</div>` : ''}
                    </div>`;
            } else {
                dashCard.innerHTML = `
                    <div class="card-header"><div class="card-title">⏰ Pending Approvals</div></div>
                    <div class="empty"><div class="empty-icon">✅</div><p>All caught up!</p></div>`;
            }
        }

        if (dashboardOnly) return;

        let html = '';

        function pendingSection(title, items, renderFn) {
            if (!items.length) return '';
            return `<div class="pending-section">
                <div class="pending-section-title">
                    ${title} <span class="pending-count">${items.length}</span>
                </div>
                ${items.map(renderFn).join('')}
            </div>`;
        }

        html += pendingSection('🍽️ Restaurants', pendingRestaurants, r => `
            <div class="pending-card">
                <img class="pending-img" src="${fixUrl(r.image_url) || 'https://via.placeholder.com/80x70?text=R'}" onerror="this.src='https://via.placeholder.com/80x70?text=R'">
                <div class="pending-info">
                    <div class="pending-name">${r.name}</div>
                    <div class="pending-meta">
                        ${r.cuisine_type ? `🍴 ${r.cuisine_type}` : ''} ${r.phone ? `• 📞 ${r.phone}` : ''}<br>
                        ${r.address || ''}<br>
                        ${r.description ? r.description.slice(0, 100) + '…' : ''}
                    </div>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approveItem('restaurant',${r.id})">✅ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectItem('restaurant',${r.id})">❌ Reject</button>
                </div>
            </div>`);

        html += pendingSection('🍴 Menu Items', pendingMenuItems, item => `
            <div class="pending-card">
                <img class="pending-img" src="${fixUrl(item.image_url) || 'https://via.placeholder.com/80x70?text=M'}" onerror="this.src='https://via.placeholder.com/80x70?text=M'">
                <div class="pending-info">
                    <div class="pending-name">${item.restaurant_name} — ${item.name}</div>
                    <div class="pending-meta">
                        💰 $${item.price}<br>
                        ${item.description || ''}
                    </div>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approveItem('menu-item',${item.id})">✅ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectItem('menu-item',${item.id})">❌ Reject</button>
                </div>
            </div>`);

        html += pendingSection('🏨 Hotels', pendingHotels, item => `
            <div class="pending-card">
                <img class="pending-img" src="${fixUrl(item.image_url) || 'https://via.placeholder.com/80x70?text=H'}" onerror="this.src='https://via.placeholder.com/80x70?text=H'">
                <div class="pending-info">
                    <div class="pending-name">${item.name}</div>
                    <div class="pending-meta">
                        ${item.type ? `🏨 ${item.type}` : ''} ${item.phone ? `• 📞 ${item.phone}` : ''}<br>
                        ${item.address || ''}
                    </div>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approveItem('hotel',${item.id})">✅ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectItem('hotel',${item.id})">❌ Reject</button>
                </div>
            </div>`);

        html += pendingSection('🛏 Hotel Rooms', pendingRooms, item => `
            <div class="pending-card">
                <img class="pending-img" src="${fixUrl(item.image_url) || 'https://via.placeholder.com/80x70?text=Room'}" onerror="this.src='https://via.placeholder.com/80x70?text=Room'">
                <div class="pending-info">
                    <div class="pending-name">${item.hotel_name} — ${item.room_type || 'Room'}</div>
                    <div class="pending-meta">
                        Capacity: ${item.capacity || 'N/A'} • $${item.price}/night<br>
                        ${item.description || ''}
                    </div>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approveItem('hotel-room',${item.id})">✅ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectItem('hotel-room',${item.id})">❌ Reject</button>
                </div>
            </div>`);

        html += pendingSection('🗺️ Tours', pendingTours, t => `
            <div class="pending-card">
                <img class="pending-img" src="${fixUrl(t.image_url) || 'https://via.placeholder.com/80x70?text=Tour'}" onerror="this.src='https://via.placeholder.com/80x70?text=Tour'">
                <div class="pending-info">
                    <div class="pending-name">${t.tour_name}</div>
                    <div class="pending-meta">
                        Agency: <strong>${t.agency_name}</strong><br>
                        📅 ${t.duration_days || '—'} days • 💰 ${t.currency || 'USD'} ${t.price || '—'} • 👥 Max ${t.max_group_size || '—'}
                    </div>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approveItem('tour',${t.id})">✅ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectItem('tour',${t.id})">❌ Reject</button>
                </div>
            </div>`);

        html += pendingSection('🧭 Guide Listings', pendingGuideListings, g => `
    <div class="pending-card">
        <img class="pending-img" src="${fixUrl(g.photo_url) || 'https://via.placeholder.com/80x70?text=Guide'}" onerror="this.src='https://via.placeholder.com/80x70?text=Guide'">
        <div class="pending-info">
            <div class="pending-name">${g.name}</div>
            <div class="pending-meta">
                ${g.languages ? `🗣️ ${g.languages}` : ''} ${g.cities ? `• 📍 ${g.cities}` : ''}<br>
                📧 ${g.email || '—'} • 📞 ${g.phone || '—'}<br>
                ${g.price_per_day ? `💰 $${g.price_per_day}/day` : ''}
            </div>
        </div>
        <div class="pending-actions">
            <button class="btn btn-success btn-sm" onclick="approveGuideListing(${g.id})">✅ Approve</button>
            <button class="btn btn-danger btn-sm" onclick="rejectGuideListing(${g.id})">❌ Reject</button>
        </div>
    </div>`);

        const BIZ_ICON = { restaurant: '🍽️', hotel: '🏨', travel_agency: '🌍', guide: '🧭' };

        html += pendingSection('📋 New Partner Applications', pendingNewApps, g => `
            <div class="pending-card">
                <div class="pending-img" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    display:flex;align-items:center;justify-content:center;font-size:2rem;
                    width:80px;height:70px;border-radius:8px;flex-shrink:0;">${BIZ_ICON[g.business_type] || '📋'}</div>
                <div class="pending-info">
                    <div class="pending-name">${g.business_name} <span style="font-weight:400;color:var(--text-gray,#64748b);">(${g.business_type})</span></div>
                    <div class="pending-meta">
                        📧 ${g.email}<br>
                        📞 ${g.phone || '—'}<br>
                        📅 Applied: ${g.applied_at ? new Date(g.applied_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}<br>
                        ${g.city ? `📍 ${g.city}` : ''}
                    </div>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-success btn-sm" onclick="approvePartnerApp(${g.id})">✅ Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="rejectPartnerApp(${g.id})">❌ Reject</button>
                </div>
            </div>`);

        if (total === 0) {
            html = `<div class="empty"><div class="empty-icon">✅</div><p>No pending approvals — all caught up!</p></div>`;
        }

        document.getElementById('pending-items').innerHTML = html;
        loadUnverifiedApplications();
    } catch (e) { console.error('Pending error:', e); }
}

// ── UNVERIFIED APPLICATIONS ────────────────────────────────────
async function loadUnverifiedApplications() {
    const container = document.getElementById('unverified-items');
    if (!container) return;

    try {
        const pendingApps = await fetchAPI('/api/partner-applications/admin/list?status=pending');

        if (!pendingApps.length) {
            container.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><p>No applications waiting on email verification.</p></div>`;
            return;
        }

        const BIZ_ICON = { restaurant: '🍽️', hotel: '🏨', travel_agency: '🌍', guide: '🧭' };
        const now = new Date();

        container.innerHTML = `
            <div class="pending-section">
                <div class="pending-section-title">
                    📭 Awaiting Email Verification <span class="pending-count">${pendingApps.length}</span>
                </div>
                ${pendingApps.map(a => {
            const sentAtRaw = a.email_verify_sent_at || a.applied_at;
            const sentAt = sentAtRaw ? new Date(sentAtRaw) : null;
            let expiryHtml = '<span style="color:var(--text3,#94a3b8);">—</span>';
            if (sentAt) {
                const expiresAt = new Date(sentAt.getTime() + VERIFY_EXPIRY_MINUTES * 60000);
                const minsLeft = Math.round((expiresAt - now) / 60000);
                expiryHtml = minsLeft > 0
                    ? `<span style="color:var(--warning,#f59e0b);font-weight:600;">⏳ Link expires in ${minsLeft} min</span>`
                    : `<span style="color:var(--danger,#ef4444);font-weight:600;">⏰ Link expired — they can reapply with the same email</span>`;
            }
            return `
                    <div class="pending-card" style="opacity:0.85;">
                        <div class="pending-img" style="background:#e2e8f0;
                            display:flex;align-items:center;justify-content:center;font-size:2rem;
                            width:80px;height:70px;border-radius:8px;flex-shrink:0;">${BIZ_ICON[a.business_type] || '📋'}</div>
                        <div class="pending-info">
                            <div class="pending-name">${a.business_name} <span style="font-weight:400;color:var(--text-gray,#64748b);">(${a.business_type})</span></div>
                            <div class="pending-meta">
                                📧 ${a.email}<br>
                                📞 ${a.phone || '—'}<br>
                                📍 ${a.address || '—'}<br>
                                📅 Applied: ${a.applied_at ? new Date(a.applied_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}<br>
                                ${expiryHtml}
                            </div>
                        </div>
                    </div>`;
        }).join('')}
            </div>`;
    } catch (e) {
        console.error('Unverified applications error:', e);
        container.innerHTML = `<div class="empty" style="color:var(--danger);">Failed to load.</div>`;
    }
}

async function approvePartnerApp(appId) {
    if (!confirm('Approve this application? They will receive login credentials by email.')) return;
    try {
        await fetchAPI(`/api/partner-applications/admin/${appId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ admin_note: 'Approved by CEO admin' })
        });
        toast('✅ Partner approved! Credentials sent by email.', 'success');
        loadPendingApprovals();
        loadDashboard();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function rejectPartnerApp(appId) {
    const reason = prompt('Rejection reason (optional):') || 'Does not meet requirements.';
    try {
        await fetchAPI(`/api/partner-applications/admin/${appId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
        toast('Application rejected.', 'info');
        loadPendingApprovals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function approveItem(type, id) {
    try {
        await fetchAPI(`/api/admin-approval/${type}/${id}/approve`, {
            method: 'POST', body: JSON.stringify({ status: 'approved', admin_email: 'ceo@discover.com' })
        });
        toast('✅ Approved!', 'success');
        loadPendingApprovals();
        loadDashboard();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function rejectItem(type, id) {
    const reason = prompt('Rejection reason (optional):') || 'Did not meet requirements.';
    try {
        await fetchAPI(`/api/admin-approval/${type}/${id}/approve`, {
            method: 'POST', body: JSON.stringify({ status: 'rejected', rejection_reason: reason, admin_email: 'ceo@discover.com' })
        });
        toast('Rejected', 'info');
        loadPendingApprovals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function approveGuideListing(id) {
    try {
        await fetchAPI(`/api/admin-approval/guide/${id}/approve`, {
            method: 'POST', body: JSON.stringify({ status: 'approved', admin_email: 'ceo@discover.com' })
        });
        toast('✅ Guide listing approved!', 'success');
        loadPendingApprovals();
        loadDashboard();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function rejectGuideListing(id) {
    const reason = prompt('Rejection reason (optional):') || 'Did not meet requirements.';
    try {
        await fetchAPI(`/api/admin-approval/guide/${id}/approve`, {
            method: 'POST', body: JSON.stringify({ status: 'rejected', rejection_reason: reason, admin_email: 'ceo@discover.com' })
        });
        toast('Guide listing rejected.', 'info');
        loadPendingApprovals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

// ── SHARED PAGINATION HELPER ─────────────────────────────────
// Builds a Prev/Next control bar right after a given "showing" element,
// creating it once and reusing it on later renders — no admin.html
// changes needed, same self-building approach as the edit modal.
function _ensurePaginationContainer(anchorId, containerId) {
    let el = document.getElementById(containerId);
    if (!el) {
        el = document.createElement('div');
        el.id = containerId;
        el.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-top:1rem;flex-wrap:wrap;';
        const anchor = document.getElementById(anchorId);
        const parent = anchor?.closest('div,p') || anchor?.parentElement;
        (parent || anchor)?.insertAdjacentElement('afterend', el);
    }
    return el;
}

function _renderPagerControls(containerEl, page, pages, onPageChange) {
    if (pages <= 1) { containerEl.innerHTML = ''; return; }
    containerEl.innerHTML = `
        <button class="btn btn-secondary btn-sm" ${page === 0 ? 'disabled' : ''}
            onclick="(${onPageChange})(Math.max(0, ${page}-1))">← Prev</button>
        <span style="color:var(--text3,#94a3b8);">Page ${page + 1} of ${pages}</span>
        <button class="btn btn-secondary btn-sm" ${page >= pages - 1 ? 'disabled' : ''}
            onclick="(${onPageChange})(Math.min(${pages - 1}, ${page}+1))">Next →</button>`;
}

// ── RESTAURANTS ───────────────────────────────────────────────
let _allRestaurants = [], _restaurantPage = 0, _restaurantTotal = 0;
const REST_PAGE = 15;

async function loadRestaurants() {
    try {
        // limit=500 is the backend's hard max (Query(..., le=500) in admin.py) —
        // covers your current count in one call. If you ever exceed 500
        // restaurants, this will need real server-side paging instead.
        const data = await fetchAPI('/admin/restaurants?limit=500');
        _allRestaurants = data.restaurants || [];
        _restaurantTotal = data.total ?? _allRestaurants.length;
        _restaurantPage = 0;
        renderRestaurantsPage();
    } catch (e) { console.error(e); }
}

function goToRestaurantPage(p) { _restaurantPage = p; renderRestaurantsPage(); }

function renderRestaurantsPage() {
    const tbody = document.getElementById('restaurants-table');
    const start = _restaurantPage * REST_PAGE;
    const slice = _allRestaurants.slice(start, start + REST_PAGE);
    const pages = Math.max(1, Math.ceil(_allRestaurants.length / REST_PAGE));

    document.getElementById('restaurants-showing').textContent =
        _allRestaurants.length ? `${start + 1}–${Math.min(start + REST_PAGE, _allRestaurants.length)}` : '0';
    document.getElementById('restaurants-total').textContent = _restaurantTotal;

    if (!slice.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No restaurants.</td></tr>'; }
    else {
        tbody.innerHTML = slice.map(r => `
            <tr>
                <td><strong>#${r.id}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        ${r.image_url ? `<img src="${fixUrl(r.image_url)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                        <strong>${r.name}</strong>
                    </div>
                </td>
                <td style="color:var(--text2);">${r.cuisine_type || '—'}</td>
                <td>⭐ ${r.rating || 0}</td>
                <td><span class="badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${r.status || '—'}</span></td>
                <td>${r.is_partner ? '<span class="badge badge-info">✅ Yes</span>' : '<span class="badge badge-muted">No</span>'}</td>
                <td>
                    <div style="display:flex;gap:0.4rem;">
                        <button class="btn btn-secondary btn-sm" onclick="editRestaurant(${r.id})">✏</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteRestaurant(${r.id})">✕</button>
                    </div>
                </td>
            </tr>`).join('');
    }

    const pager = _ensurePaginationContainer('restaurants-total', 'restaurants-pagination');
    _renderPagerControls(pager, _restaurantPage, pages, 'goToRestaurantPage');
}

// ── HOTELS ────────────────────────────────────────────────────
let _allHotels = [], _hotelPage = 0, _hotelTotal = 0;
const HOTEL_PAGE = 15;

async function loadHotels() {
    try {
        const data = await fetchAPI('/admin/hotels?limit=500');
        _allHotels = data.hotels || [];
        _hotelTotal = data.total ?? _allHotels.length;
        _hotelPage = 0;
        renderHotelsPage();
    } catch (e) { console.error(e); }
}

function goToHotelPage(p) { _hotelPage = p; renderHotelsPage(); }

function renderHotelsPage() {
    const tbody = document.getElementById('hotels-table');
    const start = _hotelPage * HOTEL_PAGE;
    const slice = _allHotels.slice(start, start + HOTEL_PAGE);
    const pages = Math.max(1, Math.ceil(_allHotels.length / HOTEL_PAGE));

    document.getElementById('hotels-showing').textContent =
        _allHotels.length ? `${start + 1}–${Math.min(start + HOTEL_PAGE, _allHotels.length)}` : '0';
    document.getElementById('hotels-total').textContent = _hotelTotal;

    if (!slice.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No hotels.</td></tr>'; }
    else {
        tbody.innerHTML = slice.map(h => `
            <tr>
                <td><strong>#${h.id}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        ${h.image_url ? `<img src="${fixUrl(h.image_url)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                        <strong>${h.name}</strong>
                    </div>
                </td>
                <td style="color:var(--text2);">${h.type || '—'}</td>
                <td>⭐ ${h.rating || 0}</td>
                <td><span class="badge ${h.status === 'approved' ? 'badge-success' : h.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${h.status || '—'}</span></td>
                <td>${h.is_partner ? '<span class="badge badge-info">✅ Yes</span>' : '<span class="badge badge-muted">No</span>'}</td>
                <td>
                    <div style="display:flex;gap:0.4rem;">
                        <button class="btn btn-secondary btn-sm" onclick="editHotel(${h.id})">✏</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteHotel(${h.id})">✕</button>
                    </div>
                </td>
            </tr>`).join('');
    }

    const pager = _ensurePaginationContainer('hotels-total', 'hotels-pagination');
    _renderPagerControls(pager, _hotelPage, pages, 'goToHotelPage');
}

// ── AGENCIES ──────────────────────────────────────────────────
let _allAgencies = [], _agencyPage = 0;
const AGENCY_PAGE = 15;

async function loadAgencies() {
    try {
        const data = await fetchAPI('/admin/travel-agencies?limit=500');
        _allAgencies = data.agencies || [];
        _agencyPage = 0;
        renderAgenciesPage();
    } catch (e) { console.error(e); }
}

function goToAgencyPage(p) { _agencyPage = p; renderAgenciesPage(); }

function renderAgenciesPage() {
    const tbody = document.getElementById('agencies-table');
    const start = _agencyPage * AGENCY_PAGE;
    const slice = _allAgencies.slice(start, start + AGENCY_PAGE);
    const pages = Math.max(1, Math.ceil(_allAgencies.length / AGENCY_PAGE));

    if (!slice.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No agencies.</td></tr>'; }
    else {
        tbody.innerHTML = slice.map(a => `
            <tr>
                <td><strong>#${a.id}</strong></td>
                <td>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        ${a.image_url ? `<img src="${fixUrl(a.image_url)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">` : ''}
                        <strong>${a.name}</strong>
                    </div>
                </td>
                <td style="color:var(--text2);">${a.agency_type || '—'}</td>
                <td style="color:var(--text2);">${a.city || '—'}</td>
                <td>${a.tours_count || 0}</td>
                <td>⭐ ${a.rating || 0}</td>
                <td>
                    <div style="display:flex;gap:0.4rem;">
                        <button class="btn btn-secondary btn-sm" onclick="editAgency(${a.id})">✏</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteAgency(${a.id},'${a.name.replace(/'/g, "\\'")}')">✕</button>
                    </div>
                </td>
            </tr>`).join('');
    }

    let pager = document.getElementById('agencies-pagination');
    if (!pager) {
        pager = document.createElement('div');
        pager.id = 'agencies-pagination';
        pager.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-top:1rem;flex-wrap:wrap;';
        tbody.closest('table')?.insertAdjacentElement('afterend', pager);
    }
    _renderPagerControls(pager, _agencyPage, pages, 'goToAgencyPage');
}

// ── GUIDES ───────────────────────────────────────────────────
let _allGuides = [], _guidePage = 0;
const GUIDE_PAGE = 15;

function goToGuidePage(p) { _guidePage = p; renderGuidesPage(); }

function renderGuidesPage() {
    const tbody = document.getElementById('guides-table');
    const start = _guidePage * GUIDE_PAGE;
    const slice = _allGuides.slice(start, start + GUIDE_PAGE);
    const pages = Math.max(1, Math.ceil(_allGuides.length / GUIDE_PAGE));

    document.getElementById('guides-showing').textContent = _allGuides.length;

    tbody.innerHTML = slice.map(g => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    ${g.photo_url ? `<img src="${fixUrl(g.photo_url)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">` : '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;">🧭</div>'}
                    <div>
                        <strong>${g.name}</strong>
                        <div style="font-size:0.72rem;color:var(--text3);">${g.email || '—'}</div>
                    </div>
                </div>
            </td>
            <td style="font-size:0.8rem;color:var(--text2);">${g.languages || '—'}</td>
            <td style="font-size:0.8rem;color:var(--text2);">${g.cities || '—'}</td>
            <td>${g.price_per_day ? '$' + g.price_per_day + '/day' : '—'}</td>
            <td>⭐ ${Number(g.rating || 0).toFixed(1)} (${g.review_count || 0})</td>
            <td><span class="badge ${g.status === 'approved' ? 'badge-success' : g.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${g.status || 'pending'}</span></td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteGuide(${g.id},'${g.name.replace(/'/g, "\'")}')">🗑</button>
            </td>
        </tr>`).join('');

    let pager = document.getElementById('guides-pagination');
    if (!pager) {
        pager = document.createElement('div');
        pager.id = 'guides-pagination';
        pager.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-top:1rem;flex-wrap:wrap;';
        tbody.closest('table')?.insertAdjacentElement('afterend', pager);
    }
    _renderPagerControls(pager, _guidePage, pages, 'goToGuidePage');
}

async function loadGuides() {
    const tbody = document.getElementById('guides-table');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Loading…</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/api/guides`);
        _allGuides = await res.json();
        _guidePage = 0;

        if (!_allGuides.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">No approved guides yet — approve applications in Pending Approvals.</td></tr>';
            document.getElementById('guides-showing').textContent = '0';
            return;
        }
        renderGuidesPage();
    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty" style="color:var(--danger);">Failed to load.</td></tr>';
    }
}

async function deleteGuide(id, name) {
    if (!confirm(`Delete guide "${name}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${API_BASE}/api/guides/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Key': ADMIN_KEY }
        });
        if (!res.ok) throw new Error('Failed');
        toast(`"${name}" deleted`, 'success');
        loadGuides();
    } catch (e) { toast('Delete failed: ' + e.message, 'error'); }
}

function openCreateRestaurant() { toast('Use content-admin to create listings', 'info'); }
function closeRestaurantModal() { }
function openCreateHotel() { toast('Use content-admin to create listings', 'info'); }
function closeHotelModal() { }
function openCreateAgency() { toast('Use content-admin to create listings', 'info'); }
function closeAgencyModal() { }

async function deleteRestaurant(id) {
    if (!confirm('Delete this restaurant?')) return;
    try {
        await fetchAPI(`/admin/restaurants/${id}`, { method: 'DELETE' });
        toast('Deleted', 'success'); loadRestaurants();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deleteHotel(id) {
    if (!confirm('Delete this hotel?')) return;
    try {
        await fetchAPI(`/admin/hotels/${id}`, { method: 'DELETE' });
        toast('Deleted', 'success'); loadHotels();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deleteAgency(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
        await fetchAPI(`/admin/travel-agencies/${id}`, { method: 'DELETE' });
        toast('Deleted', 'success'); loadAgencies();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

function editAgency(id) { toast('Edit via agency admin panel', 'info'); }

// ── PARTNERS ──────────────────────────────────────────────────
async function loadPartners() {
    const tbody = document.getElementById('partnersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="empty">Loading…</td></tr>';
    try {
        const data = await fetch(`${API_BASE}/api/partner-applications/admin/list?status=approved`,
            { headers: { 'X-Admin-Key': ADMIN_KEY } }).then(r => r.json());
        _allPartners = data;
        const now = new Date();
        let active = 0, expiring = 0, expired = 0;
        data.forEach(p => {
            if (!p.plan_end_date) { active++; return; }
            const days = Math.ceil((new Date(p.plan_end_date) - now) / 86400000);
            if (days <= 0) expired++;
            else if (days <= 7) expiring++;
            else active++;
        });
        document.getElementById('ps-total').textContent = data.length;
        document.getElementById('ps-active').textContent = active;
        document.getElementById('ps-expiring').textContent = expiring;
        document.getElementById('ps-expired').textContent = expired;
        filterPartners();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty" style="color:var(--danger);">Failed to load.</td></tr>`;
    }
}

function filterPartners() {
    const search = (document.getElementById('partnerSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('partnerStatusFilter')?.value || '';
    const typeF = document.getElementById('partnerTypeFilter')?.value || '';
    const now = new Date();
    _filtPartners = _allPartners.filter(p => {
        if (search && !p.business_name?.toLowerCase().includes(search) &&
            !p.email?.toLowerCase().includes(search)) return false;
        if (typeF && p.business_type !== typeF) return false;
        if (statusF) {
            const days = p.plan_end_date
                ? Math.ceil((new Date(p.plan_end_date) - now) / 86400000) : 999;
            if (statusF === 'active' && days <= 7) return false;
            if (statusF === 'expiring' && (days > 7 || days <= 0)) return false;
            if (statusF === 'expired' && days > 0) return false;
        }
        return true;
    });
    _partnerPage = 0;
    renderPartnersPage();
}

function renderPartnersPage() {
    const tbody = document.getElementById('partnersTableBody');
    const pagDiv = document.getElementById('partnersPagination');
    const now = new Date();
    const start = _partnerPage * PARTNER_PAGE_SIZE;
    const slice = _filtPartners.slice(start, start + PARTNER_PAGE_SIZE);
    const total = _filtPartners.length;
    const pages = Math.ceil(total / PARTNER_PAGE_SIZE);
    const TYPE_LABELS = { restaurant: '🍽️ Restaurant', hotel: '🏨 Hotel', travel_agency: '🗺️ Agency', guide: '🧭 Guide' };
    if (!slice.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty">No partners found.</td></tr>';
        pagDiv.innerHTML = ''; return;
    }
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    tbody.innerHTML = slice.map(p => {
        const isBlocked = p.plan_status === 'blocked';
        const endDate = p.plan_end_date ? new Date(p.plan_end_date) : null;
        const days = endDate ? Math.ceil((endDate - now) / 86400000) : null;
        const planLabel = { '1month': '1M', '3months': '3M', '6months': '6M', '1year': '1Y' }[p.plan] || p.plan || '—';
        let daysHtml = '—', statusHtml;
        if (isBlocked) {
            statusHtml = '<span class="badge" style="background:rgba(100,116,139,0.15);color:var(--text3);">🚫 Blocked</span>';
        } else if (days === null) {
            statusHtml = '<span class="badge badge-muted">No plan</span>';
        } else if (days <= 0) {
            daysHtml = `<span style="color:var(--danger);font-weight:700;">Expired</span>`;
            statusHtml = '<span class="badge badge-danger">❌ Expired</span>';
        } else if (days <= 7) {
            daysHtml = `<span style="color:var(--warning);font-weight:700;">${days}d</span>`;
            statusHtml = '<span class="badge badge-warning">⚠️ Expiring</span>';
        } else {
            daysHtml = `<span style="color:var(--success);font-weight:700;">${days}d</span>`;
            statusHtml = '<span class="badge badge-success">✅ Active</span>';
        }
        const safeName = p.business_name.replace(/'/g, "\\'");
        return `<tr style="${isBlocked ? 'opacity:0.6' : ''}">
            <td><strong>${p.business_name}</strong><div style="font-size:0.72rem;color:var(--text3);">#${p.id}</div></td>
            <td>${TYPE_LABELS[p.business_type] || p.business_type}</td>
            <td><a href="mailto:${p.email}" style="color:var(--primary-light);">${p.email}</a></td>
            <td>${planLabel}${p.plan_amount ? `<br><span style="font-size:0.72rem;color:var(--text3);">$${p.plan_amount}</span>` : ''}</td>
            <td style="font-size:0.8rem;">${fmtDate(p.plan_end_date)}</td>
            <td>${daysHtml}</td>
            <td>${statusHtml}</td>
            <td>
                <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="paResend(${p.id})">↺</button>
                    ${isBlocked
                ? `<button class="btn btn-success btn-sm" onclick="unblockPartner(${p.id},'${safeName}')">✅</button>`
                : `<button class="btn btn-warning btn-sm" onclick="blockPartner(${p.id},'${safeName}')">🚫</button>`}
                    <button class="btn btn-danger btn-sm" onclick="deletePartner(${p.id},'${safeName}')">🗑</button>
                </div>
            </td>
        </tr>`;
    }).join('');

    pagDiv.innerHTML = pages <= 1
        ? `<span style="color:var(--text3);">Showing ${total} partner${total !== 1 ? 's' : ''}</span>`
        : `<span style="color:var(--text3);">Showing ${start + 1}–${Math.min(start + PARTNER_PAGE_SIZE, total)} of ${total}</span>
           <button class="btn btn-secondary btn-sm" onclick="_partnerPage=Math.max(0,_partnerPage-1);renderPartnersPage()"
               ${_partnerPage === 0 ? 'disabled' : ''}>← Prev</button>
           <span style="color:var(--text3);">Page ${_partnerPage + 1}/${pages}</span>
           <button class="btn btn-secondary btn-sm" onclick="_partnerPage=Math.min(${pages - 1},_partnerPage+1);renderPartnersPage()"
               ${_partnerPage >= pages - 1 ? 'disabled' : ''}>Next →</button>`;
}

async function paResend(id) {
    try {
        await fetchAPI(`/api/partner-applications/admin/${id}/resend-credentials`, { method: 'POST' });
        toast('✅ Credentials resent!', 'success');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function blockPartner(id, name) {
    const reason = prompt(`Block "${name}"?\nOptional reason:`, '');
    if (reason === null) return;
    if (!confirm(`Block "${name}"? They will receive an email.`)) return;
    try {
        const resp = await fetch(`${API_BASE}/api/partner-applications/admin/${id}/block`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
            body: JSON.stringify({ reason: reason.trim() || null })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Failed');
        toast(`✅ ${name} blocked`, 'success'); loadPartners();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function unblockPartner(id, name) {
    if (!confirm(`Unblock "${name}"?`)) return;
    try {
        const resp = await fetch(`${API_BASE}/api/partner-applications/admin/${id}/unblock`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Failed');
        toast(`✅ ${name} unblocked`, 'success'); loadPartners();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deletePartner(id, name) {
    if (!confirm(`⚠️ Delete "${name}" permanently?\nAll data will be removed.\nThis cannot be undone.`)) return;
    const typed = prompt('Type DELETE to confirm:');
    if (typed !== 'DELETE') { alert('Cancelled.'); return; }
    try {
        const resp = await fetch(`${API_BASE}/api/partner-applications/admin/${id}/delete`, {
            method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY }
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Failed');
        toast(`✅ ${name} deleted`, 'success'); loadPartners();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

// ── RENEWALS ──────────────────────────────────────────────────
let _allRenewals = [], _renewalStatus = 'pending';

async function loadRenewals() {
    try {
        const data = await fetchAPI('/api/subscription/admin/renewals');
        _allRenewals = data;
        updateRenewalCounts();
        renderRenewals();
    } catch (e) { console.error(e); }
}

function updateRenewalCounts() {
    document.getElementById('renewal-pending-count').textContent = _allRenewals.filter(r => r.status === 'pending').length;
    document.getElementById('renewal-approved-count').textContent = _allRenewals.filter(r => r.status === 'approved').length;
    document.getElementById('renewal-rejected-count').textContent = _allRenewals.filter(r => r.status === 'rejected').length;
}

function renewalSetStatus(s) {
    _renewalStatus = s;
    renderRenewals();
}

function renderRenewals() {
    const container = document.getElementById('renewals-container');
    const list = _renewalStatus === 'all'
        ? _allRenewals
        : _allRenewals.filter(r => r.status === _renewalStatus);

    if (!list.length) {
        container.innerHTML = `<div class="empty"><div class="empty-icon">✅</div><p>No ${_renewalStatus} renewals.</p></div>`;
        return;
    }

    const planLabel = { '1month': '1 Month', '3months': '3 Months', '6months': '6 Months', '1year': '1 Year' };
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    container.innerHTML = `
        <div class="card" style="margin-bottom:1rem;">
            <div class="card-header">
                <div style="display:flex;gap:0.5rem;">
                    ${['pending', 'approved', 'rejected', 'all'].map(s => `
                    <button class="btn btn-sm ${_renewalStatus === s ? 'btn-primary' : 'btn-secondary'}"
                        onclick="renewalSetStatus('${s}')">
                        ${s === 'pending' ? '⏳' : s === 'approved' ? '✅' : s === 'rejected' ? '❌' : '📋'}
                        ${s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>`).join('')}
                </div>
            </div>
        </div>` +
        list.map(r => `
        <div class="card" style="margin-bottom:1rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
                <div>
                    <div style="font-weight:700;font-size:1rem;margin-bottom:0.4rem;">${r.business_name || '—'}</div>
                    <div style="font-size:0.82rem;color:var(--text2);line-height:1.8;">
                        📧 ${r.email}<br>
                        💳 Plan: <strong>${planLabel[r.plan] || r.plan}</strong> — $${r.amount || '—'}<br>
                        📅 Requested: ${fmtDate(r.created_at)}
                    </div>
                    ${r.payment_proof_url ? `
                    <a href="${r.payment_proof_url}" target="_blank" class="btn btn-secondary btn-sm" style="margin-top:0.75rem;">
                        🖼 View Payment Screenshot
                    </a>` : ''}
                </div>
                <div>
                    <span class="badge ${r.status === 'pending' ? 'badge-warning' : r.status === 'approved' ? 'badge-success' : 'badge-danger'}">
                        ${r.status === 'pending' ? '⏳ Pending' : r.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </span>
                    ${r.status === 'pending' ? `
                    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;">
                        <button class="btn btn-success btn-sm" onclick="approveRenewal(${r.id})">✅ Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectRenewal(${r.id})">❌ Reject</button>
                    </div>` : ''}
                </div>
            </div>
        </div>`).join('');
}

async function approveRenewal(id) {
    try {
        const resp = await fetch(`${API_BASE}/api/subscription/admin/renewals/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY,
            },
            body: JSON.stringify({
                status: 'approved',
                admin_email: 'ceo@discover-travel-uzbekistan.com',
                rejection_reason: null,
            }),
        });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(d.detail || 'Status ' + resp.status);
        toast('✅ Renewal approved! ' + (d.message || ''), 'success');
        loadRenewals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function rejectRenewal(id) {
    const reason = prompt('Rejection reason:') || 'Payment not verified.';
    try {
        const resp = await fetch(`${API_BASE}/api/subscription/admin/renewals/${id}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Key': ADMIN_KEY,
            },
            body: JSON.stringify({
                status: 'rejected',
                admin_email: 'ceo@discover-travel-uzbekistan.com',
                rejection_reason: reason,
            }),
        });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(d.detail || 'Status ' + resp.status);
        toast('Rejected: ' + reason, 'info');
        loadRenewals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}


// ── EDIT MODAL (self-contained, builds its own DOM — no admin.html changes needed) ──

const MENU_CATEGORIES = [
    { value: 'single', label: 'Single' },
    { value: 'fortwo', label: 'For Two' },
    { value: 'family', label: 'Family' },
    { value: 'drinks', label: 'Drinks' },
];

const ROOM_TYPES = [
    'Single Room', 'Double Room', 'Twin Room', 'Triple Room',
    'Family Room', 'Suite', 'Deluxe Room', 'Studio',
];

let _editingMenuItemId = null;
let _editingRoomId = null;

function _closeModal() {
    const m = document.getElementById('_dynModal');
    if (m) m.remove();
    _editingMenuItemId = null;
    _editingRoomId = null;
}

function _openModal(title, bodyHtml) {
    _closeModal();
    const overlay = document.createElement('div');
    overlay.id = '_dynModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.onclick = (e) => { if (e.target === overlay) _closeModal(); };
    overlay.innerHTML = `
        <div style="background:#1e293b;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;padding:1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                <h3 style="margin:0;color:#fff;">${title}</h3>
                <button onclick="_closeModal()" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>
            </div>
            ${bodyHtml}
        </div>`;
    document.body.appendChild(overlay);
}

function _fieldRow(id, label, value, isTextarea) {
    const safeVal = (value ?? '').toString().replace(/"/g, '&quot;');
    return `
        <div style="margin-bottom:0.75rem;">
            <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:0.25rem;">${label}</label>
            ${isTextarea
            ? `<textarea id="${id}" rows="3" style="width:100%;padding:0.5rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;">${value ?? ''}</textarea>`
            : `<input id="${id}" value="${safeVal}" style="width:100%;padding:0.5rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;">`}
        </div>`;
}

function _categorySelect(id, selected) {
    return `<select id="${id}" style="flex:1;min-width:90px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
        <option value="">Category…</option>
        ${MENU_CATEGORIES.map(c => `<option value="${c.value}" ${c.value === selected ? 'selected' : ''}>${c.label}</option>`).join('')}
    </select>`;
}

function _roomTypeSelect(id, selected) {
    return `<select id="${id}" style="flex:2;min-width:110px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
        <option value="">Room type…</option>
        ${ROOM_TYPES.map(t => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`).join('')}
    </select>`;
}

function _imageFieldRow(id, label, value, folder) {
    const safeVal = (value ?? '').toString().replace(/"/g, '&quot;');
    const hasImg = !!value;
    return `
        <div style="margin-bottom:0.75rem;">
            <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:0.25rem;">${label}</label>
            <div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.4rem;">
                <img id="${id}_preview" src="${hasImg ? fixUrl(value) : ''}" onerror="this.style.display='none'"
                     style="width:48px;height:48px;border-radius:6px;object-fit:cover;background:#0f172a;flex-shrink:0;display:${hasImg ? 'block' : 'none'};">
                <input id="${id}" value="${safeVal}" placeholder="Image URL, or upload a file below"
                       oninput="_previewFromUrl('${id}')"
                       style="flex:1;padding:0.5rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;box-sizing:border-box;">
            </div>
            <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="file" id="${id}_file" accept="image/*" style="flex:1;font-size:0.8rem;color:#94a3b8;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="_doUpload('${id}','${folder}')">⬆ Upload</button>
            </div>
        </div>`;
}

function _previewFromUrl(fieldId) {
    const val = document.getElementById(fieldId).value;
    const preview = document.getElementById(`${fieldId}_preview`);
    if (val) { preview.src = fixUrl(val); preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
}

async function _uploadImageFile(file, folder) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch(`${API_BASE}/admin/upload-image?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        headers: { 'X-Admin-Key': ADMIN_KEY },
        body: formData
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || 'Upload failed');
    return data.url;
}

async function _doUpload(fieldId, folder) {
    const fileInput = document.getElementById(`${fieldId}_file`);
    if (!fileInput.files.length) { toast('Choose a file first', 'error'); return; }
    try {
        toast('Uploading…', 'info');
        const url = await _uploadImageFile(fileInput.files[0], folder);
        document.getElementById(fieldId).value = url;
        _previewFromUrl(fieldId);
        toast('✅ Image uploaded', 'success');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

function _itemThumb(url) {
    return url
        ? `<img src="${fixUrl(url)}" onerror="this.style.display='none'" style="width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0;">`
        : `<div style="width:36px;height:36px;border-radius:6px;background:#0f172a;flex-shrink:0;"></div>`;
}

// ── LOCATION PICKER (Yandex Maps) ──
let _yandexLoading = null;
function _ensureYandexLoaded() {
    if (window.ymaps) return Promise.resolve();
    if (_yandexLoading) return _yandexLoading;
    _yandexLoading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?lang=en_US';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load map library'));
        document.head.appendChild(script);
    });
    return _yandexLoading;
}

let _pickerMap = null, _pickerMarker = null, _pickedCoords = null;

// latFieldId/lngFieldId are the ids of the lat/lng <input> elements already
// sitting in the parent edit modal — this picker writes straight into them.
async function openLocationPicker(latFieldId, lngFieldId) {
    try {
        await _ensureYandexLoaded();
    } catch (e) {
        toast('❌ Could not load the map. Check your internet connection.', 'error');
        return;
    }

    const curLat = parseFloat(document.getElementById(latFieldId).value);
    const curLng = parseFloat(document.getElementById(lngFieldId).value);
    // Default to central Samarkand if nothing set yet.
    const startLat = isFinite(curLat) ? curLat : 39.6542;
    const startLng = isFinite(curLng) ? curLng : 66.9597;
    _pickedCoords = [startLat, startLng];

    const overlay = document.createElement('div');
    overlay.id = '_locationPickerModal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.innerHTML = `
        <div style="background:#1e293b;border-radius:12px;max-width:700px;width:100%;padding:1.25rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
                <h3 style="margin:0;color:#fff;">📍 Click the map to set the location</h3>
                <button onclick="document.getElementById('_locationPickerModal').remove()"
                    style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;line-height:1;">&times;</button>
            </div>
            <div id="_pickerMapEl" style="height:400px;border-radius:8px;overflow:hidden;"></div>
            <div style="display:flex;gap:0.75rem;align-items:center;margin-top:0.75rem;color:#94a3b8;font-size:0.85rem;">
                <span id="_pickerCoords">${startLat.toFixed(6)}, ${startLng.toFixed(6)}</span>
            </div>
            <button class="btn btn-primary" style="width:100%;margin-top:0.75rem;"
                onclick="_confirmLocationPick('${latFieldId}','${lngFieldId}')">Use This Location</button>
        </div>`;
    document.body.appendChild(overlay);

    ymaps.ready(() => {
        _pickerMap = new ymaps.Map('_pickerMapEl', {
            center: [startLat, startLng],
            zoom: 14,
            controls: ['zoomControl', 'fullscreenControl']
        });
        _pickerMarker = new ymaps.Placemark([startLat, startLng], {}, { draggable: true });
        _pickerMap.geoObjects.add(_pickerMarker);

        function updateCoordsDisplay(lat, lng) {
            _pickedCoords = [lat, lng];
            document.getElementById('_pickerCoords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        _pickerMap.events.add('click', (e) => {
            const coords = e.get('coords');
            _pickerMarker.geometry.setCoordinates(coords);
            updateCoordsDisplay(coords[0], coords[1]);
        });

        _pickerMarker.events.add('dragend', () => {
            const coords = _pickerMarker.geometry.getCoordinates();
            updateCoordsDisplay(coords[0], coords[1]);
        });
    });
}

function _confirmLocationPick(latFieldId, lngFieldId) {
    if (_pickedCoords) {
        document.getElementById(latFieldId).value = _pickedCoords[0].toFixed(6);
        document.getElementById(lngFieldId).value = _pickedCoords[1].toFixed(6);
    }
    document.getElementById('_locationPickerModal')?.remove();
    _pickerMap = null;
    _pickerMarker = null;
    toast('✅ Location set — remember to hit Save Changes', 'success');
}

function _locationFieldRow(latId, lngId, lat, lng) {
    return `
        <div style="margin-bottom:0.75rem;">
            <label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:0.25rem;">Location</label>
            <div style="display:flex;gap:0.5rem;">
                <input id="${latId}" type="number" step="any" value="${lat ?? ''}" placeholder="Latitude"
                    style="flex:1;padding:0.5rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                <input id="${lngId}" type="number" step="any" value="${lng ?? ''}" placeholder="Longitude"
                    style="flex:1;padding:0.5rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                <button type="button" class="btn btn-secondary btn-sm" style="white-space:nowrap;"
                    onclick="openLocationPicker('${latId}','${lngId}')">📍 Pick on Map</button>
            </div>
        </div>`;
}

// ── RESTAURANTS ──
function editRestaurant(id) {
    const r = _allRestaurants.find(x => x.id === id);
    if (!r) { toast('Restaurant not found in current list — reload the page.', 'error'); return; }

    const formHtml =
        _fieldRow('edit_name', 'Name', r.name) +
        _fieldRow('edit_description', 'Description', r.description, true) +
        _fieldRow('edit_cuisine_type', 'Cuisine Type', r.cuisine_type) +
        _fieldRow('edit_phone', 'Phone', r.phone) +
        _fieldRow('edit_address', 'Address', r.address) +
        _locationFieldRow('edit_latitude', 'edit_longitude', r.latitude, r.longitude) +
        _fieldRow('edit_opening_hours', 'Opening Hours', r.opening_hours) +
        _fieldRow('edit_website', 'Website', r.website) +
        _imageFieldRow('edit_image_url', 'Photo', r.image_url, 'restaurants');

    const menuHtml = `
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #334155;">
            <h4 style="margin:0 0 0.5rem;color:#fff;">Menu Items</h4>
            ${(r.menus || []).map(m => _menuItemRow(m, id)).join('') || '<p style="color:#64748b;font-size:0.85rem;">No menu items yet.</p>'}

            <div style="border:1px dashed #334155;border-radius:8px;padding:0.75rem;margin-top:0.75rem;">
                <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:0.5rem;">Add new item</div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.5rem;">
                    <input id="newMenuName" placeholder="Item name" style="flex:2;min-width:100px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                    <input id="newMenuPrice" type="number" placeholder="Price" style="flex:1;min-width:70px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                    ${_categorySelect('newMenuCategory', '')}
                </div>
                ${_imageFieldRow('newMenuImage', 'Photo', '', 'menu-items')}
                <button class="btn btn-primary btn-sm" style="width:100%;" onclick="addMenuItem(${id})">+ Add Item</button>
            </div>
        </div>`;

    _openModal(`Edit: ${r.name}`, `
        ${formHtml}
        <button class="btn btn-primary" style="width:100%;" onclick="saveRestaurantEdit(${id})">💾 Save Changes</button>
        ${menuHtml}
    `);
}

function _menuItemRow(m, restaurantId) {
    if (m.id === _editingMenuItemId) {
        return `
        <div style="padding:0.6rem 0;border-bottom:1px solid #334155;">
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.4rem;">
                <input id="editMenuName_${m.id}" value="${(m.item_name || '').replace(/"/g, '&quot;')}" placeholder="Item name" style="flex:2;min-width:100px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                <input id="editMenuPrice_${m.id}" type="number" value="${m.price}" placeholder="Price" style="flex:1;min-width:70px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                ${_categorySelect(`editMenuCategory_${m.id}`, m.category)}
            </div>
            ${_imageFieldRow(`editMenuImage_${m.id}`, 'Photo', m.image_url, 'menu-items')}
            <div style="display:flex;gap:0.4rem;">
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="saveMenuItemEdit(${m.id}, ${restaurantId})">💾 Save</button>
                <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="_editingMenuItemId=null;editRestaurant(${restaurantId})">Cancel</button>
            </div>
        </div>`;
    }
    return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid #334155;gap:0.5rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;min-width:0;">
                ${_itemThumb(m.image_url)}
                <span style="color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.item_name} — $${m.price}${m.category ? ' · ' + m.category : ''}</span>
            </div>
            <div style="display:flex;gap:0.3rem;flex-shrink:0;">
                <button class="btn btn-secondary btn-sm" onclick="_editingMenuItemId=${m.id};editRestaurant(${restaurantId})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMenuItem(${m.id}, ${restaurantId})">✕</button>
            </div>
        </div>`;
}

async function saveRestaurantEdit(id) {
    const fields = ['name', 'description', 'cuisine_type', 'phone', 'address', 'opening_hours', 'website', 'image_url'];
    const data = {};
    fields.forEach(f => data[f] = document.getElementById(`edit_${f}`).value);
    const lat = parseFloat(document.getElementById('edit_latitude').value);
    const lng = parseFloat(document.getElementById('edit_longitude').value);
    if (isFinite(lat)) data.latitude = lat;
    if (isFinite(lng)) data.longitude = lng;
    try {
        await fetchAPI(`/admin/restaurants/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        toast('✅ Restaurant updated', 'success');
        _closeModal();
        loadRestaurants();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function addMenuItem(restaurantId) {
    const item_name = document.getElementById('newMenuName').value.trim();
    const price = parseFloat(document.getElementById('newMenuPrice').value);
    const category = document.getElementById('newMenuCategory').value;
    const image_url = document.getElementById('newMenuImage').value || null;
    if (!item_name || !price) { toast('Name and price required', 'error'); return; }
    try {
        await fetchAPI(`/admin/restaurants/${restaurantId}/menu`, {
            method: 'POST', body: JSON.stringify({ item_name, price, category, image_url })
        });
        toast('✅ Menu item added', 'success');
        await loadRestaurants();
        editRestaurant(restaurantId);
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function saveMenuItemEdit(itemId, restaurantId) {
    const item_name = document.getElementById(`editMenuName_${itemId}`).value.trim();
    const price = parseFloat(document.getElementById(`editMenuPrice_${itemId}`).value);
    const category = document.getElementById(`editMenuCategory_${itemId}`).value;
    const image_url = document.getElementById(`editMenuImage_${itemId}`).value || null;
    if (!item_name || !price) { toast('Name and price required', 'error'); return; }
    try {
        await fetchAPI(`/admin/menu-items/${itemId}`, {
            method: 'PUT', body: JSON.stringify({ item_name, price, category, image_url })
        });
        toast('✅ Menu item updated', 'success');
        _editingMenuItemId = null;
        await loadRestaurants();
        editRestaurant(restaurantId);
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deleteMenuItem(itemId, restaurantId) {
    if (!confirm('Delete this menu item?')) return;
    try {
        await fetchAPI(`/admin/menu-items/${itemId}`, { method: 'DELETE' });
        toast('Deleted', 'success');
        await loadRestaurants();
        editRestaurant(restaurantId);
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

// ── HOTELS ──
function editHotel(id) {
    const h = _allHotels.find(x => x.id === id);
    if (!h) { toast('Hotel not found in current list — reload the page.', 'error'); return; }

    const formHtml =
        _fieldRow('edit_name', 'Name', h.name) +
        _fieldRow('edit_description', 'Description', h.description, true) +
        _fieldRow('edit_type', 'Type', h.type) +
        _fieldRow('edit_phone', 'Phone', h.phone) +
        _fieldRow('edit_address', 'Address', h.address) +
        _locationFieldRow('edit_latitude', 'edit_longitude', h.latitude, h.longitude) +
        _fieldRow('edit_opening_hours', 'Opening Hours', h.opening_hours) +
        _fieldRow('edit_website', 'Website', h.website) +
        _fieldRow('edit_offer', 'Offer', h.offer) +
        _imageFieldRow('edit_image_url', 'Photo', h.image_url, 'hotels');

    const roomHtml = `
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #334155;">
            <h4 style="margin:0 0 0.5rem;color:#fff;">Rooms</h4>
            ${(h.rooms || []).map(r => _roomRow(r, id)).join('') || '<p style="color:#64748b;font-size:0.85rem;">No rooms yet.</p>'}

            <div style="border:1px dashed #334155;border-radius:8px;padding:0.75rem;margin-top:0.75rem;">
                <div style="font-size:0.78rem;color:#94a3b8;margin-bottom:0.5rem;">Add new room</div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.5rem;">
                    ${_roomTypeSelect('newRoomType', '')}
                    <input id="newRoomPrice" type="number" placeholder="Price/night" style="flex:1;min-width:80px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                    <input id="newRoomCapacity" type="number" placeholder="Capacity" style="flex:1;min-width:80px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                </div>
                ${_imageFieldRow('newRoomImage', 'Photo', '', 'hotel-rooms')}
                <button class="btn btn-primary btn-sm" style="width:100%;" onclick="addHotelRoom(${id})">+ Add Room</button>
            </div>
        </div>`;

    _openModal(`Edit: ${h.name}`, `
        ${formHtml}
        <button class="btn btn-primary" style="width:100%;" onclick="saveHotelEdit(${id})">💾 Save Changes</button>
        ${roomHtml}
    `);
}

function _roomRow(r, hotelId) {
    if (r.id === _editingRoomId) {
        return `
        <div style="padding:0.6rem 0;border-bottom:1px solid #334155;">
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.4rem;">
                ${_roomTypeSelect(`editRoomType_${r.id}`, r.room_type)}
                <input id="editRoomPrice_${r.id}" type="number" value="${r.price}" placeholder="Price/night" style="flex:1;min-width:80px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
                <input id="editRoomCapacity_${r.id}" type="number" value="${r.capacity}" placeholder="Capacity" style="flex:1;min-width:80px;padding:0.4rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#fff;">
            </div>
            ${_imageFieldRow(`editRoomImage_${r.id}`, 'Photo', r.image_url, 'hotel-rooms')}
            <div style="display:flex;gap:0.4rem;">
                <button class="btn btn-primary btn-sm" style="flex:1;" onclick="saveRoomEdit(${r.id}, ${hotelId})">💾 Save</button>
                <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="_editingRoomId=null;editHotel(${hotelId})">Cancel</button>
            </div>
        </div>`;
    }
    return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid #334155;gap:0.5rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;min-width:0;">
                ${_itemThumb(r.image_url)}
                <span style="color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.room_type} — $${r.price}/night (cap ${r.capacity})</span>
            </div>
            <div style="display:flex;gap:0.3rem;flex-shrink:0;">
                <button class="btn btn-secondary btn-sm" onclick="_editingRoomId=${r.id};editHotel(${hotelId})">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteHotelRoom(${r.id}, ${hotelId})">✕</button>
            </div>
        </div>`;
}

async function saveHotelEdit(id) {
    const fields = ['name', 'description', 'type', 'phone', 'address', 'opening_hours', 'website', 'offer', 'image_url'];
    const data = {};
    fields.forEach(f => data[f] = document.getElementById(`edit_${f}`).value);
    const lat = parseFloat(document.getElementById('edit_latitude').value);
    const lng = parseFloat(document.getElementById('edit_longitude').value);
    if (isFinite(lat)) data.latitude = lat;
    if (isFinite(lng)) data.longitude = lng;
    try {
        await fetchAPI(`/admin/hotels/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        toast('✅ Hotel updated', 'success');
        _closeModal();
        loadHotels();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function addHotelRoom(hotelId) {
    const room_type = document.getElementById('newRoomType').value;
    const price = parseFloat(document.getElementById('newRoomPrice').value);
    const capacity = parseInt(document.getElementById('newRoomCapacity').value);
    const image_url = document.getElementById('newRoomImage').value || null;
    if (!room_type || !price) { toast('Room type and price required', 'error'); return; }
    try {
        await fetchAPI(`/admin/hotels/${hotelId}/rooms`, {
            method: 'POST', body: JSON.stringify({ room_type, price, capacity, image_url })
        });
        toast('✅ Room added', 'success');
        await loadHotels();
        editHotel(hotelId);
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function saveRoomEdit(roomId, hotelId) {
    const room_type = document.getElementById(`editRoomType_${roomId}`).value;
    const price = parseFloat(document.getElementById(`editRoomPrice_${roomId}`).value);
    const capacity = parseInt(document.getElementById(`editRoomCapacity_${roomId}`).value);
    const image_url = document.getElementById(`editRoomImage_${roomId}`).value || null;
    if (!room_type || !price) { toast('Room type and price required', 'error'); return; }
    try {
        await fetchAPI(`/admin/hotel-rooms/${roomId}`, {
            method: 'PUT', body: JSON.stringify({ room_type, price, capacity, image_url })
        });
        toast('✅ Room updated', 'success');
        _editingRoomId = null;
        await loadHotels();
        editHotel(hotelId);
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deleteHotelRoom(roomId, hotelId) {
    if (!confirm('Delete this room?')) return;
    try {
        await fetchAPI(`/admin/hotel-rooms/${roomId}`, { method: 'DELETE' });
        toast('Deleted', 'success');
        await loadHotels();
        editHotel(hotelId);
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}