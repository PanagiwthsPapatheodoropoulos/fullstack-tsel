/**
 * Users route module
 * @module routes/users
 * @requires express
 * @requires bcrypt
 * @requires ../config/database
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');


const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
    }
    next();
};



/**
 * Get user profile
 * @route GET /api/users/profile/:userId
 * @param {string} userId - User ID
 * @returns {Object} User profile information
 * @throws {404} User not found
 * @throws {500} Server error
 */
router.get('/profile/:userId',requireAuth, async (req,res) => {
    const userId = req.params.userId;

    // Verify user is accessing their own profile
    if (req.session.user.id !== parseInt(req.params.userId)) {
        return res.status(403).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

        if(users.length === 0) {
            return res.status(404).json({message: 'Ο χρήστης δεν βρέθηκε'});
        }

        res.json(users[0]);
    } 
    catch (error) {
        console.error('Error fetching user profile', error.message);
        res.status(500).json({error: 'Σφάλμα κατά την ανάκτηση του χρήστη από τον server'});
    }

});

/**
 * Update user profile,i use patch because I might not want to update all the fields
 * @route PATCH /api/users/profile/:userId
 * @param {string} userId - User ID
 * @param {Object} req.body - Profile update data
 * @param {string} req.body.firstName - First name (no digits allowed)
 * @param {string} req.body.lastName - Last name (no digits allowed)
 * @param {string} req.body.studentId - Student ID (must start with 2022, 13 digits)
 * @param {string} req.body.phone - Phone number (10 digits)
 * @param {string} req.body.email - Email address
 * @param {string} [req.body.password] - New password (min 5 chars, requires symbol)
 * @returns {Object} Success message
 * @throws {400} Validation errors
 * @throws {500} Server error
 */
router.patch('/profile/:userId', async (req, res) => {


     // Verify user is updating their own profile
    if (req.session.user.id !== parseInt(req.params.userId)) {
        return res.status(403).json({ error: 'Μη εξουσιοδοτημένη πρόσβαση' });
    }


    const userId = req.params.userId;
    const {firstName, lastName, studentId, phone, email, password} = req.body;

    try {
        if (/\d/.test(firstName)) {
            return res.status(400).json({ error: 'Το όνομα δεν πρέπει να περιέχει ψηφία' });
        }

        if (/\d/.test(lastName)) {
            return res.status(400).json({ error: 'Το επίθετο δεν πρέπει να περιέχει ψηφία' });
        }

        if (!/^2022\d{9}$/.test(studentId)) {
            return res.status(400).json({ error: 'Ο αριθμός μητρώου πρέπει να αποτελείται από 13 ψηφία και να ξεκινά από 2022' });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ error: 'Το τηλέφωνο πρέπει να αποτελείται από ακριβώς 10 ψηφία' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Μη έγκυρη διεύθυνση email' });
        }

        const [existingEmails] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id != ?', 
            [email, userId]
        );

        if(existingEmails.length > 0 ){
            return res.status(400).json({ message: 'Το email υπάρχει ήδη' });
        }

        const [existingStudentIds] = await pool.query('SELECT id FROM users WHERE student_id = ? AND id != ?', [studentId, userId]);
        if (existingStudentIds.length > 0) {
            return res.status(400).json({ message: 'Ο αριθμός μητρώου υπάρχει ήδη' });
        }

        const [existingPhones] = await pool.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId]);
        if (existingPhones.length > 0) {
            return res.status(400).json({ message: 'Το τηλέφωνο υπάρχει ήδη' });
        }

        let query, params;
        if (password && password.trim() !== '') {
            // With password update
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            query = `
                UPDATE users 
                SET first_name = ?, 
                    last_name = ?, 
                    student_id = ?,
                    phone = ?, 
                    email = ?, 
                    password = ? 
                WHERE id = ?
            `;
            params = [firstName, lastName, studentId, phone, email, hashedPassword, userId];
        } else {
            // Without password update
            query = `
                UPDATE users 
                SET first_name = ?, 
                    last_name = ?, 
                    student_id = ?,
                    phone = ?, 
                    email = ? 
                WHERE id = ?
            `;
            params = [firstName, lastName, studentId, phone, email, userId];
        }

        const [result] = await pool.query(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ο χρήστης δεν βρέθηκε' });
        }

        req.session.user = {
            ...req.session.user,
            first_name: firstName,
            last_name: lastName,
            student_id: studentId,
            phone: phone,
            email: email
        };


        res.json({ 
            message: 'Ο χρήστης ενημερώθηκε επιτυχώς',
            user: {
                id: userId,
                first_name: firstName,
                last_name: lastName,
                student_id: studentId,
                phone: phone,
                email: email
            }
        });
    } 
    catch (error) {
        console.error('Ενημέρωση χρήστη απέτυχε', error.message);
        res.status(500).json({error: 'Σφάλμα κατά την ενημέρωση του χρήστη'});
    }
});


module.exports = router;