const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

// Get all campaigns
router.get('/', (req, res) => {
  try {
    const campaigns = req.app.locals.db.prepare(`
      SELECT *, 
        json_extract(stats, '$.cookieSets') as cookieSets,
        json_extract(stats, '$.registrations') as registrations,
        json_extract(stats, '$.ftds') as ftds
      FROM campaigns 
      WHERE is_active = 1 
      ORDER BY created_at DESC
    `).all();
    
    const formattedCampaigns = campaigns.map(campaign => ({
      _id: campaign.id,
      name: campaign.name,
      casino: campaign.casino,
      templateConfig: JSON.parse(campaign.template_config),
      postbackUrl: campaign.postback_url,
      scriptUrl: campaign.script_url,
      isActive: Boolean(campaign.is_active),
      createdBy: campaign.created_by,
      stats: {
        cookieSets: campaign.cookieSets || 0,
        registrations: campaign.registrations || 0,
        ftds: campaign.ftds || 0
      },
      conversionRates: {
        cookieToFtd: campaign.cookieSets > 0 ? ((campaign.ftds / campaign.cookieSets) * 100).toFixed(2) : 0,
        regToFtd: campaign.registrations > 0 ? ((campaign.ftds / campaign.registrations) * 100).toFixed(2) : 0
      },
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    }));
    
    res.json({
      success: true,
      data: formattedCampaigns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// Get single campaign
router.get('/:id', (req, res) => {
  try {
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE id = ? AND is_active = 1
    `).get(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const formattedCampaign = {
      _id: campaign.id,
      name: campaign.name,
      casino: campaign.casino,
      templateConfig: JSON.parse(campaign.template_config),
      postbackUrl: campaign.postback_url,
      scriptUrl: campaign.script_url,
      isActive: Boolean(campaign.is_active),
      createdBy: campaign.created_by,
      stats: JSON.parse(campaign.stats),
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    };
    
    res.json({
      success: true,
      data: formattedCampaign
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
  body('templateConfig.cookieA.expiry').notEmpty().withMessage('Cookie A expiry is required'),
  body('templateConfig.cookieB.name').notEmpty().withMessage('Cookie B name is required'),
  body('templateConfig.cookieB.value').notEmpty().withMessage('Cookie B value is required'),
  body('templateConfig.cookieB.domain').notEmpty().withMessage('Cookie B domain is required'),
  body('templateConfig.cookieB.expiry').notEmpty().withMessage('Cookie B expiry is required'),
  body('templateConfig.referrerRegex').notEmpty().withMessage('Referrer regex is required'),
  body('templateConfig.cookieARegex').notEmpty().withMessage('Cookie A regex is required')
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

    const { name, casino, templateConfig, postbackUrl } = req.body;
    
    // Generate unique script URL
    const randomId = crypto.randomBytes(16).toString('hex');
    const scriptUrl = `/api/scripts/${randomId}.js`;
    
    const insert = req.app.locals.db.prepare(`
      INSERT INTO campaigns (name, casino, template_config, postback_url, script_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = insert.run(
      name,
      casino,
      JSON.stringify(templateConfig),
      postbackUrl,
      scriptUrl,
      req.body.createdBy || 'system'
    );
    
    const campaign = {
      _id: result.lastInsertRowid,
      name,
      casino,
      templateConfig,
      postbackUrl,
      scriptUrl,
      isActive: true,
      createdBy: req.body.createdBy || 'system',
      stats: { cookieSets: 0, registrations: 0, ftds: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
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

    const updateFields = [];
    const updateValues = [];
    
    if (req.body.name) {
      updateFields.push('name = ?');
      updateValues.push(req.body.name);
    }
    if (req.body.casino) {
      updateFields.push('casino = ?');
      updateValues.push(req.body.casino);
    }
    if (req.body.postbackUrl) {
      updateFields.push('postback_url = ?');
      updateValues.push(req.body.postbackUrl);
    }
    if (req.body.templateConfig) {
      updateFields.push('template_config = ?');
      updateValues.push(JSON.stringify(req.body.templateConfig));
    }
    if (req.body.isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(req.body.isActive ? 1 : 0);
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(req.params.id);
    
    const update = req.app.locals.db.prepare(`
      UPDATE campaigns 
      SET ${updateFields.join(', ')} 
      WHERE id = ?
    `);
    
    const result = update.run(...updateValues);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    // Get updated campaign
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns WHERE id = ?
    `).get(req.params.id);
    
    const formattedCampaign = {
      _id: campaign.id,
      name: campaign.name,
      casino: campaign.casino,
      templateConfig: JSON.parse(campaign.template_config),
      postbackUrl: campaign.postback_url,
      scriptUrl: campaign.script_url,
      isActive: Boolean(campaign.is_active),
      createdBy: campaign.created_by,
      stats: JSON.parse(campaign.stats),
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    };
    
    res.json({
      success: true,
      data: formattedCampaign,
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
router.delete('/:id', (req, res) => {
  try {
    const update = req.app.locals.db.prepare(`
      UPDATE campaigns SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    
    const result = update.run(req.params.id);
    
    if (result.changes === 0) {
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
router.get('/:id/stats', (req, res) => {
  try {
    const campaign = req.app.locals.db.prepare(`
      SELECT stats FROM campaigns WHERE id = ? AND is_active = 1
    `).get(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
    const stats = JSON.parse(campaign.stats);
    const conversionRates = {
      cookieToFtd: stats.cookieSets > 0 ? ((stats.ftds / stats.cookieSets) * 100).toFixed(2) : 0,
      regToFtd: stats.registrations > 0 ? ((stats.ftds / stats.registrations) * 100).toFixed(2) : 0
    };
    
    res.json({
      success: true,
      data: {
        stats,
        conversionRates
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
