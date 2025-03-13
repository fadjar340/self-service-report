// Global variables
let selectedUserId = null;

// DOM Elements
const elements = {
    //adminDashboardBtn: document.getElementById('adminDashboardBtn'),
    mainDashboardBtn: document.getElementById('mainDashboardBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    addUserBtn: document.getElementById('addUserBtn'),
    userForm: document.getElementById('userForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    userModal: document.getElementById('userModal'),
    deleteModal: document.getElementById('deleteModal'),
    editUserBtn: document.getElementById('editUser'),
    usersTableBody: document.getElementById('usersTableBody')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    checkAuthAndRedirect();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation buttons
    //elements.adminDashboardBtn.addEventListener('click', () => window.location.href = '/admin.html');
    //elements.mainDashboardBtn.addEventListener('click', () => window.location.href = '/dashboard.html');
    elements.logoutBtn.addEventListener('click', logout);

    // User management buttons
    elements.addUserBtn.addEventListener('click', showAddUserModal);
    elements.userForm.addEventListener('submit', handleUserSubmit);
    elements.editUserBtn.addEventListener('click', editUser);

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

// Fetch and display users
async function loadUsers() {
    try {
        const response = await fetch('/api/auth/users', {
            credentials: 'include'
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
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" data-user-id="${user.id}" data-username="${user.username}" data-role="${user.role}">
                        Edit
                    </button>
                    <button class="btn btn-delete btn-danger" data-user-id="${user.id}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', () => {
            const { userId, username, role } = button.dataset;
            editUser(userId, username, role);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', () => {
            showDeleteConfirmation(button.dataset.userId);
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
function editUser(id, username, role) {
    selectedUserId = id;
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('username').value = username;
    document.getElementById('role').value = role;
    document.getElementById('password').required = false;
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
async function handleUserSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        role: formData.get('role')
    };

    // Only include password if it's provided (for editing) or required (for new user)
    const password = formData.get('password');
    if (password) {
        userData.password = password;
    }

    try {
        const url = selectedUserId 
            ? `/api/auth/users/${selectedUserId}`
            : '/api/auth/users';
        
        const response = await fetch(url, {
            method: selectedUserId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });

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
        const response = await fetch(`/api/auth/users/${selectedUserId}`, {
            method: 'DELETE',
            credentials: 'include'
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
    // You can implement a toast notification system here
    alert(message);
}

// Show error message
function showError(message) {
    // You can implement a toast notification system here
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
