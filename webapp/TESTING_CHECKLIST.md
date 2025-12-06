# Testing Checklist for NFS Web App

## Pre-Testing Setup

### 1. Start All Services
```bash
# Terminal 1: Start Name Server
cd /home/shrish-kadam/Documents/repos/OSN\ PROJECTS/Network-File-System
./name_server

# Terminal 2: Start Storage Server(s)
./storage_server <config>

# Terminal 3: Start Flask Web App
cd webapp
source venv/bin/activate  # or activate your virtualenv
flask run --host=0.0.0.0 --port=5000 --debug
```

### 2. Open Browser DevTools
- Press F12 to open Developer Tools
- Go to Console tab - watch for JavaScript errors
- Go to Network tab - watch for API requests/responses
- Go to Application tab - check session cookies

## UI Component Tests

### ✅ Test 1: Page Load
- [ ] Dashboard loads without errors
- [ ] No red errors in browser console
- [ ] Files list shows loading spinner initially
- [ ] Active users sidebar appears on the right
- [ ] All buttons are visible and styled correctly
- [ ] Icons display correctly (Bootstrap Icons)

**Expected:** Clean page load with no console errors

---

### ✅ Test 2: File List Display
- [ ] Click "Refresh" button
- [ ] Files list updates
- [ ] Files show with file icon (📄)
- [ ] Folders show with folder icon (📁) and trailing "/"
- [ ] No user entries (starting with "->") appear in files list
- [ ] Action buttons (View, Delete) appear for each item
- [ ] Empty state shows if no files exist

**Expected:** Clean list of files and folders, no user entries

---

### ✅ Test 3: Create New File
- [ ] Click "New File" button
- [ ] Modal opens with title "Create New File"
- [ ] Input field is empty and focused
- [ ] Type a filename (e.g., "test.txt")
- [ ] Press Enter OR click "Create" button
- [ ] Button shows spinner and "Creating..." text
- [ ] Success notification appears (green)
- [ ] Modal closes automatically
- [ ] Files list refreshes automatically
- [ ] New file appears in the list

**Expected:** File created successfully, modal closes, list updates

**To Debug:**
```javascript
// In browser console:
showCreateModal();  // Should open modal
createFile();       // With filename entered, should create
```

---

### ✅ Test 4: Create New Folder
- [ ] Click "New Folder" button
- [ ] Modal opens with title "Create New Folder"
- [ ] Input field is empty and focused
- [ ] Type a folder name (e.g., "my-folder")
- [ ] Press Enter OR click "Create" button
- [ ] Button shows spinner and "Creating..." text
- [ ] Success notification appears (green)
- [ ] Modal closes automatically
- [ ] Files list refreshes automatically
- [ ] New folder appears in the list with "/" suffix

**Expected:** Folder created successfully, modal closes, list updates

---

### ✅ Test 5: View/Edit File
- [ ] Click eye icon (👁️) on a file
- [ ] Modal opens with file name in title
- [ ] "Content" tab is active by default
- [ ] File content loads in textarea
- [ ] Content is readable (not binary/garbled)
- [ ] Can edit the text
- [ ] "Info" tab shows file information
- [ ] "Access" tab shows access controls
- [ ] "Checkpoints" tab shows checkpoint interface

**Expected:** File opens in modal, content is editable

**To Debug:**
```javascript
// In browser console:
viewFile('test.txt');  // Should open file modal
```

---

### ✅ Test 6: Save File Changes
- [ ] Open a file (see Test 5)
- [ ] Edit the content in textarea
- [ ] Click "Save Changes" button
- [ ] Button shows spinner and "Saving..." text
- [ ] Success notification appears (green)
- [ ] Modal stays open
- [ ] Button returns to normal state

**Expected:** File saves successfully, notification shows

**To Debug:**
```javascript
// In browser console:
currentFilename = 'test.txt';  // Set current file
saveFile();  // Should attempt to save
```

---

### ✅ Test 7: Delete File
- [ ] Click trash icon (🗑️) on a file
- [ ] Confirmation dialog appears
- [ ] Click "OK" to confirm
- [ ] Success notification appears (green)
- [ ] File disappears from list
- [ ] Files list updates

**Expected:** File deleted, confirmation required

