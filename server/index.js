const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRouter = require('./src/routes/auth');
const insightsRouter = require('./src/routes/insights');
const activityRouter = require('./src/routes/activity');

const app = express();

// Enable trust proxy for Render / Vercel reverse proxies
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://checklist-insights.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL.trim());
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Routes
app.use('/api/auth', authRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/activity', activityRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
