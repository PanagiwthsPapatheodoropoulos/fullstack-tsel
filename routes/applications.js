/**
 * Applications route module
 * @module routes/applications
 * @requires express
 * @requires multer
 * @requires path
 * @requires fs
 * @requires ../config/database
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Upload directory configuration
 * @constant {string}
 */
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


//multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Double-check directory exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const userId = req.body.user_id;
        const fileType = file.fieldname.replace('_file', '');
        const ext = path.extname(file.originalname);
        // Create unique filename that won't conflict
        const filename = `${fileType}_${userId}_${Date.now()}${ext}`;
        cb(null, filename);
    }
});


const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } 
        else {
            cb(new Error('Invalid file type. Only PDF, JPG and PNG are allowed.'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
}).fields([
    { name: 'transcript_file', maxCount: 1 },
    { name: 'english_certificate_file', maxCount: 1 },
    { name: 'other_certificates_files', maxCount: 5 }
]);

// Wrap multer error handling
const uploadMiddleware = (req, res, next) => {
    upload(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ 
                error: 'File upload error', 
                details: err.message 
            });
        } 
        else if (err) {
            return res.status(500).json({ 
                error: 'Server error during file upload', 
                details: err.message 
            });
        }
        next();
    });
};

/**
 * Check application period status middleware
 * @middleware
 * @async
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Next middleware function
 */
const checkPeriodStatus = async (req, res, next) => {
    try {
        // First check for active periods that need to be deactivated
        const [periodsToDeactivate] = await pool.query(`
            SELECT id 
            FROM application_periods 
            WHERE is_active = 1 
            AND NOW() > end_date`
        );

        if (periodsToDeactivate.length > 0) {
            // Update their status
            await pool.query(`
                UPDATE application_periods 
                SET is_active = 0 
                WHERE id IN (?)`,
                [periodsToDeactivate.map(p => p.id)]
            );
            
            console.log('Period(s) automatically deactivated:', 
                periodsToDeactivate.map(p => p.id)
            );
        }

        // Get current active period status
        const [activePeriod] = await pool.query(`
            SELECT *, 
                   NOW() > end_date as has_ended,
                   NOW() BETWEEN start_date AND end_date as is_current
            FROM application_periods 
            WHERE is_active = 1 
            ORDER BY created_at DESC 
            LIMIT 1`
        );

        // Store period info in request for route handlers
        req.currentPeriod = activePeriod[0] || null;
        next();
    } 
    catch (error) {
        console.error('Error checking period status:', error);
        next();
    }
};


/**
 * Get all accepted applications
 * @route GET /api/applications/accepted
 * @returns {Object[]} List of accepted applications
 * @throws {500} Server error
 */
