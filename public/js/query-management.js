// query-management.js
let selectedQueryId = null;

const elements = {
    logoutBtn: document.getElementById('logoutBtn'),
    addQueryBtn: document.getElementById('addQueryBtn'),
    queryForm: document.getElementById('queryForm'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    //cancelBtn: document.getElementById('cancelBtn'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    queryModal: document.getElementById('queryModal'),
    deleteModal: document.getElementById('deleteModal'),
    editQueryBtn: document.getElementById('editQueryBtn'),
    queriesTableBody: document.getElementById('queriesTableBody'),
    executeQueryBtn: document.getElementById('executeQueryBtn'),
    databaseIdSelect: document.getElementById('databaseId')
};

document.addEventListener('DOMContentLoaded', () => {
    loadDatabases();
    loadQueries();
    setupEventListeners();
});

function setupEventListeners() {
    elements.logoutBtn.addEventListener('click', logout);
    elements.addQueryBtn.addEventListener('click', showAddQueryModal);
    elements.queryForm.addEventListener('submit', handleQuerySubmit);
    elements.closeModalBtn.addEventListener('click', closeModal);
    //elements.cancelBtn.addEventListener('click', closeModal);
    elements.closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
    elements.confirmDeleteBtn.addEventListener('click', confirmDelete);
}

async function loadDatabases() {
    try {
        const response = await fetch('/api/postgres/databases', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch databases');

        const data = await response.json();
        const allDatabases = data.databases || [];

        // Filter databases client-side
        const activeDatabases = allDatabases.filter(db => 
            db.isActive === true && db.isDeleted === false
        );

        elements.databaseIdSelect.innerHTML = '<option value="">-- Select a database --</option>';
        activeDatabases.forEach(db => {
            const option = document.createElement('option');
            option.value = db.id;
            option.textContent = `${db.conn_name} (${db.database_name})`;
            elements.databaseIdSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading databases:', error);
        showError('Failed to load databases');
    }
}

async function loadQueries() {
    try {
        showLoading(true);
        const response = await fetch('/api/postgres/queries', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch queries');
        const result = await response.json();
        displayQueries(result.queries);
    } catch (error) {
        console.error('Error loading queries:', error);
        showError('Failed to load queries');
    } finally {
        showLoading(false);
    }
}

function displayQueries(queries) {
    elements.queriesTableBody.innerHTML = queries.map(query => `
        <tr data-id="${query.id}">
            <td>${query.name}</td>
            <td>${query.description || 'N/A'}</td>
            <td>${query.queryText}</td>
            <td>${query.isActive ? 'Yes' : 'No'}</td>
            <td>${query.conn_name || 'N/A'}</td>
            <td>${query.database_name || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary edit-btn" data-id="${query.id}" data-name="${query.name}" data-description="${query.description}" data-querytext="${query.queryText}" data-is-active="${query.isActive}" data-conn-name="${query.conn_name}" data-database-name="${query.database_name}" data-database-id="${query.databaseId}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-danger delete-btn" data-id="${query.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
            const name = button.dataset.name;
            const description = button.dataset.description;
            const queryText = button.dataset.querytext;
            const isActive = button.dataset.isActive;
            const databaseId = button.dataset.databaseId;

            editQuery(id, name, description, queryText,isActive, databaseId);  
       });
   });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.dataset.id;
        
            showDeleteConfirmation(id);
        }); 
    });

    document.querySelectorAll('.execute-btn').forEach(button => {
        button.addEventListener('click', () => {
            const queryId = button.dataset.id;
            const databaseId = button.dataset.databaseId;

            executeQuery(queryId, databaseId);
        });
    }); 
 };

function showAddQueryModal() {
    selectedQueryId = null;
    document.getElementById('modalTitle').textContent = 'Add Query';
    elements.queryForm.reset();
    elements.queryModal.style.display = 'block';
    loadDatabases();
}

async function editQuery(id, name, description, queryText,isActive, databaseId) {
        selectedQueryId = id;
        document.getElementById('modalTitle').textContent = 'Edit Query';
        
        elements.queryForm.elements.name.value = name;
        elements.queryForm.elements.description.value = description;
        elements.queryForm.elements.queryText.value = queryText;
        elements.queryForm.elements.isActive.checked = isActive === 'true';
        elements.queryForm.elements.databaseId.value = databaseId;
        elements.queryModal.style.display = 'block'
}

function closeModal() {
    elements.queryModal.style.display = 'none';
    elements.queryForm.reset();
}

function showDeleteConfirmation(id) {
    selectedQueryId = id;
    elements.deleteModal.style.display = 'block';
}

function closeDeleteModal() {
    elements.deleteModal.style.display = 'none';
    selectedQueryId = null;
}

async function handleQuerySubmit(event) {
    event.preventDefault();
    
    // Validate required fields
    const databaseId = elements.databaseIdSelect.value;
    const name = document.getElementById('name').value;
    const queryText = document.getElementById('queryText').value;
    const isActive = document.getElementById('isActive').checked;
    
    if (!databaseId) {
        showError('Please select a database');
        return;
    }
    
    if (!name || !queryText )  {
        showError('Query name and text are required');
        return;
    }

    const queryData = {
        name,
        description: document.getElementById('description').value,
        queryText,
        isActive,
        databaseId
    };

    try {
        showLoading(true);
        const url = selectedQueryId 
            ? `/api/postgres/queries/${selectedQueryId}`
            : '/api/postgres/queries';
        
        const response = await fetch(url, {
            method: selectedQueryId ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include',
            body: JSON.stringify(queryData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save query');
        }

        closeModal();
        loadQueries();
        showSuccess(selectedQueryId ? 'Query updated successfully' : 'Query created successfully');
    } catch (error) {
        console.error('Error saving query:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function confirmDelete() {
    try {
        showLoading(true);
        const response = await fetch(`/api/postgres/queries/${selectedQueryId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete query');
        }

        closeDeleteModal();
        loadQueries();
        showSuccess('Query deleted successfully');
    } catch (error) {
        console.error('Error deleting query:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

async function executeQuery(queryId, databaseId) {
    try {
        showLoading(true);
        const response = await fetch(`/api/sybase/execute/${databaseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            credentials: 'include',
            body: JSON.stringify({ id : queryId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to execute query');
        }

        const result = await response.json();
        showSuccess('Query executed successfully');
        console.log('Query result:', result);
    } catch (error) {
        console.error('Error executing query:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function showLoading(isLoading) {
    document.getElementById('loader').style.display = isLoading ? 'block' : 'none';
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('Error: ' + message);
}

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