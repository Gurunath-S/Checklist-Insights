const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./src/routes/auth');
const insightsRouter = require('./src/routes/insights');
const activityRouter = require('./src/routes/activity');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Routes
app.use('/api/auth', authRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/activity', activityRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
