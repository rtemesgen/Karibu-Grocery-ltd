const express = require('express');
const Activity = require('../models/Activity');

const router = express.Router();

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// GET all activity logs
router.get('/', async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET activity by user
router.get('/user/:username', async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.params.username })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET activity by module
router.get('/module/:module', async (req, res) => {
  try {
    const activities = await Activity.find({ module: req.params.module })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST log activity
router.post('/', async (req, res) => {
  try {
    const activity = new Activity({
      activityId: generateId(),
      ...req.body,
    });

    const savedActivity = await activity.save();
    res.status(201).json(savedActivity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE activity log
router.delete('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.status(200).json({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE all activity logs (admin only)
router.delete('/', async (req, res) => {
  try {
    const result = await Activity.deleteMany({});
    res.status(200).json({ message: 'All activities cleared', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
