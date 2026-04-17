const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

const mongoURI = "mongodb+srv://vladi:890123Luigi@cluster0.n1psnh4.mongodb.net/vladiDB?retryWrites=true&w=majority";

mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 30000 
})
.then(() => {
    console.log("✅ Connected to MongoDB Atlas!");
    seedDB(); 
})
.catch(err => {
    console.error("❌ Could not connect to MongoDB:", err);
});

const ItemSchema = new mongoose.Schema({
    name: String,
    category: String,
    price: Number,
    description: String,
    image: String
});
const Item = mongoose.model('Item', ItemSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'user' }
});
const User = mongoose.model('User', UserSchema);

const BookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    booking_date: String
});
const Booking = mongoose.model('Booking', BookingSchema);

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'vladi-audio-secret-2026',
    resave: false,
    saveUninitialized: true
}));

async function seedDB() {
    try {
        const count = await Item.countDocuments();
        if (count === 0) {
            console.log("🌱 Seeding database...");
            const mainCats = ["Wedding", "Birthday", "Celebrations", "Concert", "Conference"];
            let allItems = [];
            mainCats.forEach(cat => {
                allItems.push({ name: "Fullband Setup", category: cat, price: 15000, description: "Midas M32R, FOH Sync 915, Tama Drums, Amps.", image: "" });
                allItems.push({ name: "Basic Setup (100 Pax)", category: cat, price: 10000, description: "Midas M32R, Sync 915, NUQ118 Sub, 18 LED Lights.", image: "" });
                allItems.push({ name: "Small Basic PA System", category: cat, price: 8000, description: "Analog 12ch, RCF 315 (2pcs), 8 LED Lights.", image: "" });
                allItems.push({ name: "Very Small Basic", category: cat, price: 6000, description: "Analog 12ch Mixer, RCF 315 (2pcs), 4 LED Lights.", image: "" });
            });
            await Item.insertMany(allItems);
            const adminHash = bcrypt.hashSync('admin123', 10);
            await User.findOneAndUpdate(
                { username: 'admin' },
                { username: 'admin', password: adminHash, role: 'admin' },
                { upsert: true }
            );
            console.log("✨ Seed complete!");
        }
    } catch (err) { console.error("⚠️ Seed error:", err); }
}

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
    } else res.status(401).json({ error: "Invalid username or password" });
});

app.get('/api/items/:category', async (req, res) => {
    const items = await Item.find({ category: req.params.category });
    res.json(items);
});

app.post('/api/book', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Please login first" });
    const newBooking = new Booking({
        user: req.session.userId,
        item: req.body.item_id,
        booking_date: req.body.date
    });
    await newBooking.save();
    res.json({ success: true });
});

app.get('/api/my-bookings', async (req, res) => {
    if (!req.session.userId) return res.status(401).json([]);
    const bookings = await Booking.find({ user: req.session.userId }).populate('item');
    const formatted = bookings.map(b => ({
        name: b.item ? b.item.name : "Unknown Item",
        price: b.item ? b.item.price : 0,
        booking_date: b.booking_date
    }));
    res.json(formatted);
});

app.get('/api/admin/stats', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Unauthorized");
    const clients = await User.countDocuments({ role: 'user' });
    const bookings = await Booking.countDocuments();
    res.json({ totalClients: clients, totalBookings: bookings });
});

app.get('/api/admin/all-bookings', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Unauthorized");
    const bookings = await Booking.find().populate('user').populate('item');
    const formatted = bookings.map(b => ({
        id: b._id, // Ginawang id para madaling makuha sa frontend
        username: b.user ? b.user.username : "Unknown",
        name: b.item ? b.item.name : "Unknown Item",
        price: b.item ? b.item.price : 0,
        booking_date: b.booking_date
    }));
    res.json(formatted);
});

// FEATURE 1: DELETE ROUTE
app.delete('/api/admin/booking/:id', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server live on port ${PORT}`);
});
