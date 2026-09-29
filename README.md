# Borcelle Fashion Store

Borcelle Fashion is a women's online clothing store website designed to provide a simple and modern shopping experience. Customers can browse women's clothing, view product details, manage their cart, create accounts, and access the store through a responsive web interface.

## Technology Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT & Google Authentication
- **API:** REST API
- **Checkout:** Cash on delivery

## Local Development

Run `npm install`, make sure MongoDB is running on this computer, then run `npm run dev` once. The storefront opens at `http://localhost:5173`, the API at `http://localhost:5000`, and the admin panel at `http://localhost:5173/admin`. Admin sign-in uses `ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`.

Local development uses `.env.local` to select `mongodb://127.0.0.1:27017/borcelle`; this file is ignored by Git. Set `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` in `.env` to keep Google sign-in enabled. If either local port is already in use, stop the other running dev server before starting `npm run dev` again.

## Features

- Women's clothing product catalog
- Product search and filtering
- Product details
- Shopping cart
- User registration and login
- Google Authentication
- Admin dashboard
- Product management
- Inventory management
- Store content management
- MongoDB database integration
- Responsive design
- REST API

## Project Structure

```text
Borcelle-Fashion/
├── client/        # React frontend
├── server/        # Node.js & Express backend
├── public/        # Public assets
├── .env.example   # Environment variable example
└── package.json   # Project configuration
