const express = require('express');
const path = require('path'); // Import the path module
const app = express();
const helmet = require('helmet'); // Import helmet
const bodyParser = require('body-parser'); // Import body-parser
const cookieParser = require('cookie-parser'); // Import cookie-parser
const db = require('./services/db'); // Import the database service
const csrf = require('csurf'); // Import the csurf module
const csrfProtection = csrf({ cookie: true }); // Initialize CSRF protection

app.use(helmet());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(csrfProtection);

const rateLimit = require('express-rate-limit'); // Import express-rate-limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

app.get('/', (req, res) => {
  res.redirect('/auth/login'); // Redirect to the login page
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/database', require('./routes/database'));
app.use('/query', require('./routes/query'));

app.use(express.static(path.join(__dirname, '../client/build'))); // Serve static files from React app

// Error Handling

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    "success": false,
    "message": 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
