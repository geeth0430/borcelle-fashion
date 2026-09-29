# Borcelle Fashion Store

Borcelle Fashion is a women's online clothing store website built with a modern, responsive, and user-friendly interface.

Customers can browse women's clothing, search and filter products, view product details, manage their shopping cart, create accounts, sign in, and place orders using Cash on Delivery.

This project is currently configured for **local development only** using React.js, Node.js, Express.js, and MongoDB.

---

## Technology Stack

- **Frontend:** React.js
- **Backend:** Node.js
- **Backend Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT & Google Authentication
- **API:** REST API
- **Checkout:** Cash on Delivery
- **Development Environment:** Visual Studio Code
- **Package Manager:** npm

---

## Features

### Customer Features

- Women's clothing product catalog
- Product search
- Product filtering
- Product details
- Shopping cart
- User registration
- User login
- JWT authentication
- Google Authentication
- Responsive design
- Cash on Delivery checkout
- Customer account access

### Admin Features

- Admin login
- Admin dashboard
- Product management
- Inventory management
- Store content management
- Product data management

---

## Local Development

This project is configured to run on a local computer.

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- MongoDB
- Visual Studio Code

---

## 1. Install Dependencies

Open the project folder in Visual Studio Code.

Open the VS Code terminal and run:

```bash
npm install
```

This installs all required project dependencies.

---

## 2. Start MongoDB

Make sure MongoDB is installed and running on your computer.

The project uses the following local MongoDB connection:

```text
mongodb://127.0.0.1:27017/borcelle
```

### Database Name

```text
borcelle
```

---

## 3. Environment Variables

The project uses environment variables for configuration.

Use the `.env.example` file as a reference for your local environment configuration.

Important environment variables include:

```text
MONGODB_URI
JWT_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
GOOGLE_CLIENT_ID
VITE_GOOGLE_CLIENT_ID
```

### Security

Do not upload private environment files containing passwords, secrets, database credentials, or API credentials to GitHub.

The following files should remain local:

```text
.env
.env.local
```

The project includes:

```text
.env.example
```

as an example configuration file.

---

## 4. Start the Application

From the project root directory, run:

```bash
npm run dev
```

The development server will start the application.

### Frontend

```text
http://localhost:5173
```

### Backend API

```text
http://localhost:5000
```

### Admin Panel

```text
http://localhost:5173/admin
```

If a port is already in use, stop the other running development server and start the project again.

---

## 5. Local Development Workflow

The application works using the following structure:

```text
React Frontend
      ↓
Node.js + Express.js Backend
      ↓
REST API
      ↓
Local MongoDB Database
```

The React frontend communicates with the Express.js REST API.

The Express.js backend communicates with the local MongoDB database.

---

## Authentication

The application supports:

- User registration
- User login
- JWT-based authentication
- Google Authentication
- Admin authentication

### Admin Authentication

Admin login credentials are configured using:

```text
ADMIN_USERNAME
ADMIN_PASSWORD
```

These values should be stored in the local environment configuration.

Do not commit admin credentials to GitHub.

### Google Authentication

Google Authentication uses:

```text
GOOGLE_CLIENT_ID
VITE_GOOGLE_CLIENT_ID
```

Configure these values in the appropriate local environment files.

Restart the development server after changing environment variables.

---

## Database

Borcelle Fashion uses MongoDB to store application data.

### Local MongoDB Connection

```text
mongodb://127.0.0.1:27017/borcelle
```

### Database Name

```text
borcelle
```

MongoDB runs locally on the development computer.

---

## Checkout

The current project uses:

**Cash on Delivery**

No online payment gateway is required for the current local version.

---

## Project Structure

```text
Borcelle-Fashion/
│
├── client/                  # React frontend
│
├── server/                  # Node.js & Express.js backend
│
├── public/                  # Public assets
│
├── .env.example             # Environment variable example
│
├── .gitignore               # Files ignored by Git
│
├── package.json             # Project configuration
│
├── package-lock.json        # Dependency lock file
│
└── README.md                # Project documentation
```

---

## Important Local URLs

| Service | URL |
|---|---|
| Customer Website | http://localhost:5173 |
| Admin Panel | http://localhost:5173/admin |
| Backend API | http://localhost:5000 |
| MongoDB | mongodb://127.0.0.1:27017/borcelle |

---

## Troubleshooting

### Frontend Port 5173 Is Already in Use

If port `5173` is already being used, stop the other running frontend development server and run:

```bash
npm run dev
```

again.

### Backend Port 5000 Is Already in Use

If port `5000` is already being used, stop the other backend process before starting the application again.

### MongoDB Connection Error

Make sure MongoDB is installed and running.

The local MongoDB connection is:

```text
mongodb://127.0.0.1:27017/borcelle
```

### Google Authentication Not Working

Check that these environment variables are configured correctly:

```text
GOOGLE_CLIENT_ID
VITE_GOOGLE_CLIENT_ID
```

After changing them, restart the development server.

### Admin Login Not Working

Check the local environment configuration:

```text
ADMIN_USERNAME
ADMIN_PASSWORD
```

After changing them, restart the development server.

---

## Git and GitHub

The source code is maintained using Git and stored in the GitHub repository.

### Repository

```text
https://github.com/geeth0430/borcelle-fashion.git
```

### Branch

```text
main
```

### Update GitHub After Making Changes

After making changes to the local project, run:

```bash
git add .
git commit -m "Update website"
git push origin main
```

This updates the GitHub repository with the latest local project changes.

---

## Current Project Status

The current version includes:

- React frontend
- Node.js backend
- Express.js REST API
- Local MongoDB database
- JWT authentication
- Google Authentication
- Admin dashboard
- Product management
- Inventory management
- Store content management
- Product catalog
- Product search
- Product filtering
- Product details
- Shopping cart
- User registration
- User login
- Responsive design
- Cash on Delivery checkout

---

## Localhost Only

This version of Borcelle Fashion is currently intended for:

**Local development and testing only.**

The current project does not require production hosting.

### Current Local Setup

```text
Frontend
http://localhost:5173

Backend
http://localhost:5000

Admin Panel
http://localhost:5173/admin

MongoDB
mongodb://127.0.0.1:27017/borcelle
```

---

## Security Notice

Never commit sensitive information to GitHub.

Do not upload:

```text
.env
.env.local
```

Keep passwords, JWT secrets, database credentials, and API credentials in your local environment files.

Use `.env.example` to document the required environment variable names without exposing their private values.

---

## License

This project is a Borcelle Fashion Store website project developed for learning, development, and demonstration purposes.
