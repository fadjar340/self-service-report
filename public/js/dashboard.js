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
});

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

// Load databases
async function loadDatabases() {
    try {
        const response = await fetch('/api/sybase/loadDatabases', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load databases');
        }

        const data = await response.json();
        databaseSelect.innerHTML = '<option value="">Choose a database...</option>';
        
        data.databases.forEach(db => {
            const option = document.createElement('option');
            option.value = db.id;
            option.textContent = db.name;
            databaseSelect.appendChild(option);
        });
    } catch (error) {
        showError('Failed to load databases: ' + error.message);
    }
}

// Load saved queries
async function loadSavedQueries() {
    try {
        const response = await fetch('/api/queries', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load saved queries');
        }

        const data = await response.json();
        const container = document.querySelector('.queries-container');
        container.innerHTML = '';

        if (data.queries.length === 0) {
            container.innerHTML = '<p>No saved queries found.</p>';
            return;
        }

        data.queries.forEach(query => {
            const queryElement = createQueryElement(query);
            container.appendChild(queryElement);
        });
    } catch (error) {
        showError('Failed to load saved queries: ' + error.message);
    }
}

// Create query element
function createQueryElement(query) {
    const div = document.createElement('div');
    div.className = 'saved-query';
    div.innerHTML = `
        <h4>${query.name}</h4>
        <p>${query.description || 'No description'}</p>
        <div class="query-actions">
            <button onclick="executeQuery(${query.id})" class="btn btn-primary">Execute</button>
            <button onclick="editQuery(${query.id})" class="btn">Edit</button>
            <button onclick="deleteQuery(${query.id})" class="btn btn-danger">Delete</button>
        </div>
    `;
    return div;
}

// Execute query
async function executeQuery(queryId = null) {
    try {
        const endpoint = queryId ? 
            `/api/queries/execute/${queryId}` : 
            '/api/queries/execute-adhoc';

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
function displayResults(data) {
    queryResults.style.display = 'block';
    document.getElementById('rows-count').textContent = `Rows: ${data.metadata.rowCount}`;
    document.getElementById('execution-time').textContent = `Time: ${data.metadata.duration}ms`;

    const table = document.getElementById('results-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100%">No results found</td></tr>';
        return;
    }

    // Create header
    const headerRow = document.createElement('tr');
    Object.keys(data.data[0]).forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Create rows
    data.data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value ?? 'NULL';
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

// Edit query
async function editQuery(queryId) {
    try {
        const response = await fetch(`/api/queries/${queryId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
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
        const response = await fetch(`/api/queries/${queryId}`, {
            method: 'DELETE',
            credentials: 'include'
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
