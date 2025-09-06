const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Event = require('../models/Event');
const moment = require('moment');

// Get campaign reports
router.get('/campaigns/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { period = 'daily', startDate, endDate } = req.query;

    // Validate campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    // Set date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      // Default to last 30 days
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    // Build aggregation pipeline
    const pipeline = [
      {
        $match: {
          campaignId: campaign._id,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: period === 'monthly' 
            ? { 
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              }
            : { 
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
          cookieSets: {
            $sum: { $cond: [{ $eq: ['$eventType', 'cookie_set'] }, 1, 0] }
          },
          registrations: {
            $sum: { $cond: [{ $eq: ['$eventType', 'registration'] }, 1, 0] }
          },
          ftds: {
            $sum: { $cond: [{ $eq: ['$eventType', 'ftd'] }, 1, 0] }
          },
          totalAmount: {
            $sum: { $cond: [{ $eq: ['$eventType', 'ftd'] }, '$postbackData.amount', 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ];

    const reportData = await Event.aggregate(pipeline);

    // Format the data
    const formattedData = reportData.map(item => {
      const date = period === 'monthly' 
        ? `${item._id.year}-${String(item._id.month).padStart(2, '0')}`
        : `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      
      const cookieSets = item.cookieSets || 0;
      const registrations = item.registrations || 0;
      const ftds = item.ftds || 0;
      
      return {
        date,
        cookieSets,
        registrations,
        ftds,
        totalAmount: item.totalAmount || 0,
        conversionRates: {
          cookieToFtd: cookieSets > 0 ? ((ftds / cookieSets) * 100).toFixed(2) : 0,
          regToFtd: registrations > 0 ? ((ftds / registrations) * 100).toFixed(2) : 0
        }
      };
    });

    // Calculate totals
    const totals = reportData.reduce((acc, item) => {
      acc.cookieSets += item.cookieSets || 0;
      acc.registrations += item.registrations || 0;
      acc.ftds += item.ftds || 0;
      acc.totalAmount += item.totalAmount || 0;
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
          id: campaign._id,
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
router.get('/overview', async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;

    // Set date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      end = new Date();
      start = new Date();
      start.setDate(start.getDate() - 30);
    }

    // Get all campaigns with their stats
    const campaigns = await Campaign.find({ isActive: true })
      .select('name casino stats createdAt')
      .sort({ createdAt: -1 });

    // Get aggregated data for each campaign
    const campaignReports = await Promise.all(
      campaigns.map(async (campaign) => {
        const pipeline = [
          {
            $match: {
              campaignId: campaign._id,
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: null,
              cookieSets: {
                $sum: { $cond: [{ $eq: ['$eventType', 'cookie_set'] }, 1, 0] }
              },
              registrations: {
                $sum: { $cond: [{ $eq: ['$eventType', 'registration'] }, 1, 0] }
              },
              ftds: {
                $sum: { $cond: [{ $eq: ['$eventType', 'ftd'] }, 1, 0] }
              },
              totalAmount: {
                $sum: { $cond: [{ $eq: ['$eventType', 'ftd'] }, '$postbackData.amount', 0] }
              }
            }
          }
        ];

        const [data] = await Event.aggregate(pipeline);
        
        const cookieSets = data?.cookieSets || 0;
        const registrations = data?.registrations || 0;
        const ftds = data?.ftds || 0;

        return {
          id: campaign._id,
          name: campaign.name,
          casino: campaign.casino,
          createdAt: campaign.createdAt,
          stats: {
            cookieSets,
            registrations,
            ftds,
            totalAmount: data?.totalAmount || 0
          },
          conversionRates: {
            cookieToFtd: cookieSets > 0 ? ((ftds / cookieSets) * 100).toFixed(2) : 0,
            regToFtd: registrations > 0 ? ((ftds / registrations) * 100).toFixed(2) : 0
          }
        };
      })
    );

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
router.get('/realtime', async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ];

    const realtimeStats = await Event.aggregate(pipeline);
    
    const stats = {
      cookieSets: 0,
      registrations: 0,
      ftds: 0
    };

    realtimeStats.forEach(stat => {
      stats[stat._id] = stat.count;
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
