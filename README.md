[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/0ek2UV58)

# Network File System (NFS) with Web Interface

A distributed network file system implementation with a modern Flask-based web interface for easy file management across multiple machines.

## 🌟 Features

### Backend (C Implementation)
- ✅ Distributed file storage across multiple Storage Servers
- ✅ Centralized Name Server for coordination
- ✅ Client-server architecture
- ✅ Access control and permissions management
- ✅ File versioning with checkpoints
- ✅ All bonus features implemented (except fault tolerance)
- ✅ Help command for easy navigation

### Web Interface (NEW! 🎉)
- 🌐 **Modern Flask-based web application**
- 🖥️ **Multi-machine support** - Run backend on one laptop, web interface on another
- 🔐 Simple username-based authentication
- 📁 File and folder management through browser
- 📝 In-browser file editing
- 🔒 Access control management
- 📸 Checkpoint creation and management
- 🎨 Beautiful, responsive UI with Bootstrap 5
- 🚀 Real-time updates

## 📁 Project Structure

```
Network-File-System/
├── client/              # C client implementation
├── common/              # Shared protocol and utilities
├── name_server/         # Name Server implementation
├── storage_server/      # Storage Server implementation
├── webapp/              # NEW! Flask web application
│   ├── app.py          # Main Flask application
│   ├── config.py       # Configuration management
│   ├── templates/      # HTML templates
│   ├── static/         # CSS and JavaScript
│   ├── requirements.txt
│   ├── README.md
│   ├── HOW_TO_RUN.md   # Detailed running instructions
│   ├── QUICKSTART.md   # Quick reference guide
│   └── MULTI_MACHINE_SETUP.md  # Multi-machine setup guide
├── Makefile
└── README.md           # This file
```

## 🚀 Quick Start

### Option 1: Run Everything on One Machine (Development)

#### Step 1: Build and Start Backend
```bash
# Build the project
make

# Terminal 1 - Start Name Server
./name_server/name_server 8080

# Terminal 2 - Start Storage Server
./storage_server/storage_server 127.0.0.1 8080 9001 ./storage_data
```

#### Step 2: Start Web Interface
```bash
# Terminal 3 - Start Web App
cd webapp
pip3 install -r requirements.txt
python3 app.py
```

#### Step 3: Access
Open browser: **http://localhost:5000**

---

### Option 2: Run Across Multiple Laptops (Recommended)

Perfect for distributed deployment!

#### On Main Laptop (Backend Server)
```bash
# Find your IP address
hostname -I
# Example output: 192.168.1.100

# Build
make

# Start Name Server
./name_server/name_server 8080

# Start Storage Server (in another terminal)
./storage_server/storage_server 192.168.1.100 8080 9001 ./storage1
```

#### On Another Laptop (Web Interface)
```bash
cd webapp

# Create .env file
cat > .env << EOF
NM_HOST=192.168.1.100
NM_PORT=8080
WEB_PORT=5000
EOF

# Install and run
pip3 install -r requirements.txt
python3 app.py
```

#### Access from Any Device
Open browser on **any device** on the same network:
```
http://192.168.1.101:5000
```
(Replace 192.168.1.101 with the IP of the laptop running the web app)

📚 **For detailed instructions, see:** [`webapp/HOW_TO_RUN.md`](webapp/HOW_TO_RUN.md)

---

## 🖥️ Traditional C Client (Command Line)

You can still use the original C client:

```bash
# Build
make

# Run client
./client/client <username> <name_server_ip> <name_server_port>

# Example
./client/client john 127.0.0.1 8080
```

### Available Commands:
- `create <filename>` - Create a new file
- `read <filename>` - Read file contents
- `write <filename>` - Write to a file
- `delete <filename>` - Delete a file
- `view` - List all files
- `info <filename>` - Get file information
- `createfolder <foldername>` - Create a folder
- `addaccess <filename> <username> <read|write>` - Grant access
- `checkpoint <filename> <tag>` - Create a checkpoint
- `help` - Show all available commands

---

## 🌐 Web Interface Features

### Dashboard
- View all files and folders
- Create, read, update, delete operations
- Modern card-based UI
- Responsive design for all devices

### File Management
- **Create Files** - Click "New File" button
- **Edit Files** - Click on any file to view/edit in modal
- **Delete Files** - Quick delete with confirmation
- **Create Folders** - Organize files in folders

### Access Control
- Grant read/write permissions to other users
- Manage access from the web interface
- View current permissions

### Checkpoints
- Create checkpoints for version control
- List all checkpoints
- Revert to previous versions

### Multi-User Support
- Multiple users can log in simultaneously
- Each user sees their accessible files
- Real-time updates

---

## 📖 Documentation

