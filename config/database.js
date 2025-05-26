require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erasmapp',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
}

//create connection pool
const pool = mysql.createPool(config);

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

module.exports = {
    pool,
    testConnection
};