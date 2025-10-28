const mongoose = require('mongoose');

// MongoDB connection options
const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4
};

// Get MongoDB connection URI from env or use default Atlas URI
const getMongoURI = () => {
    // Always prefer the Atlas URI
    const atlasUri = 'mongodb+srv://apgoswamiinfo_db_user:laksgEvaawaZE2Wp@onlineexamination.awgplad.mongodb.net/online_exam_db?retryWrites=true&w=majority';
    return process.env.MONGODB_URI || atlasUri;
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(getMongoURI(), options);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('Mongoose connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected');
        });

        // If Node process ends, close MongoDB connection
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = { connectDB };