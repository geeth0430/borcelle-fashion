import { useEffect, useState } from 'react'
import {
  Box, Check, ImagePlus, LogOut, Pencil, Plus, Search, Trash2, X,
} from 'lucide-react'
import defaultSiteContent from '../../siteContent.js'
import './AdminPanel.css'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const categories = ['Tops', 'Dresses', 'T-Shirts', 'Blazers', 'Jumpsuits', 'Skirts', 'Jeans', 'Shorts']
const emptyProduct = {
  name: '', category: 'Tops', price: '', color: '', image: '', sizes: ['S', 'M', 'L'], stock: 0, sale: false, discountPercent: 30, dailyStyle: false,
}

async function api(path, { token, ...options } = {}) {
  const headers = { ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const response = await fetch(path, { ...options, headers })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.message || 'The request could not be completed')
  return data
}

function AdminPanel() {
  const [token, setToken] = useState(() => sessionStorage.getItem('borcelle-admin-token') || '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(Boolean(token))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [siteContent, setSiteContent] = useState(defaultSiteContent)
  const [contentEditorOpen, setContentEditorOpen] = useState(false)
  const [contentSaving, setContentSaving] = useState(false)
  const [contentUploading, setContentUploading] = useState(false)

  useEffect(() => {
    if (!token) return undefined
    let active = true
    Promise.all([api('/api/admin/products', { token }), api('/api/admin/content', { token })])
      .then(([productData, contentData]) => {
        if (active) {
          setProducts(productData.products)
          setSiteContent(contentData.content)
        }
      })
      .catch((requestError) => {
        if (!active) return
        if (requestError.message.includes('Admin session')) {
          sessionStorage.removeItem('borcelle-admin-token')
          setToken('')
        } else setError(requestError.message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  const visibleProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category} ${product.color}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (!categoryFilter || product.category === categoryFilter)
  })

  async function signIn(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      const data = await api('/api/admin/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password }),
      })
      sessionStorage.setItem('borcelle-admin-token', data.token)
      setLoading(true)
      setToken(data.token)
      setPassword('')
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  function signOut() {
    sessionStorage.removeItem('borcelle-admin-token')
    setToken('')
    setProducts([])
    setError('')
  }

  function openProduct(product = null) {
    setEditing(product)
    setForm(product ? {
      name: product.name, category: product.category, price: product.price, color: product.color,
      image: product.image, sizes: [...product.sizes], stock: product.stock,
      sale: product.sale, discountPercent: product.discountPercent || 30, dailyStyle: product.dailyStyle,
    } : { ...emptyProduct, sizes: [...emptyProduct.sizes] })
    setError('')
    setModalOpen(true)
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function setAvailability(inStock) {
    setForm((current) => ({ ...current, stock: inStock ? Math.max(1, Number(current.stock) || 0) : 0 }))
  }

  function toggleSize(size) {
    setForm((current) => ({
      ...current,
      sizes: current.sizes.includes(size) ? current.sizes.filter((item) => item !== size) : [...current.sizes, size],
    }))
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('image', file)
      const data = await api('/api/admin/images', { method: 'POST', body, token })
      setForm((current) => ({ ...current, image: data.image }))
    } catch (requestError) { setError(requestError.message) }
    finally { setUploading(false); event.target.value = '' }
  }

  async function saveProduct(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, price: Number(form.price), stock: Number(form.stock), discountPercent: Number(form.discountPercent) }
    try {
      await api(editing ? `/api/admin/products/${encodeURIComponent(editing._id || editing.slug)}` : '/api/admin/products', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload), token,
      })
      const data = await api('/api/admin/products', { token })
      setProducts(data.products)
      setModalOpen(false)
      setNotice(editing ? 'Product updated' : 'Product created')
      window.setTimeout(() => setNotice(''), 2200)
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  function updateSiteContent(path, value) {
    const keys = path.split('.')
    setSiteContent((current) => {
      const next = structuredClone(current)
      let target = next
      for (const key of keys.slice(0, -1)) target = target[key]
      target[keys.at(-1)] = value
      return next
    })
  }

  async function saveSiteContent(event) {
    event.preventDefault()
    setContentSaving(true)
    setError('')
    try {
      const data = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(siteContent), token })
      setSiteContent(data.content)
      setContentEditorOpen(false)
      setNotice('Store content updated')
      window.setTimeout(() => setNotice(''), 2400)
    } catch (requestError) { setError(requestError.message) }
    finally { setContentSaving(false) }
  }

  async function uploadSiteImage(event, path) {
    const file = event.target.files?.[0]
    if (!file) return
    setContentUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('image', file)
      const data = await api('/api/admin/images', { method: 'POST', body, token })
      updateSiteContent(path, data.image)
    } catch (requestError) { setError(requestError.message) }
    finally { setContentUploading(false); event.target.value = '' }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.name}”? This cannot be undone.`)) return
    setError('')
    try {
      await api(`/api/admin/products/${encodeURIComponent(product._id || product.slug)}`, { method: 'DELETE', token })
      setProducts((current) => current.filter((item) => (item._id || item.slug) !== (product._id || product.slug)))
      setNotice('Product deleted')
      window.setTimeout(() => setNotice(''), 2200)
    } catch (requestError) { setError(requestError.message) }
  }

  if (!token) {
    return (
      <main className="admin-login-page">
        <form className="admin-login" onSubmit={signIn}>
          <a className="admin-brand" href="/">BORCELLE <span>ADMIN</span></a>
          <h1>Admin sign in</h1>
          <p>Sign in to manage the Borcelle product catalog.</p>
          <label>USERNAME<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label>PASSWORD<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="admin-primary" type="submit" disabled={saving}>{saving ? 'Signing in...' : 'Sign in'}</button>
          <a className="store-link" href="/">Return to store</a>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href="/">BORCELLE <span>ADMIN</span></a>
        <button className="admin-logout" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </header>
      <section className="admin-content">
        <div className="admin-title-row">
          <div><p className="admin-eyebrow">STORE MANAGEMENT</p><h1>Products</h1><p>Manage product details, prices, inventory, and images.</p></div>
          <div className="admin-title-actions"><button className="admin-secondary" type="button" onClick={() => setContentEditorOpen(true)}>Edit Store Content</button><button className="admin-primary add-product" onClick={() => openProduct()}><Plus size={17} /> Add product</button></div>
        </div>
        <div className="admin-toolbar">
          <label className="admin-search"><Search size={16} /><input placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <span className="admin-result-count">{visibleProducts.length} products</span>
        </div>
        {error && <p className="admin-error admin-page-error" role="alert">{error}</p>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Color</th><th>Stock</th><th>Sizes</th><th>Collections</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>{visibleProducts.map((product) => <tr key={product._id || product.slug}>
              <td><div className="admin-product-cell"><img src={product.image} alt="" /><span>{product.name}</span></div></td>
              <td>{product.category}</td><td>Rs. {Number(product.price).toLocaleString('en-LK')}</td><td>{product.color}</td><td><span className={`admin-stock-status ${product.stock > 0 ? 'admin-stock-status--available' : 'admin-stock-status--unavailable'}`}>{product.stock > 0 ? `In Stock · ${product.stock}` : 'Out of Stock'}</span></td><td><div className="admin-size-badges">{product.sizes.map((size) => <span key={size}>{size}</span>)}</div></td>
              <td><div className="admin-tags">{product.sale && <span>Sale -{product.discountPercent || 30}%</span>}{product.dailyStyle && <span>Daily</span>}{!product.sale && !product.dailyStyle && <span>—</span>}</div></td>
              <td><div className="admin-row-actions"><button title="Edit product" aria-label={`Edit ${product.name}`} onClick={() => openProduct(product)}><Pencil size={16} /></button><button title="Delete product" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><Trash2 size={16} /></button></div></td>
            </tr>)}</tbody>
          </table>
          {loading && <div className="admin-empty"><Box size={22} /> Loading products...</div>}
          {!loading && !visibleProducts.length && <div className="admin-empty"><Box size={22} /> No products found.</div>}
        </div>
      </section>

      {contentEditorOpen && <div className="admin-modal-backdrop content-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setContentEditorOpen(false) }}>
        <form className="store-content-editor" onSubmit={saveSiteContent}>
          <div className="editor-heading"><div><p className="admin-eyebrow">STOREFRONT CONTENT</p><h2>Edit website content</h2><p className="content-editor-note">Edit public-facing text and images. Catalog destinations, layout, and payment behavior stay fixed.</p></div><button type="button" aria-label="Close content editor" onClick={() => setContentEditorOpen(false)}><X size={20} /></button></div>
          <fieldset className="content-group"><legend>Brand</legend><div className="content-editor-grid"><ContentInput label="Brand name" value={siteContent.brand.name} onChange={(value) => updateSiteContent('brand.name', value)} /><ContentInput label="Brand descriptor" value={siteContent.brand.descriptor} onChange={(value) => updateSiteContent('brand.descriptor', value)} /></div></fieldset>
          <ContentInput label="Announcement bar" value={siteContent.announcement} onChange={(value) => updateSiteContent('announcement', value)} />

          <fieldset className="content-group"><legend>Navigation</legend><div className="content-editor-grid">
            {Object.entries(siteContent.navigation).filter(([key]) => !['clothingItems', 'collectionItems'].includes(key)).map(([key, value]) => <ContentInput key={key} label={key.replace(/([A-Z])/g, ' $1')} value={value} onChange={(next) => updateSiteContent(`navigation.${key}`, next)} />)}
            <ContentInput label="Clothing dropdown labels (one per line)" multiline value={siteContent.navigation.clothingItems.join('\n')} onChange={(value) => updateSiteContent('navigation.clothingItems', value.split('\n'))} />
            <ContentInput label="Collections dropdown labels (one per line)" multiline value={siteContent.navigation.collectionItems.join('\n')} onChange={(value) => updateSiteContent('navigation.collectionItems', value.split('\n'))} />
          </div></fieldset>

          <fieldset className="content-group"><legend>Hero slides</legend><div className="content-card-grid">{siteContent.heroSlides.map((slide, index) => <section className="content-card" key={`hero-${index}`}><h3>Slide {index + 1}</h3><ContentInput label="Eyebrow" value={slide.eyebrow} onChange={(value) => updateSiteContent(`heroSlides.${index}.eyebrow`, value)} /><ContentInput label="Heading" value={slide.title} onChange={(value) => updateSiteContent(`heroSlides.${index}.title`, value)} /><ContentInput label="Description" value={slide.subtitle} onChange={(value) => updateSiteContent(`heroSlides.${index}.subtitle`, value)} /><ContentInput label="Button text" value={slide.action} onChange={(value) => updateSiteContent(`heroSlides.${index}.action`, value)} /><label className="content-field">Button destination<select value={slide.category} onChange={(event) => updateSiteContent(`heroSlides.${index}.category`, event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="content-field">Text style<select value={slide.theme || ''} onChange={(event) => updateSiteContent(`heroSlides.${index}.theme`, event.target.value)}><option value="">Default</option><option value="soft">Soft</option><option value="dark">Dark</option></select></label><ContentInput label="Image alt text" value={slide.alt} onChange={(value) => updateSiteContent(`heroSlides.${index}.alt`, value)} /><ContentImageField label="Slide image" value={slide.image} path={`heroSlides.${index}.image`} onUpload={uploadSiteImage} uploading={contentUploading} /></section>)}</div></fieldset>

          <fieldset className="content-group"><legend>Homepage category tiles</legend><div className="content-card-grid">{siteContent.categoryTiles.map((tile, index) => <section className="content-card" key={tile.category}><h3>{tile.category}</h3><ContentInput label="Tile label" value={tile.label} onChange={(value) => updateSiteContent(`categoryTiles.${index}.label`, value)} /><ContentInput label="Image alt text" value={tile.alt} onChange={(value) => updateSiteContent(`categoryTiles.${index}.alt`, value)} /><ContentImageField label="Tile image" value={tile.image} path={`categoryTiles.${index}.image`} onUpload={uploadSiteImage} uploading={contentUploading} /></section>)}</div></fieldset>

          <fieldset className="content-group"><legend>Homepage promotions</legend><div className="content-card-grid">{siteContent.promotions.map((promotion, index) => <section className="content-card" key={`promotion-${index}`}><h3>Promotion {index + 1}</h3><ContentInput label="Eyebrow" value={promotion.eyebrow} onChange={(value) => updateSiteContent(`promotions.${index}.eyebrow`, value)} /><ContentInput label="Heading" value={promotion.title} onChange={(value) => updateSiteContent(`promotions.${index}.title`, value)} /><ContentInput label="Description" value={promotion.description} onChange={(value) => updateSiteContent(`promotions.${index}.description`, value)} /><ContentInput label="Button text" value={promotion.action} onChange={(value) => updateSiteContent(`promotions.${index}.action`, value)} /><label className="content-field">Button destination<select value={promotion.category} onChange={(event) => updateSiteContent(`promotions.${index}.category`, event.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><ContentInput label="Image alt text" value={promotion.alt} onChange={(value) => updateSiteContent(`promotions.${index}.alt`, value)} /><ContentImageField label="Promotion image" value={promotion.image} path={`promotions.${index}.image`} onUpload={uploadSiteImage} uploading={contentUploading} /></section>)}</div></fieldset>

          <fieldset className="content-group"><legend>Campaign pages</legend><div className="content-card-grid">{['partyShop', 'workwear', 'sale'].map((key) => <section className="content-card" key={key}><h3>{key === 'partyShop' ? 'Party Shop' : key === 'workwear' ? 'Workwear' : 'Sale'}</h3><ContentInput label="Page heading" value={siteContent.pages[key].title} onChange={(value) => updateSiteContent(`pages.${key}.title`, value)} /><ContentInput label="Description" multiline value={siteContent.pages[key].description} onChange={(value) => updateSiteContent(`pages.${key}.description`, value)} /></section>)}</div></fieldset>

          <fieldset className="content-group"><legend>Gift Card page</legend><div className="content-editor-grid">
            {['eyebrow', 'title', 'caption', 'description', 'action', 'alt'].map((key) => <ContentInput key={key} label={key} multiline={key === 'description'} value={siteContent.pages.giftCard[key]} onChange={(value) => updateSiteContent(`pages.giftCard.${key}`, value)} />)}
            <ContentImageField label="Gift Card page image" value={siteContent.pages.giftCard.image} path="pages.giftCard.image" onUpload={uploadSiteImage} uploading={contentUploading} />
          </div></fieldset>

          <fieldset className="content-group"><legend>Footer and contact details</legend><div className="content-editor-grid">
            {Object.entries(siteContent.footer).filter(([key]) => key !== 'quickLinks').map(([key, value]) => <ContentInput key={key} label={key.replace(/([A-Z])/g, ' $1')} value={value} onChange={(next) => updateSiteContent(`footer.${key}`, next)} />)}
            <ContentInput label="Quick links (one per line)" multiline value={siteContent.footer.quickLinks.join('\n')} onChange={(value) => updateSiteContent('footer.quickLinks', value.split('\n'))} />
          </div></fieldset>

          {error && <p className="admin-error" role="alert">{error}</p>}
          <div className="editor-actions"><button type="button" className="admin-secondary" onClick={() => setContentEditorOpen(false)}>Cancel</button><button className="admin-primary" type="submit" disabled={contentSaving || contentUploading}>{contentSaving ? 'Saving...' : <><Check size={16} /> Save website content</>}</button></div>
        </form>
      </div>}

      {modalOpen && <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}>
        <form className="product-editor" onSubmit={saveProduct}>
          <div className="editor-heading"><div><p className="admin-eyebrow">PRODUCT DETAILS</p><h2>{editing ? 'Edit product' : 'Add product'}</h2></div><button type="button" aria-label="Close editor" onClick={() => setModalOpen(false)}><X size={20} /></button></div>
          <div className="editor-grid">
            <label className="editor-span">Product name<input name="name" value={form.name} onChange={updateField} maxLength="120" required /></label>
            <label>Category<select name="category" value={form.category} onChange={updateField}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Price (Rs.)<input type="number" name="price" value={form.price} onChange={updateField} min="0" step="0.01" required /></label>
            <label>Color<input name="color" value={form.color} onChange={updateField} maxLength="40" required /></label>
            <label>Stock quantity<input type="number" name="stock" value={form.stock} onChange={updateField} min="0" step="1" required /></label>
            <div className="editor-span"><span className="availability-label">Availability</span><div className="availability-control" role="group" aria-label="Product availability"><button type="button" className={Number(form.stock) > 0 ? 'selected-available' : ''} aria-pressed={Number(form.stock) > 0} onClick={() => setAvailability(true)}>In Stock</button><button type="button" className={Number(form.stock) === 0 ? 'selected-unavailable' : ''} aria-pressed={Number(form.stock) === 0} onClick={() => setAvailability(false)}>Out of Stock</button></div></div>
            <fieldset className="editor-span"><legend>Available sizes</legend><div className="editor-sizes">{sizes.map((size) => <label key={size}><input type="checkbox" checked={form.sizes.includes(size)} onChange={() => toggleSize(size)} />{size}</label>)}</div></fieldset>
            <label className="editor-span">Image path<input name="image" value={form.image} onChange={updateField} placeholder="/images/product.png" required /></label>
            <label className="image-upload editor-span"><ImagePlus size={17} />{uploading ? 'Uploading image...' : 'Upload product image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} disabled={uploading} /></label>
            {form.image && <div className="image-preview editor-span"><img src={form.image} alt="Product preview" /><span>{form.image}</span></div>}
            <label className="editor-check"><input type="checkbox" name="sale" checked={form.sale} onChange={updateField} /> Hot deal</label>
            {form.sale && <label>Hot deal discount (%)<input type="number" name="discountPercent" value={form.discountPercent} onChange={updateField} min="1" max="99" step="1" required /></label>}
            <label className="editor-check"><input type="checkbox" name="dailyStyle" checked={form.dailyStyle} onChange={updateField} /> Daily style</label>
          </div>
          {error && <p className="admin-error" role="alert">{error}</p>}
          <div className="editor-actions"><button type="button" className="admin-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="admin-primary" type="submit" disabled={saving || uploading}>{saving ? 'Saving...' : <><Check size={16} /> Save product</>}</button></div>
        </form>
      </div>}
      {notice && <div className="admin-toast" role="status">{notice}</div>}
    </main>
  )
}

function ContentInput({ label, value, onChange, multiline = false }) {
  return <label className={`content-field ${multiline ? 'content-field--wide' : ''}`}>{label}{multiline
    ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="3" />
    : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>
}

function ContentImageField({ label, value, path, onUpload, uploading }) {
  return <div className="content-image-field"><span>{label}</span><div className="content-image-row"><img src={value} alt="" /><input value={value} onChange={() => {}} readOnly aria-label={`${label} path`} /><label className="image-upload"><ImagePlus size={16} />{uploading ? 'Uploading...' : 'Replace'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onUpload(event, path)} disabled={uploading} /></label></div></div>
}

export default AdminPanel