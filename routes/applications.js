const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

    // Validate required fields
    if (!user_id || !passed_courses_percent || !average_grade || !english_level || 
        !first_choice_university_id || !terms_accepted) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if application period is active
    const periodQuery = `
      SELECT * FROM applications_periods 
      WHERE is_active = 1 AND CURDATE() BETWEEN start_date AND end_date
    `;
    const [periodRows] = await pool.query(periodQuery);
    
    if (periodRows.length === 0) {
      return res.status(400).json({ error: 'Application period is not active' });
    }

    // Check if user already has an application
    const existingQuery = 'SELECT id FROM applications WHERE user_id = ?';
    const [existing] = await pool.query(existingQuery, [user_id]);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already has an application' });
    }

    // Handle file uploads
    const transcriptFile = req.files['transcript_file'] ? req.files['transcript_file'][0].filename : null;
    const englishFile = req.files['english_certificate_file'] ? req.files['english_certificate_file'][0].filename : null;
    const otherFiles = req.files['other_certificates_files'] ? 
      JSON.stringify(req.files['other_certificates_files'].map(file => file.filename)) : null;

    if (!transcriptFile || !englishFile) {
      return res.status(400).json({ error: 'Transcript and English certificate files are required' });
    }

    const insertQuery = `
      INSERT INTO applications (
        user_id, passed_courses_percent, average_grade, english_level,
        knows_extra_languages, first_choice_university_id, second_choice_university_id,
        third_choice_university_id, transcript_file, english_certificate_file,
        other_certificates_files, terms_accepted, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      user_id,
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
    ];

    const [result] = await pool.query(insertQuery, values);
    
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: result.insertId
    });

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
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
    console.error('Error fetching all applications (admin):', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get accepted applications (admin only)
router.get('/admin/accepted', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'administrator') {
    return res.status(403).json({ message: 'Not authorized' });
  }
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

module.exports = router;