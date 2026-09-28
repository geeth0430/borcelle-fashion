import mongoose from 'mongoose'

const siteContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'storefront' },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

export default mongoose.models.SiteContent || mongoose.model('SiteContent', siteContentSchema)