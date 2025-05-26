const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/database');
const path = require('path');
const multer = require('multer');
const session = require('express-session');


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const applicationRoutes = require('./routes/applications');
const universityRoutes = require('./routes/universities');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    credentials: true
}));


app.use(session({
    secret: 'u7$2kL!9pQz@1vX4eR6wT0bN8sF3cJ5h', // secret key for signing the session ID cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // true if using HTTPS
        sameSite: 'lax'
    }
}));

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/universities', universityRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/periods', require('./routes/periods'));


// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,'public','index.html'));
});

app.get('*', (req, res) => {
    if(req.path.startsWith('/api/')) res.status(404).json({message: '404 Page not found'});
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

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