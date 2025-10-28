# Online Examination System with LMS Integration
apgoswamiinfo_db_user
laksgEvaawaZE2Wp
mongodb+srv://apgoswamiinfo_db_user:laksgEvaawaZE2Wp@onlineexamination.awgplad.mongodb.net/
A comprehensive online examination and learning management system built with Node.js, Express, and EJS.

## Features

- 🔐 Secure Authentication & Authorization
- 📝 Multiple Question Types (MCQ, True/False, Match, Descriptive)
- ⏱️ Timed Online Exams
- 📊 Result Calculation & Ranking System
- 📚 Course Management (LMS)
- 💳 Payment Integration (Razorpay/Stripe/PayPal)
- 📱 Responsive Design
- 🌓 Dark/Light Mode
- 📧 Email & Push Notifications
- 📜 Certificate Generation

## Prerequisites

- Node.js (v14 or higher)
- MySQL/PostgreSQL
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd online-examination
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file:
   ```bash
   cp .env.example .env
   ```

4. Update the .env file with your configuration:
   - Database credentials
   - JWT secret
   - SMTP settings
   - Payment gateway credentials

5. Initialize the database:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

## Running the Application

### Development
```bash
npm run dev
```
The application will start in development mode with nodemon watching for changes.

### Production
```bash
npm start
```

## Project Structure

```
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middlewares/    # Custom middlewares
│   ├── models/         # Database models
│   ├── routes/         # Application routes
│   ├── utils/          # Utility functions
│   ├── views/          # EJS templates
│   └── app.js         # Application entry point
├── public/            # Static files
├── .env              # Environment variables
└── package.json
```

## User Roles

1. Super Admin
   - Manage admins
   - Configure system settings
   - View analytics

2. Admin
   - Manage courses
   - Create exams
   - Review results
   - Manage users

3. User
   - Take exams
   - Enroll in courses
   - View results
   - Access certificates

## API Documentation

The system includes REST API endpoints for potential mobile app integration. Documentation can be found in the `/docs` directory.

## Environment Variables

Key environment variables:

```env
NODE_ENV=development
PORT=3000
DB_TYPE=mysql
DB_HOST=localhost
DB_NAME=online_exam_db
JWT_SECRET=your_secret_key
```

See `.env.example` for all available options.

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint      # Check for issues
npm run lint:fix  # Fix automatically
```

### Code Formatting
```bash
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email [your-email@domain.com](mailto:your-email@domain.com)