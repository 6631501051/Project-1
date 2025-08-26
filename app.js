const con = require('./db');
const express = require('express');
const bcrypt = require('bcrypt');
const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// password generator
app.get('/password/:pass', (req, res) => {
    const password = req.params.pass;
    bcrypt.hash(password, 10, function(err, hash) {
        if(err) {
            return res.status(500).send('Hashing error');
        }
        res.send(hash);
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
    const {username, password} = req.body;
    const sql = "SELECT id FROM users WHERE username = ?";
    con.query(sql, [username], function(err, results) {
        if(err) {
            return res.status(500).send("Database server error");
        }
        if(results.length > 0) {
            return res.status(409).send("Username already exists");
        }
        // hash password
        bcrypt.hash(password, 10, function(err, hash) {
            if(err) {
                return res.status(500).send("Hashing error");
            }
            const insertSql = "INSERT INTO users (username, password) VALUES (?, ?)";
            con.query(insertSql, [username, hash], function(err, results) {
                if(err) {
                    return res.status(500).send("Database server error");
                }
                res.send("User registered successfully");
            });
        });
    });
});

// ---------- Server starts here ---------
const PORT = 3000;
app.listen(PORT, () => {
    console.log('Server is running at ' + PORT);
});