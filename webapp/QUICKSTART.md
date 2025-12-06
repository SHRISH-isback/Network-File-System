# Quick Start - Multi-Machine Setup

## 🚀 Fast Setup (3 Steps)

### 1️⃣ Start Backend (Laptop A - e.g., 192.168.1.100)
```bash
cd Network-File-System
make
./name_server/name_server 8080
```

### 2️⃣ Configure & Start Web App (Laptop B - e.g., 192.168.1.101)
```bash
cd Network-File-System/webapp

# Quick config (Fish shell)
set -x NM_HOST "192.168.1.100"
set -x NM_PORT "8080"
pip3 install -r requirements.txt
python3 app.py
```

### 3️⃣ Access from Any Device
Open browser: **http://192.168.1.101:5000**

---

## 📝 Configuration Cheat Sheet

### Using .env File (Best for permanent setup)
```bash
# webapp/.env
NM_HOST=192.168.1.100
NM_PORT=8080
WEB_PORT=5000
```

### Using Environment Variables
```fish
# Fish
set -x NM_HOST "192.168.1.100"
set -x NM_PORT "8080"
```

```bash
# Bash
export NM_HOST="192.168.1.100"
export NM_PORT="8080"
```

---

## 🔧 Common Issues

| Problem | Solution |
|---------|----------|
| Can't connect to backend | Check `NM_HOST` IP and firewall |
| Can't access from other devices | Use `0.0.0.0` for WEB_HOST |
| Connection refused | Ensure Name Server is running |
| Port already in use | Change `WEB_PORT` in config |

---

## 💡 Pro Tips

✅ **Same Network**: All devices must be on same WiFi/LAN  
✅ **Static IPs**: Use static IPs to avoid reconfiguration  
✅ **Firewall**: Allow ports 8080 (backend) and 5000 (web app)  
✅ **Find Your IP**: `hostname -I` or `ip addr show`  

---

## 🎯 Yes, It Works Across Laptops!

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Laptop A   │      │  Laptop B   │      │  Laptop C   │
│  Backend    │◄────►│  Web App    │◄────►│  Browser    │
│  (NFS)      │      │  (Flask)    │      │  (User)     │
└─────────────┘      └─────────────┘      └─────────────┘
192.168.1.100        192.168.1.101        192.168.1.102
```

**The web app on Laptop B connects to backend on Laptop A**  
**Users on Laptop C (or any device) access web app via browser**

This is a true client-server architecture! 🎉
