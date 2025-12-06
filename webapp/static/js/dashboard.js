// Dashboard JavaScript for NFS Web App

let currentFilename = null;
let createFileModal, createFolderModal, fileModal;

// Initialize modals on page load
document.addEventListener('DOMContentLoaded', function() {
    createFileModal = new bootstrap.Modal(document.getElementById('createFileModal'));
    createFolderModal = new bootstrap.Modal(document.getElementById('createFolderModal'));
    fileModal = new bootstrap.Modal(document.getElementById('fileModal'));
    
    // Load files on page load
    refreshFiles();
    
    // Load active users
    loadActiveUsers();
    
    // Refresh active users every 10 seconds
    setInterval(loadActiveUsers, 10000);
    
    // Add Enter key support for forms
    document.getElementById('newFileName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            createFile();
        }
    });
    
    document.getElementById('newFolderName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            createFolder();
        }
    });
    
    // Add Enter key support for access form
    document.getElementById('accessUsername').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAccess();
        }
    });
    
    // Add Enter key support for checkpoint form
    document.getElementById('checkpointTag').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            createCheckpoint();
        }
    });
});

// Show notifications
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show fade-in`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('main .container-fluid');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Refresh files list
function refreshFiles() {
    fetch('/api/files')
        .then(response => response.json())
        .then(data => {
            displayFiles(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to load files', 'danger');
            document.getElementById('filesList').innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h4>Error Loading Files</h4>
                    <p>Please check if the NFS backend is running.</p>
                </div>
            `;
        });
}

