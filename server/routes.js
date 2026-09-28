import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { Buffer } from 'node:buffer'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import process from 'node:process'
import { OAuth2Client } from 'google-auth-library'

import Cart from './models/Cart.js'
import Newsletter from './models/Newsletter.js'
import Order from './models/Order.js'
import Product from './models/Product.js'
import SiteContent from './models/SiteContent.js'
import User from './models/User.js'
import { memoryProducts } from './data/products.js'
import { getMemorySiteContent } from './data/siteContentStore.js'

const router = Router()

const googleAuthClient = new OAuth2Client()

const memoryCarts = new Map()
const memoryUsers = new Map()
const memoryGoogleUsers = new Map()
const memorySubscribers = new Set()

function connected() {
  return mongoose.connection.readyState === 1
}

function sessionId(request) {
  return String(request.get('x-session-id') || 'guest').slice(0, 100)
}

function publicItem(product, size, quantity) {
  return {
    productId: String(product._id || product.slug),
    name: product.name,
    image: product.image,
    price: product.price,
    size,
    quantity,
  }
}

function filteredProducts(params) {
  let products = memoryProducts

  const category = params.get('category')
  const maxPrice = Number(params.get('maxPrice') || Infinity)
  const search = (params.get('q') || '').toLowerCase()

  const colors = (params.get('colors') || '')
    .split(',')
    .filter(Boolean)
    .map((value) => value.toLowerCase())

  const sizes = (params.get('sizes') || '')
    .split(',')
    .filter(Boolean)

  if (category) {
    products = products.filter(
      (product) =>
        product.category.toLowerCase() === category.toLowerCase(),
    )
  }

  if (params.get('sale') === 'true') {
    products = products.filter((product) => product.sale)
  }

  if (params.get('collection') === 'daily-style') {
    products = products.filter((product) => product.dailyStyle)
  }

  const inStock = params.get('inStock') === 'true'
  const outOfStock = params.get('outOfStock') === 'true'

  if (inStock && !outOfStock) {
    products = products.filter((product) => product.stock > 0)
  }

  if (outOfStock && !inStock) {
    products = products.filter((product) => product.stock === 0)
  }

  if (Number.isFinite(maxPrice)) {
    products = products.filter((product) => product.price <= maxPrice)
  }

  if (colors.length) {
    products = products.filter((product) =>
      colors.includes(product.color.toLowerCase()),
    )
  }

  if (sizes.length) {
    products = products.filter((product) =>
      sizes.some((size) => product.sizes.includes(size)),
    )
  }

  if (search) {
    products = products.filter((product) =>
      `${product.name} ${product.category} ${product.color}`
        .toLowerCase()
        .includes(search),
    )
  }

  return products
}

function serializeCart(items) {
  return items
    .map((item) => {
      const product =
        item.productId && typeof item.productId === 'object'
          ? item.productId
          : memoryProducts.find(
              (entry) => entry.slug === String(item.productId),
            )

      return product
        ? publicItem(product, item.size, item.quantity)
        : null
    })
    .filter(Boolean)
}

function md5(value) {
  return createHash('md5').update(value).digest('hex').toUpperCase()
}

function secureEquals(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function customerToken(email) {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw Object.assign(
      new Error('Authentication is not configured.'),
      { status: 503 },
    )
  }

  return jwt.sign({ email }, secret, { expiresIn: '7d' })
}

/*
 * PayHere configuration
 *
 * APP_URL       = Render backend URL
 * FRONTEND_URL  = Cloudflare Pages URL
 */
function payHereConfig() {
  const merchantId = process.env.PAYHERE_MERCHANT_ID
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET
  const appUrl = process.env.APP_URL
  const frontendUrl = process.env.FRONTEND_URL

  if (!merchantId || !merchantSecret || !appUrl || !frontendUrl) {
    return null
  }

  try {
    const baseUrl = new URL(appUrl)
    const frontendBaseUrl = new URL(frontendUrl)

    if (
      baseUrl.protocol !== 'https:' ||
      frontendBaseUrl.protocol !== 'https:'
    ) {
      return null
    }

    return {
      merchantId,
      merchantSecret,
      baseUrl,
      frontendBaseUrl,
    }
  } catch {
    return null
  }
}

router.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: connected() ? 'connected' : 'demo mode',
  })
})

router.get('/content', async (_request, response, next) => {
  try {
    const saved = connected()
      ? await SiteContent.findOne({ key: 'storefront' })
          .select('content')
          .lean()
      : null

    response.json({
      content: saved?.content || getMemorySiteContent(),
    })
  } catch (error) {
    next(error)
  }
})

