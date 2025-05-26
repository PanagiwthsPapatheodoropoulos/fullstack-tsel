document.addEventListener('DOMContentLoaded', async () => {
    const userInfoBar = document.getElementById('user-info-bar');
    try {
        const response = await fetch('http://localhost:3000/auth/me', {
            credentials: 'include'
        });
        if (response.ok) {
            const user = await response.json();
            userInfoBar.innerHTML = `
                <span class="user-label">👤 Συνδεδεμένος ως <b>${user.username}</b> (${user.role === 'administrator' ? 'Διαχειριστής' : 'Φοιτητής'})</span>
                <button id="logout-btn" class="logout-btn">Αποσύνδεση</button>
            `;
            userInfoBar.style.display = 'flex';
            document.getElementById('logout-btn').onclick = async () => {
                await fetch('http://localhost:3000/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = 'login.html';
            };
        } else {
            userInfoBar.style.display = 'none';
        }
    } catch (err) {
        userInfoBar.style.display = 'none';
    }
});