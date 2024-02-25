const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());

// Middleware to restrict domain
const restrictDomain = (req, res, next) => {
  const allowedOrigins = ['https://example.com']; // Add your allowed domain(s) here
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    next();
  } else {
    res.status(403).json({ message: 'Forbidden' });
  }
};

// Apply the middleware to all routes
app.use(restrictDomain);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/song_market', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define MongoDB schemas
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const SongSchema = new mongoose.Schema({
  title: String,
  artist: String,
  category: String,
  file: String,
});

const BannerSchema = new mongoose.Schema({
  title: String,
  image: String,
});

// Define MongoDB models
const User = mongoose.model('User', UserSchema);
const Song = mongoose.model('Song', SongSchema);
const Banner = mongoose.model('Banner', BannerSchema);

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    cb(null, uploadPath); // Files will be stored in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  }
});

const upload = multer({ storage: storage });

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }
  jwt.verify(token, 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Login API
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CRUD songs routes (protected by JWT authentication)

// Create a song
app.post('/songs', authenticateJWT, async (req, res) => {
  try {
    const { title, artist, category, file } = req.body;
    const song = new Song({ title, artist, category, file });
    await song.save();
    res.status(201).json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Read all songs
app.get('/songs', authenticateJWT, async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Read a single song by ID
app.get('/songs/:id', authenticateJWT, async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json(song);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a song by ID
app.put('/songs/:id', authenticateJWT, async (req, res) => {
  try {
    const { title, artist, category, file } = req.body;
    const updatedSong = await Song.findByIdAndUpdate(req.params.id, { title, artist, category, file }, { new: true });
    if (!updatedSong) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json(updatedSong);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a song by ID
app.delete('/songs/:id', authenticateJWT, async (req, res) => {
  try {
    const deletedSong = await Song.findByIdAndDelete(req.params.id);
    if (!deletedSong) {
      return res.status(404).json({ message: 'Song not found' });
    }
    res.json({ message: 'Song deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CRUD banners routes (protected by JWT authentication)

// Create a banner
app.post('/banners', authenticateJWT, async (req, res) => {
  try {
    const { title, image } = req.body;
    const banner = new Banner({ title, image });
    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Read all banners
app.get('/banners', authenticateJWT, async (req, res) => {
  try {
    const banners = await Banner.find();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Read a single banner by ID
app.get('/banners/:id', authenticateJWT, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a banner by ID
app.put('/banners/:id', authenticateJWT, async (req, res) => {
  try {
    const { title, image } = req.body;
    const updatedBanner = await Banner.findByIdAndUpdate(req.params.id, { title, image }, { new: true });
    if (!updatedBanner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    res.json(updatedBanner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a banner by ID
app.delete('/banners/:id', authenticateJWT, async (req, res) => {
  try {
    const deletedBanner = await Banner.findByIdAndDelete(req.params.id);
    if (!deletedBanner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload song file
app.post('/uploadSong', upload.single('song'), (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error('Please upload a file');
    error.httpStatusCode = 400;
    return next(error);
  }
  res.send(file);
});

// Upload banner image
app.post('/uploadBanner', upload.single('image'), (req, res, next) => {
  const file = req.file;
  if (!file) {
    const error = new Error('Please upload a file');
    error.httpStatusCode = 400;
    return next(error);
  }
  res.send(file);
});

// Define seed data for users
const usersSeedData = [
  {
    username: 'user1',
    email: 'user1@example.com',
    password: 'password1' // It's recommended to hash passwords before saving them
  },
  {
    username: 'user2',
    email: 'user2@example.com',
    password: 'password2'
  },
  {
    username: 'user3',
    email: 'user3@example.com',
    password: 'password3'
  },
  {
    username: 'user4',
    email: 'user4@example.com',
    password: 'password4'
  },
  {
    username: 'user5',
    email: 'user5@example.com',
    password: 'password5'
  },
  {
    username: 'user6',
    email: 'user6@example.com',
    password: 'password6'
  },
  {
    username: 'user7',
    email: 'user7@example.com',
    password: 'password7'
  },
  {
    username: 'user8',
    email: 'user8@example.com',
    password: 'password8'
  },
  {
    username: 'user9',
    email: 'user9@example.com',
    password: 'password9'
  },
  {
    username: 'user10',
    email: 'user10@example.com',
    password: 'password10'
  },
  {
    username: 'user11',
    email: 'user11@example.com',
    password: 'password11'
  },
  {
    username: 'user12',
    email: 'user12@example.com',
    password: 'password12'
  },
  {
    username: 'user13',
    email: 'user13@example.com',
    password: 'password13'
  },
  {
    username: 'user14',
    email: 'user14@example.com',
    password: 'password14'
  },
  {
    username: 'user15',
    email: 'user15@example.com',
    password: 'password15'
  },
  {
    username: 'user16',
    email: 'user16@example.com',
    password: 'password16'
  },
  {
    username: 'user17',
    email: 'user17@example.com',
    password: 'password17'
  },
  {
    username: 'user18',
    email: 'user18@example.com',
    password: 'password18'
  },
  {
    username: 'user19',
    email: 'user19@example.com',
    password: 'password19'
  },
  {
    username: 'user20',
    email: 'user20@example.com',
    password: 'password20'
  },
];

// Define seed data for songs
const songsSeedData = [
  {
    title: 'Song 1',
    artist: 'Artist 1',
    category: 'Category 1',
    file: 'song1.mp3'
  },
  {
    title: 'Song 2',
    artist: 'Artist 2',
    category: 'Category 2',
    file: 'song2.mp3'
  },
  {
    title: 'Song 3',
    artist: 'Artist 3',
    category: 'Category 3',
    file: 'song3.mp3'
  },
  {
    title: 'Song 4',
    artist: 'Artist 4',
    category: 'Category 4',
    file: 'song4.mp3'
  },
  {
    title: 'Song 5',
    artist: 'Artist 5',
    category: 'Category 5',
    file: 'song5.mp3'
  },
  {
    title: 'Song 6',
    artist: 'Artist 6',
    category: 'Category 6',
    file: 'song6.mp3'
  },
  {
    title: 'Song 7',
    artist: 'Artist 7',
    category: 'Category 7',
    file: 'song7.mp3'
  },
  {
    title: 'Song 8',
    artist: 'Artist 8',
    category: 'Category 8',
    file: 'song8.mp3'
  },
  {
    title: 'Song 9',
    artist: 'Artist 9',
    category: 'Category 9',
    file: 'song9.mp3'
  },
  {
    title: 'Song 10',
    artist: 'Artist 10',
    category: 'Category 10',
    file: 'song10.mp3'
  },
  {
    title: 'Song 11',
    artist: 'Artist 11',
    category: 'Category 11',
    file: 'song11.mp3'
  },
  {
    title: 'Song 12',
    artist: 'Artist 12',
    category: 'Category 12',
    file: 'song12.mp3'
  },
  {
    title: 'Song 13',
    artist: 'Artist 13',
    category: 'Category 13',
    file: 'song13.mp3'
  },
  {
    title: 'Song 14',
    artist: 'Artist 14',
    category: 'Category 14',
    file: 'song14.mp3'
  },
  {
    title: 'Song 15',
    artist: 'Artist 15',
    category: 'Category 15',
    file: 'song15.mp3'
  },
  {
    title: 'Song 16',
    artist: 'Artist 16',
    category: 'Category 16',
    file: 'song16.mp3'
  },
  {
    title: 'Song 17',
    artist: 'Artist 17',
    category: 'Category 17',
    file: 'song17.mp3'
  },
  {
    title: 'Song 18',
    artist: 'Artist 18',
    category: 'Category 18',
    file: 'song18.mp3'
  },
  {
    title: 'Song 19',
    artist: 'Artist 19',
    category: 'Category 19',
    file: 'song19.mp3'
  },
  {
    title: 'Song 20',
    artist: 'Artist 20',
    category: 'Category 20',
    file: 'song20.mp3'
  },
];

// Seed users
const seedUsers = async () => {
  try {
    await User.deleteMany(); // Clear existing users
    // Hash passwords before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPasswords = await Promise.all(usersSeedData.map(async user => {
      const hashedPassword = await bcrypt.hash(user.password, salt);
      return { ...user, password: hashedPassword };
    }));
    await User.insertMany(hashedPasswords);
    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error.message);
  }
};

// Seed songs
const seedSongs = async () => {
  try {
    await Song.deleteMany(); // Clear existing songs
    await Song.insertMany(songsSeedData);
    console.log('Songs seeded successfully');
  } catch (error) {
    console.error('Error seeding songs:', error.message);
  }
};

// Run seed functions
seedUsers();
seedSongs();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


const transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io',
  port: 2525, // or whatever port Mailtrap provides
  auth: {
      user: 'abcxyz',
      pass: '123456'
  }
});

const mailOptions = {
  from: 'abc@xyz.com',
  to: '123@456.com',
  subject: 'Test Email',
  text: 'This is a test email sent using Mailtrap.'
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
      console.log(error);
  } else {
      console.log('Email sent: ' + info.response);
  }
});