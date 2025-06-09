/**
 * Universities route module
 * @module routes/universities
 * @requires express
 * @requires ../config/database
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');


/**
 * Get all universities
 * @route GET /api/universities
 * @returns {Object[]} List of universities
 * @throws {500} Server error
 */
router.get('/', async (req,res) => {
    try {
        const [universities] = await pool.query(
        'SELECT university_id, university_name, country, city, website FROM universities ORDER BY university_name');

        res.json(universities)
    } 
    catch (error) {
        console.error("Σφάλμα ανάκτησης", error.message);
        res.status(500).json({error: "Σφάλμα κατά την ανάκτηση των πανεπιστημίων"});
    }
});

/**
 * Get specific university by ID
 * @route GET /api/universities/:id
 * @param {string} id - University ID
 * @returns {Object} University details
 * @throws {404} University not found
 * @throws {500} Server error
 */
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

/**
 * Get all universities 
 * @route GET /api/universities/admin
 * @returns {Object[]} List of universities with all details
 * @throws {500} Server error
 */
router.get('/admin', async (req, res) => {
    try {
        const [universities] = await pool.query(
            `SELECT university_id, university_name, country, city, website 
             FROM universities 
             ORDER BY university_name`
        );
        res.json(universities);
    } 
    catch (error) {
        console.error("Error fetching universities:", error);
        res.status(500).json({ error: "Σφάλμα διακομιστή" });
    }
});


/**
 * Add new university,admin functionality
 * @route POST /api/universities
 * @param {Object} req.body - University data
 * @param {string} req.body.university_name - University name
 * @param {string} req.body.country - Country
 * @param {string} req.body.city - City
 * @param {string} req.body.website - Website URL
 * @returns {Object} Success message and university ID
 * @throws {400} Missing required fields or university exists
 * @throws {500} Server error
 */
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

/**
 * Delete university,admin functionality
 * @route DELETE /api/universities/:id
 * @param {string} id - University ID
 * @returns {Object} Success message
 * @throws {404} University not found
 * @throws {400} University has applications
 * @throws {500} Server error
 */
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
    } 
    catch (error) {
        console.error("Σφάλμα διαγραφής πανεπιστημίου", error.message);
        res.status(500).json({error: "Σφάλμα κατά διαγραφή του πανεπιστημίου"});
    }
})

module.exports = router;