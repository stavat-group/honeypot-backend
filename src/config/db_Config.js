const mongoose = require("mongoose");
const connectDB = async () => {
    try {
        // Connect to MongoDB
        // const mongoURI = process.env.MONGODB_URI_DEV;
        const mongoURI = process.env.DB_URI;
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 30000,
        });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};

module.exports = connectDB;