document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Syncfusion DateTime Picker
    ej.base.enableRipple(true);

    // Function to get max date (31 days from selected date)
    const getMaxDate = (selectedDate) => {
        const maxDate = new Date(selectedDate);
        maxDate.setDate(maxDate.getDate() + 31);
        return maxDate;
    };

    // Function to get min date (31 days before selected date)
    const getMinDate = (selectedDate) => {
        const minDate = new Date(selectedDate);
        minDate.setDate(minDate.getDate() - 31);
        return minDate;
    };

    // Initialize start date picker
    const startDatePicker = new ej.calendars.DateTimePicker({
        placeholder: 'Select start date and time',
        format: 'yyyy-MM-dd HH:mm',
        change: function(args) {
            if (args.value) {
                // Update end date min and max when start date changes
                endDatePicker.min = args.value;
                endDatePicker.max = getMaxDate(args.value);
            }
        }
    });
    startDatePicker.appendTo('#startDate');

    // Initialize end date picker
    const endDatePicker = new ej.calendars.DateTimePicker({
        placeholder: 'Select end date and time',
        format: 'yyyy-MM-dd HH:mm',
        change: function(args) {
            if (args.value) {
                // Update start date min and max when end date changes
                startDatePicker.min = getMinDate(args.value);
                startDatePicker.max = args.value;
            }
        }
    });
    endDatePicker.appendTo('#endDate');

    // Fetch queries and populate the dropdown
    const response = await fetch('/api/query/queries');
    const queries = await response.json();
    const queryNameSelect = document.getElementById('queryName');

    queries.forEach(query => {
        const option = document.createElement('option');
        option.value = query.id;
        option.textContent = query.query_name;
        queryNameSelect.appendChild(option);
    });

    document.getElementById('queryForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const queryName = document.getElementById('queryName').value;
        const startDate = startDatePicker.value;
        const endDate = endDatePicker.value;

        if (!startDate || !endDate) {
            document.getElementById('error').innerText = 'Please select both start and end dates';
            return;
        }

        // Validate date range
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 31) {
            document.getElementById('error').innerText = 'Date range cannot exceed 31 days';
            return;
        }

        if (endDate < startDate) {
            document.getElementById('error').innerText = 'End date must be after start date';
            return;
        }

        document.getElementById('loading').style.display = 'block'; // Show loading indicator

        try {
            const response = await fetch('/api/query/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Assuming token is stored in localStorage
                },
                body: JSON.stringify({ queryName, startDate, endDate }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                document.getElementById('error').innerText = errorData.errors ? errorData.errors[0].msg : 'An error occurred';
                return;
            }

            const result = await response.json();
            document.getElementById('results').innerText = JSON.stringify(result);
        } catch (error) {
            document.getElementById('error').innerText = 'An error occurred while executing the query.';
        } finally {
            document.getElementById('loading').style.display = 'none'; // Hide loading indicator
        }
    });
});

function logout() {
    localStorage.removeItem('token'); // Clear token
    window.location.href = '/index.html'; // Redirect to login page
}
