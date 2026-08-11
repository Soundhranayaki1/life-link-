# 🩸 LIFE LINK – Blood Donor Management System

> **College Mini Project**  
> A full-stack web application designed to connect voluntary blood donors with patients, emergency requests, and blood bank inventories in real time.

---

## 🌟 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ORM) + In-Memory Fallback Mode
- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), JavaScript (ES6+)
- **Security & Authentication**: JWT (JSON Web Tokens), bcryptjs
- **Visual Analytics**: Chart.js

---

## 📂 Project Structure

```
life-link-blood-donor-system/
├── package.json                # Project dependencies and npm scripts
├── server.js                   # Main Express server entry point
├── .env.example                # Configuration template
├── README.md                   # Project documentation
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection & fallback handler
│   ├── models/
│   │   ├── User.js             # User & Donor schema
│   │   ├── BloodRequest.js     # Emergency request schema
│   │   └── Inventory.js        # Blood stock schema
│   ├── routes/
│   │   ├── authRoutes.js       # Auth API endpoints (/api/auth)
│   │   ├── donorRoutes.js      # Donor search API (/api/donors)
│   │   ├── requestRoutes.js    # Request management API (/api/requests)
│   │   └── inventoryRoutes.js  # Inventory & stats API (/api/inventory)
│   ├── controllers/
│   │   ├── authController.js   # Auth business logic
│   │   ├── donorController.js  # Donor lookup & availability logic
│   │   ├── requestController.js# Blood request handling
│   │   └── inventoryController.js# Stock & analytics calculation
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification middleware
│   │   └── errorHandler.js     # Centralized error handler
│   └── utils/
│       ├── compatibility.js    # Blood compatibility matrix utility
│       ├── mockStore.js        # In-memory fallback store
│       └── seed.js             # Demo database seeder
└── public/
    ├── css/
    │   └── style.css           # Custom Glassmorphism CSS Design System
    ├── js/
    │   ├── main.js             # Global state & notifications
    │   ├── auth.js             # Login/Register modal logic
    │   ├── search.js           # Live donor search & filters
    │   ├── requests.js         # Emergency blood requests feed
    │   └── dashboard.js        # Analytics charts & stock management
    ├── index.html              # Landing page & quick search
    ├── donors.html             # Donor directory page
    ├── requests.html           # Emergency blood request portal
    ├── inventory.html          # Blood stock & compatibility matrix
    └── dashboard.html          # Analytics dashboard & profile manager
```

---

## 🚀 Quick Start Guide

### 1. Installation
Ensure Node.js is installed on your system.

```bash
# Install dependencies
npm install
```

### 2. Running the Server

```bash
# Start Express Server
npm start
# or
node server.js
```
Open your browser at **`http://localhost:5000`**.

> **Note**: The application automatically connects to MongoDB if available (`mongodb://localhost:27017/lifelink`). If MongoDB is not running locally, it automatically falls back to an **In-Memory Demo Mode** with pre-populated sample donors, emergency requests, and blood inventory data so it can be evaluated instantly without any setup!

### 3. Database Seeding (Optional)
If you are running a local MongoDB server and want to populate realistic sample data:

```bash
npm run seed
```

---

## 🔑 Key Features & API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` - Create new Donor or Hospital account.
- `POST /api/auth/login` - Authenticate and obtain JWT token.
- `GET /api/auth/me` - Fetch authenticated user profile.
- `PUT /api/auth/profile` - Update donor details and last donation date.

### 🩸 Donor Management (`/api/donors`)
- `GET /api/donors` - Search donors filtered by blood type, city, search query, and availability.
- `PATCH /api/donors/availability` - Toggle donor availability status (`Available` / `Unavailable`).

### 🚨 Emergency Blood Requests (`/api/requests`)
- `POST /api/requests` - Broadcast an emergency blood request.
- `GET /api/requests` - View active requests filtered by urgency, status, and blood group.
- `POST /api/requests/:id/respond` - Offer to donate for an urgent request.

### 📊 Inventory & Analytics (`/api/inventory`)
- `GET /api/inventory` - Get blood stock levels for all 8 blood groups.
- `GET /api/inventory/stats` - Fetch system analytics and donor distribution breakdown for Chart.js.

---

## 🎨 UI/UX Features
- **Crimson & Dark Slate Aesthetics**: Modern glassmorphism UI with vibrant red accents and smooth hover transitions.
- **Theme Switcher**: Dark Mode and Light Mode toggle.
- **Direct Contact**: Instant phone call or WhatsApp share buttons for emergency donors.
- **Compatibility Guide**: Comprehensive blood group compatibility matrix reference table.