### For Web Interface:
- **[Quick Start Guide](webapp/QUICKSTART.md)** - Get started in 3 steps
- **[How to Run](webapp/HOW_TO_RUN.md)** - Detailed running instructions for single and multi-machine setups
- **[Multi-Machine Setup](webapp/MULTI_MACHINE_SETUP.md)** - Complete guide for distributed deployment
- **[Web App README](webapp/README.md)** - Web application documentation

### Configuration:
The web app can be configured using:
1. **`.env` file** (recommended) - Create `webapp/.env` with your settings
2. **Environment variables** - Set `NM_HOST`, `NM_PORT`, etc.
3. **Command line** - Pass variables when running

Example `.env` file:
```bash
NM_HOST=192.168.1.100  # IP of laptop running Name Server
NM_PORT=8080
WEB_PORT=5000
```

---

## 🔧 Building the Backend

```bash
# Build all components
make

# Build specific components
make name_server
make storage_server
make client

# Clean build files
make clean
```

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Network (LAN/WiFi)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────┐         ┌─────────────────┐          │
│  │  Name Server      │◄───────►│ Storage Server  │          │
│  │  (Coordinator)    │         │ (File Storage)  │          │
│  │  Port: 8080       │         │ Port: 9001      │          │
│  └─────────┬─────────┘         └─────────────────┘          │
│            │                                                  │
│            ├──────────────┬─────────────────┐               │
│            │              │                 │               │
│     ┌──────▼──────┐ ┌────▼──────┐   ┌─────▼──────┐        │
│     │  C Client   │ │  C Client │   │  Flask App │        │
│     │  (CLI)      │ │  (CLI)    │   │  (Web UI)  │        │
│     └─────────────┘ └───────────┘   └──────┬─────┘        │
│                                             │               │
│                                      ┌──────▼──────┐       │
│                                      │  Browsers   │       │
│                                      │  (Multiple) │       │
│                                      └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Use Cases

### Development & Testing
- Run everything on one laptop for local development
- Test features without network complexity

### Distributed Deployment
- Run backend on a powerful server/laptop
- Access from multiple machines via web interface
- Share files across team members

### Multi-User Collaboration
- Multiple users accessing same file system
- Permission-based access control
- Real-time file sharing

---

## 🔒 Security Notes

⚠️ **Current Implementation:**
- Simple username-based authentication
- Designed for trusted networks (development/educational use)

⚠️ **For Production Use, Add:**
- HTTPS/SSL encryption
- Strong authentication (OAuth, JWT)
- Rate limiting
- Input validation and sanitization
- Firewall rules

---

## 🐛 Troubleshooting

### Can't connect to Name Server from web app
```bash
# Check if Name Server is running
ps aux | grep name_server

# Test connectivity
telnet <name_server_ip> 8080

# Check firewall
sudo ufw allow 8080/tcp
```

### Web interface not accessible from other devices
```bash
# Ensure web app binds to 0.0.0.0 (check output)
# Should show: "Running on http://0.0.0.0:5000"

# Open firewall
sudo ufw allow 5000/tcp
```

### Find your IP address
```bash
hostname -I
# or
ip addr show
# or
ifconfig
```

For more troubleshooting, see [HOW_TO_RUN.md](webapp/HOW_TO_RUN.md)

---

## 📊 Features Summary

| Feature | Backend (C) | Web Interface | Status |
|---------|------------|---------------|--------|
| File Operations | ✅ | ✅ | Complete |
| Folder Management | ✅ | ✅ | Complete |
| Access Control | ✅ | ✅ | Complete |
| Checkpoints | ✅ | ✅ | Complete |
| Multi-user | ✅ | ✅ | Complete |
| Web UI | ❌ | ✅ | New! |
| Cross-machine | ✅ | ✅ | Complete |
| Real-time Updates | ❌ | ✅ | Complete |

---

## 🎓 Educational Project

This is an Operating Systems Networks (OSN) course project demonstrating:
- Distributed systems architecture
- Client-server communication
- Network programming in C
- Web application development with Flask
- Multi-machine coordination
- File system implementation

**Unique Factor:** Help command displays list of available options and functionalities to the client for ease of use.

---

## 📝 License

Educational project - Free to use and modify.

---

## 🙋 Getting Help

1. Check the documentation in [`webapp/`](webapp/) directory
2. Read [HOW_TO_RUN.md](webapp/HOW_TO_RUN.md) for detailed instructions
3. See [QUICKSTART.md](webapp/QUICKSTART.md) for quick reference

---

## 🎉 What's New

### Flask Web Application (Latest)
- ✨ Modern web interface for NFS
- 🌐 Access from any device with a browser
- 🖥️ Multi-machine deployment support
- 📱 Responsive design
- 🎨 Beautiful Bootstrap 5 UI
- 🔧 Easy configuration with .env files

---

**Enjoy using the Network File System with Web Interface! 🚀**
