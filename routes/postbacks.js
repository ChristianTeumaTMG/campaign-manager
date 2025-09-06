const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const { body, validationResult } = require('express-validator');

// Handle postback from casino
router.post('/:campaignId', [
  body('eventType').isIn(['registration', 'ftd']).withMessage('Event type must be registration or ftd'),
  body('playerId').notEmpty().withMessage('Player ID is required'),
  body('amount').optional().isNumeric().withMessage('Amount must be numeric'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('timestamp').optional().isISO8601().withMessage('Timestamp must be valid ISO date')
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

    const { campaignId } = req.params;
    const { eventType, playerId, amount, currency, timestamp } = req.body;

    // Find campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Create event record
    const event = new Event({
      campaignId,
      eventType,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      postbackData: {
        playerId,
        amount: amount || 0,
        currency: currency || 'USD',
        timestamp: timestamp ? new Date(timestamp) : new Date()
      },
      metadata: {
        campaignName: campaign.name,
        casino: campaign.casino
      }
    });

    await event.save();

    // Update campaign stats
    await campaign.updateStats(eventType === 'ftd' ? 'ftds' : 'registrations');

    // Log the postback for debugging
    console.log(`Postback received for campaign ${campaign.name}:`, {
      eventType,
      playerId,
      amount,
      currency,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Postback processed successfully',
      eventId: event._id
    });

  } catch (error) {
    console.error('Postback processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process postback'
    });
  }
});

// Get postback URL for campaign
router.get('/:campaignId/url', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const postbackUrl = `${baseUrl}/api/postbacks/${campaign._id}`;
    
    res.json({
      success: true,
      data: {
        postbackUrl,
        campaignName: campaign.name,
        casino: campaign.casino
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate postback URL'
    });
  }
});

// Test postback endpoint (for development)
router.post('/:campaignId/test', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const testData = {
      eventType: 'registration',
      playerId: 'test_player_' + Date.now(),
      amount: 100,
      currency: 'USD',
      timestamp: new Date().toISOString()
    };

    // Forward to main postback handler
    req.body = testData;
    return router.handle(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test postback failed'
    });
  }
});

module.exports = router;
