# Banking Management System

A robust, full-stack Banking Management System developed for a Database Management Systems project. The application features a modern web interface with a secure backend and a well-structured, normalized relational database layout designed to enforce ACID compliance and data integrity.

**Developer:** D. Yashwanth 

## 🚀 Features

- **Relational Database Design**: Carefully structured database following 3NF normalization with relationships mapping (One-to-Many / Many-to-Many).
- **Core Banking Operations**: Manage Branches, Customers, Accounts, Account Holders, Transactions, and Loans with comprehensive CRUD capabilities.
- **Role-Based Authentication**: Secure access separation between Admins and Customers.
- **Data Integrity & Constraints**:
  - `AUTO_INCREMENT` Primary Keys for simplified record management.
  - Foreign Keys with `ON DELETE CASCADE` and `ON DELETE SET NULL` for referential integrity.
  - Strict `CHECK` constraints (e.g., Non-negative balances and interest rates, valid transaction types).
- **Soft Deletes**: Uses `IsActive` flags across major tables instead of hard deleting records, preserving auditability.
- **Modern UI/UX**: An aesthetic frontend utilizing glassmorphism styling parameters to visualize data seamlessly.

## 🛠️ Technology Stack

- **Frontend:** HTML5, modern CSS (with glassmorphism UI elements), EJS (Embedded JavaScript templating)
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Packages:** `express`, `ejs`, `express-ejs-layouts`, `mysql2`, `dotenv`, `express-session`, `body-parser`

## 🗄️ Database Schema Representation

The database `banking_system` spans the following core entities:
1. **Branch**: `BranchID` (PK), Name, Address, IsActive
2. **Customers**: `CustomerID` (PK), Name, Phone, Address, Password, IsActive
3. **Accounts**: `AccountNo` (PK), AccountType, Balance, BranchID (FK), OpeningDate, IsActive
4. **Account_holders**: Composite junction table for Customers and Accounts.
5. **Transactions**: `TransactionID` (PK), AccountNo (FK), FromAccount (FK), ToAccount (FK), Type, Amount, Date
6. **Loans**: `LoanID` (PK), LoanType, Amount, CustomerID (FK), BranchID (FK), InterestRate, IsActive
7. **Audit_Log**: Log of critical actions maintaining a database history.

## ⚙️ Installation & Setup

1. **Prerequisites**: Ensure you have [Node.js](https://nodejs.org/) and [MySQL](https://www.mysql.com/) installed on your machine.
2. **Clone/Download the Repository**.
3. **Install Dependencies**:
   Open a terminal in the project root directory and run:
   ```bash
   npm install
   ```
4. **Environment Variables**:
   Update the `.env` file with your MySQL credentials, for example:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=banking_system
   PORT=3000
   ```
5. **Initialize Database**:
   Import/run the provided SQL script (`database/schema.sql`) into your MySQL server to construct the necessary tables and populate initial sample data.
6. **Start the Application**:
   ```bash
   node server.js
   ```
7. **Access the App**: Navigate to `http://localhost:3000` in your web browser.

## 📂 Project Structure

```text
DBMS-Project/
├── database/
│   ├── advanced_features.sql
│   ├── queries.sql
│   └── schema.sql
├── public/
│   └── css/style.css
├── views/
│   ├── layout.ejs
│   ├── index.ejs
│   ├── customers.ejs
│   ├── accounts.ejs
│   ├── transactions.ejs
│   └── loans.ejs
├── server.js
├── db.js
├── package.json
└── .env
```
