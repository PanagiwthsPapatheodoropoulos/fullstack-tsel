const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}


// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Get user ID from request
        const userId = req.body.user_id;
        // Get file type from fieldname
        const fileType = file.fieldname.replace('_file', '');
        // Get file extension
        const ext = path.extname(file.originalname);
        // Create unique filename using userId and fileType
        const filename = `${fileType}_${userId}${ext}`;
        cb(null, filename);
    }
});


const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG and PNG are allowed.'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});


// Get all applications (admin only)
router.get('/', async (req, res) => {
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
        a.transcript_file,
        a.english_certificate_file,
        a.other_certificates_files,
        a.terms_accepted,
        a.is_accepted,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      ORDER BY a.submitted_at DESC
    `;
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications sorted by average grade (descending)
router.get('/sorted-by-grade', async (req, res) => {
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
        a.transcript_file,
        a.english_certificate_file,
        a.other_certificates_files,
        a.terms_accepted,
        a.is_accepted,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      ORDER BY a.average_grade DESC
    `;
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching applications sorted by grade:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications by minimum pass percentage
router.get('/by-pass-percentage/:minPercentage', async (req, res) => {
  try {
    const minPercentage = parseFloat(req.params.minPercentage);
    
    if (isNaN(minPercentage) || minPercentage < 0 || minPercentage > 100) {
      return res.status(400).json({ error: 'Invalid percentage value' });
    }

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
        a.transcript_file,
        a.english_certificate_file,
        a.other_certificates_files,
        a.terms_accepted,
        a.is_accepted,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      WHERE a.passed_courses_percent >= ?
      ORDER BY a.passed_courses_percent DESC
    `;
    
    const [rows] = await pool.query(query, [minPercentage]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching applications by pass percentage:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get applications by university
router.get('/by-university/:universityId', async (req, res) => {
  try {
    const universityId = parseInt(req.params.universityId);
    
    if (isNaN(universityId)) {
      return res.status(400).json({ error: 'Invalid university ID' });
    }

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
        a.transcript_file,
        a.english_certificate_file,
        a.other_certificates_files,
        a.terms_accepted,
        a.is_accepted,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN universities u1 ON a.first_choice_university_id = u1.university_id
      LEFT JOIN universities u2 ON a.second_choice_university_id = u2.university_id
      LEFT JOIN universities u3 ON a.third_choice_university_id = u3.university_id
      WHERE a.first_choice_university_id = ? 
         OR a.second_choice_university_id = ? 
         OR a.third_choice_university_id = ?
      ORDER BY a.submitted_at DESC
    `;
    
    const [rows] = await pool.query(query, [universityId, universityId, universityId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching applications by university:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get accepted applications
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
  } catch (error) {
    console.error('Error fetching accepted applications:', error);
    res.status(500).json({ error: 'Failed to fetch accepted applications' });
  }
});

// Get user's application
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
  } catch (error) {
    console.error('Error fetching user application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});


// Submit application
router.post('/', upload.fields([
  { name: 'transcript_file', maxCount: 1 },
  { name: 'english_certificate_file', maxCount: 1 },
  { name: 'other_certificates_files', maxCount: 5 }
]), async (req, res) => {
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

    try {
      // Check if application period is active - Fix the table name
      const [periodRows] = await pool.query(`
        SELECT * FROM application_periods 
        WHERE is_active = 1 AND CURDATE() BETWEEN start_date AND end_date
      `);
      
      if (periodRows.length === 0) {
        return res.status(400).json({ error: 'Application period is not active' });
      }

      // Check if user already has an application
      const [existing] = await pool.query('SELECT id FROM applications WHERE user_id = ?', [user_id]);
      
      if (existing.length > 0) {
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

      res.status(201).json({
        message: 'Application submitted successfully',
        applicationId: result.insertId
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ 
      error: 'Failed to submit application',
      details: error.message 
    });
  }
});

// Update application acceptance status (admin only)
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
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Bulk update application acceptance status (admin only)
router.put('/bulk-acceptance', async (req, res) => {
  try {
    const { applicationIds, is_accepted } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid application IDs' });
    }

    const placeholders = applicationIds.map(() => '?').join(',');
    const query = `UPDATE applications SET is_accepted = ? WHERE id IN (${placeholders})`;
    const values = [is_accepted ? 1 : 0, ...applicationIds];

    const [result] = await pool.query(query, values);

    res.json({ 
      success: true,
      message: 'Applications updated successfully',
      updatedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error bulk updating applications:', error);
    res.status(500).json({ success: false, message: 'Failed to update applications' });
  }
});

// Get application statistics
router.get('/stats', async (req, res) => {
  try {
    const queries = [
      'SELECT COUNT(*) as total FROM applications',
      'SELECT COUNT(*) as accepted FROM applications WHERE is_accepted = 1',
      'SELECT AVG(average_grade) as avg_grade FROM applications',
      'SELECT english_level, COUNT(*) as count FROM applications GROUP BY english_level'
    ];

    const [totalResult] = await pool.query(queries[0]);
    const [acceptedResult] = await pool.query(queries[1]);
    const [avgGradeResult] = await pool.query(queries[2]);
    const [englishLevelResult] = await pool.query(queries[3]);

    res.json({
      total: totalResult[0].total,
      accepted: acceptedResult[0].accepted,
      averageGrade: parseFloat(avgGradeResult[0].avg_grade || 0).toFixed(2),
      englishLevels: englishLevelResult
    });
  } catch (error) {
    console.error('Error fetching application statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});


router.post('/publish-results', async (req, res) => {
  try {
    // Check if application period has ended
    const periodQuery = `
      SELECT * FROM applications_periods 
      WHERE is_active = 1 AND CURDATE() > end_date
    `;
    const [periodRows] = await pool.query(periodQuery);
    
    if (periodRows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot publish results - application period is still active or no active period found' 
      });
    }

    // You can add logic here to create a results page or update a results table
    // For now, just return success
    res.json({ 
      success: true, 
      message: 'Results published successfully' 
    });
  } catch (error) {
    console.error('Error publishing results:', error);
    res.status(500).json({ success: false, message: 'Failed to publish results' });
  }
});

// Get all applications (admin only)
router.get('/admin/all', async (req, res) => {
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
  } catch (error) {
    console.error('Error fetching all applications (admin):', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});


// Accept applications (admin only)
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
    } catch (error) {
        console.error('Error updating accepted applications:', error);
        res.status(500).json({ message: 'Αποτυχία ενημέρωσης αιτήσεων' });
    }
});


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
  } catch (error) {
    console.error('Error fetching accepted applications (admin):', error);
    res.status(500).json({ error: 'Failed to fetch accepted applications' });
  }
});


// Add this endpoint to serve files
router.get('/file/:applicationId/:fileType', async (req, res) => {
    try {
        const { applicationId, fileType } = req.params;
        
        // Get file path from database
        const query = 'SELECT transcript_file, english_certificate_file, other_certificates_files FROM applications WHERE id = ?';
        const [rows] = await pool.query(query, [applicationId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        let filePath;
        switch(fileType) {
            case 'transcript':
                filePath = path.join(uploadDir, rows[0].transcript_file);
                break;
            case 'english':
                filePath = path.join(uploadDir, rows[0].english_certificate_file);
                break;
            case 'other':
                // Handle multiple files if needed
                filePath = path.join(uploadDir, rows[0].other_certificates_files);
                break;
            default:
                return res.status(400).json({ error: 'Invalid file type' });
        }

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Send file
        res.sendFile(filePath);

    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ error: 'Error serving file' });
    }
});

module.exports = router;