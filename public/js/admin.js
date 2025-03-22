let updateInterval = 5000; // Update every 5 seconds


// DOM Elements
const elements = {
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
    fetchData();
    setInterval(fetchData, updateInterval);
});



function setupEventListeners() {

    // Navigation buttons
    elements.logoutBtn.addEventListener('click', logout);

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

   // Function to fetch data from APIs
   async function fetchData() {
    try {
        // Fetch health status with authentication header
        const healthResponse = await fetch('/api/monitor/health', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const healthData = await healthResponse.json();
        
        // Fetch detailed stats with authentication header
        const statsResponse = await fetch('/api/monitor/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const statsData = await statsResponse.json();
        
        // Update UI with fetched data
        updateStatistics(statsData.stats);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showNetworkError();
    }
}

function updateStatistics(stats) {
    // System metrics
    const cpuUsage = Math.round(stats.system.cpu);
    const memoryUsagePercent = (stats.system.memory.used / stats.system.memory.total) * 100;
    
    // Update CPU Usage
    document.getElementById('cpuUsage').textContent = cpuUsage;
    document.getElementById('cpuProgressBar').style.width = `${cpuUsage}%`;
    
    // Set CPU color based on usage
    const cpuProgressBar = document.getElementById('cpuProgressBar');
    const cpuUsageText = document.getElementById('cpuUsage');
    
    if (cpuUsage < 50) {
        cpuProgressBar.className = 'progress progress-blue';
        cpuUsageText.className = 'percentage blue-text';
    } else if (cpuUsage > 50 && cpuUsage < 80) {
        cpuProgressBar.className = 'progress progress-yellow';
        cpuUsageText.className = 'percentage yellow-text';
    } else {
        cpuProgressBar.className = 'progress progress-red';
        cpuUsageText.className = 'percentage red-text';
    }
    
    // Update Memory Usage
    const memoryUsage = Math.round(memoryUsagePercent);
    document.getElementById('memoryUsage').textContent = memoryUsage;
    document.getElementById('memoryProgressBar').style.width = `${memoryUsage}%`;
    
    // Set Memory color based on usage
    const memoryProgressBar = document.getElementById('memoryProgressBar');
    const memoryUsageText = document.getElementById('memoryUsage');
    
    if (memoryUsage < 50) {
        memoryProgressBar.className = 'progress progress-blue';
        memoryUsageText.className = 'percentage blue-text';
    } else if (memoryUsage > 50 && memoryUsage < 80) {
        memoryProgressBar.className = 'progress progress-yellow';
        memoryUsageText.className = 'percentage yellow-text';
    } else {
        memoryProgressBar.className = 'progress progress-red';
        memoryUsageText.className = 'percentage red-text';
    }    
}

   // Helper function to format duration
   function formatDuration(seconds) {
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
    result += `${seconds}s`;
    
    return result.trim();
}


// Function to show network error
function showNetworkError() {
    alert('Failed to fetch monitoring data. Please check your connection and try again.');
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