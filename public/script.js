function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function handleRegister() {
    const user = document.getElementById('r-user').value;
    const pass = document.getElementById('r-pass').value;
    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (data.success) { alert("Registration successful! Please login."); showSection('login'); }
    else alert(data.error);
}

async function handleLogin() {
    const user = document.getElementById('l-user').value;
    const pass = document.getElementById('l-pass').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (data.success) {
        document.getElementById('nav-auth').classList.add('hidden');
        document.getElementById('nav-user').classList.remove('hidden');
        document.getElementById('user-display').innerText = "Hello, " + user;
        if (data.role === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
        showSection('home');
    } else alert(data.error);
}

async function loadCategory(cat) {
    showSection('equipment-list');
    document.getElementById('category-title').innerText = cat + " Packages";
    const res = await fetch(`/api/items/${cat}`);
    const items = await res.json();
    const container = document.getElementById('items-container');
    container.innerHTML = '';
    items.forEach(item => {
        container.innerHTML += `
            <div class="card">
                <div class="card-text">${item.name}<br>₱${item.price}</div>
                <input type="date" id="date-${item._id}" style="width:80%; margin-bottom:10px;">
                <button onclick="bookItem('${item._id}', '${item.name}')">Book Now</button>
            </div>`;
    });
}

async function bookItem(id, name) {
    const date = document.getElementById(`date-${id}`).value;
    if (!date) return alert("Select a date!");
    if (confirm(`Book ${name} for ${date}?`)) {
        const res = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: id, date: date })
        });
        if (res.ok) alert("Booking confirmed!");
    }
}

async function loadAdminData() {
    showSection('admin-panel');
    const res = await fetch('/api/admin/all-bookings');
    const bookings = await res.json();
    const body = document.getElementById('admin-body');
    body.innerHTML = '';
    bookings.forEach(b => {
        body.innerHTML += `
            <tr>
                <td>${b.username}</td><td>${b.name}</td><td>${b.booking_date}</td>
                <td><button style="background:red; color:white;" onclick="deleteBooking('${b._id}')">Delete</button></td>
            </tr>`;
    });
}

async function deleteBooking(id) {
    if (confirm("Delete this booking?")) {
        await fetch(`/api/admin/delete-booking/${id}`, { method: 'DELETE' });
        loadAdminData();
    }
}

function logout() { location.reload(); }
