# Complete Running Guide - Main Laptop + Other Laptops

This guide shows you **exactly** how to run the NFS system with web interface across multiple laptops.

---

## 🖥️ Scenario 1: Everything on Main Laptop (Single Machine)

Perfect for testing and development.

### On Your Main Laptop:

#### Terminal 1 - Start Name Server
```bash
cd "Network-File-System"
make
./name_server/name_server 8080
```
**Output:** `Name Server listening on port 8080`

#### Terminal 2 - Start Storage Server
```bash
cd "Network-File-System"
./storage_server/storage_server 1 127.0.0.1 9001 9002 ./storage_data
```
**Output:** `Storage Server connected to Name Server`

#### Terminal 3 - Start Web App
```bash
cd "Network-File-System/webapp"

# Install dependencies (first time only)
pip3 install -r requirements.txt

# Run the web app
python3 app.py
```
**Output:** 
```
Web Interface: http://0.0.0.0:5000
Starting Flask application...
```

#### Access the Web Interface
Open your browser: **http://localhost:5000**

---

## 🌐 Scenario 2: Backend on Main Laptop + Web Interface on Another Laptop

This is the **recommended setup** for your multi-machine deployment.

### Step 1: Find Your Main Laptop's IP Address

On **Main Laptop** (the one that will run the backend):

**Linux/Mac:**
```bash
hostname -I
# Example output: 192.168.1.100
```

**Fish Shell:**
```fish
hostname -I | string trim
```

**Windows (PowerShell):**
```powershell
ipconfig
# Look for IPv4 Address
```

📝 **Write down this IP!** Let's say it's `192.168.1.100`

---

### Step 2: On Main Laptop (Backend Server)

This laptop runs the NFS backend (Name Server + Storage Servers).

#### Terminal 1 - Start Name Server
```bash
cd "Network-File-System"

# Build if you haven't already
make

# Start Name Server (accessible from network)
./name_server/name_server 8080
```

**Important:** The Name Server automatically listens on all network interfaces.

#### Terminal 2 - Start Storage Server 1
```bash
cd "Network-File-System"

# Replace 192.168.1.100 with YOUR main laptop's IP
./storage_server/storage_server 192.168.1.100 8080 9001 ./storage1
```

#### Terminal 3 - Start Storage Server 2 (Optional)
```bash
cd "Network-File-System"

# Add more storage servers as needed
./storage_server/storage_server 192.168.1.100 8080 9002 ./storage2
```

#### Open Firewall (if needed)
```bash
# Allow Name Server port
sudo ufw allow 8080/tcp

# Allow Storage Server ports
sudo ufw allow 9001/tcp
sudo ufw allow 9002/tcp
```

✅ **Backend is now running!** Keep these terminals open.

---

### Step 3: On Other Laptop (Web Application Server)

This laptop will run the Flask web application.

#### Find This Laptop's IP (Optional, for reference)
```bash
hostname -I
# Example: 192.168.1.101
```

#### Setup and Run Web App

**Open terminal on the other laptop:**

```bash
# Navigate to the webapp directory
cd "Network-File-System/webapp"

# Install dependencies (first time only)
pip3 install -r requirements.txt

# Configure connection to main laptop's backend
# REPLACE 192.168.1.100 with YOUR main laptop's IP!

# Option A: Using environment variables (Fish shell)
set -x NM_HOST "192.168.1.100"
set -x NM_PORT "8080"
python3 app.py

# Option B: Using environment variables (Bash)
export NM_HOST="192.168.1.100"
export NM_PORT="8080"
python3 app.py

# Option C: One-liner (Fish)
NM_HOST=192.168.1.100 NM_PORT=8080 python3 app.py

# Option D: Using .env file (recommended for permanent setup)
# Create .env file first (see below)
python3 app.py
```

#### Create .env File (Recommended Method)

Create a file named `.env` in the `webapp/` directory:

```bash
# Create .env file
cd "Network-File-System/webapp"
nano .env  # or use your favorite editor
```

**Contents of `.env` file:**
```bash
# Main laptop's IP address (where backend is running)
NM_HOST=192.168.1.100

# Name Server port
NM_PORT=8080

# Web app settings
WEB_PORT=5000
```

**Save and run:**
```bash
python3 app.py
```

**Output you should see:**
```
==================================================
 NFS Web Application Configuration
==================================================
  Name Server: 192.168.1.100:8080
  Web Interface: http://0.0.0.0:5000
  Debug Mode: True
==================================================

Starting Flask application...
Access the web interface from any device on your network:
  Local: http://localhost:5000
  Network: http://192.168.1.101:5000
```

#### Open Firewall (if needed)
```bash
sudo ufw allow 5000/tcp
```

✅ **Web app is now running!**

---

### Step 4: Access from ANY Device

Now anyone on the same network can access the NFS through the web interface!

**From any laptop/tablet/phone on the same WiFi/network:**

