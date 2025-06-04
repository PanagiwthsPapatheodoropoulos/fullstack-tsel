const express = require('express');
const router = express.Router();
const { pool }  = require('../config/database');
const path = require('path');

const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'administrator') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const deactivateExpiredPeriods = async () => {
    try {
        const query = `
            UPDATE application_periods 
            SET is_active = 0 
            WHERE is_active = 1 
            AND NOW() > end_date`;
            
        const [result] = await pool.query(query);
        if (result.affectedRows > 0) {
            console.log(`Deactivated ${result.affectedRows} expired application period(s)`);
        }
    } catch (error) {
        console.error('Error deactivating periods:', error);
    }
};


router.get('/current', async (req, res) => {
    try {

      await deactivateExpiredPeriods(); 
      const query = `
          SELECT *, 
                  NOW() > end_date as has_ended,
                  NOW() BETWEEN start_date AND end_date as is_current
          FROM application_periods 
          WHERE is_active = 1 
          ORDER BY created_at DESC 
          LIMIT 1
      `;
        
      const [rows] = await pool.query(query);
      
      if (rows.length === 0) {
          return res.json({ 
              period: null, 
              isActive: false,
              message: 'Δεν έχει οριστεί περίοδος αιτήσεων'
          });
      }
      
      const period = rows[0];
      const currentDate = new Date();
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);
      
      const isCurrentlyActive = currentDate >= startDate && currentDate <= endDate;
      
      res.json({ 
          period: period,
          isActive: isCurrentlyActive,
          message: isCurrentlyActive ? 
              'Η περίοδος αιτήσεων είναι ενεργή' : 
              'Η περίοδος αιτήσεων έχει λήξει'
      });
    }
    catch (error) {
      console.error('Error fetching current period:', error);
      res.status(500).json({ error: 'Failed to fetch current period' });
    }
});

// Set application period (admin only)
router.post('/set', requireAdmin ,async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Ημερομηνία έναρξης και λήξης είναι υποχρεωτικές' 
      });
    }
    
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Η ημερομηνία έναρξης πρέπει να είναι πριν από την ημερομηνία λήξης' 
      });
    }
    
    // Deactivate all existing periods
    await pool.query('UPDATE application_periods SET is_active = 0');
    
    // Insert new period
    const insertQuery = `
      INSERT INTO application_periods (start_date, end_date, is_active, created_at) 
      VALUES (?, ?, 1, NOW())
    `;
    
    await pool.query(insertQuery, [start_date, end_date]);
    
    res.json({ 
      success: true, 
      message: 'Η περίοδος υποβολής αιτήσεων έχει οριστεί επιτυχώς' 
    });
  } catch (error) {
    console.error('Σφάλμα ορισμού περιόδου ', error);
    res.status(500).json({ 
      success: false, 
      message: 'Σφάλμα κατά τον ορισμό της περιόδου υποβολής αιτήσεων' 
    });
  }
});

// Get all periods
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT * FROM application_periods 
      ORDER BY created_at DESC
    `;
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching periods:', error);
    res.status(500).json({ error: 'Failed to fetch periods' });
  }
});


// Add these new routes:
// Get all applications (admin only) - matches frontend call
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id as application_id,
        u.first_name,
        u.last_name,
        u.student_id,
        a.passed_courses_percent as success_rate,
        a.average_grade,
        a.english_level,
        a.knows_extra_languages as other_languages,
        a.first_choice_university_id as first_choice,
        a.second_choice_university_id as second_choice,
        a.third_choice_university_id as third_choice,
        u1.university_name as first_choice_name,
        u2.university_name as second_choice_name,
        u3.university_name as third_choice_name,
        a.transcript_file,
        a.english_certificate_file as english_certificate,
        a.other_certificates_files as other_certificates,
        a.is_accepted,
        a.submitted_at as submission_date
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
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Accept applications (admin only)
router.post('/admin/accept', requireAdmin, async (req, res) => {
  try {
    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds)) {
      return res.status(400).json({ message: 'Invalid application IDs' });
    }

    // Reset all applications to not accepted
    await pool.query('UPDATE applications SET is_accepted = 0');

    // Set selected applications as accepted
    if (applicationIds.length > 0) {
      const placeholders = applicationIds.map(() => '?').join(',');
      const query = `UPDATE applications SET is_accepted = 1 WHERE id IN (${placeholders})`;
      await pool.query(query, applicationIds);
    }

    res.json({ message: 'Applications updated successfully' });
  } 
  catch (error) {
    console.error('Error updating applications:', error);
    res.status(500).json({ message: 'Failed to update applications' });
  }
});

// Get accepted applications (admin only)
router.get('/admin/accepted', requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id as application_id,
        u.first_name,
        u.last_name,
        u.student_id,
        a.average_grade,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
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

// Serve application files (admin only)
router.get('/file/:applicationId/:fileType', requireAdmin, async (req, res) => {
  try {
    const { applicationId, fileType } = req.params;
    
    const query = 'SELECT transcript_file, english_certificate_file, other_certificates_files FROM applications WHERE id = ?';
    const [rows] = await pool.query(query, [applicationId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    let filename;
    switch (fileType) {
      case 'transcript':
        filename = rows[0].transcript_file;
        break;
      case 'english':
        filename = rows[0].english_certificate_file;
        break;
      case 'other':
        filename = rows[0].other_certificates_files;
        break;
      default:
        return res.status(400).json({ error: 'Invalid file type' });
    }
    
    if (!filename) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = path.join(__dirname, '../uploads', filename);
    res.download(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

setInterval(() => {
    deactivateExpiredPeriods();
}, 60000); 

deactivateExpiredPeriods();//initial call

module.exports = router;