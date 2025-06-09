document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }
        
        const userData = await response.json();
        const user = userData.user || userData; // Handle both response formats
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Populate form with user data
        document.getElementById('username').value = user.username;
        document.getElementById('firstName').value = user.first_name || '';
        document.getElementById('lastName').value = user.last_name || '';
        document.getElementById('studentId').value = user.student_id || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('email').value = user.email || '';
        
        // Setup real-time validation
        setupRealTimeValidation();
        
        // Add form submit handler
        document.getElementById('profile-form').addEventListener('submit', handleProfileSubmit);
    } 
    catch (error) {
        console.error('Error loading profile:', error);
        window.location.href = 'login.html';
    }
});



function setupRealTimeValidation() {
    const fields = [
        { id: 'firstName', validator: (value) => validateName(value, 'όνομα') },
        { id: 'lastName', validator: (value) => validateName(value, 'επίθετο') },
        { id: 'studentId', validator: validateStudentId },
        { id: 'phone', validator: validatePhone },
        { id: 'email', validator: validateEmail },
        { id: 'password', validator: validatePassword }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('blur', () => {
                if (field.id === 'password' && !element.value) {
                    clearFieldError(field.id);
                    return; // Skip validation for empty optional password
                }
                const error = field.validator(element.value);
                if (error) {
                    showFieldError(field.id, error);
                }
            });

            element.addEventListener('input', () => {
                clearFieldError(field.id);
            });
        }
    });
}

function validateName(value, fieldName) {
    if (!value || value.trim() === '') {
        return `Το ${fieldName} είναι υποχρεωτικό`;
    }
    if (/\d/.test(value)) {
        return `Το ${fieldName} δεν πρέπει να περιέχει ψηφία`;
    }
    return null;
}

function validateStudentId(value) {
    if (!value || value.trim() === '') {
        return 'Ο αριθμός μητρώου είναι υποχρεωτικός';
    }
    if (!/^2022\d{9}$/.test(value)) {
        return 'Ο αριθμός μητρώου πρέπει να αποτελείται από 13 ψηφία και να ξεκινά από 2022';
    }
    return null;
}

function validatePhone(value) {
    if (!value || value.trim() === '') {
        return 'Το τηλέφωνο είναι υποχρεωτικό';
    }
    if (!/^\d{10}$/.test(value)) {
        return 'Το τηλέφωνο πρέπει να αποτελείται από ακριβώς 10 ψηφία';
    }
    return null;
}

function validateEmail(value) {
    if (!value || value.trim() === '') {
        return 'Το email είναι υποχρεωτικό';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        return 'Μη έγκυρη διεύθυνση email';
    }
    return null;
}

function validatePassword(value) {
    if (!value) return null; // Password is optional
    if (value.length < 5) {
        return 'Ο κωδικός πρόσβασης πρέπει να έχει τουλάχιστον 5 χαρακτήρες';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
        return 'Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον ένα σύμβολο';
    }
    return null;
}

function showFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    clearFieldError(fieldId);
    
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = errorMessage;
    errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 0.875rem;
        margin-top: 0.25rem;
        display: block;
    `;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('error');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        studentId: document.getElementById('studentId').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value || undefined
    };

    // Validate all fields
    const errors = [];
    let hasErrors = false;

    Object.entries(formData).forEach(([field, value]) => {
        if (field === 'password' && !value) return; // Skip empty password

        let error = null;
        switch(field) {
            case 'firstName':
            case 'lastName':
                error = validateName(value, field === 'firstName' ? 'όνομα' : 'επίθετο');
                break;
            case 'studentId':
                error = validateStudentId(value);
                break;
            case 'phone':
                error = validatePhone(value);
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'password':
                error = validatePassword(value);
                break;
        }

        if (error) {
            showFieldError(field, error);
            errors.push(error);
            hasErrors = true;
        }
    });

    if (hasErrors) {
        return;
    }

    try {
        const user = await getCurrentUser();
        const response = await fetch(`/api/users/profile/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('profile-success', 'Τα στοιχεία σας ενημερώθηκαν επιτυχώς');
            document.getElementById('password').value = '';
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showMessage('profile-error', data.error || data.message || 'Σφάλμα κατά την ενημέρωση των στοιχείων');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('profile-error', 'Σφάλμα κατά την ενημέρωση των στοιχείων');
    }
}

async function getCurrentUser() {
    const response = await fetch('/auth/me', {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch user data');
    }
    
    const data = await response.json();
    return data.user || data;
}

function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}