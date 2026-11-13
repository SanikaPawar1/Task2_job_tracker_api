const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
  deleteApplication
} = require('../controllers/applicationController');

const router = express.Router();

// Protect every supported application endpoint before calling its controller.
router.post('/', authMiddleware, createApplication);
router.get('/', authMiddleware, listApplications);
router.get('/:id', authMiddleware, getApplication);
router.put('/:id', authMiddleware, updateApplication);
router.delete('/:id', authMiddleware, deleteApplication);

module.exports = router;
