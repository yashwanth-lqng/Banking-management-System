const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Set EJS as templating engine
app.use(expressLayouts);
app.set('layout', './layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'super_secret_dbms_key',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// ---- AUTH MIDDLEWARE ----
function requireAuth(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

function requireAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') return next();
    res.status(403).send('Forbidden: Admins only. <a href="/">Go Home</a>');
}

// ---- AUTH ROUTES ----
app.get('/login', (req, res) => {
    res.render('login', { layout: false, error: null });
});

app.post('/login', async (req, res) => {
    const { role, username, password } = req.body;
    if (role === 'admin') {
        if (username === 'admin' && password === 'admin') {
            req.session.user = { role: 'admin', name: 'Administrator' };
            return res.redirect('/');
        }
        return res.render('login', { layout: false, error: 'Invalid Admin Credentials' });
    } else {
        try {
            const [users] = await db.query('SELECT * FROM Customers WHERE CustomerID = ? AND Password = ? AND IsActive = TRUE', [username, password]);
            if (users.length > 0) {
                req.session.user = { role: 'customer', id: users[0].CustomerID, name: users[0].Name };
                return res.redirect('/');
            }
            return res.render('login', { layout: false, error: 'Invalid Customer ID or Password' });
        } catch (err) {
            console.error(err);
            return res.render('login', { layout: false, error: 'Database Error!' });
        }
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});


// ---- DASHBOARD ----
app.get('/', requireAuth, async (req, res) => {
    try {
        if (req.session.user.role === 'admin') {
            const [branches] = await db.query('SELECT COUNT(*) as count FROM Branch WHERE IsActive=TRUE');
            const [customers] = await db.query('SELECT COUNT(*) as count FROM Customers WHERE IsActive=TRUE');
            const [accounts] = await db.query('SELECT COUNT(*) as count FROM Accounts WHERE IsActive=TRUE');
            const [loans] = await db.query('SELECT COUNT(*) as count FROM Loans WHERE IsActive=TRUE');

            res.render('index', {
                isCustomer: false,
                branchCount: branches[0].count,
                customerCount: customers[0].count,
                accountCount: accounts[0].count,
                loanCount: loans[0].count
            });
        } else {
            const custId = req.session.user.id;
            const [customerAccounts] = await db.query(`
                SELECT a.AccountNo, a.AccountType, a.Balance 
                FROM Accounts a 
                JOIN Account_holders ah ON a.AccountNo = ah.AccountNo 
                WHERE ah.CustomerID = ? AND a.IsActive = TRUE
            `, [custId]);
            
            res.render('index', {
                isCustomer: true,
                accounts: customerAccounts
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Database connection error');
    }
});

// ----------- BRANCHES (Admin Only) -----------
app.get('/branches', requireAdmin, async (req, res) => {
    try {
        const [branches] = await db.query('SELECT * FROM Branch WHERE IsActive = TRUE');
        res.render('branches', { branches });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading branches');
    }
});

app.post('/branches/add', requireAdmin, async (req, res) => {
    const { branchId, name, address } = req.body;
    try {
        await db.query(`INSERT INTO Branch (BranchID, Name, Address, IsActive) VALUES (?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE Name = VALUES(Name), Address = VALUES(Address), IsActive = TRUE`, 
            [branchId, name, address]);
        res.redirect('/branches');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding branch');
    }
});

app.post('/branches/delete', requireAdmin, async (req, res) => {
    const { branchId } = req.body;
    try {
        // Soft delete
        await db.query('UPDATE Branch SET IsActive = FALSE WHERE BranchID = ?', [branchId]);
        res.redirect('/branches');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting branch');
    }
});

// ----------- CUSTOMERS (Admin Only) -----------
app.get('/customers', requireAdmin, async (req, res) => {
    try {
        const [customers] = await db.query('SELECT * FROM Customers WHERE IsActive = TRUE');
        res.render('customers', { customers });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading customers');
    }
});

app.post('/customers/add', requireAdmin, async (req, res) => {
    const { customerId, name, phone, address, password } = req.body;
    const pwd = password || 'password';
    try {
        await db.query(`INSERT INTO Customers (CustomerID, Name, Phone, Address, Password, IsActive) VALUES (?, ?, ?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE Name = VALUES(Name), Phone = VALUES(Phone), Address = VALUES(Address), Password = VALUES(Password), IsActive = TRUE`, 
            [customerId, name, phone, address, pwd]);
        res.redirect('/customers');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding customer');
    }
});

app.post('/customers/delete', requireAdmin, async (req, res) => {
    const { customerId } = req.body;
    try {
        await db.query('UPDATE Customers SET IsActive = FALSE WHERE CustomerID = ?', [customerId]);
        res.redirect('/customers');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting customer');
    }
});

// ----------- ACCOUNTS (Admin Only) -----------
app.get('/accounts', requireAdmin, async (req, res) => {
    try {
        const [accounts] = await db.query(`
            SELECT a.*, b.Name as BranchName 
            FROM Accounts a 
            LEFT JOIN Branch b ON a.BranchID = b.BranchID
            WHERE a.IsActive = TRUE AND (b.IsActive = TRUE OR b.IsActive IS NULL)
        `);
        const [branches] = await db.query('SELECT BranchID, Name FROM Branch WHERE IsActive=TRUE');
        res.render('accounts', { accounts, branches });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading accounts');
    }
});

app.post('/accounts/add', requireAdmin, async (req, res) => {
    const { accountNo, accountType, balance, branchId, openingDate } = req.body;
    try {
        await db.query(`INSERT INTO Accounts (AccountNo, AccountType, Balance, BranchID, OpeningDate, IsActive) VALUES (?, ?, ?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE AccountType = VALUES(AccountType), Balance = VALUES(Balance), BranchID = VALUES(BranchID), OpeningDate = VALUES(OpeningDate), IsActive = TRUE`, 
            [accountNo, accountType, balance, branchId, openingDate]);
        res.redirect('/accounts');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding account');
    }
});

app.post('/accounts/delete', requireAdmin, async (req, res) => {
    const { accountNo } = req.body;
    try {
        await db.query('UPDATE Accounts SET IsActive = FALSE WHERE AccountNo = ?', [accountNo]);
        res.redirect('/accounts');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting account');
    }
});

// ----------- ACCOUNT HOLDERS (Admin Only) -----------
app.get('/account-holders', requireAdmin, async (req, res) => {
    try {
        const [holders] = await db.query(`
            SELECT ah.*, c.Name as CustomerName 
            FROM Account_holders ah
            JOIN Customers c ON ah.CustomerID = c.CustomerID
            JOIN Accounts a ON ah.AccountNo = a.AccountNo
            WHERE c.IsActive = TRUE AND a.IsActive = TRUE
        `);
        const [customers] = await db.query('SELECT CustomerID, Name FROM Customers WHERE IsActive=TRUE');
        const [accounts] = await db.query('SELECT AccountNo FROM Accounts WHERE IsActive=TRUE');
        res.render('account_holders', { holders, customers, accounts });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading account holders');
    }
});

app.post('/account-holders/add', requireAdmin, async (req, res) => {
    const { customerId, accountNo } = req.body;
    try {
        await db.query('INSERT IGNORE INTO Account_holders (CustomerID, AccountNo) VALUES (?, ?)', [customerId, accountNo]);
        res.redirect('/account-holders');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error linking account holder');
    }
});

app.post('/account-holders/delete', requireAdmin, async (req, res) => {
    const { customerId, accountNo } = req.body;
    try {
        await db.query('DELETE FROM Account_holders WHERE CustomerID = ? AND AccountNo = ?', [customerId, accountNo]);
        res.redirect('/account-holders');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error unlinking account holder');
    }
});

// ----------- TRANSACTIONS -----------
app.get('/transactions', requireAuth, async (req, res) => {
    try {
        if (req.session.user.role === 'admin') {
            const [transactions] = await db.query('SELECT * FROM Transactions ORDER BY Date DESC');
            const [accounts] = await db.query('SELECT AccountNo FROM Accounts WHERE IsActive=TRUE');
            res.render('transactions', { transactions, accounts, isCustomer: false });
        } else {
            const custId = req.session.user.id;
            // Get accounts owned by the user
            const [myAccountsRows] = await db.query(`
                SELECT a.AccountNo 
                FROM Accounts a 
                JOIN Account_holders ah ON a.AccountNo = ah.AccountNo 
                WHERE ah.CustomerID = ? AND a.IsActive = TRUE
            `, [custId]);
            
            const myAccounts = myAccountsRows.map(row => row.AccountNo);
            
            if (myAccounts.length === 0) {
                return res.render('transactions', { transactions: [], accounts: [], isCustomer: true, error: "You do not own any accounts." });
            }

            // Get transactions for those accounts
            const [transactions] = await db.query(`
                SELECT * FROM Transactions 
                WHERE AccountNo IN (?) OR FromAccount IN (?) OR ToAccount IN (?)
                ORDER BY Date DESC
            `, [myAccounts, myAccounts, myAccounts]);

            res.render('transactions', { transactions, accounts: myAccountsRows, isCustomer: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading transactions');
    }
});

// Node.js Level Transactions - Safe ACID wrapper
app.post('/transactions/add', requireAuth, async (req, res) => {
    let { accountNo, type, amount, date } = req.body;
    
    // Ownership check for customers
    if (req.session.user.role === 'customer') {
        const [ownerCheck] = await db.query('SELECT * FROM Account_holders WHERE CustomerID = ? AND AccountNo = ?', [req.session.user.id, accountNo]);
        if (ownerCheck.length === 0) return res.status(403).send('Action forbidden! You do not own this account.');
    }

    if (amount <= 0) return res.status(400).send('Amount must be positive');

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query('INSERT INTO Transactions (AccountNo, Type, Amount, Date) VALUES (?, ?, ?, ?)', [accountNo, type, amount, date || new Date()]);
        await connection.commit();
        res.redirect('/transactions');
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).send('<h3>Transaction Failed:</h3> <p>Insufficient Balance or Data Error</p> <br> <a href="/transactions">Go Back</a>');
    } finally {
        connection.release();
    }
});

// Transfer Money
app.post('/transactions/transfer', requireAuth, async (req, res) => {
    let { fromAccount, toAccount, amount } = req.body;
    
    // Same account block
    if (fromAccount === toAccount) return res.status(400).send("Source and destination accounts cannot be the same.");
    if (amount <= 0) return res.status(400).send("Amount must be positive.");

    // Ownership check
    if (req.session.user.role === 'customer') {
        const [ownerCheck] = await db.query('SELECT * FROM Account_holders WHERE CustomerID = ? AND AccountNo = ?', [req.session.user.id, fromAccount]);
        if (ownerCheck.length === 0) return res.status(403).send('Action forbidden! You do not own the source account.');
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        // Call procedure
        await connection.query('CALL sp_TransferMoney(?, ?, ?)', [fromAccount, toAccount, amount]);
        await connection.commit();
        res.redirect('/transactions');
    } catch (error) {
        await connection.rollback();
        console.error("Stored Procedure Error:", error);
        res.status(500).send(`<h3>Transfer Failed:</h3> <p>${error.message}</p> <br> <a href="/transactions">Go Back</a>`);
    } finally {
        connection.release();
    }
});

// ----------- LOANS -----------
app.get('/loans', requireAuth, async (req, res) => {
    try {
        if (req.session.user.role === 'admin') {
            const [loans] = await db.query(`
                SELECT l.*, c.Name as CustomerName, b.Name as BranchName
                FROM Loans l
                LEFT JOIN Customers c ON l.CustomerID = c.CustomerID
                LEFT JOIN Branch b ON l.BranchID = b.BranchID
                WHERE l.IsActive = TRUE
            `);
            const [customers] = await db.query('SELECT CustomerID, Name FROM Customers WHERE IsActive=TRUE');
            const [branches] = await db.query('SELECT BranchID, Name FROM Branch WHERE IsActive=TRUE');
            res.render('loans', { loans, customers, branches, isCustomer: false });
        } else {
            const custId = req.session.user.id;
            const [loans] = await db.query(`
                SELECT l.*, c.Name as CustomerName, b.Name as BranchName
                FROM Loans l
                LEFT JOIN Customers c ON l.CustomerID = c.CustomerID
                LEFT JOIN Branch b ON l.BranchID = b.BranchID
                WHERE l.IsActive = TRUE AND l.CustomerID = ?
            `, [custId]);
            res.render('loans', { loans, isCustomer: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading loans');
    }
});

app.post('/loans/add', requireAdmin, async (req, res) => {
    const { loanId, loanType, amount, customerId, branchId, interestRate } = req.body;
    try {
        await db.query(`INSERT INTO Loans (LoanID, LoanType, Amount, CustomerID, BranchID, InterestRate, IsActive) VALUES (?, ?, ?, ?, ?, ?, TRUE)
            ON DUPLICATE KEY UPDATE LoanType = VALUES(LoanType), Amount = VALUES(Amount), CustomerID = VALUES(CustomerID), BranchID = VALUES(BranchID), InterestRate = VALUES(InterestRate), IsActive = TRUE`, 
            [loanId, loanType, amount, customerId, branchId, interestRate]);
        res.redirect('/loans');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding loan');
    }
});

app.post('/loans/delete', requireAdmin, async (req, res) => {
    const { loanId } = req.body;
    try {
        await db.query('UPDATE Loans SET IsActive = FALSE WHERE LoanID = ?', [loanId]);
        res.redirect('/loans');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error deleting loan');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
