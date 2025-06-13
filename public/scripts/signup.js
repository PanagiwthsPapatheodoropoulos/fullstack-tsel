/**
 * Signup form handling module
 * @module signup
 */

//After DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/auth/me', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.user || data;
            
            if (user && user.username) {
                // Hide the entire signup form
                const signupForm = document.getElementById('signup-form');
                const container = document.querySelector('.signup-container');
                
                if (signupForm && container) {
                    // Create message container
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

                    // Create logout button
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

                    // Add hover effects
                    logoutButton.onmouseover = () => {
                        logoutButton.style.backgroundColor = '#c82333';
                    };
                    
                    logoutButton.onmouseout = () => {
                        logoutButton.style.backgroundColor = '#dc3545';
                    };

                    // Add logout functionality
                    logoutButton.onclick = async () => {
                        try {
                            await fetch('/auth/logout', {
                                method: 'POST',
                                credentials: 'include'
                            });
                            window.location.reload();
                        } 
                        catch (err) {
                            console.error('Logout error:', err);
                        }
                    };

                    // Hide form and show message with logout button
                    signupForm.style.display = 'none';
                    infoDiv.appendChild(logoutButton);
                    container.insertBefore(infoDiv, signupForm);
                }
            }
        }
    } 
    catch (err) {
        console.error('Error checking login status:', err);
    }
});


/**
 * Validate name fields
 * @function validateName
 * @param {string} name - Name to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
function validateName(name, fieldName) {
    if (!name || name.trim() === '') {
        return `Το ${fieldName} είναι υποχρεωτικό`;
    }
    if (/\d/.test(name)) {
        return `Το ${fieldName} δεν πρέπει να περιέχει ψηφία`;
    }
    return null;
}

/**
 * Validate student ID
 * @function validateStudentId
 * @param {string} studentId - Student ID to validate
 * @returns {string|null} Error message or null if valid
 */
function validateStudentId(studentId) {
    if (!studentId || studentId.trim() === '') {
        return 'Ο αριθμός μητρώου είναι υποχρεωτικός';
    }
    if (!/^\d{13}$/.test(studentId)) {
        return 'Ο αριθμός μητρώου πρέπει να αποτελείται από ακριβώς 13 ψηφία';
    }
    if (!studentId.startsWith('2022')) {
        return 'Ο αριθμός μητρώου πρέπει να ξεκινά από 2022';
    }
    return null;
}


/**
 * Validate phone number
 * @function validatePhone
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Error message or null if valid
 */
function validatePhone(phone) {
    if (!phone || phone.trim() === '') {
        return 'Το τηλέφωνο είναι υποχρεωτικό';
    }
    if (!/^\d{10}$/.test(phone)) {
        return 'Το τηλέφωνο πρέπει να αποτελείται από ακριβώς 10 ψηφία';
    }
    return null;
}


/**
 * Validate email address
 * @function validateEmail
 * @param {string} email - Email to validate
 * @returns {string|null} Error message or null if valid
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return 'Το email είναι υποχρεωτικό';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Μη έγκυρη διεύθυνση email';
    }
    return null;
}


/**
 * Validate username
 * @function validateUsername
 * @param {string} username - Username to validate
 * @returns {string|null} Error message or null if valid
 */
function validateUsername(username) {
    if (!username || username.trim() === '') {
        return 'Το όνομα χρήστη είναι υποχρεωτικό';
    }
    return null;
}


/**
 * Validate password
 * @function validatePassword
 * @param {string} password - Password to validate
 * @returns {string|null} Error message or null if valid
 */
function validatePassword(password) {
    if (!password) {
        return 'Ο κωδικός πρόσβασης είναι υποχρεωτικός';
    }
    if (password.length < 5) {
        return 'Ο κωδικός πρόσβασης πρέπει να αποτελείται από τουλάχιστον 5 χαρακτήρες';
    }
    // Check for at least one special character
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;
    if (!specialCharRegex.test(password)) {
        return 'Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον έναν ειδικό χαρακτήρα (π.χ. !, #, $)';
    }
    return null;
}


/**
 * Validate password confirmation
 * @function validateConfirmPassword
 * @param {string} password - Original password
 * @param {string} confirmPassword - Password confirmation
 * @returns {string|null} Error message or null if valid
 */
function validateConfirmPassword(password, confirmPassword) {
    if (!confirmPassword) {
        return 'Η επιβεβαίωση κωδικού είναι υποχρεωτική';
    }
    if (password !== confirmPassword) {
        return 'Οι κωδικοί πρόσβασης δεν ταιριάζουν';
    }
    return null;
}



/**
 * Check if username already exists
 * @async
 * @function checkUsernameExists
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if username exists
 */
async function checkUsernameExists(username) {
    try {
        const response = await fetch('/auth/check-username', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ username })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.exists;
        }
        return false;
    } 
    catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}


/**
 * Setup real-time form validation
 * @function setupRealTimeValidation
 */
function setupRealTimeValidation() {
    const fields = [
        { id: 'firstname', validator: (value) => validateName(value, 'όνομα') },
        { id: 'lastname', validator: (value) => validateName(value, 'επίθετο') },
        { id: 'reg_number', validator: validateStudentId },
        { id: 'phone', validator: validatePhone },
        { id: 'email', validator: validateEmail },
        { id: 'username', validator: validateUsername },
        { id: 'password', validator: validatePassword },
        { id: 'confirm_password', validator: (value) => {
            const password = document.getElementById('password').value;
            return validateConfirmPassword(password, value);
        }}
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            element.addEventListener('blur', () => {
                const error = field.validator(element.value);
                showFieldError(field.id, error);
            });

            // Clear error on input
            element.addEventListener('input', () => {
                clearFieldError(field.id);
            });
        }
    });

    // Special handling for username
    const usernameField = document.getElementById('username');
    if (usernameField) {
        let timeoutId;
        usernameField.addEventListener('input', () => {
            clearTimeout(timeoutId);
            clearFieldError('username');
            
            timeoutId = setTimeout(async () => {
                const username = usernameField.value.trim();
                if (username) {
                    const basicError = validateUsername(username);
                    if (!basicError) {
                        const exists = await checkUsernameExists(username);
                        if (exists) {
                            showFieldError('username', 'Το όνομα χρήστη υπάρχει ήδη');
                        }
                    }
                }
            }, 500); // Debounce for 500ms
        });
    }
}


