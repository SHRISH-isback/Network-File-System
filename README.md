# Network File System (NFS) with Web Interface

A distributed network file system implementation in C with a modern web-based interface for file management across multiple machines.

## Features

### Backend (C Implementation)
- Distributed file storage across multiple Storage Servers
- Centralized Name Server for coordination
- Client-server architecture with TCP sockets
- Access control and permissions management
- File versioning with checkpoints
- Command-line client interface

### Web Interface
- Modern Node.js/Express web application
- Multi-machine support - run backend and web interface on separate machines
- Username-based authentication
- File and folder management through browser
- In-browser file viewing and editing
- Access control management interface
- Checkpoint creation and version control
- Responsive UI with Bootstrap 5

## Project Structure

```
Network-File-System/
├── client/              # C client implementation
├── common/              # Shared protocol and network utilities
├── name_server/         # Name Server implementation
├── storage_server/      # Storage Server implementation
├── webapp/              # Web application
│   ├── server.js       # Node.js/Express server
│   ├── app.py          # Python/Flask alternative
│   ├── config.py       # Configuration management
│   ├── templates/      # EJS/HTML templates
│   ├── static/         # CSS and JavaScript files
│   ├── package.json    # Node.js dependencies
│   └── requirements.txt # Python dependencies
├── Makefile
└── README.md
```

## How to Run

## How to Run

### Prerequisites
- GCC compiler for C code
- Node.js (v18 or higher) for web interface
- npm (comes with Node.js)
- Linux/Unix environment (tested on Ubuntu)

### Option 1: Single Machine Setup (Development)

Run all components on one machine for local development and testing.

#### Step 1: Build the Backend
```bash
# Navigate to project directory
cd Network-File-System

# Build all components
make
```

#### Step 2: Start Name Server
```bash
# In Terminal 1
./name_server/name_server 8080
```
Expected output: `Name Server listening on port 8080`

#### Step 3: Start Storage Server
```bash
# In Terminal 2
./storage_server/storage_server 127.0.0.1 8080 9001 ./storage_data
```
Expected output: `Storage Server connected to Name Server`

#### Step 4: Start Web Interface
```bash
# In Terminal 3
cd webapp

# Install Node.js dependencies (first time only)
npm install

# Start the web server
npm start
```
Expected output: `Web Interface: http://0.0.0.0:5000`

#### Step 5: Access the Application
Open your web browser and navigate to:
```
http://localhost:5000
```

### Option 2: Multi-Machine Setup (Distributed)

Run backend services on one machine and access the web interface from other devices on the same network.

#### On Machine 1 (Backend Server)

**Step 1: Find the IP address**
```bash
hostname -I
```
Example output: `192.168.1.100`

**Step 2: Build and start backend services**
```bash
# Build the project
make

# Terminal 1 - Start Name Server
./name_server/name_server 8080

# Terminal 2 - Start Storage Server
# Replace 192.168.1.100 with your actual IP
./storage_server/storage_server 192.168.1.100 8080 9001 ./storage1
```

**Step 3: Configure firewall (if needed)**
```bash
# Allow connections on ports 8080 and 9001
sudo ufw allow 8080/tcp
sudo ufw allow 9001/tcp
```

#### On Machine 2 (Web Interface)

**Step 1: Configure connection to backend**
```bash
cd webapp

# Create .env file with backend server IP
cat > .env << EOF
NM_HOST=192.168.1.100
NM_PORT=8080
WEB_PORT=5000
EOF
```

**Step 2: Install dependencies and start server**
```bash
# Install dependencies (first time only)
npm install

# Start the web server
npm start
```

**Step 3: Access from any device**
Open browser on any device connected to the same network:
```
http://<web-server-ip>:5000
```
Replace `<web-server-ip>` with the IP address of the machine running the web interface.

### Option 3: Using the Command-Line Client

Instead of the web interface, you can use the traditional C client:

```bash
# Build the project
make

# Run client
./client/client <username> <name_server_ip> <name_server_port>

# Example
./client/client alice 127.0.0.1 8080
```
### Available Commands in CLI Client

When using the command-line client, you can use these commands:

- `create <filename>` - Create a new file
- `read <filename>` - Read and display file contents
- `write <filename>` - Write content to a file
- `delete <filename>` - Delete a file
- `view` - List all files in the system
- `info <filename>` - Get detailed file information
- `createfolder <foldername>` - Create a new folder
- `addaccess <filename> <username> <read|write>` - Grant file access to another user
- `remaccess <filename> <username>` - Remove user access from a file
- `checkpoint <filename> <tag>` - Create a checkpoint (version snapshot)
- `listcheckpoints <filename>` - List all checkpoints for a file
- `revert <filename> <checkpoint_tag>` - Revert file to a previous checkpoint
- `help` - Display list of all available commands
- `exit` - Disconnect and exit client

## Web Interface Usage

