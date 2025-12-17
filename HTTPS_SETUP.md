# HTTPS Configuration for Bagi Raport

## Your Setup: Docker + Nginx Proxy Manager + Cloudflare Tunnel

Karena Anda menggunakan **Nginx Proxy Manager (NPM)** dengan **Cloudflare Tunnel**, HTTPS sudah di-handle oleh Cloudflare! 🎉

### ✅ Yang Sudah Aman (Handled by Cloudflare):
- SSL/TLS encryption (HTTPS)
- DDoS protection
- CDN caching

---

## Configuration di Nginx Proxy Manager

### 1. Proxy Host untuk Frontend
| Field | Value |
|-------|-------|
| Domain | `bagi-raport.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname/IP | `bagi-raport-frontend` (nama container) |
| Forward Port | `80` |
| Websockets Support | ✅ **ON** |
| Block Common Exploits | ✅ ON |

### 2. Proxy Host untuk Backend API
| Field | Value |
|-------|-------|
| Domain | `bagi-raport.yourdomain.com` |
| Scheme | `http` |
| Forward Hostname/IP | `bagi-raport-backend` (nama container) |
| Forward Port | `3001` |
| Websockets Support | ✅ **ON** (penting untuk Socket.io) |

> ⚠️ **PENTING**: Pastikan **Websockets Support** diaktifkan untuk Socket.io!

### 3. Custom Locations (Jika Satu Domain)
Jika frontend dan backend di satu domain:

**Location `/api`:**
- Forward: `http://bagi-raport-backend:3001`
- Websockets: ✅ ON

**Location `/socket.io`:**
- Forward: `http://bagi-raport-backend:3001`
- Websockets: ✅ ON

---

## Update docker-compose.yml

Pastikan containers terhubung ke network NPM:

```yaml
services:
  backend:
    # ... config existing ...
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}  # WAJIB diisi!
      - CORS_ORIGIN=https://bagi-raport.yourdomain.com
    networks:
      - bagi-raport-network
      - npm_default  # Network NPM

  frontend:
    # ... config existing ...
    networks:
      - bagi-raport-network
      - npm_default  # Network NPM

networks:
  bagi-raport-network:
    driver: bridge
  npm_default:
    external: true  # Connect ke network NPM yang sudah ada
```

---

## Cloudflare Settings

Di Cloudflare Dashboard:
1. **SSL/TLS** → **Full (strict)** ✅
2. **Edge Certificates** → Always Use HTTPS: **ON** ✅

---

## Environment Variables (.env)

Buat file `.env` di folder backend:

```bash
# WAJIB - Generate dengan: openssl rand -hex 32
JWT_SECRET=your-super-secret-key-minimum-32-characters-here

# Production settings
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://bagi-raport.idnbogor.id
```

Generate JWT secret:
```bash
openssl rand -hex 32
```

---

## Checklist Deployment ✅

- [ ] `JWT_SECRET` sudah diset di `.env`
- [ ] `CORS_ORIGIN` sudah diset ke domain HTTPS
- [ ] NPM Websockets Support **ON**
- [ ] Cloudflare SSL mode: **Full (strict)**
- [ ] `docker-compose up -d --build`
