let currentApplications = [];
let acceptedApplications = [];
let universities = [];
let filteredApplications = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

function initializeAdmin() {
    checkAdminAuth();
    loadPeriodStatus();
    loadApplications();
    loadAcceptedApplications(); 
    loadUniversitiesManagement();
    setupEventListeners();
}

function showMessage(elementId,message,type = 'info'){
    const element = document.getElementById(elementId);
    if(element) {
        element.textContent = message;
        element.style.display = 'block';

        setTimeout(() => {
            element.style.display = 'none';
        },5000);
    }
}

async function loadPeriodStatus() {
    try {
        const response = await fetch('/api/periods/current', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const period = await response.json();
            displayPeriodStatus(period);
        } else {
            showMessage('period-error', 'Σφάλμα φόρτωσης περιόδου αιτήσεων');
        }
    } catch (error) {
        console.error('Σφάλμα φόρτωσης περιόδου:', error);
        showMessage('period-error', 'Σφάλμα φόρτωσης περιόδου αιτήσεων');
    }
}


async function checkAdminAuth(){
    try {
        const response = await fetch('/api/auth/check', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            window.location.href = '/';
            return;
        }

        const data = await response.json();
        if (!data.user || data.user.role !== 'administrator') {
            window.location.href = '/';
            return;
        }
        // If here, user is administrator: do nothing, allow access
    } catch (error) {
        console.error("Σφάλμα ελέγχου πιστοποίησης administrator:", error);
        window.location.href = 'login.html';
    }
}

async function handleLogout(){
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        window.location.href = 'login.html';
    } catch (error) {
        console.error('Σφάλμα αποσύνδεσης:',error);
        
    }
}



function switchTab(tabName) {
    // Απενεργοποίηση όλων των tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Ενεργοποίηση επιλεγμένου tab
    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');

    // Φόρτωση δεδομένων ανάλογα με το tab
    switch(tabName) {
        case 'period':
            loadPeriodStatus();
            break;
        case 'applications':
            loadApplications();
            break;
        case 'results':
            loadAcceptedApplications();
            break;
        case 'universities':
            loadUniversitiesManagement();
            break;
    }
}

function setupEventListeners() {
    const periodForm = document.getElementById('period-form');
    if(periodForm) {
        periodForm.addEventListener('submit', handlePeriodUpdate); // Changed from handlePeriodFormSubmit
    }
}

function displayPeriodStatus(periodResponse) {
    const statusDiv = document.getElementById('period-status');
    const now = new Date();

    // periodResponse is the whole response from backend
    const period = periodResponse.period;

    if (!period || !period.start_date || !period.end_date) {
        statusDiv.innerHTML = `
            <div class="status-warning">
                ⚠️ Δεν έχει οριστεί περίοδος αιτήσεων
            </div>
        `;
        return;
    }

    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);

    let statusClass = 'status-inactive';
    let statusText = '';
    let statusIcon = '🔴';

    if (now < startDate) {
        statusText = `Η περίοδος αιτήσεων θα ξεκινήσει στις ${formatDate(startDate)}`;
        statusIcon = '🟡';
        statusClass = 'status-upcoming';
    } else if (now >= startDate && now <= endDate) {
        statusText = `Η περίοδος αιτήσεων είναι ΕΝΕΡΓΗ (λήγει στις ${formatDate(endDate)})`;
        statusIcon = '🟢';
        statusClass = 'status-active';
    } else {
        statusText = `Η περίοδος αιτήσεων έχει ΛΗΞΕΙ (έληξε στις ${formatDate(endDate)})`;
        statusIcon = '🔴';
        statusClass = 'status-expired';
    }

    statusDiv.innerHTML = `
        <div class="${statusClass}">
            ${statusIcon} ${statusText}
        </div>
        <div class="period-details">
            <strong>Περίοδος:</strong> ${formatDate(startDate)} έως ${formatDate(endDate)}
        </div>
    `;
}

