/**
 * Login page functionality module
 * @module reqs
 */

//After DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.eligibility-form');
    form.addEventListener('submit', checkEligibility);
    
    // Add message containers to the page
    const messageContainer = document.createElement('div');
    messageContainer.innerHTML = `
        <div id="eligibility-success" class="message success" style="display: none;"></div>
        <div id="eligibility-error" class="message error" style="display: none;"></div>
    `;
    form.insertBefore(messageContainer, form.firstChild);
});

/**
 * Check current user login status
 * @async
 * @function checkLoginStatus
 * @returns {Promise<Object|null>} User information if logged in, null otherwise
 * @throws {Error} If login check fails
 */
async function checkLoginStatus() {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            return await response.json();
        }
        return null;
    } 
    catch (err) {
        console.error('Error checking login status:', err);
        return null;
    }
}


/**
 * Check eligibility based on form input
 * @async
 * @function checkEligibility
 * @param {Event} e - Submit event
 * @throws {Error} If eligibility check fails
 */
async function checkEligibility(e) {
    e.preventDefault();
    
    // Get form values
    const year = parseInt(document.getElementById('year').value);
    const passedCourses = parseFloat(document.getElementById('passed-courses').value);
    const average = parseFloat(document.getElementById('average').value);
    const englishLevel = document.querySelector('input[name="english"]:checked');
    
    // Validation checks
    if (!year || !passedCourses || !average || !englishLevel) {
        showMessage('eligibility-error', 'Παρακαλώ συμπληρώστε όλα τα πεδία');
        return;
    }

    // Check minimum requirements
    const failedChecks = [];
    
    if (year < 2) {
        failedChecks.push('Πρέπει να είστε τουλάχιστον στο 2ο έτος');
    }
    if (passedCourses < 70) {
        failedChecks.push('Το ποσοστό επιτυχίας πρέπει να είναι τουλάχιστον 70%');
    }
    if (average < 6.5) {
        failedChecks.push('Ο μέσος όρος πρέπει να είναι τουλάχιστον 6.50');
    }
    if (!['B2', 'C1', 'C2'].includes(englishLevel.value)) {
        failedChecks.push('Απαιτείται επίπεδο Αγγλικών B2 ή ανώτερο');
    }

    if (failedChecks.length > 0) {
        showMessage('eligibility-error', 
            'Δεν πληρούνται οι ελάχιστες απαιτήσεις:\n' + 
            failedChecks.join('\n')
        );
    } 
    else {
        try {
            const response = await fetch('/auth/me', {
                credentials: 'include'
            });
            
            if (response.ok) {
                // User is logged in
                showMessage('eligibility-success', 
                    'Συγχαρητήρια! Πληρούνται οι ελάχιστες απαιτήσεις για το πρόγραμμα Erasmus+.\n' +
                    'Μπορείτε να προχωρήσετε άμεσα στην <a href="application.html">υποβολή της αίτησής σας</a>.'
                );
            } 
            else {
                // User is not logged in
                showMessage('eligibility-success', 
                    'Συγχαρητήρια! Πληρούνται οι ελάχιστες απαιτήσεις για το πρόγραμμα Erasmus+.\n' +
                    'Παρακαλώ <a href="sign-up.html">δημιουργήστε λογαριασμό</a> ή ' +
                    '<a href="login.html">συνδεθείτε</a> για να υποβάλετε την αίτησή σας.'
                );
            }
        } 
        catch (error) {
            console.error('Error checking authentication:', error);
            // Handle as not logged in
            showMessage('eligibility-success', 
                'Συγχαρητήρια! Πληρούνται οι ελάχιστες απαιτήσεις για το πρόγραμμα Erasmus+.\n' +
                'Παρακαλώ <a href="sign-up.html">δημιουργήστε λογαριασμό</a> ή ' +
                '<a href="login.html">συνδεθείτε</a> για να υποβάλετε την αίτησή σας.'
            );
        }
    }
}

/**
 * Display message to user
 * @function showMessage
 * @param {string} elementId - ID of element to show message in
 * @param {string} message - Message to display (supports HTML)
 * @param {string} [type='info'] - Message type (info/error/success)
 */
function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if(element) {
        element.innerHTML = message; // Changed from textContent to innerHTML
        element.style.display = 'block';

        setTimeout(() => {
            element.style.display = 'none';
        }, 10000);
    }
}