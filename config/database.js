/**
 * Database configuration and connection module
 * @module config/database
 * @requires dotenv
 * @requires mysql2/promise
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Database configuration object
 * @type {Object}
 * @property {string} host - Database host (from env or defaults to 'localhost')
 * @property {string} user - Database user (from env or defaults to 'root')
 * @property {string} password - Database password (from env or empty string)
 * @property {string} database - Database name (from env or defaults to 'erasmapp')
 * @property {number} port - Database port (from env or defaults to 3306)
 * @property {boolean} waitForConnections - Whether to wait for connections
 * @property {number} connectionLimit - Maximum number of connections in the pool
 */
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erasmapp',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
}

/**
 * Creates a MySQL connection pool
 * @type {mysql.Pool}
 * @const
 */
const pool = mysql.createPool(config);

/**
 * Function to test the database connection
 * @async
 * @function testConnection
 * @throws {Error} If connection fails 
 */
async function testConnection() {
    try{
        const connection = await pool.getConnection();
        console.log('Connected to database');
        connection.release();
    }
    catch(error){
        console.error('Error connecting to database', error.message);
        process.exit(1);
    }
}


/**
 * Module exports
 * @exports {Object} database
 * @property {Pool} pool - MySQL connection pool instance
 * @property {Function} testConnection - Function to test database connection
 */
module.exports = {
    pool,
    testConnection
};