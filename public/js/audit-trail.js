const elements = {
    filterForm: document.getElementById('filterForm'),
    auditLogsTableBody: document.getElementById('auditLogsTable').getElementsByTagName('tbody')[0],
    pagination: document.getElementById('pagination'),
    loader: document.getElementById('loader'),
    logoutBtn: document.getElementById('logoutBtn')
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect();
    setupEventListeners();
    loadAuditLogs();
    scheduleDeleteOldLogs();
});

function setupEventListeners() {
    elements.filterForm.addEventListener('submit', handleFilterSubmit);
    elements.logoutBtn.addEventListener('click', logout);
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

function showLoader() {
    elements.loader.classList.remove('hidden');
}

function hideLoader() {
    elements.loader.classList.add('hidden');
}

function displayAuditLogs(logs, total, page, totalPages) {
    elements.auditLogsTableBody.innerHTML = '';
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.id}</td>
            <td>${log.timestamp}</td>
            <td>${log.user_name}</td>
            <td>${log.action}</td>
            <td>${log.resource}</td>
            <td>${log.ipAddress}</td>
            <td>${JSON.stringify(log.details)}</td>
        `;
        elements.auditLogsTableBody.appendChild(row);
    });

    elements.pagination.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.classList.add('page-btn');
        if (i === page) btn.classList.add('active');
        btn.textContent = i;
        btn.onclick = () => fetchAuditLogs({ page: i });
        elements.pagination.appendChild(btn);
    }
}

function fetchAuditLogs(params = {}) {
    showLoader();
    const query = new URLSearchParams(params).toString();
    fetch(`/api/audit/get-audit?${query}`,{
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        })    
        .then(response => response.json())
        .then(data => {
            hideLoader();
            displayAuditLogs(data.logs, data.total, data.page, data.totalPages);
        })
        .catch(error => {
            hideLoader();
            console.error('Error fetching audit logs:', error);
        });
}

function handleFilterSubmit(e) {
    e.preventDefault();
    const formData = new FormData(elements.filterForm);
    const params = {};
    for (let [key, value] of formData.entries()) {
        if (value) params[key] = value;
    }
    fetchAuditLogs(params);
}

async function scheduleDeleteOldLogs() {
    const deleteOldLogs = () => {
        fetch('/api/audit/old', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data.message);
        })
        .catch(error => {
            console.error('Error deleting old audit logs:', error);
        });
    };

    // Run immediately when the page loads
    deleteOldLogs();
    
    // Schedule to run every day at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const delay = tomorrow - now;
    setTimeout(() => {
        // Set up recurring daily deletion
        const dailyDeletion = () => {
            deleteOldLogs();
            setTimeout(dailyDeletion, 24 * 60 * 60 * 1000);
        };
        dailyDeletion();
    }, delay);
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

async function loadAuditLogs() {
    fetchAuditLogs();
}