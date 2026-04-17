const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// --- CONFIGURATION ---
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

// --- SCHEMAS (ERD DEFINITIONS) --- [cite: 10, 11, 12]
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

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'vladi-audio-secret-2026',
    resave: false,
    saveUninitialized: true
}));

// --- SEEDING FUNCTION ---
async function seedDB() {
    try {
        const count = await Item.countDocuments();
        if (count === 0) {
            console.log("🌱 Seeding initial equipment...");
            const mainCats = ["Wedding", "Birthday", "Celebrations", "Concert", "Conference"];
            let allItems = [];
            mainCats.forEach(cat => {
                allItems.push({ name: "Fullband Setup", category: cat, price: 15000, description: "Professional setup for large venues.", image: "" });
                allItems.push({ name: "Basic Setup", category: cat, price: 10000, description: "Compact audio for small gatherings.", image: "" });
            });
            await Item.insertMany(allItems);
            const adminHash = bcrypt.hashSync('admin123', 10);
            await User.findOneAndUpdate({ username: 'admin' }, { username: 'admin', password: adminHash, role: 'admin' }, { upsert: true });
        }
    } catch (err) { console.error("⚠️ Seeding Error:", err); }
}

// --- API ROUTES --- [cite: 6, 9]

// Register & Login
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
    } else res.status(401).json({ error: "Invalid credentials" });
});

// Client: View & Book Items
app.get('/api/items/:category', async (req, res) => {
    const items = await Item.find({ category: req.params.category });
    res.json(items);
});

app.post('/api/book', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Login required" });
    const newBooking = new Booking({
        user: req.session.userId,
        item: req.body.item_id,
        booking_date: req.body.date
    });
    await newBooking.save();
    res.json({ success: true });
});

// Admin: Management Features [cite: 6]
app.get('/api/admin/all-bookings', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Unauthorized");
    const bookings = await Booking.find().populate('user').populate('item');
    res.json(bookings.map(b => ({
        _id: b._id,
        username: b.user ? b.user.username : "Unknown",
        name: b.item ? b.item.name : "Unknown Item",
        booking_date: b.booking_date
    })));
});

app.delete('/api/admin/delete-booking/:id', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Unauthorized");
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server live on port ${PORT}`);
});
