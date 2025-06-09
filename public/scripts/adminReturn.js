/**
 * Adds a return arrow button for admin
 * @description This function checks if the user is an administrator and adds a button to return to the admin page.
 */
async function addAdminReturnButton() {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            if (user.role === 'administrator') {
                const adminButton = document.createElement('div');
                adminButton.className = 'admin-return-button';
                adminButton.innerHTML = `
                    <button onclick="window.location.href='admin.html'" title="Επιστροφή στο περιβάλλον διαχείρισης">
                        <i class="fas fa-arrow-circle-left"></i> Διαχείριση
                    </button>
                `;
                document.body.insertBefore(adminButton, document.body.firstChild);
            }
        }
    } 
    catch (error) {
        console.error('Error checking admin status:', error);
    }
}

document.addEventListener('DOMContentLoaded', addAdminReturnButton);