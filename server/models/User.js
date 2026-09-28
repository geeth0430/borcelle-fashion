import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
  googleId: { type: String, unique: true, sparse: true },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model('User', userSchema)