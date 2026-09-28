import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  items: { type: [orderItemSchema], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, enum: ['LKR'], default: 'LKR' },
  customer: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true, enum: ['Sri Lanka'], default: 'Sri Lanka' },
  },
  status: { type: String, enum: ['pending', 'paid', 'cancelled', 'failed', 'charged_back'], default: 'pending' },
  paymentId: String,
  paymentMethod: String,
}, { timestamps: true })

export default mongoose.models.Order || mongoose.model('Order', orderSchema)