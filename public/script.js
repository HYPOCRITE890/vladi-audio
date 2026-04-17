let currentUser = null;

// show section
function showSection(sectionId) {
    document.querySelectorAll("section").forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("active");
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
    }
}

// UI update
function updateUI() {
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const adminBtn = document.getElementById('admin-btn');
    const myBookingsBtn = document.getElementById('my-bookings-btn');
    const userDisplay = document.getElementById('user-display');

    if (!navAuth || !navUser) return;

    if (currentUser) {
        navAuth.classList.add('hidden');
        navUser.classList.remove('hidden');

        if (userDisplay) {
            userDisplay.innerText = `Hello, ${currentUser.username} | `;
        }

        if (currentUser.role === 'admin') {
            adminBtn?.classList.remove('hidden');
            myBookingsBtn?.classList.add('hidden');
        } else {
            adminBtn?.classList.add('hidden');
            myBookingsBtn?.classList.remove('hidden');
        }
    } else {
        navAuth.classList.remove('hidden');
        navUser.classList.add('hidden');
    }
}

// LOGIN
async function handleLogin() {
    const username = document.getElementById('l-user')?.value;
    const password = document.getElementById('l-pass')?.value;

    if (!username || !password) {
        alert("Please fill in all fields.");
        return;
    }

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
    } else {
        alert(data.error || "Login failed");
    }
}

// REGISTER
async function handleRegister() {
    const username = document.getElementById('r-user')?.value;
    const password = document.getElementById('r-pass')?.value;

    if (!username || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
        alert("Registration Success! You can now login.");
        showSection('login');
    } else {
        alert(data.error || "Registration failed");
    }
}

// LOAD CATEGORY
async function loadCategory(cat) {
    const res = await fetch(`/api/items/${cat}`);
    const items = await res.json();

    const container = document.getElementById('items-container');
    const title = document.getElementById('category-title');

    if (!container || !title) return;

    title.innerText = `${cat} Options`;

    container.innerHTML = items.map(item => `
        <div class="item-card">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p style="font-size: 0.9rem; color: #ccc; min-height: 50px;">
                    ${item.description || ""}
                </p>
                <p style="color: var(--accent); font-weight: bold; font-size: 1.2rem;">
                    ₱${Number(item.price || 0).toLocaleString()}
                </p>

                <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">

                <label style="font-size: 0.8rem;">Select Event Date:</label>
                <input type="date" id="date-${item._id}">

                <button style="width: 100%; margin-top: 10px;"
                    onclick="bookItem('${item._id}')">
                    Book Now
                </button>
            </div>
        </div>
    `).join('');

    showSection('equipment-list');
}

// BOOK ITEM
async function bookItem(mongoId) {
    if (!currentUser) {
        alert("Please login first!");
        return;
    }

    const dateInput = document.getElementById(`date-${mongoId}`);
    if (!dateInput) return alert("Date input not found.");

    const date = dateInput.value;
    if (!date) return alert("Please select a date.");

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        return alert("You cannot book a past date.");
    }

    // CONFIRMATION
    if (!confirm(`Confirm booking on ${date}?`)) return;

    try {
        const res = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: mongoId, date })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            alert("Booking Successful!");
            dateInput.value = "";
        } else {
            alert(data.message || "Booking failed.");
        }

    } catch (err) {
        console.error(err);
        alert("Network error.");
    }
}

// USER BOOKINGS
async function loadUserBookings() {
    const res = await fetch('/api/my-bookings');
    const bookings = await res.json();

    const list = document.getElementById('user-booking-list');
    const totalEl = document.getElementById('user-total');

    if (!list || !totalEl) return;

    let total = 0;

    if (!bookings.length) {
        list.innerHTML = "<p>You have no bookings yet.</p>";
    } else {
        list.innerHTML = bookings.map(b => {
            total += Number(b.price || 0);

            return `
                <div class="card" style="margin-bottom:10px; padding: 15px;">
                    <strong>${b.name}</strong><br>
                    <span style="color:#ccc;">Date: ${b.booking_date}</span><br>
                    <span style="color:var(--accent);">
                        ₱${Number(b.price || 0).toLocaleString()}
                    </span>
                </div>
            `;
        }).join('');
    }

    totalEl.innerText = `Total Expense: ₱${total.toLocaleString()}`;
    showSection('my-bookings');
}

// ADMIN FUNCTIONS (unchanged but safer delete)
async function deleteBooking(id) {
    if (!confirm("Delete this booking?")) return;

    const res = await fetch(`/api/admin/delete-booking/${id}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        alert("Delete failed!");
        return;
    }

    loadAdminData();
}

// ADMIN DATA
async function loadAdminData() {
    const statsRes = await fetch('/api/admin/stats');
    const stats = await statsRes.json();

    document.getElementById('stat-clients').innerText = stats.totalClients || 0;
    document.getElementById('stat-bookings').innerText = stats.totalBookings || 0;

    const res = await fetch('/api/admin/all-bookings');
    const bookings = await res.json();

    document.getElementById('admin-body').innerHTML = bookings.map(b => `
        <tr>
            <td>${b.username}</td>
            <td contenteditable="true"
                onblur="updateBooking('${b._id}', this.innerText, 'name')">
                ${b.name}
            </td>
            <td contenteditable="true"
                onblur="updateBooking('${b._id}', this.innerText, 'booking_date')">
                ${b.booking_date}
            </td>
            <td contenteditable="true"
                onblur="updateBooking('${b._id}', this.innerText, 'price')">
                ${b.price}
            </td>
            <td>
                <button onclick="deleteBooking('${b._id}')">Delete</button>
            </td>
        </tr>
    `).join('');

    showSection('admin-panel');
}

// LOGOUT
async function logout() {
    await fetch('/api/logout');
    currentUser = null;
    updateUI();
    showSection('home');
}

// INIT
window.onload = () => showSection('home');
