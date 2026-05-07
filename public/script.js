let currentUser = null;

function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function updateUI() {
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const adminBtn = document.getElementById('admin-btn');
    const myBookingsBtn = document.getElementById('my-bookings-btn');

    if (currentUser) {
        navAuth.classList.add('hidden');
        navUser.classList.remove('hidden');
        document.getElementById('user-display').innerText = `Hello, ${currentUser.username} | `;
        if (currentUser.role === 'admin') {
            adminBtn.classList.remove('hidden');
            myBookingsBtn.classList.add('hidden');
        } else {
            adminBtn.classList.add('hidden');
            myBookingsBtn.classList.remove('hidden');
        }
    } else {
        navAuth.classList.remove('hidden');
        navUser.classList.add('hidden');
    }
}

// ✅ FIX 1: Check session on every page load — survives refresh
window.onload = async () => {
    showSection('home');
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.loggedIn) {
            currentUser = { username: data.username, role: data.role };
            updateUI();
        }
    } catch (e) {
        console.log('Session check failed:', e);
    }
};

async function handleLogin() {
    const username = document.getElementById('l-user').value;
    const password = document.getElementById('l-pass').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
        currentUser = { username: data.username, role: data.role };
        updateUI();
        showSection('home');
    } else alert(data.error);
}

async function handleRegister() {
    const username = document.getElementById('r-user').value;
    const password = document.getElementById('r-pass').value;
    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (res.ok) {
        alert("Registration Success! You can now login.");
        showSection('login');
    } else {
        const data = await res.json();
        alert(data.error);
    }
}

async function loadCategory(cat) {
    const res = await fetch(`/api/items/${cat}`);
    const items = await res.json();
    const container = document.getElementById('items-container');
    document.getElementById('category-title').innerText = `${cat} Options`;

    const today = new Date().toISOString().split('T')[0];

    container.innerHTML = items.map(item => `
        <div class="item-card">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p style="font-size: 0.9rem; color: #ccc; min-height: 50px;">${item.description}</p>
                <p style="color: var(--accent); font-weight: bold; font-size: 1.2rem;">₱${item.price.toLocaleString()}</p>
                <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
                <label class="field-label">Select Event Date:</label>
                <input type="date" id="date-${item._id}" min="${today}">
                <label class="field-label">📞 Contact Number:</label>
                <input type="tel" id="phone-${item._id}" placeholder="e.g. 09171234567" maxlength="15">
                <label class="field-label">⏱️ Event Duration:</label>
                <select id="duration-${item._id}" class="duration-select">
                    <option value="">-- Select Duration --</option>
                    <option value="2 hours">2 Hours</option>
                    <option value="4 hours">4 Hours</option>
                    <option value="6 hours">6 Hours</option>
                    <option value="8 hours">8 Hours (Full Day)</option>
                    <option value="2 days">2 Days</option>
                    <option value="3 days">3 Days</option>
                    <option value="1 week">1 Week</option>
                </select>
                <label class="field-label">📍 Event Address:</label>
                <input type="text" id="address-${item._id}" placeholder="e.g. Barangay San Jose, Imus, Cavite">
                <button style="width: 100%; margin-top: 10px;" onclick="bookItem('${item._id}', '${item.name}')">Book Now</button>
            </div>
        </div>`).join('');
    showSection('equipment-list');
}

async function bookItem(mongoId, itemName) {
    if (!currentUser) return alert("Please login first!");
    const dateInput = document.getElementById(`date-${mongoId}`);
    const phoneInput = document.getElementById(`phone-${mongoId}`);
    const addressInput = document.getElementById(`address-${mongoId}`);
    const durationInput = document.getElementById(`duration-${mongoId}`);

    const date = dateInput.value;
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const duration = durationInput.value;

    if (!date) return alert("Please select a date for your event.");
    if (!phone) return alert("Please enter your contact number.");
    if (!address) return alert("Please enter the event address.");
    if (!duration) return alert("Please select the event duration.");
    if (!/^\+?[\d\s\-]{7,15}$/.test(phone)) return alert("Please enter a valid phone number.");

    const confirmBooking = confirm(`Are you sure you want to rent "${itemName}" for ${date}?\n📞 Contact: ${phone}\n📍 Address: ${address}\n⏱️ Duration: ${duration}`);
    if (!confirmBooking) return;

    const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: mongoId, date, phone, address, duration })
    });

    if (res.ok) {
        alert("Booking Successful! Our team will contact you soon.");
        dateInput.value = "";
        phoneInput.value = "";
        addressInput.value = "";
        durationInput.value = "";
    } else {
        const data = await res.json();
        alert(data.error || "Booking failed. Please try again.");
    }
}