### Getting Started

1. Navigate to the web interface URL in your browser
2. On the login page, enter a username (registration is automatic on first login)
3. You will be directed to the dashboard

### Dashboard Features

**File Management:**
- View all files and folders you have access to
- Click "New File" to create a file
- Click "New Folder" to create a folder
- Click on a file to view or edit its contents
- Use the delete button to remove files or folders

**Access Control:**
- Click "Manage Access" on any file you own
- Grant read or write permissions to other users
- Remove access from users who no longer need it

**Checkpoints:**
- Click "Create Checkpoint" on any file to save a version
- View all checkpoints for a file
- Revert to a previous checkpoint if needed

**User Management:**
- Your username is displayed in the navigation bar
- Click logout to end your session

## Configuration

The web application can be configured using environment variables or a `.env` file in the `webapp/` directory.

### Configuration Options

```bash
# Name Server connection
NM_HOST=127.0.0.1          # IP address of Name Server
NM_PORT=8080               # Port of Name Server

# Web server settings
WEB_HOST=0.0.0.0           # Listen on all interfaces
WEB_PORT=5000              # Web interface port

# Security
SECRET_KEY=<random_string> # Session encryption key (auto-generated if not set)
```

### Creating a .env File

```bash
cd webapp
cat > .env << EOF
NM_HOST=192.168.1.100
NM_PORT=8080
WEB_PORT=5000
SECRET_KEY=your-secret-key-here
EOF
```

## Building the Project

```bash
# Build all components
make

# Build specific components
make name_server
make storage_server
make client

# Clean compiled files
make clean
```

## System Architecture

```
Network Layer (LAN/WiFi)
├── Name Server (Port 8080)
│   └── Coordinates file operations and storage server registration
│
├── Storage Servers (Port 9001+)
│   └── Store actual file data and handle read/write operations
│
├── C Client (CLI)
│   └── Command-line interface for file operations
│
└── Web Application (Port 5000)
    └── Browser-based interface (Node.js/Express)
        └── Accessible from multiple devices
```

## Troubleshooting

### Cannot Connect to Name Server

**Check if Name Server is running:**
```bash
ps aux | grep name_server
```

**Test network connectivity:**
```bash
telnet <name_server_ip> 8080
```

**Check firewall rules:**
```bash
sudo ufw status
sudo ufw allow 8080/tcp
```

### Web Interface Not Accessible from Other Devices

**Verify the web server is listening on all interfaces:**
- Look for `http://0.0.0.0:5000` in the startup message
- Not `http://127.0.0.1:5000`

**Open firewall port:**
```bash
sudo ufw allow 5000/tcp
```

**Find your IP address:**
```bash
# Linux/Mac
hostname -I

# Alternative
ip addr show

# Or
ifconfig
```

### Storage Server Cannot Connect

**Verify Name Server IP and port are correct**
**Ensure Name Server is running before starting Storage Server**
**Check network connectivity between machines**

### Web Interface Shows Connection Error

**Verify .env file configuration is correct**
**Ensure NM_HOST points to the correct IP address**
**Check that Name Server is accessible from the web server machine**

## Features Summary

| Feature | C Backend | Web Interface | CLI Client |
|---------|-----------|---------------|------------|
| File Operations | Yes | Yes | Yes |
| Folder Management | Yes | Yes | Yes |
| Access Control | Yes | Yes | Yes |
| Checkpoints | Yes | Yes | Yes |
| Multi-user Support | Yes | Yes | Yes |
| Remote Access | Yes | Yes | No |
| Browser-based | No | Yes | No |
| Command-line | No | No | Yes |

## Technical Details

### Protocol
- Custom binary protocol over TCP sockets
- Message-based communication between components
- Defined in `common/protocol.h`

### Storage
- Files stored on Storage Servers in designated directories
- Name Server maintains metadata and file location mappings
- Supports multiple Storage Servers for distributed storage

### Networking
- TCP sockets for all communication
- Name Server acts as central coordinator
- Storage Servers register with Name Server on startup
- Clients connect to Name Server for file operations

### Web Application
- Node.js with Express framework
- EJS templating engine
- Bootstrap 5 for responsive UI
- Session-based authentication

## Security Considerations

**Current Implementation:**
- Username-based authentication (development/educational use)
- Designed for trusted network environments
- No encryption of data in transit

**For Production Use:**
- Implement HTTPS/TLS encryption
- Add strong authentication (passwords, OAuth)
- Use input validation and sanitization
- Implement rate limiting
- Add proper firewall rules
- Consider VPN for remote access

## Educational Purpose

This project demonstrates concepts in:
- Distributed systems architecture
- Network programming in C
- Client-server communication patterns
- TCP socket programming
- File system implementation
- Web application development
- Multi-machine coordination

## License

Educational project for Operating Systems Networks (OSN) course.
Free to use and modify for educational purposes.
