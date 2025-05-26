handleLogIn = async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginForm = document.getElementById('login-form');

    if (!username || !password) {
        showError('Παρακαλώ συμπληρώστε όνομα χρήστη και/ή κωδικό πρόσβασης');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/auth/login',{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        });

        const data = await response.json();

        if(response.ok) {
            showSuccess(data.message);

            // Ανακατεύθυνση μετά από 1.5 δευτερόλεπτα
            setTimeout(() => {
                // Έλεγχος αν είναι administrator
                if (data.user.role === 'administrator') {
                    window.location.href = 'admin.html';
                }
                else {
                    window.location.href = 'index.html';
                }
            }, 1500);
        }
    } catch (error) {
        console.error('Σφάλμα κατά την είσοδο:', error);
        showError("Σφάλμα κατά την εισόδο")
    }
    finally{
        showLoading(false);
    }

}

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
