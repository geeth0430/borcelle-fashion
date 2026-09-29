import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import process from 'node:process'
import dns from 'node:dns'
import { fileURLToPath } from 'node:url'

import routes from './routes.js'
import adminRoutes from './routes/admin.js'
import Product from './models/Product.js'
import { seedProducts } from './data/products.js'

const app = express()

dns.setServers(['1.1.1.1', '8.8.8.8'])

const port = Number(process.env.PORT || 5000)
const imageDirectory = fileURLToPath(new URL('../client/public/images/', import.meta.url))

app.use(cors())
app.use(express.json({ limit: '32kb' }))
app.use(express.urlencoded({ extended: false, limit: '32kb' }))
app.use('/images', express.static(imageDirectory))

app.use('/api/admin', adminRoutes)
app.use('/api', routes)

app.use((error, _request, response, next) => {
  void next

  console.error(error.message)

  const status =
    error.status ||
    (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)

  response.status(status).json({
    message:
      status < 500
        ? error.message
        : 'The request could not be completed',
  })
})

async function start() {
  const mongoUri = process.env.MONGODB_URI

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
      })

      if (await Product.countDocuments() === 0) {
        await Product.insertMany(seedProducts)
      }

      await Product.bulkWrite(
        seedProducts
          .filter((product) => product.sale)
          .map((product) => ({
            updateOne: {
              filter: {
                slug: product.slug,
                discountPercent: { $exists: false },
              },
              update: {
                $set: {
                  discountPercent: product.discountPercent || 30,
                },
              },
            },
          }))
      )

      await Product.bulkWrite(
        seedProducts.map((product) => ({
          updateOne: {
            filter: {
              slug: product.slug,
              image: { $regex: '^https?://' },
            },
            update: {
              $set: {
                image: product.image,
              },
            },
          },
        }))
      )

      console.log(
        'Connected to MongoDB and synchronized the Borcelle catalog images.'
      )
    } catch (error) {
      console.warn(
        `MongoDB unavailable; using demo data (${error.message}).`
      )
    }
  } else {
    console.warn(
      'MONGODB_URI is not set; using demo data and in-memory carts/accounts.'
    )
  }

  app.listen(port, () => {
    console.log(`Borcelle API listening on http://localhost:${port}`)
  })
}

start()