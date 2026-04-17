const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Database Connection
const mongoURI = "mongodb+srv://vladi:890123Luigi@cluster0.n1psnh4.mongodb.net/vladiDB?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => {
    console.log("✅ Connected to MongoDB!");
    seedDB();
});

// Schemas
const Item = mongoose.model('Item', new mongoose.Schema({ name: String, category: String, price: Number, description: String, image: String }));
const User = mongoose.model('User', new mongoose.Schema({ username: { type: String, unique: true }, password: { type: String }, role: { type: String, default: 'user' } }));
const Booking = mongoose.model('Booking', new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, booking_date: String }));

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({ secret: 'vladi-secret', resave: false, saveUninitialized: true }));

// Seeding (Initial data)
async function seedDB() {
    const count = await Item.countDocuments();
    if (count === 0) {
        const mainCats = ["Wedding", "Birthday", "Celebrations", "Concert", "Conference"];
        let allItems = [];
        mainCats.forEach(cat => {
            allItems.push({ name: "Fullband Setup", category: cat, price: 15000, description: "Professional full band equipment." });
            allItems.push({ name: "Basic PA System", category: cat, price: 8000, description: "Compact PA for small events." });
        });
        await Item.insertMany(allItems);
        const adminHash = bcrypt.hashSync('admin123', 10);
        await User.findOneAndUpdate({ username: 'admin' }, { username: 'admin', password: adminHash, role: 'admin' }, { upsert: true });
    }
}

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const hash = bcrypt.hashSync(req.body.password, 10);
        const newUser = new User({ username: req.body.username, password: hash });
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Username already exists" }); }
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
        req.session.userId = user._id;
        req.session.role = user.role;
        res.json({ success: true, role: user.role, username: user.username });
    } else res.status(401).json({ error: "Invalid login" });
});

app.get('/api/items/:category', async (req, res) => {
    const items = await Item.find({ category: req.params.category });
    res.json(items);
});

app.post('/api/book', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Login required" });
    const newBooking = new Booking({ user: req.session.userId, item: req.body.item_id, booking_date: req.body.date });
    await newBooking.save();
    res.json({ success: true });
});

app.get('/api/my-bookings', async (req, res) => {
    if (!req.session.userId) return res.json([]);
    const bookings = await Booking.find({ user: req.session.userId }).populate('item');
    res.json(bookings.map(b => ({ name: b.item?.name || "N/A", price: b.item?.price || 0, booking_date: b.booking_date })));
});

// FIXED: Admin All Bookings (Ensuring ID is a string)
app.get('/api/admin/all-bookings', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Unauthorized");
    const bookings = await Booking.find().populate('user').populate('item');
    const formatted = bookings.map(b => ({
        id: b._id.toString(), // CRITICAL: Convert to string
        username: b.user ? b.user.username : "Unknown",
        name: b.item ? b.item.name : "Unknown",
        price: b.item ? b.item.price : 0,
        booking_date: b.booking_date
    }));
    res.json(formatted);
});

// FIXED: Admin Delete Endpoint
app.delete('/api/admin/booking/:id', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Unauthorized");
    const clients = await User.countDocuments({ role: 'user' });
    const bookings = await Booking.countDocuments();
    res.json({ totalClients: clients, totalBookings: bookings });
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.listen(3000, () => console.log(`🚀 Server on http://localhost:3000`));
