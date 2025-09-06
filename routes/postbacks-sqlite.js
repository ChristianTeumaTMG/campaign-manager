const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Handle postback from casino
router.post('/:campaignId', [
  body('eventType').isIn(['registration', 'ftd']).withMessage('Event type must be registration or ftd'),
  body('playerId').notEmpty().withMessage('Player ID is required'),
  body('amount').optional().isNumeric().withMessage('Amount must be numeric'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('timestamp').optional().isISO8601().withMessage('Timestamp must be valid ISO date')
], (req, res) => {
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
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND is_active = 1
    `).get(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Create event record
    const insertEvent = req.app.locals.db.prepare(`
      INSERT INTO events (campaign_id, event_type, user_agent, referrer, ip_address, postback_data, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const eventData = {
      playerId,
      amount: amount || 0,
      currency: currency || 'USD',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    };
    
    const metadata = {
      campaignName: campaign.name,
      casino: campaign.casino
    };
    
    insertEvent.run(
      campaignId,
      eventType,
      req.get('User-Agent'),
      req.get('Referer'),
      req.ip || req.connection.remoteAddress,
      JSON.stringify(eventData),
      JSON.stringify(metadata)
    );

    // Update campaign stats
    const stats = JSON.parse(campaign.stats);
    if (eventType === 'ftd') {
      stats.ftds = (stats.ftds || 0) + 1;
    } else {
      stats.registrations = (stats.registrations || 0) + 1;
    }
    
    const updateStats = req.app.locals.db.prepare(`
      UPDATE campaigns SET stats = ? WHERE id = ?
    `);
    updateStats.run(JSON.stringify(stats), campaignId);

    res.json({
      success: true,
      message: 'Postback processed successfully'
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
router.get('/:campaignId/url', (req, res) => {
  try {
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND is_active = 1
    `).get(req.params.campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const postbackUrl = `${baseUrl}/api/postbacks/${campaign.id}`;
    
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

module.exports = router;
