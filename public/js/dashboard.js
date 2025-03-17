// Global variables
let selectedQueryId = null;

// DOM Elements
const newQueryBtn = document.getElementById('new-query-btn');
const savedQueriesBtn = document.getElementById('saved-queries-btn');
const queryForm = document.getElementById('query-form');
const savedQueriesList = document.getElementById('saved-queries-list');
const queryResults = document.getElementById('query-results');
const databaseSelect = document.getElementById('database-select');
const executeQueryForm = document.getElementById('execute-query-form');
const saveQueryCheckbox = document.getElementById('save-query');
const saveQueryOptions = document.getElementById('save-query-options');
const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await loadDatabases();
    await loadSavedQueries();
    await checkAuthAndRedirect();
});

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

newQueryBtn.addEventListener('click', () => {
    queryForm.style.display = 'block';
    savedQueriesList.style.display = 'none';
    queryResults.style.display = 'none';
});

savedQueriesBtn.addEventListener('click', () => {
    queryForm.style.display = 'none';
    savedQueriesList.style.display = 'block';
    queryResults.style.display = 'none';
    loadSavedQueries();
});

saveQueryCheckbox.addEventListener('change', (e) => {
    saveQueryOptions.style.display = e.target.checked ? 'block' : 'none';
});

executeQueryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await executeQuery();
});

// Load saved queries
async function loadSavedQueries() {
    try {
        const response = await fetch('/api/postgres/queries', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load saved queries');
        }

        const data = await response.json();
        const container = document.querySelector('.queries-container');
        container.innerHTML = '';

        const result = await response.json();
        if (!result.queries || !Array.isArray(result.queries)) {
            throw new Error('Expected an array of Query, but received something else');
        }

        displayDatabases(result.queries);
    } catch (error) {
        showError('Failed to load saved queries: ' + error.message);
    }
}

// Display query results
function displayQueries(queries) {
    if (!queries || !Array.isArray(qeriew)) {
        //console.error('Expected an array of databases, but received:', queries);
        showError('Invalid data format');
        return;
    }

    elements.queriesTableBody.innerHTML = queries.map(query => `
        <tr data-id="${query.id}" data-is-deleted="${query.isDeleted}">
            <td>${query.name}</td>
            <td>${query.decription}</td>
            <td>${query.queryText}</td>
            <td>${query.isActive ? 'Yes' : 'No'}</td>
            <td>
                <div class="action-buttons">
                    <!-- Test Connection Button -->
                    <button class="btn btn-secondary" data-id="${query.id}" data-conn-name="${query.name}" data-description="${query.description}" data-query-text="${query.queryText}"</button>
                        Test Connection
                    </button>
                    <!-- Update Button -->
                    <button class="btn btn-secondary update-database-btn" data-id="${query.id}" data-conn-name="${query.name}" data-description="${query.description}" data-query-text="${query.queryText}" data-is-active="${query.isActive} data-is-deleted="${query.isDeleted}">
                        Edit
                    </button>
                    <!-- Delete Button -->
                    <button class="btn btn-danger delete-database-btn" data-id="${query.id}">
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Add event listeners to update buttons
    document.querySelectorAll('.update-query-btn').forEach(button => {
        button.addEventListener('click', () => {
            const name = button.dataset.name;
            const description = button.dataset.description;
            const queryText = button.dataset.queryText;
            const isActive = button.dataset.isActive;

            // Call the function to show the update modal with the selected database's data
            showUpdateQueryModal(name, description, queryText, isActive);
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-database-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedQueryName = button.dataset.name;
            showQueryConfirmation(selectedQueryConnName);
        });
    });
}

// Execute query
async function executeQuery(queryId = null) {
    try {
        const endpoint = queryId ? 
            `/api/sybase/execute/${queryId}` : 
            '/api/sybase/execute-adhoc';

        const body = queryId ? 
            { databaseId: databaseSelect.value } : 
            {
                databaseId: databaseSelect.value,
                queryText: document.getElementById('query-text').value,
                ...(saveQueryCheckbox.checked && {
                    name: document.getElementById('query-name').value,
                    description: document.getElementById('query-description').value
                })
            };

        const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Query execution failed');
        }

        const data = await response.json();
        displayResults(data);
    } catch (error) {
        showError('Query execution failed: ' + error.message);
    }
}

// Display query results

// Edit query
async function editQuery(queryId) {
    try {
        const response = await fetch(`/api/postgres/queries/${queryId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load query');
        }

        const query = await response.json();
        document.getElementById('query-text').value = query.queryText;
        document.getElementById('query-name').value = query.name;
        document.getElementById('query-description').value = query.description || '';
        saveQueryCheckbox.checked = true;
        saveQueryOptions.style.display = 'block';
        queryForm.style.display = 'block';
        savedQueriesList.style.display = 'none';
    } catch (error) {
        showError('Failed to load query: ' + error.message);
    }
}

// Delete query
async function deleteQuery(queryId) {
    if (!confirm('Are you sure you want to delete this query?')) {
        return;
    }

    try {
        const response = await fetch(`/api/postgres/queries${queryId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete query');
        }

        await loadSavedQueries();
    } catch (error) {
        showError('Failed to delete query: ' + error.message);
    }
}

// Export to CSV
document.getElementById('export-csv').addEventListener('click', () => {
    const table = document.getElementById('results-table');
    const rows = Array.from(table.querySelectorAll('tr'));
    
    const csvContent = rows.map(row => {
        return Array.from(row.cells)
            .map(cell => `"${cell.textContent.replace(/"/g, '""')}"`)
            .join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
});

// Print results
document.getElementById('print-results').addEventListener('click', () => {
    window.print();
});

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
}

function closeErrorModal() {
    errorModal.style.display = 'none';
}

// Cancel query
function cancelQuery() {
    queryForm.style.display = 'none';
    executeQueryForm.reset();
    saveQueryOptions.style.display = 'none';
}