1. Open a web browser
2. Go to: **http://192.168.1.101:5000**
   - Replace `192.168.1.101` with the IP of the laptop running the web app
3. Enter your username
4. Start using the NFS!

---

## 📋 Quick Reference Chart

| Component | Runs On | IP Example | Port | Command |
|-----------|---------|------------|------|---------|
| Name Server | Main Laptop | 192.168.1.100 | 8080 | `./name_server/name_server 8080` |
| Storage Server | Main Laptop | 192.168.1.100 | 9001 | `./storage_server/storage_server 192.168.1.100 8080 9001 ./storage1` |
| Web App | Other Laptop | 192.168.1.101 | 5000 | `NM_HOST=192.168.1.100 python3 app.py` |
| Browser Access | Any Device | - | - | `http://192.168.1.101:5000` |

---

## 🔧 Troubleshooting

### Problem: "Cannot connect to NFS server"

**On main laptop (backend), check if Name Server is running:**
```bash
ps aux | grep name_server
```

**Test connection from other laptop:**
```bash
# Try to connect to main laptop's port 8080
telnet 192.168.1.100 8080
# or
nc -zv 192.168.1.100 8080
```

**If connection fails, check firewall on main laptop:**
```bash
sudo ufw status
sudo ufw allow 8080/tcp
```

### Problem: "Can't access web interface from other devices"

**Check that web app is listening on 0.0.0.0:**
```bash
# In the terminal where web app is running, you should see:
# "Running on http://0.0.0.0:5000"
# NOT "Running on http://127.0.0.1:5000"
```

**Open firewall on laptop running web app:**
```bash
sudo ufw allow 5000/tcp
```

### Problem: "Wrong IP address - need to change"

**Edit the .env file:**
```bash
cd "Network-File-System/webapp"
nano .env
# Change NM_HOST to the correct IP
```

**Or set environment variable:**
```fish
set -x NM_HOST "192.168.1.XXX"  # Use correct IP
python3 app.py
```

---

## 📱 Access Points

Once everything is running, you can access the web interface from:

✅ **On the main laptop:** http://localhost:5000  
✅ **On the laptop running web app:** http://localhost:5000  
✅ **From any other device:** http://192.168.1.101:5000 (IP of web app laptop)  

---

## 🎯 Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Your WiFi Network                         │
│                                                               │
│  ┌─────────────────────────┐                                │
│  │   Main Laptop           │                                │
│  │   IP: 192.168.1.100     │                                │
│  │                         │                                │
│  │  Terminal 1:            │                                │
│  │  ./name_server 8080     │                                │
│  │                         │                                │
│  │  Terminal 2:            │                                │
│  │  ./storage_server       │                                │
│  │  ...100 8080 9001 ...   │                                │
│  └───────────┬─────────────┘                                │
│              │                                                │
│              │ Network Connection                            │
│              │                                                │
│  ┌───────────▼─────────────┐                                │
│  │   Other Laptop          │                                │
│  │   IP: 192.168.1.101     │                                │
│  │                         │                                │
│  │  Terminal:              │                                │
│  │  NM_HOST=192.168.1.100  │                                │
│  │  python3 app.py         │                                │
│  └───────────┬─────────────┘                                │
│              │                                                │
│              │ HTTP Requests                                 │
│              │                                                │
│      ┌───────▼────────┬─────────────┬─────────────┐        │
│      │                │             │             │        │
│  ┌───▼───┐      ┌─────▼────┐  ┌────▼────┐  ┌────▼────┐   │
│  │Laptop │      │  Laptop  │  │ Tablet  │  │  Phone  │   │
│  │   C   │      │    D     │  │         │  │         │   │
│  └───────┘      └──────────┘  └─────────┘  └─────────┘   │
│  Browser at: http://192.168.1.101:5000                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Pro Tips

1. **Keep terminals open:** Don't close the terminal windows running the servers
2. **Use screen/tmux:** For persistent sessions that survive terminal closure
   ```bash
   # Install screen
   sudo apt install screen
   
   # Start a screen session
   screen -S nfs-backend
   # Run your servers
   # Detach with: Ctrl+A, then D
   # Reattach with: screen -r nfs-backend
   ```

3. **Check if ports are in use:**
   ```bash
   # Check if port 8080 is in use
   sudo lsof -i :8080
   
   # Check if port 5000 is in use
   sudo lsof -i :5000
   ```

4. **Auto-start on boot:** Create systemd services (advanced)

---

## ✅ Summary

**Main Laptop Setup:**
```bash
# Terminal 1
./name_server/name_server 8080

# Terminal 2  
./storage_server/storage_server <YOUR_MAIN_IP> 8080 9001 ./storage1
```

**Other Laptop Setup:**
```bash
cd webapp
NM_HOST=<MAIN_LAPTOP_IP> NM_PORT=8080 python3 app.py
```

**Access from anywhere:**
```
http://<OTHER_LAPTOP_IP>:5000
```

That's it! Your distributed NFS with web interface is now running! 🎉
