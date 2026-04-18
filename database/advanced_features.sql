USE banking_system;

-- ==========================================
-- 1. VIEWS & INDEXES
-- ==========================================
CREATE OR REPLACE VIEW Customer_Accounts AS
SELECT c.Name, a.AccountNo, a.Balance, a.AccountType, a.IsActive
FROM Customers c
JOIN Account_holders ah ON c.CustomerID = ah.CustomerID
JOIN Accounts a ON ah.AccountNo = a.AccountNo;

CREATE INDEX idx_account ON Accounts(AccountNo);
CREATE INDEX idx_customer ON Customers(CustomerID);

-- ==========================================
-- 2. PROCEDURES
-- ==========================================
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_TransferMoney $$
CREATE PROCEDURE sp_TransferMoney(
    IN p_FromAccount INT,
    IN p_ToAccount INT,
    IN p_Amount DECIMAL(10,2)
)
BEGIN
    DECLARE current_balance DECIMAL(10,2);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT Balance INTO current_balance 
    FROM Accounts 
    WHERE AccountNo = p_FromAccount 
    FOR UPDATE;

    IF current_balance >= p_Amount THEN
        -- Insert a Single Transfer Transaction
        INSERT INTO Transactions (FromAccount, ToAccount, Type, Amount, Date)
        VALUES (p_FromAccount, p_ToAccount, 'Transfer', p_Amount, CURDATE());
        
        COMMIT;
    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient Funds for Transfer';
    END IF;
END$$

DROP PROCEDURE IF EXISTS ApplyInterest $$
CREATE PROCEDURE ApplyInterest()
BEGIN
    UPDATE Accounts
    SET Balance = Balance + (Balance * 0.04)
    WHERE AccountType = 'Savings' AND IsActive = TRUE;
END$$
DELIMITER ;

-- ==========================================
-- 3. TRIGGERS
-- ==========================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_BeforeInsertTransaction $$
CREATE TRIGGER trg_BeforeInsertTransaction
BEFORE INSERT ON Transactions
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(10,2);

    IF NEW.Type = 'Withdraw' THEN
        SELECT Balance INTO current_balance FROM Accounts WHERE AccountNo = NEW.AccountNo;
        IF current_balance < NEW.Amount THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient Balance';
        END IF;
    ELSEIF NEW.Type = 'Transfer' THEN
        SELECT Balance INTO current_balance FROM Accounts WHERE AccountNo = NEW.FromAccount;
        IF current_balance < NEW.Amount THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient Balance';
        END IF;
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_UpdateBalance $$
CREATE TRIGGER trg_UpdateBalance
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
    IF NEW.Type = 'Deposit' THEN
        UPDATE Accounts SET Balance = Balance + NEW.Amount WHERE AccountNo = NEW.AccountNo;
    ELSEIF NEW.Type = 'Withdraw' THEN
        UPDATE Accounts SET Balance = Balance - NEW.Amount WHERE AccountNo = NEW.AccountNo;
    ELSEIF NEW.Type = 'Transfer' THEN
        UPDATE Accounts SET Balance = Balance - NEW.Amount WHERE AccountNo = NEW.FromAccount;
        UPDATE Accounts SET Balance = Balance + NEW.Amount WHERE AccountNo = NEW.ToAccount;
    END IF;

    -- Fraud Detection Rule
    IF NEW.Amount >= 100000 THEN
        INSERT INTO Audit_Log (Action, TableName, Timestamp, Details) 
        VALUES ('FRAUD_ALERT', 'Transactions', NOW(), CONCAT('P_Alert: Triggered heavily funded transaction ID: ', IFNULL(NEW.TransactionID, 'Pending'), ' for Amount: ', NEW.Amount));
    END IF;
END$$

DELIMITER ;
