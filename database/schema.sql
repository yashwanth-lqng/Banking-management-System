CREATE DATABASE IF NOT EXISTS banking_system;
USE banking_system;

CREATE TABLE IF NOT EXISTS Branch (
    BranchID INT PRIMARY KEY,
    Name VARCHAR(50) NOT NULL,
    Address VARCHAR(100),
    IsActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Customers (
    CustomerID INT PRIMARY KEY,
    Name VARCHAR(30) NOT NULL,
    Phone VARCHAR(15),
    Address VARCHAR(100),
    Password VARCHAR(255) DEFAULT 'password',
    IsActive BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS Accounts (
    AccountNo INT PRIMARY KEY,
    AccountType VARCHAR(20),
    Balance DECIMAL(10,2) CHECK (Balance >= 0),
    BranchID INT,
    OpeningDate DATE,
    IsActive BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (BranchID) REFERENCES Branch(BranchID)
);

-- Note: MySQL 8.0.16+ fully supports CHECK constraints. 
-- For older versions, the constraint is parsed but ignored, which is fine.

ALTER TABLE Accounts
ADD CONSTRAINT chk_account_type
CHECK (AccountType IN ('Savings','Current'));

CREATE TABLE IF NOT EXISTS Account_holders (
    CustomerID INT,
    AccountNo INT,
    PRIMARY KEY (CustomerID, AccountNo),
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (AccountNo) REFERENCES Accounts(AccountNo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Transactions (
    TransactionID INT AUTO_INCREMENT PRIMARY KEY,
    AccountNo INT NULL,
    FromAccount INT NULL,
    ToAccount INT NULL,
    Type VARCHAR(20) CHECK (Type IN ('Deposit','Withdraw','Transfer')),
    Amount DECIMAL(10,2) CHECK (Amount > 0),
    Date DATE,
    FOREIGN KEY (AccountNo) REFERENCES Accounts(AccountNo) ON DELETE CASCADE,
    FOREIGN KEY (FromAccount) REFERENCES Accounts(AccountNo) ON DELETE CASCADE,
    FOREIGN KEY (ToAccount) REFERENCES Accounts(AccountNo) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Audit_Log (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    Action VARCHAR(50),
    TableName VARCHAR(50),
    Timestamp DATETIME,
    Details TEXT
);

CREATE TABLE IF NOT EXISTS Loans (
    LoanID INT PRIMARY KEY,
    LoanType VARCHAR(30),
    Amount DECIMAL(10,2),
    CustomerID INT,
    BranchID INT,
    InterestRate DECIMAL(5,2),
    IsActive BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (BranchID) REFERENCES Branch(BranchID) ON DELETE SET NULL
);

-- Insert sample data
INSERT IGNORE INTO Branch (BranchID, Name, Address) VALUES
(1, 'Main Branch', 'Hyderabad'),
(2, 'City Branch', 'Vijayawada'),
(3, 'North Branch', 'Visakhapatnam'),
(4, 'South Branch', 'Chennai');

INSERT IGNORE INTO Customers (CustomerID, Name, Phone, Address) VALUES
(101, 'Ravi Kumar', '9876543210', 'Hyderabad'),
(102, 'Anita Sharma', '9123456780', 'Vijayawada'),
(103, 'Suresh Reddy', '9988776655', 'Visakhapatnam'),
(104, 'Priya Nair', '9012345678', 'Chennai'),
(105, 'Arjun Mehta', '9090909090', 'Hyderabad');

INSERT IGNORE INTO Accounts (AccountNo, AccountType, Balance, BranchID, OpeningDate) VALUES
(1001, 'Savings', 5000.00, 1, '2024-01-10'),
(1002, 'Current', 15000.00, 2, '2024-02-15'),
(1003, 'Savings', 8000.00, 3, '2024-03-20'),
(1004, 'Savings', 12000.00, 4, '2024-04-05'),
(1005, 'Current', 20000.00, 1, '2024-05-12');

INSERT IGNORE INTO Account_holders (CustomerID, AccountNo) VALUES
(101, 1001),
(102, 1002),
(103, 1003),
(104, 1004),
(105, 1005),
(101, 1005);

INSERT IGNORE INTO Transactions (TransactionID, AccountNo, FromAccount, ToAccount, Type, Amount, Date) VALUES
(1, 1001, NULL, NULL, 'Deposit', 2000.00, '2024-06-01'),
(2, 1002, NULL, NULL, 'Withdraw', 3000.00, '2024-06-02'),
(3, 1003, NULL, NULL, 'Deposit', 1500.00, '2024-06-03'),
(4, NULL, 1004, 1003, 'Transfer', 2500.00, '2024-06-04'),
(5, 1005, NULL, NULL, 'Deposit', 5000.00, '2024-06-05');

INSERT IGNORE INTO Loans (LoanID, LoanType, Amount, CustomerID, BranchID, InterestRate) VALUES
(201, 'Home Loan', 500000.00, 101, 1, 7.5),
(202, 'Car Loan', 300000.00, 102, 2, 8.0),
(203, 'Education Loan', 200000.00, 103, 3, 6.5),
(204, 'Personal Loan', 100000.00, 104, 4, 9.0),
(205, 'Business Loan', 750000.00, 105, 1, 10.0);
