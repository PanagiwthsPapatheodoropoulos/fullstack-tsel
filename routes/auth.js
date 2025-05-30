const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const router = express.Router();



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

    try{

        
        if(!firstName || !lastName || !studentId || !phone || !email || !username || !password || !confirmPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if(password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (/\d/.test(lastName)) {
                return res.status(400).json({ error: 'Το επίθετο δεν πρέπει να περιέχει ψηφία' });
        }

        // Validate student ID (13 digits, starting with 2022)
        if (!/^2022\d{9}$/.test(studentId)) {
            return res.status(400).json({ error: 'Ο αριθμός μητρώου πρέπει να αποτελείται από 13 ψηφία και να ξεκινά από 2022' });
        }

        // Validate phone (exactly 10 digits)
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Το τηλέφωνο πρέπει να αποτελείται από ακριβώς 10 ψηφία' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Μη έγκυρη διεύθυνση email' });
        }

        // Validate password (at least 5 characters, at least one symbol)
        if (password.length < 5) {
            return res.status(400).json({ error: 'Ο κωδικός πρόσβασης πρέπει να έχει τουλάχιστον 5 χαρακτήρες' });
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return res.status(400).json({ error: 'Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον ένα σύμβολο' });
        }

        const [existingUsers]= await pool.query('SELECT id FROM users WHERE username = ?', [username]);

        if(existingUsers.length > 0 ){
            return res.status(400).json({ message: 'Το username υπάρχει ήδη' });
        }

        const [existingEmails] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

        if(existingEmails.length > 0 ){
            return res.status(400).json({ message: 'Το email υπάρχει ήδη' });
        }

        const [existingStudentIds] = await pool.query('SELECT id FROM users WHERE student_Id =?', [studentId]);

        if(existingStudentIds.length > 0 ){
            return res.status(400).json({ message: 'Το studentId υπάρχει ήδη' });
        }

        const [existingPhones] = await pool.query('SELECT id FROM users WHERE phone =?', [phone]);

        if(existingPhones.length > 0 ){
            return res.status(400).json({ message: 'Το κινητό υπάρχει ήδη' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password,saltRounds);

        const [result] = await pool.query(
            'INSERT INTO users (username, password, first_name, last_name, student_id, phone, email, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, firstName, lastName, studentId, phone, email,'registered'] 
        );

        res.status(201).json({ message: 'Εγγραφή χρήστη ολοκληρώθηκε επιτυχώς', userId: result.insertId });


    }
    catch(error){
        console.error(`Signup error: ${error.message}`);
        res.status(500).json({ message: 'Σφάλμα server κατά την εγγραφή' });
    }
    
})

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
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Σφάλμα server κατά την είσοδο' });
    }
});

router.get('/check', (req, res) => {
    if (!req.session || !req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ user: req.session.user });
});


router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out' });
    });
});

module.exports = router;