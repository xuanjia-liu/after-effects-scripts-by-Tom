// Debug utility functions for the extension
// This is useful during development but can be removed for production

// Determine if we're in debug mode
var DEBUG = true;

// Initialize debugging if enabled
(function() {
    if (!DEBUG) return;
    
    // Add debug panel to the DOM
    document.addEventListener('DOMContentLoaded', function() {
        var debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = 'display: none; position: absolute; bottom: 10px; left: 10px; right: 10px; background: rgba(0,0,0,0.8); color: #ddd; font-family: monospace; font-size: 11px; padding: 10px; max-height: 200px; overflow-y: auto; z-index: 9999; border: 1px solid #555;';
        
        var debugTitle = document.createElement('div');
        debugTitle.textContent = 'Debug Console (Press D to toggle)';
        debugTitle.style.cssText = 'margin-bottom: 5px; color: #fff; font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 3px;';
        
        var debugContent = document.createElement('div');
        debugContent.id = 'debug-content';
        
        var debugClear = document.createElement('button');
        debugClear.textContent = 'Clear';
        debugClear.style.cssText = 'position: absolute; top: 7px; right: 10px; font-size: 10px; padding: 2px 5px;';
        debugClear.addEventListener('click', function() {
            debugContent.innerHTML = '';
        });
        
        debugPanel.appendChild(debugTitle);
        debugPanel.appendChild(debugClear);
        debugPanel.appendChild(debugContent);
        document.body.appendChild(debugPanel);
        
        // Add keyboard shortcut to toggle debug panel
        document.addEventListener('keydown', function(e) {
            if (e.key.toLowerCase() === 'd' && !e.target.matches('input, textarea')) {
                toggleDebugPanel();
            }
        });
    });
})();

// Log message to the debug panel
function debug(message, type) {
    if (!DEBUG) return;
    
    // Default to 'info' type if not specified
    type = type || 'info';
    
    // Get current time
    var now = new Date();
    var timestamp = now.getHours().toString().padStart(2, '0') + ':' + 
                   now.getMinutes().toString().padStart(2, '0') + ':' + 
                   now.getSeconds().toString().padStart(2, '0');
    
    // Format message
    var formatted = timestamp + ' | ' + message;
    
    // Log to console
    switch(type) {
        case 'error':
            console.error(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        default:
            console.log(formatted);
    }
    
    // Add to debug panel if it exists
    var debugContent = document.getElementById('debug-content');
    if (debugContent) {
        var entry = document.createElement('div');
        
        // Style based on message type
        var color = '#ddd';
        switch(type) {
            case 'error': color = '#ff5e5e'; break;
            case 'warn': color = '#ffcc00'; break;
            case 'success': color = '#65ff65'; break;
        }
        
        entry.style.color = color;
        entry.style.paddingBottom = '2px';
        entry.textContent = formatted;
        
        debugContent.appendChild(entry);
        debugContent.scrollTop = debugContent.scrollHeight;
    }
}

// Toggle the debug panel visibility
function toggleDebugPanel() {
    var panel = document.getElementById('debug-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

// Wrapper functions for different message types
debug.error = function(message) {
    debug(message, 'error');
};

debug.warn = function(message) {
    debug(message, 'warn');
};

debug.success = function(message) {
    debug(message, 'success');
};

// Export debug functions to window for global access
window.debug = debug;
window.toggleDebugPanel = toggleDebugPanel; 