const API_BASE = 'http://localhost:8000';

let restaurantMap, restaurantMarker;

const ADMIN_KEY = "668e4a2d545ddcdd0a8d40e0cf7a8079fadeeb21872198a1354cd6c4a9b739b6"

async function fetchAPI(endpoint, options = {}) {
    try {
        options.headers = {
            ...options.headers,
            'X-Admin-Key': ADMIN_KEY,
            'Content-Type': 'application/json'
        };
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(sectionId);
    if (section) section.classList.add('active');

    // Find the nav item that triggered this and mark active
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => {
        const onclick = n.getAttribute('onclick') || '';
        if (onclick.includes(`'${sectionId}'`) || onclick.includes(`"${sectionId}"`)) {
            n.classList.add('active');
        }
    });

    if (sectionId === 'dashboard') loadDashboard();
    else if (sectionId === 'partners') loadPartners();
    else if (sectionId === 'renewals') loadRenewals();
    else if (sectionId === 'restaurants') loadRestaurants();
    else if (sectionId === 'hotels') loadHotels();
    else if (sectionId === 'attractions') loadAttractions();
    else if (sectionId === 'reviews') loadReviews();
    else if (sectionId === 'likes') loadLikes();
    else if (sectionId === 'agencies') loadAgencies();
    else if (sectionId === 'platform-analytics') {
        loadPlatformAnalytics();
        setInterval(loadRealtimeStats, 30000);
    }
}

async function loadDashboard() {
    try {
        const stats = await fetchAPI('/admin/stats');
        document.getElementById('stats-grid').innerHTML = `
                    <div class="stat-card" style="border-left-color: #2563eb;">
                        <div class="stat-title">Restaurants</div>
                        <div class="stat-value">${stats.restaurants.total}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: #10b981;">
                        <div class="stat-title">Hotels</div>
                        <div class="stat-value">${stats.hotels.total}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: #f59e0b;">
                        <div class="stat-title">Attractions</div>
                        <div class="stat-value">${stats.attractions.total}</div>
                    </div>
                    <div class="stat-card" style="border-left-color: #ef4444;">
                        <div class="stat-title">Reviews</div>
                        <div class="stat-value">${stats.reviews.total}</div>
                    </div>
                `;

        fetchAPI('/admin/travel-agencies').then(res => {
            const list = res.agencies || [];
            document.getElementById('stats-grid').insertAdjacentHTML('beforeend', `
            <div class="stat-card" style="border-left-color:#8b5cf6;">
                <div class="stat-title">Tour Agencies</div>
                <div class="stat-value">${list.length}</div>
            </div>`);
        }).catch(() => { });

    } catch (error) {
        console.error('Stats error:', error);
    }

    loadPendingApprovals();
}

