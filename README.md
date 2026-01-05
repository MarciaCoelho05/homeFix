# HomeFix

HomeFix is a full-stack web application for managing home maintenance and repair service requests. It connects clients with technicians, allowing users to create service requests, schedule appointments, communicate through an integrated chat system, and provide feedback on completed services.

##  Features

### Client Features
- **User Registration & Authentication** - Secure signup, login, and password reset functionality
- **Service Request Management** - Create, view, and track maintenance requests
- **Real-time Messaging** - Chat with technicians about service requests
- **Service Scheduling** - Schedule appointments with technicians
- **Feedback System** - Rate and review completed services
- **Profile Management** - Update personal information and avatar

### Technician Features
- **Request Management** - View and accept service requests in their category
- **Calendar View** - Manage scheduled appointments
- **Client Communication** - Chat with clients about service requests
- **Multiple Categories** - Technicians can work in multiple service categories

### Admin Features
- **Admin Dashboard** - Comprehensive overview of all requests and users
- **User Management** - Manage users, technicians, and permissions
- **Request Oversight** - Monitor and manage all service requests
- **System Administration** - Full control over the platform

##  Tech Stack

### Backend
- **Node.js** (v18+) - Runtime environment
- **Express.js** - Web framework
- **Prisma** - ORM for database management
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image/file storage
- **Nodemailer** (via Gmail API) - Email notifications
- **PDFKit** - Invoice generation
- **Multer** - File upload handling

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Bootstrap 5** - CSS framework
- **Axios** - HTTP client

### Deployment
- **Vercel** - Frontend and backend hosting
- **Railway** - Alternative backend hosting
- **Docker** - Containerization support

##  Project Structure

```
HomeFix/
├── homefix-backend/          # Backend API
│   ├── src/
│   │   ├── config/            # Database and email configuration
│   │   ├── controllers/      # Request handlers
│   │   ├── middlewares/      # Authentication and error handling
│   │   ├── routes/           # API routes
│   │   ├── utils/            # Utilities (PDF, email templates, Cloudinary)
│   │   ├── worker/           # Background workers (email)
│   │   └── server.js         # Express server entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   ├── migrations/       # Database migrations
│   │   └── seed.js          # Database seeding
│   └── package.json
│
├── homefix-frontend/          # Frontend React app
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   ├── routes.jsx        # Route configuration
│   │   ├── services/         # API service layer
│   │   └── main.jsx          # App entry point
│   └── package.json
│
└── README.md
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager
- Gmail account (for email functionality)
- Cloudinary account (for file uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HomeFix
   ```

2. **Backend Setup**
   ```bash
   cd homefix-backend
   npm install
   ```

3. **Configure Environment Variables**
   
   Create a `.env` file in `homefix-backend/` with the following variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/homefix"
   JWT_SECRET="your-secret-key"
   PORT=3000
   
   # Email Configuration (Gmail)
   GMAIL_USER="your-email@gmail.com"
   GMAIL_APP_PASSWORD="your-app-password"
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   
   # Node Environment
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma Client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Seed database (optional)
   npm run db:seed
   ```

5. **Frontend Setup**
   ```bash
   cd ../homefix-frontend
   npm install
   ```

6. **Configure Frontend API**
   
   Update the API base URL in `homefix-frontend/src/services/api.js` to point to your backend URL.

### Running the Application

**Development Mode:**

1. **Start Backend**
   ```bash
   cd homefix-backend
   npm run dev
   ```
   Backend will run on `http://localhost:3000`

2. **Start Frontend**
   ```bash
   cd homefix-frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

**Production Mode:**

1. **Build Frontend**
   ```bash
   cd homefix-frontend
   npm run build
   ```

2. **Start Backend** (serves frontend from dist folder)
   ```bash
   cd homefix-backend
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### User Management
- `GET /api/profile` - Get current user profile
- `PATCH /api/profile` - Update user profile
- `DELETE /api/profile` - Delete user account

### Maintenance Requests
- `GET /api/maintenance` - Get all requests (admin/technician)
- `POST /api/maintenance` - Create new request
- `GET /api/maintenance/:id` - Get request details
- `PATCH /api/maintenance/:id` - Update request
- `DELETE /api/maintenance/:id` - Delete request
- `POST /api/maintenance/:id/assign` - Assign technician
- `POST /api/maintenance/:id/complete` - Mark request as completed

### Messages
- `GET /api/messages/:requestId` - Get messages for a request
- `POST /api/messages` - Send a message

### File Upload
- `POST /api/upload` - Upload files/images

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/requests` - Get all requests
- `PATCH /api/admin/users/:id` - Update user (role, permissions)

##  Database Schema

### Models

- **User** - Users (clients, technicians, admins)
  - Authentication fields
  - Role flags (isAdmin, isTechnician)
  - Technician categories
  - Profile information

- **MaintenanceRequest** - Service requests
  - Request details (title, description, category)
  - Status tracking
  - Scheduling information
  - Media attachments
  - Client and technician relationships

- **Message** - Chat messages
  - Message content
  - Attachments
  - Request association

- **Feedback** - Service ratings and reviews
  - Rating (1-5)
  - Comments
  - Request association

##  Available Scripts

### Backend Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:test` - Test database connection
- `npm run worker` - Start email worker process

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

##  Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Protected routes with middleware
- CORS configuration
- Input validation
- Email validation for notifications

##  Email Notifications

The application sends automated emails for:
- User registration confirmation
- Password reset requests
- Request status updates
- Technician assignments
- Profile updates
- Account deletion confirmation

Email functionality uses Gmail API and requires:
- Gmail account with App Password enabled
- Proper environment variable configuration

##  Deployment

### Vercel Deployment

The project includes `vercel.json` configuration files for both frontend and backend.

**Backend:**
```bash
cd homefix-backend
vercel --prod
```

**Frontend:**
```bash
cd homefix-frontend
vercel --prod
```

### Railway Deployment

The project includes `railway.json` and `Procfile` for Railway deployment.

### Docker Deployment

A `Dockerfile` is included in the backend directory for containerized deployment.

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

ISC License

## 👤 Author

**Márcia Coelho**

##  Acknowledgments

- Built with modern web technologies
- Uses Prisma for type-safe database access
- Cloudinary for reliable file storage
- Gmail API for email functionality

---

For more information or support, please open an issue in the repository.

