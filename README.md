# 🎓 Bagi Raport System

Sistem manajemen antrian pembagian raport dengan fitur real-time monitoring, notifikasi WhatsApp, dan TV display. Dibangun dengan React, Node.js, dan SQLite.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19.2.0-blue)](https://reactjs.org)

---

## ✨ Fitur Utama

### 🎯 Core Features
- **Check-in System** - Pendaftaran siswa untuk mengambil raport
- **Queue Management** - Manajemen antrian per kelas dengan nomor otomatis
- **Real-time Updates** - Socket.io untuk sinkronisasi live
- **TV Display** - Tampilan antrian untuk layar TV
- **Multi-role Access** - Admin, Teacher, Guard, TV Display

### 📱 Advanced Features
- **WhatsApp Integration** - Notifikasi otomatis ke wali murid (n8n webhook)
- **Student Management** - CRUD siswa dengan validasi
- **User Management** - Manajemen user & role assignment
- **Announcements** - Pengumuman real-time di TV display
- **History & Reports** - Riwayat pembagian raport per guru
- **Responsive UI** - Mobile-friendly design

### 🔒 Security Features
- **JWT Authentication** - Token-based auth dengan expiry
- **Input Validation** - Joi schemas untuk semua endpoints
- **Rate Limiting** - Multi-tier protection (brute force, DDoS)
- **Professional Logging** - Winston logger dengan file rotation
- **CORS Protection** - Configurable origins

---

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI framework
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Lucide React** - Icon library
- **Recharts** - Charts & graphs

### Backend
- **Node.js 20** - Runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket server
- **SQLite** (better-sqlite3) - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT auth
- **Winston** - Logging
- **Joi** - Input validation
- **Express Rate Limit** - API protection

### DevOps
- **Docker** - Containerization
- **Nginx** - Reverse proxy & static serving
- **Docker Compose** - Multi-container orchestration

---

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# 1. Clone repository
git clone <repo-url>
cd bagi-raport-system

# 2. Set JWT secret
export JWT_SECRET="$(openssl rand -base64 32)"

# 3. Start with Docker
docker-compose up -d --build

# 4. Access application
# Frontend: http://localhost
# Backend: http://localhost:3001/api
```

📖 Full Docker guide: [DOCKER.md](DOCKER.md)

### Option 2: Local Development

#### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

#### Backend Setup
```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:3001
```

#### Frontend Setup
```bash
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 📁 Project Structure

```
bagi-raport-system/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── db.js              # Database initialization
│   │   ├── index.js           # Express server & Socket.io
│   │   ├── routes/            # API routes
│   │   │   ├── auth.js        # Authentication
│   │   │   ├── students.js    # Student management
│   │   │   ├── queue.js       # Queue & check-in
│   │   │   └── settings.js    # Settings & users
│   │   ├── utils/             # Utilities
│   │   │   ├── logger.js      # Winston logger
│   │   │   └── validators.js  # Joi schemas
│   │   └── middleware/        # Middleware
│   │       └── rateLimiter.js # Rate limiting
│   ├── data/                  # SQLite database
│   ├── logs/                  # Application logs
│   └── Dockerfile
│
├── src/                       # Frontend React app
│   ├── components/
│   │   ├── ui/               # UI components
│   │   └── admin/            # Admin components
│   ├── pages/
│   │   ├── admin/            # Admin pages
│   │   ├── teacher/          # Teacher pages
│   │   ├── guard/            # Guard pages
│   │   └── tv/               # TV display
│   ├── context/              # React contexts
│   ├── services/             # API services
│   └── Router.jsx
│
├── docker-compose.yml        # Docker orchestration
├── Dockerfile                # Frontend Docker image
├── nginx.conf               # Nginx configuration
└── README.md                # This file
```

---

## 👥 Default Users

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `password` | Admin | Full access |
| `satpam` | `password` | Guard | Check-in only |
| `guru` | `password` | Teacher | Class 7A |
| `guru7b` | `password` | Teacher | Class 7B |
| `guru8a` | `password` | Teacher | Class 8A |
| `tv` | `password` | TV | Display mode |

⚠️ **IMPORTANT**: Change passwords immediately after first login!

---

## 🔧 Configuration

### Environment Variables

Create `.env` file (see `.env.example`):

```env
# Backend
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key-here
DB_PATH=/app/data/raport.db
CORS_ORIGIN=http://localhost

# Optional
BACKUP_ENABLED=true
```

### WhatsApp Integration (Optional)

Configure in Admin Settings:
1. **WA API URL**: n8n webhook endpoint
2. **WA API Token**: Authentication token
3. **Templates**: Customize notification messages

---

## 📖 Usage Guide

### For Admin
1. **Login** with admin credentials
2. **Add Students** via Students menu
3. **Manage Users** and assign classes
4. **Configure Settings** (school info, WhatsApp)
5. **View Dashboard** for statistics

### For Guard (Satpam)
1. **Login** at `/login`
2. **Search Student** by name or NIS
3. **Enter phone** (optional)
4. **Click Check-in**

### For Teacher
1. **Login** and select class
2. **View Queue** for your class
3. **Call Student** (triggers WhatsApp notification)
4. **Mark as Finished** when done
5. **View History** of completed students

### For TV Display
1. **Login** with TV account
2. **Select Class** to monitor
3. Display shows:
   - Active queue numbers
   - Student being called
   - Announcements
   - Online teachers

---

## 🔐 Security Best Practices

### Production Deployment

✅ **Required**:
- Change JWT_SECRET to random string
- Update default passwords
- Configure CORS_ORIGIN to your domain
- Enable HTTPS (use reverse proxy)
- Set NODE_ENV=production

✅ **Recommended**:
- Set up database backups
- Monitor logs regularly
- Configure firewall rules
- Use strong passwords
- Regular security updates

### Rate Limiting

Configured limits:
- **General API**: 100 requests / 15 minutes
- **Auth endpoints**: 5 attempts / 15 minutes
- **Check-in**: 30 requests / minute
- **Modifications**: 20 requests / minute

---

## 🧪 Testing

### Manual Testing

```bash
# Test backend health
curl http://localhost:3001/api/health

# Test authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Test rate limiting (try 6 times)
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
```

### Check Logs

```bash
# Development
tail -f backend/logs/combined.log

# Docker
docker-compose logs -f backend
```

---

## 📊 Database Schema

### Tables

**users**
- id, username, password, name, role, assigned_class

**students**
- id, nis, name, class, parent_name

**queue**
- id, student_id, parent_phone, status, check_in_time, called_time, finished_time, called_by, date, queue_number

**announcements**
- id, text, is_active, created_by, created_at

**settings**
- key, value

**activity**
- id, type, message, user_id, student_id, created_at

---

## 🔄 Workflow

1. **Check-in** (Guard)
   - Student arrives
   - Guard searches by NIS/name
   - Enters parent phone
   - System assigns queue number

2. **Queue Processing** (Teacher)
   - Teacher views queue
   - Calls next student
   - WhatsApp sent to parent
   - Student enters room
   - Teacher marks as finished

3. **Monitoring** (TV Display)
   - Shows active queue
   - Highlights called students
   - Displays announcements
   - Auto-updates real-time

---

## 🛠️ Maintenance

### Database Backup

```bash
# Manual backup
cp backend/data/raport.db backups/raport-$(date +%Y%m%d).db

# Docker backup
docker cp bagi-raport-backend:/app/data/raport.db ./backup.db
```

### Reset Daily Queue

```bash
# Run migration (resets queue to WAITING)
node migration-v4.js

# Or manual SQL
sqlite3 backend/data/raport.db "DELETE FROM queue WHERE date < date('now')"
```

### View Logs

```bash
# Error logs only
tail -f backend/logs/error.log

# All logs
tail -f backend/logs/combined.log

# Docker logs
docker-compose logs -f
```

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find process using port
lsof -i :3001
lsof -i :5173

# Kill process
kill -9 <PID>
```

**Database locked**
```bash
# Stop all processes accessing DB
pkill -f "node.*index.js"

# Delete lock files
rm backend/data/*.db-*
```

**Socket.io connection failed**
```bash
# Check CORS settings
# Verify backend is running
# Check browser console for errors
```

**Docker build fails**
```bash
# Clean build
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

---

## 📚 API Documentation

### Authentication

**POST** `/api/auth/login`
```json
{
  "username": "admin",
  "password": "password"
}
```

**GET** `/api/auth/verify`
- Headers: `Authorization: Bearer <token>`

### Queue Management

**GET** `/api/queue?class=7A&date=2024-12-15`

**POST** `/api/queue/checkin`
```json
{
  "student_id": 1,
  "parent_phone": "08123456789"
}
```

**PUT** `/api/queue/:id/call`

**PUT** `/api/queue/:id/finish`

### Students

**GET** `/api/students?search=Ahmad&class=7A`

**POST** `/api/students`
```json
{
  "nis": "2024001",
  "name": "Ahmad",
  "class": "7A",
  "parent_name": "Bapak Ahmad"
}
```

---

## 🚧 Roadmap

- [ ] Export to Excel/PDF
- [ ] SMS notifications (alternative to WhatsApp)
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Advanced analytics

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **React Team** - Amazing framework
- **Express.js** - Robust backend
- **Socket.io** - Real-time magic
- **Lucide** - Beautiful icons

---

## 📞 Support

Need help? 
- 📖 Read [DOCKER.md](DOCKER.md) for deployment
- 🐛 [Open an issue](issues)
- 📧 Contact: your-email@example.com

---

## 🎯 Project Status

✅ **Production Ready**
- Secure authentication
- Input validation
- Rate limiting
- Professional logging
- Docker deployment
- Comprehensive documentation

**Version**: 1.0.0

---

Made with ❤️ for better school administration
