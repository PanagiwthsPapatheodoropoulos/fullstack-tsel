const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');


router.get('/profile/:userId', async (req,res) => {
    const userId = req.params.userId;

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

router.patch('/profile/:userId', async (req, res) => {
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

        const [existingEmails] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ? ', [email], [userId]);

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

        if(password && password.trim() !== '') {
           if(password.length < 5) {
                return res.status(400).json({ error: 'Ο κωδικός πρόσβασης πρέπει να έχει τουλάχιστον 5 χαρακτήρες' });
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                return res.status(400).json({ error: 'Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον ένα σύμβολο' });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            //at this point the criteria for the user login fields fit
            //so we will update the user
            const [result] = await pool.query(
                'UPDATE users SET first_name =?, last_name =?, student_id =?,\
                phone =?, email =?, password =? WHERE id =?',
                [firstName, lastName, studentId, phone, email, hashedPassword, userId]);
                res.json({message: 'Ο χρήστης ενημερώθηκε επιτυχώς'});
            }
    } 
    catch (error) {
        console.error('Ενημέρωση χρήστη απέτυχε', error.message);
        res.status(500).json({error: 'Σφάλμα κατά την ενημέρωση του χρήστη'});
    }
});


module.exports = router;