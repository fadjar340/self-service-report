document.addEventListener('DOMContentLoaded', async () => {
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('queryId');
    const databaseId = urlParams.get('databaseId');
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    const rowsPerPage = urlParams.get('rowsPerPage') || '10'; // Get rowsPerPage from URL params
    
    if (!queryId || !databaseId || !startDate || !endDate) {
        alert('Missing required parameters');
        window.close();
        return;
    }
    
    // Set the rowsPerPage dropdown value
    const rowsPerPageSelect = document.getElementById('rowsPerPage');
    if (rowsPerPageSelect) {
        rowsPerPageSelect.value = rowsPerPage;
        
        // Add event listener for change event
        rowsPerPageSelect.addEventListener('change', () => {
            console.log('Rows per page changed');
            
            // Get current URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            
            // Update rowsPerPage parameter
            urlParams.set('rowsPerPage', rowsPerPageSelect.value);
            
            // Log the new URL
            console.log('New URL:', window.location.pathname + '?' + urlParams.toString());
            
            // Reload the page with updated parameters
            window.location.search = urlParams.toString();
        });
    } else {
        console.error('rowsPerPage select element not found');
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
                databaseId,
                startDate,
                endDate
            })
        });
        
        if (!response.ok) {
            throw new Error(await response.text());
        }
        
        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error fetching results:', error);
        alert(`Error fetching results: ${error.message}`);
    } finally {
        showLoading(false);
    }
});

function displayResults(data) {
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
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.title = header; // Add tooltip with full header text
        resultsHeader.appendChild(th);
    });
    
    // Create table body
    data.data.forEach(row => {
        const tr = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            let cellValue = row[header] !== undefined ? row[header] : '';
            
            // Check if the value is a date string
            if (typeof cellValue === 'string' && isValidDate(cellValue)) {
                // Convert to local timezone and format
                const date = new Date(cellValue);
                cellValue = formatDateForDisplay(date);
            }
            
            td.textContent = cellValue;
            td.title = cellValue; // Add tooltip with full cell text
            tr.appendChild(td);
        });
        
        resultsBody.appendChild(tr);
    });
    
    // Initialize pagination
    paginateResults();
}

// Helper function to validate date strings
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
    return regex.test(dateString);
}

// Helper function to format dates for display
function formatDateForDisplay(date) {
    return date.toLocaleString(navigator.language, {
        year: 'numeric',
        month: '2-digit',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function paginateResults() {
    const rowsPerPageSelect = document.getElementById('rowsPerPage');
    const rowsPerPage = rowsPerPageSelect ? rowsPerPageSelect.value : '10';
    const tableBody = document.getElementById('resultsBody');
    const rows = tableBody.querySelectorAll('tr');
    const totalPages = Math.ceil(rows.length / rowsPerPage);
    
    // Clear current pagination
    paginationControls.innerHTML = '';
    
    if (totalPages > 1) {
        // Create pagination buttons
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
    const rowsPerPageSelect = document.getElementById('rowsPerPage');
    const rowsPerPage = rowsPerPageSelect ? rowsPerPageSelect.value : '10';
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
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('queryId');
    const databaseId = urlParams.get('databaseId');
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    
    if (!queryId || !startDate || !endDate || !databaseId) {
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
                databaseId,
                startDate,
                endDate
            })
        });
        
        if (!response.ok) {
            throw new Error(await response.text());
        }
        
        const apiResponse = await response.json();
        downloadResults(apiResponse, 'csv');
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert(`Error downloading CSV: ${error.message}`);
    } finally {
        showLoading(false);
    }
});

document.getElementById('downloadXlsBtn').addEventListener('click', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('queryId');
    const databaseId = urlParams.get('databaseId');
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    
    if (!queryId || !startDate || !endDate || !databaseId) {
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
                databaseId,
                startDate,
                endDate
            })
        });
        
        if (!response.ok) {
            throw new Error(await response.text());
        }
        
        const apiResponse = await response.json();
        downloadResults(apiResponse, 'xls');
    } catch (error) {
        console.error('Error downloading XLS:', error);
        alert(`Error downloading XLS: ${error.message}`);
    } finally {
        showLoading(false);
    }
});

// Update download function to format dates
function downloadResults(apiResponse, format) {
    const data = apiResponse.data; // Assuming the API response has a 'data' property containing the array
    
    if (!Array.isArray(data)) {
        console.error('Download failed: Data is not an array', data);
        alert('Download failed: Invalid data format');
        return;
    }

    // Identify date columns by checking if any value in the column is a date
    const headers = Object.keys(data[0] || {});
    const dateColumns = headers.filter(header => {
        return data.some(row => {
            const value = row[header];
            return typeof value === 'string' && isValidDate(value);
        });
    });

    // Create formatted data for download
    const formattedData = data.map(row => {
        return headers.reduce((acc, header) => {
            let value = row[header];
            if (dateColumns.includes(header) && typeof value === 'string' && isValidDate(value)) {
                const date = new Date(value);
                value = formatDateForDownload(date);
            }
            acc[header] = value;
            return acc;
        }, {});
    });

    if (format === 'csv') {
        // CSV format
        const csvContent = [
            headers.join(','),
            ...formattedData.map(row => 
                headers.map(header => 
                    `"${String(row[header]).replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'query_results.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    } else if (format === 'xls') {
        // XLS format (simple HTML table)
        const worksheet = `
            <table>
                <tr>${headers.map(header => 
                    `<th>${header}</th>`
                ).join('')}</tr>
                ${formattedData.map(row => `
                    <tr>${headers.map(header => 
                        `<td>${row[header] !== null ? row[header] : ''}</td>`
                    ).join('')}</tr>`
                ).join('')}
            </table>
        `;

        const blob = new Blob([worksheet], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'query_results.xls';
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Helper function to format dates for download
function formatDateForDownload(date) {
    return date.toLocaleString(navigator.language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(/\/|,/g, '-');
}

document.getElementById('closeResultsBtn').addEventListener('click', () => {
    window.close();
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