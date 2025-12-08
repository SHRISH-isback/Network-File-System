#!/usr/bin/env node
/**
 * Express Web Application for Network File System
 * This app provides a web interface to interact with the NFS backend
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const net = require('net');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();

// Configuration
const NM_HOST = process.env.NM_HOST || '127.0.0.1';
const NM_PORT = parseInt(process.env.NM_PORT || '8080');
const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = parseInt(process.env.WEB_PORT || '3000');
const SECRET_KEY = process.env.SECRET_KEY || crypto.randomBytes(32).toString('hex');

// Protocol constants (from protocol.h)
const MAX_FILENAME = 256;
const MAX_USERNAME = 64;
const MAX_DATA_SIZE = 4096;
const MAX_PATH = 1024;

// Message Types
const MSG_REQUEST = 1;
const MSG_RESPONSE = 2;
const MSG_ACK = 3;
const MSG_ERROR = 4;

// Operation Types
const OP_CREATE = 100;
const OP_READ = 101;
const OP_WRITE = 102;
const OP_DELETE = 103;
const OP_INFO = 104;
const OP_STREAM = 105;
const OP_LIST = 106;
const OP_VIEW = 107;
const OP_ADDACCESS = 108;
const OP_REMACCESS = 109;
const OP_EXEC = 110;
const OP_UNDO = 111;
const OP_CREATEFOLDER = 112;
const OP_MOVE = 113;
const OP_VIEWFOLDER = 114;
const OP_CHECKPOINT = 115;
const OP_VIEWCHECKPOINT = 116;
const OP_REVERT = 117;
const OP_LISTCHECKPOINTS = 118;
const OP_REQUESTACCESS = 119;
const OP_VIEWREQUESTS = 120;
const OP_APPROVEREQUEST = 121;
const OP_REJECTREQUEST = 122;
const OP_CLIENT_REGISTER = 201;
const OP_GET_SS_INFO = 300;

// Error codes
const ERR_SUCCESS = 0;
const ERR_FILE_NOT_FOUND = 1001;
const ERR_ACCESS_DENIED = 1002;
const ERR_SENTENCE_LOCKED = 1003;
const ERR_INVALID_INDEX = 1004;
const ERR_FILE_EXISTS = 1005;
const ERR_NOT_OWNER = 1006;
const ERR_NO_WRITE_ACCESS = 1007;
const ERR_NO_READ_ACCESS = 1008;

const ERROR_MESSAGES = {
    [ERR_SUCCESS]: "Success",
    [ERR_FILE_NOT_FOUND]: "File not found",
    [ERR_ACCESS_DENIED]: "Access denied",
    [ERR_SENTENCE_LOCKED]: "Sentence is locked",
    [ERR_INVALID_INDEX]: "Invalid index",
    [ERR_FILE_EXISTS]: "File already exists",
    [ERR_NOT_OWNER]: "Not the owner",
    [ERR_NO_WRITE_ACCESS]: "No write access",
    [ERR_NO_READ_ACCESS]: "No read access"
};

// Access Types
const ACCESS_READ = 1;
const ACCESS_WRITE = 2;
const ACCESS_READ_WRITE = 3;

// Simple user database (in production, use a real database)
const userDb = {};

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production' // true in production with HTTPS
    }
}));

// Template engine setup (using EJS for compatibility with HTML templates)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));
app.use(expressLayouts);
app.set('layout', 'base');
app.set('layout extractScripts', true);

// Message class for binary protocol
class Message {
    constructor() {
        this.msgType = 0;
        this.operation = 0;
        this.errorCode = 0;
        this.username = '';
        this.filename = '';
        this.checkpointTag = '';
        this.targetPath = '';
        this.sentenceIndex = 0;
        this.wordIndex = 0;
        this.ip = '';
        this.port1 = 0;
        this.port2 = 0;
        this.ssId = 0;
        this.data = '';
    }

    static getStructSize() {
        // 3 ints (12) + 64 + 256 + 256 + 1024 + 2 ints (8) + 16 + 3 ints (12) + 4096
        return 12 + 64 + 256 + 256 + 1024 + 8 + 16 + 12 + 4096;
    }

    pack() {
        const buffer = Buffer.alloc(Message.getStructSize());
        let offset = 0;

        // Write integers (big-endian)
        buffer.writeInt32BE(this.msgType, offset); offset += 4;
        buffer.writeInt32BE(this.operation, offset); offset += 4;
        buffer.writeInt32BE(this.errorCode, offset); offset += 4;

        // Write strings (null-padded)
        this._writeString(buffer, this.username, offset, MAX_USERNAME); offset += MAX_USERNAME;
        this._writeString(buffer, this.filename, offset, MAX_FILENAME); offset += MAX_FILENAME;
        this._writeString(buffer, this.checkpointTag, offset, MAX_FILENAME); offset += MAX_FILENAME;
        this._writeString(buffer, this.targetPath, offset, MAX_PATH); offset += MAX_PATH;

        // Write more integers
        buffer.writeInt32BE(this.sentenceIndex, offset); offset += 4;
        buffer.writeInt32BE(this.wordIndex, offset); offset += 4;

        // Write IP and ports
        this._writeString(buffer, this.ip, offset, 16); offset += 16;
        buffer.writeInt32BE(this.port1, offset); offset += 4;
        buffer.writeInt32BE(this.port2, offset); offset += 4;
        buffer.writeInt32BE(this.ssId, offset); offset += 4;

        // Write data
        this._writeString(buffer, this.data, offset, MAX_DATA_SIZE);

        return buffer;
    }

    static unpack(buffer) {
        const msg = new Message();
        let offset = 0;

        // Read integers
        msg.msgType = buffer.readInt32BE(offset); offset += 4;
        msg.operation = buffer.readInt32BE(offset); offset += 4;
        msg.errorCode = buffer.readInt32BE(offset); offset += 4;

        // Read strings
        msg.username = this._readString(buffer, offset, MAX_USERNAME); offset += MAX_USERNAME;
        msg.filename = this._readString(buffer, offset, MAX_FILENAME); offset += MAX_FILENAME;
        msg.checkpointTag = this._readString(buffer, offset, MAX_FILENAME); offset += MAX_FILENAME;
        msg.targetPath = this._readString(buffer, offset, MAX_PATH); offset += MAX_PATH;

        // Read more integers
        msg.sentenceIndex = buffer.readInt32BE(offset); offset += 4;
        msg.wordIndex = buffer.readInt32BE(offset); offset += 4;

        // Read IP and ports
        msg.ip = this._readString(buffer, offset, 16); offset += 16;
        msg.port1 = buffer.readInt32BE(offset); offset += 4;
        msg.port2 = buffer.readInt32BE(offset); offset += 4;
        msg.ssId = buffer.readInt32BE(offset); offset += 4;

        // Read data
        msg.data = this._readString(buffer, offset, MAX_DATA_SIZE);

        return msg;
    }

    _writeString(buffer, str, offset, maxLen) {
        const strBuf = Buffer.from(str || '', 'utf8').slice(0, maxLen);
        strBuf.copy(buffer, offset);
        // Fill rest with zeros
        buffer.fill(0, offset + strBuf.length, offset + maxLen);
    }

    static _readString(buffer, offset, maxLen) {
        const endOffset = offset + maxLen;
        let nullIndex = buffer.indexOf(0, offset);
        if (nullIndex === -1 || nullIndex > endOffset) {
            nullIndex = endOffset;
        }
        return buffer.slice(offset, nullIndex).toString('utf8');
    }
}

// NFS Client class
class NFSClient {
    constructor(username) {
        this.username = username;
        this.nmHost = NM_HOST;
        this.nmPort = NM_PORT;
    }

    createMessage(operation, options = {}) {
        const msg = new Message();
        msg.msgType = MSG_REQUEST;
        msg.operation = operation;
        msg.errorCode = 0;
        msg.username = this.username;
        msg.filename = options.filename || '';
        msg.checkpointTag = options.checkpointTag || '';
        msg.targetPath = options.targetPath || '';
        msg.sentenceIndex = options.sentenceIndex || 0;
        msg.wordIndex = options.wordIndex || 0;
        msg.ip = options.ip || '';
        msg.port1 = options.port1 || 0;
        msg.port2 = options.port2 || 0;
        msg.ssId = options.ssId || 0;
        msg.data = options.data || '';
        return msg;
    }

    async sendRequest(operation, options = {}) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(30000); // 30 second timeout

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ error: 'Connection timeout. Is the Name Server running?', errorCode: -1 });
            });

            socket.on('error', (err) => {
                if (err.code === 'ECONNREFUSED') {
                    resolve({ error: 'Cannot connect to NFS server. Is it running?', errorCode: -1 });
                } else {
                    resolve({ error: `Connection error: ${err.message}`, errorCode: -1 });
                }
            });

            socket.connect(this.nmPort, this.nmHost, () => {
                // Create and pack message
                const msg = this.createMessage(operation, options);
                const packedMsg = msg.pack();

                // Send message
                socket.write(packedMsg);
            });

            // Receive response
            let responseData = Buffer.alloc(0);
            socket.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);

                // Check if we have received the full message
                if (responseData.length >= Message.getStructSize()) {
                    socket.end();

                    // Unpack response
                    const response = Message.unpack(responseData);

                    // Convert to object
                    resolve({
                        msgType: response.msgType,
                        operation: response.operation,
                        errorCode: response.errorCode,
                        username: response.username,
                        filename: response.filename,
                        data: response.data,
                        ip: response.ip,
                        port1: response.port1,
                        port2: response.port2,
                        ssId: response.ssId
                    });
                }
            });
        });
    }

    async register() {
        return this.sendRequest(OP_CLIENT_REGISTER);
    }

    async listFiles() {
        return this.sendRequest(OP_LIST);
    }

    async viewFiles(viewFlags = 0) {
        return this.sendRequest(OP_VIEW, { sentenceIndex: viewFlags });
    }

    async getFileInfo(filename) {
        return this.sendRequest(OP_INFO, { filename });
    }

    async readFile(filename) {
        // First ask Name Server for Storage Server details
        const nmResponse = await this.sendRequest(OP_GET_SS_INFO, { filename, operation: OP_READ });

        if (nmResponse.error || nmResponse.errorCode !== ERR_SUCCESS) {
            return nmResponse;
        }

        // Connect to Storage Server to read file
        const ssIp = nmResponse.ip;
        const ssPort = nmResponse.port1;

        if (!ssIp || !ssPort) {
            return { error: 'Invalid Storage Server information', errorCode: -1 };
        }

        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(30000);

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ error: 'Storage Server timeout', errorCode: -1 });
            });

            socket.on('error', (err) => {
                resolve({ error: `Storage Server error: ${err.message}`, errorCode: -1 });
            });

            socket.connect(ssPort, ssIp, () => {
                // Send READ request to Storage Server
                const msg = this.createMessage(OP_READ, { filename });
                socket.write(msg.pack());
            });

            let responseData = Buffer.alloc(0);
            socket.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);

                if (responseData.length >= Message.getStructSize()) {
                    socket.end();
                    const response = Message.unpack(responseData);
                    resolve({
                        errorCode: response.errorCode,
                        data: response.data,
                        filename: response.filename
                    });
                }
            });
        });
    }

    async createFile(filename) {
        return this.sendRequest(OP_CREATE, { filename });
    }

    async writeFile(filename, data, sentenceIndex = 0) {
        // First ask Name Server for Storage Server details
        const nmResponse = await this.sendRequest(OP_GET_SS_INFO, { filename });

        if (nmResponse.error || nmResponse.errorCode !== ERR_SUCCESS) {
            return nmResponse;
        }

        const ssIp = nmResponse.ip;
        const ssPort = nmResponse.port1;

        if (!ssIp || !ssPort) {
            return { error: 'Invalid Storage Server information', errorCode: -1 };
        }

        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(30000);

            socket.on('timeout', () => {
                socket.destroy();
                resolve({ error: 'Storage Server timeout', errorCode: -1 });
            });

            socket.on('error', (err) => {
                resolve({ error: `Storage Server error: ${err.message}`, errorCode: -1 });
            });

            socket.connect(ssPort, ssIp, () => {
                // Send WRITE request to Storage Server
                const msg = this.createMessage(OP_WRITE, { filename, data, sentenceIndex });
                socket.write(msg.pack());
            });

            let responseData = Buffer.alloc(0);
            socket.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);

                if (responseData.length >= Message.getStructSize()) {
                    socket.end();
                    const response = Message.unpack(responseData);
                    resolve({
                        errorCode: response.errorCode,
                        data: response.data
                    });
                }
            });
        });
    }

    async deleteFile(filename) {
        return this.sendRequest(OP_DELETE, { filename });
    }

    async createFolder(foldername) {
        return this.sendRequest(OP_CREATEFOLDER, { filename: foldername });
    }

    async viewFolder(foldername) {
        return this.sendRequest(OP_VIEWFOLDER, { filename: foldername });
    }

    async addAccess(filename, targetUser, accessType) {
        return this.sendRequest(OP_ADDACCESS, { 
            filename, 
            data: targetUser, 
            sentenceIndex: accessType 
        });
    }

    async removeAccess(filename, targetUser) {
        return this.sendRequest(OP_REMACCESS, { filename, data: targetUser });
    }

    async moveFile(filename, targetPath) {
        return this.sendRequest(OP_MOVE, { filename, targetPath });
    }

    async createCheckpoint(filename, checkpointTag) {
        return this.sendRequest(OP_CHECKPOINT, { filename, checkpointTag });
    }

    async listCheckpoints(filename) {
        return this.sendRequest(OP_LISTCHECKPOINTS, { filename });
    }

    async revertCheckpoint(filename, checkpointTag) {
        return this.sendRequest(OP_REVERT, { filename, checkpointTag });
    }
}

// Authentication helper functions
function hashPassword(password, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.createHash('sha256').update(password + salt).digest('hex');
    return { hash, salt };
}

function verifyPassword(password, passwordHash, salt) {
    const { hash } = hashPassword(password, salt);
    return hash === passwordHash;
}

function registerUser(username, password) {
    if (userDb[username]) {
        return { success: false, message: 'Username already exists' };
    }

    if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
    }

    const { hash, salt } = hashPassword(password);
    userDb[username] = {
        passwordHash: hash,
        salt: salt,
        nfsRegistered: false
    };

    return { success: true, message: 'User registered successfully' };
}

function authenticateUser(username, password) {
    if (!userDb[username]) {
        return { success: false, message: 'Invalid username or password' };
    }

    const user = userDb[username];
    if (verifyPassword(password, user.passwordHash, user.salt)) {
        return { success: true, message: 'Authentication successful' };
    }

    return { success: false, message: 'Invalid username or password' };
}

// Login required middleware
function loginRequired(req, res, next) {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    next();
}

// Routes
app.get('/', (req, res) => {
    if (req.session.username) {
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login', { messages: req.session.messages || [] });
    req.session.messages = [];
});

app.post('/login', async (req, res) => {
    const { action, username, password } = req.body;

    if (!username || !password) {
        req.session.messages = [{ type: 'error', text: 'Username and password are required' }];
        return res.redirect('/login');
    }

    if (action === 'register') {
        const result = registerUser(username, password);
        if (!result.success) {
            req.session.messages = [{ type: 'error', text: result.message }];
            return res.redirect('/login');
        }
        req.session.messages = [{ type: 'success', text: 'Registration successful! Logging you in...' }];
    }

    const authResult = authenticateUser(username, password);
    if (!authResult.success) {
        req.session.messages = [{ type: 'error', text: authResult.message }];
        return res.redirect('/login');
    }

    // Register with NFS backend
    const client = new NFSClient(username);
    const response = await client.register();

    if (response.error) {
        req.session.messages = [{ type: 'error', text: `NFS Connection error: ${response.error}` }];
        return res.redirect('/login');
    }

    if (response.errorCode !== ERR_SUCCESS) {
        req.session.messages = [{ type: 'error', text: `NFS Registration failed: ${response.data || 'Unknown error'}` }];
        return res.redirect('/login');
    }

    // Mark as registered with NFS
    userDb[username].nfsRegistered = true;

    // Set session
    req.session.username = username;
    req.session.authenticated = true;
    req.session.messages = [{ type: 'success', text: `Welcome, ${username}!` }];

    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/dashboard', loginRequired, (req, res) => {
    res.render('dashboard', { username: req.session.username });
});

// API Routes
app.get('/api/files', loginRequired, async (req, res) => {
    const client = new NFSClient(req.session.username);
    const response = await client.viewFiles(0);
    res.json(response);
});

app.get('/api/files/view', loginRequired, async (req, res) => {
    const viewFlags = parseInt(req.query.flags || '0');
    const client = new NFSClient(req.session.username);
    const response = await client.viewFiles(viewFlags);
    res.json(response);
});

app.get('/api/file/:filename', loginRequired, async (req, res) => {
    const { filename } = req.params;
    const action = req.query.action || 'info';
    const client = new NFSClient(req.session.username);

    let response;
    if (action === 'read') {
        response = await client.readFile(filename);
    } else {
        response = await client.getFileInfo(filename);
    }

    res.json(response);
});

app.post('/api/file', loginRequired, async (req, res) => {
    const { filename } = req.body;

    if (!filename) {
        return res.status(400).json({ error: 'Filename is required', errorCode: -1 });
    }

    const client = new NFSClient(req.session.username);
    const response = await client.createFile(filename);

    if (response.error) {
        return res.status(500).json(response);
    }

    if (response.errorCode !== ERR_SUCCESS) {
        const errorMsg = ERROR_MESSAGES[response.errorCode] || 'Unknown error';
        return res.status(400).json({
            error: errorMsg,
            errorCode: response.errorCode,
            data: response.data || ''
        });
    }

    res.json({
        success: true,
        message: `File "${filename}" created successfully`,
        errorCode: 0
    });
});

app.put('/api/file/:filename', loginRequired, async (req, res) => {
    const { filename } = req.params;
    const { content, sentence_index } = req.body;
    const sentenceIndex = sentence_index || 0;

    const client = new NFSClient(req.session.username);
    const response = await client.writeFile(filename, content || '', sentenceIndex);

    if (response.error) {
        return res.status(500).json(response);
    }

    if (response.errorCode !== ERR_SUCCESS) {
        const errorMsg = ERROR_MESSAGES[response.errorCode] || 'Unknown error';
        return res.status(400).json({
            error: errorMsg,
            errorCode: response.errorCode,
            data: response.data || ''
        });
    }

    res.json({
        success: true,
        message: 'File saved successfully',
        errorCode: 0
    });
});

app.delete('/api/file/:filename', loginRequired, async (req, res) => {
    const { filename } = req.params;
    const client = new NFSClient(req.session.username);
    const response = await client.deleteFile(filename);

    if (response.error) {
        return res.status(500).json(response);
    }

    if (response.errorCode !== ERR_SUCCESS) {
        const errorMsg = ERROR_MESSAGES[response.errorCode] || 'Unknown error';
        return res.status(400).json({
            error: errorMsg,
            errorCode: response.errorCode,
            data: response.data || ''
        });
    }

    res.json({
        success: true,
        message: `File "${filename}" deleted successfully`,
        errorCode: 0
    });
});

app.post('/api/folder', loginRequired, async (req, res) => {
    const { foldername } = req.body;

    if (!foldername) {
        return res.status(400).json({ error: 'Folder name is required', errorCode: -1 });
    }

    const client = new NFSClient(req.session.username);
    const response = await client.createFolder(foldername);

    if (response.error) {
        return res.status(500).json(response);
    }

    if (response.errorCode !== ERR_SUCCESS) {
        const errorMsg = ERROR_MESSAGES[response.errorCode] || 'Unknown error';
        return res.status(400).json({
            error: errorMsg,
            errorCode: response.errorCode,
            data: response.data || ''
        });
    }

    res.json({
        success: true,
        message: `Folder "${foldername}" created successfully`,
        errorCode: 0
    });
});

app.get('/api/folder/:foldername', loginRequired, async (req, res) => {
    const { foldername } = req.params;
    const client = new NFSClient(req.session.username);
    const response = await client.viewFolder(foldername);
    res.json(response);
});

app.post('/api/access', loginRequired, async (req, res) => {
    const { action, filename, target_user, access_type } = req.body;
    const accessType = access_type || ACCESS_READ;

    if (!filename || !target_user) {
        return res.status(400).json({ error: 'Filename and target user are required' });
    }

    const client = new NFSClient(req.session.username);
    let response;

    if (action === 'remove') {
        response = await client.removeAccess(filename, target_user);
    } else {
        response = await client.addAccess(filename, target_user, accessType);
    }

    res.json(response);
});

app.post('/api/move', loginRequired, async (req, res) => {
    const { filename, target_path } = req.body;

    if (!filename || !target_path) {
        return res.status(400).json({ error: 'Filename and target path are required' });
    }

    const client = new NFSClient(req.session.username);
    const response = await client.moveFile(filename, target_path);
    res.json(response);
});

app.post('/api/checkpoint', loginRequired, async (req, res) => {
    const { filename, checkpoint_tag } = req.body;

    if (!filename || !checkpoint_tag) {
        return res.status(400).json({ error: 'Filename and checkpoint tag are required' });
    }

    const client = new NFSClient(req.session.username);
    const response = await client.createCheckpoint(filename, checkpoint_tag);
    res.json(response);
});

app.get('/api/checkpoint/:filename', loginRequired, async (req, res) => {
    const { filename } = req.params;
    const client = new NFSClient(req.session.username);
    const response = await client.listCheckpoints(filename);
    res.json(response);
});

app.post('/api/checkpoint/revert', loginRequired, async (req, res) => {
    const { filename, checkpoint_tag } = req.body;

    if (!filename || !checkpoint_tag) {
        return res.status(400).json({ error: 'Filename and checkpoint tag are required' });
    }

    const client = new NFSClient(req.session.username);
    const response = await client.revertCheckpoint(filename, checkpoint_tag);
    res.json(response);
});

app.get('/api/active-users', loginRequired, async (req, res) => {
    const client = new NFSClient(req.session.username);
    const response = await client.viewFiles(0);
    res.json(response);
});

// For Vercel serverless deployment
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // Start server for local development
    const server = app.listen(WEB_PORT, WEB_HOST, () => {
        console.log('\n' + '='.repeat(50));
        console.log(' NFS Web Application Configuration');
        console.log('='.repeat(50));
        console.log(`  Name Server: ${NM_HOST}:${NM_PORT}`);
        console.log(`  Web Interface: http://${WEB_HOST}:${WEB_PORT}`);
        console.log('='.repeat(50));
        console.log('\nStarting Express application...');
        console.log('Access the web interface from any device on your network:');
        console.log(`  Local: http://localhost:${WEB_PORT}`);
        console.log(`  Network: http://<your-ip>:${WEB_PORT}`);
        console.log('\nPress Ctrl+C to stop\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
        });
    });
}
