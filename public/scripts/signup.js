document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Auth response:', data);
            
            const user = data.user || data;
            
            if (!user || !user.username) {
                console.log('No valid user data found');
                return;
            }

            const signupForm = document.getElementById('signup-form');
            const container = document.querySelector('.signup-container');
            
            if (!signupForm || !container) {
                console.error('Required elements not found');
                return;
            }

            // Create the "already logged in" message
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

            // Hide signup form and show message
            signupForm.style.display = 'none';
            container.insertBefore(infoDiv, signupForm);

            // Add logout button
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

            // Add button hover effects
            logoutButton.onmouseover = () => {
                logoutButton.style.backgroundColor = '#c82333';
            };
            
            logoutButton.onmouseout = () => {
                logoutButton.style.backgroundColor = '#dc3545';
            };

            // Add logout functionality
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
            console.log('Not logged in - showing signup form');
        }
    } catch (err) {
        console.error('Error checking login status:', err);
    }
});


// imhor1zon 123papathe!
//GKOTSIGANG 123pap!
// admin admin123!