# Finance Tracker API Documentation

## Base URL
`http://localhost:5000/api`

## Authentication

### Login
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: User object with JWT token.

### Register
- **Endpoint**: `POST /auth/register`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Forgot Password
- **Endpoint**: `POST /auth/forgotpassword`
- **Body**: `{"email": "..."}`

---

## Users

### Get Profile
- **Endpoint**: `GET /users/profile`
- **Headers**: `Authorization: Bearer <token>`

### Update Profile
- **Endpoint**: `PUT /users/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{"name": "...", "currency": "USD", ...}`

### Leaderboard
- **Endpoint**: `GET /users/leaderboard`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns top 10 users by XP.

---

## Transactions

### Get All Transactions
- **Endpoint**: `GET /transactions`
- **Query Params**: `startDate`, `endDate`, `category`, `type`
- **Headers**: `Authorization: Bearer <token>`

### Add Transaction
- **Endpoint**: `POST /transactions`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "type": "expense",
    "category": "Food",
    "amount": 50,
    "description": "Lunch",
    "date": "2023-10-27"
  }
  ```
- **Notes**: Includes AI Fraud Detection and Budget Alerts.

### Delete Transaction
- **Endpoint**: `DELETE /transactions/:id`
- **Headers**: `Authorization: Bearer <token>`

---

## Budgets

### Get Budgets
- **Endpoint**: `GET /budgets`
- **Headers**: `Authorization: Bearer <token>`

### Set Budget
- **Endpoint**: `POST /budgets`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "category": "Food",
    "limit": 500,
    "month": 10,
    "year": 2023
  }
  ```

### Get Smart Budget Recommendations (NEW!)
- **Endpoint**: `GET /budgets/recommend`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: AI-driven analysis of past spending to suggest realistic budgets.

---

## Investments (Real-Time)

### Get Investments
- **Endpoint**: `GET /investments`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Enriched with real-time stock/crypto prices if applicable.

### Add Investment
- **Endpoint**: `POST /investments`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "type": "stocks",
    "name": "AAPL",
    "amount": 1000,
    "risk": "medium"
  }
  ```

### Search Stocks
- **Endpoint**: `GET /stocks/search?query=Apple`
- **Headers**: `Authorization: Bearer <token>`

---

## AI & Analytics

### Dashboard Analytics
- **Endpoint**: `GET /analytics/dashboard`
- **Headers**: `Authorization: Bearer <token>`
- **Description**: Returns summary, financial score, and AI predictions.

### Spending Breakdown
- **Endpoint**: `GET /analytics/breakdown`
- **Headers**: `Authorization: Bearer <token>`

### Chat with Finance Bot
- **Endpoint**: `POST /ai/chat`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{"message": "How can I save more?"}`

### Scan Receipt (OCR)
- **Endpoint**: `POST /ai/scan-receipt`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Form-data with `receipt` file (image).

---

## Family Finance

### Create Family
- **Endpoint**: `POST /family/create`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{"name": "Smith Family"}`

### Join Family
- **Endpoint**: `POST /family/join`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{"inviteCode": "XYZ123"}`

---

## Goals

### Get Goals
- **Endpoint**: `GET /goals`
- **Headers**: `Authorization: Bearer <token>`

### Create Goal
- **Endpoint**: `POST /goals`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{"title": "New Car", "targetAmount": 20000, "deadline": "2024-12-01"}`

### Add Funds to Goal
- **Endpoint**: `PUT /goals/:id/add`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{"amount": 500}`
