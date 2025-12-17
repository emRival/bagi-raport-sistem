# HTTPS Configuration for Bagi Raport

## Option 1: Nginx with Let's Encrypt (Recommended)

Create/update your nginx configuration:

```nginx
# /etc/nginx/sites-available/bagi-raport
server {
    listen 80;
    server_name bagi-raport.yourdomain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bagi-raport.yourdomain.com;
    
    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/bagi-raport.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bagi-raport.yourdomain.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers (additional to helmet)
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket (Socket.io)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Install Let's Encrypt Certificate:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d bagi-raport.yourdomain.com

# Auto-renewal is set up automatically
```

## Option 2: Use Cloudflare (Easiest)

1. Add your domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Cloudflare handles HTTPS automatically
4. Update your DNS to point to Cloudflare

## Update docker-compose.yml for Production:

```yaml
environment:
  - NODE_ENV=production
  - JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters
  - CORS_ORIGIN=https://bagi-raport.yourdomain.com
```

Generate a secure JWT secret:
```bash
openssl rand -hex 32
```
