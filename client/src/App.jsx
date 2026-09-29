import { useEffect, useMemo, useState } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import {
  ArrowLeft, ArrowRight, Box, Camera, Check, ChevronDown, Heart,
  Menu, Search, ShoppingBag, UserRound, X,
} from 'lucide-react'
import defaultSiteContent from '../siteContent.js'
import './App.css'

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function productImageUrl(image) {
  return image?.startsWith('/images/') ? `${API_BASE_URL}${image}` : image
}

const clothingLinks = [
  { label: 'Dresses', category: 'Dresses' },
  { label: 'Tops', category: 'Tops' },
  { label: 'Shirts', category: 'Tops' },
  { label: 'Blazers & Jackets', category: 'Blazers' },
  { label: 'T-Shirts', category: 'T-Shirts' },
  { label: 'Jumpsuits & Rompers', category: 'Jumpsuits' },
  { label: 'Skirts', category: 'Skirts' },
  { label: 'Jeans', category: 'Jeans' },
  { label: 'Shorts', category: 'Shorts' },
  { label: 'Blazers & Pants', category: 'Blazers' },
]

const collectionLinks = [
  { label: 'Work Wear', category: 'Blazers' },
  { label: 'Everyday Edits', mode: 'daily-style' },
  { label: 'Cotton', category: 'Tops' },
  { label: 'Tshirts', category: 'T-Shirts' },
  { label: 'Party Wear', category: 'Dresses' },
  { label: 'Linen', category: 'Jumpsuits' },
  { label: 'Denims', category: 'Jeans' },
]

const swatches = [
  { name: 'Pink', hex: '#e6a4d9' },
  { name: 'Blue', hex: '#3921e8' },
  { name: 'Green', hex: '#178e36' },
  { name: 'Orange', hex: '#e85a27' },
  { name: 'White', hex: '#f4f3ef' },
  { name: 'Red', hex: '#8b171f' },
  { name: 'Black', hex: '#171717' },
]

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function productKey(product) {
  return String(product?._id || product?.slug || '')
}

function getSessionId() {
  let id = localStorage.getItem('borcelle-session')

  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('borcelle-session', id)
  }

  return id
}

