document.addEventListener('DOMContentLoaded', async () => {
    // Get query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('queryId');
    const databaseId = urlParams.get('databaseId');
    const startDate = urlParams.get('startDate');
    const endDate = urlParams.get('endDate');
    
    if (!queryId || !databaseId || !startDate || !endDate) {
        alert('Missing required parameters');
        window.close();
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
            td.textContent = row[header] !== undefined ? row[header] : '';
            td.title = row[header] !== undefined ? row[header] : ''; // Add tooltip with full cell text
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

function downloadResults(apiResponse, format) {
    const data = apiResponse.data; // Assuming the API response has a 'data' property containing the array
    
    if (!Array.isArray(data)) {
        console.error('Download failed: Data is not an array', data);
        alert('Download failed: Invalid data format');
        return;
    }

    if (format === 'csv') {
        // CSV format
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
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
                <tr>${Object.keys(data[0] || {}).map(header => 
                    `<th>${header}</th>`
                ).join('')}</tr>
                ${data.map(row => `
                    <tr>${Object.values(row).map(value => 
                        `<td>${value !== null ? value : ''}</td>`
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