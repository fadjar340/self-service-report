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
                <button class="btn btn-primary execute-btn" data-id="${query.id}">
                    <i class="fas fa-play"></i> Execute
                </button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.execute-btn').forEach(button => {
        button.addEventListener('click', () => {
            const queryId = button.dataset.id;
            showParameterModal(queryId);
        }); 
    });
}

function showParameterModal(queryId) {
    document.getElementById('parameterModal').style.display = 'block';
    document.getElementById('hiddenQueryId').value = queryId;
    
    // Initialize Flatpickr datepickers
    flatpickr("#startDate", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        defaultDate: new Date(),
        onChange: (selectedDates) => {
            document.getElementById('startDate').value = selectedDates[0].toISOString();
            validateDates();
        }
    });
    
    flatpickr("#endDate", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        defaultDate: new Date(),
        onChange: (selectedDates) => {
            document.getElementById('endDate').value = selectedDates[0].toISOString();
            validateDates();
        }
    });
}

function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if ((end - start) / (1000 * 60 * 60 * 24) > 7) {
            alert('Date range cannot exceed 7 days');
            document.getElementById('executeQueryInModalBtn').disabled = true;
        } else {
            document.getElementById('executeQueryInModalBtn').disabled = false;
        }
    }
}

// Execute query functionality
document.getElementById('executeQueryInModalBtn').addEventListener('click', async () => {
    const queryId = document.getElementById('hiddenQueryId').value;
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
    
    document.getElementById('resultsModal').style.display = 'block';
    document.getElementById('parameterModal').style.display = 'none';
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

document.getElementById('downloadCsvBtn').addEventListener('click', async () => {
    const queryId = document.getElementById('hiddenQueryId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!queryId || !startDate || !endDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
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
        downloadResults(data, 'csv');
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert(`Error downloading CSV: ${error.message}`);
    }
});

document.getElementById('downloadXlsBtn').addEventListener('click', async () => {
    const queryId = document.getElementById('hiddenQueryId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!queryId || !startDate || !endDate) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
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
        downloadResults(data, 'xls');
    } catch (error) {
        console.error('Error downloading XLS:', error);
        alert(`Error downloading XLS: ${error.message}`);
    }
});

function downloadResults(data, format) {
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