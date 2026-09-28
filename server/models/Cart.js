import mongoose from 'mongoose'

const cartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  }],
}, { timestamps: true })

export default mongoose.models.Cart || mongoose.model('Cart', cartSchema)