// Global variables
let selectedUserId = null;

// DOM Elements
const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    addUserBtn: document.getElementById('addUserBtn'),
    userForm: document.getElementById('userForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    userModal: document.getElementById('userModal'),
    deleteModal: document.getElementById('deleteModal'),
    usersTableBody: document.getElementById('usersTableBody'),
    cancelModalBtn: document.getElementById('cancelModalBtn'), // Was 'cancelBtn'
    editUserBtn: document.getElementById('editUserBtn'), // Was 'editUser'
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    checkAuthAndRedirect();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation buttons
    elements.logoutBtn.addEventListener('click', logout);

    // User management buttons
    elements.addUserBtn.addEventListener('click', showAddUserModal);
    elements.userForm.addEventListener('submit', handleUserSubmit);

    // Modal close buttons
    elements.closeModalBtn.addEventListener('click', closeModal);
    elements.cancelModalBtn.addEventListener('click', closeModal);
    elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    elements.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
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

// Fetch and display users
async function loadUsers() {
    try {
        const response = await fetch('/api/users', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

// Display users in the table
function displayUsers(users) {
    elements.usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>
                <span class="role-badge ${user.role}">
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </td>
            <td>${new Date(user.createdAt).toLocaleString()}</td>
            <td>${user.isActive ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" 
                            data-id="${user.id}" 
                            data-username="${user.username}" 
                            data-role="${user.role}" 
                            data-password="${user.password}"
                            data-is-active="${user.isActive}">
                        Edit
                    </button>
                    <button class="btn btn-delete btn-danger" 
                            data-id="${user.id}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const { id } = button.dataset;
            const { username } = button.dataset;
            const { role } = button.dataset;
            const { password } = button.dataset;
            const { isActive } = button.dataset;
            editUser(id, username, role, password, isActive);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', () => {
            selectedUserId = button.dataset.id;
            showDeleteConfirmation(selectedUserId);
        });
    });
}

// Show add user modal
function showAddUserModal() {
    selectedUserId = null;
    document.getElementById('modalTitle').textContent = 'Add User';
    elements.userForm.reset();
    document.getElementById('password').required = true;
    elements.userModal.style.display = 'block';
}

// Show edit user modal
function editUser(id, username, role, password, isActive) {
    selectedUserId = id;
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('username').value = username;
    document.getElementById('role').value = role;
    document.getElementById('password').required = false;
    document.getElementById('isActive').checked = isActive === 'true';
    elements.userModal.style.display = 'block';
}

// Close modal
function closeModal() {
    elements.userModal.style.display = 'none';
    elements.userForm.reset();
}

// Show delete confirmation modal
function showDeleteConfirmation(id) {
    selectedUserId = id;
    elements.deleteModal.style.display = 'block';
}

// Close delete confirmation modal
function closeDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedUserId = null;
}

// Handle form submission
// Handle form submission
async function handleUserSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        role: formData.get('role'),
        // Check if the isActive checkbox is present in the form data
        isActive: formData.has('isActive') ? true : false
    };

    // Only include password if it's provided (for editing) or required (for new user)
    const password = formData.get('password');
    if (password) {
        userData.password = password;
    }

    try {
        const url = selectedUserId
            ? `/api/users/${selectedUserId}`
            : '/api/users';
        
        const response = await fetch(url, {
            method: selectedUserId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

        //console.log('Response from server:', response); // Add this line for debugging
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save user');
        }

        closeModal();
        loadUsers();
        showSuccess(selectedUserId ? 'User updated successfully' : 'User created successfully');
    } catch (error) {
        console.error('Error saving user:', error);
        showError(error.message);
    }
}

// Confirm and execute user deletion
async function confirmDelete() {
    try {
        const response = await fetch(`/api/users/${selectedUserId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete user');
        }

        closeDeleteModal();
        loadUsers();
        showSuccess('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
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