const express = require('express');
const router = express.Router();

// Track events from the injected script
router.post('/track', (req, res) => {
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
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND is_active = 1
    `).get(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or inactive'
      });
    }

    // Create event record
    const insertEvent = req.app.locals.db.prepare(`
      INSERT INTO events (campaign_id, event_type, user_agent, referrer, ip_address, cookie_data, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const eventMetadata = {
      ...metadata,
      campaignName: campaign.name,
      casino: campaign.casino
    };
    
    insertEvent.run(
      campaignId,
      eventType,
      userAgent,
      referrer,
      req.ip || req.connection.remoteAddress,
      JSON.stringify(cookieData || {}),
      JSON.stringify(eventMetadata)
    );

    // Update campaign stats for cookie_set events
    if (eventType === 'cookie_set') {
      const stats = JSON.parse(campaign.stats);
      stats.cookieSets = (stats.cookieSets || 0) + 1;
      
      const updateStats = req.app.locals.db.prepare(`
        UPDATE campaigns SET stats = ? WHERE id = ?
      `);
      updateStats.run(JSON.stringify(stats), campaignId);
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