function App() {
  const [location, setLocation] = useState(
    () => new URLSearchParams(window.location.search)
  )

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    colors: [],
    sizes: [],
    availability: [],
    maxPrice: 15000,
    search: '',
  })

  const [activeTab, setActiveTab] = useState(
    () =>
      new URLSearchParams(window.location.search).get('mode') === 'deals'
        ? 'Hot deals'
        : 'New in'
  )

  const [drawer, setDrawer] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cart, setCart] = useState([])
  const [customerAuthenticated, setCustomerAuthenticated] = useState(
    () => Boolean(localStorage.getItem('borcelle-token'))
  )
  const [customerEmail, setCustomerEmail] = useState(
    () => localStorage.getItem('borcelle-email') || ''
  )

  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('borcelle-wishlist') || '[]'
      )

      return Array.isArray(saved)
        ? saved.filter((product) => productKey(product))
        : []
    } catch {
      return []
    }
  })

  const [cartCount, setCartCount] = useState(0)
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const [paymentOrder, setPaymentOrder] = useState(null)
  const [storeContent, setStoreContent] = useState(defaultSiteContent)

  const category = location.get('category') || ''
  const mode = location.get('mode') || ''
  const pageContent = storeContent.pages[mode]
  const heroSlides = storeContent.heroSlides
  const paymentOrderId = location.get('payment')

  const currentPaymentOrder =
    paymentOrder?.trackedOrderId === paymentOrderId
      ? paymentOrder
      : null

  const paymentOrderLoading = Boolean(
    paymentOrderId && !currentPaymentOrder
  )

  const isCatalog =
    Boolean(category) ||
    ['size', 'collections', 'daily-style', 'party-shop', 'workwear'].includes(
      mode
    )

  const hero = heroSlides[heroIndex] || heroSlides[0]

  useEffect(() => {
    localStorage.setItem(
      'borcelle-wishlist',
      JSON.stringify(wishlist)
    )
  }, [wishlist])

  useEffect(() => {
    const handlePop = () =>
      setLocation(new URLSearchParams(window.location.search))

    window.addEventListener('popstate', handlePop)

    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Load website content
  useEffect(() => {
    let active = true

    fetch(`${API_BASE_URL}/api/content`)
      .then((response) =>
        response.ok
          ? response.json()
          : Promise.reject(new Error('Store content unavailable'))
      )
      .then((data) => {
        if (active && data.content) {
          setStoreContent(data.content)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    document.title = `${storeContent.brand.name} | Fashion Store`
  }, [storeContent.brand.name])

  // Load products
  useEffect(() => {
    const params = new URLSearchParams()

    if (category) {
      params.set('category', category)
    }

    if (mode === 'deals' || activeTab === 'Hot deals') {
      params.set('sale', 'true')
    }

    if (mode === 'daily-style' || activeTab === 'Daily style') {
      params.set('collection', 'daily-style')
    }

    if (filters.maxPrice < 15000) {
      params.set('maxPrice', String(filters.maxPrice))
    }

    if (filters.availability.includes('inStock')) {
      params.set('inStock', 'true')
    }

    if (filters.availability.includes('outOfStock')) {
      params.set('outOfStock', 'true')
    }

    if (filters.sizes.length) {
      params.set('sizes', filters.sizes.join(','))
    }

    if (filters.colors.length) {
      params.set('colors', filters.colors.join(','))
    }

    if (filters.search.trim()) {
      params.set('q', filters.search.trim())
    }

    const controller = new AbortController()
    let active = true

    const timer = window.setTimeout(() => {
      setLoading(true)

      fetch(`${API_BASE_URL}/api/products?${params}`, {
        signal: controller.signal,
      })
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(new Error('Catalog unavailable'))
        )
        .then((data) => {
          if (active) {
            setProducts(data.products || [])
          }
        })
        .catch((error) => {
          if (active && error.name !== 'AbortError') {
            setProducts([])
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false)
          }
        })
    }, 120)

    return () => {
      active = false
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [category, mode, activeTab, filters])

  // Load cart
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/cart`, {
      headers: {
        'x-session-id': getSessionId(),
      },
    })
      .then((response) =>
        response.ok ? response.json() : null
      )
      .then((data) => {
        if (data?.items) {
          setCart(data.items)

          setCartCount(
            data.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            )
          )
        }
      })
      .catch(() => {})
  }, [])

  // Track PayHere order
  useEffect(() => {
    const orderId = paymentOrderId

    if (!orderId) return

    let active = true
    let refreshTimer

    function loadOrder() {
      fetch(
        `${API_BASE_URL}/api/payments/payhere/orders/${encodeURIComponent(
          orderId
        )}`,
        {
          headers: {
            'x-session-id': getSessionId(),
          },
        }
      )
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(
                new Error('Payment status unavailable')
              )
        )
        .then((data) => {
          if (!active) return

          setPaymentOrder({
            ...data,
            trackedOrderId: orderId,
          })

          if (data.status === 'pending') {
            refreshTimer = window.setTimeout(loadOrder, 3000)
          }
        })
        .catch(() => {
          if (active) {
            setPaymentOrder({
              trackedOrderId: orderId,
              unavailable: true,
            })
          }
        })
    }

    loadOrder()

    return () => {
      active = false
      window.clearTimeout(refreshTimer)
    }
  }, [paymentOrderId])

  const title =
    mode === 'deals' &&
    (!pageContent?.title || pageContent.title === 'SALE')
      ? 'HOT DEALS'
      : pageContent?.title ||
        (category
          ? category.toUpperCase()
          : mode === 'size'
            ? 'SHOP BY SIZE'
            : mode === 'daily-style'
              ? 'EVERYDAY EDITS'
              : mode === 'collections'
                ? 'COLLECTIONS'
                : 'NEW ARRIVALS')

  const sortedProducts = useMemo(
    () => products,
    [products]
  )

  function navigate(nextCategory = '', nextMode = '') {
    const params = new URLSearchParams()

    if (nextCategory) {
      params.set('category', nextCategory)
    }

    if (nextMode) {
      params.set('mode', nextMode)
    }

    const url = params.size
      ? `?${params}`
      : window.location.pathname

    window.history.pushState({}, '', url)

    setLocation(new URLSearchParams(params))

    setMobileMenu(false)

    setActiveTab(
      nextMode === 'deals'
        ? 'Hot deals'
        : 'New in'
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function trackOrder(orderId) {
    const params = new URLSearchParams({
      payment: orderId,
    })

    window.history.pushState(
      {},
      '',
      `?${params}`
    )

    setLocation(params)
    setDrawer('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function toggleFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter(
            (item) => item !== value
          )
        : [...current[key], value],
    }))
  }

  function toggleWishlist(product) {
    const key = productKey(product)

    const saved = wishlist.some(
      (item) => productKey(item) === key
    )

    setWishlist((current) =>
      saved
        ? current.filter(
            (item) => productKey(item) !== key
          )
        : [...current, product]
    )

    setNotice(
      saved
        ? 'Removed from wishlist'
        : 'Saved to wishlist'
    )

    window.setTimeout(
      () => setNotice(''),
      2200
    )
  }

  function removeFromWishlist(product) {
    setWishlist((current) =>
      current.filter(
        (item) =>
          productKey(item) !== productKey(product)
      )
    )
  }

  async function addToCart(
    product,
    size = product.sizes?.[0] || 'M'
  ) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/cart/items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': getSessionId(),
          },
          body: JSON.stringify({
            productId:
              product._id || product.slug,
            size,
            quantity: 1,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Could not add this item.'
        )
      }

      setCart(data.items || [])

      setCartCount(
        (data.items || []).reduce(
          (sum, item) => sum + item.quantity,
          0
        )
      )

      setSelectedProduct(null)

      setNotice('Added to your bag')

      window.setTimeout(
        () => setNotice(''),
        2200
      )
    } catch {
      setNotice(
        'Your bag is unavailable right now'
      )

      window.setTimeout(
        () => setNotice(''),
        2400
      )
    }
  }

  async function subscribe(event) {
    event.preventDefault()

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/newsletter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setNotice('Thank you for subscribing')
      setEmail('')
    } catch {
      setNotice(
        'Please enter a valid email address'
      )
    }

    window.setTimeout(
      () => setNotice(''),
      2600
    )
  }

  function acceptCustomerSession(data) {
    localStorage.setItem(
      'borcelle-token',
      data.token
    )

    localStorage.setItem(
      'borcelle-email',
      data.email
    )

    setCustomerEmail(data.email)
    setCustomerAuthenticated(true)

    setNotice('Welcome to Borcelle')
    setDrawer('')
  }

  function logoutCustomer() {
    googleLogout()

    localStorage.removeItem(
      'borcelle-token'
    )

    localStorage.removeItem(
      'borcelle-email'
    )

    setCustomerEmail('')
    setCustomerAuthenticated(false)
    setDrawer('')

    setNotice('You have been signed out')

    window.setTimeout(
      () => setNotice(''),
      2200
    )
  }

  async function submitGoogleCredential(
    credential
  ) {
    if (!credential) {
      setNotice(
        'Google did not return a sign-in credential. Please try again.'
      )

      return
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/google`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            credential,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Google sign-in failed.'
        )
      }

      acceptCustomerSession(data)
    } catch (error) {
      setNotice(
        error instanceof TypeError
          ? 'Unable to reach the sign-in service. Check your connection and try again.'
          : error.message ||
            'Google sign-in failed.'
      )

      window.setTimeout(
        () => setNotice(''),
        3000
      )
    }
  }

  async function submitAccount(event) {
    event.preventDefault()

    const form = new FormData(
      event.currentTarget
    )

    const path =
      form.get('accountMode') === 'register'
        ? '/api/auth/register'
        : '/api/auth/login'

    try {
      const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: form.get('email'),
            password: form.get('password'),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      acceptCustomerSession(data)
    } catch (error) {
      setNotice(
        error.message || 'Unable to sign in'
      )
    }

    window.setTimeout(
      () => setNotice(''),
      2600
    )
  }

  async function updateCart(
    productId,
    size,
    quantity
  ) {
    try {
      const response =
        quantity === 0
          ? await fetch(
              `${API_BASE_URL}/api/cart/items/${productId}?size=${size}`,
              {
                method: 'DELETE',
                headers: {
                  'x-session-id':
                    getSessionId(),
                },
              }
            )
          : await fetch(
              `${API_BASE_URL}/api/cart/items/${productId}`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type':
                    'application/json',
                  'x-session-id':
                    getSessionId(),
                },
                body: JSON.stringify({
                  size,
                  quantity,
                }),
              }
            )

      const data = await response.json()

      setCart(data.items || [])

      setCartCount(
        (data.items || []).reduce(
          (sum, item) => sum + item.quantity,
          0
        )
      )
    } catch {
      setNotice('Bag update failed')
    }
  }

  async function beginCheckout(customer) {
    const response = await fetch(
      `${API_BASE_URL}/api/payments/payhere`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': getSessionId(),
        },
        body: JSON.stringify(customer),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(
        data.message ||
          'Could not start checkout.'
      )
    }

    const form =
      document.createElement('form')

    form.method = 'POST'
    form.action = data.checkoutUrl

    Object.entries(data.fields).forEach(
      ([name, value]) => {
        const input =
          document.createElement('input')

        input.type = 'hidden'
        input.name = name
        input.value = value

        form.append(input)
      }
    )

    document.body.append(form)
    form.submit()
  }

  return (
    <>
      <header className="site-header">
        <div className="announcement">
          {storeContent.announcement}
        </div>

        <div className="utility-bar">
          <button
            className="icon-button mobile-menu-toggle"
            aria-label="Open navigation"
            onClick={() =>
              setMobileMenu(!mobileMenu)
            }
          >
            <Menu size={20} />
          </button>

          <button
            className="brand"
            onClick={() => navigate()}
            aria-label={`${storeContent.brand.name} home`}
          >
            <span>
              {storeContent.brand.name}
            </span>

            <small>
              {storeContent.brand.descriptor}
            </small>
          </button>

          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault()
              navigate()
            }}
          >
            <input
              aria-label="Search products"
              placeholder="Type here......"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search:
                    event.target.value,
                }))
              }
            />

            <button aria-label="Search">
              <Search size={17} />
            </button>
          </form>

          <button className="currency">
            LKR
          </button>

          <button
            className="icon-button"
            aria-label="Shopping bag"
            onClick={() =>
              setDrawer('cart')
            }
          >
            <ShoppingBag size={22} />
            <span className="cart-count">
              ({cartCount})
            </span>
          </button>

          <button
            className="icon-button wishlist-header-button"
            aria-label={`Wishlist, ${wishlist.length} saved`}
            onClick={() =>
              setDrawer('wishlist')
            }
          >
            <Heart
              size={21}
              fill={
                wishlist.length
                  ? 'currentColor'
                  : 'none'
              }
            />

            <span className="cart-count">
              ({wishlist.length})
            </span>
          </button>

          <button
            className="icon-button optional-icon"
            aria-label="Orders"
            onClick={() =>
              setDrawer('orders')
            }
          >
            <Box size={22} />
          </button>

          <button
            className="icon-button"
            aria-label="My profile"
            onClick={() =>
              setDrawer('profile')
            }
          >
            <UserRound size={21} />
          </button>
        </div>

        <nav
          className={`main-nav ${
            mobileMenu ? 'nav-open' : ''
          }`}
          aria-label="Main navigation"
        >
          <div className="nav-item">
            <button
              onClick={() =>
                navigate('Tops')
              }
            >
              {storeContent.navigation.clothing}
              <ChevronDown size={13} />
            </button>

            <div className="nav-dropdown">
              {clothingLinks.map(
                (item, index) => (
                  <button
                    key={`${item.category}-${index}`}
                    onClick={() =>
                      navigate(
                        item.category
                      )
                    }
                  >
                    {storeContent.navigation
                      .clothingItems[
                      index
                    ] ||
                      item.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="nav-item">
            <button
              type="button"
              aria-haspopup="true"
            >
              {
                storeContent.navigation
                  .collections
              }
              <ChevronDown size={13} />
            </button>

            <div className="nav-dropdown">
              {collectionLinks.map(
                (item, index) => (
                  <button
                    key={`${item.label}-${index}`}
                    onClick={() =>
                      navigate(
                        item.category || '',
                        item.mode || ''
                      )
                    }
                  >
                    {storeContent.navigation
                      .collectionItems[
                      index
                    ] ||
                      item.label}
                  </button>
                )
              )}
            </div>
          </div>

          <button
            onClick={() => navigate()}
          >
            {
              storeContent.navigation
                .newArrivals
            }
          </button>

          <button
            onClick={() =>
              navigate(
                'Dresses',
                'party-shop'
              )
            }
          >
            {
              storeContent.navigation
                .partyShop
            }
          </button>

          <button
            onClick={() =>
              navigate(
                'Blazers',
                'workwear'
              )
            }
          >
            {
              storeContent.navigation
                .workwear
            }
          </button>

          <button
            onClick={() =>
              navigate(
                '',
                'gift-card'
              )
            }
          >
            {
              storeContent.navigation
                .giftCard
            }
          </button>

          <button
            onClick={() =>
              navigate('', 'deals')
            }
          >
            {storeContent.navigation.sale}
          </button>

          <div className="nav-item">
            <button
              onClick={() =>
                navigate('', 'size')
              }
            >
              {
                storeContent.navigation
                  .shopBySize
              }
              <ChevronDown size={13} />
            </button>

            <div className="nav-dropdown">
              {sizes.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setFilters(
                      (current) => ({
                        ...current,
                        sizes: [item],
                      })
                    )

                    navigate(
                      '',
                      'size'
                    )
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() =>
              navigate(
                '',
                'bestsellers'
              )
            }
          >
            {
              storeContent.navigation
                .bestSellers
            }
          </button>
        </nav>
      </header>

      {paymentOrderId ? (
        <main className="payment-page">
          <section className="payment-result">
            <p className="eyebrow">
              BORCELLE ORDER TRACKING
            </p>

            <h1>
              {paymentOrderLoading
                ? 'Checking payment...'
                : paymentOrder?.unavailable
                  ? 'Payment status unavailable'
                  : paymentOrder?.status ===
                      'paid'
                    ? 'Payment confirmed'
                    : 'Payment status'}
            </h1>

            <p className="payment-order-id">
              Order {paymentOrderId}
            </p>

            {currentPaymentOrder
              ?.items?.length > 0 && (
              <div className="payment-order-items">
                {currentPaymentOrder.items.map(
                  (item, index) => (
                    <p
                      key={`${item.productId}-${item.size}-${index}`}
                    >
                      {item.name} ·{' '}
                      {item.size} ×{' '}
                      {item.quantity}
                    </p>
                  )
                )}
              </div>
            )}

            {currentPaymentOrder &&
              !currentPaymentOrder.unavailable && (
                <div className="payment-order-total">
                  <span>
                    {currentPaymentOrder.status
                      .replace(
                        '_',
                        ' '
                      )
                      .toUpperCase()}
                  </span>

                  <strong>
                    Rs.{' '}
                    {Number(
                      currentPaymentOrder.amount
                    ).toLocaleString(
                      'en-LK'
                    )}
                  </strong>
                </div>
              )}

            <p className="payment-result-note">
              {currentPaymentOrder
                ?.unavailable
                ? 'We could not find this order for this browser. Check My Orders or contact the store.'
                : currentPaymentOrder?.status ===
                    'paid'
                  ? 'Your payment has been verified.'
                  : 'Payment updates appear here after the gateway confirms your transaction.'}
            </p>

            <button
              className="drawer-action"
              onClick={() =>
                setDrawer('orders')
              }
            >
              TRACK MY ORDERS
            </button>

            <button
              className="continue-shopping"
              onClick={() => navigate()}
            >
              CONTINUE SHOPPING
            </button>
          </section>
        </main>
      ) : mode === 'gift-card' ? (
        <main className="gift-card-page">
          <p className="eyebrow">
            {storeContent.pages.giftCard.eyebrow}
          </p>

          <h1>
            {storeContent.pages.giftCard.title}
          </h1>

          <figure className="collection-intro gift-card-intro">
            <img
              src={
                storeContent.pages.giftCard
                  .image
              }
              alt={
                storeContent.pages.giftCard
                  .alt
              }
            />

            <figcaption>
              <strong>
                {
                  storeContent.pages
                    .giftCard.caption
                }
              </strong>
              <br />
              {
                storeContent.pages
                  .giftCard.description
              }
            </figcaption>
          </figure>

          <button
            className="dark-cta"
            onClick={() => navigate()}
          >
            {
              storeContent.pages.giftCard
                .action
            }
            <ArrowRight size={16} />
          </button>
        </main>
      ) : isCatalog ? (
        <main className="catalog-layout">
          <aside
            className="filters"
            aria-label="Product filters"
          >
            <FilterSection title="Color">
              <div className="swatches">
                {swatches.map((item) => {
                  const selected =
                    filters.colors.includes(
                      item.name
                    )

                  return (
                    <button
                      key={item.name}
                      type="button"
                      className={`swatch ${
                        selected
                          ? 'selected'
                          : ''
                      }`}
                      aria-label={
                        item.name
                      }
                      aria-pressed={
                        selected
                      }
                      title={item.name}
                      style={{
                        background:
                          item.hex,
                      }}
                      onClick={() =>
                        toggleFilter(
                          'colors',
                          item.name
                        )
                      }
                    >
                      {selected && (
                        <span className="swatch-check">
                          <Check
                            size={10}
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {filters.colors.length >
                0 && (
                <p className="filter-selection-count">
                  {filters.colors.length}{' '}
                  {filters.colors
                    .length === 1
                    ? 'color'
                    : 'colors'}{' '}
                  selected
                </p>
              )}
            </FilterSection>

            <FilterSection title="Style Size">
              <div className="size-filter">
                {sizes.map((size) => (
                  <label key={size}>
                    <input
                      type="checkbox"
                      checked={filters.sizes.includes(
                        size
                      )}
                      onChange={() =>
                        toggleFilter(
                          'sizes',
                          size
                        )
                      }
                    />
                    {size}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title="Price">
              <div className="price-labels">
                <span>Rs 0</span>
                <span>
                  Rs {filters.maxPrice}
                </span>
              </div>

              <input
                className="price-range"
                type="range"
                min="0"
                max="15000"
                step="500"
                value={
                  filters.maxPrice
                }
                onChange={(event) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      maxPrice:
                        Number(
                          event.target
                            .value
                        ),
                    })
                  )
                }
                aria-label="Maximum price"
              />
            </FilterSection>

            <FilterSection title="Availability">
              <label className="availability">
                <input
                  type="checkbox"
                  checked={filters.availability.includes(
                    'inStock'
                  )}
                  onChange={() =>
                    toggleFilter(
                      'availability',
                      'inStock'
                    )
                  }
                />
                <span>In stock</span>
              </label>

              <label className="availability">
                <input
                  type="checkbox"
                  checked={filters.availability.includes(
                    'outOfStock'
                  )}
                  onChange={() =>
                    toggleFilter(
                      'availability',
                      'outOfStock'
                    )
                  }
                />
                <span>
                  Out of stock
                </span>
              </label>
            </FilterSection>
          </aside>

          <section className="catalog-content">
            <div className="catalog-heading">
              <button
                className="back-button"
                onClick={() =>
                  navigate()
                }
                aria-label="Back to home"
              >
                <ArrowLeft size={16} />
              </button>

              <span>
                <button
                  className="breadcrumb-home"
                  type="button"
                  onClick={() =>
                    navigate()
                  }
                >
                  Home
                </button>
                &nbsp; / &nbsp;
                {title ||
                  category ||
                  (mode === 'size'
                    ? 'Size'
                    : mode ===
                        'daily-style'
                      ? 'Everyday Edits'
                      : 'Collections')}
              </span>

              <h1>{title}</h1>

              <span className="result-count">
                {sortedProducts.length}{' '}
                styles
              </span>
            </div>

            {pageContent?.description && (
              <figure className="collection-intro">
                <figcaption>
                  {pageContent.description}
                </figcaption>
              </figure>
            )}

            <ProductGrid
              products={sortedProducts}
              loading={loading}
              onSelect={setSelectedProduct}
              showDiscounts={
                mode === 'deals'
              }
            />
          </section>
        </main>
      ) : (
        <main className="home-content">
          <section
            className={`hero-banner ${
              hero.theme
                ? `hero-banner--${hero.theme}`
                : ''
            }`}
          >
            <img
              src={hero.image}
              alt={hero.alt}
            />

            <div className="hero-copy">
              <p>{hero.eyebrow}</p>
              <h1>{hero.title}</h1>
              <h2>{hero.subtitle}</h2>

              <button
                className="dark-cta"
                onClick={() =>
                  navigate(hero.category)
                }
              >
                {hero.action}{' '}
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="hero-dots">
              <button
                aria-label="Previous slide"
                onClick={() =>
                  setHeroIndex(
                    (index) =>
                      (index +
                        heroSlides.length -
                        1) %
                      heroSlides.length
                  )
                }
              >
                <ArrowLeft size={14} />
              </button>

              {heroSlides.map(
                (slide, index) => (
                  <button
                    key={slide.title}
                    aria-label={`Show slide ${
                      index + 1
                    }`}
                    aria-current={
                      heroIndex === index
                    }
                    className={`hero-dot ${
                      heroIndex === index
                        ? 'active-dot'
                        : ''
                    }`}
                    onClick={() =>
                      setHeroIndex(index)
                    }
                  />
                )
              )}

              <button
                aria-label="Next slide"
                onClick={() =>
                  setHeroIndex(
                    (index) =>
                      (index + 1) %
                      heroSlides.length
                  )
                }
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </section>

          <section
            className="category-strip"
            aria-label="Shop categories"
          >
            {storeContent.categoryTiles.map(
              (tile) => (
                <button
                  className="category-tile"
                  key={tile.category}
                  onClick={() =>
                    navigate(
                      tile.category
                    )
                  }
                >
                  <img
                    src={tile.image}
                    alt={tile.alt}
                  />
                  <span>
                    {tile.label}
                  </span>
                </button>
              )
            )}
          </section>

          <section className="featured-section">
            <div
              className="collection-tabs"
              role="tablist"
              aria-label="Product collections"
            >
              {[
                'New in',
                'Hot deals',
                'Daily style',
              ].map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={
                    activeTab === tab
                  }
                  className={
                    activeTab === tab
                      ? 'active-tab'
                      : ''
                  }
                  onClick={() => {
                    setActiveTab(tab)

                    if (
                      tab === 'Hot deals'
                    ) {
                      navigate(
                        '',
                        'deals'
                      )
                    } else if (mode) {
                      navigate('', '')
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <ProductGrid
              products={sortedProducts.slice(
                0,
                8
              )}
              loading={loading}
              onSelect={setSelectedProduct}
              home
              showDiscounts={
                activeTab ===
                  'Hot deals' ||
                mode === 'deals'
              }
            />
          </section>

          <section className="promo-banners">
            {storeContent.promotions.map(
              (promotion) => (
                <article
                  className="promo-card"
                  key={promotion.title}
                >
                  <img
                    src={promotion.image}
                    alt={promotion.alt}
                  />

                  <div>
                    <span>
                      {
                        promotion.eyebrow
                      }
                    </span>

                    <h2>
                      {promotion.title}
                    </h2>

                    <p>
                      {
                        promotion.description
                      }
                    </p>

                    <button
                      className="dark-cta"
                      onClick={() =>
                        navigate(
                          promotion.category
                        )
                      }
                    >
                      {promotion.action}
                    </button>
                  </div>
                </article>
              )
            )}
          </section>
        </main>
      )}

      <Footer
        email={email}
        setEmail={setEmail}
        subscribe={subscribe}
        content={storeContent.footer}
        brandName={storeContent.brand.name}
      />

      {drawer && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDrawer('')
            }
          }}
        >
          <aside className="side-drawer">
            <div className="drawer-head">
              <h2>
                {drawer === 'cart'
                  ? 'YOUR BAG'
                  : drawer === 'orders'
                    ? 'MY ORDERS'
                    : drawer ===
                        'wishlist'
                      ? 'WISHLIST'
                      : 'MY PROFILE'}
              </h2>

              <button
                className="icon-button"
                onClick={() =>
                  setDrawer('')
                }
                aria-label="Close panel"
              >
                <X size={19} />
              </button>
            </div>

            {drawer === 'profile' ? (
              customerAuthenticated ? (
                <div className="account-form customer-session">
                  <p>Signed in as</p>

                  <strong>
                    {customerEmail ||
                      'your account'}
                  </strong>

                  <button
                    type="button"
                    className="drawer-action"
                    onClick={
                      logoutCustomer
                    }
                  >
                    LOG OUT
                  </button>
                </div>
              ) : (
                <form
                  className="account-form"
                  onSubmit={
                    submitAccount
                  }
                >
                  {googleClientId ? (
                    <div className="google-signin-button">
                      <GoogleLogin
                        onSuccess={(
                          response
                        ) =>
                          submitGoogleCredential(
                            response.credential
                          )
                        }
                        onError={() => {
                          setNotice(
                            'Google sign-in was cancelled or failed. Please try again.'
                          )

                          window.setTimeout(
                            () =>
                              setNotice(
                                ''
                              ),
                            3000
                          )
                        }}
                        text="continue_with"
                        theme="outline"
                        shape="rectangular"
                        size="large"
                        width={Math.min(
                          window.innerWidth *
                            0.92 -
                            44,
                          326
                        )}
                      />
                    </div>
                  ) : (
                    <p className="google-auth-unavailable">
                      Set
                      VITE_GOOGLE_CLIENT_ID
                      and
                      GOOGLE_CLIENT_ID
                      in .env to
                      enable Google
                      sign-in.
                    </p>
                  )}

                  <div className="auth-or">
                    <span>OR</span>
                  </div>

                  <label>
                    EMAIL*
                    <input
                      type="email"
                      name="email"
                      placeholder="Your Email Address..."
                      required
                    />
                  </label>

                  <label>
                    PASSWORD*
                    <input
                      type="password"
                      name="password"
                      placeholder="••••••••••"
                      minLength="8"
                      required
                    />
                  </label>

                  <button
                    className="drawer-action"
                    type="submit"
                  >
                    LOGIN
                  </button>

                  <div className="auth-separator" />

                  <p>
                    RETURN TO STORE
                  </p>

                  <button
                    type="button"
                    className="text-action"
                    onClick={() =>
                      setNotice(
                        'Password reset is coming soon'
                      )
                    }
                  >
                    Forgot Your Password?
                  </button>

                  <div className="auth-separator" />

                  <label className="signup-toggle">
                    <input
                      type="checkbox"
                      name="accountMode"
                      value="register"
                    />
                    {' '}
                    SIGN UP
                  </label>

                  <button
                    className="drawer-action"
                    type="submit"
                  >
                    Sign Up Now
                  </button>
                </form>
              )
            ) : drawer === 'orders' ? (
              <OrderHistory
                onTrackOrder={
                  trackOrder
                }
              />
            ) : drawer ===
              'wishlist' ? (
              <WishlistPanel
                items={wishlist}
                onRemove={
                  removeFromWishlist
                }
                onAddToBag={
                  addToCart
                }
              />
            ) : (
              <CartPanel
                items={cart}
                onUpdate={updateCart}
                onClose={() =>
                  setDrawer('')
                }
                onCheckout={
                  beginCheckout
                }
              />
            )}
          </aside>
        </div>
      )}

      {selectedProduct && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedProduct(
                null
              )
            }
          }}
        >
          <section
            className="quick-view"
            role="dialog"
            aria-modal="true"
            aria-label={
              selectedProduct.name
            }
          >
            <button
              className="quick-close icon-button"
              onClick={() =>
                setSelectedProduct(
                  null
                )
              }
              aria-label="Close product details"
            >
              <X size={20} />
            </button>

            <img
              src={
                productImageUrl(selectedProduct.image)
              }
              alt={
                selectedProduct.name
              }
            />

            <div className="quick-details">
              <p className="eyebrow">
                BORCELLE FASHION
              </p>

              <h2>
                {selectedProduct.name}
              </h2>

              <p className="quick-price">
                Rs.{' '}
                {Number(
                  selectedProduct.price
                ).toLocaleString(
                  'en-LK'
                )}
              </p>

              <p className="stock-message">
                <Check size={14} /> In Stock
              </p>

              <p>SELECT SIZE</p>

              <div className="quick-sizes">
                {(
                  selectedProduct.sizes ||
                  sizes
                ).map((size) => (
                  <button
                    key={size}
                    onClick={(
                      event
                    ) => {
                      document
                        .querySelectorAll(
                          '.quick-sizes button'
                        )
                        .forEach(
                          (button) =>
                            button.classList.remove(
                              'chosen'
                            )
                        )

                      event.currentTarget.classList.add(
                        'chosen'
                      )
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <button
                className="dark-cta add-button"
                onClick={() =>
                  addToCart(
                    selectedProduct,
                    document.querySelector(
                      '.quick-sizes .chosen'
                    )?.textContent ||
                      selectedProduct
                        .sizes?.[0]
                  )
                }
              >
                ADD TO BAG{' '}
                <ShoppingBag size={16} />
              </button>

              <button
                type="button"
                className={`wishlist-button ${
                  wishlist.some(
                    (item) =>
                      productKey(
                        item
                      ) ===
                      productKey(
                        selectedProduct
                      )
                  )
                    ? 'wishlist-button--saved'
                    : ''
                }`}
                aria-pressed={wishlist.some(
                  (item) =>
                    productKey(
                      item
                    ) ===
                    productKey(
                      selectedProduct
                    )
                )}
                onClick={() =>
                  toggleWishlist(
                    selectedProduct
                  )
                }
              >
                <Heart
                  size={16}
                  fill={
                    wishlist.some(
                      (item) =>
                        productKey(
                          item
                        ) ===
                        productKey(
                          selectedProduct
                        )
                    )
                      ? 'currentColor'
                      : 'none'
                  }
                />

                {wishlist.some(
                  (item) =>
                    productKey(
                      item
                    ) ===
                    productKey(
                      selectedProduct
                    )
                )
                  ? 'SAVED TO WISHLIST'
                  : 'SAVE TO WISHLIST'}
              </button>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <div
          className="toast"
          role="status"
        >
          {notice}
        </div>
      )}
    </>
  )
}

function FilterSection({
  title,
  children,
}) {
  const [open, setOpen] = useState(true)

  const contentId = `filter-options-${title
    .toLowerCase()
    .replaceAll(' ', '-')}`

  return (
    <section className="filter-section">
      <button
        type="button"
        className="filter-heading"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() =>
          setOpen((current) => !current)
        }
      >
        {title}
        <ChevronDown
          size={15}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="filter-options"
          id={contentId}
        >
          {children}
        </div>
      )}
    </section>
  )
}

function WishlistPanel({
  items,
  onRemove,
  onAddToBag,
}) {
  if (!items.length) {
    return (
      <div className="wishlist-empty">
        <Heart size={28} />
        <p>Your wishlist is empty.</p>
      </div>
    )
  }

  return (
    <div className="wishlist-items">
      {items.map((item) => (
        <article
          className="wishlist-item"
          key={productKey(item)}
        >
          <img
            src={item.image}
            alt={item.name}
          />

          <div className="wishlist-item-details">
            <h3>{item.name}</h3>

            <p>
              Rs.{' '}
              {Number(
                item.price
              ).toLocaleString(
                'en-LK'
              )}
            </p>

            <button
              className="drawer-action"
              type="button"
              disabled={item.stock < 1}
              onClick={() =>
                onAddToBag(item)
              }
            >
              {item.stock < 1
                ? 'OUT OF STOCK'
                : 'ADD TO BAG'}
            </button>

            <button
              className="text-action"
              type="button"
              onClick={() =>
                onRemove(item)
              }
            >
              REMOVE
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function ProductGrid({
  products,
  loading,
  onSelect,
  home = false,
  showDiscounts = false,
}) {
  if (loading) {
    return (
      <div
        className="loading-grid"
        aria-label="Loading products"
      >
        <span />
        <span />
        <span />
        <span />
      </div>
    )
  }

  if (!products.length) {
    return (
      <div className="empty-state">
        <p>
          No styles match these
          filters.
        </p>

        <button
          onClick={() =>
            window.location.reload()
          }
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div
      className={`product-grid ${
        home
          ? 'home-product-grid'
          : ''
      }`}
    >
      {products.map((product) => (
        <button
          className="product-card"
          key={
            product._id ||
            product.slug
          }
          onClick={() =>
            onSelect(product)
          }
        >
          <span className="product-image-wrap">
            <img
              className="product-image"
              src={productImageUrl(product.image)}
              alt={product.name}
              loading="lazy"
            />

            {showDiscounts &&
              product.sale && (
                <span className="discount-badge">
                  -
                  {product.discountPercent ||
                    30}
                  %
                </span>
              )}
          </span>

          <span className="product-info">
            <span className="product-name">
              {product.name}
            </span>

            <span className="product-price">
              Rs.{' '}
              {Number(
                product.price
              ).toLocaleString(
                'en-LK'
              )}
            </span>

            <span
              className={`stock-badge ${
                product.stock > 0
                  ? ''
                  : 'stock-badge--out'
              }`}
            >
              {product.stock > 0
                ? 'In Stock'
                : 'Out of stock'}
            </span>

            <span className="product-sizes">
              {(product.sizes ||
                []).map(
                (size) => (
                  <span
                    key={size}
                  >
                    {size}
                  </span>
                )
              )}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

function OrderHistory({
  onTrackOrder,
}) {
  const [orders, setOrders] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let active = true
    let refreshTimer

    function loadOrders() {
      fetch(
        `${API_BASE_URL}/api/payments/payhere/orders`,
        {
          headers: {
            'x-session-id':
              getSessionId(),
          },
        }
      )
        .then((response) =>
          response.ok
            ? response.json()
            : Promise.reject(
                new Error(
                  'Could not load your orders.'
                )
              )
        )
        .then((data) => {
          if (!active) return

          const nextOrders =
            data.orders || []

          setOrders(nextOrders)

          if (
            nextOrders.some(
              (order) =>
                order.status ===
                'pending'
            )
          ) {
            refreshTimer =
              window.setTimeout(
                loadOrders,
                5000
              )
          }
        })
        .catch((loadError) => {
          if (active) {
            setError(
              loadError.message
            )
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false)
          }
        })
    }

    loadOrders()

    return () => {
      active = false
      window.clearTimeout(
        refreshTimer
      )
    }
  }, [])

  if (loading) {
    return (
      <div className="order-history">
        <p>
          Loading your orders...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="order-history">
        <p className="checkout-error">
          {error}
        </p>
      </div>
    )
  }

  if (!orders.length) {
    return (
      <div className="empty-cart">
        <Box size={28} />
        <p>No orders yet.</p>
      </div>
    )
  }

  return (
    <div className="order-history">
      {orders.map((order) => (
        <article
          className="order-card"
          key={order.orderId}
        >
          <div className="order-card-heading">
            <strong>
              Rs.{' '}
              {Number(
                order.amount
              ).toLocaleString(
                'en-LK'
              )}
            </strong>

            <span
              className={`order-status order-status--${order.status}`}
            >
              {order.status.replace(
                '_',
                ' '
              )}
            </span>
          </div>

          <p className="order-card-date">
            {new Date(
              order.createdAt
            ).toLocaleDateString(
              'en-LK'
            )}
          </p>

          <div className="order-card-items">
            {order.items.map(
              (item, index) => (
                <p
                  key={`${item.productId}-${item.size}-${index}`}
                >
                  {item.name} ·{' '}
                  {item.size} ×{' '}
                  {item.quantity}
                </p>
              )
            )}
          </div>

          <button
            className="text-action"
            onClick={() =>
              onTrackOrder(
                order.orderId
              )
            }
          >
            TRACK ORDER
          </button>
        </article>
      ))}
    </div>
  )
}

function CartPanel({
  items,
  onUpdate,
  onClose,
  onCheckout,
}) {
  const [checkingOut, setCheckingOut] =
    useState(false)

  const [checkoutBusy, setCheckoutBusy] =
    useState(false)

  const [checkoutError, setCheckoutError] =
    useState('')

  const total = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
        item.quantity,
    0
  )

  async function submitCheckout(
    event
  ) {
    event.preventDefault()

    setCheckoutBusy(true)
    setCheckoutError('')

    try {
      await onCheckout(
        Object.fromEntries(
          new FormData(
            event.currentTarget
          ).entries()
        )
      )
    } catch (error) {
      setCheckoutError(
        error.message ||
          'Could not start checkout.'
      )

      setCheckoutBusy(false)
    }
  }

  return (
    <div className="cart-panel">
      {items.length ? (
        <>
          {checkingOut ? (
            <form
              className="checkout-form"
              onSubmit={
                submitCheckout
              }
            >
              <button
                type="button"
                className="text-action"
                onClick={() =>
                  setCheckingOut(false)
                }
              >
                Back to bag
              </button>

              <h3>
                DELIVERY DETAILS
              </h3>

              <p className="checkout-country">
                Sri Lanka only · LKR
                payment via PayHere
              </p>

              <div className="checkout-name">
                <label>
                  FIRST NAME
                  <input
                    name="firstName"
                    autoComplete="given-name"
                    required
                    maxLength="120"
                  />
                </label>

                <label>
                  LAST NAME
                  <input
                    name="lastName"
                    autoComplete="family-name"
                    required
                    maxLength="120"
                  />
                </label>
              </div>

              <label>
                EMAIL
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength="120"
                />
              </label>

              <label>
                PHONE
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  placeholder="0771234567 or +94771234567"
                  pattern="(?:0[0-9]{9}|\+94[0-9]{9})"
                  required
                />
              </label>

              <label>
                ADDRESS
                <input
                  name="address"
                  autoComplete="street-address"
                  required
                  maxLength="120"
                />
              </label>

              <label>
                CITY
                <input
                  name="city"
                  autoComplete="address-level2"
                  required
                  maxLength="120"
                />
              </label>

              {checkoutError && (
                <p
                  className="checkout-error"
                  role="alert"
                >
                  {checkoutError}
                </p>
              )}

              <button
                className="drawer-action"
                type="submit"
                disabled={checkoutBusy}
              >
                {checkoutBusy
                  ? 'CONNECTING...'
                  : `PAY RS. ${total.toLocaleString(
                      'en-LK'
                    )}`}
              </button>

              <p className="checkout-secure">
                You will complete
                payment securely on
                PayHere.
              </p>
            </form>
          ) : (
            <>
              {items.map((item) => (
                <article
                  className="cart-item"
                  key={`${item.productId}-${item.size}`}
                >
                  <img
                    src={item.image}
                    alt=""
                  />

                  <div>
                    <h3>
                      {item.name}
                    </h3>

                    <p>
                      Size: {item.size}
                    </p>

                    <p>
                      Rs.{' '}
                      {Number(
                        item.price
                      ).toLocaleString(
                        'en-LK'
                      )}
                    </p>

                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          onUpdate(
                            item.productId,
                            item.size,
                            Math.max(
                              0,
                              item.quantity -
                                1
                            )
                          )
                        }
                      >
                        −
                      </button>

                      <span>
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          onUpdate(
                            item.productId,
                            item.size,
                            item.quantity +
                              1
                          )
                        }
                      >
                        +
                      </button>

                      <button
                        className="remove-item"
                        onClick={() =>
                          onUpdate(
                            item.productId,
                            item.size,
                            0
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              <div className="cart-total">
                <span>
                  SUBTOTAL
                </span>

                <strong>
                  Rs.{' '}
                  {total.toLocaleString(
                    'en-LK'
                  )}
                </strong>
              </div>

              <button
                className="drawer-action"
                onClick={() =>
                  setCheckingOut(true)
                }
              >
                CHECKOUT WITH PAYHERE
              </button>

              <button
                className="continue-shopping"
                onClick={onClose}
              >
                CONTINUE SHOPPING
              </button>
            </>
          )}
        </>
      ) : (
        <div className="empty-cart">
          <ShoppingBag size={28} />

          <p>
            Your bag is currently
            empty.
          </p>

          <button
            className="dark-cta"
            onClick={onClose}
          >
            CONTINUE SHOPPING
          </button>
        </div>
      )}
    </div>
  )
}

function Footer({
  email,
  setEmail,
  subscribe,
  content,
  brandName,
}) {
  if (content) {
    return (
      <footer className="site-footer">
        <div className="footer-columns">
          <section className="newsletter">
            <h2>
              {content.newsletterTitle}
            </h2>

            <p>
              {
                content.newsletterDescription
              }
            </p>

            <form
              onSubmit={subscribe}
            >
              <input
                type="email"
                placeholder="Enter Your Email Address"
                aria-label="Email address"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                required
              />

              <button type="submit">
                Subscribe!
              </button>
            </form>
          </section>

          <section className="contact-column">
            <h3>
              {content.hotlineTitle}
            </h3>

            <p>
              Phone :{' '}
              {content.hotlinePhone}
              <br />
              Operating Hours :{' '}
              {content.hotlineHours}
              <br />
              Email :{' '}
              <a
                href={`mailto:${content.email}`}
              >
                {content.email}
              </a>
            </p>

            <h3>
              {content.storeTitle}
            </h3>

            <p>
              Address :{' '}
              {content.storeAddress}
              <br />
              Location :{' '}
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
              >
                Open in Google maps
              </a>
              <br />
              Phone :{' '}
              {content.storePhone}
              <br />
              Opening Hours :{' '}
              {content.storeHours}
            </p>

            <h3>
              {content.outletTitle}
            </h3>

            <p>
              Address :{' '}
              {content.outletAddress}
              <br />
              Location :{' '}
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
              >
                Open in Google maps
              </a>
              <br />
              Phone :{' '}
              {content.outletPhone}
              <br />
              Opening Hours :{' '}
              {content.outletHours}
            </p>
          </section>

          <section className="quick-links">
            <h3>
              {content.quickLinksTitle}
            </h3>

            {content.quickLinks.map(
              (link) => (
                <a
                  href="#"
                  key={link}
                >
                  {link}
                </a>
              )
            )}
          </section>
        </div>

        <div className="social-row">
          <strong>
            Follow us
          </strong>

          <a
            href="#"
            aria-label="Facebook"
          >
            f
          </a>

          <a
            href="#"
            aria-label="Instagram"
          >
            <Camera size={19} />
          </a>

          <a
            href="#"
            aria-label="Pinterest"
          >
            ℘
          </a>

          <a
            href="#"
            aria-label="YouTube"
          >
            ▶
          </a>
        </div>

        <div className="copyright">
          Copyright © 2026,{' '}
          {brandName}.

          <div className="payment-logos">
            <span>AMEX</span>
            <span>
              Mastercard
            </span>
            <span>VISA</span>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="site-footer">
      <div className="footer-columns">
        <section className="newsletter">
          <h2>
            Newsletter subscription
          </h2>

          <p>
            Sign up for Borcelle
            updates to receive
            information about new
            arrivals, offers &amp;
            promos.
          </p>

          <form
            onSubmit={subscribe}
          >
            <input
              type="email"
              placeholder="Enter Your Email Address"
              aria-label="Email address"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              required
            />

            <button type="submit">
              Subscribe!
            </button>
          </form>
        </section>

        <section className="contact-column">
          <h3>
            ONLINE - CUSTOMER CARE
            HOTLINE
          </h3>

          <p>
            Phone : 077 ### ### <br />
            Operating Hours :
            Monday - Friday: 10.00
            AM- 5.30 PM
            <br />
            Email :{' '}
            <a href="mailto:info@borcelle.lk">
              info@borcelle.lk
            </a>
          </p>

          <h3>
            BORCELLE&nbsp; FASHION
            STORE
          </h3>

          <p>
            Address : No. 17,
            Charles Drive, Colombo
            03.
            <br />
            Location :{' '}
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
            >
              Open in Google maps
            </a>
            <br />
            Phone : 011 ### ## ##
            <br />
            Opening Hours : Everyday
            10.00 AM - 8.00 PM
          </p>

          <h3>
            BORCELLE OUTLET HOMAGAMA
          </h3>

          <p>
            Address : No. 238,
            Colombo Road, Homagama.
            <br />
            Location :{' '}
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
            >
              Open in Google maps
            </a>
            <br />
            Phone : 0## ### ###
            <br />
            Opening Hours : Everyday
            10.00 AM - 8.00 PM
          </p>
        </section>

        <section className="quick-links">
          <h3>QUICK LINKS</h3>

          {[
            'About Us',
            'FAQ',
            'Size Guide',
            'International Shipping',
            'Exchange Policy',
            'Bank Offers',
            'Contact Us',
            'Privacy Policy',
            'Terms of Use',
          ].map((link) => (
            <a
              href="#"
              key={link}
            >
              {link}
            </a>
          ))}
        </section>
      </div>

      <div className="social-row">
        <strong>
          Follow us
        </strong>

        <a
          href="#"
          aria-label="Facebook"
        >
          f
        </a>

        <a
          href="#"
          aria-label="Instagram"
        >
          <Camera size={19} />
        </a>

        <a
          href="#"
          aria-label="Pinterest"
        >
          ℘
        </a>

        <a
          href="#"
          aria-label="YouTube"
        >
          ▶
        </a>
      </div>

      <div className="copyright">
        Copyright © 2026, BORCELLE.

        <div className="payment-logos">
          <span>AMEX</span>
          <span>
            Mastercard
          </span>
          <span>VISA</span>
        </div>
      </div>
    </footer>
  )
}

export default App