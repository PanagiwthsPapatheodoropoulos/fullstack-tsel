document.addEventListener('DOMContentLoaded', async () => {
    const userInfoBar = document.getElementById('user-info-bar');
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            
            // Show userinfo bar with user details
            userInfoBar.innerHTML = `
                <span class="user-label">👤 Συνδεδεμένος ως <b>${user.username}</b> (${user.role === 'administrator' ? 'Διαχειριστής' : 'Φοιτητής'})</span>
                <button id="logout-btn" class="logout-btn">Αποσύνδεση</button>
            `;
            userInfoBar.style.display = 'flex';
            
            // Show profile link in nav
            const profileLink = document.querySelector('nav a[href="profile.html"]');
            if (profileLink) {
                profileLink.style.display = 'inline-block';
            }

            // Setup logout handler
            document.getElementById('logout-btn').onclick = async () => {
                await fetch('/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = 'login.html';
            };
        } 
        else {
            userInfoBar.style.display = 'none';
            // Hide profile link if not logged in
            const profileLink = document.querySelector('nav a[href="profile.html"]');
            if (profileLink) {
                profileLink.style.display = 'none';
            }
        }
    } 
    catch (err) {
        console.error('Error checking auth status:', err);
        userInfoBar.style.display = 'none';
    }
});