# Borcelle Fashion Store

React storefront based on the supplied Borcelle UI screens, with an Express REST API and MongoDB/Mongoose persistence.

## Project structure

- `client/` contains the React/Vite app, source, and public assets.
- `server/` contains the Express API, routes, models, and data.
- Root-level `package.json` provides the shared scripts and dependencies.

## Run locally

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, a private `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. For Google sign-in, set `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` to the OAuth web client ID, then add `http://localhost:5173` and each deployed storefront origin under Authorized JavaScript origins in Google Cloud Console. To enable PayHere checkout, also set your PayHere merchant ID and domain-specific merchant secret, and set `APP_URL` to the public HTTPS storefront URL.
3. Start MongoDB, then run `npm run dev`.
4. Open `http://localhost:5173` for the storefront or `http://localhost:5173/admin` for admin sign-in.

The development command starts Vite and the API together. The API is available on port 5000 and Vite proxies `/api` requests to it. If MongoDB is not configured or unavailable, the catalog stays available from seed data and carts/accounts use temporary in-memory storage.

## Admin panel

Admin access is configured only through the private `.env` file; there is no public admin registration. Admin endpoints require an eight-hour admin-role token. The panel supports product search, category filtering, create/edit/delete, prices, inventory, colors, sizes, sale and daily-style flags, and local PNG/JPG/WebP image uploads up to 5 MB. The Store Content editor manages brand identity, the announcement, navigation labels, hero slides, homepage category tiles and promotions, campaign/Gift Card copy, and footer/contact details. Uploaded images are stored in `client/public/images/uploads`.

Admin frontend code is in `client/src/admin`; admin API and authorization are in `server/routes/admin.js` and `server/middleware/requireAdmin.js`. MongoDB mode persists product and site-content edits. Without MongoDB, edits use demo memory and are discarded when the API restarts. Content edits cannot change layout, product/category route destinations, or payment behavior.

## REST endpoints

- `GET /api/health`
- `GET /api/products` with `category`, `q`, `colors`, `sizes`, `maxPrice`, `inStock`, `outOfStock`, `sale`, and `collection` filters
- `GET /api/products/:slug`
- `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:productId`, `DELETE /api/cart/items/:productId`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`
- `POST /api/newsletter`
- `GET /api/content`
- `POST /api/payments/payhere`, `POST /api/payments/payhere/notify`, `GET /api/payments/payhere/orders`, `GET /api/payments/payhere/orders/:orderId`
- `POST /api/admin/auth/login`
- Admin-only: `GET /api/admin/products`, `POST /api/admin/products`, `PUT /api/admin/products/:id`, `DELETE /api/admin/products/:id`, `GET /api/admin/content`, `PUT /api/admin/content`, `POST /api/admin/images`

The first MongoDB connection seeds the product collection with the bundled catalog. User passwords are stored as bcrypt hashes. Set a strong, unique `JWT_SECRET` before deployment.

## Sri Lanka payments

Checkout uses PayHere in LKR and collects Sri Lankan delivery details only. Create a PayHere merchant account, register the public storefront domain in its integrations settings, and add its merchant ID and domain-specific secret to the private `.env`. Keep `PAYHERE_SANDBOX=true` while testing, then set it to `false` for live payments. `APP_URL` must be publicly reachable over HTTPS so PayHere can deliver signed payment notifications. Online checkout requires MongoDB so pending orders and verified payment results persist. An order is marked paid only after its PayHere notification signature, currency, and amount are verified; browser redirects alone do not confirm payment. PayHere is a Sri Lankan payment gateway, not a government-operated payment service.

Google sign-in verifies Google ID tokens on the API before creating or linking an account. Existing accounts are linked only when Google verifies the same email address. Keep the Google OAuth client ID public; never expose the JWT secret or PayHere merchant secret in client-side variables.

## Checks

- `npm run build`
- `npm run api:check`
- `npm run lint`