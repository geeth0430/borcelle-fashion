import { Router } from 'express'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import process from 'node:process'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import Product from '../models/Product.js'
import SiteContent from '../models/SiteContent.js'
import { memoryProducts } from '../data/products.js'
import { setMemorySiteContent } from '../data/siteContentStore.js'
import requireAdmin from '../middleware/requireAdmin.js'
import defaultSiteContent from '../../client/siteContent.js'

const router = Router()
const imageDirectory = fileURLToPath(new URL('../../client/public/images/uploads/', import.meta.url))
const imageExtensions = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'],
])
mkdirSync(imageDirectory, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, imageDirectory),
    filename: (_request, file, callback) => callback(null, `${randomUUID()}${imageExtensions.get(file.mimetype) || '.img'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => callback(null, imageExtensions.has(file.mimetype)),
})

function sameSecret(value, expected) {
  const valueBuffer = Buffer.from(value)
  const expectedBuffer = Buffer.from(expected)
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer)
}

function productData(body) {
  const name = String(body.name || '').trim()
  const category = String(body.category || '').trim()
  const color = String(body.color || '').trim()
  const image = String(body.image || '').trim()
  const price = Number(body.price)
  const stock = Number(body.stock)
  const sale = Boolean(body.sale)
  const discountPercent = sale ? Number(body.discountPercent ?? 30) : 0
  const sizes = Array.isArray(body.sizes) ? [...new Set(body.sizes.map(String))] : []

  if (!name || name.length > 120) throw Object.assign(new Error('Enter a product name of 1 to 120 characters'), { status: 400 })
  if (!category || category.length > 60) throw Object.assign(new Error('Choose a valid category'), { status: 400 })
  if (!color || color.length > 40) throw Object.assign(new Error('Enter a product color'), { status: 400 })
  if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error('Price must be a non-negative number'), { status: 400 })
  if (!Number.isInteger(stock) || stock < 0) throw Object.assign(new Error('Stock must be a non-negative whole number'), { status: 400 })
  if (sale && (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 99)) {
    throw Object.assign(new Error('Hot deal discount must be a whole number from 1 to 99'), { status: 400 })
  }
  if (!image.startsWith('/images/') || image.includes('..')) throw Object.assign(new Error('Choose a local product image'), { status: 400 })
  if (!sizes.length || sizes.some((size) => !['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(size))) {
    throw Object.assign(new Error('Select at least one valid size'), { status: 400 })
  }

  return {
    name, category, color, image, price, stock, sizes,
    sale, discountPercent, dailyStyle: Boolean(body.dailyStyle),
  }
}

function contentText(value, fallback, maxLength = 300) {
  if (typeof value !== 'string') throw Object.assign(new Error('All content fields must be text'), { status: 400 })
  const text = value.trim()
  if (text.length > maxLength) throw Object.assign(new Error(`Content must be ${maxLength} characters or fewer`), { status: 400 })
  return text || fallback
}

function contentImage(value, fallback) {
  const image = contentText(value, fallback, 300)
  if (!image.startsWith('/images/') || image.includes('..')) throw Object.assign(new Error('Choose an image from the store image library'), { status: 400 })
  return image
}

function contentList(value, fallback, maxItems, maxLength = 80) {
  if (!Array.isArray(value) || value.length > maxItems) throw Object.assign(new Error('This list has an invalid number of items'), { status: 400 })
  return value.map((item) => contentText(item, '', maxLength)).filter(Boolean)
}

function siteContentData(body = {}) {
  const categoryValues = ['Tops', 'Dresses', 'T-Shirts', 'Blazers', 'Jumpsuits', 'Skirts', 'Jeans', 'Shorts']
  const input = body
  const content = structuredClone(defaultSiteContent)
  content.brand.name = contentText(input.brand?.name, content.brand.name, 40)
  content.brand.descriptor = contentText(input.brand?.descriptor, content.brand.descriptor, 40)
  content.announcement = contentText(input.announcement, content.announcement, 180)

  for (const key of Object.keys(content.navigation).filter((key) => !['clothingItems', 'collectionItems'].includes(key))) {
    content.navigation[key] = contentText(input.navigation?.[key], content.navigation[key], 50)
  }
  content.navigation.clothingItems = contentList(input.navigation?.clothingItems, content.navigation.clothingItems, 20)
  content.navigation.collectionItems = contentList(input.navigation?.collectionItems, content.navigation.collectionItems, 20)

  if (!Array.isArray(input.heroSlides) || input.heroSlides.length !== content.heroSlides.length) throw Object.assign(new Error('Keep all three hero slides'), { status: 400 })
  content.heroSlides = input.heroSlides.map((slide, index) => {
    const fallback = defaultSiteContent.heroSlides[index]
    const category = contentText(slide.category, fallback.category, 30)
    const theme = contentText(slide.theme, fallback.theme, 10)
    if (!categoryValues.includes(category) || !['', 'soft', 'dark'].includes(theme)) throw Object.assign(new Error('Hero slide category or style is invalid'), { status: 400 })
    return {
      image: contentImage(slide.image, fallback.image),
      alt: contentText(slide.alt, fallback.alt, 160),
      eyebrow: contentText(slide.eyebrow, fallback.eyebrow, 80),
      title: contentText(slide.title, fallback.title, 100),
      subtitle: contentText(slide.subtitle, fallback.subtitle, 180),
      action: contentText(slide.action, fallback.action, 40), category, theme,
    }
  })

  if (!Array.isArray(input.promotions) || input.promotions.length !== content.promotions.length) throw Object.assign(new Error('Keep both home promotion panels'), { status: 400 })
  content.promotions = input.promotions.map((promotion, index) => {
    const fallback = defaultSiteContent.promotions[index]
    const category = contentText(promotion.category, fallback.category, 30)
    if (!categoryValues.includes(category)) throw Object.assign(new Error('Promotion category is invalid'), { status: 400 })
    return {
      eyebrow: contentText(promotion.eyebrow, fallback.eyebrow, 80),
      title: contentText(promotion.title, fallback.title, 100),
      description: contentText(promotion.description, fallback.description, 180),
      action: contentText(promotion.action, fallback.action, 40),
      image: contentImage(promotion.image, fallback.image),
      alt: contentText(promotion.alt, fallback.alt, 160), category,
    }
  })

  if (!Array.isArray(input.categoryTiles) || input.categoryTiles.length !== content.categoryTiles.length) throw Object.assign(new Error('Keep all four homepage category tiles'), { status: 400 })
  content.categoryTiles = input.categoryTiles.map((tile, index) => {
    const fallback = defaultSiteContent.categoryTiles[index]
    const category = contentText(tile.category, fallback.category, 30)
    if (category !== fallback.category) throw Object.assign(new Error('Category tile destinations cannot be changed'), { status: 400 })
    return {
      label: contentText(tile.label, fallback.label, 40),
      image: contentImage(tile.image, fallback.image),
      alt: contentText(tile.alt, fallback.alt, 160),
      category,
    }
  })

  for (const key of ['partyShop', 'workwear', 'sale']) {
    content.pages[key] = {
      title: contentText(input.pages?.[key]?.title, content.pages[key].title, 50),
      description: contentText(input.pages?.[key]?.description, content.pages[key].description, 300),
    }
  }
  for (const key of ['eyebrow', 'title', 'alt', 'caption', 'description', 'action']) {
    content.pages.giftCard[key] = key === 'image'
      ? contentImage(input.pages?.giftCard?.[key], content.pages.giftCard[key])
      : contentText(input.pages?.giftCard?.[key], content.pages.giftCard[key], key === 'description' ? 300 : 160)
  }
  content.pages.giftCard.image = contentImage(input.pages?.giftCard?.image, content.pages.giftCard.image)

  for (const key of Object.keys(content.footer).filter((key) => key !== 'quickLinks')) {
    content.footer[key] = contentText(input.footer?.[key], content.footer[key], 300)
  }
  content.footer.quickLinks = contentList(input.footer?.quickLinks, content.footer.quickLinks, 20)
  return content
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function findProduct(id) {
  if (mongoose.connection.readyState === 1) {
    if (mongoose.isValidObjectId(id)) return Product.findById(id)
    return Product.findOne({ slug: id })
  }
  return memoryProducts.find((product) => product.slug === id) || null
}

router.post('/auth/login', (request, response) => {
  const username = String(request.body.username || '')
  const password = String(request.body.password || '')
  const adminUsername = process.env.ADMIN_USERNAME || ''
  const adminPassword = process.env.ADMIN_PASSWORD || ''
  const jwtSecret = process.env.JWT_SECRET || ''

  if (!adminUsername || !adminPassword || !jwtSecret) {
    return response.status(503).json({ message: 'Set ADMIN_USERNAME, ADMIN_PASSWORD, and JWT_SECRET in .env to enable admin access' })
  }
  if (!sameSecret(username, adminUsername) || !sameSecret(password, adminPassword)) {
    return response.status(401).json({ message: 'Username or password is incorrect' })
  }

  const token = jwt.sign({ sub: adminUsername, role: 'admin' }, jwtSecret, { expiresIn: '8h' })
  response.json({ token, username: adminUsername })
})

router.use(requireAdmin)

router.get('/products', async (_request, response, next) => {
  try {
    const products = mongoose.connection.readyState === 1
      ? await Product.find().sort({ createdAt: -1 }).lean()
      : [...memoryProducts].sort((left, right) => left.name.localeCompare(right.name))
    response.json({ products })
  } catch (error) { next(error) }
})

router.get('/content', async (_request, response, next) => {
  try {
    const saved = mongoose.connection.readyState === 1
      ? await SiteContent.findOne({ key: 'storefront' }).select('content').lean()
      : null
    response.json({ content: saved?.content || defaultSiteContent })
  } catch (error) { next(error) }
})

router.put('/content', async (request, response, next) => {
  try {
    const content = siteContentData(request.body)
    if (mongoose.connection.readyState === 1) {
      const saved = await SiteContent.findOneAndUpdate(
        { key: 'storefront' },
        { $set: { content } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      ).lean()
      return response.json({ content: saved.content })
    }
    setMemorySiteContent(content)
    response.json({ content })
  } catch (error) {
    if (error.status) return response.status(error.status).json({ message: error.message })
    next(error)
  }
})

router.post('/images', upload.single('image'), (request, response) => {
  if (!request.file) return response.status(400).json({ message: 'Choose a PNG, JPG, or WebP image up to 5 MB' })
  response.status(201).json({ image: `/images/uploads/${request.file.filename}` })
})

router.post('/products', async (request, response, next) => {
  try {
    const data = productData(request.body)
    const slug = `${slugify(data.name) || 'product'}-${randomUUID().slice(0, 8)}`
    if (mongoose.connection.readyState === 1) {
      const product = await Product.create({ ...data, slug })
      return response.status(201).json({ product })
    }
    const product = { ...data, slug, createdAt: new Date() }
    memoryProducts.unshift(product)
    response.status(201).json({ product })
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'A product with these details already exists' })
    if (error.status) return response.status(error.status).json({ message: error.message })
    next(error)
  }
})

router.put('/products/:id', async (request, response, next) => {
  try {
    const data = productData(request.body)
    if (mongoose.connection.readyState === 1) {
      const product = await findProduct(request.params.id)
      if (!product) return response.status(404).json({ message: 'Product not found' })
      Object.assign(product, data)
      await product.save()
      return response.json({ product })
    }
    const index = memoryProducts.findIndex((product) => product.slug === request.params.id)
    if (index < 0) return response.status(404).json({ message: 'Product not found' })
    memoryProducts[index] = { ...memoryProducts[index], ...data }
    response.json({ product: memoryProducts[index] })
  } catch (error) {
    if (error.status) return response.status(error.status).json({ message: error.message })
    next(error)
  }
})

router.delete('/products/:id', async (request, response, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const product = await findProduct(request.params.id)
      if (!product) return response.status(404).json({ message: 'Product not found' })
      await product.deleteOne()
      return response.status(204).end()
    }
    const index = memoryProducts.findIndex((product) => product.slug === request.params.id)
    if (index < 0) return response.status(404).json({ message: 'Product not found' })
    memoryProducts.splice(index, 1)
    response.status(204).end()
  } catch (error) { next(error) }
})

export default router