// Display files in table
function displayFiles(data) {
    const filesList = document.getElementById('filesList');
    
    console.log('Display files data:', data);
    
    // Check for errors
    if (data.error) {
        filesList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> ${data.error}
            </div>
        `;
        return;
    }
    
    // Check error code
    if (data.error_code && data.error_code !== 0) {
        filesList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error ${data.error_code}: ${data.data || 'Failed to load files'}
            </div>
        `;
        return;
    }
    
    // Parse the response data
    let files = [];
    if (data.data && typeof data.data === 'string') {
        // Parse the data string to extract files
        const lines = data.data.split('\n').filter(line => {
            const trimmed = line.trim();
            // Filter out empty lines, headers, and user entries (starting with "->")
            return trimmed && 
                   !trimmed.startsWith('===') && 
                   !trimmed.includes('Files:') &&
                   !trimmed.startsWith('->') &&  // Filter user entries
                   !trimmed.includes('Storage Servers:') &&
                   !trimmed.includes('Clients:');
        });
        console.log('Parsed lines:', lines);
        
        files = lines.map(line => {
            const trimmed = line.trim();
            // Check if it's a directory (ends with /)
            const isFolder = trimmed.endsWith('/');
            const name = isFolder ? trimmed.slice(0, -1) : trimmed;
            
            return {
                name: name,
                type: isFolder ? 'folder' : 'file'
            };
        }).filter(f => f.name); // Remove empty entries
    }
    
    console.log('Parsed files:', files);
    
    if (files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder-x"></i>
                <h4>No Files Yet</h4>
                <p>Create your first file or folder to get started!</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th style="width: 50px;"></th>
                    <th>Name</th>
                    <th>Type</th>
                    <th style="width: 250px;">Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    files.forEach(file => {
        const isFolder = file.type === 'folder';
        const icon = isFolder ? 'bi-folder-fill folder-icon' : 'bi-file-earmark-text file-icon';
        
        html += `
            <tr class="file-item">
                <td><i class="bi ${icon}"></i></td>
                <td><strong>${file.name}</strong></td>
                <td><span class="badge bg-${isFolder ? 'warning' : 'primary'}">${file.type}</span></td>
                <td class="file-actions">
                    <div class="btn-group btn-group-sm">
                        ${!isFolder ? `
                            <button class="btn btn-outline-primary" onclick="viewFile('${file.name}')" title="View/Edit">
                                <i class="bi bi-eye"></i>
                            </button>
                        ` : `
                            <button class="btn btn-outline-info" onclick="viewFolder('${file.name}')" title="Open Folder">
                                <i class="bi bi-folder-open"></i>
                            </button>
                        `}
                        <button class="btn btn-outline-danger" onclick="deleteItem('${file.name}', '${file.type}')" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    filesList.innerHTML = html;
}

// Show create file modal
function showCreateModal() {
    document.getElementById('newFileName').value = '';
    createFileModal.show();
}

// Show create folder modal
function showCreateFolderModal() {
    document.getElementById('newFolderName').value = '';
    createFolderModal.show();
}

// Create new file
function createFile() {
    const filename = document.getElementById('newFileName').value.trim();
    
    if (!filename) {
        showNotification('Please enter a filename', 'warning');
        return;
    }
    
    // Disable the button to prevent double-clicks
    const createBtn = event.target;
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
    
    fetch('/api/file', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: filename })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Create file response:', data);
        
        if (data.error || (data.error_code && data.error_code !== 0)) {
            const errorMsg = data.error || data.data || 'Failed to create file';
            showNotification(`Error: ${errorMsg}`, 'danger');
        } else if (data.success) {
            showNotification(data.message || `File "${filename}" created successfully!`, 'success');
            createFileModal.hide();
            document.getElementById('newFileName').value = '';
            refreshFiles();
        } else {
            showNotification('Unexpected response from server', 'warning');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to create file: ' + error.message, 'danger');
    })
    .finally(() => {
        // Re-enable the button
        createBtn.disabled = false;
        createBtn.innerHTML = 'Create';
    });
}

// Create new folder
function createFolder() {
    const foldername = document.getElementById('newFolderName').value.trim();
    
    if (!foldername) {
        showNotification('Please enter a folder name', 'warning');
        return;
    }
    
    // Disable the button to prevent double-clicks
    const createBtn = event.target;
    createBtn.disabled = true;
    createBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...';
    
    fetch('/api/folder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foldername: foldername })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Create folder response:', data);
        
        if (data.error || (data.error_code && data.error_code !== 0)) {
            const errorMsg = data.error || data.data || 'Failed to create folder';
            showNotification(`Error: ${errorMsg}`, 'danger');
        } else if (data.success) {
            showNotification(data.message || `Folder "${foldername}" created successfully!`, 'success');
            createFolderModal.hide();
            document.getElementById('newFolderName').value = '';
            refreshFiles();
        } else {
            showNotification('Unexpected response from server', 'warning');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to create folder: ' + error.message, 'danger');
    })
    .finally(() => {
        // Re-enable the button
        createBtn.disabled = false;
        createBtn.innerHTML = 'Create';
    });
}

// View file
function viewFile(filename) {
    currentFilename = filename;
    document.getElementById('fileModalTitle').innerHTML = `<i class="bi bi-file-earmark-text"></i> ${filename}`;
    
    // Show loading state
    document.getElementById('fileContent').value = 'Loading...';
    document.getElementById('fileInfo').innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading...</div>';
    document.getElementById('checkpointsList').innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div> Loading...</div>';
    
    // Load file content
    fetch(`/api/file/${encodeURIComponent(filename)}?action=read`)
        .then(response => response.json())
        .then(data => {
            console.log('Read file response:', data);
            
            if (data.error) {
                showNotification(data.error, 'danger');
                document.getElementById('fileContent').value = `Error: ${data.error}`;
            } else if (data.error_code && data.error_code !== 0) {
                const errorMsg = data.data || 'Failed to read file';
                showNotification(`Error: ${errorMsg}`, 'danger');
                document.getElementById('fileContent').value = `Error: ${errorMsg}`;
            } else {
                document.getElementById('fileContent').value = data.data || '';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to load file content', 'danger');
            document.getElementById('fileContent').value = `Error: ${error.message}`;
        });
    
    // Load file info
    loadFileInfo(filename);
    
    // Load checkpoints
    loadCheckpoints();
    
    fileModal.show();
}

// Load file info
function loadFileInfo(filename) {
    fetch(`/api/file/${encodeURIComponent(filename)}?action=info`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.getElementById('fileInfo').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
            } else {
                document.getElementById('fileInfo').innerHTML = `
                    <ul class="info-list">
                        <li><strong>Filename:</strong> ${filename}</li>
                        <li><strong>Status:</strong> ${data.data || 'Available'}</li>
                    </ul>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('fileInfo').innerHTML = `<div class="alert alert-danger">Failed to load file info</div>`;
        });
}

// Save file
function saveFile() {
    if (!currentFilename) {
        showNotification('No file selected', 'warning');
        return;
    }
    
    const content = document.getElementById('fileContent').value;
    const saveBtn = event.target;
    
    // Disable button and show loading
    saveBtn.disabled = true;
    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
    
    fetch(`/api/file/${encodeURIComponent(currentFilename)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            content: content,
            sentence_index: 0 
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Save file response:', data);
        
        if (data.error || (data.error_code && data.error_code !== 0)) {
            const errorMsg = data.error || data.data || 'Failed to save file';
            showNotification(`Error: ${errorMsg}`, 'danger');
        } else if (data.success) {
            showNotification(data.message || 'File saved successfully!', 'success');
        } else {
            showNotification('Unexpected response from server', 'warning');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to save file: ' + error.message, 'danger');
    })
    .finally(() => {
        // Re-enable button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
    });
}

// Delete item (file or folder)
function deleteItem(name, type) {
    if (!confirm(`Are you sure you want to delete this ${type}: ${name}?`)) {
        return;
    }
    
    fetch(`/api/file/${encodeURIComponent(name)}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        console.log('Delete response:', data);
        
        if (data.error || (data.error_code && data.error_code !== 0)) {
            const errorMsg = data.error || data.data || 'Failed to delete';
            showNotification(`Error: ${errorMsg}`, 'danger');
        } else if (data.success) {
            showNotification(data.message || `${type} deleted successfully!`, 'success');
            refreshFiles();
        } else {
            showNotification('Unexpected response from server', 'warning');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification(`Failed to delete ${type}: ` + error.message, 'danger');
    });
}

// View folder
function viewFolder(foldername) {
    fetch(`/api/folder/${encodeURIComponent(foldername)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(data.error, 'danger');
            } else {
                showNotification(`Folder contents: ${data.data || 'Empty'}`, 'info');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Failed to view folder', 'danger');
        });
}

// Add access
function addAccess() {
    if (!currentFilename) {
        showNotification('No file selected', 'warning');
        return;
    }
    
    const username = document.getElementById('accessUsername').value.trim();
    const accessType = parseInt(document.getElementById('accessType').value);
    
    if (!username) {
        showNotification('Please enter a username', 'warning');
        return;
    }
    
    const addBtn = event.target;
    addBtn.disabled = true;
    const originalHTML = addBtn.innerHTML;
    addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    
    fetch('/api/access', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'add',
            filename: currentFilename,
            target_user: username,
            access_type: accessType
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'danger');
        } else if (data.error_code && data.error_code !== 0) {
            showNotification(`Error: ${data.data || 'Failed to add access'}`, 'danger');
        } else {
            showNotification('Access granted successfully!', 'success');
            document.getElementById('accessUsername').value = '';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to add access: ' + error.message, 'danger');
    })
    .finally(() => {
        addBtn.disabled = false;
        addBtn.innerHTML = originalHTML;
    });
}

// Create checkpoint
function createCheckpoint() {
    if (!currentFilename) {
        showNotification('No file selected', 'warning');
        return;
    }
    
    const tag = document.getElementById('checkpointTag').value.trim();
    
    if (!tag) {
        showNotification('Please enter a checkpoint name', 'warning');
        return;
    }
    
    const createBtn = event.target;
    createBtn.disabled = true;
    const originalHTML = createBtn.innerHTML;
    createBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    
    fetch('/api/checkpoint', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filename: currentFilename,
            checkpoint_tag: tag
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'danger');
        } else if (data.error_code && data.error_code !== 0) {
            showNotification(`Error: ${data.data || 'Failed to create checkpoint'}`, 'danger');
        } else {
            showNotification('Checkpoint created successfully!', 'success');
            document.getElementById('checkpointTag').value = '';
            loadCheckpoints();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Failed to create checkpoint: ' + error.message, 'danger');
    })
    .finally(() => {
        createBtn.disabled = false;
        createBtn.innerHTML = originalHTML;
    });
}

// Load checkpoints
function loadCheckpoints() {
    if (!currentFilename) return;
    
    fetch(`/api/checkpoint/${encodeURIComponent(currentFilename)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.getElementById('checkpointsList').innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
            } else {
                document.getElementById('checkpointsList').innerHTML = `<div class="alert alert-info">${data.data || 'No checkpoints'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('checkpointsList').innerHTML = `<div class="alert alert-danger">Failed to load checkpoints</div>`;
        });
}

// Load active users
function loadActiveUsers() {
    const activeUsersList = document.getElementById('activeUsersList');
    
    fetch('/api/active-users')
        .then(response => response.json())
        .then(data => {
            console.log('Active users response:', data);
            
            if (data.error) {
                activeUsersList.innerHTML = `
                    <div class="text-muted text-center py-2">
                        <small>${data.error}</small>
                    </div>
                `;
                return;
            }
            
            // Parse active users from the response
            let users = [];
            if (data.data && typeof data.data === 'string') {
                // Parse the data string to extract active users
                const lines = data.data.split('\n').filter(line => {
                    const trimmed = line.trim();
                    // Look for lines starting with -> which indicate users
                    return trimmed.startsWith('->');
                });
                
                users = lines.map(line => {
                    // Extract username from "-> username"
                    return line.trim().substring(2).trim();
                }).filter(u => u);
            }
            
            if (users.length === 0) {
                activeUsersList.innerHTML = `
                    <div class="text-muted text-center py-2">
                        <small><i class="bi bi-person-x"></i> No active users</small>
                    </div>
                `;
                return;
            }
            
            // Display users
            let html = '<ul class="list-unstyled mb-0">';
            users.forEach(user => {
                html += `
                    <li class="py-1 px-2 border-bottom">
                        <i class="bi bi-person-circle text-success"></i> 
                        <span class="ms-1">${user}</span>
                    </li>
                `;
            });
            html += '</ul>';
            
            activeUsersList.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading active users:', error);
            activeUsersList.innerHTML = `
                <div class="text-danger text-center py-2">
                    <small><i class="bi bi-exclamation-triangle"></i> Failed to load</small>
                </div>
            `;
        });
}
