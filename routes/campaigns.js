const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const { body, validationResult } = require('express-validator');

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

// Create new campaign
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required and must be less than 100 characters'),
  body('casino').trim().isLength({ min: 1, max: 100 }).withMessage('Casino is required and must be less than 100 characters'),
  body('postbackUrl').isURL().withMessage('Valid postback URL is required'),
  body('templateConfig.cookieA.name').notEmpty().withMessage('Cookie A name is required'),
  body('templateConfig.cookieA.value').notEmpty().withMessage('Cookie A value is required'),
  body('templateConfig.cookieA.domain').notEmpty().withMessage('Cookie A domain is required'),
  body('templateConfig.cookieA.expiry').isISO8601().withMessage('Cookie A expiry must be a valid date'),
  body('templateConfig.cookieB.name').notEmpty().withMessage('Cookie B name is required'),
  body('templateConfig.cookieB.value').notEmpty().withMessage('Cookie B value is required'),
  body('templateConfig.cookieB.domain').notEmpty().withMessage('Cookie B domain is required'),
  body('templateConfig.cookieB.expiry').isISO8601().withMessage('Cookie B expiry must be a valid date'),
  body('templateConfig.referrerRegex').notEmpty().withMessage('Referrer regex is required'),
  body('templateConfig.cookieARegex').notEmpty().withMessage('Cookie A regex is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const campaignData = {
      ...req.body,
      createdBy: req.body.createdBy || 'system'
    };

    const campaign = new Campaign(campaignData);
    
    // Generate unique script URL
    campaign.generateScriptUrl();
    
    await campaign.save();
    
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        error: 'Campaign with this name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create campaign'
      });
    }
  }
});

// Update campaign
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('casino').optional().trim().isLength({ min: 1, max: 100 }),
  body('postbackUrl').optional().isURL(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      data: campaign,
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign'
    });
  }
});

// Delete campaign (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

// Get campaign stats
router.get('/:id/stats', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        stats: campaign.stats,
        conversionRates: campaign.conversionRates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign stats'
    });
  }
});

module.exports = router;
