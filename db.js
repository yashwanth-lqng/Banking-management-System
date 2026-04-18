require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then((connection) => {
        console.log('Database connected successfully.');
        connection.release();
    })
    .catch((err) => {
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist. Please run the schema.sql script in MySQL first.');
        } else {
            console.error('Database connection failed:', err);
        }
    });

module.exports = pool;