// ✅ FIX 2: Show status badge in My Bookings
function statusBadge(status) {
    const map = {
        pending:   { label: '⏳ Pending',   cls: 'badge-pending' },
        confirmed: { label: '✅ Confirmed',  cls: 'badge-confirmed' },
        cancelled: { label: '❌ Cancelled',  cls: 'badge-cancelled' }
    };
    const s = map[status] || map['pending'];
    return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

async function loadUserBookings() {
    const res = await fetch('/api/my-bookings');
    const bookings = await res.json();
    let total = 0;
    const list = document.getElementById('user-booking-list');

    if (bookings.length === 0) {
        list.innerHTML = "<p>You have no bookings yet.</p>";
    } else {
        list.innerHTML = bookings.map(b => {
            total += b.price;
            return `<div class="booking-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong>${b.name}</strong>
                            ${statusBadge(b.status)}
                        </div>
                        <span class="booking-meta">📅 Event Date: ${b.booking_date}</span><br>
                        <span class="booking-meta">📞 Contact: ${b.phone || 'N/A'}</span><br>
                        <span class="booking-meta">📍 Address: ${b.address || 'N/A'}</span><br>
                        <span class="booking-meta">⏱️ Duration: ${b.duration || 'N/A'}</span><br>
                        <span class="booking-price">₱${b.price.toLocaleString()}</span>
                    </div>`;
        }).join('');
    }
    document.getElementById('user-total').innerText = `Total Expense: ₱${total.toLocaleString()}`;
    showSection('my-bookings');
}

// ✅ FIX 2: Show status + dropdown for admin to change it
async function loadAdminData() {
    const sRes = await fetch('/api/admin/stats');
    const stats = await sRes.json();
    document.getElementById('stat-clients').innerText = stats.totalClients;
    document.getElementById('stat-bookings').innerText = stats.totalBookings;

    const bRes = await fetch('/api/admin/all-bookings');
    const bookings = await bRes.json();

    document.getElementById('admin-body').innerHTML = bookings.map(b => `
        <tr>
            <td>${b.username}</td>
            <td>${b.name}</td>
            <td>${b.booking_date}</td>
            <td>₱${b.price.toLocaleString()}</td>
            <td>${b.phone}</td>
            <td>${b.address}</td>
            <td>${b.duration}</td>
            <td>
                <select class="status-select" onchange="updateStatus('${b.id}', this.value)">
                    <option value="pending"   ${b.status === 'pending'   ? 'selected' : ''}>⏳ Pending</option>
                    <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
                    <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                </select>
            </td>
            <td>
                <button onclick="cancelBooking('${b.id}')" style="background:#ff4444; padding:8px 12px; font-size:0.7rem; color:white; border:none; border-radius:4px; cursor:pointer;">
                    DELETE
                </button>
            </td>
        </tr>`).join('');
    showSection('admin-panel');
}

// ✅ FIX 2: Admin updates booking status
async function updateStatus(id, status) {
    const res = await fetch(`/api/admin/booking/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (!res.ok) alert("Failed to update status.");
}

async function cancelBooking(id) {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    const res = await fetch(`/api/admin/booking/${id}`, { method: 'DELETE' });
    if (res.ok) {
        alert("Booking deleted.");
        loadAdminData();
    } else {
        alert("Error: Could not delete booking.");
    }
}

async function logout() {
    await fetch('/api/logout');
    currentUser = null;
    updateUI();
    showSection('home');
}
