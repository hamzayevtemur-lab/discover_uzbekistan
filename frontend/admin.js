// ── CONSTANTS ─────────────────────────────────────────────────
const ADMIN_KEY = "668e4a2d545ddcdd0a8d40e0cf7a8079fadeeb21872198a1354cd6c4a9b739b6";
const PARTNER_PAGE_SIZE = 10;
let _allPartners = [], _filtPartners = [], _partnerPage = 0;

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

        // Agencies count
        fetchAPI('/admin/travel-agencies').then(res => {
            document.getElementById('s-agencies').textContent = (res.agencies || []).length;
        }).catch(() => { });

        // Partners count
        fetch(`${API_BASE}/api/partner-applications/admin/list?status=approved`, {
            headers: { 'X-Admin-Key': ADMIN_KEY }
        }).then(r => r.json()).then(d => {
            document.getElementById('s-partners').textContent = d.length || 0;
        }).catch(() => { });

    } catch (e) { console.error('Stats error:', e); }

    // Load pending approvals for badge + dashboard card
    loadPendingApprovals(true);
}

// ── PENDING APPROVALS ─────────────────────────────────────────
async function loadPendingApprovals(dashboardOnly = false) {
    try {
        const [pendingRestaurants, pendingMenuItems, pendingHotels,
            pendingRooms, pendingTours] = await Promise.all([
                fetchAPI('/api/admin-approval/restaurants/pending'),
                fetchAPI('/api/admin-approval/menu-items/pending'),
                fetchAPI('/api/admin-approval/hotels/pending'),
                fetchAPI('/api/admin-approval/hotel-rooms/pending'),
                fetchAPI('/api/admin-approval/tours/pending'),
            ]);

        const total = pendingRestaurants.length + pendingMenuItems.length +
            pendingHotels.length + pendingRooms.length + pendingTours.length;

        // Update badges
        ['nav-pending-badge', 'nav-pending-badge2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.textContent = total; el.style.display = total > 0 ? 'inline-block' : 'none'; }
        });

        // Dashboard card
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
                        ${pendingTours.length ? `<div class="badge badge-warning">🗺️ ${pendingTours.length} Tours</div>` : ''}
                    </div>`;
            } else {
                dashCard.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text3);">
                    ✅ No pending approvals — all caught up!</div>`;
            }
        }

        if (dashboardOnly) return;

        // Full approvals page
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
                    <div class="pending-name">${item.item_name}</div>
                    <div class="pending-meta">
                        Restaurant: <strong>${item.restaurant_name}</strong><br>
                        $${item.price} • ${item.category || 'N/A'}
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

        if (total === 0) {
            html = `<div class="empty"><div class="empty-icon">✅</div><p>No pending approvals — all caught up!</p></div>`;
        }

        document.getElementById('pending-items').innerHTML = html;
    } catch (e) { console.error('Pending error:', e); }
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
        await fetchAPI(`/api/admin-approval/${type}/${id}/reject`, {
            method: 'POST', body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
        });
        toast('Rejected', 'info');
        loadPendingApprovals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

// ── RESTAURANTS ───────────────────────────────────────────────
let _allRestaurants = [], _restaurantPage = 0;
const REST_PAGE = 15;

async function loadRestaurants() {
    try {
        const data = await fetchAPI('/admin/restaurants');
        _allRestaurants = data.restaurants || [];
        _restaurantPage = 0;
        renderRestaurantsPage();
    } catch (e) { console.error(e); }
}

function renderRestaurantsPage() {
    const tbody = document.getElementById('restaurants-table');
    const start = _restaurantPage * REST_PAGE;
    const slice = _allRestaurants.slice(start, start + REST_PAGE);
    document.getElementById('restaurants-showing').textContent = _allRestaurants.length;
    document.getElementById('restaurants-total').textContent = _allRestaurants.length;
    if (!slice.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No restaurants.</td></tr>'; return; }
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

// ── HOTELS ────────────────────────────────────────────────────
let _allHotels = [], _hotelPage = 0;
const HOTEL_PAGE = 15;

async function loadHotels() {
    try {
        const data = await fetchAPI('/admin/hotels');
        _allHotels = data.hotels || [];
        _hotelPage = 0;
        renderHotelsPage();
    } catch (e) { console.error(e); }
}

function renderHotelsPage() {
    const tbody = document.getElementById('hotels-table');
    const start = _hotelPage * HOTEL_PAGE;
    const slice = _allHotels.slice(start, start + HOTEL_PAGE);
    document.getElementById('hotels-showing').textContent = _allHotels.length;
    document.getElementById('hotels-total').textContent = _allHotels.length;
    if (!slice.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No hotels.</td></tr>'; return; }
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

// ── AGENCIES ──────────────────────────────────────────────────
let _allAgencies = [], _agencyPage = 0;
const AGENCY_PAGE = 15;

async function loadAgencies() {
    try {
        const data = await fetchAPI('/admin/travel-agencies');
        _allAgencies = data.agencies || [];
        renderAgenciesPage();
    } catch (e) { console.error(e); }
}

function renderAgenciesPage() {
    const tbody = document.getElementById('agencies-table');
    if (!_allAgencies.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No agencies.</td></tr>'; return; }
    tbody.innerHTML = _allAgencies.map(a => `
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

// Stubs for create/edit modals (kept from original logic)
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

function editRestaurant(id) { toast('Edit via restaurant admin panel', 'info'); }
function editHotel(id) { toast('Edit via hotel admin panel', 'info'); }
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
    const TYPE_LABELS = { restaurant: '🍽️ Restaurant', hotel: '🏨 Hotel', travel_agency: '🗺️ Agency' };
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
            headers: { 'X-Admin-Key': ADMIN_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_email: 'ceo@discover-travel-uzbekistan.com' }),
        });
        if (!resp.ok) {
            const d = await resp.json().catch(() => ({}));
            throw new Error(d.detail || 'Status ' + resp.status);
        }
        toast('✅ Renewal approved!', 'success'); loadRenewals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function rejectRenewal(id) {
    const reason = prompt('Rejection reason:') || 'Payment not verified.';
    try {
        const resp = await fetch(`${API_BASE}/api/subscription/admin/renewals/${id}/reject`, {
            method: 'POST',
            headers: { 'X-Admin-Key': ADMIN_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_email: 'ceo@discover-travel-uzbekistan.com',
                rejection_reason: reason,
                reason: reason,
            })
        });
        if (!resp.ok) {
            const d = await resp.json().catch(() => ({}));
            throw new Error(d.detail || 'Status ' + resp.status);
        }
        toast('Rejected', 'info'); loadRenewals();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}