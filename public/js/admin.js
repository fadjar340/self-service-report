// Global variables
let selectedUserName = null;

// DOM Elements
const elements = {
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    logoutBtn: document.getElementById('logoutBtn'),
    adminDashboardBtn: document.getElementById('adminDashboardBtn'),
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    //initializeMonitoring();
});

function setupEventListeners() {
    // Navigation buttons
    //elements.adminDashboardBtn.addEventListener('click', () => window.location.href = '/admin.html');
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
    console.log('Logout function called'); // Debugging line
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        console.log('Logout response:', response); // Debugging line
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        sessionStorage.clear();
        window.location.href = '/index.html';
    }
}