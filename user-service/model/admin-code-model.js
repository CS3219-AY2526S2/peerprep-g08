import mongoose from "mongoose";

const Schema = mongoose.Schema;

const AdminCodeModelSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "UserModel",
        required: true,
    },
    isUsed: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400, // 86400 seconds = 24 hours => expires after 24 hours
    },
});

export default mongoose.model("AdminCodeModel", AdminCodeModelSchema);
