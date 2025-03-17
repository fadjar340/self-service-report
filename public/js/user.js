// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadQueries();
    initializeDatePickers();
});

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
        if (data.user.role === 'admin') {
            window.location.href = '/user.html';
            return;
        }
        updateUserInfo(data.user);
    } catch (error) {
        window.location.href = '/index.html';
    }
}

// Function to handle login
async function login(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        localStorage.setItem('token', data.token);

        errorDiv.textContent = '';
        errorDiv.style.display = 'none';

        if (data.user.role === 'admin') {
            window.location.href = '/user.html';
        } else {
            window.location.href = '/ordinary-user.html';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Function to handle logout
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
        localStorage.removeItem('token');
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

    const adminElements = document.getElementsByClassName('admin-only');
    for (const element of adminElements) {
        element.style.display = user.role === 'admin' ? 'block' : 'none';
    }
}

// Add event listeners if elements exist
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

// Initialize date pickers
function initializeDatePickers() {
    const startDatePicker = new window.DatePicker(document.getElementById('startDatePicker'), {
        dateFormat: 'yyyy-MM-dd HH:mm',
        showTimeSelect: true,
        timeCaption: 'Time',
        onChange: (date) => {
            document.getElementById('startDate').value = date;
            validateDates();
        }
    });

    const endDatePicker = new window.DatePicker(document.getElementById('endDatePicker'), {
        dateFormat: 'yyyy-MM-dd HH:mm',
        showTimeSelect: true,
        timeCaption: 'Time',
        onChange: (date) => {
            document.getElementById('endDate').value = date;
            validateDates();
        }
    });

    // Set default dates
    const now = new Date();
    startDatePicker.setDate(now);
    endDatePicker.setDate(now);
}

function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if ((end - start) / (1000 * 60 * 60 * 24) > 7) {
            alert('Date range cannot exceed 7 days');
            document.getElementById('executeQueryBtn').disabled = true;
        } else {
            document.getElementById('executeQueryBtn').disabled = false;
        }
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
        const querySelect = document.getElementById('querySelect');

        data.queries.forEach(query => {
            const option = document.createElement('option');
            option.value = query.id;
            option.textContent = query.name;
            querySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading queries:', error);
        alert('Failed to load queries');
    }
}

// Execute query functionality
document.getElementById('executeQueryBtn').addEventListener('click', async () => {
    const queryId = document.getElementById('querySelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!queryId || !startDate || !endDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        showLoading(true);
        const response = await fetch('/api/sybase/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                queryId,
                startDate,
                endDate
            })
        });
        
        if (!response.ok) {
            throw new Error(await response.text());
        }
        
        const data = await response.json();
        displayResultsModal(data);
    } catch (error) {
        console.error('Error executing query:', error);
        alert(`Error executing query: ${error.message}`);
    } finally {
        showLoading(false);
    }
});

function displayResultsModal(data) {
    // Load the modal template
    const modalHTML = `
        <div class="modal" id="resultsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Query Results</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="results-controls">
                        <label for="rowsPerPage">Rows per page:</label>
                        <select id="rowsPerPage">
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <div class="results-info" id="resultsInfo">Showing ${data.metadata.rowCount} results</div>
                    </div>
                    <div class="table-container">
                        <table id="resultsTable">
                            <thead>
                                <tr id="resultsHeader"></tr>
                            </thead>
                            <tbody id="resultsBody"></tbody>
                        </table>
                    </div>
                    <div class="pagination" id="paginationControls"></div>
                </div>
                <div class="modal-footer">
                    <button id="downloadCsvBtn" class="btn btn-secondary">Download CSV</button>
                    <button id="downloadXlsBtn" class="btn btn-secondary">Download XLS</button>
                    <button class="btn btn-primary" id="closeResultsModal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('resultsModal');
    modal.style.display = 'block';
    
    // Populate the results table
    populateResultsTable(data);
    
    // Add event listeners
    document.querySelector('.close-btn').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    document.getElementById('closeResultsModal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    document.getElementById('downloadCsvBtn').addEventListener('click', () => {
        downloadResults('csv');
    });
    
    document.getElementById('downloadXlsBtn').addEventListener('click', () => {
        downloadResults('xls');
    });
    
    document.getElementById('rowsPerPage').addEventListener('change', () => {
        paginateResults();
    });
}

function populateResultsTable(data) {
    const resultsHeader = document.getElementById('resultsHeader');
    const resultsBody = document.getElementById('resultsBody');
    const resultsInfo = document.getElementById('resultsInfo');
    const paginationControls = document.getElementById('paginationControls');
    
    resultsInfo.textContent = `Showing ${data.metadata.rowCount} results`;
    
    // Clear previous results
    resultsHeader.innerHTML = '';
    resultsBody.innerHTML = '';
    
    if (data.data.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" class="text-center">No results found</td>';
        resultsBody.appendChild(emptyRow);
        return;
    }
    
    // Create table header
    const headers = Object.keys(data.data[0]);
    const headerRow = document.createElement('tr');
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    
    resultsHeader.appendChild(headerRow);
    
    // Create table body
    data.data.forEach(row => {
        const tr = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] !== undefined ? row[header] : '';
            tr.appendChild(td);
        });
        
        resultsBody.appendChild(tr);
    });
    
    // Initialize pagination
    paginateResults();
}

function paginateResults() {
    const rowsPerPage = document.getElementById('rowsPerPage').value;
    const tableBody = document.getElementById('resultsBody');
    const rows = tableBody.querySelectorAll('tr');
    const totalPages = Math.ceil(rows.length / rowsPerPage);
    
    // Clear current pagination
    paginationControls.innerHTML = '';
    
    if (totalPages > 1) {
        // Create pagination controls
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.add('page-btn');
            if (i === 1) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => {
                showPage(i);
            });
            paginationControls.appendChild(pageBtn);
        }
    }
    
    // Show first page
    showPage(1);
}

function showPage(pageNumber) {
    const rowsPerPage = document.getElementById('rowsPerPage').value;
    const tableBody = document.getElementById('resultsBody');
    const rows = tableBody.querySelectorAll('tr');
    const startIdx = (pageNumber - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    
    // Hide all rows
    rows.forEach(row => {
        row.style.display = 'none';
    });
    
    // Show rows for current page
    for (let i = startIdx; i < endIdx && i < rows.length; i++) {
        rows[i].style.display = '';
    }
    
    // Update active page button
    const pageBtns = document.querySelectorAll('.page-btn');
    pageBtns.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.textContent) === pageNumber) {
            btn.classList.add('active');
        }
    });
}

function downloadResults(format) {
    const resultsTable = document.getElementById('resultsTable');
    const rows = Array.from(resultsTable.querySelectorAll('tr'));
    
    const csvContent = rows.map(row => {
        return Array.from(row.cells)
            .map(cell => `"${cell.textContent.replace(/"/g, '""')}"`)
            .join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function showLoading(isLoading) {
    const loader = document.createElement('div');
    loader.className = 'loader';
    loader.innerHTML = '<div class="spinner"></div>';
    
    if (isLoading) {
        document.body.appendChild(loader);
    } else {
        document.body.removeChild(loader);
    }
}