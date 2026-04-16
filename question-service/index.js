const express = require('express');
const cors = require('cors');

const dotenv = require('dotenv').config();
const connectDB = require('./config/db');

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();

app.options(
    /.*/,
    cors({
        origin: '*',
        optionsSuccessStatus: 200,
    }),
)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 8080;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}...`)
    })
}

app.use('/api/questions', require('./routes/questionRoutes'))

app.get('/', (req, res) => {
    res.json({ message: 'Hello World' })
})

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'question-service' })
})

module.exports = app