# 🚀 Biometric Attendance Management System

A comprehensive web-based attendance management system using fingerprint biometric authentication for educational institutions.

## 📋 Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Biometric Integration](#biometric-integration)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🔐 Authentication & Authorization
- **Secure Teacher Registration** with unique access keys
- **JWT-based authentication** with token refresh
- **Role-based access control** (Teacher/Admin)
- **Course assignment** during registration

### 👥 Student Management
- **Student enrollment** with biometric registration
- **Bulk student import/export** (CSV/Excel)
- **Student information management** (Name, Matric No., Course)
- **Biometric template storage** and management

### 📊 Attendance System
- **Real-time fingerprint scanning** and verification
- **Live attendance monitoring** dashboard
- **Attendance link generation** for remote marking
- **Duplicate attendance prevention**
- **Attendance history tracking**

### 📈 Reports & Analytics
- **Comprehensive attendance reports** by date/student/course
- **Export functionality** (PDF, Excel, CSV)
- **Attendance statistics** and trends
- **Visual analytics** with charts and graphs
- **Customizable date range filtering**

### 🔒 Biometric Security
- **Fingerprint template encryption**
- **Hardware scanner integration**
- **Privacy-compliant biometric storage**
- **Template matching algorithms**
- **Backup and recovery procedures**

## 🛠️ Technology Stack

### Frontend
```json
{
  "React": "18.2.0",
  "TypeScript": "5.0.0",
  "Vite": "4.4.0",
  "Tailwind CSS": "3.3.0",
  "React Router": "6.14.0",
  "React Query": "4.32.0",
  "React Hook Form": "7.45.0",
  "Axios": "1.4.0",
  "Recharts": "2.8.0",
  "jsPDF": "2.5.1",
  "xlsx": "0.18.5"
}
```

### Backend
```json
{
  "Node.js": "18.x",
  "Express.js": "4.18.0",
  "TypeScript": "5.0.0",
  "Prisma": "5.1.0",
  "PostgreSQL": "15.x",
  "JWT": "9.0.0",
  "bcrypt": "5.1.0",
  "multer": "1.4.5",
  "cors": "2.8.5",
  "helmet": "7.0.0"
}
```

### Database
```
PostgreSQL 15.x
pgAdmin 4 (Database Management)
Prisma ORM (Database Schema & Migrations)
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** or **yarn** package manager
- **PostgreSQL** (v15.x or higher)
- **pgAdmin 4** (recommended for database management)
- **Git** for version control

### Hardware Requirements
- **Fingerprint scanner** (built-in laptop scanner or USB external scanner)
- **HTTPS-enabled server** (required for WebAuthn API)

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/biometric-attendance-system.git
cd biometric-attendance-system
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies
```bash
cd ../backend
npm install
```

## 🗄️ Database Setup

### 1. Create PostgreSQL Database
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE biometric_attendance;
CREATE USER attendance_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE biometric_attendance TO attendance_user;
```

### 2. Configure Database Connection
Create `.env` file in the backend directory:
```env
# Database
DATABASE_URL="postgresql://attendance_user:your_secure_password@localhost:5432/biometric_attendance"

# JWT Secret
JWT_SECRET="your_super_secret_jwt_key_here"
JWT_REFRESH_SECRET="your_super_secret_refresh_key_here"

# Server
PORT=5000
NODE_ENV=development

# Teacher Registration Key
TEACHER_REGISTRATION_KEY="TEACH2024_SECURE_KEY"

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

### 3. Run Database Migrations
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Seed Initial Data (Optional)
```bash
npx prisma db seed
```

## ⚙️ Configuration

### Frontend Configuration
Create `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
VITE_TEACHER_KEY=TEACH2024_SECURE_KEY
```

### SSL Configuration (For Biometric Features)
For fingerprint scanning to work, you need HTTPS:

#### Development (Self-signed certificate)
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### Production
Use Let's Encrypt or your preferred SSL certificate provider.

## 🏃‍♂️ Usage

### 1. Start the Backend Server
```bash
cd backend
npm run dev
```
Backend will run on: `http://localhost:5000`

### 2. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```
Frontend will run on: `http://localhost:3000`

### 3. Access the Application
Open your browser and navigate to: `https://localhost:3000`

## 👨‍🏫 Teacher Workflow

### 1. Registration
- Navigate to `/register`
- Enter teacher details and courses
- Use the provided registration key: `TEACH2024_SECURE_KEY`
- Complete registration and login

### 2. Student Enrollment
- Go to "Students" section
- Click "Add New Student"
- Fill student information (Name, Matric No., Course)
- Complete biometric enrollment (fingerprint scan)

### 3. Attendance Management
- Navigate to "Attendance" section
- View real-time attendance dashboard
- Generate attendance links for students
- Monitor attendance as students check in

### 4. Reports & Analytics
- Access "Reports" section
- Generate attendance reports by date/student/course
- Export reports as PDF or Excel
- View attendance statistics and trends

## 👨‍🎓 Student Workflow

### 1. Attendance Marking (In-Person)
- Visit teacher's workstation
- Enter matric number
- Place finger on biometric scanner
- Receive confirmation message

### 2. Attendance Marking (Remote Link)
- Access attendance link provided by teacher
- Enter matric number
- Use device fingerprint scanner (if available)
- Submit attendance

## 🔒 Biometric Integration

### Supported Devices
- **Built-in laptop fingerprint scanners**
- **USB external fingerprint scanners**
- **WebAuthn-compatible devices**

### Security Features
- **Template-based storage** (no actual fingerprint images)
- **Encrypted biometric data**
- **Privacy-compliant processing**
- **Secure template matching**

### Browser Compatibility
- Chrome 67+
- Firefox 60+
- Safari 14+
- Edge 79+

*Note: HTTPS is required for biometric features to work*

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register     # Teacher registration
POST /api/auth/login        # Teacher login
POST /api/auth/refresh      # Token refresh
POST /api/auth/logout       # Logout
```

### Student Management
```
GET    /api/students        # Get all students
POST   /api/students        # Create new student
PUT    /api/students/:id    # Update student
DELETE /api/students/:id    # Delete student
POST   /api/students/bulk   # Bulk import students
```

### Attendance Management
```
GET  /api/attendance        # Get attendance records
POST /api/attendance        # Mark attendance
GET  /api/attendance/today  # Today's attendance
GET  /api/attendance/stats  # Attendance statistics
```

### Biometric Operations
```
POST /api/biometric/enroll    # Enroll fingerprint
POST /api/biometric/verify    # Verify fingerprint
GET  /api/biometric/status    # Check enrollment status
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Review [common issues](docs/COMMON_ISSUES.md)
3. Open an issue on GitHub
4. Contact: your-email@example.com

## 🙏 Acknowledgments

- WebAuthn specification for biometric authentication
- PostgreSQL team for the robust database system
- React and Node.js communities for excellent documentation
- All contributors who helped improve this project

---

**Built with ❤️ for educational institutions**