router.get('/accepted', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        u.first_name,
        u.last_name,
        u.student_id,
        a.passed_courses_percent,
        a.average_grade,
        a.english_level,
        a.knows_extra_languages,
        u1.university_name as first_choice,
        u2.university_name as second_choice,
        u3.university_name as third_choice,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      WHERE a.is_accepted = 1
      ORDER BY a.submitted_at DESC
    `;
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } 
  catch (error) {
    console.error('Error fetching accepted applications:', error);
    res.status(500).json({ error: 'Failed to fetch accepted applications' });
  }
});

/**
 * Get user's application
 * @route GET /api/applications/user/:userId
 * @param {string} userId - User ID
 * @returns {Object} User's application details
 * @throws {400} Invalid user ID
 * @throws {404} Application not found
 * @throws {500} Server error
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const query = `
      SELECT 
        a.*,
        u1.university_name as first_choice_name,
        u2.university_name as second_choice_name,
        u3.university_name as third_choice_name
      FROM applications a
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      WHERE a.user_id = ?
    `;
    
    const [rows] = await pool.query(query, [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No application found for this user' });
    }
    
    res.json(rows[0]);
  } 
  catch (error) {
    console.error('Error fetching user application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});


/**
 * Submit new application
 * @route POST /api/applications
 * @param {Object} req.body - Application data
 * @param {Object} req.files - Uploaded files
 * @returns {Object} Submission confirmation
 * @throws {400} Missing files or invalid period
 * @throws {500} Server error
 */
router.post('/', checkPeriodStatus , uploadMiddleware, async (req, res) => {
    try {
        // Log incoming request data for debugging
        console.log('Request body:', req.body);
        console.log('Request files:', req.files);

        // Validate file uploads first
        if (!req.files || !req.files['transcript_file'] || !req.files['english_certificate_file']) {
            return res.status(400).json({ error: 'Missing required files' });
        }

        const {
            user_id,
            passed_courses_percent,
            average_grade,
            english_level,
            knows_extra_languages,
            first_choice_university_id,
            second_choice_university_id,
            third_choice_university_id,
            terms_accepted
        } = req.body;

        // Cleanup function for error handling
        const cleanup = (files) => {
            Object.values(files).flat().forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        };

        try {
            // Check if application period is active
            const [periodRows] = await pool.query(`
                SELECT * FROM application_periods 
                WHERE is_active = 1 AND CURDATE() BETWEEN start_date AND end_date
            `);
            
            if (periodRows.length === 0) {
                cleanup(req.files);
                return res.status(400).json({ error: 'Application period is not active' });
            }

            // Check if user already has an application
            const [existing] = await pool.query('SELECT id FROM applications WHERE user_id = ?', [user_id]);
            
            if (existing.length > 0) {
                cleanup(req.files);
                return res.status(400).json({ error: 'User already has an application' });
            }

            // Process file uploads
            const transcriptFile = req.files['transcript_file'][0].filename;
            const englishFile = req.files['english_certificate_file'][0].filename;
            const otherFiles = req.files['other_certificates_files'] ? 
                JSON.stringify(req.files['other_certificates_files'].map(file => file.filename)) : null;

            // Insert application
            const [result] = await pool.query(`
                INSERT INTO applications (
                    user_id, passed_courses_percent, average_grade, english_level,
                    knows_extra_languages, first_choice_university_id, second_choice_university_id,
                    third_choice_university_id, transcript_file, english_certificate_file,
                    other_certificates_files, terms_accepted, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                parseInt(user_id),
                parseFloat(passed_courses_percent),
                parseFloat(average_grade),
                english_level,
                knows_extra_languages === 'true' ? 1 : 0,
                parseInt(first_choice_university_id),
                second_choice_university_id ? parseInt(second_choice_university_id) : null,
                third_choice_university_id ? parseInt(third_choice_university_id) : null,
                transcriptFile,
                englishFile,
                otherFiles,
                terms_accepted === 'true' ? 1 : 0
            ]);

            return res.status(201).json({
                message: 'Application submitted successfully',
                applicationId: result.insertId
            });

        } 
        catch (dbError) {
            // Clean up files if database operation fails
            cleanup(req.files);
            console.error('Database error:', dbError);
            throw dbError;
        }

    } 
    catch (error) {
        // Clean up any uploaded files on error
        if (req.files) {
            cleanup(req.files);
        }
        console.error('Error submitting application:', error);
        res.status(500).json({ 
            error: 'Failed to submit application',
            details: error.message 
        });
    }
});

/**
 * Delete application
 * @route DELETE /api/applications/:id
 * @param {string} id - Application ID
 * @returns {Object} Deletion confirmation
 * @throws {403} Not authorized
 * @throws {404} Application not found
 * @throws {500} Server error
 */
router.delete('/:id', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Not authorized' });
    }

    try {
        const applicationId = parseInt(req.params.id);
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        
        // Get all files from the application
        const [applications] = await pool.query(
            'SELECT transcript_file, english_certificate_file, other_certificates_files FROM applications WHERE id = ?', 
            [applicationId]
        );

        if (applications.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const application = applications[0];

        // Get all files in uploads directory
        const allFiles = fs.readdirSync(uploadsDir);
        
        // Find files related to this application
        const relatedFiles = allFiles.filter(filename => {
            return filename.includes(`_${applicationId}_`) || 
                   filename === application.transcript_file || 
                   filename === application.english_certificate_file ||
                   (application.other_certificates_files && 
                    application.other_certificates_files.includes(filename));
        });

        // Delete the files
        relatedFiles.forEach(filename => {
            const filePath = path.join(uploadsDir, filename);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } 
            catch (err) {
                console.warn(`Failed to delete file ${filename}:`, err);
            }
        });

        // Delete the application from database
        await pool.query('DELETE FROM applications WHERE id = ?', [applicationId]);

        res.json({ 
            message: 'Application deleted successfully',
            deletedFiles: relatedFiles
        });

    } 
    catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ message: 'Failed to delete application' });
    }
});

