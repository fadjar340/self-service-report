const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
};


// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadQueries();
    await setupEventListeners();
});

function setupEventListeners() {
    // Navigation buttons
    elements.logoutBtn.addEventListener('click', logout);
}

// Function to check authentication status
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/current-user', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/index.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        updateUserInfo(data.user);
    } catch (error) {
        window.location.href = '/index.html';
    }
}

// Function to update UI with user info
function updateUserInfo(user) {
    const userInfoElements = document.getElementsByClassName('user-info');
    for (const element of userInfoElements) {
        element.textContent = `Welcome, ${user.username}`;
    }

    const roleElements = document.getElementsByClassName('user-role');
    for (const element of roleElements) {
        element.textContent = `Role: ${user.role}`;
    }
}

// Load queries into the querySelect dropdown
async function loadQueries() {
    try {
        const response = await fetch('/api/postgres/queries', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load queries');
        }

        const data = await response.json();
        displayQueries(data.queries);
    } catch (error) {
        console.error('Error loading queries:', error);
        alert('Failed to load queries');
    }
}

function displayQueries(queries) {
    const queriesTableBody = document.getElementById('queriesTableBody');
    
    queriesTableBody.innerHTML = queries.map(query => `
        <tr data-id="${query.id}">
            <td>${query.name}</td>
            <td>${query.description || 'N/A'}</td>
            <td>${query.conn_name || 'N/A'}</td>
            <td>${query.database_name || 'N/A'}</td>
            <td>
                <button class="btn btn-primary execute-btn" 
                        data-id="${query.id}" 
                        data-database-id="${query.databaseId}">
                    <i class="fas fa-play"></i> Execute
                </button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.execute-btn').forEach(button => {
        button.addEventListener('click', () => {
            const queryId = button.dataset.id;
            const databaseId = button.dataset.databaseId;
            showParameterModal(queryId, databaseId);
        }); 
    });
}

function showParameterModal(queryId, databaseId) {
    document.getElementById('parameterModal').style.display = 'block';
    document.getElementById('hiddenQueryId').value = queryId;
    document.getElementById('hiddenDatabaseId').value = databaseId;
    
    // Initialize Flatpickr datepickers with local time zone and milliseconds
    flatpickr("#startDate", {
        enableTime: true,
        dateFormat: "Y-m-d H:i:S",
        defaultDate: new Date(),
        time_24hr: true,
        onChange: (selectedDates) => {
            // Format the date to include milliseconds
            const localDate = new Date(selectedDates[0]);
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const hours = String(localDate.getHours()).padStart(2, '0');
            const minutes = String(localDate.getMinutes()).padStart(2, '0');
            const seconds = String(localDate.getSeconds()).padStart(2, '0');
            
            document.getElementById('startDate').value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            validateDates();
        }
    });
    
    flatpickr("#endDate", {
        enableTime: true,
        dateFormat: "Y-m-d H:i:S",
        defaultDate: new Date(),
        time_24hr: true,
        onChange: (selectedDates) => {
            // Format the date to include milliseconds
            const localDate = new Date(selectedDates[0]);
            const year = localDate.getFullYear();
            const month = String(localDate.getMonth() + 1).padStart(2, '0');
            const day = String(localDate.getDate()).padStart(2, '0');
            const hours = String(localDate.getHours()).padStart(2, '0');
            const minutes = String(localDate.getMinutes()).padStart(2, '0');
            const seconds = String(localDate.getSeconds()).padStart(2, '0');
            
            document.getElementById('endDate').value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            validateDates();
        }
    });
}

function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const executeBtn = document.getElementById('executeQueryInModalBtn');
    
    // Clear previous alerts
    executeBtn.disabled = false;

    // Check if both dates are provided
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        executeBtn.disabled = true;
        return;
    }

    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        alert('Please enter valid dates');
        executeBtn.disabled = true;
        return;
    }

    // Check if start date is before end date
    if (start > end) {
        alert('Start date cannot be after end date');
        executeBtn.disabled = true;
        return;
    }

    // Check if date range exceeds 2 days
    const dateDiff = end - start;
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    if (daysDiff > 2) {
        alert('Date range cannot exceed 2 days');
        executeBtn.disabled = true;
        return;
    }

    // If all validations pass
    executeBtn.disabled = false;
}

// Replace the modal showing code with this
document.getElementById('executeQueryInModalBtn').addEventListener('click', async () => {
    const queryId = document.getElementById('hiddenQueryId').value;
    const databaseId = document.getElementById('hiddenDatabaseId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!queryId || !startDate || !endDate || !databaseId) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        showLoading(false);
        // Open results in new page
        const newWindow = window.open(`results.html?queryId=${queryId}&databaseId=${databaseId}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`, '_blank', 'width=1800,height=1200,resizable=yes,scrollbars=yes');
        if (newWindow) {
            newWindow.focus();
        } else {
            alert('Please allow popups for this application');
        }
    } catch (error) {
        console.error('Error executing query:', error);
        alert(`Error executing query: ${error.message}`);
    } finally {
        showLoading(false);
    }
});

let loader; // Declare loader outside the function

function showLoading(isLoading) {
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = '<div class="spinner"></div>';
    }
    
    if (isLoading) {
        document.body.appendChild(loader);
    } else {
        if (document.body.contains(loader)) {
            document.body.removeChild(loader);
        }
    }
}

// Close modals when clicking the close button
document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('resultsModal').style.display = 'none';
});

document.getElementById('closeParameterModalBtn').addEventListener('click', () => {
    document.getElementById('parameterModal').style.display = 'none';
});

document.getElementById('closeResultsModal').addEventListener('click', () => {
    document.getElementById('resultsModal').style.display = 'none';
});

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