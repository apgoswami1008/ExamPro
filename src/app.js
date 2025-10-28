require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/database');

// Initialize express app
const app = express();

// Initialize models and connect to MongoDB
require('./models'); // Initialize models first
connectDB() // Connect to MongoDB
    .then(() => console.log('Database connected successfully'))
    .catch(err => {
        console.error('Database connection error:', err);
        process.exit(1);
    });

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https:", "blob:"],
            "script-src": ["'self'", "'unsafe-inline'", "https:", "cdn.jsdelivr.net", "code.jquery.com", "unpkg.com"],
            "style-src": ["'self'", "'unsafe-inline'", "https:", "cdn.jsdelivr.net", "fonts.googleapis.com", "unpkg.com"],
            "font-src": ["'self'", "https:", "fonts.gstatic.com", "data:"],
            "frame-src": ["'self'", "https:", "*.stripe.com", "*.razorpay.com"],
            "connect-src": ["'self'", "https:", "wss:", "*.stripe.com", "*.razorpay.com"],
        },
    },
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session and Flash Messages
const session = require('express-session');
const flash = require('connect-flash');

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(flash());

// Attach user to response locals
const attachUser = require('./middlewares/attach-user.middleware');
app.use(attachUser);
app.use(cookieParser());
// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path, stat) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

// View Engine Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth.routes'));
app.use('/', require('./routes/profile.routes')); // Profile routes
app.use('/notifications', require('./routes/notification.routes')); // Notification routes
// These routes will be implemented later
// app.use('/api', require('./routes/api'));
 app.use('/admin', require('./routes/admin.routes'));
// app.use('/superadmin', require('./routes/superadmin'));

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('pages/error', {
        title: '404 Not Found',
        message: 'The page you are looking for does not exist.'
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).render('pages/error', {
        title: 'Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;