/**
 * Update application acceptance status
 * @route PUT /api/applications/:id/acceptance
 * @param {string} id - Application ID
 * @param {boolean} is_accepted - Acceptance status
 * @returns {Object} Update confirmation
 * @throws {400} Invalid application ID
 * @throws {404} Application not found
 * @throws {500} Server error
 */
router.put('/:id/acceptance', async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { is_accepted } = req.body;

    if (isNaN(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const query = 'UPDATE applications SET is_accepted = ? WHERE id = ?';
    const [result] = await pool.query(query, [is_accepted ? 1 : 0, applicationId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application status updated successfully' });
  } 
  catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

/**
 * Publish application results
 * @route POST /api/applications/publish-results
 * @returns {Object} Published results
 * @throws {400} No completed period or accepted applications
 * @throws {500} Server error
 */
router.post('/publish-results', checkPeriodStatus,async (req, res) => {
    try {
        // Check if period exists and is inactive
        const [periodRows] = await pool.query(`
            SELECT *, DATE(end_date) as end_date_only
            FROM application_periods 
            WHERE is_active = 0
            ORDER BY end_date DESC
            LIMIT 1
        `);

        if (periodRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Δεν βρέθηκε ολοκληρωμένη περίοδος αιτήσεων'
            });
        }

        // Check if we have any accepted applications
        const [acceptedCheck] = await pool.query(
            'SELECT COUNT(*) as count FROM applications WHERE is_accepted = 1'
        );

        if (acceptedCheck[0].count === 0) {
            return res.status(400).json({
                success: false,
                message: 'Δεν υπάρχουν δεκτές αιτήσεις για δημοσίευση'
            });
        }

        // Get accepted applications for this period
        const [acceptedApplications] = await pool.query(`
            SELECT a.*, u.first_name, u.last_name, u.student_id
            FROM applications a
            JOIN users u ON a.user_id = u.id
            WHERE a.is_accepted = 1 
            AND a.submitted_at BETWEEN ? AND ?
            ORDER BY a.average_grade DESC
        `, [periodRows[0].start_date, periodRows[0].end_date]);

        res.json({ 
            success: true, 
            message: 'Τα αποτελέσματα δημοσιεύτηκαν επιτυχώς',
            results: acceptedApplications
        });

    } 
    catch (error) {
        console.error('Error publishing results:', error);
        res.status(500).json({ 
            success: false,
            message: 'Σφάλμα κατά τη δημοσίευση των αποτελεσμάτων',
            error: error.message
        });
    }
});


/**
 * Get all applications this is only for admin
 * @route GET /api/applications/admin/all
 * @returns {Object[]} List of all applications
 * @throws {403} Not authorized
 * @throws {500} Server error
 */
router.get('/admin/all', checkPeriodStatus, async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'administrator') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  try {
    const query = `
      SELECT 
        a.id AS application_id,
        u.first_name,
        u.last_name,
        u.student_id,
        a.passed_courses_percent AS success_rate,
        a.average_grade,
        a.english_level,
        a.knows_extra_languages AS other_languages,
        a.first_choice_university_id AS first_choice,
        a.second_choice_university_id AS second_choice,
        a.third_choice_university_id AS third_choice,
        u1.university_name AS first_choice_name,
        u2.university_name AS second_choice_name,
        u3.university_name AS third_choice_name,
        a.transcript_file,
        a.english_certificate_file AS english_certificate,
        a.other_certificates_files AS other_certificates,
        a.terms_accepted,
        a.is_accepted,
        a.submitted_at AS submission_date
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      ORDER BY a.submitted_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } 
  catch (error) {
    console.error('Error fetching all applications (admin):', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});


/**
 * Accept multiple applications this is only for admin
 * @route POST /api/applications/admin/accept
 * @param {number[]} applicationIds - Array of application IDs to accept
 * @returns {Object} Update confirmation
 * @throws {403} Not authorized
 * @throws {400} Invalid application IDs
 * @throws {500} Server error
 */
router.post('/admin/accept', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ message: 'Not authorized' });
    }

    try {
        const { applicationIds } = req.body;

        if (!Array.isArray(applicationIds)) {
            return res.status(400).json({ message: 'Invalid application IDs' });
        }

        // First, reset all applications to not accepted
        await pool.query('UPDATE applications SET is_accepted = 0');

        // Then, set selected applications as accepted
        if (applicationIds.length > 0) {
            const placeholders = applicationIds.map(() => '?').join(',');
            const query = `UPDATE applications SET is_accepted = 1 WHERE id IN (${placeholders})`;
            await pool.query(query, applicationIds);
        }

        res.json({ 
            message: 'Αιτήσεις ενημερώθηκαν επιτυχώς',
            acceptedIds: applicationIds 
        });
    } 
    catch (error) {
        console.error('Error updating accepted applications:', error);
        res.status(500).json({ message: 'Αποτυχία ενημέρωσης αιτήσεων' });
    }
});

/**
 * Get accepted applications this is only for admin
 * @route GET /api/applications/admin/accepted
 * @returns {Object[]} List of accepted applications
 * @throws {403} Not authorized
 * @throws {500} Server error
 */
router.get('/admin/accepted', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'administrator') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  try {
    const query = `
      SELECT 
        a.id AS application_id,
        u.first_name,
        u.last_name,
        u.student_id,
        a.passed_courses_percent AS success_rate,
        a.average_grade,
        a.english_level,
        a.knows_extra_languages AS other_languages,
        a.first_choice_university_id AS first_choice,
        a.second_choice_university_id AS second_choice,
        a.third_choice_university_id AS third_choice,
        u1.university_name AS first_choice_name,
        u2.university_name AS second_choice_name,
        u3.university_name AS third_choice_name,
        a.transcript_file,
        a.english_certificate_file AS english_certificate,
        a.other_certificates_files AS other_certificates,
        a.terms_accepted,
        a.is_accepted,
        a.submitted_at AS submission_date
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      WHERE a.is_accepted = 1
      ORDER BY a.submitted_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } 
  catch (error) {
    console.error('Error fetching accepted applications (admin):', error);
    res.status(500).json({ error: 'Failed to fetch accepted applications' });
  }
});


