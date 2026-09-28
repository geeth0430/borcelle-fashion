import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  color: { type: String, required: true },
  image: { type: String, required: true },
  sizes: [{ type: String }],
  stock: { type: Number, default: 0 },
  sale: { type: Boolean, default: false },
  discountPercent: { type: Number, min: 0, max: 99, default: 0 },
  dailyStyle: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Product || mongoose.model('Product', productSchema)