import mongoose from "mongoose";

const connectDB = async () => {
try {
    console.log(`Connecting to MongoDB at: ${process.env.MONGODB_URI}`);
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}`);
    
    console.log(`MongoDB Connected: ${connectionInstance.connection.host}`);
} catch (error) {
    console.error("MONGO Connection ERROR", error);
    process.exit(1);
}
}

export default connectDB;