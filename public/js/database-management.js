// Global variables
let selectedDatabaseId = null;

// DOM Elements
const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    addDatabaseBtn: document.getElementById('addDatabaseBtn'),
    databaseForm: document.getElementById('databaseForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    updateModal: document.getElementById('updateModal'),
    closeUpdateModalBtn: document.getElementById('closeUpdateModalBtn'),
    cancelUpdateBtn: document.getElementById('cancelUpdateBtn'),
    confirmUpdateBtn: document.getElementById('confirmUpdateBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    deleteModal: document.getElementById('deleteModal'),
    databaseModal: document.getElementById('databaseModal'),
    updateForm: document.getElementById('updateForm'),
    closeUpdateModalBtn: document.getElementById('closeUpdateModalBtn'),
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
    elements.cancelUpdateBtn.addEventListener('click', cancelUpdateModal);
    elements.updateForm.addEventListener('submit', handleDatabaseSubmit);

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
        <tr data-id="${database.id}" data-is-deleted="${database.isDeleted}">
            <td>${database.conn_name}</td>
            <td>${database.host}</td>
            <td>${database.port}</td>
            <td>${database.database_name}</td>
            <td>${database.username}</td>
            <td>${database.isActive ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <!-- Test Connection Button -->
                    <button class="btn btn-secondary" data-id="${database.id}" data-conn-name="${database.conn_name}" data-host="${database.host}" data-port="${database.port}" data-database-name="${database.database_name}" data-username="${database.username}" data-password="${database.password}">
                        Test Connection
                    </button>
                    <!-- Update Button -->
                    <button class="btn btn-secondary update-database-btn" data-id="${database.id}" data-conn-name="${database.conn_name}" data-host="${database.host}" data-port="${database.port}" data-database-name="${database.database_name}" data-username="${database.username}" data-password="${database.password}" data-is-active="${database.isActive}">
                        Edit
                    </button>
                    <!-- Delete Button -->
                    <button class="btn btn-danger delete-database-btn" data-id="${database.id}" data-isDeleted="${database.isDeleted}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to update buttons
    document.querySelectorAll('.update-database-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedDatabaseId = button.dataset.id;
            console.log('Selected ID:', selectedDatabaseId);
            showUpdateDatabaseModal(selectedDatabaseId);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-database-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedDatabaseId = button.dataset.id;
            console.log('Deleting database with ID:', id);
            showDeleteConfirmation(selectedDatabaseId);
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


// Show update database modal
function showUpdateDatabaseModal(id) {


    // Find the row using data-id
    const row = document.querySelector(`tr[data-id="${id}"]`);
    if (!row) {
        console.error('Database row not found for ID:', id);
        return;
    }

    // Get data from button dataset instead of table cells
    const button = row.querySelector('.update-database-btn');
    selectedDatabaseId = id;

    // Populate form fields
    elements.updateForm.elements.conn_name.value = button.dataset.conn_name;
    elements.updateForm.elements.host.value = button.dataset.host;
    elements.updateForm.elements.port.value = button.dataset.port;
    elements.updateForm.elements.database_name.value = button.dataset.database_name;
    elements.updateForm.elements.username.value = button.dataset.username;
    elements.updateForm.elements.password.value = ''; // Clear password field
    elements.updateForm.elements.isActive.checked = button.dataset.isActive === 'true';

    elements.updateModal.style.display = 'block';
}




// Close modal
function closeModal() {
    elements.databaseModal.style.display = 'none';
    elements.updateModal.style.display = 'none';
    elements.databaseForm.reset();
    //elements.updateDatabaseForm.reset();
    selectedDatabaseId = null;
}

// Cancel update confirmation modal
function cancelUpdateModal() {
    elements.updateModal.style.display = 'none';
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

// Cancel delete confirmation modal
function cancelDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedDatabaseId = null;
}

// Handle form submission for add/update database
// Handle form submission for add/update database
async function handleDatabaseSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const isUpdate = !!selectedDatabaseId;

    // Prepare base data object
    const databaseData = {
        conn_name: formData.get('conn_name'),
        host: formData.get('host'),
        port: formData.get('port') ? parseInt(formData.get('port')) : null,
        database_name: formData.get('database_name'),
        username: formData.get('username'),
        isActive: formData.get('isActive') === 'on'
    };

    // Only add password if it's provided
    const password = formData.get('password');
    if (password) {
        databaseData.password = password;
    }

    try {
        const url = isUpdate 
            ? `/api/sybase/updateDatabase/${selectedDatabaseId}`
            : '/api/sybase/saveDatabase';

        const method = isUpdate ? 'PUT' : 'POST';

        // For updates, filter out unchanged fields
        let requestData = databaseData;
        if (isUpdate) {
            requestData = {};
            
            // Only include fields that have values
            for (const [key, value] of Object.entries(databaseData)) {
                if (value !== null && value !== undefined && value !== '') {
                    requestData[key] = value;
                }
            }
            
            // Add password separately if provided
            if (password) {
                requestData.password = password;
            }

            if (Object.keys(requestData).length === 0) {
                throw new Error('No changes detected');
            }
        }

        const response = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Operation failed');
        }

        closeModal();
        selectedDatabaseId = null; 
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
        const response = await fetch(`/api/sybase/deleteDatabase/${selectedDatabaseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete database');
        }

        closeDeleteModal();
        selectedDatabaseId = null; 
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