async function loadPendingApprovals() {
    try {
        // ✅ Destructure ALL 5 results — was missing pendingTours causing crash
        const [pendingRestaurants, pendingMenuItems, pendingHotels, pendingRooms, pendingTours] = await Promise.all([
            fetchAPI('/api/admin-approval/restaurants/pending'),
            fetchAPI('/api/admin-approval/menu-items/pending'),
            fetchAPI('/api/admin-approval/hotels/pending'),
            fetchAPI('/api/admin-approval/hotel-rooms/pending'),
            fetchAPI('/api/admin-approval/tours/pending'),
        ]);

        const total = pendingRestaurants.length + pendingMenuItems.length + pendingHotels.length + pendingRooms.length + pendingTours.length;
        const badge = document.getElementById('nav-pending-badge');
        if (total > 0) {
            badge.textContent = total;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        let html = '<div style="margin-top: 2rem;"><h2 style="color: white; font-size: 1.5rem; margin-bottom: 1rem;">⏰ Pending Approvals</h2>';

        // ── Pending Restaurants ──────────────────────────────
        if (pendingRestaurants.length > 0) {
            html += '<div class="table-container" style="margin-bottom: 1.5rem;"><h3 style="padding: 1rem; border-bottom: 1px solid #e5e7eb; margin: 0;">Pending Restaurants (' + pendingRestaurants.length + ')</h3><div style="padding: 1rem;">';
            pendingRestaurants.forEach(r => {
                html += `
                        <div class="pending-item" style="background: white;padding: 1.5rem; margin-bottom: 1rem;border-radius: 12px;box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                            <div style="display:flex; gap:1.5rem;">
                                <div><img src="${r.image_url || 'https://via.placeholder.com/150'}" style="width:150px; height:120px; object-fit:cover; border-radius:10px;"></div>
                                <div style="flex:1;">
                                    <h4 style="font-size:1.2rem; margin-bottom:0.5rem;">${r.name}</h4>
                                    <p style="color:#6b7280; margin-bottom:0.5rem;">${r.description || 'No description provided'}</p>
                                    <div style="font-size:0.9rem; color:#374151;">
                                        <p><strong>Cuisine:</strong> ${r.cuisine_type || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${r.phone || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${r.address || 'N/A'}</p>
                                        <p><strong>Website:</strong> ${r.website ? `<a href="${r.website}" target="_blank">${r.website}</a>` : 'N/A'}</p>
                                        <p><strong>Opening Hours:</strong> ${r.opening_hours || 'N/A'}</p>
                                    </div>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                                    <button onclick="approveItem('restaurant', ${r.id})" class="btn-create" style="background:#10b981; padding:0.5rem 1rem;">✅ Approve</button>
                                    <button onclick="rejectItem('restaurant', ${r.id})" class="btn-danger" style="padding:0.5rem 1rem;">❌ Reject</button>
                                </div>
                            </div>
                        </div>`;
            });
            html += '</div></div>';
        }

        // ── Pending Menu Items ───────────────────────────────
        if (pendingMenuItems.length > 0) {
            html += '<div class="table-container" style="margin-bottom:1.5rem;"><h3 style="padding: 1rem; border-bottom: 1px solid #e5e7eb; margin: 0;">Pending Menu Items (' + pendingMenuItems.length + ')</h3><div style="padding: 1rem;">';
            pendingMenuItems.forEach(item => {
                html += `
                            <div style="background:white;padding:1.5rem; margin-bottom:1rem;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.05);display:flex;gap:1.5rem;align-items:center;">
                                <img src="${item.image_url || 'https://via.placeholder.com/120'}" style="width:120px; height:100px; object-fit:cover; border-radius:10px;">
                                <div style="flex:1;">
                                    <h4 style="margin-bottom:0.5rem;">${item.item_name}</h4>
                                    <p style="color:#6b7280;">Restaurant: ${item.restaurant_name}</p>
                                    <p style="color:#374151;">Price: $${item.price}</p>
                                    <p style="color:#6b7280;">Category: ${item.category || 'N/A'}</p>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                                    <button onclick="approveItem('menu-item', ${item.id})" class="btn-create" style="background:#10b981; padding:0.5rem 1rem;">✅ Approve</button>
                                    <button onclick="rejectItem('menu-item', ${item.id})" class="btn-danger" style="padding:0.5rem 1rem;">❌ Reject</button>
                                </div>
                            </div>`;
            });
            html += '</div></div>';
        }

        // ── Pending Hotels ───────────────────────────────────
        if (pendingHotels.length > 0) {
            html += '<div class="table-container" style="margin-bottom:1.5rem;"><h3 style="padding: 1rem; border-bottom: 1px solid #e5e7eb; margin: 0;">Pending Hotels (' + pendingHotels.length + ')</h3><div style="padding: 1rem;">';
            pendingHotels.forEach(item => {
                html += `
                        <div class="pending-item" style="background: white;padding: 1.5rem; margin-bottom: 1rem;border-radius: 12px;box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                            <div style="display:flex; gap:1.5rem;">
                                <div><img src="${API_BASE}${item.image_url || 'https://via.placeholder.com/150'}" style="width:150px; height:120px; object-fit:cover; border-radius:10px;"></div>
                                <div style="flex:1;">
                                    <h4 style="font-size:1.2rem; margin-bottom:0.5rem;">${item.name}</h4>
                                    <p style="color:#6b7280; margin-bottom:0.5rem;">${item.description || 'No description provided'}</p>
                                    <div style="font-size:0.9rem; color:#374151;">
                                        <p><strong>Type:</strong> ${item.type || 'N/A'}</p>
                                        <p><strong>Phone:</strong> ${item.phone || 'N/A'}</p>
                                        <p><strong>Address:</strong> ${item.address || 'N/A'}</p>
                                        <p><strong>Website:</strong> ${item.website ? `<a href="${item.website}" target="_blank">${item.website}</a>` : 'N/A'}</p>
                                    </div>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                                    <button onclick="approveItem('hotel', ${item.id})" class="btn-create" style="background:#10b981; padding:0.5rem 1rem;">✅ Approve</button>
                                    <button onclick="rejectItem('hotel', ${item.id})" class="btn-danger" style="padding:0.5rem 1rem;">❌ Reject</button>
                                </div>
                            </div>
                        </div>`;
            });
            html += '</div></div>';
        }

        // ── Pending Hotel Rooms ──────────────────────────────
        if (pendingRooms.length > 0) {
            html += '<div class="table-container" style="margin-bottom:1.5rem;"><h3 style="padding: 1rem; border-bottom: 1px solid #e5e7eb; margin: 0;">Pending Hotel Rooms (' + pendingRooms.length + ')</h3><div style="padding: 1rem;">';
            pendingRooms.forEach(item => {
                html += `
                            <div style="background:white;padding:1.5rem; margin-bottom:1rem;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.05);display:flex;gap:1.5rem;align-items:center;">
                                <img src="${API_BASE}${item.image_url || 'https://via.placeholder.com/120'}" style="width:120px; height:100px; object-fit:cover; border-radius:10px;">
                                <div style="flex:1;">
                                    <h4 style="margin-bottom:0.5rem;">${item.hotel_name}</h4>
                                    <p style="color:#6b7280;">Room Type: ${item.room_type || 'N/A'}</p>
                                    <p style="color:#6b7280;">Capacity: ${item.capacity || 'N/A'}</p>
                                    <p style="color:#374151;">Description: ${item.description}</p>
                                    <p style="color:#374151;">Price: $${item.price}</p>
                                </div>
                                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                                    <button onclick="approveItem('hotel-room', ${item.id})" class="btn-create" style="background:#10b981; padding:0.5rem 1rem;">✅ Approve</button>
                                    <button onclick="rejectItem('hotel-room', ${item.id})" class="btn-danger" style="padding:0.5rem 1rem;">❌ Reject</button>
                                </div>
                            </div>`;
            });
            html += '</div></div>';
        }

        // ── Pending Tours ────────────────────────────────────
        if (pendingTours.length > 0) {
            html += '<div class="table-container" style="margin-bottom:1.5rem;"><h3 style="padding: 1rem; border-bottom: 1px solid #e5e7eb; margin: 0;">🗺️ Pending Tours (' + pendingTours.length + ')</h3><div style="padding: 1rem;">';
            pendingTours.forEach(t => {
                const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                const inclusions = Array.isArray(t.inclusions) ? t.inclusions.join(', ') : (t.inclusions || null);
                const exclusions = Array.isArray(t.exclusions) ? t.exclusions.join(', ') : (t.exclusions || null);
                const highlights = Array.isArray(t.highlights) ? t.highlights : [];
                const itinerary = Array.isArray(t.itinerary) ? t.itinerary : [];
                html += `
                    <div style="background:white;padding:1.5rem;margin-bottom:1.2rem;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.07);border:1px solid #f1f5f9;">
                        <!-- Header row -->
                        <div style="display:flex;gap:1.5rem;margin-bottom:1rem;">
                            <div style="flex-shrink:0;">
                                <img src="${t.image_url || 'https://via.placeholder.com/160x120?text=Tour'}"
                                     style="width:160px;height:120px;object-fit:cover;border-radius:10px;border:1px solid #e5e7eb;"
                                     onerror="this.src='https://via.placeholder.com/160x120?text=No+Image'">
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                                    <div>
                                        <h4 style="font-size:1.15rem;font-weight:700;color:#1e293b;margin-bottom:0.25rem;">${t.tour_name || t.name || 'Unnamed Tour'}</h4>
                                        <p style="color:#6366f1;font-size:0.85rem;font-weight:600;margin-bottom:0.4rem;">
                                            🏢 ${t.agency_name || 'Unknown Agency'}
                                            ${t.agency_city ? `<span style="color:#94a3b8;font-weight:400;"> · ${t.agency_city}</span>` : ''}
                                        </p>
                                    </div>
                                    <div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;">
                                        <button onclick="approveItem('tour', ${t.id})" style="background:#10b981;color:white;border:none;padding:0.5rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer;white-space:nowrap;">✅ Approve</button>
                                        <button onclick="rejectItem('tour', ${t.id})" style="background:white;color:#ef4444;border:1px solid #fecaca;padding:0.5rem 1.1rem;border-radius:8px;font-weight:700;font-size:0.82rem;cursor:pointer;white-space:nowrap;">❌ Reject</button>
                                    </div>
                                </div>
                                <!-- Key metrics chips -->
                                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
                                    ${t.duration_days ? `<span class="tour-chip tour-chip-blue">📅 ${t.duration_days} day${t.duration_days > 1 ? 's' : ''}</span>` : ''}
                                    ${(t.price || t.price_per_person) ? `<span class="tour-chip tour-chip-green">💰 ${t.currency || 'USD'} ${t.price || t.price_per_person}/person</span>` : ''}
                                    ${t.difficulty_level ? `<span class="tour-chip tour-chip-orange">🏃 ${t.difficulty_level}</span>` : ''}
                                    ${t.max_group_size ? `<span class="tour-chip tour-chip-purple">👥 Max ${t.max_group_size} people</span>` : ''}
                                    ${t.min_age ? `<span class="tour-chip">👶 Min age ${t.min_age}</span>` : ''}
                                    ${t.best_season ? `<span class="tour-chip">🌤 ${t.best_season}</span>` : ''}
                                    ${t.tour_type ? `<span class="tour-chip">🏷️ ${t.tour_type}</span>` : ''}
                                    ${t.languages ? `<span class="tour-chip">🗣 ${Array.isArray(t.languages) ? t.languages.join(', ') : t.languages}</span>` : ''}
                                </div>
                                <!-- Dates if available -->
                                ${(t.start_date || t.end_date) ? `<p style="font-size:0.82rem;color:#374151;">📆 ${fmtDate(t.start_date)} → ${fmtDate(t.end_date)}</p>` : ''}
                                ${t.meeting_point ? `<p style="font-size:0.82rem;color:#374151;">📍 Meeting: ${t.meeting_point}</p>` : ''}
                            </div>
                        </div>
                        <!-- Description -->
                        ${t.description ? `<div style="background:#f8fafc;border-radius:8px;padding:0.75rem 1rem;margin-bottom:0.75rem;font-size:0.875rem;color:#374151;line-height:1.6;border-left:3px solid #6366f1;">
                            <strong style="color:#1e293b;">Description:</strong><br>${t.description}
                        </div>` : ''}
                        <!-- Highlights -->
                        ${highlights.length > 0 ? `<div style="margin-bottom:0.75rem;">
                            <p style="font-size:0.8rem;font-weight:700;color:#374151;margin-bottom:0.4rem;">✨ Highlights:</p>
                            <ul style="margin:0;padding-left:1.2rem;font-size:0.82rem;color:#475569;line-height:1.8;">
                                ${highlights.slice(0, 5).map(h => `<li>${h}</li>`).join('')}
                                ${highlights.length > 5 ? `<li style="color:#94a3b8;">+${highlights.length - 5} more…</li>` : ''}
                            </ul>
                        </div>` : ''}
                        <!-- Itinerary preview -->
                        ${itinerary.length > 0 ? `<div style="margin-bottom:0.75rem;">
                            <p style="font-size:0.8rem;font-weight:700;color:#374151;margin-bottom:0.4rem;">🗓 Itinerary (${itinerary.length} day${itinerary.length > 1 ? 's' : ''}):</p>
                            <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
                                ${itinerary.slice(0, 4).map((day, i) => `<span style="background:#eff6ff;color:#1d4ed8;font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:20px;">Day ${i + 1}: ${typeof day === 'string' ? day.substring(0, 40) : (day.title || day.description || 'Activity').substring(0, 40)}${(typeof day === 'string' ? day : (day.title || day.description || '')).length > 40 ? '…' : ''}</span>`).join('')}
                                ${itinerary.length > 4 ? `<span style="background:#f1f5f9;color:#64748b;font-size:0.75rem;padding:0.2rem 0.6rem;border-radius:20px;">+${itinerary.length - 4} more days</span>` : ''}
                            </div>
                        </div>` : ''}
                        <!-- Inclusions / Exclusions -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.5rem;">
                            ${inclusions ? `<div style="background:#f0fdf4;border-radius:8px;padding:0.6rem 0.8rem;font-size:0.8rem;">
                                <strong style="color:#065f46;">✅ Included:</strong>
                                <p style="color:#374151;margin-top:0.2rem;line-height:1.5;">${inclusions}</p>
                            </div>` : ''}
                            ${exclusions ? `<div style="background:#fef2f2;border-radius:8px;padding:0.6rem 0.8rem;font-size:0.8rem;">
                                <strong style="color:#991b1b;">❌ Not Included:</strong>
                                <p style="color:#374151;margin-top:0.2rem;line-height:1.5;">${exclusions}</p>
                            </div>` : ''}
                        </div>
                        <!-- Contact & submission info -->
                        <div style="display:flex;flex-wrap:wrap;gap:1rem;font-size:0.78rem;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:0.6rem;margin-top:0.5rem;">
                            ${t.contact_email || t.agency_email ? `<span>📧 ${t.contact_email || t.agency_email}</span>` : ''}
                            ${t.contact_phone || t.agency_phone ? `<span>📞 ${t.contact_phone || t.agency_phone}</span>` : ''}
                            ${t.created_at ? `<span>📤 Submitted ${fmtDate(t.created_at)}</span>` : ''}
                            ${t.rejection_reason ? `<span style="color:#ef4444;font-weight:600;">⚠️ Prev. rejection: ${t.rejection_reason}</span>` : ''}
                        </div>
                    </div>`;
            });
            html += '</div></div>';
        }

        if (total === 0) {
            html += '<div class="table-container" style="padding: 2rem; text-align: center; color: #6b7280;">✅ No pending approvals!</div>';
        }

        html += '</div>';
        document.getElementById('pending-items').innerHTML = html;
    } catch (error) {
        console.error('Pending error:', error);
    }
}

async function approveItem(type, id) {
    try {
        await fetchAPI(`/api/admin-approval/${type}/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', admin_email: 'ceo@example.com' })
        });
        alert('✅ Approved!');
        loadPendingApprovals();
        loadDashboard();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function rejectItem(type, id) {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
        await fetchAPI(`/api/admin-approval/${type}/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected', rejection_reason: reason, admin_email: 'ceo@example.com' })
        });
        alert('❌ Rejected');
        loadPendingApprovals();
        loadDashboard();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadRestaurants() {
    try {
        const response = await fetchAPI('/admin/restaurants');
        allRestaurants = response.restaurants || [];

        document.getElementById('restaurants-total').textContent = allRestaurants.length;

        renderRestaurantsPage();
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('restaurants-table').innerHTML =
            '<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load restaurants</td></tr>';
    }
}

async function loadHotels() {
    try {
        const response = await fetchAPI('/admin/hotels');
        allHotels = response.hotels || [];

        document.getElementById('hotels-total').textContent = allHotels.length;

        renderHotelsPage();
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('hotels-table').innerHTML =
            '<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load hotels</td></tr>';
    }
}

async function loadAttractions() {
    try {
        const response = await fetchAPI('/admin/attractions');
        allAttractions = response.attractions || [];

        document.getElementById('attractions-total').textContent = allAttractions.length;

        renderAttractionsPage();
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('attractions-table').innerHTML =
            '<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 2rem;">Failed to load attractions</td></tr>';
    }
}

let _allReviews = [];
let _reviewsPage = 1;
const REVIEWS_PER_PAGE = 15;

async function loadReviews() {
    try {
        document.getElementById('reviews-container').innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading reviews…</p></div>';
        const reviews = await fetchAPI('/admin/reviews');
        _allReviews = reviews || [];
        updateReviewsStats(_allReviews);
        _reviewsPage = 1;
        filterReviews();
    } catch (error) {
        document.getElementById('reviews-container').innerHTML = '<p style="color:#ef4444;text-align:center;padding:2rem;">Failed to load reviews</p>';
        console.error('Load error:', error);
    }
}

function updateReviewsStats(reviews) {
    document.getElementById('rv-total').textContent = reviews.length;
    const types = { restaurant: 0, hotel: 0, attraction: 0, agency: 0 };
    reviews.forEach(r => { const t = (r.type || '').toLowerCase(); if (types[t] !== undefined) types[t]++; });
    document.getElementById('rv-restaurant').textContent = types.restaurant;
    document.getElementById('rv-hotel').textContent = types.hotel;
    document.getElementById('rv-attraction').textContent = types.attraction;
    document.getElementById('rv-agency').textContent = types.agency;
}

function filterReviews() {
    const search = (document.getElementById('reviews-search')?.value || '').toLowerCase();
    const type = document.getElementById('reviews-type-filter')?.value || '';
    const rating = document.getElementById('reviews-rating-filter')?.value || '';
    const dateFrom = document.getElementById('reviews-date-from')?.value;
    const dateTo = document.getElementById('reviews-date-to')?.value;

    let filtered = _allReviews.filter(r => {
        if (type && (r.type || '').toLowerCase() !== type) return false;
        if (rating && String(r.rating) !== rating) return false;
        if (search) {
            const haystack = `${r.place_name} ${r.reviewer_name} ${r.comment}`.toLowerCase();
            if (!haystack.includes(search)) return false;
        }
        if (dateFrom && r.created_at) { if (new Date(r.created_at) < new Date(dateFrom)) return false; }
        if (dateTo && r.created_at) { if (new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false; }
        return true;
    });

    _reviewsPage = 1;
    renderReviews(filtered);

    const summary = document.getElementById('reviews-filter-summary');
    if (filtered.length !== _allReviews.length) {
        summary.textContent = `Showing ${filtered.length} of ${_allReviews.length} reviews`;
        summary.style.display = 'block';
    } else {
        summary.style.display = 'none';
    }
}

function renderReviews(filtered) {
    const start = (_reviewsPage - 1) * REVIEWS_PER_PAGE;
    const page = filtered.slice(start, start + REVIEWS_PER_PAGE);

    const typeEmoji = { restaurant: '🍽️', hotel: '🏨', attraction: '🏛️', agency: '🗺️' };
    const typeColor = { restaurant: '#f59e0b', hotel: '#10b981', attraction: '#3b82f6', agency: '#8b5cf6' };

    if (!filtered.length) {
        document.getElementById('reviews-container').innerHTML = '<div class="empty-state"><div style="font-size:2.5rem;margin-bottom:0.75rem;">💬</div><p>No reviews match the current filters.</p></div>';
        document.getElementById('reviews-pagination').innerHTML = '';
        return;
    }

    const html = page.map(r => {
        const t = (r.type || '').toLowerCase();
        const stars = '⭐'.repeat(Math.min(5, Math.max(1, r.rating || 0)));
        const emptyStars = '☆'.repeat(5 - Math.min(5, Math.max(1, r.rating || 0)));
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        return `
        <div class="review-card">
            <div class="review-card-left">
                <div class="review-type-badge" style="background:${(typeColor[t] || '#6366f1')}15;color:${typeColor[t] || '#6366f1'};border:1px solid ${typeColor[t] || '#6366f1'}40;">
                    ${typeEmoji[t] || '📍'} ${r.type || 'Other'}
                </div>
                <div class="review-place">${r.place_name || '—'}</div>
                <div class="review-reviewer">by <strong>${r.reviewer_name || 'Anonymous'}</strong></div>
                ${date ? `<div class="review-date">${date}</div>` : ''}
            </div>
            <div class="review-card-center">
                <div class="review-stars">${stars}<span style="color:#d1d5db">${emptyStars}</span> <span style="font-size:0.78rem;color:#6b7280;margin-left:0.25rem;">${r.rating}/5</span></div>
                <p class="review-comment">${r.comment || '<em style="color:#94a3b8">No comment</em>'}</p>
            </div>
            <div class="review-card-right">
                <button class="btn-danger btn-small" onclick="deleteReview('${r.type}', ${r.id})" title="Delete review">🗑️</button>
            </div>
        </div>`;
    }).join('');

    document.getElementById('reviews-container').innerHTML = html;

    // Pagination
    const totalPages = Math.ceil(filtered.length / REVIEWS_PER_PAGE);
    if (totalPages > 1) {
        let pag = `<div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-top:1px solid #f3f4f6;">
            <span style="color:#6b7280;font-size:0.875rem;">Showing ${start + 1}–${Math.min(start + REVIEWS_PER_PAGE, filtered.length)} of ${filtered.length}</span>
            <div style="display:flex;gap:0.4rem;">
                <button class="btn-secondary" onclick="_reviewsPage=${_reviewsPage - 1};filterReviews()" ${_reviewsPage === 1 ? 'disabled' : ''}>← Prev</button>`;
        for (let i = 1; i <= Math.min(totalPages, 7); i++) {
            pag += `<button class="btn-secondary" style="${i === _reviewsPage ? 'background:#6366f1;color:white;' : ''}" onclick="_reviewsPage=${i};filterReviews()">${i}</button>`;
        }
        pag += `<button class="btn-secondary" onclick="_reviewsPage=${_reviewsPage + 1};filterReviews()" ${_reviewsPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div></div>`;
        document.getElementById('reviews-pagination').innerHTML = pag;
    } else {
        document.getElementById('reviews-pagination').innerHTML = `<div style="padding:0.75rem 1.5rem;color:#6b7280;font-size:0.875rem;border-top:1px solid #f3f4f6;">${filtered.length} review${filtered.length !== 1 ? 's' : ''}</div>`;
    }
}

function clearReviewFilters() {
    document.getElementById('reviews-search').value = '';
    document.getElementById('reviews-type-filter').value = '';
    document.getElementById('reviews-rating-filter').value = '';
    document.getElementById('reviews-date-from').value = '';
    document.getElementById('reviews-date-to').value = '';
    filterReviews();
}

let _allLikes = [];

async function loadLikes() {
    try {
        document.getElementById('likes-table').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#94a3b8;">Loading…</td></tr>';
        const likes = await fetchAPI('/admin/likes');
        _allLikes = likes || [];
        updateLikesStats(_allLikes);
        filterLikes();
    } catch (error) {
        document.getElementById('likes-table').innerHTML = '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#ef4444;">Failed to load</td></tr>';
        console.error('Load error:', error);
    }
}

function updateLikesStats(likes) {
    const total = likes.reduce((s, l) => s + (l.like_count || 0), 0);
    document.getElementById('lk-total').textContent = total.toLocaleString();
    const types = { restaurant: 0, hotel: 0, attraction: 0, agency: 0 };
    likes.forEach(l => { const t = (l.place_type || '').toLowerCase(); if (types[t] !== undefined) types[t] += (l.like_count || 0); });
    document.getElementById('lk-restaurant').textContent = types.restaurant.toLocaleString();
    document.getElementById('lk-hotel').textContent = types.hotel.toLocaleString();
    document.getElementById('lk-attraction').textContent = types.attraction.toLocaleString();
    document.getElementById('lk-agency').textContent = types.agency.toLocaleString();
}

function filterLikes() {
    const search = (document.getElementById('likes-search')?.value || '').toLowerCase();
    const type = document.getElementById('likes-type-filter')?.value || '';
    const sort = document.getElementById('likes-sort-filter')?.value || 'desc';
    const dateFrom = document.getElementById('likes-date-from')?.value;
    const dateTo = document.getElementById('likes-date-to')?.value;

    let filtered = _allLikes.filter(l => {
        if (type && (l.place_type || '').toLowerCase() !== type) return false;
        if (search && !(l.place_name || '').toLowerCase().includes(search)) return false;
        if (dateFrom && l.updated_at) { if (new Date(l.updated_at) < new Date(dateFrom)) return false; }
        if (dateTo && l.updated_at) { if (new Date(l.updated_at) > new Date(dateTo + 'T23:59:59')) return false; }
        return true;
    });

    if (sort === 'asc') filtered.sort((a, b) => (a.like_count || 0) - (b.like_count || 0));
    else if (sort === 'recent') filtered.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    else filtered.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));

    const typeEmoji = { restaurant: '🍽️', hotel: '🏨', attraction: '🏛️', agency: '🗺️' };
    const typeColor = { restaurant: '#f59e0b', hotel: '#10b981', attraction: '#3b82f6', agency: '#8b5cf6' };

    const html = filtered.map((l, i) => {
        const t = (l.place_type || '').toLowerCase();
        const date = l.updated_at ? new Date(l.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        const rank = sort === 'asc' ? filtered.length - i : (sort === 'desc' ? i + 1 : null);
        return `<tr>
            <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    ${rank !== null && rank <= 3 ? `<span style="font-size:1.1rem;">${['🥇', '🥈', '🥉'][rank - 1]}</span>` : (rank ? `<span style="color:#94a3b8;font-size:0.8rem;min-width:1.2rem;">#${rank}</span>` : '')}
                    <strong>${l.place_name || '—'}</strong>
                </div>
            </td>
            <td><span class="badge" style="background:${(typeColor[t] || '#6366f1')}15;color:${typeColor[t] || '#6366f1'};border:1px solid ${(typeColor[t] || '#6366f1')}30;">${typeEmoji[t] || '📍'} ${l.place_type || 'Other'}</span></td>
            <td>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div style="background:#fee2e2;border-radius:20px;padding:0.25rem 0.75rem;display:inline-flex;align-items:center;gap:0.35rem;">
                        <span style="color:#ef4444;font-size:1rem;">❤️</span>
                        <strong style="color:#991b1b;">${(l.like_count || 0).toLocaleString()}</strong>
                    </div>
                    ${l.like_count > 100 ? '<span style="font-size:0.75rem;color:#f59e0b;font-weight:600;">🔥 Hot</span>' : ''}
                </div>
            </td>
            <td style="color:#6b7280;font-size:0.875rem;">${date}</td>
        </tr>`;
    }).join('');

    document.getElementById('likes-table').innerHTML = html || '<tr><td colspan="4" style="text-align:center;padding:2rem;color:#94a3b8;">No results match the filters.</td></tr>';

    const infoEl = document.getElementById('likes-count-info');
    if (infoEl) infoEl.textContent = filtered.length !== _allLikes.length ? `Showing ${filtered.length} of ${_allLikes.length} entries` : `${filtered.length} entries`;

    const summary = document.getElementById('likes-filter-summary');
    if (filtered.length !== _allLikes.length) {
        summary.textContent = `Showing ${filtered.length} of ${_allLikes.length} places`;
        summary.style.display = 'block';
    } else { summary.style.display = 'none'; }
}

function clearLikesFilters() {
    document.getElementById('likes-search').value = '';
    document.getElementById('likes-type-filter').value = '';
    document.getElementById('likes-sort-filter').value = 'desc';
    document.getElementById('likes-date-from').value = '';
    document.getElementById('likes-date-to').value = '';
    filterLikes();
}

async function uploadImage(input, type) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById(type + '-image-preview').src = e.target.result;
        document.getElementById(type + '-image-preview-container').classList.add('active');
    };
    reader.readAsDataURL(file);

    document.getElementById(type + '-upload-progress').classList.add('active');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/admin/upload-image`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);

        document.getElementById(type + '-image-url').value = data.url;
        document.getElementById(type + '-upload-progress').textContent = '✅ Complete!';
        setTimeout(() => {
            document.getElementById(type + '-upload-progress').classList.remove('active');
        }, 2000);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
}

function initRestaurantMap() {
    if (restaurantMap) restaurantMap.remove();

    restaurantMap = L.map('restaurant-map').setView([41.3111, 69.2797], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(restaurantMap);

    restaurantMap.on('click', function (e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);

        if (restaurantMarker) restaurantMap.removeLayer(restaurantMarker);
        restaurantMarker = L.marker([lat, lng]).addTo(restaurantMap);

        document.getElementById('restaurant-lat').value = lat;
        document.getElementById('restaurant-lng').value = lng;
        document.getElementById('restaurant-coords').textContent = `${lat}, ${lng}`;
    });
}

function openCreateRestaurant() {
    document.getElementById('restaurantForm').reset();
    document.getElementById('restaurant-image-preview-container').classList.remove('active');
    document.getElementById('restaurant-coords').textContent = 'Click to set location';
    document.getElementById('restaurantModal').classList.add('active');
    setTimeout(() => initRestaurantMap(), 100);
}

function closeRestaurantModal() {
    document.getElementById('restaurantModal').classList.remove('active');
    if (restaurantMap) restaurantMap.remove();
}

async function saveRestaurant(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const restaurantId = document.getElementById('restaurant-id')?.value;
        await fetchAPI(restaurantId ? `/admin/restaurants/${restaurantId}` : '/admin/restaurants', {
            method: restaurantId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.get('name'),
                description: formData.get('description'),
                cuisine_type: formData.get('cuisine_type'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                latitude: parseFloat(formData.get('latitude')),
                longitude: parseFloat(formData.get('longitude')),
                image_url: formData.get('image_url'),
                website: formData.get('website'),
                opening_hours: formData.get('opening_hours'),
                is_partner: formData.get('is_partner') === 'on',
                rating: 0.0
            })
        });

        alert('✅ Created!');
        closeRestaurantModal();
        loadRestaurants();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteRestaurant(id) {
    event.stopPropagation(); // Prevent row click
    if (!confirm('Delete this restaurant? This cannot be undone.')) return;

    try {
        await fetchAPI(`/admin/restaurants/${id}`, { method: 'DELETE' });
        alert('✅ Restaurant deleted!');
        closeRestaurantDetails();
        loadRestaurants();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function deleteReview(type, id) {
    if (!confirm('Delete?')) return;
    try {
        await fetchAPI(`/admin/reviews/${type}/${id}`, { method: 'DELETE' });
        alert('✅ Deleted!');
        loadReviews();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function editRestaurant(id) {
    event.stopPropagation();
    const r = allRestaurants.find(x => x.id === id);
    if (!r) return;

    document.getElementById('restaurantForm').reset();
    document.getElementById('restaurant-image-preview-container').classList.remove('active');

    // Inject hidden id field if not present
    let idField = document.getElementById('restaurant-id');
    if (!idField) {
        idField = document.createElement('input');
        idField.type = 'hidden';
        idField.id = 'restaurant-id';
        idField.name = 'id';
        document.getElementById('restaurantForm').prepend(idField);
    }
    idField.value = r.id;

    document.querySelector('#restaurantForm [name="name"]').value = r.name || '';
    document.querySelector('#restaurantForm [name="description"]').value = r.description || '';
    document.querySelector('#restaurantForm [name="cuisine_type"]').value = r.cuisine_type || '';
    document.querySelector('#restaurantForm [name="phone"]').value = r.phone || '';
    document.querySelector('#restaurantForm [name="address"]').value = r.address || '';
    document.querySelector('#restaurantForm [name="website"]').value = r.website || '';
    document.querySelector('#restaurantForm [name="opening_hours"]').value = r.opening_hours || '';
    document.querySelector('#restaurantForm [name="is_partner"]').checked = !!r.is_partner;
    document.getElementById('restaurant-lat').value = r.latitude || '';
    document.getElementById('restaurant-lng').value = r.longitude || '';
    document.getElementById('restaurant-image-url').value = r.image_url || '';

    if (r.latitude && r.longitude) {
        document.getElementById('restaurant-coords').textContent = `${r.latitude}, ${r.longitude}`;
    } else {
        document.getElementById('restaurant-coords').textContent = 'Click to set location';
    }

    if (r.image_url) {
        document.getElementById('restaurant-image-preview').src = r.image_url;
        document.getElementById('restaurant-image-preview-container').classList.add('active');
    }

    document.querySelector('#restaurantModal .modal-header h2').textContent = 'Edit Restaurant';
    document.getElementById('restaurantModal').classList.add('active');
    setTimeout(() => initRestaurantMap(), 100);
}

let hotelMap, hotelMarker;
let attractionMap, attractionMarker;

// HOTEL FUNCTIONS

function openCreateHotel() {
    document.getElementById('hotelForm').reset();
    document.getElementById('hotel-id').value = '';
    document.getElementById('hotel-image-preview-container').classList.remove('active');
    document.getElementById('hotel-coords').textContent = 'Click on map to set location';
    document.getElementById('hotelModalTitle').textContent = 'Create New Hotel';
    document.getElementById('hotelModal').classList.add('active');
    setTimeout(() => initHotelMap(), 100);
}

function closeHotelModal() {
    document.getElementById('hotelModal').classList.remove('active');
    if (hotelMap) {
        hotelMap.remove();
        hotelMap = null;
        hotelMarker = null;
    }
}

function initHotelMap() {
    if (hotelMap) hotelMap.remove();

    const lat = parseFloat(document.getElementById('hotel-lat').value) || 41.3111;
    const lng = parseFloat(document.getElementById('hotel-lng').value) || 69.2797;

    hotelMap = L.map('hotel-map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(hotelMap);

    if (document.getElementById('hotel-lat').value) {
        hotelMarker = L.marker([lat, lng]).addTo(hotelMap);
    }

    hotelMap.on('click', function (e) {
        const newLat = e.latlng.lat.toFixed(6);
        const newLng = e.latlng.lng.toFixed(6);

        if (hotelMarker) hotelMap.removeLayer(hotelMarker);
        hotelMarker = L.marker([newLat, newLng]).addTo(hotelMap);

        document.getElementById('hotel-lat').value = newLat;
        document.getElementById('hotel-lng').value = newLng;
        document.getElementById('hotel-coords').textContent = `${newLat}, ${newLng}`;
    });
}

async function saveHotel(e) {
    e.preventDefault();

    const hotelId = document.getElementById('hotel-id').value;
    const data = {
        name: document.getElementById('hotel-name').value,
        type: document.getElementById('hotel-type').value,
        description: document.getElementById('hotel-description').value,
        phone: document.getElementById('hotel-phone').value,
        website: document.getElementById('hotel-website').value,
        offer: document.getElementById('hotel-offer').value,
        opening_hours: document.getElementById('hotel-hours').value,
        address: document.getElementById('hotel-address').value,
        latitude: parseFloat(document.getElementById('hotel-lat').value),
        longitude: parseFloat(document.getElementById('hotel-lng').value),
        image_url: document.getElementById('hotel-image-url').value,
        is_partner: document.getElementById('hotel-is-partner').checked
    };

    try {
        const url = hotelId ? `/admin/hotels/${hotelId}` : '/admin/hotels';
        const method = hotelId ? 'PUT' : 'POST';

        await fetchAPI(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        alert(hotelId ? '✅ Hotel updated!' : '✅ Hotel created!');
        closeHotelModal();
        loadHotels();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function uploadHotelImage(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('hotel-image-preview').src = e.target.result;
        document.getElementById('hotel-image-preview-container').classList.add('active');
    };
    reader.readAsDataURL(file);

    document.getElementById('hotel-upload-progress').classList.add('active');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/admin/upload-image`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);

        document.getElementById('hotel-image-url').value = data.url;
        document.getElementById('hotel-upload-progress').textContent = '✅ Upload complete!';
        setTimeout(() => {
            document.getElementById('hotel-upload-progress').classList.remove('active');
        }, 2000);
    } catch (error) {
        alert('Upload failed: ' + error.message);
        document.getElementById('hotel-upload-progress').classList.remove('active');
    }
}

// ATTRACTION FUNCTIONS

function openCreateAttraction() {
    document.getElementById('attractionForm').reset();
    document.getElementById('attraction-id').value = '';
    document.getElementById('attraction-image-preview-container').classList.remove('active');
    document.getElementById('attraction-coords').textContent = 'Click on map to set location';
    document.getElementById('attractionModalTitle').textContent = 'Create New Attraction';
    document.getElementById('attractionModal').classList.add('active');
    setTimeout(() => initAttractionMap(), 100);
}

function closeAttractionModal() {
    document.getElementById('attractionModal').classList.remove('active');
    if (attractionMap) {
        attractionMap.remove();
        attractionMap = null;
        attractionMarker = null;
    }
}

function initAttractionMap() {
    if (attractionMap) attractionMap.remove();

    const lat = parseFloat(document.getElementById('attraction-lat').value) || 41.3111;
    const lng = parseFloat(document.getElementById('attraction-lng').value) || 69.2797;

    attractionMap = L.map('attraction-map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(attractionMap);

    if (document.getElementById('attraction-lat').value) {
        attractionMarker = L.marker([lat, lng]).addTo(attractionMap);
    }

    attractionMap.on('click', function (e) {
        const newLat = e.latlng.lat.toFixed(6);
        const newLng = e.latlng.lng.toFixed(6);

        if (attractionMarker) attractionMap.removeLayer(attractionMarker);
        attractionMarker = L.marker([newLat, newLng]).addTo(attractionMap);

        document.getElementById('attraction-lat').value = newLat;
        document.getElementById('attraction-lng').value = newLng;
        document.getElementById('attraction-coords').textContent = `${newLat}, ${newLng}`;
    });
}

async function saveAttraction(e) {
    e.preventDefault();

    const attractionId = document.getElementById('attraction-id').value;
    const data = {
        name: document.getElementById('attraction-name').value,
        category: document.getElementById('attraction-category').value,
        description: document.getElementById('attraction-description').value,

        entry_fee: document.getElementById('attraction-price').value || null,
        duration: document.getElementById('attraction-duration').value || null,
        best_time: document.getElementById('attraction-best-time').value || null,
        opening_hours: document.getElementById('attraction-hours').value || null,
        historical_significance: document.getElementById('attraction-historical').value || null,

        address: document.getElementById('attraction-address').value,
        latitude: parseFloat(document.getElementById('attraction-lat').value),
        longitude: parseFloat(document.getElementById('attraction-lng').value),
        website: document.getElementById('attraction-website').value,
        image_url: document.getElementById('attraction-image-url').value,
        is_partner: document.getElementById('attraction-is-partner').checked
    };

    try {
        const url = attractionId ? `/admin/attractions/${attractionId}` : '/admin/attractions';
        const method = attractionId ? 'PUT' : 'POST';

        await fetchAPI(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        alert(attractionId ? '✅ Attraction updated!' : '✅ Attraction created!');
        closeAttractionModal();
        loadAttractions();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function uploadAttractionImage(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('attraction-image-preview').src = e.target.result;
        document.getElementById('attraction-image-preview-container').classList.add('active');
    };
    reader.readAsDataURL(file);

    document.getElementById('attraction-upload-progress').classList.add('active');

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/admin/upload-image`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);

        document.getElementById('attraction-image-url').value = data.url;
        document.getElementById('attraction-upload-progress').textContent = '✅ Upload complete!';
        setTimeout(() => {
            document.getElementById('attraction-upload-progress').classList.remove('active');
        }, 2000);
    } catch (error) {
        alert('Upload failed: ' + error.message);
        document.getElementById('attraction-upload-progress').classList.remove('active');
    }
}


loadDashboard();
let currentRestaurantsPage = 1;
let restaurantsPerPage = 6;
let allRestaurants = [];
let selectedRestaurant = null;

function renderRestaurantsPage() {
    const startIndex = (currentRestaurantsPage - 1) * restaurantsPerPage;
    const endIndex = startIndex + restaurantsPerPage;
    const pageRestaurants = allRestaurants.slice(startIndex, endIndex);

    if (pageRestaurants.length === 0) {
        document.getElementById('restaurants-table').innerHTML =
            '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">No restaurants found</td></tr>';
        return;
    }

    const html = pageRestaurants.map(r => `
        <tr onclick="viewRestaurantDetails(${r.id})" style="cursor: pointer;" class="restaurant-row">
            <td>${r.id}</td>
            <td><strong>${r.name}</strong></td>
            <td>${r.cuisine_type || 'N/A'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    <span style="color: #f59e0b;">★</span>
                    <span>${r.rating?.toFixed(1) || 'N/A'}</span>
                </div>
            </td>
            <td>
                <span class="badge badge-${r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}">
                    ${r.status || 'approved'}
                </span>
            </td>
            <td>
                <span class="badge ${r.is_partner ? 'badge-success' : 'badge-secondary'}">
                    ${r.is_partner ? '⭐ Yes' : 'No'}
                </span>
            </td>
            <td onclick="event.stopPropagation()">
                <button class="btn-small btn-edit" onclick="editRestaurant(${r.id})" title="Edit">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteRestaurant(${r.id})" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('restaurants-table').innerHTML = html;

    // Update pagination info
    document.getElementById('restaurants-showing').textContent =
        `${startIndex + 1}-${Math.min(endIndex, allRestaurants.length)}`;

    // Update pagination buttons
    updateRestaurantsPagination();
}

function updateRestaurantsPagination() {
    const totalPages = Math.ceil(allRestaurants.length / restaurantsPerPage);

    // Update prev/next buttons
    document.getElementById('restaurants-prev-btn').disabled = currentRestaurantsPage === 1;
    document.getElementById('restaurants-next-btn').disabled = currentRestaurantsPage === totalPages;

    // Generate page numbers
    const pageNumbersHtml = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentRestaurantsPage) {
            pageNumbersHtml.push(`
                <button class="btn-secondary" style="background: #667eea; color: white; cursor: default;">
                    ${i}
                </button>
            `);
        } else {
            pageNumbersHtml.push(`
                <button class="btn-secondary" onclick="goToRestaurantsPage(${i})">
                    ${i}
                </button>
            `);
        }
    }

    document.getElementById('restaurants-page-numbers').innerHTML = pageNumbersHtml.join('');
}

function changeRestaurantsPage(direction) {
    const totalPages = Math.ceil(allRestaurants.length / restaurantsPerPage);
    const newPage = currentRestaurantsPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentRestaurantsPage = newPage;
        renderRestaurantsPage();
        closeRestaurantDetails(); // Close details when changing page
    }
}

function goToRestaurantsPage(pageNumber) {
    currentRestaurantsPage = pageNumber;
    renderRestaurantsPage();
    closeRestaurantDetails();
}

// View restaurant details
async function viewRestaurantDetails(restaurantId) {
    try {
        const restaurant = allRestaurants.find(r => r.id === restaurantId);
        if (!restaurant) return;

        selectedRestaurant = restaurant;

        // Highlight selected row
        document.querySelectorAll('.restaurant-row').forEach(row => {
            row.style.background = '';
        });
        event.currentTarget.style.background = '#f0f9ff';

        // Show details panel
        const panel = document.getElementById('restaurant-details-panel');
        const content = document.getElementById('restaurant-details-content');

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 300px 1fr; gap: 2rem;">
                <!-- Image -->
                <div>
                    <img src="${restaurant.image_url || '/static/placeholder.jpg'}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn-create" onclick="editRestaurant(${restaurant.id})" style="width: 100%;">
                            ✏️ Edit Restaurant
                        </button>
                        <button class="btn-danger" onclick="deleteRestaurant(${restaurant.id})" style="width: 100%; padding: 0.75rem;">
                            🗑️ Delete Restaurant
                        </button>
                    </div>
                </div>
                
                <!-- Info -->
                <div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${restaurant.name}</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Cuisine Type</div>
                            <div style="font-weight: 600;">${restaurant.cuisine_type || 'Not specified'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Rating</div>
                            <div style="font-weight: 600; color: #f59e0b;">★ ${restaurant.rating?.toFixed(1) || 'N/A'} / 5.0</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Phone</div>
                            <div style="font-weight: 600;">${restaurant.phone || 'Not provided'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Status</div>
                            <div>
                                <span class="badge badge-${restaurant.status === 'approved' ? 'success' : restaurant.status === 'pending' ? 'warning' : 'danger'}">
                                    ${restaurant.status || 'approved'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Partner Status</div>
                            <div>
                                <span class="badge ${restaurant.is_partner ? 'badge-success' : 'badge-secondary'}">
                                    ${restaurant.is_partner ? '⭐ Partner' : 'Regular'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Reviews</div>
                            <div style="font-weight: 600;">${restaurant.review_count || 0} reviews</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Description</div>
                        <div style="line-height: 1.6;">${restaurant.description || 'No description provided'}</div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Address</div>
                        <div style="line-height: 1.6;">📍 ${restaurant.address || 'Not provided'}</div>
                    </div>
                    
                    ${restaurant.website ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Website</div>
                            <div><a href="${restaurant.website}" target="_blank" style="color: #667eea; text-decoration: none;">🔗 ${restaurant.website}</a></div>
                        </div>
                    ` : ''}
                    
                    ${restaurant.opening_hours ? `
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Opening Hours</div>
                            <div>🕐 ${restaurant.opening_hours}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('View details error:', error);
        alert('Failed to load restaurant details');
    }
}

function closeRestaurantDetails() {
    document.getElementById('restaurant-details-panel').style.display = 'none';
    selectedRestaurant = null;

    // Remove highlight from all rows
    document.querySelectorAll('.restaurant-row').forEach(row => {
        row.style.background = '';
    });
}

// hotels 

let currentHotelsPage = 1;
let hotelsPerPage = 6;
let allHotels = [];
let selectedHotel = null;
function renderHotelsPage() {
    const startIndex = (currentHotelsPage - 1) * hotelsPerPage;
    const endIndex = startIndex + hotelsPerPage;
    const pageHotels = allHotels.slice(startIndex, endIndex);

    if (pageHotels.length === 0) {
        document.getElementById('hotels-table').innerHTML =
            '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">No hotels found</td></tr>';
        return;
    }

    const html = pageHotels.map(h => `
        <tr onclick="viewHotelDetails(${h.id})" style="cursor: pointer;" class="hotel-row">
            <td>${h.id}</td>
            <td><strong>${h.name}</strong></td>
            <td>${h.type || 'Hotel'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    <span style="color: #f59e0b;">★</span>
                    <span>${h.rating?.toFixed(1) || 'N/A'}</span>
                </div>
            </td>
            <td>${h.rooms?.length || 0}</td>
            <td>
                <span class="badge badge-${h.status === 'approved' ? 'success' : h.status === 'pending' ? 'warning' : 'danger'}">
                    ${h.status || 'approved'}
                </span>
            </td>
            <td>
                <span class="badge ${h.is_partner ? 'badge-success' : 'badge-secondary'}">
                    ${h.is_partner ? '⭐ Yes' : 'No'}
                </span>
            </td>
            <td onclick="event.stopPropagation()">
                <button class="btn-small btn-edit" onclick="editHotel(${h.id})" title="Edit">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteHotel(${h.id})" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('hotels-table').innerHTML = html;

    // Update pagination info
    document.getElementById('hotels-showing').textContent =
        `${startIndex + 1}-${Math.min(endIndex, allHotels.length)}`;

    // Update pagination buttons
    updateHotelsPagination();
}

function updateHotelsPagination() {
    const totalPages = Math.ceil(allHotels.length / hotelsPerPage);

    document.getElementById('hotels-prev-btn').disabled = currentHotelsPage === 1;
    document.getElementById('hotels-next-btn').disabled = currentHotelsPage === totalPages;

    const pageNumbersHtml = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentHotelsPage) {
            pageNumbersHtml.push(`
                <button class="btn-secondary" style="background: #667eea; color: white; cursor: default;">
                    ${i}
                </button>
            `);
        } else {
            pageNumbersHtml.push(`
                <button class="btn-secondary" onclick="goToHotelsPage(${i})">
                    ${i}
                </button>
            `);
        }
    }

    document.getElementById('hotels-page-numbers').innerHTML = pageNumbersHtml.join('');
}

function changeHotelsPage(direction) {
    const totalPages = Math.ceil(allHotels.length / hotelsPerPage);
    const newPage = currentHotelsPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentHotelsPage = newPage;
        renderHotelsPage();
        closeHotelDetails();
    }
}

function goToHotelsPage(pageNumber) {
    currentHotelsPage = pageNumber;
    renderHotelsPage();
    closeHotelDetails();
}

// View hotel details
async function viewHotelDetails(hotelId) {
    try {
        const hotel = allHotels.find(h => h.id === hotelId);
        if (!hotel) return;

        selectedHotel = hotel;

        // Highlight selected row
        document.querySelectorAll('.hotel-row').forEach(row => {
            row.style.background = '';
        });
        event.currentTarget.style.background = '#f0f9ff';

        // Show details panel
        const panel = document.getElementById('hotel-details-panel');
        const content = document.getElementById('hotel-details-content');

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 300px 1fr; gap: 2rem;">
                <!-- Image -->
                <div>
                    <img src="${API_BASE}${hotel.image_url || '/static/placeholder.jpg'}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn-create" onclick="editHotel(${hotel.id})" style="width: 100%;">
                            ✏️ Edit Hotel
                        </button>
                        <button class="btn-danger" onclick="deleteHotel(${hotel.id})" style="width: 100%; padding: 0.75rem;">
                            🗑️ Delete Hotel
                        </button>
                    </div>
                </div>
                
                <!-- Info -->
                <div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${hotel.name}</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Hotel Type</div>
                            <div style="font-weight: 600;">${hotel.type || 'Not specified'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Rating</div>
                            <div style="font-weight: 600; color: #f59e0b;">★ ${hotel.rating?.toFixed(1) || 'N/A'} / 5.0</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Phone</div>
                            <div style="font-weight: 600;">${hotel.phone || 'Not provided'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Total Rooms</div>
                            <div style="font-weight: 600;">${hotel.rooms?.length || 0} rooms</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Status</div>
                            <div>
                                <span class="badge badge-${hotel.status === 'approved' ? 'success' : hotel.status === 'pending' ? 'warning' : 'danger'}">
                                    ${hotel.status || 'approved'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Partner Status</div>
                            <div>
                                <span class="badge ${hotel.is_partner ? 'badge-success' : 'badge-secondary'}">
                                    ${hotel.is_partner ? '⭐ Partner' : 'Regular'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Reviews</div>
                            <div style="font-weight: 600;">${hotel.review_count || 0} reviews</div>
                        </div>
                        ${hotel.offer ? `
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Special Offer</div>
                            <div style="font-weight: 600; color: #10b981;">🎁 ${hotel.offer}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Description</div>
                        <div style="line-height: 1.6;">${hotel.description || 'No description provided'}</div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Address</div>
                        <div style="line-height: 1.6;">📍 ${hotel.address || 'Not provided'}</div>
                    </div>
                    
                    ${hotel.website ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Website</div>
                            <div><a href="${hotel.website}" target="_blank" style="color: #667eea; text-decoration: none;">🔗 ${hotel.website}</a></div>
                        </div>
                    ` : ''}
                    
                    ${hotel.opening_hours ? `
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Check-in Hours</div>
                            <div>🕐 ${hotel.opening_hours}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            ${hotel.rooms && hotel.rooms.length > 0 ? `

            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid #e5e7eb;">
                <h4 style="margin-bottom: 1rem;">Rooms (${hotel.rooms.length})</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
                    ${hotel.rooms.map(room => {
            // Determine status badge
            let statusBadge = '';
            const roomStatus = room.status || 'approved'; // Default to approved if no status

            if (roomStatus === 'pending') {
                statusBadge = '<span class="badge badge-warning" style="margin-top: 0.25rem;">⏰ Pending</span>';
            } else if (roomStatus === 'approved') {
                statusBadge = '<span class="badge badge-success" style="margin-top: 0.25rem;">✅ Approved</span>';
            } else if (roomStatus === 'rejected') {
                statusBadge = '<span class="badge badge-danger" style="margin-top: 0.25rem;">❌ Rejected</span>';
            }

            return `
                <div style="background: #f9fafb; padding: 1rem; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">${room.room_type}</div>

                    <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">
                        💰 $${room.price}/night<br>
                        👥 ${room.capacity} people
                    </div>

                        ${statusBadge}
                        ${room.rejection_reason ? `
                            <div style="margin-top: 0.5rem; padding: 0.5rem; background: #fee2e2; border-radius: 6px; font-size: 0.75rem; color: #991b1b;">
                                <strong>Reason:</strong> ${room.rejection_reason}
                            </div>
                        ` : ''}
                        ${room.available !== undefined ? `
                            <div style="margin-top: 0.5rem;">
                                <span class="badge ${room.available ? 'badge-success' : 'badge-danger'}" style="font-size: 0.75rem;">
                                    ${room.available ? '✅ Available' : '❌ Not Available'}
                                </span>
                            </div>
                        ` : ''}
                </div>
                `;
        }).join('')}
            </div>
    </div>` : ''}
        `;

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('View details error:', error);
        alert('Failed to load hotel details');
    }
}

function closeHotelDetails() {
    document.getElementById('hotel-details-panel').style.display = 'none';
    selectedHotel = null;

    document.querySelectorAll('.hotel-row').forEach(row => {
        row.style.background = '';
    });
}

async function deleteHotel(id) {
    event.stopPropagation();
    if (!confirm('Delete this hotel? This cannot be undone.')) return;

    try {
        await fetchAPI(`/admin/hotels/${id}`, { method: 'DELETE' });
        alert('✅ Hotel deleted!');
        closeHotelDetails();
        loadHotels();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function editHotel(id) {
    event.stopPropagation();
    const h = allHotels.find(x => x.id === id);
    if (!h) return;

    document.getElementById('hotelForm').reset();
    document.getElementById('hotel-id').value = h.id;
    document.getElementById('hotel-name').value = h.name || '';
    document.getElementById('hotel-type').value = h.type || '';
    document.getElementById('hotel-description').value = h.description || '';
    document.getElementById('hotel-phone').value = h.phone || '';
    document.getElementById('hotel-website').value = h.website || '';
    document.getElementById('hotel-offer').value = h.offer || '';
    document.getElementById('hotel-hours').value = h.opening_hours || '';
    document.getElementById('hotel-address').value = h.address || '';
    document.getElementById('hotel-lat').value = h.latitude || '';
    document.getElementById('hotel-lng').value = h.longitude || '';
    document.getElementById('hotel-image-url').value = h.image_url || '';
    document.getElementById('hotel-is-partner').checked = !!h.is_partner;

    if (h.latitude && h.longitude) {
        document.getElementById('hotel-coords').textContent = `${h.latitude}, ${h.longitude}`;
    } else {
        document.getElementById('hotel-coords').textContent = 'Click on map to set location';
    }

    if (h.image_url) {
        document.getElementById('hotel-image-preview').src = h.image_url;
        document.getElementById('hotel-image-preview-container').classList.add('active');
    } else {
        document.getElementById('hotel-image-preview-container').classList.remove('active');
    }

    document.getElementById('hotelModalTitle').textContent = 'Edit Hotel';
    document.getElementById('hotelModal').classList.add('active');
    setTimeout(() => initHotelMap(), 150);
}

let currentAttractionsPage = 1;
let attractionsPerPage = 6;
let allAttractions = [];
let selectedAttraction = null;

function renderAttractionsPage() {
    const startIndex = (currentAttractionsPage - 1) * attractionsPerPage;
    const endIndex = startIndex + attractionsPerPage;
    const pageAttractions = allAttractions.slice(startIndex, endIndex);

    if (pageAttractions.length === 0) {
        document.getElementById('attractions-table').innerHTML =
            '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #6b7280;">No attractions found</td></tr>';
        return;
    }

    const html = pageAttractions.map(a => `
        <tr onclick="viewAttractionDetails(${a.id})" style="cursor: pointer;" class="attraction-row">
            <td>${a.id}</td>
            <td><strong>${a.name}</strong></td>
            <td>${a.category || 'N/A'}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                    <span style="color: #f59e0b;">★</span>
                    <span>${a.rating?.toFixed(1) || 'N/A'}</span>
                </div>
            </td>
            <td>${a.price ? '$' + a.price : 'Free'}</td>
            <td>
                <span class="badge badge-${a.status === 'approved' ? 'success' : a.status === 'pending' ? 'warning' : 'danger'}">
                    ${a.status || 'approved'}
                </span>
            </td>
            <td>
                <span class="badge ${a.is_partner ? 'badge-success' : 'badge-secondary'}">
                    ${a.is_partner ? '⭐ Yes' : 'No'}
                </span>
            </td>
            <td onclick="event.stopPropagation()">
                <button class="btn-small btn-edit" onclick="editAttraction(${a.id})" title="Edit">✏️</button>
                <button class="btn-small btn-danger" onclick="deleteAttraction(${a.id})" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('attractions-table').innerHTML = html;

    // Update pagination info
    document.getElementById('attractions-showing').textContent =
        `${startIndex + 1}-${Math.min(endIndex, allAttractions.length)}`;

    // Update pagination buttons
    updateAttractionsPagination();
}

function updateAttractionsPagination() {
    const totalPages = Math.ceil(allAttractions.length / attractionsPerPage);

    document.getElementById('attractions-prev-btn').disabled = currentAttractionsPage === 1;
    document.getElementById('attractions-next-btn').disabled = currentAttractionsPage === totalPages;

    const pageNumbersHtml = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentAttractionsPage) {
            pageNumbersHtml.push(`
                <button class="btn-secondary" style="background: #667eea; color: white; cursor: default;">
                    ${i}
                </button>
            `);
        } else {
            pageNumbersHtml.push(`
                <button class="btn-secondary" onclick="goToAttractionsPage(${i})">
                    ${i}
                </button>
            `);
        }
    }

    document.getElementById('attractions-page-numbers').innerHTML = pageNumbersHtml.join('');
}

function changeAttractionsPage(direction) {
    const totalPages = Math.ceil(allAttractions.length / attractionsPerPage);
    const newPage = currentAttractionsPage + direction;

    if (newPage >= 1 && newPage <= totalPages) {
        currentAttractionsPage = newPage;
        renderAttractionsPage();
        closeAttractionDetails();
    }
}

function goToAttractionsPage(pageNumber) {
    currentAttractionsPage = pageNumber;
    renderAttractionsPage();
    closeAttractionDetails();
}

// View attraction details
async function viewAttractionDetails(attractionId) {
    try {
        const attraction = allAttractions.find(a => a.id === attractionId);
        if (!attraction) return;

        selectedAttraction = attraction;

        // Highlight selected row
        document.querySelectorAll('.attraction-row').forEach(row => {
            row.style.background = '';
        });
        event.currentTarget.style.background = '#f0f9ff';

        // Show details panel
        const panel = document.getElementById('attraction-details-panel');
        const content = document.getElementById('attraction-details-content');

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 300px 1fr; gap: 2rem;">
                <!-- Image -->
                <div>
                    <img src="${API_BASE}${attraction.image_url || '/static/placeholder.jpg'}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn-create" onclick="editAttraction(${attraction.id})" style="width: 100%;">
                            ✏️ Edit Attraction
                        </button>
                        <button class="btn-create" onclick="openGalleryManager(${attraction.id})" style="width:100%;background:linear-gradient(135deg,#10b981,#059669);">
                            🖼️ Manage Photos
                        </button>
                        <button class="btn-danger" onclick="deleteAttraction(${attraction.id})" style="width: 100%; padding: 0.75rem;">
                            🗑️ Delete Attraction
                        </button>
                    </div>
                </div>
                
                <!-- Info -->
                <div>
                    <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">${attraction.name}</h3>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem;">
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Category</div>
                            <div style="font-weight: 600;">${attraction.category || 'Not specified'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Rating</div>
                            <div style="font-weight: 600; color: #f59e0b;">★ ${attraction.rating?.toFixed(1) || 'N/A'} / 5.0</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Entrance Fee</div>
                            <div style="font-weight: 600; color: #10b981;">${attraction.price ? '$' + attraction.price : 'Free Entry'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Duration</div>
                            <div style="font-weight: 600;">${attraction.duration || 'Not specified'}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Status</div>
                            <div>
                                <span class="badge badge-${attraction.status === 'approved' ? 'success' : attraction.status === 'pending' ? 'warning' : 'danger'}">
                                    ${attraction.status || 'approved'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Partner Status</div>
                            <div>
                                <span class="badge ${attraction.is_partner ? 'badge-success' : 'badge-secondary'}">
                                    ${attraction.is_partner ? '⭐ Partner' : 'Regular'}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Reviews</div>
                            <div style="font-weight: 600;">${attraction.review_count || 0} reviews</div>
                        </div>
                        <div>
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Best Time to Visit</div>
                            <div style="font-weight: 600;">${attraction.best_time || 'Anytime'}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Description</div>
                        <div style="line-height: 1.6;">${attraction.description || 'No description provided'}</div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Address</div>
                        <div style="line-height: 1.6;">📍 ${attraction.address || 'Not provided'}</div>
                    </div>
                    
                    ${attraction.website ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Website</div>
                            <div><a href="${attraction.website}" target="_blank" style="color: #667eea; text-decoration: none;">🔗 ${attraction.website}</a></div>
                        </div>
                    ` : ''}
                    
                    ${attraction.opening_hours ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Opening Hours</div>
                            <div>🕐 ${attraction.opening_hours}</div>
                        </div>
                    ` : ''}
                    
                    ${attraction.historical_significance ? `
                        <div style="margin-bottom: 1.5rem;">
                            <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem;">Historical Significance</div>
                            <div style="line-height: 1.6; background: #fef3c7; padding: 1rem; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                ${attraction.historical_significance}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (error) {
        console.error('View details error:', error);
        alert('Failed to load attraction details');
    }
}

function closeAttractionDetails() {
    document.getElementById('attraction-details-panel').style.display = 'none';
    selectedAttraction = null;

    document.querySelectorAll('.attraction-row').forEach(row => {
        row.style.background = '';
    });
}

async function deleteAttraction(id) {
    event.stopPropagation();
    if (!confirm('Delete this attraction? This cannot be undone.')) return;

    try {
        await fetchAPI(`/admin/attractions/${id}`, { method: 'DELETE' });
        alert('✅ Attraction deleted!');
        closeAttractionDetails();
        loadAttractions();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function editAttraction(id) {
    event.stopPropagation();
    const a = allAttractions.find(x => x.id === id);
    if (!a) return;

    document.getElementById('attractionForm').reset();
    document.getElementById('attraction-id').value = a.id;
    document.getElementById('attraction-name').value = a.name || '';
    document.getElementById('attraction-category').value = a.category || '';
    document.getElementById('attraction-description').value = a.description || '';
    document.getElementById('attraction-price').value = a.price || '';
    document.getElementById('attraction-duration').value = a.duration || '';
    document.getElementById('attraction-best-time').value = a.best_time || '';
    document.getElementById('attraction-hours').value = a.opening_hours || '';
    document.getElementById('attraction-historical').value = a.historical_significance || '';
    document.getElementById('attraction-address').value = a.address || '';
    document.getElementById('attraction-website').value = a.website || '';
    document.getElementById('attraction-lat').value = a.latitude || '';
    document.getElementById('attraction-lng').value = a.longitude || '';
    document.getElementById('attraction-image-url').value = a.image_url || '';
    document.getElementById('attraction-is-partner').checked = !!a.is_partner;

    if (a.latitude && a.longitude) {
        document.getElementById('attraction-coords').textContent = `${a.latitude}, ${a.longitude}`;
    } else {
        document.getElementById('attraction-coords').textContent = 'Click on map to set location';
    }

    if (a.image_url) {
        document.getElementById('attraction-image-preview').src = a.image_url;
        document.getElementById('attraction-image-preview-container').classList.add('active');
    } else {
        document.getElementById('attraction-image-preview-container').classList.remove('active');
    }

    document.getElementById('attractionModalTitle').textContent = 'Edit Attraction';
    document.getElementById('attractionModal').classList.add('active');
    setTimeout(() => initAttractionMap(), 150);
}

// ══════════════════════════════════════════════════
// TOUR AGENCIES
// ══════════════════════════════════════════════════
let currentAgenciesPage = 1;
const agenciesPerPage = 6;
let allAgencies = [];
let selectedAgency = null;
let agencyMap = null;
let agencyMarker = null;

async function loadAgencies() {
    try {
        const response = await fetchAPI('/admin/travel-agencies');
        allAgencies = response.agencies || [];
        document.getElementById('agencies-total').textContent = allAgencies.length;
        renderAgenciesPage();
    } catch (error) {
        document.getElementById('agencies-table').innerHTML =
            '<tr><td colspan="9" style="text-align:center;color:#ef4444;padding:2rem;">Failed to load agencies</td></tr>';
    }
}

function renderAgenciesPage() {
    const start = (currentAgenciesPage - 1) * agenciesPerPage;
    const end = start + agenciesPerPage;
    const page = allAgencies.slice(start, end);

    if (!page.length) {
        document.getElementById('agencies-table').innerHTML =
            '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#6b7280;">No agencies found</td></tr>';
        return;
    }

    document.getElementById('agencies-table').innerHTML = page.map(a => `
        <tr onclick="viewAgencyDetails(${a.id})" style="cursor:pointer;" class="agency-row">
            <td>${a.id}</td>
            <td>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    ${a.image_url ? `<img src="${a.image_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
                    <strong>${a.name}</strong>
                </div>
            </td>
            <td>${a.agency_type || '—'}</td>
            <td>${a.city || '—'}</td>
            <td><span style="color:#f59e0b;">★</span> ${a.rating?.toFixed ? a.rating.toFixed(1) : (a.rating || 'N/A')}</td>
            <td>${a.tours_count || 0}</td>
            <td><span class="badge ${a.is_partner ? 'badge-success' : 'badge-secondary'}">${a.is_partner ? '⭐ Yes' : 'No'}</span></td>
            <td><span class="badge ${a.status === 'approved' ? 'badge-success' : a.status === 'pending' ? 'badge-warning' : 'badge-danger'}">${a.status || 'approved'}</span></td>
            <td onclick="event.stopPropagation()">
                <button class="btn-small btn-edit"   onclick="editAgency(${a.id})">✏️</button>
                <button class="btn-small btn-danger"  onclick="deleteAgency(${a.id}, '${(a.name || '').replace(/'/g, "\\'")}')">🗑️</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('agencies-showing').textContent = `${start + 1}–${Math.min(end, allAgencies.length)}`;
    updateAgenciesPagination();
}

function updateAgenciesPagination() {
    const totalPages = Math.ceil(allAgencies.length / agenciesPerPage);
    document.getElementById('agencies-prev-btn').disabled = currentAgenciesPage === 1;
    document.getElementById('agencies-next-btn').disabled = currentAgenciesPage === totalPages;

    document.getElementById('agencies-page-numbers').innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
        .map(i => `<button class="btn-secondary" ${i === currentAgenciesPage
            ? 'style="background:#667eea;color:white;cursor:default;"'
            : `onclick="goToAgenciesPage(${i})"`}>${i}</button>`)
        .join('');
}

function changeAgenciesPage(dir) {
    const total = Math.ceil(allAgencies.length / agenciesPerPage);
    const next = currentAgenciesPage + dir;
    if (next >= 1 && next <= total) { currentAgenciesPage = next; renderAgenciesPage(); closeAgencyDetails(); }
}

function goToAgenciesPage(p) { currentAgenciesPage = p; renderAgenciesPage(); closeAgencyDetails(); }

// ── Details panel ──────────────────────────────────────────────

async function viewAgencyDetails(agencyId) {
    const a = allAgencies.find(x => x.id === agencyId);
    if (!a) return;
    selectedAgency = a;

    document.querySelectorAll('.agency-row').forEach(r => r.style.background = '');
    event.currentTarget.style.background = '#f0f9ff';

    // Load tours
    let toursHtml = '<div style="color:#6b7280;margin-top:1rem;">No tours yet.</div>';
    try {
        const tours = await fetchAPI(`/travel-agencies/${agencyId}/tours`);
        if (tours.length) {
            toursHtml = `
                <div style="margin-top:2rem;padding-top:2rem;border-top:2px solid #e5e7eb;">
                    <h4 style="margin-bottom:1rem;">Tours (${tours.length})</h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;">
                        ${tours.map(t => `
                            <div style="background:#f9fafb;padding:1rem;border-radius:8px;border:1px solid #e5e7eb;">
                                ${t.image_url ? `<img src="${API_BASE}${t.image_url}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:0.6rem;" onerror="this.style.display='none'">` : ''}
                                <div style="font-weight:600;margin-bottom:0.25rem;">${t.tour_name}</div>
                                <div style="font-size:0.8rem;color:#6b7280;margin-bottom:0.4rem;">
                                    ${t.tour_type ? `<span style="background:#e0e7ff;color:#3730a3;padding:1px 7px;border-radius:50px;">${t.tour_type}</span> ` : ''}
                                    ${t.duration_days ? `📅 ${t.duration_days}d` : ''}
                                </div>
                                <div style="font-weight:700;color:#667eea;margin-bottom:0.6rem;">
                                    ${t.price ? `${t.currency || 'USD'} ${Number(t.price).toLocaleString()}` : 'Price on request'}
                                </div>
                                <span class="badge badge-${t.status === 'approved' ? 'success' : t.status === 'pending' ? 'warning' : 'danger'}" style="margin-bottom:0.6rem;">${t.status || 'approved'}</span>
                                <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                                    ${t.status === 'pending' ? `<button onclick="approveTour(${t.id})" style="flex:1;padding:0.35rem;background:#d1fae5;color:#065f46;border:none;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600;">✅ Approve</button>` : ''}
                                    <button onclick="deleteTour(${t.id})" style="flex:1;padding:0.35rem;background:#fee2e2;color:#991b1b;border:none;border-radius:6px;font-size:0.75rem;cursor:pointer;font-weight:600;">🗑️ Delete</button>
                                </div>
                            </div>`).join('')}
                    </div>
                </div>`;
        }
    } catch (e) { }

    document.getElementById('agency-details-content').innerHTML = `
        <div style="display:grid;grid-template-columns:280px 1fr;gap:2rem;">
            <div>
                <img src="${API_BASE}${a.image_url || 'https://via.placeholder.com/280x180?text=No+Image'}"
                     style="width:100%;height:180px;object-fit:cover;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);"
                     onerror="this.src='${API_BASE}https://via.placeholder.com/280x180?text=No+Image'">
                <div style="margin-top:1rem;display:flex;flex-direction:column;gap:0.5rem;">
                    <button class="btn-create" onclick="editAgency(${a.id})" style="width:100%;">✏️ Edit Agency</button>
                    <button class="btn-danger" onclick="deleteAgency(${a.id},'${(a.name || '').replace(/'/g, "\\'")}');" style="width:100%;padding:0.75rem;">🗑️ Delete Agency</button>
                </div>
                <div style="margin-top:1rem;display:flex;flex-direction:column;gap:0.4rem;">
                    ${a.is_verified ? '<span class="badge badge-success" style="text-align:center;">✅ Verified</span>' : ''}
                    ${a.is_partner ? '<span class="badge badge-success" style="text-align:center;">⭐ Partner</span>' : ''}
                    ${a.is_featured ? '<span class="badge" style="background:#fef3c7;color:#92400e;text-align:center;">🏅 Featured</span>' : ''}
                    ${(a.latitude && a.longitude) ? `<div style="font-size:0.75rem;color:#6b7280;text-align:center;margin-top:0.3rem;">📍 ${parseFloat(a.latitude).toFixed(4)}, ${parseFloat(a.longitude).toFixed(4)}</div>` : ''}
                </div>
            </div>
            <div>
                <h3 style="font-size:1.5rem;margin-bottom:1rem;">${a.name}</h3>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem;margin-bottom:1.5rem;">
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Type</div><div style="font-weight:600;">${a.agency_type || '—'}</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Rating</div><div style="font-weight:600;color:#f59e0b;">★ ${a.rating || 'N/A'} / 5.0</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">City</div><div style="font-weight:600;">${a.city || '—'}</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Phone</div><div style="font-weight:600;">${a.phone || '—'}</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Email</div><div style="font-weight:600;">${a.email || '—'}</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Languages</div><div style="font-weight:600;">${a.languages || '—'}</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Tours</div><div style="font-weight:600;">${a.tours_count || 0} tours</div></div>
                    <div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.25rem;">Reviews</div><div style="font-weight:600;">${a.review_count || 0} reviews</div></div>
                </div>
                <div style="margin-bottom:1.5rem;">
                    <div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem;">Description</div>
                    <div style="line-height:1.6;">${a.description || '—'}</div>
                </div>
                <div style="margin-bottom:1.5rem;">
                    <div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem;">Address</div>
                    <div>📍 ${a.address || '—'}</div>
                </div>
                ${a.website ? `<div><div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem;">Website</div><div><a href="${a.website}" target="_blank" style="color:#667eea;">🔗 ${a.website}</a></div></div>` : ''}
                ${(a.specializations && a.specializations.length) ? `
                    <div style="margin-top:1rem;">
                        <div style="font-size:0.875rem;color:#6b7280;margin-bottom:0.5rem;">Specializations</div>
                        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">${a.specializations.map(s => `<span class="badge badge-secondary">${s}</span>`).join('')}</div>
                    </div>` : ''}
            </div>
        </div>
        ${toursHtml}
    `;

    document.getElementById('agency-details-panel').style.display = 'block';
    document.getElementById('agency-details-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeAgencyDetails() {
    document.getElementById('agency-details-panel').style.display = 'none';
    selectedAgency = null;
    document.querySelectorAll('.agency-row').forEach(r => r.style.background = '');
}

// ── Create / Edit modal ────────────────────────────────────────

function openCreateAgency() {
    document.getElementById('agencyForm').reset();
    document.getElementById('agency-id').value = '';
    document.getElementById('agency-image-url').value = '';
    document.getElementById('agency-lat').value = '';
    document.getElementById('agency-lng').value = '';
    document.getElementById('agency-image-preview-container').classList.remove('active');
    document.getElementById('agency-coords').textContent = 'Click on map to set location';
    document.getElementById('agencyModalTitle').textContent = 'Create New Tour Agency';
    document.getElementById('agencyModal').classList.add('active');
    setTimeout(() => initAgencyMap(), 150);
}

function closeAgencyModal() {
    document.getElementById('agencyModal').classList.remove('active');
    if (agencyMap) { agencyMap.remove(); agencyMap = null; agencyMarker = null; }
}

function initAgencyMap() {
    if (agencyMap) agencyMap.remove();

    const lat = parseFloat(document.getElementById('agency-lat').value) || 41.3111;
    const lng = parseFloat(document.getElementById('agency-lng').value) || 69.2797;

    agencyMap = L.map('agency-map').setView([lat, lng], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(agencyMap);

    // If editing and coords exist, place marker
    if (document.getElementById('agency-lat').value) {
        agencyMarker = L.marker([lat, lng]).addTo(agencyMap);
        document.getElementById('agency-coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    agencyMap.on('click', function (e) {
        const newLat = e.latlng.lat.toFixed(6);
        const newLng = e.latlng.lng.toFixed(6);
        if (agencyMarker) agencyMap.removeLayer(agencyMarker);
        agencyMarker = L.marker([newLat, newLng]).addTo(agencyMap);
        document.getElementById('agency-lat').value = newLat;
        document.getElementById('agency-lng').value = newLng;
        document.getElementById('agency-coords').textContent = `${newLat}, ${newLng}`;
    });
}

function editAgency(id) {
    event.stopPropagation();
    const a = allAgencies.find(x => x.id === id);
    if (!a) return;

    document.getElementById('agency-id').value = a.id;
    document.getElementById('agency-name').value = a.name || '';
    document.getElementById('agency-type').value = a.agency_type || '';
    document.getElementById('agency-description').value = a.description || '';
    document.getElementById('agency-city').value = a.city || '';
    document.getElementById('agency-country').value = a.country || '';
    document.getElementById('agency-address').value = a.address || '';
    document.getElementById('agency-phone').value = a.phone || '';
    document.getElementById('agency-email').value = a.email || '';
    document.getElementById('agency-website').value = a.website || '';
    document.getElementById('agency-languages').value = a.languages || '';
    document.getElementById('agency-image-url').value = a.image_url || '';
    document.getElementById('agency-lat').value = a.latitude || '';
    document.getElementById('agency-lng').value = a.longitude || '';
    document.getElementById('agency-is-partner').checked = !!a.is_partner;
    document.getElementById('agency-is-verified').checked = !!a.is_verified;

    if (a.image_url) {
        document.getElementById('agency-image-preview').src = a.image_url;
        document.getElementById('agency-image-preview-container').classList.add('active');
    } else {
        document.getElementById('agency-image-preview-container').classList.remove('active');
    }

    if (a.latitude && a.longitude) {
        document.getElementById('agency-coords').textContent = `${a.latitude}, ${a.longitude}`;
    } else {
        document.getElementById('agency-coords').textContent = 'Click on map to set location';
    }

    document.getElementById('agencyModalTitle').textContent = 'Edit Tour Agency';
    document.getElementById('agencyModal').classList.add('active');
    setTimeout(() => initAgencyMap(), 150);
}

async function saveAgency(e) {
    e.preventDefault();
    const id = document.getElementById('agency-id').value;
    const data = {
        name: document.getElementById('agency-name').value,
        agency_type: document.getElementById('agency-type').value || null,
        description: document.getElementById('agency-description').value,
        city: document.getElementById('agency-city').value || null,
        country: document.getElementById('agency-country').value || null,
        address: document.getElementById('agency-address').value || null,
        phone: document.getElementById('agency-phone').value || null,
        email: document.getElementById('agency-email').value || null,
        website: document.getElementById('agency-website').value || null,
        languages: document.getElementById('agency-languages').value || null,
        image_url: document.getElementById('agency-image-url').value || null,
        latitude: document.getElementById('agency-lat').value ? parseFloat(document.getElementById('agency-lat').value) : null,
        longitude: document.getElementById('agency-lng').value ? parseFloat(document.getElementById('agency-lng').value) : null,
        is_partner: document.getElementById('agency-is-partner').checked,
        is_verified: document.getElementById('agency-is-verified').checked,
    };
    try {
        const url = id ? `/admin/travel-agencies/${id}` : '/admin/travel-agencies';
        const method = id ? 'PUT' : 'POST';
        await fetchAPI(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        alert(id ? '✅ Agency updated!' : '✅ Agency created!');
        closeAgencyModal();
        loadAgencies();
    } catch (err) { alert('Error: ' + err.message); }
}

// ── Delete ─────────────────────────────────────────────────────

async function deleteAgency(id, name) {
    event.stopPropagation();
    if (!confirm(`Delete "${name}"?\nThis will also remove ALL their tours and reviews.`)) return;
    try {
        await fetchAPI(`/admin/travel-agencies/${id}`, { method: 'DELETE' });
        alert('✅ Agency deleted!');
        closeAgencyDetails();
        loadAgencies();
    } catch (err) { alert('Error: ' + err.message); }
}

// ── Tour actions inside details panel ─────────────────────────

async function approveTour(id) {
    try {
        await fetchAPI(`/api/admin-approval/tour/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', admin_email: 'ceo@example.com' })
        });
        alert('✅ Tour approved!');
        if (selectedAgency) viewAgencyDetails(selectedAgency.id);
    } catch (err) { alert('Error: ' + err.message); }
}

async function deleteTour(id) {
    if (!confirm('Delete this tour?')) return;
    try {
        await fetchAPI(`/admin/travel-agencies/tours/${id}`, { method: 'DELETE' });
        alert('✅ Tour deleted!');
        if (selectedAgency) viewAgencyDetails(selectedAgency.id);
    } catch (err) { alert('Error: ' + err.message); }
}

// ── Image upload — identical pattern to uploadHotelImage ──────

async function uploadAgencyImage(input) {
    const file = input.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('agency-image-preview').src = e.target.result;
        document.getElementById('agency-image-preview-container').classList.add('active');
    };
    reader.readAsDataURL(file);

    document.getElementById('agency-upload-progress').classList.add('active');
    document.getElementById('agency-upload-progress').textContent = 'Uploading...';

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/admin/upload-image`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail);

        document.getElementById('agency-image-url').value = data.url;
        document.getElementById('agency-upload-progress').textContent = '✅ Upload complete!';
        setTimeout(() => document.getElementById('agency-upload-progress').classList.remove('active'), 2000);
    } catch (err) {
        alert('Upload failed: ' + err.message);
        document.getElementById('agency-upload-progress').classList.remove('active');
    }
}

// ══════════════════════════════════════════════════
// Partner Applications — module-level (no IIFE) so
// paSetStatus() works from HTML onclick before fetch
// ══════════════════════════════════════════════════

const PA_API = 'http://localhost:8000';
let _paApps = [];
let _paStatus = 'all';

const PA_TYPE_LABELS = {
    restaurant: '🍽️ Restaurant',
    hotel: '🏨 Hotel',
    travel_agency: '🌍 Travel Agency',
    attraction: '🏛️ Attraction',
    multiple: '📦 Multiple',
};
const PA_STATUS_LABELS = {
    pending: 'Pending Email',
    email_verified: 'Awaiting Review',
    approved: 'Approved',
    rejected: 'Rejected',
};

async function loadPartnerApplications() {
    try {
        const resp = await fetch(`${PA_API}/api/partner-applications/admin/list`);
        _paApps = await resp.json();
        paUpdateCounts();
        paRender();
    } catch (e) {
        const grid = document.getElementById('paGrid');
        if (grid) grid.innerHTML =
            `<div class="pa-empty"><div class="ei">⚠️</div><p>Failed to load. Is the server running?</p></div>`;
    }
}

function paUpdateCounts() {
    const c = { all: _paApps.length, pending: 0, email_verified: 0, approved: 0, rejected: 0 };
    _paApps.forEach(a => { if (c[a.status] !== undefined) c[a.status]++; });
    Object.entries(c).forEach(([k, v]) => {
        const el = document.getElementById(`pcnt-${k}`);
        if (el) el.textContent = v;
    });
}

function paSetStatus(s, btn) {
    _paStatus = s;
    document.querySelectorAll('.pa-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    paRender();
}

function paRender() {
    const typeFilter = document.getElementById('paTypeFilter')?.value || '';
    let list = _paStatus === 'all' ? _paApps : _paApps.filter(a => a.status === _paStatus);
    if (typeFilter) list = list.filter(a => a.business_type === typeFilter);
    const grid = document.getElementById('paGrid');
    if (!grid) return;
    if (!list.length) {
        grid.innerHTML = `<div class="pa-empty"><div class="ei">📭</div><p>No applications match this filter.</p></div>`;
        return;
    }
    grid.innerHTML = list.map(paCardHtml).join('');
}

function paCardHtml(a) {
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const chips = [
        a.city ? `<span class="pa-chip">📍 ${a.city}</span>` : '',
        a.address ? `<span class="pa-chip">🏢 ${a.address}</span>` : '',
        a.plan ? `<span class="pa-chip">💳 ${a.plan} ($${a.plan_amount || 0})</span>` : '',
        a.languages ? `<span class="pa-chip">🗣️ ${a.languages}</span>` : '',
        a.years_experience ? `<span class="pa-chip">📅 ${a.years_experience} yrs</span>` : '',
        a.website ? `<span class="pa-chip"><a href="${a.website}" target="_blank">🌐 website</a></span>` : '',
    ].filter(Boolean).join('');

    const canApprove = a.status === 'email_verified';
    const canReject = ['pending', 'email_verified'].includes(a.status);

    return `
  <div class="pa-card" id="pacard-${a.id}">
    <div class="pa-head">
      <div>
        <div class="pa-biz-type">${PA_TYPE_LABELS[a.business_type] || a.business_type}</div>
        <div class="pa-name">${a.business_name}</div>
        <div class="pa-contact">
          👤 ${a.contact_name} &nbsp;·&nbsp;
          <a href="mailto:${a.email}">${a.email}</a>
          ${a.phone ? ` &nbsp;·&nbsp; 📞 ${a.phone}` : ''}
        </div>
      </div>
      <span class="pa-badge pb-${a.status}">${PA_STATUS_LABELS[a.status] || a.status}</span>
    </div>
    ${chips ? `<div class="pa-meta">${chips}</div>` : ''}
    ${a.description ? `<div class="pa-desc">${a.description}</div>` : ''}
    <div class="pa-actions">
      ${canApprove ? `<button class="pa-btn-approve" onclick="paApprove(${a.id})">✓ Approve & Send Credentials</button>` : ''}
      ${canReject ? `<button class="pa-btn-reject" onclick="paShowReject(${a.id})">✕ Reject</button>` : ''}
      ${a.status === 'approved' ? `
        <span style="font-size:.76rem;color:#64748b">✅ Credentials sent to ${a.email}</span>
        <button class="pa-btn-approve" style="background:#0891b2;" onclick="paResend(${a.id})">↺ Resend Credentials</button>` : ''}
      ${a.status === 'rejected' ? `<span style="font-size:.76rem;color:#64748b">✕ Rejection email sent${a.rejection_reason ? ' — ' + a.rejection_reason : ''}</span>` : ''}
      ${a.status === 'pending' ? `<span style="font-size:.74rem;color:#c2410c">⚠️ Waiting for email verification</span>` : ''}
      <span class="pa-date">Applied ${fmtDate(a.applied_at)}</span>
    </div>
    <div class="pa-reject-row" id="prr-${a.id}">
      <input type="text" id="prreason-${a.id}" placeholder="Reason for rejection (optional)"/>
      <button class="pa-btn-confirm" onclick="paConfirmReject(${a.id})">Confirm Reject</button>
      <button class="pa-btn-cancel" onclick="paHideReject(${a.id})">Cancel</button>
    </div>
  </div>`;
}

async function paResend(id) {
    if (!confirm('Generate a new password and resend credentials by email?')) return;
    try {
        const resp = await fetch(`${PA_API}/api/partner-applications/admin/${id}/resend-credentials`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Resend failed.');
        alert('✅ ' + data.message);
    } catch (e) { alert('❌ ' + e.message); }
}

async function paApprove(id) {
    if (!confirm('Approve this application and send login credentials by email?')) return;
    try {
        const resp = await fetch(`${PA_API}/api/partner-applications/admin/${id}/approve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Approval failed.');
        alert('✅ ' + data.message);
        loadPartnerApplications();
    } catch (e) { alert('❌ ' + e.message); }
}

function paShowReject(id) { document.getElementById(`prr-${id}`).classList.add('show'); }
function paHideReject(id) {
    document.getElementById(`prr-${id}`).classList.remove('show');
    document.getElementById(`prreason-${id}`).value = '';
}

async function paConfirmReject(id) {
    const reason = document.getElementById(`prreason-${id}`).value.trim();
    try {
        const resp = await fetch(`${PA_API}/api/partner-applications/admin/${id}/reject`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reason || null })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Rejection failed.');
        loadPartnerApplications();
    } catch (e) { alert('❌ ' + e.message); }
}

// Auto-load on page ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPartnerApplications);
} else {
    loadPartnerApplications();
}

// ── Platform Analytics ─────────────────────────────
// The analytics section embeds a Looker Studio iframe — no JS fetch needed.
// This function just ensures the section is visible; the iframe loads itself.
function loadPlatformAnalytics() {
    // Nothing to fetch — Looker Studio iframe is self-loading.
    // Errors from lookerstudio.google.com/embed/getSchema are a Google-side
    // 400 on their schema endpoint and do not affect the dashboard display.
}

function loadRealtimeStats() {
    // Placeholder — hook into your own realtime endpoint if needed.
    // Called every 30s from showSection('platform-analytics').
}



// (old IIFE removed — all partner application functions are now module-level above)

let _galleryAttractionId = null;

// Called from the Edit button in attraction details panel
// Replace your existing editAttraction() or add this alongside it

function openGalleryManager(attractionId) {
    _galleryAttractionId = attractionId;
    document.getElementById('galleryModalTitle').textContent = 'Manage Gallery Photos';
    document.getElementById('gallery-new-image-url').value = '';
    document.getElementById('gallery-caption-input').value = '';
    document.getElementById('gallery-new-preview-container').classList.remove('active');
    document.getElementById('galleryModal').classList.add('active');
    loadGalleryPhotos(attractionId);
}

function closeGalleryModal() {
    document.getElementById('galleryModal').classList.remove('active');
    _galleryAttractionId = null;
}

async function loadGalleryPhotos(attractionId) {
    const container = document.getElementById('galleryCurrentPhotos');
    container.innerHTML = '<p style="color:#9ca3af;grid-column:1/-1;">Loading…</p>';
    try {
        const res = await fetch(`${API_BASE}/attractions/${attractionId}/gallery`);
        const photos = await res.json();

        if (!photos.length) {
            container.innerHTML = '<p style="color:#9ca3af;grid-column:1/-1;">No photos yet — upload the first one below.</p>';
            return;
        }

        container.innerHTML = photos.map(p => `
            <div class="gallery-photo-card">
                <img src="${fixUrl(p.image_url)}" alt="${p.caption || ''}"
                     onerror="this.src='https://via.placeholder.com/150?text=?'">
                <button class="delete-overlay" onclick="deleteGalleryPhoto(${p.id})" title="Delete">×</button>
                ${p.caption ? `<div class="caption-badge">${p.caption}</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:#ef4444;grid-column:1/-1;">Failed to load photos.</p>';
    }
}

async function handleGalleryUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('gallery-new-preview').src = e.target.result;
        document.getElementById('gallery-new-preview-container').classList.add('active');
    };
    reader.readAsDataURL(file);

    // Upload to server
    document.getElementById('gallery-upload-progress').classList.add('active');
    document.getElementById('gallery-upload-progress').textContent = 'Uploading…';

    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/admin/upload-image`, { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail);

        document.getElementById('gallery-new-image-url').value = data.url;
        document.getElementById('gallery-upload-progress').textContent = '✅ Uploaded!';
        setTimeout(() => document.getElementById('gallery-upload-progress').classList.remove('active'), 2000);
    } catch (e) {
        alert('Upload failed: ' + e.message);
        document.getElementById('gallery-upload-progress').classList.remove('active');
    }
}

async function saveGalleryPhoto() {
    const imageUrl = document.getElementById('gallery-new-image-url').value;
    const caption = document.getElementById('gallery-caption-input').value.trim();

    if (!imageUrl) { alert('Please upload a photo first.'); return; }
    if (!_galleryAttractionId) return;

    try {
        const res = await fetch(`${API_BASE}/attractions/${_galleryAttractionId}/gallery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl, caption: caption || null })
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Failed');

        // Clear form
        document.getElementById('gallery-new-image-url').value = '';
        document.getElementById('gallery-caption-input').value = '';
        document.getElementById('gallery-new-preview-container').classList.remove('active');
        document.getElementById('gallery-upload-input').value = '';

        // Reload grid
        await loadGalleryPhotos(_galleryAttractionId);
        alert('✅ Photo added to gallery!');
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

async function deleteGalleryPhoto(photoId) {
    if (!confirm('Remove this photo from the gallery?')) return;
    try {
        const res = await fetch(`${API_BASE}/attractions/gallery/${photoId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        await loadGalleryPhotos(_galleryAttractionId);
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

function fixUrl(url) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    if (!url.startsWith('/')) url = '/static/uploads/' + url;
    return API_BASE + url;
}

// ── PARTNER MANAGEMENT ──────────────────────────────────────────
let _allPartners = [];
let _filtPartners = [];
const PARTNER_PAGE_SIZE = 15;
let _partnerPage = 0;

async function loadPartners() {
    const tbody = document.getElementById('partnersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#94a3b8;">Loading…</td></tr>';
    try {
        const data = await fetch(`${API_BASE}/api/partner-applications/admin/list?status=approved`)
            .then(r => r.json());

        _allPartners = data;

        // Compute stats
        const now = new Date();
        let active = 0, expiring = 0, expired = 0;
        data.forEach(p => {
            if (!p.plan_end_date) { active++; return; }
            const end = new Date(p.plan_end_date);
            const days = Math.ceil((end - now) / 86400000);
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
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:#ef4444;">Failed to load partners.</td></tr>`;
    }
}

function filterPartners() {
    const search = (document.getElementById('partnerSearch')?.value || '').toLowerCase();
    const statusF = document.getElementById('partnerStatusFilter')?.value || '';
    const typeF = document.getElementById('partnerTypeFilter')?.value || '';
    const now = new Date();

    _filtPartners = _allPartners.filter(p => {
        // Search
        if (search && !p.business_name?.toLowerCase().includes(search) && !p.email?.toLowerCase().includes(search)) return false;
        // Type
        if (typeF && p.business_type !== typeF) return false;
        // Status
        if (statusF) {
            const days = p.plan_end_date ? Math.ceil((new Date(p.plan_end_date) - now) / 86400000) : 999;
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

    const TYPE_LABELS = {
        restaurant: '🍽️ Restaurant',
        hotel: '🏨 Hotel',
        travel_agency: '🌍 Travel Agency',
        attraction: '🏛️ Attraction',
        multiple: '📦 Multiple',
    };

    if (!slice.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#94a3b8;">No partners found.</td></tr>';
        pagDiv.innerHTML = '';
        return;
    }

    tbody.innerHTML = slice.map(p => {
        const endDate = p.plan_end_date ? new Date(p.plan_end_date) : null;
        const days = endDate ? Math.ceil((endDate - now) / 86400000) : null;
        const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

        let daysHtml = '—';
        let statusHtml = '<span style="background:#f1f5f9;color:#64748b;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:700;">No plan</span>';

        if (days !== null) {
            if (days <= 0) {
                daysHtml = '<span style="color:#ef4444;font-weight:700;">Expired</span>';
                statusHtml = '<span style="background:#fee2e2;color:#991b1b;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:700;">❌ Expired</span>';
            } else if (days <= 7) {
                daysHtml = `<span style="color:#d97706;font-weight:700;">${days}d</span>`;
                statusHtml = '<span style="background:#fef3c7;color:#92400e;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:700;">⚠️ Expiring</span>';
            } else {
                daysHtml = `<span style="color:#10b981;font-weight:700;">${days}d</span>`;
                statusHtml = '<span style="background:#d1fae5;color:#065f46;padding:0.2rem 0.6rem;border-radius:20px;font-size:0.75rem;font-weight:700;">✅ Active</span>';
            }
        }

        const planLabel = {
            '1month': '1 Month', '3months': '3 Months', '6months': '6 Months', '1year': '1 Year'
        }[p.plan] || p.plan || '—';

        return `<tr>
            <td><div style="font-weight:700;color:#1e293b;">${p.business_name}</div><div style="font-size:0.75rem;color:#94a3b8;">#${p.id}</div></td>
            <td><span style="font-size:0.82rem;">${TYPE_LABELS[p.business_type] || p.business_type}</span></td>
            <td><a href="mailto:${p.email}" style="color:#6366f1;font-size:0.875rem;">${p.email}</a></td>
            <td><span style="font-size:0.82rem;font-weight:600;">${planLabel}</span>${p.plan_amount ? `<br><span style="font-size:0.75rem;color:#94a3b8;">$${p.plan_amount}</span>` : ''}</td>
            <td style="font-size:0.82rem;">${fmtDate(p.plan_end_date)}</td>
            <td>${daysHtml}</td>
            <td>${statusHtml}</td>
            <td>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
                    <button onclick="paResend(${p.id})"
                        style="padding:0.3rem 0.7rem;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit;">
                        ↺ Resend
                    </button>
                    <button onclick="deletePartner(${p.id},'${p.business_name.replace(/'/g, "\\'")}')"
                        style="padding:0.3rem 0.7rem;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:inherit;">
                        🗑 Delete
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    // Pagination
    if (pages <= 1) { pagDiv.innerHTML = `Showing ${total} partner${total !== 1 ? 's' : ''}`; return; }
    pagDiv.innerHTML = `
        Showing ${start + 1}–${Math.min(start + PARTNER_PAGE_SIZE, total)} of ${total} partners &nbsp;
        <button onclick="_partnerPage=Math.max(0,_partnerPage-1);renderPartnersPage()" ${_partnerPage === 0 ? 'disabled' : ''} 
            style="padding:0.3rem 0.7rem;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:white;">← Prev</button>
        &nbsp;Page ${_partnerPage + 1} of ${pages}&nbsp;
        <button onclick="_partnerPage=Math.min(pages-1,_partnerPage+1);renderPartnersPage()" ${_partnerPage >= pages - 1 ? 'disabled' : ''}
            style="padding:0.3rem 0.7rem;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;background:white;">Next →</button>`;
}

async function deletePartner(id, name) {
    if (!confirm(`⚠️ Delete partner "${name}"?\n\nThis will:\n• Delete their account\n• Remove all their data (listings, rooms, tours)\n• This CANNOT be undone.\n\nType DELETE to confirm.`)) return;
    const typed = prompt('Type DELETE to confirm:');
    if (typed !== 'DELETE') { alert('Cancelled — you must type DELETE exactly.'); return; }

    try {
        // Reject the application to mark as deleted
        const resp = await fetch(`${API_BASE}/api/partner-applications/admin/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
            body: JSON.stringify({ reason: 'Partner account deleted by admin.' })
        });
        if (!resp.ok) throw new Error((await resp.json()).detail || 'Failed');

        // Also trigger data deletion via subscription endpoint
        await fetch(`${API_BASE}/api/subscription/admin/delete-partner/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY },
        }).catch(() => { }); // best-effort

        alert(`✅ Partner "${name}" has been deleted.`);
        loadPartners();
    } catch (e) {
        alert('❌ ' + e.message);
    }
}


// ── RENEWAL REQUESTS ────────────────────────────────────────────
let _allRenewals = [];
let _renewalStatus = 'pending';

async function loadRenewals() {
    document.getElementById('renewalsGrid').innerHTML = '<div class="pa-empty"><div class="ei">⏳</div><p>Loading…</p></div>';
    try {
        const data = await fetch(`${API_BASE}/api/subscription/admin/renewals`)
            .then(r => r.json());
        _allRenewals = data;
        updateRenewalCounts();
        renderRenewals();
    } catch (e) {
        document.getElementById('renewalsGrid').innerHTML = '<div class="pa-empty"><div class="ei">⚠️</div><p>Failed to load renewals.</p></div>';
    }
}

function updateRenewalCounts() {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    _allRenewals.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
    Object.entries(counts).forEach(([k, v]) => {
        const el = document.getElementById(`rcnt-${k}`);
        if (el) el.textContent = v;
    });
}

function renewalSetStatus(s, btn) {
    _renewalStatus = s;
    document.querySelectorAll('#renewals .pa-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderRenewals();
}

function renderRenewals() {
    const list = _renewalStatus === 'all'
        ? _allRenewals
        : _allRenewals.filter(r => r.status === _renewalStatus);
    const grid = document.getElementById('renewalsGrid');

    if (!list.length) {
        grid.innerHTML = '<div class="pa-empty"><div class="ei">💳</div><p>No renewal requests in this category.</p></div>';
        return;
    }

    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const planLabel = { '1month': '1 Month', '3months': '3 Months', '6months': '6 Months', '1year': '1 Year' };
    const TYPE_LABELS = { restaurant: '🍽️', hotel: '🏨', travel_agency: '🌍', attraction: '🏛️', multiple: '📦' };

    grid.innerHTML = list.map(r => `
        <div class="pa-card" id="renewal-card-${r.id}">
            <div class="pa-head">
                <div>
                    <div class="pa-biz-type">${TYPE_LABELS[r.business_type] || ''} ${r.business_type}</div>
                    <div class="pa-name">${r.business_name}</div>
                    <div class="pa-contact">
                        <a href="mailto:${r.email}">${r.email}</a>
                    </div>
                </div>
                <span class="pa-badge pb-${r.status}" style="${r.status === 'pending' ? 'background:#fef3c7;color:#92400e;' : r.status === 'approved' ? 'background:#d1fae5;color:#065f46;' : 'background:#fee2e2;color:#991b1b;'}">
                    ${r.status === 'pending' ? '⏳ Pending' : r.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                </span>
            </div>

            <div class="pa-meta">
                <span class="pa-chip">💳 ${planLabel[r.plan] || r.plan} — $${r.plan_amount}</span>
                <span class="pa-chip">📅 Requested: ${fmtDate(r.requested_at)}</span>
                ${r.reviewed_at ? `<span class="pa-chip">✅ Reviewed: ${fmtDate(r.reviewed_at)}</span>` : ''}
            </div>

            ${r.payment_proof_url ? `
                <div style="margin:0.75rem 0;">
                    <div style="font-size:0.8rem;font-weight:700;color:#374151;margin-bottom:0.4rem;">📸 Payment Proof:</div>
                    <a href="${r.payment_proof_url}" target="_blank">
                        <img src="${r.payment_proof_url}" alt="Payment proof"
                            style="max-height:180px;max-width:100%;border-radius:10px;border:2px solid #e2e8f0;object-fit:contain;cursor:pointer;"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                        <div style="display:none;color:#6366f1;font-size:0.85rem;font-weight:600;">🔗 View payment proof</div>
                    </a>
                </div>` : `
                <div style="margin:0.75rem 0;background:#fef3c7;padding:0.6rem 0.9rem;border-radius:8px;font-size:0.82rem;color:#92400e;font-weight:600;">
                    ⚠️ No payment screenshot uploaded
                </div>`}

            ${r.rejection_reason ? `<div style="background:#fee2e2;border-radius:8px;padding:0.6rem 0.9rem;font-size:0.82rem;color:#991b1b;margin:0.5rem 0;"><strong>Rejection reason:</strong> ${r.rejection_reason}</div>` : ''}

            ${r.status === 'pending' ? `
                <div class="pa-actions">
                    <button class="pa-btn-approve" onclick="approveRenewal(${r.id})">✓ Approve & Extend Plan</button>
                    <button class="pa-btn-reject"  onclick="showRenewalReject(${r.id})">✕ Reject</button>
                </div>
                <div class="pa-reject-row" id="renewal-reject-${r.id}">
                    <input type="text" id="renewal-reason-${r.id}" placeholder="Reason for rejection (optional)">
                    <button class="pa-btn-confirm" onclick="rejectRenewal(${r.id})">Confirm Reject</button>
                    <button class="pa-btn-cancel"  onclick="hideRenewalReject(${r.id})">Cancel</button>
                </div>` : ''}
        </div>`).join('');
}

async function approveRenewal(id) {
    if (!confirm('Approve this renewal and extend the partner\'s plan?')) return;
    try {
        const resp = await fetch(`${API_BASE}/api/subscription/admin/renewals/${id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', admin_email: 'admin' })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Failed');
        alert('✅ ' + (data.message || 'Plan extended successfully!'));
        loadRenewals();
    } catch (e) { alert('❌ ' + e.message); }
}

function showRenewalReject(id) {
    document.getElementById(`renewal-reject-${id}`).classList.add('show');
}
function hideRenewalReject(id) {
    document.getElementById(`renewal-reject-${id}`).classList.remove('show');
    document.getElementById(`renewal-reason-${id}`).value = '';
}
async function rejectRenewal(id) {
    const reason = document.getElementById(`renewal-reason-${id}`).value.trim();
    try {
        const resp = await fetch(`${API_BASE}/api/subscription/admin/renewals/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected', rejection_reason: reason || null })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.detail || 'Failed');
        loadRenewals();
    } catch (e) { alert('❌ ' + e.message); }
}


// ── PARTNER APPLICATIONS — IMPROVED with Show More/Less ─────────
// Replace the existing paRender function with this one
window.paRender = function () {
    const typeFilter = document.getElementById('paTypeFilter')?.value || '';
    let list = _paStatus === 'all' ? _paApps : _paApps.filter(a => a.status === _paStatus);
    if (typeFilter) list = list.filter(a => a.business_type === typeFilter);

    const grid = document.getElementById('paGrid');

    if (!list.length) {
        grid.innerHTML = `<div class="pa-empty"><div class="ei">📭</div><p>No applications match this filter.</p></div>`;
        return;
    }

    const INITIAL_SHOW = 5;
    const showAll = grid.dataset.showAll === 'true';
    const visible = showAll ? list : list.slice(0, INITIAL_SHOW);
    const hasMore = list.length > INITIAL_SHOW;

    grid.innerHTML = visible.map(paCardHtml).join('') + (hasMore ? `
        <div style="text-align:center;margin-top:1rem;">
            ${!showAll ? `
                <button onclick="document.getElementById('paGrid').dataset.showAll='true';paRender();"
                    style="padding:0.65rem 2rem;border:2px solid #6366f1;color:#6366f1;background:white;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.9rem;transition:all 0.2s;"
                    onmouseover="this.style.background='#6366f1';this.style.color='white'"
                    onmouseout="this.style.background='white';this.style.color='#6366f1'">
                    Show all ${list.length} applications ↓
                </button>` : `
                <button onclick="document.getElementById('paGrid').dataset.showAll='false';paRender();window.scrollTo({top:document.getElementById('paGrid').offsetTop-100,behavior:'smooth'});"
                    style="padding:0.65rem 2rem;border:2px solid #e2e8f0;color:#64748b;background:white;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:0.9rem;transition:all 0.2s;"
                    onmouseover="this.style.borderColor='#6366f1';this.style.color='#6366f1'"
                    onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#64748b'">
                    Show less ↑
                </button>`}
            <span style="margin-left:1rem;font-size:0.82rem;color:#94a3b8;">
                Showing ${visible.length} of ${list.length}
            </span>
        </div>` : '');
};


// ── IMPROVED paCardHtml — shows payment proof ────────────────────
function paCardHtml(a) {
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const TYPE_LABELS = { restaurant: '🍽️ Restaurant', hotel: '🏨 Hotel', travel_agency: '🌍 Travel Agency', attraction: '🏛️ Attraction', multiple: '📦 Multiple' };
    const STATUS_LABELS = { pending: 'Pending Email', email_verified: 'Awaiting Review', approved: 'Approved', rejected: 'Rejected' };

    const chips = [
        a.city ? `<span class="pa-chip">📍 ${a.city}</span>` : '',
        a.address ? `<span class="pa-chip">🏢 ${a.address}</span>` : '',
        a.plan ? `<span class="pa-chip">💳 ${a.plan} ($${a.plan_amount || 0})</span>` : '',
        a.website ? `<span class="pa-chip"><a href="${a.website}" target="_blank">🌐 website</a></span>` : '',
    ].filter(Boolean).join('');

    const canApprove = a.status === 'email_verified';
    const canReject = ['pending', 'email_verified'].includes(a.status);

    return `
    <div class="pa-card" id="pacard-${a.id}">
        <div class="pa-head">
            <div>
                <div class="pa-biz-type">${TYPE_LABELS[a.business_type] || a.business_type}</div>
                <div class="pa-name">${a.business_name}</div>
                <div class="pa-contact">
                    👤 ${a.contact_name} &nbsp;·&nbsp;
                    <a href="mailto:${a.email}">${a.email}</a>
                    ${a.phone ? ` &nbsp;·&nbsp; 📞 ${a.phone}` : ''}
                </div>
            </div>
            <span class="pa-badge pb-${a.status}">${STATUS_LABELS[a.status] || a.status}</span>
        </div>

        ${chips ? `<div class="pa-meta">${chips}</div>` : ''}
        ${a.description ? `<div class="pa-desc">${a.description}</div>` : ''}

        ${a.payment_proof_url ? `
            <div style="margin:0.75rem 0;">
                <div style="font-size:0.8rem;font-weight:700;color:#374151;margin-bottom:0.4rem;">📸 Payment Proof:</div>
                <a href="${a.payment_proof_url}" target="_blank">
                    <img src="${a.payment_proof_url}" alt="Payment proof"
                        style="max-height:160px;max-width:100%;border-radius:10px;border:2px solid #e2e8f0;object-fit:contain;cursor:pointer;">
                </a>
            </div>` : (a.status === 'email_verified' ? `
            <div style="background:#fef3c7;padding:0.6rem 0.9rem;border-radius:8px;font-size:0.82rem;color:#92400e;font-weight:600;margin:0.5rem 0;">
                ⚠️ No payment screenshot uploaded yet
            </div>` : '')}

        <div class="pa-actions">
            ${canApprove ? `<button class="pa-btn-approve" onclick="paApprove(${a.id})">✓ Approve & Send Credentials</button>` : ''}
            ${canReject ? `<button class="pa-btn-reject"  onclick="paShowReject(${a.id})">✕ Reject</button>` : ''}
            ${a.status === 'approved' ? `
                <span style="font-size:.76rem;color:#64748b">✅ Credentials sent to ${a.email}</span>
                <button class="pa-btn-approve" style="background:#0891b2;" onclick="paResend(${a.id})">↺ Resend Credentials</button>
                <button onclick="deletePartner(${a.id},'${a.business_name.replace(/'/g, "\\'")}')"
                    style="padding:0.35rem 0.75rem;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;font-size:0.78rem;font-weight:700;cursor:pointer;font-family:inherit;">
                    🗑 Delete
                </button>` : ''}
            ${a.status === 'rejected' ? `<span style="font-size:.76rem;color:#64748b">✕ Rejected${a.rejection_reason ? ' — ' + a.rejection_reason : ''}</span>` : ''}
            ${a.status === 'pending' ? `<span style="font-size:.74rem;color:#c2410c">⚠️ Waiting for email verification</span>` : ''}
            <span class="pa-date">Applied ${fmtDate(a.applied_at)}</span>
        </div>

        <div class="pa-reject-row" id="prr-${a.id}">
            <input type="text" id="prreason-${a.id}" placeholder="Reason for rejection (optional)">
            <button class="pa-btn-confirm" onclick="paConfirmReject(${a.id})">Confirm Reject</button>
            <button class="pa-btn-cancel"  onclick="paHideReject(${a.id})">Cancel</button>
        </div>
    </div>`;
}

// ── Load renewals badge on dashboard load ──────────────────────
(async function loadRenewalBadge() {
    try {
        const data = await fetch(`${API_BASE}/api/subscription/admin/renewals?status=pending`).then(r => r.json());
        if (Array.isArray(data) && data.length > 0) {
            // Add badge to renewals nav item if possible
            document.querySelectorAll('.nav-item').forEach(el => {
                if (el.textContent.includes('Renewals')) {
                    el.innerHTML += ` <span style="background:#ef4444;color:white;border-radius:20px;padding:0.1rem 0.45rem;font-size:0.72rem;font-weight:700;">${data.length}</span>`;
                }
            });
        }
    } catch (e) { }
})();