async function handlePeriodUpdate(e) {
    e.preventDefault();

    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if(!startDate || !endDate){
        showMessage('period-error','Παρακαλώ συμπληρώστε όλα τα πεδία');
        return;
    }

    if(new Date(startDate) >= new Date(endDate)){
        showMessage('period-error','Η ημερομηνία λήξης πρέπει να είναι μετά από την ημερομηνία έναρξης');
        return;
    }

    try {
        const response = await fetch('/api/periods/set', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            start_date: startDate,  
            end_date: endDate       
        })
    });

        if(response.ok){
            showMessage('period-success','Η περίοδος αιτήσεων ενημερώθηκε με επιτυχία');
            loadPeriodStatus(); 
        }
        else{
            showMessage('period-error','Σφάλμα κατά την ενημέρωση της περίοδου αιτήσεων');
        }
    } catch (error) {
        console.error('Σφάλμα ενημέρωσης περιόδου:',error);
        showMessage('period-error','Σφάλμα κατά την ενημέρωση της περίοδου αιτήσεων');   
    }
}

async function loadApplications() {
    document.getElementById('applications-loading').style.display = 'block';
    document.getElementById('applications-container').innerHTML = '';
    
    try {
        const response = await fetch('/api/applications/admin/all', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentApplications = Array.isArray(data) ? data : [];
            console.log('currentApplications:', currentApplications);
            await loadUniversitiesFilter();
            displayApplications(currentApplications);
        } else {
            showMessage('applications-error', 'Σφάλμα φόρτωσης αιτήσεων');
        }
    } catch (error) {
        console.error('Σφάλμα φόρτωσης αιτήσεων:', error);
        showMessage('applications-error', 'Σφάλμα φόρτωσης αιτήσεων');
    } finally {
        document.getElementById('applications-loading').style.display = 'none';
    }
}

function displayApplications(applications){
    const container = document.getElementById('applications-container');
    if (!Array.isArray(applications) || applications.length === 0) {
        container.innerHTML = '<div class="no-data">Δεν βρέθηκαν αιτήσεις</div>';
        return;
    }
    const applicationsHtml = applications.map(app => createApplicationCard(app)).join('');
    container.innerHTML = applicationsHtml;
}

function createApplicationCard(application) {
    const isAccepted = acceptedApplications.some(acc => acc.application_id === application.application_id);
    
    return `
        <div class="application-card" data-id="${application.application_id}">
            <div class="application-header">
                <div class="student-info">
                    <h3>${application.first_name} ${application.last_name}</h3>
                    <span class="student-id">ΑΜ: ${application.student_id}</span>
                </div>
                <div class="acceptance-checkbox">
                    <label>
                        <input type="checkbox" 
                               class="accept-checkbox" 
                               data-id="${application.application_id}"
                               ${isAccepted ? 'checked' : ''}>
                        Δεκτή Αίτηση
                    </label>
                </div>
                <button onclick="deleteApplication(${application.application_id})" class="btn btn-danger delete-btn">
                        <i class="fas fa-trash"></i> Διαγραφή
                </button>
            </div>
            
            <div class="application-details">
                <div class="detail-row">
                    <span class="label">Μέσος Όρος:</span>
                    <span class="value grade">${application.average_grade}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Ποσοστό Επιτυχίας:</span>
                    <span class="value">${application.success_rate}%</span>
                </div>
                <div class="detail-row">
                    <span class="label">Επίπεδο Αγγλικών:</span>
                    <span class="value">${application.english_level}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Άλλες Γλώσσες:</span>
                    <span class="value">${application.other_languages ? 'ΝΑΙ' : 'ΟΧΙ'}</span>
                </div>
            </div>
            
            <div class="university-choices">
                <h4>Επιλογές Πανεπιστημίων:</h4>
                <div class="choices-list">
                    ${application.first_choice_name ? `<div class="choice">1η: ${application.first_choice_name}</div>` : ''}
                    ${application.second_choice_name ? `<div class="choice">2η: ${application.second_choice_name}</div>` : ''}
                    ${application.third_choice_name ? `<div class="choice">3η: ${application.third_choice_name}</div>` : ''}
                </div>
            </div>
            
            <div class="application-files">
                <h4>Συνημμένα Αρχεία:</h4>
                <div class="files-list">
                    ${application.transcript_file ? `<a href="/api/applications/file/${application.application_id}/transcript" target="_blank" class="file-link">📄 Αναλυτική Βαθμολογία</a>` : ''}
                    ${application.english_certificate ? `<a href="/api/applications/file/${application.application_id}/english" target="_blank" class="file-link">📄 Πτυχίο Αγγλικών</a>` : ''}
                    ${application.other_certificates ? `<a href="/api/applications/file/${application.application_id}/other" target="_blank" class="file-link">📄 Άλλα Πτυχία</a>` : ''}
                </div>
            </div>
            
            <div class="application-date">
                <small>Υποβλήθηκε: ${formatDateTime(application.submission_date)}</small>
            </div>
        </div>
    `;
}

