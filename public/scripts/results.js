/**
 * Results display module
 * @module results
 */


//After DOM is loaded,load the results
document.addEventListener('DOMContentLoaded', loadResults);


/**
 * Load and display application results
 * @async
 * @function loadResults
 * @throws {Error} If fetching results fails
 */
async function loadResults() {
    try {
        // First check if period has ended
        const periodResponse = await fetch('/api/periods/current', {
            credentials: 'include'
        });
        
        const periodData = await periodResponse.json();
        
        // If period is still active (is_active = 1), results aren't published yet
        if (periodData.period?.is_active) {
            showMessage('results-info', 'Τα αποτελέσματα δεν έχουν δημοσιευτεί ακόμη.');
            return;
        }

        // Load accepted applications
        const response = await fetch('/api/applications/accepted', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }

        const results = await response.json();
        displayResults(results);

    } catch (error) {
        console.error('Error loading results:', error);
        showMessage('results-error', 'Σφάλμα κατά τη φόρτωση των αποτελεσμάτων');
    }
}


/**
 * Display application results grouped by university
 * @function displayResults
 * @param {Array<Object>} results - Array of accepted applications
 * @param {string} results[].first_choice - University name
 * @param {string} results[].first_name - Student first name
 * @param {string} results[].last_name - Student last name
 * @param {string} results[].student_id - Student ID
 */
function displayResults(results) {
    const container = document.getElementById('results-content');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="no-results">Δεν υπάρχουν διαθέσιμα αποτελέσματα</div>';
        return;
    }

    // Group results by university
    const groupedResults = results.reduce((acc, result) => {
        const key = result.first_choice;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(result);
        return acc;
    }, {});

    const html = Object.entries(groupedResults).map(([university, students]) => `
        <div class="university-results">
            <h3>${university}</h3>
            <div class="accepted-students">
                ${students.map(student => `
                    <div class="student-card">
                        <div class="student-name">${student.first_name} ${student.last_name}</div>
                        <div class="student-details">
                            <span class="label">ΑΜ:</span> ${student.student_id}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}


/**
 * Display message to user
 * @function showMessage
 * @param {string} elementId - ID of element to show message in
 * @param {string} message - Message to display
 */
function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}