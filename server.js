/**
 * Main server application entry point
 * @module server
 * @requires express
 * @requires cors
 * @requires express-session
 * @requires path
 * @requires multer
 * @requires ./config/database
 * @requires ./routes/auth
 * @requires ./routes/users
 * @requires ./routes/applications
 * @requires ./routes/universities
 */
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const path = require('path');
const multer = require('multer');
const session = require('express-session');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');
const universityRoutes = require('./routes/universities');

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();
/**
 * Port on which the server will listen
 * @constant {number}
 */
const PORT = process.env.PORT || 3000;

/**
 * CORS configuration
 * @type {Object}
 */
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type']
}));

/**
 * Session middleware configuration
 * @type {Object}
 */
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));


app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(express.static(path.join(__dirname, 'public')));

/**
 * 
 */
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/universities', universityRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/periods', require('./routes/periods'));


/**
 * Main page route handler
 * @route GET /
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'public','index.html'));
});

/**
 * 404 handler for API routes
 * @route GET *
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 */
app.get('*', (req, res) => {
    if(req.path.startsWith('/api/')) res.status(404).json({message: '404 Page not found'});
});

/**
 * Global error handler middleware
 * @middleware
 * @param {Error} error - Error object
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express next middleware function
 */
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Server startup function
 * @async
 * @function startServer
 * @throws {Error} Database connection error
 */
const startServer = async () => {
    try {
        await testConnection();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch(error) {
        console.error('Error connecting to database', error.message);
        process.exit(1);
    }
};

startServer();