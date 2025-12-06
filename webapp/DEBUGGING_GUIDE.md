# Debugging Guide for NFS Web App

## Quick Debugging Steps

### 1. Check if all services are running

```bash
# Check if Name Server is running
ps aux | grep name_server

# Check if Storage Servers are running
ps aux | grep storage_server

# Check if Flask webapp is running
ps aux | grep flask
```

### 2. Test Backend Connectivity

Open browser console (F12) and check for errors when:
- Loading the dashboard
- Clicking any button
- Creating files/folders

### 3. Common Issues and Fixes

#### Issue: Buttons don't respond when clicked
**Symptoms:**
- Clicking "New File", "New Folder", "Save", etc. does nothing
- No console errors

**Fix:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify Bootstrap is loaded: Type `bootstrap` in console - should show an object
4. Verify jQuery is NOT interfering (we use vanilla JS)

**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check if JavaScript file is loaded: View Page Source → find dashboard.js

#### Issue: Modals don't close after action
**Symptoms:**
- Modal stays open after creating file/folder
- Background becomes unresponsive

**Fix:**
- Updated JavaScript to properly call `.hide()` on modals
- Added proper event handling for button clicks
- Buttons now show loading state during operations

#### Issue: Users shown as files
**Symptoms:**
- Lines starting with `->` appear in files list

**Fix:**
- Updated `displayFiles()` function to filter lines starting with `->`
- These are user entries from the Name Server response

#### Issue: Active Users sidebar is empty
**Symptoms:**
- Shows "No active users" when users are connected

**Fix:**
1. Check if `/api/active-users` endpoint returns data:
   ```bash
   curl http://localhost:5000/api/active-users
   ```
2. Check browser console for parsing errors
3. Verify the response format matches expected format

#### Issue: File content shows as binary/garbled
**Symptoms:**
- File content is unreadable
- Shows special characters

**Fix:**
- This is a binary protocol issue
- Check if the response is being parsed correctly as text
- Verify the C server is sending text content properly

### 4. Testing Each Feature

#### Test File Creation
1. Click "New File" button
2. Enter filename (e.g., `test.txt`)
3. Press Enter or click "Create"
4. Should see success notification
5. Modal should close automatically
6. File should appear in files list

**If it fails:**
- Check browser console for errors
- Check Flask terminal for errors
- Verify `/api/file` POST endpoint is working:
  ```bash
  curl -X POST http://localhost:5000/api/file \
    -H "Content-Type: application/json" \
    -d '{"filename": "test.txt"}' \
    -b "session_cookie_here"
  ```

#### Test Folder Creation
1. Click "New Folder" button
2. Enter folder name (e.g., `my-folder`)
3. Press Enter or click "Create"
4. Should see success notification
5. Modal should close automatically
6. Folder should appear in files list with "/" suffix

#### Test File Viewing/Editing
1. Click eye icon on a file
2. Modal should open showing file content
3. Edit the content
4. Click "Save Changes"
5. Should see success notification
6. Modal stays open so you can continue editing

#### Test File Deletion
1. Click trash icon on a file/folder
2. Confirm deletion in popup
3. Should see success notification
4. Item should disappear from list

#### Test Access Control
1. Open a file
2. Go to "Access" tab
3. Enter username and select access type
4. Click "Add"
5. Should see success notification

#### Test Checkpoints
1. Open a file
2. Go to "Checkpoints" tab
3. Enter checkpoint name
4. Click "Create"
5. Should see success notification
6. Checkpoints list should update

### 5. Network Debugging

#### Check Flask API Responses
Open browser console → Network tab → Filter: XHR

Watch requests to:
- `/api/files` - Should return list of files
- `/api/file` - POST to create, PUT to update, DELETE to remove
- `/api/folder` - POST to create folder
- `/api/active-users` - Should return list of active users

#### Expected Response Format
All API responses should follow this format:
```json
{
  "success": true,
  "message": "Operation completed",
  "data": "Response data",
  "error_code": 0
}
```

Or for errors:
```json
{
  "error": "Error message",
  "error_code": 123
}
```

### 6. JavaScript Console Commands

Test functions directly in browser console:

```javascript
// Test file refresh
refreshFiles();

// Test active users
loadActiveUsers();

// Test showing modals
showCreateModal();
showCreateFolderModal();

// Test notifications
showNotification('Test message', 'success');
showNotification('Test warning', 'warning');
showNotification('Test error', 'danger');
```

### 7. Backend Debugging

#### Check Flask Logs
Flask should print all requests and responses. Look for:
- Request path and method
- Request data (JSON body)
- Response sent to client
- Any Python exceptions

#### Check C Server Logs
The Name Server and Storage Servers should log:
- Client connections
- Message received/sent
- File operations
- Errors

### 8. Common Fixes Applied

1. **Button Loading States**: All buttons now show spinner while processing
2. **Enter Key Support**: Press Enter in input fields to submit forms
3. **Better Error Messages**: More descriptive error notifications
4. **Modal Auto-close**: Create modals close automatically on success
5. **File Modal Improvements**: Loads all tabs data when opened
6. **User Filtering**: Filters out user entries from files list
7. **Active Users Polling**: Refreshes every 10 seconds automatically

### 9. Multi-Machine Setup Debugging

#### On Main Laptop (Server)
```bash
# Check firewall allows port 5000
sudo ufw status
sudo ufw allow 5000

# Check Flask is listening on 0.0.0.0
netstat -tlnp | grep 5000

# Should show: 0.0.0.0:5000 (not 127.0.0.1:5000)
```

#### On Other Laptops (Clients)
```bash
# Test connectivity to main laptop
ping <main-laptop-ip>

# Test Flask port
telnet <main-laptop-ip> 5000

# Test in browser
curl http://<main-laptop-ip>:5000/login
```

### 10. Browser Compatibility

Tested and working on:
- Chrome/Chromium 90+
- Firefox 88+
- Edge 90+
- Safari 14+

**Note:** Internet Explorer is NOT supported (uses modern JavaScript features).

### 11. Performance Tips

- Clear browser cache regularly during development
- Use browser's "Disable cache" option (in DevTools → Network tab)
- Monitor Network tab for slow requests
- Check if Name Server/Storage Servers are responding quickly

### 12. Emergency Reset

If everything is broken:

```bash
# Stop all processes
pkill -f name_server
pkill -f storage_server
pkill -f flask

# Clear any locked files
rm -f /tmp/nfs_*

# Restart from clean state
cd /path/to/Network-File-System
make clean
make

# Start Name Server
./name_server &

# Start Storage Servers
./storage_server <params> &

# Start Flask
cd webapp
source venv/bin/activate
flask run --host=0.0.0.0 --port=5000
```

## Getting Help

If issues persist:
1. Check all error logs (browser console, Flask terminal, C server logs)
2. Verify all services are running
3. Test API endpoints directly with curl
4. Review recent code changes
5. Check if backend (C code) is responding correctly

## Useful Commands

```bash
# Watch Flask logs
tail -f flask.log

# Monitor network connections
netstat -an | grep 5000

# Check running processes
ps aux | grep -E '(name_server|storage_server|flask)'

# Test API endpoint
curl -v http://localhost:5000/api/files \
  -H "Cookie: session=your_session_cookie"
```