async function deleteApplication(applicationId) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την αίτηση;')) {
        return;
    }

    try {
        const response = await fetch(`/api/applications/${applicationId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showMessage('applications-success', 'Η αίτηση διαγράφηκε επιτυχώς');
            // Refresh applications list
            loadApplications();
        } else {
            const error = await response.json();
            showMessage('applications-error', error.message || 'Σφάλμα κατά τη διαγραφή της αίτησης');
        }
    } catch (error) {
        console.error('Error deleting application:', error);
        showMessage('applications-error', 'Σφάλμα κατά τη διαγραφή της αίτησης');
    }
}

function applyFilters() {
    filteredApplications = [...currentApplications];
    
    // Φίλτρο ελάχιστου ποσοστού επιτυχίας
    const minSuccessRate = document.getElementById('min-success-rate').value;
    if (minSuccessRate) {
        filteredApplications = filteredApplications.filter(app => 
            app.success_rate >= parseFloat(minSuccessRate)
        );
    }
    
    // Φίλτρο πανεπιστημίου
    const universityFilter = document.getElementById('university-filter').value;
    if (universityFilter) {
        filteredApplications = filteredApplications.filter(app => 
            app.first_choice == universityFilter || 
            app.second_choice == universityFilter || 
            app.third_choice == universityFilter
        );
    }
    
    // Ταξινόμηση
    const sortOption = document.getElementById('sort-option').value;
    switch(sortOption) {
        case 'grade_desc':
            filteredApplications.sort((a, b) => b.average_grade - a.average_grade);
            break;
        case 'grade_asc':
            filteredApplications.sort((a, b) => a.average_grade - b.average_grade);
            break;
        case 'name':
            filteredApplications.sort((a, b) => 
                (a.first_name + ' ' + a.last_name).localeCompare(b.first_name + ' ' + b.last_name)
            );
            break;
    }
    
    displayApplications(filteredApplications);
}


// Αποθήκευση επιλεγμένων αιτήσεων
async function saveAcceptedApplications() {
    const checkboxes = document.querySelectorAll('.accept-checkbox:checked');
    const acceptedIds = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));
    
    try {
        const response = await fetch('/api/applications/admin/accept', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ applicationIds: acceptedIds })
        });
        
        if (response.ok) {
            showMessage('applications-success', 'Οι επιλεγμένες αιτήσεις αποθηκεύτηκαν επιτυχώς');
            acceptedApplications = currentApplications.filter(app => 
                acceptedIds.includes(app.application_id)
            );
        } else {
            const error = await response.json();
            showMessage('applications-error', error.message || 'Σφάλμα αποθήκευσης');
        }
    } catch (error) {
        console.error('Σφάλμα αποθήκευσης:', error);
        showMessage('applications-error', 'Σφάλμα αποθήκευσης επιλεγμένων αιτήσεων');
    }
}

// In public/scripts/admin.js
async function publishResults() {
    if (acceptedApplications.length === 0) {
        showMessage('results-error', 'Δεν υπάρχουν δεκτές αιτήσεις για δημοσίευση');
        return;
    }
    
    try {
        // Check period status first
        const periodResponse = await fetch('/api/periods/current', {
            credentials: 'include'
        });
        
        if (!periodResponse.ok) {
            showMessage('results-error', 'Σφάλμα ελέγχου περιόδου αιτήσεων');
            return;
        }

        const periodData = await periodResponse.json();
        
        // Check if period is still active
        if (periodData.period?.is_active) {
            showMessage('results-error', 'Δεν μπορείτε να δημοσιεύσετε αποτελέσματα ενώ η περίοδος είναι ενεργή');
            return;
        }

        // Try to publish results
        const response = await fetch('/api/applications/publish-results', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showMessage('results-success', 'Τα αποτελέσματα δημοσιεύτηκαν επιτυχώς');
            setTimeout(() => {
                window.location.href = 'results.html';
            }, 2000);
        } else {
            showMessage('results-error', data.message || 'Σφάλμα κατά τη δημοσίευση των αποτελεσμάτων');
        }
    } catch (error) {
        console.error('Σφάλμα δημοσίευσης:', error);
        showMessage('results-error', 'Σφάλμα κατά τη δημοσίευση των αποτελεσμάτων');
    }
}

// Fixed loadAcceptedApplications function
async function loadAcceptedApplications() {
    try {
        const response = await fetch('/api/applications/admin/accepted', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            acceptedApplications = await response.json();
            displayAcceptedApplications();
        } 
        else {
            showMessage('results-error', 'Σφάλμα φόρτωσης δεκτών αιτήσεων');
        }
    } catch (error) {
        console.error('Σφάλμα φόρτωσης δεκτών αιτήσεων:', error);
        showMessage('results-error', 'Σφάλμα φόρτωσης δεκτών αιτήσεων');
    }
}


function displayAcceptedApplications() {
    const container = document.getElementById('results-container');
    
    if (acceptedApplications.length === 0) {
        container.innerHTML = '<div class="no-data">Δεν υπάρχουν δεκτές αιτήσεις</div>';
        return;
    }

    const html = acceptedApplications.map(app => `
        <div class="accepted-application">
            <h4>${app.first_name} ${app.last_name}</h4>
            <p>ΑΜ: ${app.student_id}</p>
            <p>Μέσος Όρος: ${app.average_grade}</p>
        </div>
    `).join('');
    
    container.innerHTML = html;
}






async function loadUniversitiesManagement() {
    try {
        const response = await fetch('/api/universities', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const universities = await response.json();
            displayUniversitiesManagement(universities);
        } else {
            showMessage('universities-error', 'Σφάλμα φόρτωσης πανεπιστημίων');
        }
    } catch (error) {
        console.error('Σφάλμα φόρτωσης πανεπιστημίων:', error);
        showMessage('universities-error', 'Σφάλμα φόρτωσης πανεπιστημίων');
    }
}


async function loadUniversitiesFilter() {
    try {
        const response = await fetch('/api/universities', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            const universities = Array.isArray(data) ? data : [];
            const select = document.getElementById('university-filter');
            select.innerHTML = '<option value="">Όλα τα Πανεπιστήμια</option>';
            universities.forEach(uni => {
                const option = document.createElement('option');
                option.value = uni.university_id;
                option.textContent = uni.university_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Σφάλμα φόρτωσης πανεπιστημίων:', error);
    }
}


function displayUniversitiesManagement(universities) {
    const container = document.getElementById('universities-container');
    
    const html = `
        <div class="universities-management">
            <div class="add-university-section">
                <h3>Προσθήκη Νέου Πανεπιστημίου</h3>
                <form id="add-university-form" class="university-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="new-university-name">Όνομα Πανεπιστημίου:</label>
                            <input type="text" id="new-university-name" required>
                        </div>
                        <div class="form-group">
                            <label for="new-university-country">Χώρα:</label>
                            <input type="text" id="new-university-country" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="new-university-city">Πόλη:</label>
                            <input type="text" id="new-university-city" required>
                        </div>
                        <div class="form-group">
                            <label for="new-university-website">Website:</label>
                            <input type="url" id="new-university-website" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Προσθήκη Πανεπιστημίου</button>
                </form>
            </div>
            
            <div class="universities-list-section">
                <h3>Υπάρχοντα Πανεπιστήμια (${universities.length})</h3>
                <div class="universities-grid">
                    ${universities.map(uni => createUniversityCard(uni)).join('')}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Προσθήκη event listener για τη φόρμα
    document.getElementById('add-university-form').addEventListener('submit', handleAddUniversity);
}

// Δημιουργία κάρτας πανεπιστημίου
function createUniversityCard(university) {
    return `
        <div class="university-card" data-id="${university.university_id}">
            <div class="university-header">
                <h4>${university.university_name}</h4>
                <div class="university-actions">
                    <button class="btn btn-small btn-danger" onclick="deleteUniversity(${university.university_id})">
                        🗑️ Διαγραφή
                    </button>
                </div>
            </div>
            <div class="university-details">
                <div class="detail-row">
                    <span class="label">Χώρα:</span>
                    <span class="value">${university.country || 'Μη καθορισμένη'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Πόλη:</span>
                    <span class="value">${university.city || 'Μη καθορισμένη'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Website:</span>
                    <span class="value">
                        ${university.website ? 
                            `<a href="${university.website}" target="_blank">${university.website}</a>` : 
                            'Μη καθορισμένο'
                        }
                    </span>
                </div>
            </div>
        </div>
    `;
}

async function handleAddUniversity(e) {
    e.preventDefault();

    const universityData = {
        university_name: document.getElementById('new-university-name').value,
        country: document.getElementById('new-university-country').value,
        city: document.getElementById('new-university-city').value,
        website: document.getElementById('new-university-website').value
    };

    if (!universityData.university_name || !universityData.country || !universityData.city || !universityData.website) {
        showMessage('universities-error', 'Παρακαλώ συμπληρώστε όλα τα πεδία');
        return;
    }

    try {
        const response = await fetch('/api/universities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(universityData)
        });

        if (response.ok) {
            showMessage('universities-success', 'Το πανεπιστήμιο προστέθηκε επιτυχώς');
            loadUniversitiesManagement(); // refresh list
        }
        else {
            showMessage('universities-error', 'Αποτυχία προσθήκης πανεπιστημίου');
        }
    } catch (error) {
        console.error('Σφάλμα κατά την προσθήκη πανεπιστημίου:', error);
        showMessage('universities-error', 'Σφάλμα προσθήκης πανεπιστημίου');
    }
}

async function deleteUniversity(universityId) {
    if (!confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το πανεπιστήμιο;')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/universities/${universityId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('universities-success', 'Το πανεπιστήμιο διαγράφηκε επιτυχώς');
            loadUniversitiesManagement();
        } else {
            const error = await response.json();
            showMessage('universities-error', error.message || 'Σφάλμα διαγραφής πανεπιστημίου');
        }
    } catch (error) {
        console.error('Σφάλμα διαγραφής πανεπιστημίου:', error);
        showMessage('universities-error', 'Σφάλμα διαγραφής πανεπιστημίου');
    }
}



function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('el-GR');
}

// Μορφοποίηση ημερομηνίας και ώρας
function formatDateTime(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    return d.toLocaleDateString('el-GR') + ' ' + d.toLocaleTimeString('el-GR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}