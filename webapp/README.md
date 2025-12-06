# NFS Web Application

A modern Flask-based web application providing a user-friendly interface for the Network File System (NFS).

## Features

- 🔐 **User Authentication** - Simple username-based login
- 📁 **File Management** - Create, read, update, and delete files
- 📂 **Folder Operations** - Create and manage folders
- 🔒 **Access Control** - Manage user permissions (read/write access)
- 📸 **Checkpoints** - Create and manage file checkpoints/versions
- 🎨 **Modern UI** - Beautiful, responsive interface built with Bootstrap 5
- 🚀 **Real-time Updates** - Smooth user experience with AJAX

## Prerequisites

1. **NFS Backend Running** - Ensure your NFS backend (Name Server, Storage Servers) is running
2. **Python 3.7+** - Required for Flask application

## Installation

1. Navigate to the webapp directory:
```bash
cd webapp
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Configuration

The app uses environment variables for configuration:

- `NM_HOST` - Name Server IP address (default: `127.0.0.1`)
- `NM_PORT` - Name Server port (default: `8080`)

### Example:
```bash
export NM_HOST=192.168.1.100
export NM_PORT=8080
```

Or set them inline when running:
```bash
NM_HOST=192.168.1.100 NM_PORT=8080 python app.py
```

## Running the Application

### Method 1: Direct Python execution
```bash
python app.py
```

### Method 2: Using Flask CLI
```bash
export FLASK_APP=app.py
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5000
```

The web interface will be available at: **http://localhost:5000**

## Usage

1. **Login**
   - Open your browser and navigate to `http://localhost:5000`
   - Enter your username
   - Click "Login"

2. **File Operations**
   - **Create File**: Click "New File" button, enter filename
   - **View/Edit File**: Click the eye icon next to any file
   - **Delete File**: Click the trash icon next to any file
   - **Save Changes**: Edit content and click "Save Changes"

3. **Folder Operations**
   - **Create Folder**: Click "New Folder" button
   - **View Folder**: Click the folder icon to view contents

4. **Access Management**
   - Open a file
   - Navigate to "Access" tab
   - Enter username and select permission level (Read/Write/Both)
   - Click "Add"

5. **Checkpoints**
   - Open a file
   - Navigate to "Checkpoints" tab
   - Enter checkpoint name and click "Create"
   - View list of existing checkpoints

## Project Structure

```
webapp/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── static/
│   ├── css/
│   │   └── style.css     # Custom CSS styles
│   └── js/
│       └── dashboard.js  # Dashboard JavaScript
└── templates/
    ├── base.html         # Base template
    ├── login.html        # Login page
    └── dashboard.html    # Main dashboard
```

## API Endpoints

The application provides the following REST API endpoints:

### File Operations
- `GET /api/files` - List all files
- `GET /api/file/<filename>?action=read` - Read file content
- `GET /api/file/<filename>?action=info` - Get file info
- `POST /api/file` - Create new file
- `PUT /api/file/<filename>` - Update file content
- `DELETE /api/file/<filename>` - Delete file

### Folder Operations
- `POST /api/folder` - Create folder
- `GET /api/folder/<foldername>` - View folder contents

### Access Control
- `POST /api/access` - Add/remove access permissions

### Checkpoints
- `POST /api/checkpoint` - Create checkpoint
- `GET /api/checkpoint/<filename>` - List checkpoints
- `POST /api/checkpoint/revert` - Revert to checkpoint

## Troubleshooting

### Cannot connect to NFS server
- Ensure Name Server is running: `./name_server/name_server <port>`
- Verify the NM_HOST and NM_PORT environment variables
- Check firewall settings

### Connection timeout
- Check if Storage Servers are running
- Verify network connectivity between components

### Files not loading
- Refresh the page
- Check browser console for errors (F12)
- Verify NFS backend logs

## Development

### Running in Debug Mode
```bash
export FLASK_ENV=development
python app.py
```

Debug mode enables:
- Auto-reload on code changes
- Detailed error messages
- Interactive debugger

### Customizing the UI
- Edit `static/css/style.css` for styling
- Edit `templates/*.html` for HTML structure
- Edit `static/js/dashboard.js` for client-side logic

## Security Notes

- This is a development/educational application
- Uses simple session-based authentication
- For production use, implement proper authentication (JWT, OAuth, etc.)
- Add HTTPS support
- Implement rate limiting
- Add input validation and sanitization

## Contributing

Feel free to fork and submit pull requests!

## License

Educational project - feel free to use and modify as needed.