/**
 * Get application file
 * @route GET /api/applications/file/:applicationId/:fileType/:index?
 * @param {string} applicationId - Application ID
 * @param {string} fileType - Type of file (transcript/english/other)
 * @param {string} [index] - Index for other certificates
 * @returns {File} Requested file
 * @throws {404} File not found
 * @throws {400} Invalid file type
 * @throws {500} Server error
 */
router.get('/file/:applicationId/:fileType/:index?', async (req, res) => {
    try {
        const { applicationId, fileType, index = 0 } = req.params;
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        
        const query = 'SELECT transcript_file, english_certificate_file, other_certificates_files FROM applications WHERE id = ?';
        const [rows] = await pool.query(query, [applicationId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        let filePath;
        switch(fileType) {
            case 'transcript':
                filePath = path.join(uploadsDir, rows[0].transcript_file);
                break;
            case 'english':
                filePath = path.join(uploadsDir, rows[0].english_certificate_file);
                break;
            case 'other':
                const allFiles = fs.readdirSync(uploadsDir);

                let otherFiles;
                try {
                    otherFiles = rows[0].other_certificates_files;
                    if (typeof otherFiles === 'string') {
                        otherFiles = JSON.parse(otherFiles);
                    }
                    if (!Array.isArray(otherFiles)) {
                        otherFiles = [otherFiles];
                    }
                } 
                catch (e) {
                    otherFiles = [];
                }

                const otherCertFiles = allFiles.filter(file => 
                    otherFiles.includes(file)
                );

                if (otherCertFiles.length === 0) {
                    return res.status(404).json({ error: 'No other certificates found' });
                }

                const fileIndex = parseInt(index);
                if (fileIndex >= otherCertFiles.length) {
                    return res.status(404).json({ 
                        error: 'Certificate index out of range',
                        available: otherCertFiles.length
                    });
                }

                filePath = path.join(uploadsDir, otherCertFiles[fileIndex]);
                break;
            default:
                return res.status(400).json({ error: 'Invalid file type' });
        }

        if (!filePath || !fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        }[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(filePath);

    } 
    catch (error) {
        res.status(500).json({ error: 'Error serving file' });
    }
});

/**
 * Check user's application status
 * @route GET /api/applications/check-status
 * @returns {Object} Application status
 * @throws {401} Not authenticated
 * @throws {500} Server error
 */
router.get('/check-status', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [applications] = await pool.query(
            'SELECT id FROM applications WHERE user_id = ?',
            [req.session.user.id]
        );

        res.json({
            hasApplication: applications.length > 0
        });
    } 
    catch (error) {
        console.error('Error checking application status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;