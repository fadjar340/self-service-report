// Global variables
let selectedDatabaseConnName = null;

// DOM Elements
const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    addDatabaseBtn: document.getElementById('addDatabaseBtn'),
    databaseForm: document.getElementById('databaseForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    updateModal: document.getElementById('updateModal'),
    updateDatabaseForm: document.getElementById('updateDatabaseForm'),
    closeUpdateModalBtn: document.getElementById('closeUpdateModalBtn'),
    cancelUpdateBtn: document.getElementById('cancelUpdateBtn'),
    confirmUpdateBtn: document.getElementById('confirmUpdateBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    deleteModal: document.getElementById('deleteModal'),
    databaseModal: document.getElementById('databaseModal'),
    databasesTableBody: document.getElementById('databasesTableBody'),
    //testDatabaseConnectionBtn: document.getElementById('testDatabaseConnectionBtn')
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

    // Update confirmation modal buttons
    elements.closeUpdateModalBtn.addEventListener('click', closeUpdateModal);
    elements.cancelUpdateBtn.addEventListener('click', cancelUpdateModal);
    elements.confirmUpdateBtn.addEventListener('click', handleDatabaseSubmit);

    // Delete confirmation modal buttons
    elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Test Connection button
    //elements.testDatabaseConnectionBtn.addEventListener('click', testDatabaseConnection);
}

// Check if user is authenticated and has admin role
async function checkAuthAndRedirect() {
    try {
        const response = await fetch('/api/auth/current-user', {
            credentials: 'include'
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

// Test database connection
///async function testDatabaseConnection() {
///    const formData = new FormData(elements.databaseForm);
///    const connectionConfig = {
///        conn_name: formData.get('conn_name'),
///        host: formData.get('host'),
///        port: parseInt(formData.get('port')),
///        database_name: formData.get('database_name'),
///        username: formData.get('username'),
///        password: formData.get('password')
///    };
///
///    // Validate required fields
///    if (!connectionConfig.conn_name || !connectionConfig.host || !connectionConfig.port || 
///        !connectionConfig.database_name || !connectionConfig.username || !connectionConfig.password) {
///        showError('All fields are required for testing');
///        return;
///    }
///
///    try {
///        const response = await fetch('/api/sybase/test-connection', {
///            method: 'POST',
///            headers: {
///                'Content-Type': 'application/json'
///            },
///            body: JSON.stringify(connectionConfig)
///        });
///
///        const result = await response.json();
///        
///        if (response.ok) {
///            showSuccess('Connection test successful!');
///        } else {
///            showError(result.message || 'Connection test failed');
///        }
///    } catch (error) {
///        console.error('Connection test error:', error);
///        showError('Failed to test connection');
///    }
///}
///

// Fetch and display databases
async function loadDatabases() {
    try {
        const response = await fetch('/api/sybase/loadDatabases', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
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
    if (!databases || !Array.isArray(databases)) {
        console.error('Expected an array of databases, but received:', databases);
        showError('Invalid data format');
        return;
    }

    elements.databasesTableBody.innerHTML = databases.map(database => `
        <tr>
            <td>${database.conn_name}</td>
            <td>${database.host}</td>
            <td>${database.port}</td>
            <td>${database.database_name}</td>
            <td>${database.username}</td>
            <td>${database.password}</td>
            <td>${database.isActive ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <!-- Test Connection Button -->
                    <button class="btn btn-secondary" data-conn-name="${database.conn_name}" data-host="${database.host}" data-port="${database.port}" data-database-name="${database.database_name}" data-username="${database.username}" data-is-active="${database.isActive}">
                        Test Connection
                    </button>
                    <!-- Update Button -->
                    <button class="btn btn-secondary update-database-btn" data-conn-name="${database.conn_name}" data-host="${database.host}" data-port="${database.port}" data-database-name="${database.database_name}" data-username="${database.username}" data-is-active="${database.isActive}">
                        Update
                    </button>
                    <!-- Delete Button -->
                    <button class="btn btn-danger delete-database-btn" data-conn-name="${database.conn_name}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to update buttons
    document.querySelectorAll('.update-database-btn').forEach(button => {
        button.addEventListener('click', () => {
            const connName = button.dataset.connName;
            const host = button.dataset.host;
            const port = button.dataset.port;
            const databaseName = button.dataset.databaseName;
            const username = button.dataset.username;
            const isActive = button.dataset.isActive;

            // Call the function to show the update modal with the selected database's data
            showUpdateDatabaseModal(connName, host, port, databaseName, username, isActive);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-database-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedDatabaseConnName = button.dataset.connName;
            showDeleteConfirmation(selectedDatabaseConnName);
        });
    });
}

// Show add database modal
function showAddDatabaseModal() {
    selectedDatabaseConnName = null;
    document.getElementById('modalTitle').textContent = 'Add Database';
    elements.databaseForm.reset();
    elements.databaseModal.style.display = 'block';
}

// Show update database modal
function showUpdateDatabaseModal(connName, host, port, databaseName, username, isActive) {
    // Set the selected database connection name
    selectedDatabaseConnName = connName;

    // Populate the form fields with the selected database's data
    document.getElementById('conn_name').value = connName;
    document.getElementById('host').value = host;
    document.getElementById('port').value = port;
    document.getElementById('database_name').value = databaseName;
    document.getElementById('username').value = username;
    document.getElementById('isActive').checked = isActive === 'true';

    // Set the modal title
    document.getElementById('modalTitle').textContent = 'Update Database';

    // Display the modal
    //elements.databaseForm.reset();
    elements.updateModal.style.display = 'block';
}

// Close modal
function closeModal() {
    elements.databaseModal.style.display = 'none';
    elements.updateModal.style.display = 'none';
    elements.databaseForm.reset();
    selectedDatabaseConnName = null;
}

// Close update confirmation modal
function closeUpdateModal() {
    elements.updateModal.style.display = 'none';
    selectedDatabaseConnName = null;
}

// Cancel update confirmation modal
function cancelUpdateModal() {
    elements.updateModal.style.display = 'none';
    selectedDatabaseConnName = null;
}

// Show delete confirmation modal
function showDeleteConfirmation(connName) {
    selectedDatabaseConnName = connName;
    elements.deleteModal.style.display = 'block';
}

// Close delete confirmation modal
function closeDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedDatabaseConnName = null;
}

// Cancel delete confirmation modal
function cancelDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedDatabaseConnName = null;
}

// Handle form submission for add/update database
async function handleDatabaseSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const databaseData = {
        conn_name: formData.get('conn_name'), // Corrected to 'conn_name'
        host: formData.get('host'),
        port: parseInt(formData.get('port')),
        database_name: formData.get('database_name'),
        username: formData.get('username'),
        password: formData.get('password'),
        isActive: formData.get('isActive') === 'true'
    };

    try {
        const isUpdate = !!selectedDatabaseConnName; // Check if updating
        const url = isUpdate 
            ? `/api/sybase/updateDatabase/${selectedDatabaseConnName}` 
            : '/api/sybase/saveDatabase';
        
        const response = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(databaseData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save database');
        }

        closeModal();
        selectedDatabaseConnName = null; // Reset the selected database connection name
        loadDatabases();
        showSuccess(isUpdate ? 'Database updated successfully' : 'Database created successfully');
    } catch (error) {
        console.error('Error saving database:', error);
        showError(error.message);
    }
}

// Confirm and execute database deletion
async function confirmDelete() {
    try {
        const response = await fetch(`/api/sybase/deleteDatabase/${selectedDatabaseConnName}`, {
            method: 'DELETE',
            credentials: 'include'
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
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        window.location.href = '/index.html';
    }
}