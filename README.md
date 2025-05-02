# Medical Queue AI

An AI-powered medical queue management system that uses Google's Gemini AI to analyze medical receipts and prioritize patients based on the severity of their condition.

## Features

- **User Authentication**: Login with Google account
- **Upload Medical Receipts**: Patients can upload their medical receipts
- **AI Analysis**: Google Gemini AI analyzes patient's conditions from medical receipts
- **Priority Queue**: Patients are queued based on the severity of their condition
- **Hospital Selection**: Patients can select their preferred hospital
- **Hospital Dashboard**: Hospitals can view and manage their patient queue
- **Admin Dashboard**: Administrators can manage hospitals and users

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (NeonDB)
- **Authentication**: NextAuth.js with Google provider
- **ORM**: Prisma
- **AI**: Google Gemini API

## Setup Instructions

### Prerequisites

- Node.js (v18 or later)
- NPM or Yarn
- NeonDB PostgreSQL database or other PostgreSQL database
- Google OAuth credentials
- Google Gemini API key

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
DATABASE_URL="your-postgresql-connection-string"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_SECRET="random-secret-string-for-jwt"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
```

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd medical-queue-ai
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up the database schema:
   ```
   npx prisma migrate dev
   ```

4. Generate Prisma Client:
   ```
   npx prisma generate
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Patient Flow

1. Login with Google account
2. Select state and hospital
3. Upload medical receipt
4. View queue position and receipt analysis

### Hospital Flow

1. Login with hospital admin account
2. View patient queue
3. Process patients and update queue status

### Admin Flow

1. Login with admin account
2. View system statistics
3. Manage hospitals and users

## API Endpoints

- `/api/auth/*` - Authentication endpoints
- `/api/states` - Get list of Indian states
- `/api/hospitals` - Get hospitals by state
- `/api/receipts/upload` - Upload and process a medical receipt
- `/api/receipts/[id]` - Get receipt details
- `/api/receipts/[id]/complete` - Mark a receipt as completed
- `/api/hospital/queue` - Get the hospital's patient queue
- `/api/admin/stats` - Get system statistics

## Contributing

Contributions are welcome! Feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
