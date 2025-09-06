const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const scriptGenerator = require('../utils/scriptGenerator');

// Serve obfuscated script
router.get('/:scriptId', async (req, res) => {
  try {
    const scriptId = req.params.scriptId.replace('.js', '');
    
    // Find campaign by script URL using SQLite
    const campaign = req.app.locals.db.prepare(`
      SELECT * FROM campaigns 
      WHERE script_url = ? AND is_active = 1
    `).get(`/api/scripts/${scriptId}.js`);
    
    if (!campaign) {
      return res.status(404).send('// Script not found');
    }
    
    // Parse template config from JSON
    const templateConfig = JSON.parse(campaign.template_config);
    
    // Generate script based on template
    let script;
    switch (templateConfig.templateType) {
      case 'Myaffiliates':
        script = scriptGenerator.generateMyaffiliatesScript({
          campaignId: campaign.id,
          campaignName: campaign.name,
          casino: campaign.casino,
          ...templateConfig
        });
        break;
      default:
        return res.status(400).send('// Invalid template type');
    }
    
    // Set headers for JavaScript content
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.send(script);
  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).send('// Script generation failed');
  }
});

// Get script info (for debugging)
router.get('/:scriptId/info', async (req, res) => {
  try {
    const scriptId = req.params.scriptId.replace('.js', '');
    
    const campaign = await Campaign.findOne({ 
      scriptUrl: `/api/scripts/${scriptId}.js`,
      isActive: true 
    }).select('name casino templateConfig.templateType stats createdAt');
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Script not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        campaignName: campaign.name,
        casino: campaign.casino,
        templateType: campaign.templateConfig.templateType,
        stats: campaign.stats,
        createdAt: campaign.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch script info'
    });
  }
});

module.exports = router;
