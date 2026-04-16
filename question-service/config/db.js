const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const con = await mongoose.connect(process.env.DB_CLOUD_URI)
        console.log(`MongoDB Connected: ${con.connection.host}`)
    } catch (err) {
        console.error(`Error: ${err.message}`)
        process.exit(1)
    }  
}

module.exports = connectDB;