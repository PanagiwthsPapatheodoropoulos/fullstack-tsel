document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('api/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Auth response:', data); // Debug log
            
            // Check if we have user data in either format
            const user = data.user || data;
            
            if (!user || !user.username) {
                console.log('No valid user data found');
                return;
            }

            const loginForm = document.getElementById('login-form');
            if (!loginForm) {
                console.error('Login form element not found');
                return;
            }

            // Create the "already logged in" message
            const infoDiv = document.createElement('div');
            infoDiv.className = 'success-message';
            infoDiv.style.padding = '1rem';
            infoDiv.style.marginBottom = '1rem';
            infoDiv.innerHTML = `
                <span class="success-icon">✅</span>
                Ήδη συνδεδεμένος ως <b>${user.username}</b> (${user.role})
            `;

            // Insert message and hide form
            loginForm.parentNode.insertBefore(infoDiv, loginForm);
            loginForm.style.display = 'none';

            // Add a logout button
            const logoutButton = document.createElement('button');
            logoutButton.className = 'btn btn-primary';
            logoutButton.textContent = 'Αποσύνδεση';
            logoutButton.style.cssText = `
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                margin-top: 10px;
                cursor: pointer;
                font-weight: 500;
                transition: background-color 0.2s;
            `;

            logoutButton.onmouseover = () => {
                logoutButton.style.backgroundColor = '#c82333';
            };
            
            logoutButton.onmouseout = () => {
                logoutButton.style.backgroundColor = '#dc3545';
            };
                        logoutButton.onclick = async () => {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    window.location.reload();
                } catch (err) {
                    console.error('Logout error:', err);
                }
            };
            infoDiv.appendChild(logoutButton);
        } else {
            console.log('Not logged in - response not ok');
        }
    } catch (err) {
        console.error('Error checking login status:', err);
    }
});

handleLogIn = async (e) => {
    e.preventDefault();
    showLoading(true);

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showError('Παρακαλώ συμπληρώστε όνομα χρήστη και κωδικό πρόσβασης');
        showLoading(false);
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess(data.message);
            
            // Wait 1.5 seconds before redirecting
            setTimeout(() => {
                if (data.user && data.user.role === 'administrator') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);
        } else {
            showError(data.message || 'Σφάλμα κατά την είσοδο');
        }
    } catch (error) {
        console.error('Σφάλμα κατά την είσοδο:', error);
        showError('Σφάλμα κατά την είσοδο');
    } finally {
        showLoading(false);
    }
};

function showError(message) {
    const loginForm = document.getElementById('login-form');
    removeExistingMessages();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <span class="error-icon">⚠️</span>
        <span>${message}</span>
    `;
    
    loginForm.insertBefore(errorDiv, loginForm.firstChild);
    
    // Αυτόματη απόκρυψη μετά από 5 δευτερόλεπτα
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function removeExistingMessages() {
    const loginForm = document.getElementById('login-form');
    const existingMessages = loginForm.querySelectorAll('.error-message, .success-message');
    existingMessages.forEach(msg => msg.remove());
}

function showSuccess(message) {
    const loginForm = document.getElementById('login-form');
    removeExistingMessages();

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <span class="success-icon">✅</span>
        <span>${message}</span>
    `;

    loginForm.insertBefore(successDiv, loginForm.firstChild);
}

function showLoading(isLoading) {
    const submitButton = document.getElementById('submit-button');

    if(isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="loading-spinner">⏳</span> Σύνδεση...';
    }
    else{
        submitButton.disabled = false;
        submitButton.innerHTML = 'Σύνδεση';
    }
}