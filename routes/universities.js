const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req,res) => {
    try {
        const [universities] = await pool.query(
        'SELECT university_id, university_name, country, city, website FROM universities ORDER BY university_name');

        res.json(universities)
    } catch (error) {
        console.error("Σφάλμα ανάκτησης", error.message);
        res.status(500).json({error: "Σφάλμα κατά την ανάκτηση των πανεπιστημίων"});
    }
});

router.get('/:id', async (req, res) => {
    const universityId = req.params.id;

    try {
       const [universities] = await pool.query(
            'SELECT university_id, university_name, country FROM universities WHERE university_id = ?',
            [universityId]
        );

        if(universities.length === 0) {
            return res.status(404).json({message: 'Το πανεπιστήμιο δεν βρέθηκε'}); 
        }

        res.json(universities[0]);
    }
    catch (error) {
        console.error("Σφάλμα ανάκτησης πανεπιστημίου", error.message);
        res.status(500).json({error: "Σφάλμα κατά την ανάκτηση του πανεπιστημίου"});
    }
});

router.get('/admin', async (req, res) => {
    try {
        const [universities] = await pool.query(
            `SELECT university_id, university_name, country, city, website 
             FROM universities 
             ORDER BY university_name`
        );
        res.json(universities);
    } catch (error) {
        console.error("Error fetching universities:", error);
        res.status(500).json({ error: "Σφάλμα διακομιστή" });
    }
});


//admin adds a university 
router.post('/', async (req, res) => {
    const { university_name, country,city,website } = req.body;

    try{
        if(!university_name || !country ||!city ||!website) {
            return res.status(400).json({message: 'Όλα τα πεδία είναι υποχρεωτικά'});
        }

        const [existingUniversity] = await pool.query(
            'SELECT university_id FROM universities WHERE university_name =? AND country = ? AND city = ?',
            [university_name,country,city]
        );

        if(existingUniversity.length > 0) {
            return res.status(400).json({message: 'Το πανεπιστήμιο υπάρχει ήδη'});
        }

        const [result] = await pool.query(
            'INSERT INTO universities (university_name, country, city, website) VALUES (?, ?, ?, ?)',
            [university_name,country,city,website]
        );

        res.status(201).json({message: 'Το πανεπιστήμιο προστέθηκε με επιτυχία', universityId: result.insertId});

    } 
    catch(error) {
        console.error("Σφάλμα προσθέτωσης πανεπιστημίου", error.message);
        res.status(500).json({error: "Σφάλμα κατά την προσθήκη του πανεπιστημίου"});
    }
});

router.delete('/:id', async (req, res) =>{
    const universityId = req.params.id;

    try {
        const [existingUniversities] = await pool.query(
            'SELECT university_id FROM universities WHERE university_id =?',
            [universityId]
        );

        if(existingUniversities.length === 0) {
            return res.status(404).json({message: 'Το πανεπιστήμιο δεν βρέθηκε'});
        }

        const [applications] = await pool.query(
           'SELECT id FROM applications WHERE first_choice_university_id = ? OR second_choice_university_id =? OR third_choice_university_id =?',
            [universityId, universityId, universityId] 
        );

        if(applications.length > 0) {
            return res.status(400).json({message: 'Υπάρχουν αίτήσεις για αυτό το πανεπιστήμιο. Δεν μπορείτε να το διαγράψετε'});
        }

        //now we can delete the university
        await pool.query(
            'DELETE FROM universities WHERE university_id =?',
            [universityId]
        );

        res.json({message: 'Το πανεπιστήμιο διαγράφηκε με επιτυχία'});
    } catch (error) {
        console.error("Σφάλμα διαγραφής πανεπιστημίου", error.message);
        res.status(500).json({error: "Σφάλμα κατά διαγραφή του πανεπιστημίου"});
    }
})

module.exports = router;