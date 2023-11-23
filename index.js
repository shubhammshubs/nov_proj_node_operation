// // index.js
// const express = require('express');
// const mysql = require('mysql2');
// const bodyParser = require('body-parser');

// const app = express();
// const port = 3000;

// // Middleware
// app.use(bodyParser.json()); // Parse incoming JSON requests

// // MySQL Connection
// const db = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: 'root',
//   database: 'trifrnd_operations',
// });

// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL:', err);
//   } else {
//     console.log('Connected to MySQL database');
//   }
// });

// // API Endpoints
// app.post('/api/users', (req, res) => {
//   const { name, email, mobile, gender, password, profileImage } = req.body;
//   const insertQuery = `INSERT INTO users (name, email, mobile, gender, password, profileImage) VALUES (?, ?, ?, ?, ?, ?)`;
//   const values = [name, email, mobile, gender, password, profileImage];

//   db.query(insertQuery, values, (err, results) => {
//     if (err) {
//       console.error('Error inserting user:', err);
//       res.status(500).json({ error: 'Error inserting user' });
//     } else {
//       res.json({ message: 'User inserted successfully', userId: results.insertId });
//     }
//   });
// });

// // Additional Endpoints for Retrieving, Updating, and Deleting Users can be added here

// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
// });
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cors = require('cors');


const app = express();
app.use(cors());
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.memoryStorage(); // Use memory storage for storing image as Buffer
const upload = multer({ storage: storage });

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'trifrnd_operations',
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

pool.getConnection((err, connection) => {
    if (err) {
      throw err;
    }
    console.log('Connected to MySQL database');
    connection.release(); // Release the connection immediately after obtaining it
  });
  

// app.post('/api/users', upload.single('profileImage'), async (req, res) => {
//   try {
//     const { name, email, mobile, gender, password } = req.body;
//     const fileBuffer = req.file.buffer; // Use buffer to store image data

//     // Save file information to MySQL database
//     const connection = await pool.getConnection();
//     const [result] = await connection.query(
//       'INSERT INTO users (name, email, mobile, gender, password, profileImage) VALUES (?, ?, ?, ?, ?, ?)',
//       [name, email, mobile, gender, password, fileBuffer]
//     );
//     connection.release();

//     res.json({
//       success: 1,
//       message: 'User added to the database',
//     });
//   } catch (err) {
//     console.error(err);
//     res.json({
//       success: 0,
//       message: 'Error uploading file to MySQL database',
//     });
//   }
// });


// THis code will display the image based on imagename => http://localhost:3000/profile/profileImage_1700297450366.png 
// The url for this code is => http://localhost:3000/api/users
app.post('/api/users', upload.single('profileImage'), async (req, res) => {
  try {
      const { name, email, mobile, gender, password } = req.body;
      const profileImageFilename = `${req.file.fieldname}_${Date.now()}${path.extname(req.file.originalname)}`;
      const fileBuffer = req.file.buffer;

      console.log('Received file:', req.file);

      const connection = await pool.getConnection();
      const [result] = await connection.query(
          'INSERT INTO users (name, email, mobile, gender, password, profileImage, profileImageFilename) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [name, email, mobile, gender, password, fileBuffer, profileImageFilename]
      );
      connection.release();

      if (result && result.affectedRows > 0) {
          res.json({
              success: 1,
              message: "User created successfully",
              // profile_url: `http://localhost:3000/profile/${profileImageFilename}`,
              // profile_url2: `http://localhost:3000/api/users/${mobile}`
          });
      } else {
          console.error('Error creating user in the database');
          res.json({
              success: 0,
              message: "Error creating user in the database"
          });
      }
  } catch (err) {
      console.error(err);
      res.json({
          success: 0,
          message: "Error uploading file to MySQL database"
      });
  }
});



// To display the information use this url = http://localhost:3000/api/users/{mobile}

app.get('/api/users/:mobile', async (req, res) => {
  const mobile = req.params.mobile;
  const sql = 'SELECT * FROM users WHERE mobile = ?';

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(sql, [mobile]);
    connection.release();

    if (result.length > 0) {
      const user = result[0];

      // Prepare the user data
      const { id, name, email, mobile, gender, password, profileImage } = user;
      const userData = { id, name, email, mobile, gender, password };

      // If there's a profile image, include it in the response
      if (profileImage) {
        userData.profileImage = profileImage.toString('base64');
      }

      res.json(userData);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Assuming you have a route for handling image retrieval
app.get('/profile/:filename', async (req, res) => {
    const filename = req.params.filename;

    try {
        const connection = await pool.getConnection();
        const [result] = await connection.query('SELECT profileImage FROM users WHERE profileImageFilename = ?', [filename]);
        connection.release();

        if (result.length > 0) {
            const imageBuffer = result[0].profileImage;

            // Set the correct content type based on the file extension
            const contentType = path.extname(filename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': imageBuffer.length,
            });
            res.end(imageBuffer);
        } else {
            res.status(404).send('Image not found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
// This code will display the image based on usersId . => http://localhost:3000/api/profile/{userId}

// // Assuming you have a route for handling image retrieval
// app.get('/api/profile/:userId', async (req, res) => {
//   const userId = req.params.userId;

//   try {
//     const connection = await pool.getConnection();
//     const [result] = await connection.query('SELECT profileImage FROM users WHERE id = ?', [userId]);
//     connection.release();

//     if (result.length > 0) {
//       const imageBuffer = result[0].profileImage;

//       // Set the correct content type based on the file extension
//       res.writeHead(200, {
//         'Content-Type': 'image/jpeg', // Update this based on your file types
//         'Content-Length': imageBuffer.length,
//       });
//       res.end(imageBuffer);
//     } else {
//       res.status(404).send('Image not found');
//     }
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Internal Server Error');
//   }
// });





// This code will display the image based on mobile . => http://localhost:3000/api/profile/{mobile}


// Assuming you have a route for handling image retrieval
app.get('/api/profile/:mobile', async (req, res) => {
    const mobile = req.params.mobile;
  
    try {
      const connection = await pool.getConnection();
      const [result] = await connection.query('SELECT profileImage FROM users WHERE mobile = ?', [mobile]);
      connection.release();
  
      if (result.length > 0) {
        const imageBuffer = result[0].profileImage;
  
        // Set the correct content type based on the file extension
        res.writeHead(200, {
          'Content-Type': 'image/jpeg', // Update this based on your file types
          'Content-Length': imageBuffer.length,
        });
        res.end(imageBuffer);
      } else {
        console.log(`Image not found for mobile: ${mobile}`);
        res.status(404).send('Image not found asd');
      }
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });
  

  
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
