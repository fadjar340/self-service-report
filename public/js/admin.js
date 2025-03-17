// Global variables
let selectedUserId = null;

// DOM Elements
const elements = {
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    logoutBtn: document.getElementById('logoutBtn'),
    adminDashboardBtn: document.getElementById('adminDashboardBtn'),
    databaseManagementBtn: document.getElementById('databaseManagementBtn'),
    userManagementBtn: document.getElementById('userManagementBtn'),
    queryManagementBtn: document.getElementById('queryManagementBtn'),
    healthcheckManagementBtn: document.getElementById('healthcheckManagementBtn'),
    audittrailManagementBtn: document.getElementById('audittrailManagementBtn'),
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    //initializeMonitoring();
});

function setupEventListeners() {

    // Navigation buttons
    //elements.adminDashboardBtn.addEventListener('click', () => window.location.href = '/admin.html');
    if (elements.databaseManagementBtn) {
        elements.databaseManagementBtn.addEventListener('click', () => {
            window.location.assign('/database-management.html');
        });
    }

    if (elements.userManagementBtn) {
        elements.userManagementBtn.addEventListener('click', () => {
            window.location.assign('/user-management.html');
        });
    }

    if (elements.queryManagementBtn) {
        elements.queryManagementBtn.addEventListener('click', () => {
            window.location.assign('/database.html');
        });
    }

    if (elements.healthcheckManagementBtn) {
        elements.healthcheckManagementBtn.addEventListener('click', () => {
            window.location.assign('/health-check.html');
        });
    }

    if (elements.audittrailManagementBtn) {
        elements.audittrailManagementBtn.addEventListener('click', () => {
            window.location.assign('/audit-trail.html');
        });
    }
    elements.logoutBtn.addEventListener('click', logout);

    // Tab Switching
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
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

function switchTab(tabName) {
    elements.tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    elements.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear the token from localStorage
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }
}