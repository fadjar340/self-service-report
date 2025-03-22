document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let currentUser = {};
    let updateInterval = 5000; // Update every 5 seconds
    
    // Check if user is authenticated
    checkAuthentication();
    
    // Initial data fetch
    fetchData();
    
    // Set up periodic updates
    setInterval(fetchData, updateInterval);
    
    // Set up event listeners
    document.getElementById('resetStatsBtn').addEventListener('click', resetStatistics);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Function to check authentication
    async function checkAuthentication() {
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
            if (!data.user) {
                window.location.href = '/index.html';
                return;
            }
    
            // Populate currentUser with user information
            currentUser = {
                role: data.user.role,
                username: data.user.username
            };
    
            // Display username
            document.getElementById('username').textContent = data.user.username;
        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = '/index.html';
        }
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
            updateHealthStatus(healthData);
            updateStatistics(statsData.stats);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            showNetworkError();
        }
    }
    
    // Function to update health status UI
    function updateHealthStatus(healthData) {
        const healthIndicator = document.getElementById('healthIndicator');
        const healthStatus = healthData.status;
        
        // Update health indicator
        healthIndicator.className = 'health-indicator';
        healthIndicator.classList.add(healthStatus);
        
        if (healthStatus === 'healthy') {
            healthIndicator.innerHTML = `<i class="fas fa-check-circle"></i><span>Healthy</span>`;
        } else {
            healthIndicator.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>Degraded</span>`;
        }
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
        
        // Display issues if present
        const issuesSection = document.getElementById('issuesSection');
        const issuesList = document.getElementById('issuesList');
        
        if (healthData.issues && healthData.issues.length > 0) {
            issuesSection.classList.remove('hidden');
            issuesList.innerHTML = '';
            
            healthData.issues.forEach(issue => {
                const li = document.createElement('li');
                li.textContent = issue;
                issuesList.appendChild(li);
            });
        } else {
            issuesSection.classList.add('hidden');
        }
    }
    
    // Function to update statistics UI
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
        
        // Update other statistics...
        document.getElementById('dbConnections').textContent = stats.database.connections;
        document.getElementById('activeQueries').textContent = stats.database.activeQueries;
        
        // System information
        document.getElementById('totalMemory').textContent = formatBytes(stats.system.memory.total);
        document.getElementById('usedMemory').textContent = formatBytes(stats.system.memory.used);
        document.getElementById('freeMemory').textContent = formatBytes(stats.system.memory.free);
        document.getElementById('osUptime').textContent = formatDuration(stats.system.uptime);
        
        // Request statistics
        document.getElementById('totalRequests').textContent = stats.requests.total;
        document.getElementById('successRequests').textContent = stats.requests.success;
        document.getElementById('failedRequests').textContent = stats.requests.failed;
        document.getElementById('avgResponseTime').textContent = Math.round(stats.requests.avgResponseTime);
        
        const errorRate = (stats.requests.failed / stats.requests.total) * 100 || 0;
        document.getElementById('errorRate').textContent = errorRate.toFixed(2);
        
        // Database statistics
        document.getElementById('totalQueries').textContent = stats.queries.total;
        document.getElementById('failedQueries').textContent = stats.queries.failed;
        document.getElementById('avgExecutionTime').textContent = Math.round(stats.queries.avgExecutionTime);
        document.getElementById('dbStatus').textContent = stats.database.status;
        
        // System uptime (now using stats.system.uptime from server)
        document.getElementById('systemUptime').textContent = formatDuration(stats.system.uptime);
    }
    
    // Function to reset statistics
    async function resetStatistics() {
        if (currentUser.role !== 'admin') {
            alert('You do not have permission to reset statistics.');
            return;
        }
        
        if (confirm('Are you sure you want to reset all monitoring statistics?')) {
            try {
                const response = await fetch('/api/monitor/stats/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    alert('Statistics reset successfully.');
                    fetchData();
                } else {
                    const errorData = await response.json();
                    alert(`Failed to reset statistics: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Error resetting statistics:', error);
                alert('Failed to reset statistics. Please try again.');
            }
        }
    }
    
    // Function to handle logout
    // Function to handle logout
function logout() {
    // Clear the authentication token from local storage
    localStorage.removeItem('token');
    
    // Redirect to the login page
    window.location.href = '/index.html'; // Update this to your actual login page URL
    
    // Optional: Clear any user-specific data
    currentUser = {};
    document.getElementById('username').textContent = '';
    document.getElementById('userRole').textContent = '';
}
    
    // Function to toggle sidebar
    function toggleSidebar() {
        document.querySelector('body').classList.toggle('sidebar-collapsed');
    }
    
    // Helper function to format bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
});