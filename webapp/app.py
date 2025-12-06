#!/usr/bin/env python3
"""
Flask Web Application for Network File System
This app provides a web interface to interact with the NFS backend
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_socketio import SocketIO, emit
import socket
import struct
import os
import hashlib
import secrets
from functools import wraps
from datetime import datetime, timedelta
from config import config

app = Flask(__name__)
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['DEBUG'] = config.DEBUG
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
socketio = SocketIO(app, cors_allowed_origins="*")

# NFS Configuration
NM_HOST = config.NM_HOST
NM_PORT = config.NM_PORT

# Simple user database (in production, use a real database)
# Format: {username: {'password_hash': hash, 'salt': salt, 'nfs_registered': bool}}
user_db = {}

# Protocol constants (from protocol.h)
MAX_FILENAME = 256
MAX_USERNAME = 64
MAX_DATA_SIZE = 4096
MAX_PATH = 1024

# Message Types
MSG_REQUEST = 1
MSG_RESPONSE = 2
MSG_ACK = 3
MSG_ERROR = 4

# Operation Types
OP_CREATE = 100
OP_READ = 101
OP_WRITE = 102
OP_DELETE = 103
OP_INFO = 104
OP_STREAM = 105
OP_LIST = 106
OP_VIEW = 107
OP_ADDACCESS = 108
OP_REMACCESS = 109
OP_EXEC = 110
OP_UNDO = 111
OP_CREATEFOLDER = 112
OP_MOVE = 113
OP_VIEWFOLDER = 114
OP_CHECKPOINT = 115
OP_VIEWCHECKPOINT = 116
OP_REVERT = 117
OP_LISTCHECKPOINTS = 118
OP_REQUESTACCESS = 119
OP_VIEWREQUESTS = 120
OP_APPROVEREQUEST = 121
OP_REJECTREQUEST = 122
OP_CLIENT_REGISTER = 201
OP_GET_SS_INFO = 300

# Error codes
ERR_SUCCESS = 0
ERR_FILE_NOT_FOUND = 1001
ERR_ACCESS_DENIED = 1002
ERR_SENTENCE_LOCKED = 1003
ERR_INVALID_INDEX = 1004
ERR_FILE_EXISTS = 1005
ERR_NOT_OWNER = 1006
ERR_NO_WRITE_ACCESS = 1007
ERR_NO_READ_ACCESS = 1008

ERROR_MESSAGES = {
    ERR_SUCCESS: "Success",
    ERR_FILE_NOT_FOUND: "File not found",
    ERR_ACCESS_DENIED: "Access denied",
    ERR_SENTENCE_LOCKED: "Sentence is locked",
    ERR_INVALID_INDEX: "Invalid index",
    ERR_FILE_EXISTS: "File already exists",
    ERR_NOT_OWNER: "Not the owner",
    ERR_NO_WRITE_ACCESS: "No write access",
    ERR_NO_READ_ACCESS: "No read access"
}

# Access Types
ACCESS_READ = 1
ACCESS_WRITE = 2
ACCESS_READ_WRITE = 3


class Message:
    """Message structure matching the C protocol from protocol.h"""
    # typedef struct {
    #     int msg_type;                  // 4 bytes
    #     int operation;                 // 4 bytes  
    #     int error_code;                // 4 bytes
    #     char username[64];             // 64 bytes
    #     char filename[256];            // 256 bytes
    #     char checkpoint_tag[256];      // 256 bytes
    #     char target_path[1024];        // 1024 bytes
    #     int sentence_index;            // 4 bytes
    #     int word_index;                // 4 bytes
    #     char ip[16];                   // 16 bytes
    #     int port1;                     // 4 bytes
    #     int port2;                     // 4 bytes
    #     int ss_id;                     // 4 bytes
    #     char data[4096];               // 4096 bytes
    # } Message;
    
    STRUCT_FORMAT = '!iii64s256s256s1024sii16siii4096s'
    STRUCT_SIZE = struct.calcsize(STRUCT_FORMAT)
    
    def __init__(self):
        self.msg_type = 0
        self.operation = 0
        self.error_code = 0
        self.username = b''
        self.filename = b''
        self.checkpoint_tag = b''
        self.target_path = b''
        self.sentence_index = 0
        self.word_index = 0
        self.ip = b''
        self.port1 = 0
        self.port2 = 0
        self.ss_id = 0
        self.data = b''
    
    def pack(self):
        """Pack message into binary format"""
        return struct.pack(
            self.STRUCT_FORMAT,
            self.msg_type,
            self.operation,
            self.error_code,
            self._pad_string(self.username, 64),
            self._pad_string(self.filename, 256),
            self._pad_string(self.checkpoint_tag, 256),
            self._pad_string(self.target_path, 1024),
            self.sentence_index,
            self.word_index,
            self._pad_string(self.ip, 16),
            self.port1,
            self.port2,
            self.ss_id,
            self._pad_string(self.data, 4096)
        )
    
    @classmethod
    def unpack(cls, data):
        """Unpack binary data into Message object"""
        msg = cls()
        unpacked = struct.unpack(cls.STRUCT_FORMAT, data)
        
        msg.msg_type = unpacked[0]
        msg.operation = unpacked[1]
        msg.error_code = unpacked[2]
        msg.username = cls._unpad_string(unpacked[3])
        msg.filename = cls._unpad_string(unpacked[4])
        msg.checkpoint_tag = cls._unpad_string(unpacked[5])
        msg.target_path = cls._unpad_string(unpacked[6])
        msg.sentence_index = unpacked[7]
        msg.word_index = unpacked[8]
        msg.ip = cls._unpad_string(unpacked[9])
        msg.port1 = unpacked[10]
        msg.port2 = unpacked[11]
        msg.ss_id = unpacked[12]
        msg.data = cls._unpad_string(unpacked[13])
        
        return msg
    
    @staticmethod
    def _pad_string(s, length):
        """Pad string to specified length"""
        if isinstance(s, str):
            s = s.encode('utf-8')
        return s[:length].ljust(length, b'\x00')
    
    @staticmethod
    def _unpad_string(b):
        """Remove padding from string"""
        return b.rstrip(b'\x00').decode('utf-8', errors='ignore')


class NFSClient:
    """Client to communicate with NFS backend using binary protocol"""
    
    def __init__(self, username):
        self.username = username
        self.nm_host = NM_HOST
        self.nm_port = NM_PORT
    
    def create_message(self, operation, **kwargs):
        """Create a binary message to send to the NFS"""
        msg = Message()
        msg.msg_type = MSG_REQUEST
        msg.operation = operation
        msg.error_code = 0
        msg.username = self.username
        msg.filename = kwargs.get('filename', '')
        msg.checkpoint_tag = kwargs.get('checkpoint_tag', '')
        msg.target_path = kwargs.get('target_path', '')
        msg.sentence_index = kwargs.get('sentence_index', 0)
        msg.word_index = kwargs.get('word_index', 0)
        msg.ip = kwargs.get('ip', '')
        msg.port1 = kwargs.get('port1', 0)
        msg.port2 = kwargs.get('port2', 0)
        msg.ss_id = kwargs.get('ss_id', 0)
        msg.data = kwargs.get('data', '')
        return msg
    
    def send_request(self, operation, **kwargs):
        """Send a request to the Name Server using binary protocol"""
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(30)  # Increased timeout
            sock.connect((self.nm_host, self.nm_port))
            
            # Create and pack message
            msg = self.create_message(operation, **kwargs)
            packed_msg = msg.pack()
            
            # Send entire message
            sock.sendall(packed_msg)
            
            # Receive response
            response_data = self._recv_all(sock, Message.STRUCT_SIZE)
            if not response_data:
                return {'error': 'No response from server', 'error_code': -1}
            
            # Unpack response
            response = Message.unpack(response_data)
            
            # Convert to dict for compatibility
            return {
                'msg_type': response.msg_type,
                'operation': response.operation,
                'error_code': response.error_code,
                'username': response.username,
                'filename': response.filename,
                'data': response.data,
                'ip': response.ip,
                'port1': response.port1,
                'port2': response.port2,
                'ss_id': response.ss_id
            }
            
        except socket.timeout:
            return {'error': 'Connection timeout. Is the Name Server running?', 'error_code': -1}
        except ConnectionRefusedError:
            return {'error': 'Cannot connect to NFS server. Is it running?', 'error_code': -1}
        except Exception as e:
            return {'error': f'Connection error: {str(e)}', 'error_code': -1}
        finally:
            if sock:
                sock.close()
    
    def _recv_all(self, sock, size):
        """Receive exactly size bytes from socket"""
        data = b''
        while len(data) < size:
            chunk = sock.recv(size - len(data))
            if not chunk:
                return None
            data += chunk
        return data
    
    def register(self):
        """Register client with Name Server"""
        return self.send_request(OP_CLIENT_REGISTER)
    
    def list_files(self):
        """List all files"""
        return self.send_request(OP_LIST)
    
    def view_files(self, view_flags=0):
        """View files with flags - view_flags uses sentence_index field"""
        return self.send_request(OP_VIEW, sentence_index=view_flags)
    
    def get_file_info(self, filename):
        """Get file information"""
        return self.send_request(OP_INFO, filename=filename)
    
    def read_file(self, filename):
        """Read file contents - needs to connect to Storage Server"""
        # First ask Name Server for Storage Server details
        nm_response = self.send_request(OP_GET_SS_INFO, filename=filename, operation=OP_READ)
        
        if 'error' in nm_response or nm_response.get('error_code', 0) != ERR_SUCCESS:
            return nm_response
        
        # Connect to Storage Server to read file
        ss_ip = nm_response.get('ip', '')
        ss_port = nm_response.get('port1', 0)
        
        if not ss_ip or not ss_port:
            return {'error': 'Invalid Storage Server information', 'error_code': -1}
        
        try:
            ss_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            ss_sock.settimeout(30)
            ss_sock.connect((ss_ip, ss_port))
            
            # Send READ request to Storage Server
            msg = self.create_message(OP_READ, filename=filename)
            ss_sock.sendall(msg.pack())
            
            # Receive response
            response_data = self._recv_all(ss_sock, Message.STRUCT_SIZE)
            if not response_data:
                return {'error': 'No response from Storage Server', 'error_code': -1}
            
            response = Message.unpack(response_data)
            ss_sock.close()
            
            return {
                'error_code': response.error_code,
                'data': response.data,
                'filename': response.filename
            }
        except Exception as e:
            return {'error': f'Storage Server error: {str(e)}', 'error_code': -1}
    
    def create_file(self, filename):
        """Create a new file"""
        return self.send_request(OP_CREATE, filename=filename)
    
    def write_file(self, filename, data, sentence_index=0):
        """Write to a file - needs to connect to Storage Server"""
        # First ask Name Server for Storage Server details
        nm_response = self.send_request(OP_GET_SS_INFO, filename=filename)
        
        if 'error' in nm_response or nm_response.get('error_code', 0) != ERR_SUCCESS:
            return nm_response
        
        # Connect to Storage Server to write file
        ss_ip = nm_response.get('ip', '')
        ss_port = nm_response.get('port1', 0)
        
        if not ss_ip or not ss_port:
            return {'error': 'Invalid Storage Server information', 'error_code': -1}
        
        try:
            ss_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            ss_sock.settimeout(30)
            ss_sock.connect((ss_ip, ss_port))
            
            # Send WRITE request to Storage Server
            msg = self.create_message(OP_WRITE, filename=filename, data=data, sentence_index=sentence_index)
            ss_sock.sendall(msg.pack())
            
            # Receive response
            response_data = self._recv_all(ss_sock, Message.STRUCT_SIZE)
            if not response_data:
                return {'error': 'No response from Storage Server', 'error_code': -1}
            
            response = Message.unpack(response_data)
            ss_sock.close()
            
            return {
                'error_code': response.error_code,
                'data': response.data
            }
        except Exception as e:
            return {'error': f'Storage Server error: {str(e)}', 'error_code': -1}
    
    def delete_file(self, filename):
        """Delete a file"""
        return self.send_request(OP_DELETE, filename=filename)
    
    def create_folder(self, foldername):
        """Create a new folder"""
        return self.send_request(OP_CREATEFOLDER, filename=foldername)
    
    def view_folder(self, foldername):
        """View folder contents"""
        return self.send_request(OP_VIEWFOLDER, filename=foldername)
    
    def add_access(self, filename, target_user, access_type):
        """Add access permissions - target_user in data field, access_type in sentence_index"""
        return self.send_request(OP_ADDACCESS, filename=filename, data=target_user, sentence_index=access_type)
    
    def remove_access(self, filename, target_user):
        """Remove access permissions - target_user in data field"""
        return self.send_request(OP_REMACCESS, filename=filename, data=target_user)
    
    def move_file(self, filename, target_path):
        """Move/rename a file"""
        return self.send_request(OP_MOVE, filename=filename, target_path=target_path)
    
    def create_checkpoint(self, filename, checkpoint_tag):
        """Create a checkpoint"""
        return self.send_request(OP_CHECKPOINT, filename=filename, checkpoint_tag=checkpoint_tag)
    
    def list_checkpoints(self, filename):
        """List checkpoints for a file"""
        return self.send_request(OP_LISTCHECKPOINTS, filename=filename)
    
    def revert_checkpoint(self, filename, checkpoint_tag):
        """Revert to a checkpoint"""
        return self.send_request(OP_REVERT, filename=filename, checkpoint_tag=checkpoint_tag)


# Authentication helper functions
def hash_password(password, salt=None):
    """Hash password with salt using SHA-256"""
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return pwd_hash, salt

def verify_password(password, password_hash, salt):
    """Verify password against hash"""
    pwd_hash, _ = hash_password(password, salt)
    return pwd_hash == password_hash

def register_user(username, password):
    """Register a new user"""
    if username in user_db:
        return False, "Username already exists"
    
    if len(password) < 6:
        return False, "Password must be at least 6 characters"
    
    pwd_hash, salt = hash_password(password)
    user_db[username] = {
        'password_hash': pwd_hash,
        'salt': salt,
        'nfs_registered': False
    }
    return True, "User registered successfully"

def authenticate_user(username, password):
    """Authenticate user"""
    if username not in user_db:
        return False, "Invalid username or password"
    
    user = user_db[username]
    if verify_password(password, user['password_hash'], user['salt']):
        return True, "Authentication successful"
    return False, "Invalid username or password"


# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


# Routes
@app.route('/')
def index():
    """Home page - redirect to login or dashboard"""
    if 'username' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login/Register page"""
    if request.method == 'POST':
        action = request.form.get('action', 'login')
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            flash('Username and password are required', 'error')
            return render_template('login.html')
        
        if action == 'register':
            # Register new user
            success, message = register_user(username, password)
            if not success:
                flash(message, 'error')
                return render_template('login.html')
            
            # After successful registration, proceed to login
            flash('Registration successful! Logging you in...', 'success')
        
        # Authenticate user
        success, message = authenticate_user(username, password)
        if not success:
            flash(message, 'error')
            return render_template('login.html')
        
        # Register with NFS backend
        client = NFSClient(username)
        response = client.register()
        
        if 'error' in response:
            flash(f'NFS Connection error: {response["error"]}', 'error')
            return render_template('login.html')
        
        if response.get('error_code', 0) != ERR_SUCCESS:
            flash(f'NFS Registration failed: {response.get("data", "Unknown error")}', 'error')
            return render_template('login.html')
        
        # Mark as registered with NFS
        user_db[username]['nfs_registered'] = True
        
        # Set session
        session.permanent = True
        session['username'] = username
        session['authenticated'] = True
        
        flash(f'Welcome, {username}!', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')


@app.route('/logout')
def logout():
    """Logout"""
    session.pop('username', None)
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard"""
    return render_template('dashboard.html', username=session['username'])


# API Routes
@app.route('/api/files', methods=['GET'])
@login_required
def api_list_files():
    """API: List all files (use VIEW instead of LIST)"""
    client = NFSClient(session['username'])
    # Use VIEW (OP_VIEW) to get file list, not LIST (which shows users)
    response = client.view_files(view_flags=0)
    return jsonify(response)


@app.route('/api/files/view', methods=['GET'])
@login_required
def api_view_files():
    """API: View files with flags"""
    view_flags = int(request.args.get('flags', 0))
    client = NFSClient(session['username'])
    response = client.view_files(view_flags)
    return jsonify(response)


@app.route('/api/file/<path:filename>', methods=['GET'])
@login_required
def api_get_file(filename):
    """API: Get file info or content"""
    action = request.args.get('action', 'info')
    client = NFSClient(session['username'])
    
    if action == 'read':
        response = client.read_file(filename)
    else:
        response = client.get_file_info(filename)
    
    return jsonify(response)


@app.route('/api/file', methods=['POST'])
@login_required
def api_create_file():
    """API: Create a new file"""
    data = request.get_json()
    filename = data.get('filename', '')
    
    if not filename:
        return jsonify({'error': 'Filename is required', 'error_code': -1}), 400
    
    client = NFSClient(session['username'])
    response = client.create_file(filename)
    
    # Add better error handling
    if 'error' in response:
        return jsonify(response), 500
    
    if response.get('error_code', 0) != ERR_SUCCESS:
        error_msg = ERROR_MESSAGES.get(response.get('error_code'), 'Unknown error')
        return jsonify({
            'error': error_msg,
            'error_code': response.get('error_code'),
            'data': response.get('data', '')
        }), 400
    
    return jsonify({
        'success': True,
        'message': f'File "{filename}" created successfully',
        'error_code': 0
    })


@app.route('/api/file/<path:filename>', methods=['PUT'])
@login_required
def api_write_file(filename):
    """API: Write to a file"""
    data = request.get_json()
    content = data.get('content', '')
    sentence_index = data.get('sentence_index', 0)
    
    client = NFSClient(session['username'])
    response = client.write_file(filename, content, sentence_index)
    
    # Add better error handling
    if 'error' in response:
        return jsonify(response), 500
    
    if response.get('error_code', 0) != ERR_SUCCESS:
        error_msg = ERROR_MESSAGES.get(response.get('error_code'), 'Unknown error')
        return jsonify({
            'error': error_msg,
            'error_code': response.get('error_code'),
            'data': response.get('data', '')
        }), 400
    
    return jsonify({
        'success': True,
        'message': 'File saved successfully',
        'error_code': 0
    })


@app.route('/api/file/<path:filename>', methods=['DELETE'])
@login_required
def api_delete_file(filename):
    """API: Delete a file"""
    client = NFSClient(session['username'])
    response = client.delete_file(filename)
    
    # Add better error handling
    if 'error' in response:
        return jsonify(response), 500
    
    if response.get('error_code', 0) != ERR_SUCCESS:
        error_msg = ERROR_MESSAGES.get(response.get('error_code'), 'Unknown error')
        return jsonify({
            'error': error_msg,
            'error_code': response.get('error_code'),
            'data': response.get('data', '')
        }), 400
    
    return jsonify({
        'success': True,
        'message': f'File "{filename}" deleted successfully',
        'error_code': 0
    })


@app.route('/api/folder', methods=['POST'])
@login_required
def api_create_folder():
    """API: Create a new folder"""
    data = request.get_json()
    foldername = data.get('foldername', '')
    
    if not foldername:
        return jsonify({'error': 'Folder name is required', 'error_code': -1}), 400
    
    client = NFSClient(session['username'])
    response = client.create_folder(foldername)
    
    # Add better error handling
    if 'error' in response:
        return jsonify(response), 500
    
    if response.get('error_code', 0) != ERR_SUCCESS:
        error_msg = ERROR_MESSAGES.get(response.get('error_code'), 'Unknown error')
        return jsonify({
            'error': error_msg,
            'error_code': response.get('error_code'),
            'data': response.get('data', '')
        }), 400
    
    return jsonify({
        'success': True,
        'message': f'Folder "{foldername}" created successfully',
        'error_code': 0
    })


@app.route('/api/folder/<path:foldername>', methods=['GET'])
@login_required
def api_view_folder(foldername):
    """API: View folder contents"""
    client = NFSClient(session['username'])
    response = client.view_folder(foldername)
    return jsonify(response)


@app.route('/api/access', methods=['POST'])
@login_required
def api_manage_access():
    """API: Add or remove access"""
    data = request.get_json()
    action = data.get('action', 'add')
    filename = data.get('filename', '')
    target_user = data.get('target_user', '')
    access_type = data.get('access_type', ACCESS_READ)
    
    if not filename or not target_user:
        return jsonify({'error': 'Filename and target user are required'}), 400
    
    client = NFSClient(session['username'])
    
    if action == 'remove':
        response = client.remove_access(filename, target_user)
    else:
        response = client.add_access(filename, target_user, access_type)
    
    return jsonify(response)


@app.route('/api/move', methods=['POST'])
@login_required
def api_move_file():
    """API: Move/rename a file"""
    data = request.get_json()
    filename = data.get('filename', '')
    target_path = data.get('target_path', '')
    
    if not filename or not target_path:
        return jsonify({'error': 'Filename and target path are required'}), 400
    
    client = NFSClient(session['username'])
    response = client.move_file(filename, target_path)
    return jsonify(response)


@app.route('/api/checkpoint', methods=['POST'])
@login_required
def api_create_checkpoint():
    """API: Create a checkpoint"""
    data = request.get_json()
    filename = data.get('filename', '')
    checkpoint_tag = data.get('checkpoint_tag', '')
    
    if not filename or not checkpoint_tag:
        return jsonify({'error': 'Filename and checkpoint tag are required'}), 400
    
    client = NFSClient(session['username'])
    response = client.create_checkpoint(filename, checkpoint_tag)
    return jsonify(response)


@app.route('/api/checkpoint/<path:filename>', methods=['GET'])
@login_required
def api_list_checkpoints(filename):
    """API: List checkpoints"""
    client = NFSClient(session['username'])
    response = client.list_checkpoints(filename)
    return jsonify(response)


@app.route('/api/checkpoint/revert', methods=['POST'])
@login_required
def api_revert_checkpoint():
    """API: Revert to a checkpoint"""
    data = request.get_json()
    filename = data.get('filename', '')
    checkpoint_tag = data.get('checkpoint_tag', '')
    
    if not filename or not checkpoint_tag:
        return jsonify({'error': 'Filename and checkpoint tag are required'}), 400
    
    client = NFSClient(session['username'])
    response = client.revert_checkpoint(filename, checkpoint_tag)
    return jsonify(response)


@app.route('/api/active-users', methods=['GET'])
@login_required
def api_active_users():
    """API: Get list of active users (clients)"""
    client = NFSClient(session['username'])
    # Use view_files with flag to show clients/users
    # The backend LIST command shows files, storage servers, and clients
    # We need to parse the output to extract the clients section
    response = client.view_files(view_flags=0)  # This will show all info including users
    
    # The response will contain the full listing which includes users
    # The JavaScript will parse out the user entries (lines starting with "->")
    return jsonify(response)


if __name__ == '__main__':
    config.display()
    print("Starting Flask application...")
    print("Access the web interface from any device on your network:")
    print(f"  Local: http://localhost:{config.WEB_PORT}")
    print(f"  Network: http://<your-ip>:{config.WEB_PORT}")
    print("\nPress Ctrl+C to stop\n")
    socketio.run(app, host=config.WEB_HOST, port=config.WEB_PORT, debug=config.DEBUG)