/**
 * Show field-specific error message
 * @function showFieldError
 * @param {string} fieldId - ID of field with error
 * @param {string} errorMessage - Error message to display
 */
function showFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Remove existing error
    clearFieldError(fieldId);

    if (errorMessage) {
        // Add error class to field
        field.classList.add('error');
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = errorMessage;
        errorDiv.style.cssText = `
            color: #dc3545;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            display: block;
        `;
        
        // Insert error message after the field
        field.parentNode.appendChild(errorDiv);
    }
}


/**
 * Clear field-specific error message
 * @function clearFieldError
 * @param {string} fieldId - ID of field to clear error from
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('error');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}


/**
 * Handle signup form submission
 * @async
 * @function handleSignup
 * @param {Event} event - Submit event
 */
async function handleSignup(event) {
    event.preventDefault();
    
    // Get form values
    const firstName = document.getElementById('firstname').value.trim();
    const lastName = document.getElementById('lastname').value.trim();
    const studentId = document.getElementById('reg_number').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const terms = document.getElementById('terms').checked;

    // Clear all previous errors
    const fieldIds = ['firstname', 'lastname', 'reg_number', 'phone', 'email', 'username', 'password', 'confirm_password'];
    fieldIds.forEach(clearFieldError);

    // Validate all fields
    const errors = [];
    let hasErrors = false;

    // Validate first name
    const firstNameError = validateName(firstName, 'όνομα');
    if (firstNameError) {
        showFieldError('firstname', firstNameError);
        errors.push(firstNameError);
        hasErrors = true;
    }

    // Validate last name
    const lastNameError = validateName(lastName, 'επίθετο');
    if (lastNameError) {
        showFieldError('lastname', lastNameError);
        errors.push(lastNameError);
        hasErrors = true;
    }

    // Validate student ID
    const studentIdError = validateStudentId(studentId);
    if (studentIdError) {
        showFieldError('reg_number', studentIdError);
        errors.push(studentIdError);
        hasErrors = true;
    }

    // Validate phone
    const phoneError = validatePhone(phone);
    if (phoneError) {
        showFieldError('phone', phoneError);
        errors.push(phoneError);
        hasErrors = true;
    }

    // Validate email
    const emailError = validateEmail(email);
    if (emailError) {
        showFieldError('email', emailError);
        errors.push(emailError);
        hasErrors = true;
    }

    // Validate username
    const usernameError = validateUsername(username);
    if (usernameError) {
        showFieldError('username', usernameError);
        errors.push(usernameError);
        hasErrors = true;
    } 
    else {
        // Check if username exists
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            showFieldError('username', 'Το όνομα χρήστη υπάρχει ήδη');
            errors.push('Το όνομα χρήστη υπάρχει ήδη');
            hasErrors = true;
        }
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
        showFieldError('password', passwordError);
        errors.push(passwordError);
        hasErrors = true;
    }

    // Validate confirm password
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    if (confirmPasswordError) {
        showFieldError('confirm_password', confirmPasswordError);
        errors.push(confirmPasswordError);
        hasErrors = true;
    }

    // Check terms
    if (!terms) {
        showMessage('error', 'Πρέπει να αποδεχτείτε τους όρους χρήσης');
        hasErrors = true;
    }

    // If there are validation errors, don't proceed
    if (hasErrors) {
        showMessage('error', 'Παρακαλώ διορθώστε τα σφάλματα στη φόρμα');
        return;
    }

    // Prepare request body
    const requestBody = {
        firstName,
        lastName,
        studentId,
        phone,
        email,
        username,
        password,
        confirmPassword
    };

    try {
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', 
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('success', data.message || 'Η εγγραφή ολοκληρώθηκε με επιτυχία!');
            // Redirect to login after successful signup
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } 
        else {
            // Handle server-side errors (fallback)
            showMessage('error', data.error || data.message || 'Σφάλμα κατά την εγγραφή');
        }
    } 
    catch (error) {
        console.error('Signup error:', error);
        showMessage('error', 'Σφάλμα επικοινωνίας με τον server');
    }
}


/**
 * Show general message to user
 * @function showMessage
 * @param {('success'|'error')} type - Message type
 * @param {string} message - Message to display
 */
function showMessage(type, message) {
    // Create message container if it doesn't exist
    let messageDiv = document.querySelector('.message-container');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.className = 'message-container';
        const form = document.getElementById('signup-form');
        form.parentNode.insertBefore(messageDiv, form);
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    messageElement.style.cssText = `
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border: 1px solid;
        border-radius: 4px;
        ${type === 'success' ? 
            'background-color: #d4edda; color: #155724; border-color: #c3e6cb;' : 
            'background-color: #f8d7da; color: #721c24; border-color: #f5c6cb;'
        }
    `;

    // Clear previous messages
    messageDiv.innerHTML = '';
    messageDiv.appendChild(messageElement);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

// Initialize real-time validation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupRealTimeValidation();
});


//Panagiotis Papatheodoropoulos
//123papathe!


//Iliana Christana
//il123!

