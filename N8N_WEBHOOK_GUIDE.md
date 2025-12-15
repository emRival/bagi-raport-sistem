# 🔧 n8n Webhook - Correct Setup (No Bearer Prefix)

## ✅ Correct Header Format

### Backend Sends:
```javascript
headers: {
    'Content-Type': 'application/json',
    'Authorization': 'abc123xyz'  // Direct token, NO Bearer!
}
```

---

## ⚙️ n8n Webhook Configuration

### Webhook Node Settings:
```
HTTP Method: POST
Path: ambil-raport
Authentication: Header Auth
```

### Header Auth Credential:
```
Name:  Authorization
Value: abc123xyz  (direct token, no "Bearer" prefix)
```

---

## 🎯 Bagi Raport Settings

**Admin → Settings → WhatsApp**:
- WA API URL: `https://n8n.idnbogor.id/webhook/ambil-raport`
- WA API Token: `abc123xyz` (token langsung)

---

## 🧪 Test Request

```bash
curl -X POST https://n8n.idnbogor.id/webhook/ambil-raport \
  -H "Content-Type: application/json" \
  -H "Authorization: abc123xyz" \
  -d '{
    "phone": "08123456789",
    "message": "Test WhatsApp"
  }'
```

✅ **Sekarang format header sudah benar!**
