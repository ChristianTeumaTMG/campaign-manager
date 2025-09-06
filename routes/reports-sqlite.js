const express = require('express');
const router = express.Router();

// Get campaign reports
router.get('/campaigns/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;
    const { period = 'daily', startDate, endDate } = req.query;

    // Validate campaign exists
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND is_active = 1
    `).get(campaignId);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Set date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate).toISOString();
      end = new Date(endDate).toISOString();
    } else {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    // Get events for the campaign
    const events = req.app.locals.db.prepare(`
      SELECT event_type, created_at, postback_data
      FROM events 
      WHERE campaign_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY created_at ASC
    `).all(campaignId, start, end);

    // Group by date
    const reportData = {};
    events.forEach(event => {
      const date = new Date(event.created_at);
      const dateKey = period === 'monthly' 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!reportData[dateKey]) {
        reportData[dateKey] = {
          date: dateKey,
          cookieSets: 0,
          registrations: 0,
          ftds: 0,
          totalAmount: 0
        };
      }
      
      if (event.event_type === 'cookie_set') {
        reportData[dateKey].cookieSets++;
      } else if (event.event_type === 'registration') {
        reportData[dateKey].registrations++;
      } else if (event.event_type === 'ftd') {
        reportData[dateKey].ftds++;
        const postbackData = JSON.parse(event.postback_data || '{}');
        reportData[dateKey].totalAmount += postbackData.amount || 0;
      }
    });

    // Convert to array and calculate conversion rates
    const formattedData = Object.values(reportData).map(item => {
      const cookieSets = item.cookieSets || 0;
      const registrations = item.registrations || 0;
      const ftds = item.ftds || 0;
      
      return {
        ...item,
        conversionRates: {
          cookieToFtd: cookieSets > 0 ? ((ftds / cookieSets) * 100).toFixed(2) : 0,
          regToFtd: registrations > 0 ? ((ftds / registrations) * 100).toFixed(2) : 0
        }
      };
    });

    // Calculate totals
    const totals = formattedData.reduce((acc, item) => {
      acc.cookieSets += item.cookieSets;
      acc.registrations += item.registrations;
      acc.ftds += item.ftds;
      acc.totalAmount += item.totalAmount;
      return acc;
    }, { cookieSets: 0, registrations: 0, ftds: 0, totalAmount: 0 });

    totals.conversionRates = {
      cookieToFtd: totals.cookieSets > 0 ? ((totals.ftds / totals.cookieSets) * 100).toFixed(2) : 0,
      regToFtd: totals.registrations > 0 ? ((totals.ftds / totals.registrations) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          casino: campaign.casino
        },
        period,
        dateRange: { start, end },
        reportData: formattedData,
        totals
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// Get all campaigns overview
router.get('/overview', (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;

    // Set date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate).toISOString();
      end = new Date(endDate).toISOString();
    } else {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    // Get all campaigns
    const campaigns = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE is_active = 1 ORDER BY created_at DESC
    `).all();

    // Get aggregated data for each campaign
    const campaignReports = campaigns.map(campaign => {
      const events = req.app.locals.db.prepare(`
        SELECT event_type, postback_data
        FROM events 
        WHERE campaign_id = ? AND created_at BETWEEN ? AND ?
      `).all(campaign.id, start, end);

      const stats = {
        cookieSets: 0,
        registrations: 0,
        ftds: 0,
        totalAmount: 0
      };

      events.forEach(event => {
        if (event.event_type === 'cookie_set') {
          stats.cookieSets++;
        } else if (event.event_type === 'registration') {
          stats.registrations++;
        } else if (event.event_type === 'ftd') {
          stats.ftds++;
          const postbackData = JSON.parse(event.postback_data || '{}');
          stats.totalAmount += postbackData.amount || 0;
        }
      });

      const cookieSets = stats.cookieSets;
      const registrations = stats.registrations;
      const ftds = stats.ftds;

      return {
        id: campaign.id,
        name: campaign.name,
        casino: campaign.casino,
        createdAt: campaign.created_at,
        stats,
        conversionRates: {
          cookieToFtd: cookieSets > 0 ? ((ftds / cookieSets) * 100).toFixed(2) : 0,
          regToFtd: registrations > 0 ? ((ftds / registrations) * 100).toFixed(2) : 0
        }
      };
    });

    // Calculate grand totals
    const grandTotals = campaignReports.reduce((acc, campaign) => {
      acc.cookieSets += campaign.stats.cookieSets;
      acc.registrations += campaign.stats.registrations;
      acc.ftds += campaign.stats.ftds;
      acc.totalAmount += campaign.stats.totalAmount;
      return acc;
    }, { cookieSets: 0, registrations: 0, ftds: 0, totalAmount: 0 });

    grandTotals.conversionRates = {
      cookieToFtd: grandTotals.cookieSets > 0 ? ((grandTotals.ftds / grandTotals.cookieSets) * 100).toFixed(2) : 0,
      regToFtd: grandTotals.registrations > 0 ? ((grandTotals.ftds / grandTotals.registrations) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        campaigns: campaignReports,
        grandTotals
      }
    });

  } catch (error) {
    console.error('Overview report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate overview report'
    });
  }
});

// Get real-time stats
router.get('/realtime', (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const events = req.app.locals.db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM events 
      WHERE created_at >= ?
      GROUP BY event_type
    `).all(last24Hours.toISOString());
    
    const stats = {
      cookieSets: 0,
      registrations: 0,
      ftds: 0
    };

    events.forEach(event => {
      stats[event.event_type] = event.count;
    });

    res.json({
      success: true,
      data: {
        period: 'last_24_hours',
        stats,
        timestamp: now
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time stats'
    });
  }
});

module.exports = router;
