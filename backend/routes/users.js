const express = require('express');
const User = require('../models/User');

const router = express.Router();

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST seed default users
router.post('/seed', async (req, res) => {
  try {
    const existingUsers = await User.find();
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Users already exist' });
    }

    const seedUsers = [
      {
        username: 'admin', password: 'admin', role: 'admin', branch: 'Admin',
      },
      {
        username: 'maganjo_manager', password: 'password', role: 'manager', branch: 'Maganjo',
      },
      {
        username: 'maganjo_attendant1',
        password: 'password',
        role: 'attendant',
        branch: 'Maganjo',
      },
      {
        username: 'maganjo_attendant2',
        password: 'password',
        role: 'attendant',
        branch: 'Maganjo',
      },
      {
        username: 'matugga_manager', password: 'password', role: 'manager', branch: 'Matugga',
      },
      {
        username: 'matugga_attendant1',
        password: 'password',
        role: 'attendant',
        branch: 'Matugga',
      },
      {
        username: 'matugga_attendant2',
        password: 'password',
        role: 'attendant',
        branch: 'Matugga',
      },
    ];

    const users = await User.insertMany(seedUsers);
    res.status(201).json({ message: 'Users seeded', count: users.length, users });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      branch: user.branch,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create user
router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    const savedUser = await user.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE user (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'User deleted', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
