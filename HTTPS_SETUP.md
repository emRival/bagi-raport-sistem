# HTTPS Configuration for Bagi Raport

## Your Setup: NPM → Frontend Container → Backend (Internal)

```
Internet → Cloudflare → NPM → Frontend (port 80) → Backend (localhost:3001)
```

Hanya **Frontend** yang di-expose ke domain. Backend berkomunikasi internal via Docker network.

---

## Configuration di Nginx Proxy Manager

### Proxy Host untuk Frontend
| Field | Value |
|-------|-------|
| Domain | `bagi-raport.idnbogor.id` |
| Scheme | `http` |
| Forward Hostname/IP | `bagi-raport-frontend` atau IP container |
| Forward Port | `80` |
| **Websockets Support** | ✅ **ON** (penting!) |
| Block Common Exploits | ✅ ON |
| SSL Certificate | Let's Encrypt atau Cloudflare Origin |

> ⚠️ **PENTING**: **Websockets Support = ON** wajib untuk Socket.io!

---

## Frontend nginx.conf (Sudah Handle)

File `nginx.conf` di frontend sudah menghandle proxy ke backend:

```nginx
location /api/ {
    proxy_pass http://backend:3001/api/;  # Internal Docker network
}

location /socket.io/ {
    proxy_pass http://backend:3001/socket.io/;
    # WebSocket upgrade headers
}
```

Jadi Anda **tidak perlu** setup proxy host terpisah untuk backend di NPM.

---

## Environment Variables

Buat file `.env` di root folder:

```bash
# WAJIB - Generate dengan: openssl rand -hex 32
JWT_SECRET=your-super-secret-key-minimum-32-characters

# Production settings
NODE_ENV=production
CORS_ORIGIN=https://bagi-raport.idnbogor.id
```

Generate JWT secret:
```bash
openssl rand -hex 32
```

---

## Cloudflare Settings

1. **SSL/TLS** → **Full (strict)** ✅
2. **Edge Certificates** → Always Use HTTPS: **ON** ✅

---

## Checklist Deployment ✅

- [ ] `JWT_SECRET` sudah diset di `.env`
- [ ] `CORS_ORIGIN` = `https://bagi-raport.idnbogor.id`
- [ ] NPM **Websockets Support = ON**
- [ ] Cloudflare SSL: **Full (strict)**
- [ ] `docker-compose up -d --build`