router.get('/products', async (request, response, next) => {
  try {
    const query = request.query
    let products

    if (connected()) {
      const filter = {}

      if (query.category) {
        const category = String(query.category).replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )

        filter.category = new RegExp(`^${category}$`, 'i')
      }

      if (query.maxPrice) {
        filter.price = {
          $lte: Number(query.maxPrice),
        }
      }

      if (query.sale === 'true') {
        filter.sale = true
      }

      if (query.collection === 'daily-style') {
        filter.dailyStyle = true
      }

      const inStock = query.inStock === 'true'
      const outOfStock = query.outOfStock === 'true'

      if (inStock && !outOfStock) {
        filter.stock = { $gt: 0 }
      }

      if (outOfStock && !inStock) {
        filter.stock = 0
      }

      if (query.colors) {
        filter.color = {
          $in: String(query.colors)
            .split(',')
            .map(
              (color) =>
                new RegExp(
                  `^${color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
                  'i',
                ),
            ),
        }
      }

      if (query.sizes) {
        filter.sizes = {
          $in: String(query.sizes).split(','),
        }
      }

      if (query.q) {
        const searchValue = String(query.q).replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )

        filter.$or = ['name', 'category', 'color'].map((field) => ({
          [field]: new RegExp(searchValue, 'i'),
        }))
      }

      products = await Product.find(filter)
        .sort({ createdAt: -1 })
        .lean()
    } else {
      products = filteredProducts(new URLSearchParams(query))
    }

    if (query.collection === 'daily-style') {
      products = products.map((product, index) => ({
        ...product,
        image: `/images/DailyStyle${index + 1}.png`,
      }))
    } else if (query.sale === 'true') {
      products = products.map((product, index) => ({
        ...product,
        image: `/images/HotDeals${index + 1}.png`,
      }))
    }

    response.json({ products })
  } catch (error) {
    next(error)
  }
})

router.get('/products/:slug', async (request, response, next) => {
  try {
    const product = connected()
      ? await Product.findOne({
          slug: request.params.slug,
        }).lean()
      : memoryProducts.find(
          (item) => item.slug === request.params.slug,
        )

    if (!product) {
      return response
        .status(404)
        .json({ message: 'Product not found' })
    }

    response.json({ product })
  } catch (error) {
    next(error)
  }
})

router.get('/cart', async (request, response, next) => {
  try {
    const cart = connected()
      ? await Cart.findOne({
          sessionId: sessionId(request),
        })
          .populate('items.productId')
          .lean()
      : memoryCarts.get(sessionId(request)) || []

    response.json({
      items: connected()
        ? serializeCart(cart?.items || [])
        : cart,
    })
  } catch (error) {
    next(error)
  }
})

/*
 * PayHere checkout
 */
router.post('/payments/payhere', async (request, response, next) => {
  try {
    const config = payHereConfig()

    if (!config) {
      return response.status(503).json({
        message:
          'Online payment is temporarily unavailable. Please try again later.',
      })
    }

    if (!connected()) {
      return response.status(503).json({
        message:
          'Online checkout requires the order database to be connected.',
      })
    }

    const customerInput = request.body || {}

    const customer = {
      firstName: String(customerInput.firstName || '').trim(),
      lastName: String(customerInput.lastName || '').trim(),
      email: String(customerInput.email || '')
        .trim()
        .toLowerCase(),
      phone: String(customerInput.phone || '').trim(),
      address: String(customerInput.address || '').trim(),
      city: String(customerInput.city || '').trim(),
      country: 'Sri Lanka',
    }

    if (
      !customer.firstName ||
      !customer.lastName ||
      !/^\S+@\S+\.\S+$/.test(customer.email) ||
      !/^(?:0\d{9}|\+94\d{9})$/.test(customer.phone) ||
      !customer.address ||
      !customer.city ||
      Object.values(customer).some(
        (value) => value.length > 120,
      )
    ) {
      return response.status(400).json({
        message: 'Enter valid Sri Lankan checkout details.',
      })
    }

    const cart = await Cart.findOne({
      sessionId: sessionId(request),
    })
      .populate('items.productId')
      .lean()

    const items = serializeCart(cart?.items || [])

    if (!items.length) {
      return response.status(400).json({
        message: 'Your bag is empty.',
      })
    }

    const orderItems = items.map((item) => ({
      productId: item.productId,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      unitPrice: Number(item.price),
    }))

    const amount = orderItems.reduce(
      (sum, item) =>
        sum + item.unitPrice * item.quantity,
      0,
    )

    if (amount <= 0) {
      return response.status(400).json({
        message: 'Your bag total is invalid.',
      })
    }

    const formattedAmount = amount.toFixed(2)
    const orderId = randomUUID()

    await Order.create({
      orderId,
      sessionId: sessionId(request),
      items: orderItems,
      amount,
      currency: 'LKR',
      customer,
    })

    /*
     * Customer returns to Cloudflare frontend.
     */
    const returnUrl = new URL(
      '/',
      config.frontendBaseUrl,
    )

    returnUrl.searchParams.set(
      'payment',
      orderId,
    )

    /*
     * Customer cancellation also returns to frontend.
     */
    const cancelUrl = new URL(
      '/',
      config.frontendBaseUrl,
    )

    cancelUrl.searchParams.set(
      'payment',
      orderId,
    )

    /*
     * PayHere server notification goes to Render backend.
     */
    const notifyUrl = new URL(
      '/api/payments/payhere/notify',
      config.baseUrl,
    )

    /*
     * PayHere checkout hash.
     */
    const hash = md5(
      config.merchantId +
        orderId +
        formattedAmount +
        'LKR' +
        md5(config.merchantSecret),
    )

    /*
     * Sandbox is the default unless explicitly set to false.
     */
    const sandbox =
      process.env.PAYHERE_SANDBOX !== 'false'

    response.json({
      checkoutUrl: sandbox
        ? 'https://sandbox.payhere.lk/pay/checkout'
        : 'https://www.payhere.lk/pay/checkout',

      fields: {
        merchant_id: config.merchantId,

        return_url: returnUrl.toString(),

        cancel_url: cancelUrl.toString(),

        notify_url: notifyUrl.toString(),

        first_name: customer.firstName,

        last_name: customer.lastName,

        email: customer.email,

        phone: customer.phone,

        address: customer.address,

        city: customer.city,

        country: 'Sri Lanka',

        order_id: orderId,

        items: orderItems
          .map(
            (item) =>
              `${item.name} (${item.size}) x ${item.quantity}`,
          )
          .join(', ')
          .slice(0, 500),

        currency: 'LKR',

        amount: formattedAmount,

        hash,
      },
    })
  } catch (error) {
    next(error)
  }
})

/*
 * PayHere payment notification
 */
router.post(
  '/payments/payhere/notify',
  async (request, response, next) => {
    try {
      const config = payHereConfig()

      if (!config) {
        return response.sendStatus(503)
      }

      const {
        merchant_id: merchantId,
        order_id: orderId,
        payhere_amount: amount,
        payhere_currency: currency,
        status_code: statusCode,
        md5sig,
        payment_id: paymentId,
        method,
      } = request.body || {}

      const signature = md5(
        String(merchantId) +
          String(orderId) +
          String(amount) +
          String(currency) +
          String(statusCode) +
          md5(config.merchantSecret),
      )

      if (
        merchantId !== config.merchantId ||
        !md5sig ||
        !secureEquals(
          signature,
          String(md5sig).toUpperCase(),
        )
      ) {
        return response.sendStatus(400)
      }

      const order = await Order.findOne({
        orderId,
      })

      if (
        !order ||
        currency !== order.currency ||
        Number(amount).toFixed(2) !==
          order.amount.toFixed(2)
      ) {
        return response.sendStatus(400)
      }

      const statuses = {
        '2': 'paid',
        '0': 'pending',
        '-1': 'cancelled',
        '-2': 'failed',
        '-3': 'charged_back',
      }

      const nextStatus =
        statuses[String(statusCode)]

      if (!nextStatus) {
        return response.sendStatus(400)
      }

      const allowedTransitions = {
        pending: [
          'pending',
          'paid',
          'cancelled',
          'failed',
        ],

        paid: [
          'paid',
          'charged_back',
        ],

        cancelled: [
          'cancelled',
          'paid',
        ],

        failed: [
          'failed',
          'paid',
        ],

        charged_back: [
          'charged_back',
        ],
      }

      if (
        !allowedTransitions[order.status]?.includes(
          nextStatus,
        )
      ) {
        return response.sendStatus(200)
      }

      if (order.status !== nextStatus) {
        order.status = nextStatus
        order.paymentId = String(
          paymentId || '',
        )
        order.paymentMethod = String(
          method || '',
        )

        await order.save()
      }

      response.sendStatus(200)
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/payments/payhere/orders',
  async (request, response, next) => {
    try {
      const orders = await Order.find({
        sessionId: sessionId(request),
      })
        .sort({ createdAt: -1 })
        .select(
          'orderId status amount currency items createdAt',
        )
        .lean()

      response.json({ orders })
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/payments/payhere/orders/:orderId',
  async (request, response, next) => {
    try {
      const order = await Order.findOne({
        orderId: request.params.orderId,
        sessionId: sessionId(request),
      })
        .select(
          'orderId status amount currency items createdAt paymentMethod',
        )
        .lean()

      if (!order) {
        return response.status(404).json({
          message: 'Payment order not found.',
        })
      }

      response.json(order)
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/cart/items',
  async (request, response, next) => {
    try {
      const {
        productId,
        size,
        quantity = 1,
      } = request.body

      const product = connected()
        ? mongoose.isValidObjectId(productId)
          ? await Product.findById(productId)
          : await Product.findOne({
              slug: productId,
            })
        : memoryProducts.find(
            (item) => item.slug === productId,
          )

      if (!product) {
        return response.status(404).json({
          message: 'Product not found',
        })
      }

      if (
        !size ||
        !product.sizes.includes(size)
      ) {
        return response.status(400).json({
          message: 'Choose an available size',
        })
      }

      if (product.stock < 1) {
        return response.status(409).json({
          message: 'This style is out of stock',
        })
      }

      const count = Math.max(
        1,
        Math.min(10, Number(quantity) || 1),
      )

      if (connected()) {
        let cart = await Cart.findOne({
          sessionId: sessionId(request),
        })

        if (!cart) {
          cart = new Cart({
            sessionId: sessionId(request),
            items: [],
          })
        }

        const match = cart.items.find(
          (item) =>
            String(item.productId) ===
              String(product._id) &&
            item.size === size,
        )

        if (match) {
          match.quantity = Math.min(
            10,
            match.quantity + count,
          )
        } else {
          cart.items.push({
            productId: product._id,
            size,
            quantity: count,
          })
        }

        await cart.save()
        await cart.populate('items.productId')

        return response.json({
          items: serializeCart(cart.items),
        })
      }

      const items =
        memoryCarts.get(sessionId(request)) || []

      const match = items.find(
        (item) =>
          item.productId === product.slug &&
          item.size === size,
      )

      if (match) {
        match.quantity = Math.min(
          10,
          match.quantity + count,
        )
      } else {
        items.push(
          publicItem(product, size, count),
        )
      }

      memoryCarts.set(
        sessionId(request),
        items,
      )

      response.json({ items })
    } catch (error) {
      next(error)
    }
  },
)

router.patch(
  '/cart/items/:productId',
  async (request, response, next) => {
    try {
      const {
        size,
        quantity,
      } = request.body

      const count = Math.max(
        1,
        Math.min(10, Number(quantity) || 1),
      )

      if (connected()) {
        const cart = await Cart.findOne({
          sessionId: sessionId(request),
        })

        if (!cart) {
          return response.json({
            items: [],
          })
        }

        const item = cart.items.find(
          (entry) =>
            String(entry.productId) ===
              request.params.productId &&
            entry.size === size,
        )

        if (item) {
          item.quantity = count
        }

        await cart.save()
        await cart.populate('items.productId')

        return response.json({
          items: serializeCart(cart.items),
        })
      }

      const items =
        memoryCarts.get(sessionId(request)) || []

      const item = items.find(
        (entry) =>
          entry.productId ===
            request.params.productId &&
          entry.size === size,
      )

      if (item) {
        item.quantity = count
      }

      response.json({ items })
    } catch (error) {
      next(error)
    }
  },
)

router.delete(
  '/cart/items/:productId',
  async (request, response, next) => {
    try {
      const size = String(
        request.query.size || '',
      )

      if (connected()) {
        const cart = await Cart.findOne({
          sessionId: sessionId(request),
        })

        if (!cart) {
          return response.json({
            items: [],
          })
        }

        cart.items = cart.items.filter(
          (item) =>
            !(
              String(item.productId) ===
                request.params.productId &&
              item.size === size
            ),
        )

        await cart.save()
        await cart.populate('items.productId')

        return response.json({
          items: serializeCart(cart.items),
        })
      }

      const items = (
        memoryCarts.get(
          sessionId(request),
        ) || []
      ).filter(
        (item) =>
          !(
            item.productId ===
              request.params.productId &&
            item.size === size
          ),
      )

      memoryCarts.set(
        sessionId(request),
        items,
      )

      response.json({ items })
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/newsletter',
  async (request, response, next) => {
    try {
      const email = String(
        request.body.email || '',
      )
        .trim()
        .toLowerCase()

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return response.status(400).json({
          message:
            'Enter a valid email address',
        })
      }

      if (connected()) {
        await Newsletter.updateOne(
          { email },
          {
            $setOnInsert: { email },
          },
          { upsert: true },
        )
      } else {
        memorySubscribers.add(email)
      }

      response.status(201).json({
        message: 'Subscription saved',
      })
    } catch (error) {
      if (error.code === 11000) {
        return response.status(200).json({
          message:
            'You are already subscribed',
        })
      }

      next(error)
    }
  },
)

router.post(
  '/auth/google',
  async (request, response, next) => {
    try {
      const clientId =
        process.env.GOOGLE_CLIENT_ID

      if (!clientId) {
        return response.status(503).json({
          message:
            'Google sign-in is not configured.',
        })
      }

      if (!process.env.JWT_SECRET) {
        return response.status(503).json({
          message:
            'Authentication is not configured.',
        })
      }

      const credential = String(
        request.body.credential || '',
      )

      if (
        !credential ||
        credential.length > 8192
      ) {
        return response.status(400).json({
          message:
            'A valid Google credential is required.',
        })
      }

      let ticket

      try {
        ticket =
          await googleAuthClient.verifyIdToken({
            idToken: credential,
            audience: clientId,
          })
      } catch {
        return response.status(401).json({
          message:
            'Google sign-in could not be verified.',
        })
      }

      const payload = ticket.getPayload()

      if (
        !payload?.sub ||
        !payload.email ||
        payload.email_verified !== true
      ) {
        return response.status(401).json({
          message:
            'Google must verify your email address.',
        })
      }

      let email =
        payload.email.toLowerCase()

      const name = String(
        payload.name || '',
      )
        .trim()
        .slice(0, 120)

      if (connected()) {
        let user =
          await User.findOne({
            googleId: payload.sub,
          })

        if (user) {
          email = user.email

          if (!user.name && name) {
            user.name = name
            await user.save()
          }
        } else {
          user =
            await User.findOne({
              email,
            })

          if (
            user?.googleId &&
            user.googleId !== payload.sub
          ) {
            return response.status(409).json({
              message:
                'This email is linked to a different Google account.',
            })
          }

          if (user) {
            user.googleId = payload.sub

            if (!user.name && name) {
              user.name = name
            }
          } else {
            user = new User({
              name,
              email,
              googleId: payload.sub,
            })
          }

          await user.save()
        }
      } else {
        const linkedEmail = [
          ...memoryGoogleUsers,
        ].find(
          ([, googleId]) =>
            googleId === payload.sub,
        )?.[0]

        if (linkedEmail) {
          email = linkedEmail
        } else {
          const linkedGoogleId =
            memoryGoogleUsers.get(email)

          if (
            linkedGoogleId &&
            linkedGoogleId !== payload.sub
          ) {
            return response.status(409).json({
              message:
                'This email is linked to a different Google account.',
            })
          }

          memoryGoogleUsers.set(
            email,
            payload.sub,
          )

          if (!memoryUsers.has(email)) {
            memoryUsers.set(email, null)
          }
        }
      }

      response.json({
        token: customerToken(email),
        email,
        name,
      })
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/auth/register',
  async (request, response, next) => {
    try {
      const email = String(
        request.body.email || '',
      )
        .trim()
        .toLowerCase()

      const password = String(
        request.body.password || '',
      )

      if (
        !/^\S+@\S+\.\S+$/.test(email) ||
        password.length < 8
      ) {
        return response.status(400).json({
          message:
            'Use a valid email and a password of at least 8 characters',
        })
      }

      const token = customerToken(email)

      if (
        connected() &&
        (await User.exists({ email }))
      ) {
        return response.status(409).json({
          message:
            'An account already uses this email',
        })
      }

      if (
        !connected() &&
        memoryUsers.has(email)
      ) {
        return response.status(409).json({
          message:
            'An account already uses this email',
        })
      }

      const passwordHash =
        await bcrypt.hash(password, 12)

      if (connected()) {
        await User.create({
          email,
          passwordHash,
        })
      } else {
        memoryUsers.set(
          email,
          passwordHash,
        )
      }

      response.status(201).json({
        token,
        email,
      })
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/auth/login',
  async (request, response, next) => {
    try {
      const email = String(
        request.body.email || '',
      )
        .trim()
        .toLowerCase()

      const password = String(
        request.body.password || '',
      )

      const user = connected()
        ? await User.findOne({ email }).lean()
        : null

      const passwordHash =
        user?.passwordHash ||
        memoryUsers.get(email)

      if (
        !passwordHash ||
        !(await bcrypt.compare(
          password,
          passwordHash,
        ))
      ) {
        return response.status(401).json({
          message:
            'Email or password is incorrect',
        })
      }

      const token = customerToken(email)

      response.json({
        token,
        email,
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router