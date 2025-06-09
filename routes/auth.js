/**
 * Authentication routes module
 * @module routes/auth
 * @requires express
 * @requires bcryptjs
 * @requires ../config/database
 */
const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const router = express.Router();


/**
 * Get current authenticated user information
 * @route GET /auth/me
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {Object} User information if authenticated
 * @throws {401} If user is not authenticated
 */
router.get('/me', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    
    res.json({
        id: req.session.user.id,
        username: req.session.user.username,
        role: req.session.user.role,
        first_name: req.session.user.first_name,
        last_name: req.session.user.last_name,
        student_id: req.session.user.student_id,
        email: req.session.user.email
    });
});

/**
 * User login endpoint
 * @route POST /auth/login
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - User's username
 * @param {string} req.body.password - User's password
 * @returns {Object} User information and success message
 * @throws {400} If required fields are missing
 * @throws {401} If credentials are invalid
 * @throws {500} If server error occurs
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ message: 'Όλα τα πεδία είναι υποχρεωτικά' });
        }

        // Updated query to include student_id and email
        const [users] = await pool.query(
            'SELECT id, username, password, first_name, last_name, role, student_id, email FROM users WHERE username = ?', 
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Λάθος username ή password' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Λάθος username ή password' });
        }

        // Set session with all required fields
        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            student_id: user.student_id,
            email: user.email
        };

        // Return complete user info
        res.json({
            message: 'Επιτυχής σύνδεση',
            user: {
                id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                student_id: user.student_id,
                email: user.email,
                role: user.role
            }
        });
    } 
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Σφάλμα server κατά την είσοδο' });
    }
});


/**
 * User registration endpoint
 * @route POST /auth/signup
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {Object} req.body - Request body
 * @param {string} req.body.firstName - User's first name
 * @param {string} req.body.lastName - User's last name
 * @param {string} req.body.studentId - Student ID (must start with 2022)
 * @param {string} req.body.phone - Phone number (10 digits)
 * @param {string} req.body.email - Email address
 * @param {string} req.body.username - Username
 * @param {string} req.body.password - Password
 * @param {string} req.body.confirmPassword - Password confirmation
 * @returns {Object} Success message and user ID
 * @throws {400} If validation fails
 * @throws {500} If server error occurs
 */
router.post('/signup', async (req, res) => {
    const { 
        firstName, 
        lastName, 
        studentId, 
        phone, 
        email, 
        username, 
        password,
        confirmPassword 
    } = req.body;

    try {
        if(!firstName || !lastName || !studentId || !phone || !email || !username || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if(password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Validate name
        if (/\d/.test(firstName) || /\d/.test(lastName)) {
            return res.status(400).json({ error: 'Το όνομα και επίθετο δεν πρέπει να περιέχουν ψηφία' });
        }

        // Validate student ID
        if (!/^2022\d{9}$/.test(studentId)) {
            return res.status(400).json({ error: 'Ο αριθμός μητρώου πρέπει να αποτελείται από 13 ψηφία και να ξεκινά από 2022' });
        }

        // Validate phone
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Το τηλέφωνο πρέπει να αποτελείται από ακριβώς 10 ψηφία' });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Μη έγκυρη διεύθυνση email' });
        }

        // Check existing users
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        if(existingUsers.length > 0) {
            return res.status(400).json({ message: 'Το username υπάρχει ήδη' });
        }

        const [existingEmails] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if(existingEmails.length > 0) {
            return res.status(400).json({ message: 'Το email υπάρχει ήδη' });
        }

        const [existingStudentIds] = await pool.query('SELECT id FROM users WHERE student_id = ?', [studentId]);
        if(existingStudentIds.length > 0) {
            return res.status(400).json({ message: 'Το studentId υπάρχει ήδη' });
        }

        const [existingPhones] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
        if(existingPhones.length > 0) {
            return res.status(400).json({ message: 'Το κινητό υπάρχει ήδη' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await pool.query(
            'INSERT INTO users (username, password, first_name, last_name, student_id, phone, email, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, firstName, lastName, studentId, phone, email, 'registered']
        );

        res.status(201).json({ message: 'Εγγραφή χρήστη ολοκληρώθηκε επιτυχώς', userId: result.insertId });

    } 
    catch(error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Σφάλμα server κατά την εγγραφή' });
    }
});

/**
 * User logout endpoint
 * @route POST /auth/logout
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {Object} Logout success message
 */
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
    });
});

/**
 * Check administrator authorization
 * @route GET /auth/check
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @returns {Object} User information if authorized
 * @throws {403} If user is not an administrator
 */
router.get('/check', (req, res) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ user: req.session.user });
});

/**
 * Check if username exists
 * @route POST /auth/check-username
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {Object} req.body - Request body
 * @param {string} req.body.username - Username to check
 * @returns {Object} Boolean indicating if username exists
 * @throws {400} If username is not provided
 * @throws {500} If server error occurs
 */
router.post('/check-username', async (req, res) => {
    const { username } = req.body;

    try {
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
        
        res.json({ exists: existingUsers.length > 0 });
    } 
    catch (error) {
        console.error('Username check error:', error);
        res.status(500).json({ message: 'Server error checking username' });
    }
});



module.exports = router;