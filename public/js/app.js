// Check authentication status on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
});

// Function to check authentication status
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        //console.log('Token from localStorage:', token); // Add this line to log the token

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
                if (!window.location.pathname.includes('index.html')) {
                    window.location.href = '/index.html';
                }
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        //console.log('Current user data:', data); // Add this line to log the user data

        if (data.user) {
            if (window.location.pathname.includes('index.html')) {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/user.html';
                }
            }

            if (window.location.pathname.includes('admin.html') && data.user.role !== 'admin') {
                window.location.href = '/user.html';
            }

            updateUserInfo(data.user);
        }
    } catch (error) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = '/index.html';
        }
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
        //console.log('Login successful:', data); // Add this line to log the response
        // Store the token in localStorage
        localStorage.setItem('token', data.token);

        // Clear any existing error message
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';

        // Redirect based on role
        if (data.user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/user.html';
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
        // Clear the token from localStorage
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