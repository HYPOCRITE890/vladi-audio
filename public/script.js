let currentUser = null;

// Helper to switch between views
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}
// show section
function showSection(sectionId) {
    // hide all sections
    document.querySelectorAll("section").forEach(sec => {
        sec.classList.add("hidden");
        sec.classList.remove("active");
    });

    // show selected section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.remove("hidden");
        target.classList.add("active");
    }
}
// Logic to separate Client view from Admin view
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

// Auth Handlers
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

// Load Category - Updated for MongoDB _id
async function loadCategory(cat) {
    const res = await fetch(`/api/items/${cat}`);
    const items = await res.json();
    const container = document.getElementById('items-container');
    document.getElementById('category-title').innerText = `${cat} Options`;
    
    container.innerHTML = items.map(item => `
        <div class="item-card">
            <div class="item-info">
                <h3>${item.name}</h3>
                <p style="font-size: 0.9rem; color: #ccc; min-height: 50px;">${item.description}</p>
                <p style="color: var(--accent); font-weight: bold; font-size: 1.2rem;">₱${item.price.toLocaleString()}</p>
                <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
                <label style="font-size: 0.8rem; display: block; margin-bottom: 5px;">Select Event Date:</label>
                <input type="date" id="date-${item._id}">
                <button style="width: 100%; margin-top: 10px;" onclick="bookItem('${item._id}')">Book Now</button>
            </div>
        </div>`).join('');
    showSection('equipment-list');
}

// Booking Handler - Updated for MongoDB _id
async function bookItem(mongoId) {
    if (!currentUser) {
        alert("Please login first!");
        return;
    }

    if (!mongoId || typeof mongoId !== "string") {
        alert("Invalid item selected.");
        return;
    }

    const dateInput = document.getElementById(`date-${mongoId}`);

    if (!dateInput) {
        alert("Date input not found.");
        return;
    }

    const date = dateInput.value;

    if (!date) {
        alert("Please select a date for your event.");
        return;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (selectedDate < today) {
        alert("You cannot book a past date.");
        return;
    }

    // ✅ Confirmation BEFORE sending request
    const confirmBooking = confirm(`Confirm booking on ${date}?`);

    if (!confirmBooking) {
        return; // Stop if user cancels
    }

    try {
        const res = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: mongoId, date: date })
        });

        if (res.ok) {
            alert("Booking Successful! Our team will contact you soon.");
            dateInput.value = "";
        } else {
            const err = await res.json().catch(() => null);
            alert(err?.message || "Booking failed. Please try again.");
        }

    } catch (error) {
        console.error("Booking error:", error);
        alert("Network error. Please check your connection.");
    }
}

// Client View: Load My Bookings
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
            return `<div class="card" style="margin-bottom:10px; padding: 15px; text-align: left; border-left: 4px solid var(--accent);">
                        <strong>${b.name}</strong><br>
                        <span style="color: #ccc;">Event Date: ${b.booking_date}</span><br>
                        <span style="color: var(--accent);">Amount: ₱${b.price.toLocaleString()}</span>
                    </div>`;
        }).join('');
    }
    document.getElementById('user-total').innerText = `Total Expense: ₱${total.toLocaleString()}`;
    showSection('my-bookings');
}
// Add 
async function createBooking(data) {
    await fetch('/api/admin/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    loadAdminData(); // refresh
}

// Update
async function updateBooking(id, value, field) {
    await fetch(`/api/admin/update-booking/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
    });
}
//Delete
async function deleteBooking(id) {
    if (!confirm("Delete this booking?")) return;

    const res = await fetch(`/api/admin/delete-booking/${id}`, {
        method: 'DELETE'
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Delete failed:", text);
        alert("Delete failed!");
        return;
    }

    console.log("Deleted:", id);
    loadAdminData();
}
// Admin View: Load All Bookings & Stats
async function loadAdminData() {
    // READ (stats)
    const sRes = await fetch('/api/admin/stats');
    const stats = await sRes.json();
    document.getElementById('stat-clients').innerText = stats.totalClients;
    document.getElementById('stat-bookings').innerText = stats.totalBookings;

    // READ (bookings)
    const bRes = await fetch('/api/admin/all-bookings');
    const bookings = await bRes.json();

    document.getElementById('admin-body').innerHTML = bookings.map(b => `
        <tr>
            <td>${b.username}</td>
            <td contenteditable="true" onblur="updateBooking('${b._id}', this.innerText, 'name')">${b.name}</td>
            <td contenteditable="true" onblur="updateBooking('${b._id}', this.innerText, 'booking_date')">${b.booking_date}</td>
            <td contenteditable="true" onblur="updateBooking('${b._id}', this.innerText, 'price')">₱${b.price.toLocaleString()}</td>
            <td>
                <button onclick="deleteBooking('${b._id}')">Delete</button>
            </td>
        </tr>
    `).join('');

    showSection('admin-panel');
}

// Logout
async function logout() {
    await fetch('/api/logout');
    currentUser = null;
    updateUI();
    showSection('home');
}

// Default state
window.onload = () => showSection('home');

