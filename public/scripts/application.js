document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }
        
        const user = await response.json();
        console.log('User data:', user);
        
        if (user.role !== 'registered' && user.role !== 'administrator') {
            window.location.href = 'login.html';
            return;
        }

        // Store user ID for later use
        window.userId = user.id;

        // Populate user data in form
        document.getElementById('firstname').value = user.first_name;
        document.getElementById('lastname').value = user.last_name;
        document.getElementById('student-id').value = user.student_id;

        // Setup form handler
        const form = document.getElementById('application-form');
        if (form) {
            form.addEventListener('submit', handleApplicationSubmit);
        }

        // Load universities
        await loadUniversities();
        
        // Setup file inputs
        setupFileInputs();
        
    } catch (err) {
        console.error('Error:', err);
        window.location.href = 'login.html';
    }
});

function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

async function loadUniversities() {
    try {
        const response = await fetch('/api/universities', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const universities = await response.json();
            const selects = ['university1', 'university2', 'university3'];
            
            selects.forEach(selectId => {
                const select = document.getElementById(selectId);
                select.innerHTML = '<option value="" selected disabled>Επιλέξτε πανεπιστήμιο</option>';
                
                universities.forEach(uni => {
                    const option = document.createElement('option');
                    option.value = uni.university_id;
                    option.textContent = `${uni.university_name} (${uni.country})`;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Error loading universities:', error);
    }
}

async function handleApplicationSubmit(e) {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm()) {
        return false;
    }

    try {
        const formData = new FormData();
        
        // Add user ID from stored value
        formData.append('user_id', window.userId);
        
        // Add form data
        formData.append('passed_courses_percent', document.getElementById('passed-courses').value);
        formData.append('average_grade', document.getElementById('average').value);
        formData.append('english_level', document.querySelector('input[name="english"]:checked').value);
        formData.append('knows_extra_languages', document.querySelector('input[name="other-languages"]:checked').value === 'yes');
        formData.append('first_choice_university_id', document.getElementById('university1').value);
        formData.append('second_choice_university_id', document.getElementById('university2').value || '');
        formData.append('third_choice_university_id', document.getElementById('university3').value || '');
        
        // Add and validate files
        const transcriptFile = document.getElementById('transcript').files[0];
        const englishCertFile = document.getElementById('english-cert').files[0];
        
        if (!transcriptFile || !validateFile(transcriptFile) || !englishCertFile || !validateFile(englishCertFile)) {
            return false;
        }
        
        formData.append('transcript_file', transcriptFile);
        formData.append('english_certificate_file', englishCertFile);
        
        const otherCerts = document.getElementById('other-certs').files;
        if (otherCerts.length > 0) {
            for (let file of otherCerts) {
                if (!validateFile(file)) {
                    return false;
                }
                formData.append('other_certificates_files', file);
            }
        }
        
        formData.append('terms_accepted', document.getElementById('terms').checked);

        const response = await fetch('/api/applications', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('application-success', 'Η αίτησή σας υποβλήθηκε με επιτυχία!');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            if (data.error === 'User already has an application') {
                showMessage('application-error', 'Έχετε ήδη υποβάλει αίτηση. Δεν μπορείτε να υποβάλετε δεύτερη αίτηση.');
            } else {
                showMessage('application-error', data.error || 'Σφάλμα κατά την υποβολή της αίτησης');
            }
        }
    } catch (error) {
        console.error('Error submitting application:', error);
        showMessage('application-error', 'Σφάλμα κατά την υποβολή της αίτησης');
    }
    
    return false; // Prevent form submission
}

function setupFileInputs() {
    const fileInputs = document.querySelectorAll('.file-input');
    const form = document.getElementById('application-form');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            updateFileDisplay(this);
        });
    });

    // Add reset handler
    if (form) {
        form.addEventListener('reset', function(e) {
            setTimeout(() => {
                fileInputs.forEach(input => {
                    // Clear the file input
                    input.value = '';
                    const fileNameSpan = input.closest('.file-upload').querySelector('.file-name');
                    fileNameSpan.textContent = 'Δεν έχει επιλεγεί αρχείο';
                    fileNameSpan.style.color = '';
                    input.closest('.file-upload').classList.remove('has-file');
                });
            }, 0);
        });
    }
}

function updateFileDisplay(input) {
    const fileNameSpan = input.closest('.file-upload').querySelector('.file-name');
    
    if (input.files && input.files.length > 0) {
        if (input.multiple) {
            // For multiple files
            const fileNames = Array.from(input.files).map(file => file.name);
            fileNameSpan.textContent = fileNames.join(', ');
        } else {
            // For single file
            fileNameSpan.textContent = input.files[0].name;
        }
        
        // Add visual feedback
        fileNameSpan.style.color = '#28a745';
        input.closest('.file-upload').classList.add('has-file');
    } else {
        fileNameSpan.textContent = 'Δεν έχει επιλεγεί αρχείο';
        fileNameSpan.style.color = '';
        input.closest('.file-upload').classList.remove('has-file');
    }
}

function validateFile(file, maxSize = 5 * 1024 * 1024) { // 5MB default max size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    
    if (!allowedTypes.includes(file.type)) {
        alert('Μη αποδεκτός τύπος αρχείου. Παρακαλώ επιλέξτε PDF, JPG ή PNG.');
        return false;
    }
    
    if (file.size > maxSize) {
        alert('Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: 5MB');
        return false;
    }
    
    return true;
}

// Add validation for form fields
function validateForm() {
    // Get form fields
    const passedCourses = document.getElementById('passed-courses');
    const average = document.getElementById('average');
    const englishLevel = document.querySelector('input[name="english"]:checked');
    const otherLanguages = document.querySelector('input[name="other-languages"]:checked');
    const firstChoice = document.getElementById('university1');
    const termsAccepted = document.getElementById('terms');

    // Validate passed courses
    if (!passedCourses || !passedCourses.value) {
        alert('Παρακαλώ εισάγετε το ποσοστό επιτυχίας');
        return false;
    }

    const passedCoursesValue = parseFloat(passedCourses.value);
    if (isNaN(passedCoursesValue) || passedCoursesValue < 0 || passedCoursesValue > 100) {
        alert('Το ποσοστό επιτυχίας πρέπει να είναι μεταξύ 0 και 100');
        return false;
    }

    // Validate average grade
    if (!average || !average.value) {
        alert('Παρακαλώ εισάγετε τον μέσο όρο');
        return false;
    }

    const averageValue = parseFloat(average.value);
    if (isNaN(averageValue) || averageValue < 0 || averageValue > 10) {
        alert('Ο μέσος όρος πρέπει να είναι μεταξύ 0 και 10');
        return false;
    }

    // Validate English level
    if (!englishLevel) {
        alert('Παρακαλώ επιλέξτε επίπεδο Αγγλικών');
        return false;
    }

    // Validate other languages
    if (!otherLanguages) {
        alert('Παρακαλώ επιλέξτε αν γνωρίζετε άλλες γλώσσες');
        return false;
    }

    // Validate university choice
    if (!firstChoice || !firstChoice.value) {
        alert('Παρακαλώ επιλέξτε τουλάχιστον ένα πανεπιστήμιο');
        return false;
    }

    // Validate terms acceptance
    if (!termsAccepted || !termsAccepted.checked) {
        alert('Πρέπει να αποδεχτείτε τους όρους συμμετοχής');
        return false;
    }

    return true;
}