---

### ✅ Test 8: Delete Folder
- [ ] Click trash icon (🗑️) on a folder
- [ ] Confirmation dialog appears
- [ ] Click "OK" to confirm
- [ ] Success notification appears (green)
- [ ] Folder disappears from list
- [ ] Files list updates

**Expected:** Folder deleted, confirmation required

---

### ✅ Test 9: Grant Access
- [ ] Open a file
- [ ] Go to "Access" tab
- [ ] Type a username in input field
- [ ] Select access type (Read/Write/Read & Write)
- [ ] Press Enter OR click "Add" button
- [ ] Button shows spinner
- [ ] Success notification appears (green)
- [ ] Input field clears

**Expected:** Access granted successfully

**To Debug:**
```javascript
// In browser console:
currentFilename = 'test.txt';
addAccess();  // With username entered
```

---

### ✅ Test 10: Create Checkpoint
- [ ] Open a file
- [ ] Go to "Checkpoints" tab
- [ ] Type a checkpoint name/tag
- [ ] Press Enter OR click "Create" button
- [ ] Button shows spinner
- [ ] Success notification appears (green)
- [ ] Input field clears
- [ ] Checkpoints list updates

**Expected:** Checkpoint created successfully

**To Debug:**
```javascript
// In browser console:
currentFilename = 'test.txt';
createCheckpoint();  // With tag entered
loadCheckpoints();   // Should load list
```

---

### ✅ Test 11: Active Users Sidebar
- [ ] Active users sidebar appears on right side
- [ ] Shows loading spinner initially
- [ ] Lists currently connected users
- [ ] Each user has person icon (👤)
- [ ] Users list updates every 10 seconds
- [ ] Shows "No active users" if empty
- [ ] No user entries appear in files list

**Expected:** Active users displayed in sidebar, auto-refreshes

**To Debug:**
```javascript
// In browser console:
loadActiveUsers();  // Should update sidebar
```

---

### ✅ Test 12: Notifications
Test all notification types:
- [ ] Success (green) - after successful operations
- [ ] Warning (yellow) - for validation issues
- [ ] Error (red) - for failed operations
- [ ] Info (blue) - for informational messages
- [ ] Notifications auto-dismiss after 5 seconds
- [ ] Can manually close with X button
- [ ] Multiple notifications stack properly

**To Debug:**
```javascript
// In browser console:
showNotification('Test success', 'success');
showNotification('Test warning', 'warning');
showNotification('Test error', 'danger');
showNotification('Test info', 'info');
```

---

### ✅ Test 13: Error Handling

Test error scenarios:
- [ ] Create file with empty name → Warning notification
- [ ] Create folder with empty name → Warning notification
- [ ] Save file without selecting one → Warning notification
- [ ] Grant access without username → Warning notification
- [ ] Create checkpoint without name → Warning notification
- [ ] Backend not running → Error notification with helpful message

**Expected:** User-friendly error messages, no crashes

---

### ✅ Test 14: Keyboard Shortcuts
- [ ] Press Enter in "New File" input → Creates file
- [ ] Press Enter in "New Folder" input → Creates folder
- [ ] Press Enter in "Access Username" input → Grants access
- [ ] Press Enter in "Checkpoint Name" input → Creates checkpoint
- [ ] Escape key closes modals

**Expected:** Keyboard shortcuts work as expected

---

### ✅ Test 15: Loading States
- [ ] Buttons show spinner during operations
- [ ] Buttons are disabled during operations
- [ ] Button text changes (e.g., "Create" → "Creating...")
- [ ] Button returns to normal after completion
- [ ] Can't double-click to create duplicate operations

**Expected:** Visual feedback during async operations

---

## Multi-Machine Tests

### ✅ Test 16: Access from Another Laptop
**On Main Laptop:**
- [ ] Flask running with `--host=0.0.0.0`
- [ ] Firewall allows port 5000
- [ ] Can access via `http://localhost:5000`
- [ ] Can access via `http://<local-ip>:5000`

**On Other Laptop:**
- [ ] Can ping main laptop
- [ ] Can access `http://<main-laptop-ip>:5000`
- [ ] Can login successfully
- [ ] All features work as on main laptop
- [ ] Files created on one laptop appear on other
- [ ] Active users shows both users

