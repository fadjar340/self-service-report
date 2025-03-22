// Global variables
let selectedDatabaseId = null;

// DOM Elements
const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    addDatabaseBtn: document.getElementById('addDatabaseBtn'),
    databaseForm: document.getElementById('databaseForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    deleteModal: document.getElementById('deleteModal'),
    databaseModal: document.getElementById('databaseModal'),
    editDatabaseBtn: document.getElementById('editDatabaseBtn'),
    databasesTableBody: document.getElementById('databasesTableBody'),
    testDatabaseConnectionBtn: document.getElementById('testDatabaseConnectionBtn')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadDatabases();
    checkAuthAndRedirect();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation buttons
    elements.logoutBtn.addEventListener('click', logout);

    // Database management buttons
    elements.addDatabaseBtn.addEventListener('click', showAddDatabaseModal);
    elements.databaseForm.addEventListener('submit', handleDatabaseSubmit);

    // Modal close buttons
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);

    // Delete confirmation modal buttons
    elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Test Connection button
    elements.testDatabaseConnectionBtn.addEventListener('click', testDatabaseConnection);
}

// Check if user is authenticated and has admin role
async function checkAuthAndRedirect() {
    try {
        const response = await fetch('/api/auth/current-user', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const data = await response.json();
        if (!data.user || data.user.role !== 'admin') {
            window.location.href = '/admin.html';
            return;
        }

        // Display username
        document.getElementById('username').textContent = data.user.username;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/index.html';
    }
}

// Fetch and display databases
async function loadDatabases() {
    try {
        const response = await fetch('/api/postgres/databases', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch databases');
        }

        const result = await response.json();
        if (!result.databases || !Array.isArray(result.databases)) {
            throw new Error('Expected an array of databases, but received something else');
        }

        displayDatabases(result.databases);
    } catch (error) {
        console.error('Error loading databases:', error);
        showError('Failed to load databases');
    }
}

// Display databases in the table
function displayDatabases(databases) {
    elements.databasesTableBody.innerHTML = databases.map(database => `
        <tr> 
            <td>${database.conn_name}</td>
            <td>${database.host}</td>
            <td>${database.port}</td>
            <td>${database.database_name}</td>
            <td>${database.username}</td>
            <td>${database.isActive ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <!-- Test Connection Button -->
                    <button class="btn btn-secondary test-connection" data-id="${database.id}">
                        <i class="fas fa-play"></i> Test Connection
                    </button>
                    <!-- Update Button -->
                    <button class="btn btn-secondary btn-edit" data-id="${database.id}" data-conn-name="${database.conn_name}" data-host="${database.host}" data-port="${database.port}" data-database-name="${database.database_name}" data-username="${database.username}" data-password="${database.password}" data-is-active="${database.isActive}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <!-- Delete Button -->
                    <button class="btn btn-danger delete-database-btn" data-id="${database.id}" data-is-deleted="${database.isDeleted}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to update buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const conn_name = button.dataset.connName;
            const host = button.dataset.host;
            const port = button.dataset.port;
            const database_name = button.dataset.databaseName;
            const username = button.dataset.username;
            const isActive = button.dataset.isActive;

            // Call the function to show the update modal with the selected database's data
            editDatabase(id, conn_name, host, port, database_name, username, isActive);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-database-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedDatabaseId = button.dataset.id;
            showDeleteConfirmation(selectedDatabaseId);
        });
    });


    // Add event listeners to test connection buttons
    document.querySelectorAll('.test-connection').forEach(button => {
        button.addEventListener('click', () => {
            const buttonData = {
                id: button.dataset.id
            };
            testDatabaseConnection(buttonData);
        });
    });
}

// Show add database modal
function showAddDatabaseModal() {
    selectedDatabaseId = null;
    document.getElementById('modalTitle').textContent = 'Add Database';
    elements.databaseForm.reset();
    elements.databaseModal.style.display = 'block';
}

// Show edit database modal
function editDatabase(id, conn_name, host, port, database_name, username, isActive) {
    selectedDatabaseId = id;
    document.getElementById('modalTitle').textContent = 'Edit Database';
    
    elements.databaseForm.elements.conn_name.value = conn_name;
    elements.databaseForm.elements.host.value = host;
    elements.databaseForm.elements.port.value = port;
    elements.databaseForm.elements.database_name.value = database_name;
    elements.databaseForm.elements.username.value = username;
    elements.databaseForm.elements.password.value = ''; // Clear password field
    elements.databaseForm.elements.isActive.checked = isActive === 'true';

    elements.databaseModal.style.display = 'block';
}

// Close modal
function closeModal() {
    elements.databaseModal.style.display = 'none';
    elements.databaseForm.reset();
    selectedDatabaseId = null;
}

// Show delete confirmation modal
function showDeleteConfirmation(id) {
    selectedDatabaseId = id;
    elements.deleteModal.style.display = 'block';
}

// Close delete confirmation modal
function closeDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedDatabaseId = null;
}

// Handle form submission for add/update database
async function handleDatabaseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const databaseData = {
        conn_name: formData.get('conn_name'),
        host: formData.get('host'),
        port: parseInt(formData.get('port')) || null,
        database_name: formData.get('database_name'),
        username: formData.get('username'),
        isActive: formData.get('isActive') === 'on',
        password: formData.get('password') || null
    };
    
    try {
        const url = selectedDatabaseId 
            ? `/api/postgres/databases/${selectedDatabaseId}`
            : '/api/postgres/databases';

        const response = await fetch(url, {
            method: selectedDatabaseId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
            credentials: 'include',
            body: JSON.stringify(databaseData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Operation failed');
        }

        closeModal();
        loadDatabases();
        showSuccess(selectedDatabaseId ? 'Database updated successfully' : 'Database created successfully');
    } catch (error) {
        console.error('Error saving database:', error);
        showError(error.message);
    }
}

// Confirm and execute database deletion
async function confirmDelete() {
    try {
        const response = await fetch(`/api/postgres/databases/${selectedDatabaseId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete database');
        }

        closeDeleteModal();
        loadDatabases();
        showSuccess('Database deleted successfully');
    } catch (error) {
        console.error('Error deleting database:', error);
        showError(error.message);
        closeDeleteModal();
    }
}

// Test database connection
async function testDatabaseConnection(buttonData) {
    console.log('Testing connection for database ID:', buttonData.id);

    try {
        const response = await fetch(`/api/sybase/test-connection/${buttonData.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Connection test failed');
        }

        alert('Connection test successful');
    } catch (error) {
        console.error('Error testing connection:', error);
        alert(`Connection test failed: ${error.message}`);
    }
}

// Show success message
function showSuccess(message) {
    alert(message);
}

// Show error message
function showError(message) {
    alert('Error: ' + message);
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear the token from localStorage
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }
}