// Global variables
let selectedQueryId = null;

// DOM Elements
const elements = {
    //adminDashboardBtn: document.getElementById('adminDashboardBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    addQueryBtn: document.getElementById('addQueryBtn'),
    queryForm: document.getElementById('queryForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    queryModal: document.getElementById('queryModal'),
    deleteModal: document.getElementById('deleteModal'),
    queriesTableBody: document.getElementById('queriesTableBody'),
    executeQueryBtn: document.getElementById('executeQueryBtn')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadQueries();
    //checkAuthAndRedirect();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation buttons
    //elements.adminDashboardBtn.addEventListener('click', () => window.location.href = '/admin.html');
    elements.logoutBtn.addEventListener('click', logout);

    // Query management buttons
    elements.addQueryBtn.addEventListener('click', showAddQueryModal);
    elements.queryForm.addEventListener('submit', handleQuerySubmit);

    // Modal close buttons
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelBtn.addEventListener('click', closeModal);
    elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Execute Query button
    elements.executeQueryBtn.addEventListener('click', executeQuery);
}

// Check if user is authenticated and has admin role
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
            // Redirect non-admin users to index.html instead of admin.html
            window.location.href = '/index.html'; // <- Changed this line
            return;
        }

        // Display username
        document.getElementById('username').textContent = data.user.username;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/index.html';
    }
}

// Fetch and display queries
async function loadQueries() {
    try {
        showLoading(true);
        const response = await fetch('/api/queries/loadQueries', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch queries');
        }

        const result = await response.json();
        if (!result.queries || !Array.isArray(result.queries)) {
            throw new Error('Expected an array of queries, but received something else');
        }

        displayQueries(result.queries);
    } catch (error) {
        console.error('Error loading queries:', error);
        showError('Failed to load queries');
    } finally {
        showLoading(false);
    }
}

// Display queries in the table
function displayQueries(queries) {
    if (!queries || !Array.isArray(queries)) {
        //console.error('Expected an array of databases, but received:', databases);
        showError('Invalid data format');
        return;
    }
    elements.queriesTableBody.innerHTML = queries.map(query => `
        <trdata-id="${query.id}" data-is-deleted="${query.isDeleted}">>
            <td>${query.name}</td>
            <td>${query.description || 'N/A'}</td>
            <td>${query.queryText}</td>
            <td>${new Date(query.createdAt).toLocaleString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" data-query-id="${query.id}" data-name="${query.name}" data-description="${query.description}" data-query-text="${query.queryText}">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn-delete" data-query-id="${query.id}">
                        <i class="fas fa-trash-alt"></i>
                        Delete
                    </button>
                    <button class="btn-execute" data-query-id="${query.id}">
                        <i class="fas fa-play"></i>
                        Execute
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to edit, delete, and execute buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const { queryId, name, description, queryText } = button.dataset;
            editQuery(queryId, name, description, queryText);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', () => {
            showDeleteConfirmation(button.dataset.queryId);
        });
    });

    document.querySelectorAll('.btn-execute').forEach(button => {
        button.addEventListener('click', () => {
            executeQuery(button.dataset.queryId);
        });
    });
}

// Show add query modal
function showAddQueryModal() {
    selectedQueryId = null;
    document.getElementById('modalTitle').textContent = 'Add Query';
    elements.queryForm.reset();
    elements.queryModal.style.display = 'block';
}

// Show edit query modal
function editQuery(id, name, description, queryText) {
    selectedQueryId = id;
    document.getElementById('modalTitle').textContent = 'Edit Query';
    document.getElementById('name').value = name;
    document.getElementById('description').value = description || '';
    document.getElementById('queryText').value = queryText;
    elements.queryModal.style.display = 'block';
}

// Close modal
function closeModal() {
    elements.queryModal.style.display = 'none';
    elements.queryForm.reset();
}

// Show delete confirmation modal
function showDeleteConfirmation(id) {
    selectedQueryId = id;
    elements.deleteModal.style.display = 'block';
}

// Close delete confirmation modal
function closeDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedQueryId = null;
}

// Handle form submission
async function handleQuerySubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const queryData = {
        name: formData.get('name'),
        description: formData.get('description'),
        queryText: formData.get('queryText')
    };

    try {
        showLoading(true);
        const url = selectedQueryId 
            ? `/api/queries/saveQuery/${selectedQueryId}`
            : '/api/queries/saveQuery';
        
        const response = await fetch(url, {
            method: selectedQueryId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(queryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save query');
        }

        closeModal();
        loadQueries();
        showSuccess(selectedQueryId ? 'Query updated successfully' : 'Query created successfully');
    } catch (error) {
        console.error('Error saving query:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Confirm and execute query deletion
async function confirmDelete() {
    try {
        showLoading(true);
        const response = await fetch(`/api/queries/deleteQuery/${selectedQueryId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete query');
        }

        closeDeleteModal();
        loadQueries();
        showSuccess('Query deleted successfully');
    } catch (error) {
        console.error('Error deleting query:', error);
        showError(error.message);
    } finally {
        showLoading(false);
        closeDeleteModal();
    }
}

// Execute a query
async function executeQuery(queryId) {
    try {
        showLoading(true);
        const response = await fetch(`/api/queries/execute/${queryId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ databaseId: 1 }) // Replace with actual database ID
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to execute query');
        }

        const result = await response.json();
        showSuccess('Query executed successfully');
        console.log('Query result:', result);
    } catch (error) {
        console.error('Error executing query:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Show loading state
function showLoading(isLoading) {
    const loader = document.getElementById('loader');
    if (isLoading) {
        loader.style.display = 'block';
    } else {
        loader.style.display = 'none';
    }
}

// Show success message
function showSuccess(message) {
    // Implement a toast notification system here
    alert(message);
}

// Show error message
function showError(message) {
    // Implement a toast notification system here
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
        sessionStorage.clear();
        window.location.href = '/index.html';
    }
}