**Expected:** Full functionality across machines

**To Test:**
```bash
# On main laptop, get IP:
ip addr show | grep "inet "

# On other laptop:
ping <main-laptop-ip>
curl http://<main-laptop-ip>:5000/login
```

---

### ✅ Test 17: Concurrent Users
- [ ] Two users login from different machines
- [ ] Both appear in active users list
- [ ] Both can create files/folders
- [ ] Changes from one user visible to other
- [ ] Both can edit same file (test conflicts)
- [ ] Access control works between users

**Expected:** Multi-user functionality works correctly

---

## Browser Compatibility Tests

### ✅ Test 18: Different Browsers
Test on:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Edge
- [ ] Safari (if available)

**Expected:** Works consistently across modern browsers

---

## Performance Tests

### ✅ Test 19: Large File Lists
- [ ] Create 20+ files
- [ ] Files list loads quickly
- [ ] Scrolling is smooth
- [ ] Search/filter works (if implemented)

**Expected:** Good performance with many files

---

### ✅ Test 20: Large File Content
- [ ] Open file with 1000+ lines
- [ ] Content loads in reasonable time
- [ ] Textarea is scrollable
- [ ] Save works correctly

**Expected:** Handles large files reasonably

---

## Regression Tests

### ✅ Test 21: Modal Issues (Previously Fixed)
- [ ] Modals open correctly
- [ ] Modals close on success
- [ ] Background doesn't become unresponsive
- [ ] Can open modal → close → open again

**Expected:** All modal issues resolved

---

### ✅ Test 22: User Filtering (Previously Fixed)
- [ ] No "-> username" entries in files list
- [ ] Users only appear in active users sidebar
- [ ] Files and folders display correctly

**Expected:** Clean separation of users and files

---

## API Endpoint Tests

### ✅ Test 23: Direct API Calls
Test each endpoint with curl:

```bash
# Get session cookie first (after login via browser)
COOKIE="session=your_session_cookie"

# List files
curl http://localhost:5000/api/files -H "Cookie: $COOKIE"

# Create file
curl -X POST http://localhost:5000/api/file \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"filename": "api-test.txt"}'

# Read file
curl "http://localhost:5000/api/file/api-test.txt?action=read" \
  -H "Cookie: $COOKIE"

# Write to file
curl -X PUT http://localhost:5000/api/file/api-test.txt \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from API", "sentence_index": 0}'

# Delete file
curl -X DELETE http://localhost:5000/api/file/api-test.txt \
  -H "Cookie: $COOKIE"

# Active users
curl http://localhost:5000/api/active-users -H "Cookie: $COOKIE"
```

**Expected:** All endpoints return proper JSON responses

---

## Final Checklist

- [ ] All UI components render correctly
- [ ] All buttons respond to clicks
- [ ] All modals open and close properly
- [ ] All forms submit correctly
- [ ] All API calls succeed
- [ ] Notifications display correctly
- [ ] Error handling works as expected
- [ ] Loading states show during operations
- [ ] Keyboard shortcuts work
- [ ] Multi-machine setup works
- [ ] Active users feature works
- [ ] No console errors
- [ ] No Python exceptions in Flask
- [ ] No errors in C server logs

## Test Summary Template

```
Date: ___________
Tester: ___________

Tests Passed: ___ / 23
Tests Failed: ___
Tests Skipped: ___

Issues Found:
1. 
2. 
3. 

Notes:


```

## Quick Test Command

Run this in browser console to test all basic functions:
```javascript
// Quick smoke test
console.clear();
console.log('🧪 Running quick smoke test...');

// Test 1: Refresh files
refreshFiles();
console.log('✅ Test 1: refreshFiles()');

// Test 2: Load active users
loadActiveUsers();
console.log('✅ Test 2: loadActiveUsers()');

// Test 3: Show modal
showCreateModal();
setTimeout(() => createFileModal.hide(), 100);
console.log('✅ Test 3: showCreateModal()');

// Test 4: Notification
showNotification('Test notification', 'success');
console.log('✅ Test 4: showNotification()');

console.log('🎉 Quick smoke test complete!');
console.log('Check for any red errors above.');
```
