document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:3000/auth/me', {
            credentials: 'include'
        });
        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }
        const user = await response.json();
        if (user.role !== 'registered' && user.role !== 'administrator') {
            window.location.href = 'login.html';
            return;
        }
        // Do NOT redirect if authenticated!
        // ...rest of your application logic...
    } catch (err) {
        window.location.href = 'login.html';
    }
});