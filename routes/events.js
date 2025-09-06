const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');

// Track events from the injected script
router.post('/track', async (req, res) => {
  try {
    const { campaignId, eventType, userAgent, referrer, cookieData, metadata } = req.body;

    // Validate required fields
    if (!campaignId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Verify campaign exists and is active
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || !campaign.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or inactive'
      });
    }

    // Create event record
    const event = new Event({
      campaignId,
      eventType,
      userAgent,
      referrer,
      cookieData,
      ipAddress: req.ip || req.connection.remoteAddress,
      metadata: {
        ...metadata,
        campaignName: campaign.name,
        casino: campaign.casino
      }
    });

    await event.save();

    // Update campaign stats for cookie_set events
    if (eventType === 'cookie_set') {
      await campaign.updateStats('cookieSets');
    }

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });

  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

module.exports = router;
