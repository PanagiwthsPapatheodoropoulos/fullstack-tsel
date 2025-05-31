document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user || data;
            
            if (user && user.username) {
                // Hide the entire signup form
                const signupForm = document.getElementById('signup-form');
                const container = document.querySelector('.signup-container');
                
                if (signupForm && container) {
                    // Create message container
                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'success-message';
                    infoDiv.style.cssText = `
                        padding: 1rem;
                        margin-bottom: 1rem;
                        text-align: center;
                        background-color: #d4edda;
                        border: 1px solid #c3e6cb;
                        border-radius: 4px;
                    `;
                    infoDiv.innerHTML = `
                        <span class="success-icon">✅</span>
                        Ήδη συνδεδεμένος ως <b>${user.username}</b> (${user.role})
                    `;

                    // Create logout button
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

                    // Add hover effects
                    logoutButton.onmouseover = () => {
                        logoutButton.style.backgroundColor = '#c82333';
                    };
                    
                    logoutButton.onmouseout = () => {
                        logoutButton.style.backgroundColor = '#dc3545';
                    };

                    // Add logout functionality
                    logoutButton.onclick = async () => {
                        try {
                            await fetch('/auth/logout', {
                                method: 'POST',
                                credentials: 'include'
                            });
                            window.location.reload();
                        } catch (err) {
                            console.error('Logout error:', err);
                        }
                    };

                    // Hide form and show message with logout button
                    signupForm.style.display = 'none';
                    infoDiv.appendChild(logoutButton);
                    container.insertBefore(infoDiv, signupForm);
                }
            }
        }
    } catch (err) {
        console.error('Error checking login status:', err);
    }
});

async function handleSignup(event) {
    event.preventDefault();
    
    // Get form values
    const firstName = document.getElementById('firstname').value.trim();
    const lastName = document.getElementById('lastname').value.trim();
    const studentId = document.getElementById('reg_number').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const terms = document.getElementById('terms').checked;

    // Validation
    if (!terms) {
        showMessage('error', 'Πρέπει να αποδεχτείτε τους όρους χρήσης');
        return;
    }

    // Prepare request body
    const requestBody = {
        firstName,
        lastName,
        studentId,
        phone,
        email,
        username,
        password,
        confirmPassword
    };

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('success', data.message || 'Η εγγραφή ολοκληρώθηκε με επιτυχία!');
            // Redirect to login after successful signup
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage('error', data.error || data.message || 'Σφάλμα κατά την εγγραφή');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('error', 'Σφάλμα επικοινωνίας με τον server');
    }
}

function showMessage(type, message) {
    // Create message container if it doesn't exist
    let messageDiv = document.querySelector('.message-container');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = 'message-container';
        const form = document.getElementById('signup-form');
        form.parentNode.insertBefore(messageDiv, form);
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;

    // Clear previous messages
    messageDiv.innerHTML = '';
    messageDiv.appendChild(messageElement);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}


// imhor1zon 123papathe!
//GKOTSIGANG 123pap!
// admin admin123!
// MPAMPAS_HLIANAS hliana123!