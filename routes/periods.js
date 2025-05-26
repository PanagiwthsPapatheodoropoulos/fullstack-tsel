const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get current active period
router.get('/current', async (req, res) => {
  try {
    const query = `
      SELECT * FROM applications_periods 
      WHERE is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const [rows] = await pool.query(query);
    
    if (rows.length === 0) {
      return res.json({ period: null, isActive: false });
    }
    
    const period = rows[0];
    const currentDate = new Date();
    const startDate = new Date(period.start_date);
    const endDate = new Date(period.end_date);
    
    const isCurrentlyActive = currentDate >= startDate && currentDate <= endDate;
    
    res.json({ 
      period: period, 
      isActive: isCurrentlyActive 
    });
  } catch (error) {
    console.error('Error fetching current period:', error);
    res.status(500).json({ error: 'Failed to fetch current period' });
  }
});

// Set application period (admin only)
router.post('/set', async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }
    
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }
    
    // Deactivate all existing periods
    await pool.query('UPDATE applications_periods SET is_active = 0');
    
    // Insert new period
    const insertQuery = `
      INSERT INTO applications_periods (start_date, end_date, is_active, created_at) 
      VALUES (?, ?, 1, NOW())
    `;
    
    await pool.query(insertQuery, [start_date, end_date]);
    
    res.json({ 
      success: true, 
      message: 'Application period set successfully' 
    });
  } catch (error) {
    console.error('Error setting application period:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to set application period' 
    });
  }
});

// Get all periods
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT * FROM applications_periods 
      ORDER BY created_at DESC
    `;
    
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching periods:', error);
    res.status(500).json({ error: 'Failed to fetch periods' });
  }
});

module.exports = router;