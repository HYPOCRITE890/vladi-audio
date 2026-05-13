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

// Live password match checker
function checkPasswordMatch() {
    const pass = document.getElementById('r-pass').value;
    const confirm = document.getElementById('r-pass-confirm').value;
    const msg = document.getElementById('pass-match-msg');
    if (confirm === '') {
        msg.textContent = '';
        msg.className = 'pass-msg';
    } else if (pass === confirm) {
        msg.textContent = '✅ Passwords match!';
        msg.className = 'pass-msg pass-ok';
    } else {
        msg.textContent = '❌ Passwords do not match.';
        msg.className = 'pass-msg pass-err';
    }
}

async function handleRegister() {
    const username = document.getElementById('r-user').value;
    const password = document.getElementById('r-pass').value;
    const confirm = document.getElementById('r-pass-confirm').value;

    if (!username.trim()) return alert('Please enter a username.');
    if (!password) return alert('Please enter a password.');
    if (password.length < 6) return alert('Password must be at least 6 characters.');
    if (password !== confirm) return alert('Passwords do not match. Please re-enter.');

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (res.ok) {
        alert("Registration Success! You can now login.");
        document.getElementById('r-user').value = '';
        document.getElementById('r-pass').value = '';
        document.getElementById('r-pass-confirm').value = '';
        document.getElementById('pass-match-msg').textContent = '';
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
                <label class="field-label">⏱️ Event Time (Start):</label>
                <input type="time" id="time-start-${item._id}">
                <label class="field-label">⏱️ Event Time (End):</label>
                <input type="time" id="time-end-${item._id}">
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
    const timeStartInput = document.getElementById(`time-start-${mongoId}`);
    const timeEndInput = document.getElementById(`time-end-${mongoId}`);

    const date = dateInput.value;
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const timeStart = timeStartInput.value;
    const timeEnd = timeEndInput.value;

    if (!date) return alert("Please select a date for your event.");
    if (!phone) return alert("Please enter your contact number.");
    if (!address) return alert("Please enter the event address.");
    if (!timeStart) return alert("Please select the event start time.");
    if (!timeEnd) return alert("Please select the event end time.");
    if (timeEnd <= timeStart) return alert("End time must be after start time.");
    if (!/^\+?[\d\s\-]{7,15}$/.test(phone)) return alert("Please enter a valid phone number.");

    // Format time to 12-hour display e.g. "10:00 AM - 10:00 PM"
    function to12hr(t) {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2,'0')} ${ampm}`;
    }
    const duration = `${to12hr(timeStart)} - ${to12hr(timeEnd)}`;

    const confirmBooking = confirm(`Are you sure you want to rent "${itemName}" for ${date}?\n📞 Contact: ${phone}\n📍 Address: ${address}\n⏱️ Time: ${duration}`);
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
        timeStartInput.value = "";
        timeEndInput.value = "";
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
                        <span class="booking-meta">⏱️ Time: ${b.duration || 'N/A'}</span><br>
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


// RESET: Remove all clients and their bookings
async function resetClients() {
    const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL clients and their bookings. This cannot be undone. Are you sure?');
    if (!confirmed) return;

    const doubleCheck = confirm('Are you absolutely sure? All client accounts and booking records will be erased.');
    if (!doubleCheck) return;

    const res = await fetch('/api/admin/reset-clients', { method: 'DELETE' });
    if (res.ok) {
        alert('✅ All clients and their bookings have been removed.');
        loadAdminData(); // refresh the dashboard
    } else {
        alert('❌ Failed to reset clients. Please try again.');
    }
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
