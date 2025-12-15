# 🐳 Docker Deployment Guide - Bagi Raport System

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Port 80 and 3001 available

### Deploy in 3 Steps

```bash
# 1. Set JWT secret (IMPORTANT!)
export JWT_SECRET="$(openssl rand -base64 32)"

# 2. Build and start
docker-compose up -d --build

# 3. Check status
docker-compose ps
```

**Access**:
- Frontend: http://localhost
- Backend API: http://localhost:3001/api
- Health check: http://localhost:3001/api/health

---

## Configuration

### Environment Variables

Create `.env` file:
```bash
cp .env.example .env
nano .env  # Edit values
```

**Required**:
- `JWT_SECRET` - Must be unique and secure!

**Optional**:
- `CORS_ORIGIN` - Set to your domain in production
- `PORT` - Backend port (default: 3001)

---

## Production Deployment

### 1. **Secure JWT Secret**
```bash
# Generate random secret
openssl rand -base64 32

# Set in docker-compose.yml or .env
JWT_SECRET=<generated-secret>
```

### 2. **Configure Domain**
Update `docker-compose.yml`:
```yaml
environment:
  - CORS_ORIGIN=https://yourdomain.com
```

### 3. **HTTPS with Reverse Proxy**

Add Nginx reverse proxy:
```yaml
services:
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx-proxy.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
```

### 4. **Deploy**
```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3001/api/health
```

---

## Management Commands

### Start/Stop
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart
docker-compose restart

# Stop and remove volumes (⚠️ deletes data!)
docker-compose down -v
```

### Logs
```bash
# All logs
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Database Backup
```bash
# Backup database
docker cp bagi-raport-backend:/app/data/raport.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup.db bagi-raport-backend:/app/data/raport.db
docker-compose restart backend
```

### Updates
```bash
# Pull latest code
git pull

# Rebuild with new code
docker-compose down
docker-compose up -d --build
```

---

## Volumes

Persistent data stored in Docker volumes:

- `backend-data` - Database file
- `backend-logs` - Application logs

### View Volume Location
```bash
docker volume inspect bagi-raport-system_backend-data
```

### Backup Volumes
```bash
# Backup data volume
docker run --rm -v bagi-raport-system_backend-data:/data -v $(pwd):/backup alpine tar czf /backup/data-backup.tar.gz -C /data .

# Restore data volume
docker run --rm -v bagi-raport-system_backend-data:/data -v $(pwd):/backup alpine tar xzf /backup/data-backup.tar.gz -C /data
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend

# Check if port is in use
lsof -i :3001
lsof -i :80
```

### Database issues
```bash
# Access backend container
docker exec -it bagi-raport-backend sh

# Check database
ls -lh /app/data/
sqlite3 /app/data/raport.db ".tables"
```

### Network issues
```bash
# Check network
docker network ls
docker network inspect bagi-raport-system_bagi-raport-network

# Recreate network
docker-compose down
docker-compose up -d
```

### Permission issues
```bash
# Fix volume permissions
docker-compose down
docker volume rm bagi-raport-system_backend-data
docker-compose up -d
```

---

## Performance Tuning

### Resource Limits

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

### Health Checks

Already configured! Check status:
```bash
docker-compose ps
# Should show "healthy" status
```

---

## Security Checklist

- [ ] Changed JWT_SECRET
- [ ] Configured CORS_ORIGIN
- [ ] Enabled HTTPS (production)
- [ ] Set up regular backups
- [ ] Configured firewall rules
- [ ] Updated to latest images
- [ ] Disabled debug endpoints
- [ ] Set strong admin password

---

## Monitoring

### Check Application Health
```bash
# Backend health
curl http://localhost:3001/api/health

# Response: {"status":"ok","timestamp":"..."}
```

### Monitor Resources
```bash
# Real-time stats
docker stats

# Container inspect
docker inspect bagi-raport-backend
```

### Log Monitoring
```bash
# Watch error logs
docker exec bagi-raport-backend tail -f /app/logs/error.log

# Watch all logs
docker exec bagi-raport-backend tail -f /app/logs/combined.log
```

---

## Default Credentials

**Admin Account**:
- Username: `admin`
- Password: `password`

⚠️ **CHANGE IMMEDIATELY AFTER FIRST LOGIN!**

**Other Default Users**:
- `satpam` / `password` (Guard)
- `guru` / `password` (Teacher 7A)
- `tv` / `password` (TV Display)

---

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP (Port 80)
       ▼
┌─────────────────────┐
│  Frontend (Nginx)   │  Serves React SPA
└──────┬──────────────┘
       │ API calls
       ▼ HTTP (Port 3001)
┌─────────────────────┐
│  Backend (Node.js)  │  Express + Socket.io
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  SQLite Database    │  Stored in volume
└─────────────────────┘
```

---

## Support

Need help? Check:
1. Logs: `docker-compose logs -f`
2. Health: `curl http://localhost:3001/api/health`
3. Network: `docker network inspect bagi-raport-system_bagi-raport-network`

---

## License

MIT License - Feel free to use and modify!
