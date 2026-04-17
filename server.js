const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// --- CONFIGURATION ---
const mongoURI = "mongodb+srv://vladi:890123Luigi@cluster0.n1psnh4.mongodb.net/vladiDB?retryWrites=true&w=majority";

mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 30000 })
    .then(() => {
        console.log("✅ Connected to MongoDB Atlas!");
        seedDB(); 
    })
    .catch(err => console.error("❌ MongoDB Error:", err));

// --- SCHEMAS ---
const Item = mongoose.model('Item', new mongoose.Schema({
    name: String, category: String, price: Number, description: String, image: String
}));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true }, password: { type: String }, role: { type: String, default: 'user' }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    booking_date: String
}));

// --- MIDDLEWARE ---
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'vladi-audio-secret-2026',
    resave: false,
    saveUninitialized: true
}));

// --- SEEDING ---
async function seedDB() {
    const count = await Item.countDocuments();
    if (count === 0) {
        const categories = ["Wedding", "Birthday", "Celebrations", "Concert", "Conference"];
        let items = [];
        categories.forEach(cat => {
            items.push({ name: "Fullband Setup", category: cat, price: 15000, description: "Midas M32R, FOH Sync 915, Tama Drums.", image: "" });
            items.push({ name: "Basic Setup", category: cat, price: 10000, description: "Midas M32R, Sync 915, 18 LED Lights.", image: "" });
        });
        await Item.insertMany(items);
        const adminHash = bcrypt.hashSync('admin123', 10);
        await User.findOneAndUpdate({ username: 'admin' }, { username: 'admin', password: adminHash, role: 'admin' }, { upsert: true });
    }
}

// --- API ROUTES ---
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && bcrypt.compareSync(req.body.password, user.password)) {
        req.session.userId = user._id;
        req.session.role = user.role;
        res.json({ success: true, role: user.role });
    } else res.status(401).json({ error: "Invalid login" });
});

app.get('/api/items/:category', async (req, res) => {
    res.json(await Item.find({ category: req.params.category }));
});

app.post('/api/book', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Login required" });
    const booking = new Booking({ user: req.session.userId, item: req.body.item_id, booking_date: req.body.date });
    await booking.save();
    res.json({ success: true });
});

app.get('/api/admin/all-bookings', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Denied");
    const bookings = await Booking.find().populate('user').populate('item');
    res.json(bookings);
});

app.delete('/api/admin/delete-booking/:id', async (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).send("Denied");
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port: ${PORT}`));
