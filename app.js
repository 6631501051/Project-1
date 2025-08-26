const con = require('./db');
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// password generator
app.get('/password/:pass', (req, res) => {
  const password = req.params.pass;
  bcrypt.hash(password, 10, function (err, hash) {
    if (err) {
      return res.status(500).send('Hashing error');
    }
    res.send(hash);
  });
});

// login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT id, password FROM users WHERE username = ?";
  con.query(sql, [username], (err, results) => {
    if (err) return res.status(500).send("Database server error");
    if (results.length !== 1) return res.status(401).send("Wrong username");

    bcrypt.compare(password, results[0].password, (err, same) => {
      if (err) return res.status(500).send("Hashing error");
      if (!same) return res.status(401).send("Wrong password");
      return res.json({ ok: true, userId: results[0].id, username });
    });
  });
});


app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT id FROM users WHERE username = ?";
  con.query(sql, [username], function (err, results) {
    if (err) {
      return res.status(500).send("Database server error");
    }
    if (results.length > 0) {
      return res.status(409).send("Username already exists");
    }
    // hash password
    bcrypt.hash(password, 10, function (err, hash) {
      if (err) {
        return res.status(500).send("Hashing error");
      }
      const insertSql = "INSERT INTO users (username, password) VALUES (?, ?)";
      con.query(insertSql, [username, hash], function (err, results) {
        if (err) {
          return res.status(500).send("Database server error");
        }
        res.send("User registered successfully");
      });
    });
  });
});

// ALL expenses of a user
app.get('/expenses', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send("Missing userId");

  const sql = `
    SELECT item, paid, date
    FROM expense
    WHERE user_id = ?
    ORDER BY date ASC
  `;
  con.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).send("Database server error");
    const total = rows.reduce((s, r) => s + Number(r.paid), 0);
    res.json({ rows, total });
  });
});

// TODAY's expenses of a user
app.get('/expenses/today', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send("Missing userId");

  const sql = `
    SELECT item, paid, date
    FROM expense
    WHERE user_id = ? AND DATE(date) = CURDATE()
    ORDER BY date ASC
  `;
  con.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).send("Database server error");
    const total = rows.reduce((s, r) => s + Number(r.paid), 0);
    res.json({ rows, total });
  });
});

app.get('/expenses/search', (req, res) => {
  const userId = req.query.userId;
  const keyword = req.query.keyword;

  if (!userId || !keyword) return res.status(400).send("Missing userId or keyword");

  const sql = `
    SELECT item, paid, date
    FROM expense
    WHERE user_id = ? AND item LIKE ?
    ORDER BY date ASC
  `;

  con.query(sql, [userId, `%${keyword}%`], (err, rows) => {
    if (err) return res.status(500).send("Database server error");
    const total = rows.reduce((s, r) => s + Number(r.paid), 0);
    res.json({ rows, total });
  });
});

// Add a new expense
app.post('/expenses', (req, res) => {
  const { userId, item, paid, date } = req.body;
  if (!userId || !item || !paid || !date) return res.status(400).send("Missing required fields");
  const sql = "INSERT INTO expense (user_id, item, paid, date) VALUES (?, ?, ?, ?)";
  con.query(sql, [userId, item, paid, date], (err, result) => {
    if (err) return res.status(500).send("Database server error");
    res.json({ ok: true, id: result.insertId });
  });
});

// Delete an expense by display number
app.delete('/expenses/:id', (req, res) => {
    const displayNumber = parseInt(req.params.id);
    const userId = req.query.userId;
    if (!userId || !displayNumber || isNaN(displayNumber)) {
        return res.status(400).send("Missing or invalid userId or display number");
    }

    // Fetch all expenses for the user to map display number to database ID
    const fetchSql = `
        SELECT id
        FROM expense
        WHERE user_id = ?
        ORDER BY date ASC
    `;
    con.query(fetchSql, [userId], (err, rows) => {
        if (err) return res.status(500).send("Database server error");
        if (rows.length === 0) return res.status(404).send("No expenses found");
        if (displayNumber < 1 || displayNumber > rows.length) {
            return res.status(400).send("Invalid display number");
        }

        // Map display number to database ID
        const expenseId = rows[displayNumber - 1].id;

        // Delete the expense
        const deleteSql = "DELETE FROM expense WHERE id = ? AND user_id = ?";
        con.query(deleteSql, [expenseId, userId], (err, result) => {
            if (err) return res.status(500).send("Database server error");
            if (result.affectedRows === 0) {
                return res.status(404).send("Expense not found or not authorized");
            }
            res.json({ ok: true });
        });
    });
});



// ---------- Server starts here ---------
const PORT = 3000;
app.listen(PORT, () => {
  console.log('Server is running at ' + PORT);
});