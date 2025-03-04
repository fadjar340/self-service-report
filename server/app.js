const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const csrfProtection = csrf({ cookie: true });

app.use(helmet());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(csrfProtection);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/database', require('./routes/database'));
app.use('/query', require('./routes/query'));

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