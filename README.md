<div align="center">

# 🚌 SwiftPass

### College Bus Transport Management System

[![Made with React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

<p align="center">
  <strong>A comprehensive digital bus pass and fleet management solution for educational institutions</strong>
</p>

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Screenshots](#-screenshots) • [License](#-license)

</div>

---

## ✨ Features

### 🎓 Student Portal
- **Digital QR Bus Pass** - Unique QR code for contactless boarding
- **Wallet Management** - Recharge wallet with mock Razorpay integration
- **Real-time Bus Tracking** - Track your bus like a train with stop-by-stop updates
- **Transaction History** - View all fare deductions and recharges
- **Notifications** - Get alerts for low balance, scans, and more

### 🚗 Driver Portal
- **QR Scanner** - Scan student passes for instant fare deduction
- **GPS Trip Management** - Start/end trips with automatic location tracking
- **Student List** - View all students on your assigned route
- **Test Mode** - Simulate GPS locations for testing without traveling

### 👨‍💼 Admin Portal
- **Dashboard Analytics** - Overview of all system metrics
- **Fleet Management** - Manage buses, routes, and drivers
- **Student Management** - View/edit student accounts and balances
- **Route Stops Manager** - Configure stops with GPS coordinates
- **Transaction Reports** - Comprehensive financial reporting

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Backend** | Express.js, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Maps** | Google Maps API |
| **State** | TanStack Query |

---

## 📁 Project Structure

```
swiftpass/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── layout/     # Sidebar, navigation
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities, auth context
│   │   └── pages/          # Page components
│   │       ├── admin/      # Admin portal pages
│   │       ├── driver/     # Driver portal pages
│   │       └── student/    # Student portal pages
│   └── public/             # Static assets
├── server/                 # Express backend
│   ├── routes.ts           # API endpoints
│   └── index.ts            # Server entry point
├── shared/                 # Shared types/schemas
└── supabase-tables.sql     # Database schema
```

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- Supabase account
- Google Maps API key

### 1. Clone the repository
```bash
git clone https://github.com/Pranav7758/BUSSPASS.git
cd BUSSPASS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file with:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 4. Set up the database
Run the SQL in `supabase-tables.sql` in your Supabase SQL Editor.

### 5. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 📸 Screenshots

<div align="center">

| Student Dashboard | Driver Dashboard | Admin Dashboard |
|:-----------------:|:----------------:|:---------------:|
| Digital pass & wallet | QR scanner & trips | Analytics & management |

</div>

---

## 🔑 Key Features Explained

### GPS Auto-Tracking System
The system uses coordinates to automatically detect bus arrivals and departures:
- **Arrival Radius**: 50 meters - Bus marked "arrived" when within 50m of a stop
- **Departure Radius**: 80 meters - Bus marked "departed" when 80m away
- **Sequential Processing**: Stops are handled in order for accurate tracking

### Daily Fare System
- Students are charged once per day (2 scans max: morning + evening)
- Automatic fare deduction from wallet balance
- Low balance notifications at ₹50 threshold

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for educational institutions**

</div>
