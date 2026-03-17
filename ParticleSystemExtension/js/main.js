/* Global color state initialization */
var colorState = {
    start: { h: 240, s: 100, b: 100, opacity: 100 },
    end: { h: 280, s: 100, b: 100, opacity: 0 }
};
var currentColorTarget = null;

// Initialize CSInterface
var csInterface = new CSInterface();

// Extension version
var VERSION = "1.0.2";

// Real-time update flag
var realtimeEnabled = false;
var activeSystemName = null;
var updateInProgress = false;

// Direction control state
var directionControlActive = false;
var currentDirectionControl = null;

// Mapping controls to JSX effect names
var controlMap = {
    "particle-count": "Active Particles",
    "total-particles": "Total Particles",
    "emitter-width": "Emitter Width",
    "emitter-height": "Emitter Height",
    "particle-lifetime": "Particle Lifetime (sec)",
    "position-offset": "Position Offset",
    "fade-in": "Fade In Distance %",
    "fade-out": "Fade Out Start %",
    "particle-size": "Particle Size",
    "size-variance": "Size Variance",
    "size-fade-method": "Size Fade Method",
    "color-offset": "Color Offset",
    "color-fade-method": "Color Fade Method",
    "color-variance": "Color Variance",
    "max-opacity": "Max Opacity",
    "opacity-variance": "Opacity Variance",
    "opacity-fade-method": "Opacity Fade Method",
    "rotation-variance": "Rotation Variance",
    "rotation-speed": "Rotation Speed",
    "rotation-speed-variance": "Rotation Speed Variance",
    "velocity": "Velocity",
    "velocity-variance": "Velocity Variance",
    "velocity-direction": "Velocity Direction",
    "velocity-direction-variance": "Velocity Direction Variance",
    "gravity": "Gravity",
    "gravity-direction": "Gravity Direction",
    "resistance": "Resistance",
    "turbulent": "Turbulent",
    "turbulent-speed": "Turbulent Speed",
    "shape-type": "Shape Type",
    "selected-layer": "Selected Layer",
    "rectangle-roundness": "Rectangle Roundness",
    "star-points": "Star Points",
    "star-inner-radius": "Star Inner Radius",
    "star-inner-roundness": "Star Inner Roundness",
    "star-outer-roundness": "Star Outer Roundness",
    "polygon-sides": "Polygon Sides",
    "polygon-roundness": "Polygon Roundness"
};

// Input sliders configuration - exclusions for direction controls and select inputs
const sliderExclusions = [
    'velocity-direction',
    'gravity-direction',
    'size-fade-method',
    'color-fade-method',
    'opacity-fade-method',
    'shape-type',
    'selected-layer'
];

// Flag to track if we're currently processing a dropdown change
var changingSystemDropdown = false;

// Add polling variables for selected system tracking
var selectedSystemPolling = null;
var lastSelectedSystemName = null;

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the extension
    init();
    
    // Add event listeners
    document.getElementById('create-btn').addEventListener('click', createParticleSystem);
    document.getElementById('existing-systems').addEventListener('change', handleSystemChange);
    document.getElementById('realtime-toggle').addEventListener('change', toggleRealtime);
    
    // Add event listeners for panel focus changes and comp selections
    csInterface.addEventListener("com.adobe.csxs.events.panelActivated", handlePanelFocusChange);
    csInterface.addEventListener("applicationActive", handlePanelFocusChange);
    
    // Listen for layer selection changes in After Effects
    csInterface.addEventListener("com.adobe.ae.layer.selected", handlePanelFocusChange);
    csInterface.addEventListener("com.adobe.ae.composition.changed", handlePanelFocusChange);
    
    // Start selection polling when extension is active
    startSelectionPolling();
    
    // Tab switching
    var tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(function(content) {
                content.classList.remove('active');
            });
            
            // Add active class to current tab
            this.classList.add('active');
            var tabId = this.getAttribute('data-tab') + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Setup HSB color pickers
    setupHSBColorPickers();
    
    // Setup modal events
    setupColorModal();
    
    // Setup event listeners for real-time updates
    setupRealtimeListeners();
    
    // Setup direction controls
    setupDirectionControls();
    
    // Setup input sliders for numeric inputs
    setupInputSliders();
    
    // Setup hex inputs
    setupHexInputs();
    
    // Log extension startup
    debug.success("Shape Particle System Extension v" + VERSION + " initialized");
});

// Handle focus changes and layer selections
function handlePanelFocusChange(event) {
    console.log("Panel/Selection change detected: " + (event ? event.type : "unknown"));
    
    // First load existing systems and select current
    loadExistingSystemsAndSelectCurrent();
    
    // Check if we need to refresh the layer list
    // This is particularly important when layers are added or removed
    if (event && event.type === "com.adobe.ae.composition.changed") {
        // If the composition changed, we need to refresh the layer list
        refreshAvailableLayers();
    } else {
        // For other events, only refresh if the selected-layer option is being used
        checkAndRefreshLayerList();
    }
    
    // Reset and restart the polling when focus changes
    restartSelectionPolling();
}

// Function to refresh available layers and maintain selection if possible
function refreshAvailableLayers() {
    // Get current shape type selection
    const shapeTypesSelected = [];
    document.querySelectorAll('.shape-type-checkbox:checked').forEach(checkbox => {
        shapeTypesSelected.push(checkbox.value);
    });
    
    // Only refresh if "selected-layer" is among the selected shape types
    if (shapeTypesSelected.includes('selected-layer')) {
        // Get current selection before refreshing
        const layerDropdown = document.getElementById('selected-layer');
        const currentSelection = layerDropdown.value;
        const currentLayerName = layerDropdown.options[layerDropdown.selectedIndex]?.text || '';
        
        // Fetch the updated list of available layers
        fetchAvailableLayers(function() {
            // Try to maintain the selection in priority order:
            // 1. By layer index (if it still exists)
            // 2. By layer name (if the index changed but name exists)
            let selectionFound = false;
            
            // First try to restore by index
            for (let i = 0; i < layerDropdown.options.length; i++) {
                if (layerDropdown.options[i].value === currentSelection) {
                    layerDropdown.value = currentSelection;
                    selectionFound = true;
                    break;
                }
            }
            
            // If not found by index, try to find by name
            if (!selectionFound && currentLayerName && currentLayerName !== 'No Shape Layers Available') {
                for (let i = 0; i < layerDropdown.options.length; i++) {
                    if (layerDropdown.options[i].text === currentLayerName) {
                        layerDropdown.value = layerDropdown.options[i].value;
                        selectionFound = true;
                        
                        // If realtime is enabled, update the particle system with the new layer index
                        if (realtimeEnabled && activeSystemName) {
                            handleControlChange({target: layerDropdown});
                        }
                        break;
                    }
                }
            }
            
            // If still not found, select the first option if available
            if (!selectionFound && layerDropdown.options.length > 0 && 
                layerDropdown.options[0].value !== 'none') {
                layerDropdown.selectedIndex = 0;
                
                // If realtime is enabled, update the particle system with the new layer
                if (realtimeEnabled && activeSystemName) {
                    handleControlChange({target: layerDropdown});
                }
            }
        });
    }
}

// Check if layer list needs refreshing based on current UI state
function checkAndRefreshLayerList() {
    // Get current shape type selection
    const shapeTypesSelected = [];
    document.querySelectorAll('.shape-type-checkbox:checked').forEach(checkbox => {
        shapeTypesSelected.push(checkbox.value);
    });
    
    // Only refresh if "selected-layer" is among the selected shape types
    if (shapeTypesSelected.includes('selected-layer')) {
        refreshAvailableLayers();
    }
}

// Initialize extension
function init() {
    debug("Initializing Shape Particle System Extension");
    
    // Set realtime toggle to be on by default
    var realtimeToggle = document.getElementById('realtime-toggle');
    if (realtimeToggle) {
        // Initially it's disabled until a system is selected
        realtimeToggle.disabled = true;
        
        // But it should be checked by default, so when a system is selected, it'll be on
        realtimeToggle.checked = true;
        realtimeEnabled = true;
        document.body.classList.add('realtime-active');
    }
    
    // Setup the particle count toggle
    setupParticleCountToggle();
    
    // Load existing particle systems and select current
    loadExistingSystemsAndSelectCurrent();
    
    // Setup panel flyout menu
    setupPanelMenu();
    
    // Setup shape type dropdown
    setupShapeTypeDropdown();
    
    // Setup input sliders for numeric inputs
    setupInputSliders();
    
    // Setup direction controls
    setupDirectionControls();
    
    // Setup color picker modal
    setupColorModal();
    
    // Setup hex inputs
    setupHexInputs();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Start selection polling
    startSelectionPolling();
    
    // Initialize layer selection UI enhancements
    setupLayerDropdownPosition();
}

// Setup the toggle between Total and Active particle counts
function setupParticleCountToggle() {
    const toggle = document.getElementById('show-active-particles');
    const toggleAlt = document.getElementById('show-active-particles-alt'); // Alternative toggle in Active view
    const totalControl = document.getElementById('total-particles-control');
    const activeControl = document.getElementById('active-particles-control');
    const totalInput = document.getElementById('total-particles');
    const activeInput = document.getElementById('particle-count');
    
    if (toggle && toggleAlt && totalControl && activeControl && totalInput && activeInput) {
        // Set default state - show Total Particles
        totalControl.style.display = 'block';
        activeControl.style.display = 'none';
        
        // Make sure maximum is always set initially
        activeInput.max = parseInt(totalInput.value) || 500;
        
        // Set up slider synchronization
        const setupSliderMax = () => {
            const totalValue = parseInt(totalInput.value) || 500;
            activeInput.max = totalValue;
            
            // Always set active particles to match total particles
            // This makes changes immediately visible to users
            activeInput.value = totalValue;
            
            // Update the active particles slider if it exists
            const activeSlider = document.getElementById('particle-count-slider');
            if (activeSlider) {
                activeSlider.max = totalValue;
                activeSlider.value = totalValue;
            }
        };
        
        // Function to switch to Active Particles view
        const showActiveParticles = () => {
            totalControl.style.display = 'none';
            activeControl.style.display = 'block';
            
            // Make sure max value is current
            setupSliderMax();
        };
        
        // Function to switch to Total Particles view
        const showTotalParticles = () => {
            totalControl.style.display = 'block';
            activeControl.style.display = 'none';
        };
        
        // Handle main toggle change (from Total Particles view)
        toggle.addEventListener('change', function() {
            if (this.checked) {
                showActiveParticles();
                toggleAlt.checked = true;
            } else {
                showTotalParticles();
            }
        });
        
        // Handle alternative toggle change (from Active Particles view)
        toggleAlt.addEventListener('change', function() {
            if (!this.checked) {
                showTotalParticles();
                toggle.checked = false;
            }
        });
        
        // When Total Particles value changes, update the Active Particles max
        totalInput.addEventListener('input', setupSliderMax);
        
        // Also handle change event for when value is typed
        totalInput.addEventListener('change', setupSliderMax);
        
        // Trigger real-time update after changing active particles to match total
        totalInput.addEventListener('input', function() {
            // If real-time editing is enabled, trigger update for immediate feedback
            if (realtimeEnabled && activeSystemName) {
                if (this.updateTimeout) {
                    clearTimeout(this.updateTimeout);
                }
                
                // We need to force an actual update to the particle system
                this.updateTimeout = setTimeout(function() {
                    // Get the current settings from the UI
                    var settings = gatherSettingsFromUI();
                    
                    // Create a JavaScript object string for the JSX call
                    var settingsStr = JSON.stringify(settings).replace(/"/g, '\\"');
                    
                    // Call the JSX function to update the system
                    var scriptCall = 'updateParticleSystem("' + activeSystemName + '", "' + settingsStr + '")';
                    
                    csInterface.evalScript(scriptCall, function(result) {
                        if (result === 'success') {
                            debug("Real-time update successful");
                        } else if (result !== '') {
                            debug.error("Error updating particle system: " + result);
                        }
                    });
                }, 300);
            }
        });
    }
}

// Load existing systems and select the currently selected layer
function loadExistingSystemsAndSelectCurrent() {
    loadExistingSystems(function() {
        // Get currently selected layer after systems are loaded
        setTimeout(function() {
            getCurrentlySelectedParticleSystem();
        }, 100);
    });
}

// Get the currently selected particle system from After Effects
function getCurrentlySelectedParticleSystem() {
    // Skip if we're already processing a dropdown change
    if (changingSystemDropdown) {
        return;
    }
    
    csInterface.evalScript('getSelectedParticleSystem()', function(result) {
        // Skip if we're already processing a dropdown change (check again in case it changed)
        if (changingSystemDropdown) {
            return;
        }
        
        try {
            var selectedSystem = JSON.parse(result);
            
            if (selectedSystem && selectedSystem.name) {
                // Auto-select in dropdown
                var dropdown = document.getElementById('existing-systems');
                
                for (var i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value === selectedSystem.name) {
                        // Only change if it's different from current selection
                        if (dropdown.value !== selectedSystem.name) {
                            // Set flag to prevent re-entrancy
                            changingSystemDropdown = true;
                            
                            dropdown.value = selectedSystem.name;
                            // Trigger change event to load settings
                            var event = new Event('change');
                            dropdown.dispatchEvent(event);
                            debug("Auto-selected system: " + selectedSystem.name);
                            
                            // The flag will be reset when handleSystemChange completes
                        }
                        break;
                    }
                }
            }
        } catch (e) {
            // Silently handle errors to avoid annoying users
            console.log("Error selecting current system: " + e.toString());
            changingSystemDropdown = false;
        }
    });
}

// Setup input sliders for all numeric inputs
function setupInputSliders() {
    // Get all numeric input fields
    const numericInputs = document.querySelectorAll('input[type="number"].particle-control');
    
    numericInputs.forEach(function(input) {
        const inputId = input.id;
        
        // Skip excluded inputs (direction controls and select inputs)
        if (sliderExclusions.includes(inputId)) {
            return;
        }
        
        // Skip opacity inputs within color controls
        if (inputId === 'start-opacity' || inputId === 'end-opacity') {
            return;
        }
        
        // Skip inputs that are inside opacity-control divs
        if (input.closest('.opacity-control')) {
            return;
        }
        
        // Create slider for this input
        createSliderForInput(input);
    });
}

// Create a slider for a specific input
function createSliderForInput(input) {
    const inputId = input.id;
    const sliderId = inputId + '-slider';
    
    // Get min, max, step values from the input
    let min = input.hasAttribute('min') ? parseFloat(input.getAttribute('min')) : 0;
    let max = input.hasAttribute('max') ? parseFloat(input.getAttribute('max')) : 100;
    let step = input.hasAttribute('step') ? input.getAttribute('step') : 1;
    
    // If max is not defined or too high, set a reasonable max based on current value
    if (!input.hasAttribute('max') || max > 1000) {
        const currentValue = parseFloat(input.value) || 0;
        max = Math.max(currentValue * 2, 100);
    }
    
    // Create container structure
    const container = document.createElement('div');
    container.className = 'input-slider-container';
    
    const row = document.createElement('div');
    row.className = 'input-slider-row';
    
    // Create slider element
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = sliderId;
    slider.className = 'input-slider particle-control';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = input.value;
    
    // Create slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    sliderContainer.appendChild(slider);
    
    // Add slider and input to row
    input.classList.add('input-number');
    
    // Replace the input with our new structure
    const parent = input.parentNode;
    
    // Check if we're dealing with particle count controls
    if (parent.id === 'total-particles-control' || parent.id === 'active-particles-control') {
        // Special handling for the new label-row layout
        // We don't want to touch the label-row structure
        
        // Remove input from parent
        parent.removeChild(input);
        
        // Add slider container and input to row
        row.appendChild(sliderContainer);
        row.appendChild(input);
        
        // Add row to container
        container.appendChild(row);
        
        // Append container to parent
        parent.appendChild(container);
    } else {
        // Standard case for other controls
        const label = parent.querySelector('label');
        
        // Keep the label
        parent.innerHTML = '';
        if (label) {
            parent.appendChild(label);
        }
        
        // Add container with slider and input
        row.appendChild(sliderContainer);
        row.appendChild(input);
        container.appendChild(row);
        parent.appendChild(container);
    }
    
    // Link slider and input
    linkInputSlider(slider, input);
}

// Link input and slider to update each other
function linkInputSlider(slider, input) {
    // Update input when slider changes
    slider.addEventListener('input', function() {
        input.value = slider.value;
        
        // Trigger change event for real-time updates if enabled
        if (realtimeEnabled) {
            // Special handling for total-particles slider
            if (slider.id === 'total-particles-slider') {
                // When total particles changes via slider, we need to update active particles
                // and trigger a full update
                const totalValue = parseInt(slider.value);
                const activeInput = document.getElementById('particle-count');
                
                if (activeInput) {
                    activeInput.max = totalValue;
                    activeInput.value = totalValue;
                    
                    const activeSlider = document.getElementById('particle-count-slider');
                    if (activeSlider) {
                        activeSlider.max = totalValue;
                        activeSlider.value = totalValue;
                    }
                    
                    // Force a full update with the new settings
                    if (realtimeEnabled && activeSystemName) {
                        if (this.updateTimeout) {
                            clearTimeout(this.updateTimeout);
                        }
                        
                        this.updateTimeout = setTimeout(function() {
                            // Get the current settings directly from the UI
                            var settings = gatherSettingsFromUI();
                            
                            // Create a JavaScript object string for the JSX call
                            var settingsStr = JSON.stringify(settings).replace(/"/g, '\\"');
                            
                            // Call the JSX function to update the system
                            var scriptCall = 'updateParticleSystem("' + activeSystemName + '", "' + settingsStr + '")';
                            
                            csInterface.evalScript(scriptCall, function(result) {
                                if (result !== 'success' && result !== '') {
                                    debug.error("Error updating particle system: " + result);
                                }
                            });
                        }, 300);
                    }
                }
            } else {
                // Standard behavior for other controls
                handleControlChange({target: input});
            }
        }
    });
    
    // Update slider when input changes
    input.addEventListener('input', function() {
        var value = parseFloat(input.value);
        if (!isNaN(value)) {
            // Check if value is within slider range, extend if needed
            const min = parseFloat(slider.min);
            let max = parseFloat(slider.max);
            
            // Special case for particle-count
            if (inputId === 'particle-count') {
                const totalValue = parseInt(document.getElementById('total-particles').value) || 500;
                if (max !== totalValue) {
                    max = totalValue;
                    slider.max = max;
                    input.max = max;
                }
                
                // Always set active particles to match total particles
                input.value = max;
                slider.value = max;
                return; // Skip the rest of this iteration
            }
            
            if (value < min) {
                slider.min = value;
            } else if (value > max && inputId !== 'particle-count') {
                // For non-particle-count inputs, extend the max if needed
                slider.max = value * 1.5;
            }
            
            slider.value = value;
        }
    });
}

// Setup direction controls
function setupDirectionControls() {
    // Setup velocity direction control
    setupDirectionControl('velocity-direction', 'velocity-line');
    
    // Setup gravity direction control
    setupDirectionControl('gravity-direction', 'gravity-line');
    
    // Initially update the direction visualizations
    updateDirectionVisual('velocity-direction', 'velocity-line');
    updateDirectionVisual('gravity-direction', 'gravity-line');
}

// Setup a single direction control
function setupDirectionControl(inputId, lineId) {
    var input = document.getElementById(inputId);
    var directionCircle = document.getElementById(inputId + '-control').querySelector('.direction-circle');
    
    // Update direction line when input changes
    input.addEventListener('input', function() {
        updateDirectionVisual(inputId, lineId);
    });
    
    // Interactive control when clicking in the circle
    directionCircle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        
        // Calculate center of the circle
        var rect = directionCircle.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        
        // Set active state
        directionControlActive = true;
        currentDirectionControl = {
            inputId: inputId,
            lineId: lineId,
            centerX: centerX,
            centerY: centerY
        };
        
        // Calculate angle and update immediately
        updateDirectionFromEvent(e);
        
        // Add document-level event listeners
        document.addEventListener('mousemove', handleDirectionMouseMove);
        document.addEventListener('mouseup', handleDirectionMouseUp);
    });
}

// Handle mouse move when dragging direction
function handleDirectionMouseMove(e) {
    if (directionControlActive && currentDirectionControl) {
        updateDirectionFromEvent(e);
    }
}

// Handle mouse up to end dragging
function handleDirectionMouseUp() {
    // Reset active state
    directionControlActive = false;
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', handleDirectionMouseMove);
    document.removeEventListener('mouseup', handleDirectionMouseUp);
}

// Update direction angle from mouse event
function updateDirectionFromEvent(e) {
    if (!currentDirectionControl) return;
    
    // Calculate angle from center to current mouse position
    var dx = e.clientX - currentDirectionControl.centerX;
    var dy = e.clientY - currentDirectionControl.centerY;
    
    // Convert to degrees (0° is up, clockwise)
    var angleRad = Math.atan2(dy, dx);
    var angleDeg = (Math.round(angleRad * (180 / Math.PI)) + 90) % 360;
    
    // Ensure positive angle
    if (angleDeg < 0) angleDeg += 360;
    
    // Update input value
    var input = document.getElementById(currentDirectionControl.inputId);
    input.value = angleDeg;
    
    // Update visual
    updateDirectionVisual(currentDirectionControl.inputId, currentDirectionControl.lineId);
    
    // Trigger change event for real-time updates if enabled
    if (realtimeEnabled) {
        handleControlChange({target: input});
    }
}

// Update direction line visualization
function updateDirectionVisual(inputId, lineId) {
    var direction = parseInt(document.getElementById(inputId).value) || 0;
    var line = document.getElementById(lineId);
    
    // Convert degrees to CSS rotation (0° is up, clockwise)
    // Need to subtract 90 degrees because CSS rotation starts at 3 o'clock
    var rotation = direction - 90;
    
    // Apply rotation to the line
    line.style.transform = 'rotate(' + rotation + 'deg)';
    
    // Update the arrow rotation to always point outward
    var arrow = line.querySelector('.direction-arrow');
    if (arrow) {
        // Fix arrow orientation by removing the direction degree addition that was causing issues
        // Just use a fixed rotation that ensures the arrow head points outward from the circle
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Setup the color picker modal
function setupColorModal() {
    // Get DOM elements
    var overlay = document.getElementById('color-picker-overlay');
    var modal = overlay.querySelector('.color-modal');
    var closeBtn = document.getElementById('close-color-modal');
    var cancelBtn = document.getElementById('cancel-color');
    var applyBtn = document.getElementById('apply-color');
    var startBtn = document.getElementById('start-color-button');
    var endBtn = document.getElementById('end-color-button');
    
    // Start color button
    startBtn.addEventListener('click', function() {
        openColorModal('start');
    });
    
    // End color button
    endBtn.addEventListener('click', function() {
        openColorModal('end');
    });
    
    // Close modal button
    closeBtn.addEventListener('click', function() {
        closeColorModal(false);
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', function() {
        closeColorModal(false);
    });
    
    // Apply button
    applyBtn.addEventListener('click', function() {
        closeColorModal(true);
    });
    
    // Close modal when clicking outside
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeColorModal(false);
        }
    });
    
    // Prevent clicks inside the modal from closing it
    modal.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Setup modal color controls
    setupModalColorControls();
}

// Open the color modal for a specific color
function openColorModal(colorTarget) {
    currentColorTarget = colorTarget;
    
    // Set modal title
    document.getElementById('color-modal-title').textContent = "Edit " + 
        (colorTarget === 'start' ? "Start" : "End") + " Color";
    
    // Set modal values from the current color state
    var color = colorState[colorTarget];
    document.getElementById('modal-hue').value = color.h;
    document.getElementById('modal-hue-value').value = color.h;
    document.getElementById('modal-saturation').value = color.s;
    document.getElementById('modal-saturation-value').value = color.s;
    document.getElementById('modal-brightness').value = color.b;
    document.getElementById('modal-brightness-value').value = color.b;
    document.getElementById('modal-opacity').value = color.opacity;
    
    // Update opacity value display
    var opacityValue = document.querySelector('.opacity-value');
    if (opacityValue) {
        opacityValue.textContent = color.opacity + '%';
    }
    
    // Update color preview
    updateModalColorPreview();
    
    // Show the modal
    document.getElementById('color-picker-overlay').style.display = 'block';
}

// Close the color modal
function closeColorModal(apply) {
    if (apply && currentColorTarget) {
        // Apply the color changes
        var h = parseInt(document.getElementById('modal-hue').value);
        var s = parseInt(document.getElementById('modal-saturation').value);
        var b = parseInt(document.getElementById('modal-brightness').value);
        var opacity = parseInt(document.getElementById('modal-opacity').value);
        
        // Update color state
        colorState[currentColorTarget] = {
            h: h,
            s: s,
            b: b,
            opacity: opacity
        };
        
        // Update the swatch
        updateSwatch(currentColorTarget);
        
        // Update hex input
        updateHexFromColor(currentColorTarget);
        
        // Also update the opacity control in the main UI
        document.getElementById(currentColorTarget + '-opacity').value = opacity;
        
        // Trigger change event for real-time updates if enabled
        if (realtimeEnabled) {
            handleControlChange({target: document.getElementById(currentColorTarget + '-opacity')});
        }
    }
    
    // Hide the modal
    document.getElementById('color-picker-overlay').style.display = 'none';
    
    // Clear the current target
    currentColorTarget = null;
}

// Update the color swatch in the main UI
function updateSwatch(prefix) {
    var color = colorState[prefix];
    var rgb = hsbToRgb(color.h, color.s / 100, color.b / 100);
    
    // Update the swatch color
    var swatch = document.getElementById(prefix + '-color-swatch');
    swatch.style.backgroundColor = 'rgb(' + 
        Math.round(rgb[0] * 255) + ',' + 
        Math.round(rgb[1] * 255) + ',' + 
        Math.round(rgb[2] * 255) + ')';
    
    // Also update the hex input if available
    var hexInput = document.getElementById(prefix + '-color-hex');
    if (hexInput) {
        updateHexFromColor(prefix);
    }
}

// Setup modal color controls
function setupModalColorControls() {
    // Get all controls
    var hueSlider = document.getElementById('modal-hue');
    var hueValue = document.getElementById('modal-hue-value');
    var satSlider = document.getElementById('modal-saturation');
    var satValue = document.getElementById('modal-saturation-value');
    var brightSlider = document.getElementById('modal-brightness');
    var brightValue = document.getElementById('modal-brightness-value');
    var opacityInput = document.getElementById('modal-opacity');
    var opacityValue = document.querySelector('.opacity-value');
    
    // Link range sliders to numeric inputs
    linkSliderToInput(hueSlider, hueValue, updateModalColorPreview);
    linkSliderToInput(satSlider, satValue, updateModalColorPreview);
    linkSliderToInput(brightSlider, brightValue, updateModalColorPreview);
    
    // Add opacity change handler
    opacityInput.addEventListener('input', function() {
        if (currentColorTarget) {
            // Update preview with opacity changes
            updateModalColorPreview();
            
            // Update opacity value display
            if (opacityValue) {
                opacityValue.textContent = opacityInput.value + '%';
            }
        }
    });
}

// Update color preview in the modal
function updateModalColorPreview() {
    var hue = parseInt(document.getElementById('modal-hue').value);
    var saturation = parseInt(document.getElementById('modal-saturation').value) / 100;
    var brightness = parseInt(document.getElementById('modal-brightness').value) / 100;
    var opacity = parseInt(document.getElementById('modal-opacity').value) / 100;
    
    // Convert HSB to RGB
    var rgb = hsbToRgb(hue, saturation, brightness);
    
    // Set the color preview
    var preview = document.getElementById('modal-color-preview');
    if (preview) {
        preview.style.backgroundColor = 'rgba(' + 
            Math.round(rgb[0] * 255) + ',' + 
            Math.round(rgb[1] * 255) + ',' + 
            Math.round(rgb[2] * 255) + ',' +
            opacity + ')';
    }
}

// Setup event listeners for real-time updates
function setupRealtimeListeners() {
    // Select all particle controls
    var controls = document.querySelectorAll('.particle-control');
    controls.forEach(function(control) {
        // Add input and change event listeners
        control.addEventListener('input', handleControlChange);
        control.addEventListener('change', handleControlChange);
    });
}

// Handle real-time toggle change
function toggleRealtime(event) {
    realtimeEnabled = event.target.checked;
    
    // Apply visual indicator to controls when real-time is active
    if (realtimeEnabled) {
        document.body.classList.add('realtime-active');
        // Get the current selected system
        activeSystemName = document.getElementById('existing-systems').value;
        if (activeSystemName === 'none') {
            // No active system, disable realtime
            document.getElementById('realtime-toggle').checked = false;
            realtimeEnabled = false;
            document.body.classList.remove('realtime-active');
            alert('Please select an existing particle system to enable Live updates.');
        } else {
            debug.success("Live updates enabled for: " + activeSystemName);
        }
    } else {
        document.body.classList.remove('realtime-active');
        activeSystemName = null;
        debug("Live updates disabled");
    }
}

// Handle control value changes for real-time updates
function handleControlChange(event) {
    // Skip if real-time is not enabled or if there's an update already in progress
    if (!realtimeEnabled || updateInProgress || activeSystemName === null) {
        return;
    }
    
    // Use debouncing to prevent too many updates
    if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
    }
    
    var control = event.target;
    this.updateTimeout = setTimeout(function() {
        updateParticleSystem(control);
        
        // If this is the selected layer control, also refresh the layer list
        // to ensure it stays in sync
        if (control.id === 'selected-layer') {
            refreshAvailableLayers();
        }
    }, 300); // Delay to reduce update frequency
}

// Function to update the particle system when controls change
function updateParticleSystem(changedControl) {
    // Prevent concurrent updates
    if (updateInProgress || !activeSystemName || activeSystemName === 'none') {
        return;
    }
    
    updateInProgress = true;
    debug("Updating particle system in real-time...");
    
    // Get the current settings from the UI
    var settings = gatherSettingsFromUI();
    
    // Create a JavaScript object string for the JSX call
    var settingsStr = JSON.stringify(settings).replace(/"/g, '\\"');
    
    // Call the JSX function to update the system
    var scriptCall = 'updateParticleSystem("' + activeSystemName + '", "' + settingsStr + '")';
    
    csInterface.evalScript(scriptCall, function(result) {
        updateInProgress = false;
        
        if (result === 'success') {
            debug("Real-time update successful");
            
            // If the changed control was the selected layer or a shape type checkbox,
            // check if we need to refresh the layer list
            if (changedControl && 
                (changedControl.id === 'selected-layer' || 
                 changedControl.classList.contains('shape-type-checkbox'))) {
                checkAndRefreshLayerList();
            }
        } else if (result !== '') {
            debug.error("Error updating particle system: " + result);
        }
    });
}

// Load existing particle systems from the active composition
function loadExistingSystems(callback) {
    debug("Loading existing particle systems...");
    
    csInterface.evalScript('findExistingParticleSystems()', function(result) {
        try {
            // Parse the result
            var systems = JSON.parse(result);
            
            // Get the dropdown element
            var dropdown = document.getElementById('existing-systems');
            
            // Save current selection and active system
            var currentSelection = dropdown.value;
            var currentActiveSystem = activeSystemName;
            
            // Clear existing options except for "None"
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Add each system to the dropdown
            for (var i = 0; i < systems.length; i++) {
                var option = document.createElement('option');
                option.value = systems[i].name;
                option.textContent = systems[i].name;
                dropdown.appendChild(option);
            }
            
            // Restore previous selection if it still exists
            if (currentSelection !== 'none') {
                var stillExists = false;
                for (var i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value === currentSelection) {
                        dropdown.value = currentSelection;
                        stillExists = true;
                        break;
                    }
                }
                
                // If the previously selected system no longer exists
                if (!stillExists && realtimeEnabled) {
                    // If the active system is the same as the selection, disable real-time
                    if (activeSystemName === currentSelection) {
                        document.getElementById('realtime-toggle').checked = false;
                        realtimeEnabled = false;
                        activeSystemName = null;
                        document.body.classList.remove('realtime-active');
                    }
                }
            }
            
            // Check if active system still exists
            if (currentActiveSystem && currentActiveSystem !== 'none' && realtimeEnabled) {
                var activeStillExists = false;
                for (var i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value === currentActiveSystem) {
                        activeStillExists = true;
                        break;
                    }
                }
                
                // If active system no longer exists, disable real-time
                if (!activeStillExists) {
                    document.getElementById('realtime-toggle').checked = false;
                    realtimeEnabled = false;
                    activeSystemName = null;
                    document.body.classList.remove('realtime-active');
                    debug("Disabled realtime - active system no longer exists");
                }
            }
            
            // Check if the dropdown value is 'none' after all processing
            if (dropdown.value === 'none') {
                // Disable the realtime toggle if selected system is none
                var realtimeToggle = document.getElementById('realtime-toggle');
                realtimeToggle.disabled = true;
                
                // Also ensure realtime is turned off
                if (realtimeToggle.checked) {
                    realtimeToggle.checked = false;
                    realtimeEnabled = false;
                    activeSystemName = null;
                    document.body.classList.remove('realtime-active');
                    debug("Disabled realtime - no system selected");
                }
            }
            
            debug.success("Found " + systems.length + " existing particle system(s)");
            
            // Execute callback if provided
            if (typeof callback === 'function') {
                callback();
            }
        } catch (e) {
            debug.error("Error loading existing systems: " + e.toString());
            
            // Execute callback even on error
            if (typeof callback === 'function') {
                callback();
            }
        }
    });
}

// Handle system selection change
function handleSystemChange() {
    // Set flag to prevent re-entrancy
    changingSystemDropdown = true;
    
    var selectedSystem = document.getElementById('existing-systems').value;
    var realtimeToggle = document.getElementById('realtime-toggle');
    
    // Enable/disable the realtime toggle based on selection
    if (selectedSystem === 'none') {
        // Disable checkbox when no system is selected
        realtimeToggle.disabled = true;
        realtimeToggle.checked = false;
        realtimeEnabled = false;
        document.body.classList.remove('realtime-active');
        activeSystemName = null;
    } else {
        // Enable checkbox when a system is selected
        realtimeToggle.disabled = false;
    }
    
    // Update active system for real-time updates
    if (realtimeEnabled) {
        if (selectedSystem === 'none') {
            // Disable real-time updates
            document.getElementById('realtime-toggle').checked = false;
            realtimeEnabled = false;
            document.body.classList.remove('realtime-active');
            activeSystemName = null;
        } else {
            activeSystemName = selectedSystem;
        }
    }
    
    if (selectedSystem === 'none') {
        // Reset to default values
        resetToDefaults();
        debug("Reset to default settings");
        changingSystemDropdown = false;
        return;
    }
    
    debug("Loading settings for: " + selectedSystem);
    
    // Get the settings for the selected system
    var scriptCall = 'readParticleSystemSettings("' + selectedSystem + '")';
    csInterface.evalScript(scriptCall, function(result) {
        try {
            // Convert the JSON string to an object
            var settings = JSON.parse(result);
            
            if (settings) {
                // Apply the settings to the UI
                applySettingsToUI(settings);
                
                // Check if this system uses selected-layer as shape type and refresh the layers
                if (settings["Shape Type"] === "selected-layer") {
                    // Fetch available layers
                    fetchAvailableLayers(function() {
                        // Once layers are fetched, try to set the selected layer value
                        if (settings["Selected Layer"] !== undefined) {
                            var layerDropdown = document.getElementById('selected-layer');
                            layerDropdown.value = settings["Selected Layer"];
                        }
                        changingSystemDropdown = false;
                    });
                } else {
                    changingSystemDropdown = false;
                }
            } else {
                debug.error("Invalid settings received for: " + selectedSystem);
                changingSystemDropdown = false;
            }
        } catch (e) {
            debug.error("Error parsing system settings: " + e.toString());
            changingSystemDropdown = false;
        }
    });
}

// Reset UI controls to default values
function resetToDefaults() {
    // Basic settings
    document.getElementById('total-particles').value = '50';
    document.getElementById('particle-count').value = '50';
    document.getElementById('emitter-width').value = '100';
    document.getElementById('emitter-height').value = '100';
    document.getElementById('particle-lifetime').value = '4';
    document.getElementById('position-offset').value = '100';
    document.getElementById('fade-in').value = '0';
    document.getElementById('fade-out').value = '90';
    
    // Appearance settings
    document.getElementById('particle-size').value = '10';
    document.getElementById('size-variance').value = '5';
    document.getElementById('size-fade-method').value = '1'; // Distance-based
    
    // Reset color states - blue start color, purple end color
    colorState.start = { h: 240, s: 100, b: 100, opacity: 100 }; // Blue
    colorState.end = { h: 280, s: 100, b: 100, opacity: 100 };     // Purple
    
    // Update opacity inputs
    document.getElementById('start-opacity').value = '100';
    document.getElementById('end-opacity').value = '0';
    
    // Update color swatches
    updateSwatch('start');
    updateSwatch('end');
    
    document.getElementById('color-offset').value = '20';
    document.getElementById('color-fade-method').value = '1'; // Distance-based
    document.getElementById('color-variance').value = '0';
    document.getElementById('max-opacity').value = '100';
    document.getElementById('opacity-variance').value = '20';
    document.getElementById('opacity-fade-method').value = '1'; // Distance-based
    document.getElementById('rotation-variance').value = '180';
    document.getElementById('rotation-speed').value = '0';
    document.getElementById('rotation-speed-variance').value = '0';
    
    // Motion settings
    document.getElementById('velocity').value = '100';
    document.getElementById('velocity-variance').value = '50';
    document.getElementById('velocity-direction').value = '0';
    document.getElementById('velocity-direction-variance').value = '10';
    document.getElementById('gravity').value = '98';
    document.getElementById('gravity-direction').value = '180';
    document.getElementById('resistance').value = '0';
    
    // Effects settings
    document.getElementById('turbulent').value = '40';
    document.getElementById('turbulent-speed').value = '1';
    
    // Update direction visualizations
    updateDirectionVisual('velocity-direction', 'velocity-line');
    updateDirectionVisual('gravity-direction', 'gravity-line');
    
    // Update all sliders to match their input values
    updateAllSliders();
}

// Gather all settings from UI controls
function gatherSettingsFromUI() {
    var settings = {};
    
    // Control elements and their mapping to effect names
    var controlMap = {
        'particle-count': 'Active Particles',
        'total-particles': 'Total Particles',
        'emitter-width': 'Emitter Width',
        'emitter-height': 'Emitter Height',
        'particle-lifetime': 'Particle Lifetime (sec)',
        'position-offset': 'Position Offset',
        'fade-in': 'Fade In Distance %',
        'fade-out': 'Fade Out Start %',
        'particle-size': 'Particle Size',
        'size-variance': 'Size Variance',
        'size-fade-method': 'Size Fade Method',
        'color-offset': 'Color Offset',
        'color-variance': 'Color Variance',
        'color-fade-method': 'Color Fade Method',
        'max-opacity': 'Max Opacity',
        'opacity-variance': 'Opacity Variance',
        'opacity-fade-method': 'Opacity Fade Method',
        'rotation-variance': 'Rotation Variance',
        'rotation-speed': 'Rotation Speed',
        'rotation-speed-variance': 'Rotation Speed Variance',
        'velocity': 'Velocity',
        'velocity-variance': 'Velocity Variance',
        'velocity-direction': 'Velocity Direction',
        'velocity-direction-variance': 'Velocity Direction Variance',
        'gravity': 'Gravity',
        'gravity-direction': 'Gravity Direction',
        'resistance': 'Resistance',
        'turbulent': 'Turbulent',
        'turbulent-speed': 'Turbulent Speed'
    };
    
    // Iterate over control map and add values
    for (var controlId in controlMap) {
        var effectName = controlMap[controlId];
        var control = document.getElementById(controlId);
        
        if (control) {
            var value = control.value;
            
            // Convert to number if possible
            if (!isNaN(value)) {
                value = parseFloat(value);
            }
            
            settings[effectName] = value;
        }
    }
    
    // Get shape types from checkboxes
    const shapeTypeCheckboxes = document.querySelectorAll('.shape-type-checkbox');
    const selectedShapeTypes = [];
    
    shapeTypeCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedShapeTypes.push(checkbox.value);
        }
    });
    
    // If nothing is selected, default to ellipse
    if (selectedShapeTypes.length === 0) {
        selectedShapeTypes.push('ellipse');
    }
    
    settings["Shape Types"] = selectedShapeTypes;
    
    // If selected-layer is in the shape types, add the selected layer index
    if (selectedShapeTypes.includes('selected-layer')) {
        var selectedLayer = document.getElementById('selected-layer').value;
        settings["Selected Layer"] = selectedLayer;
    }
    
    // Add shape-specific properties for any selected shape type
    if (selectedShapeTypes.includes('rectangle')) {
        settings["Rectangle Roundness"] = parseFloat(document.getElementById('rectangle-roundness').value);
    }
    
    if (selectedShapeTypes.includes('star')) {
        settings["Star Points"] = parseFloat(document.getElementById('star-points').value);
        settings["Star Inner Radius"] = parseFloat(document.getElementById('star-inner-radius').value);
        settings["Star Inner Roundness"] = parseFloat(document.getElementById('star-inner-roundness').value);
        settings["Star Outer Roundness"] = parseFloat(document.getElementById('star-outer-roundness').value);
    }
    
    if (selectedShapeTypes.includes('polygon')) {
        settings["Polygon Sides"] = parseFloat(document.getElementById('polygon-sides').value);
        settings["Polygon Roundness"] = parseFloat(document.getElementById('polygon-roundness').value);
    }
    
    // Get color values from state
    var startColor = colorState.start;
    var endColor = colorState.end;
    
    // Convert HSB to RGB for color values
    var startRgb = hsbToRgb(startColor.h, startColor.s / 100, startColor.b / 100);
    var endRgb = hsbToRgb(endColor.h, endColor.s / 100, endColor.b / 100);
    
    // Add opacity
    startRgb.push(startColor.opacity / 100);
    endRgb.push(endColor.opacity / 100);
    
    // Set the color values
    settings["Start Color"] = startRgb;
    settings["End Color"] = endRgb;
    
    return settings;
}

// Apply loaded settings to UI controls
function applySettingsToUI(settings) {
    // Basic settings
    if (settings["Total Particles"] !== undefined)
        document.getElementById('total-particles').value = settings["Total Particles"];
    
    if (settings["Active Particles"] !== undefined) {
        document.getElementById('particle-count').value = settings["Active Particles"];
        
        // Show active particles mode if it differs from total
        if (settings["Active Particles"] < settings["Total Particles"]) {
            document.getElementById('total-particles-control').style.display = 'none';
            document.getElementById('active-particles-control').style.display = 'block';
            
            // Update the toggle checkboxes
            const showActiveToggle = document.getElementById('show-active-particles');
            const showActiveToggleAlt = document.getElementById('show-active-particles-alt');
            
            if (showActiveToggle) showActiveToggle.checked = true;
            if (showActiveToggleAlt) showActiveToggleAlt.checked = true;
        }
    }
    
    // Apply other basic settings
    if (settings["Emitter Width"] !== undefined)
        document.getElementById('emitter-width').value = settings["Emitter Width"];
    
    if (settings["Emitter Height"] !== undefined)
        document.getElementById('emitter-height').value = settings["Emitter Height"];
    
    if (settings["Particle Lifetime (sec)"] !== undefined)
        document.getElementById('particle-lifetime').value = settings["Particle Lifetime (sec)"];
    
    if (settings["Position Offset"] !== undefined)
        document.getElementById('position-offset').value = settings["Position Offset"];
    
    if (settings["Fade In Distance %"] !== undefined)
        document.getElementById('fade-in').value = settings["Fade In Distance %"];
    
    if (settings["Fade Out Start %"] !== undefined)
        document.getElementById('fade-out').value = settings["Fade Out Start %"];
    
    // Size settings
    if (settings["Particle Size"] !== undefined)
        document.getElementById('particle-size').value = settings["Particle Size"];
    
    if (settings["Size Variance"] !== undefined)
        document.getElementById('size-variance').value = settings["Size Variance"];
    
    if (settings["Size Fade Method"] !== undefined)
        document.getElementById('size-fade-method').value = settings["Size Fade Method"] > 0.5 ? "1" : "0";
    
    // Color settings
    if (settings["Start Color"] !== undefined) {
        var startRgb = settings["Start Color"];
        var startHsb = rgbToHsb(startRgb[0], startRgb[1], startRgb[2]);
        colorState.start = {
            h: Math.round(startHsb[0]),
            s: Math.round(startHsb[1] * 100),
            b: Math.round(startHsb[2] * 100),
            opacity: Math.round(startRgb[3] * 100)
        };
        updateSwatch('start');
        document.getElementById('start-opacity').value = colorState.start.opacity;
    }
    
    if (settings["End Color"] !== undefined) {
        var endRgb = settings["End Color"];
        var endHsb = rgbToHsb(endRgb[0], endRgb[1], endRgb[2]);
        colorState.end = {
            h: Math.round(endHsb[0]),
            s: Math.round(endHsb[1] * 100),
            b: Math.round(endHsb[2] * 100),
            opacity: Math.round(endRgb[3] * 100)
        };
        updateSwatch('end');
        document.getElementById('end-opacity').value = colorState.end.opacity;
    }
    
    if (settings["Color Offset"] !== undefined)
        document.getElementById('color-offset').value = settings["Color Offset"];
    
    if (settings["Color Fade Method"] !== undefined)
        document.getElementById('color-fade-method').value = settings["Color Fade Method"] > 0.5 ? "1" : "0";
    
    if (settings["Color Variance"] !== undefined)
        document.getElementById('color-variance').value = settings["Color Variance"];
    
    // Opacity settings
    if (settings["Max Opacity"] !== undefined)
        document.getElementById('max-opacity').value = settings["Max Opacity"];
    
    if (settings["Opacity Variance"] !== undefined)
        document.getElementById('opacity-variance').value = settings["Opacity Variance"];
    
    if (settings["Opacity Fade Method"] !== undefined)
        document.getElementById('opacity-fade-method').value = settings["Opacity Fade Method"] > 0.5 ? "1" : "0";
    
    // Rotation settings
    if (settings["Rotation Variance"] !== undefined)
        document.getElementById('rotation-variance').value = settings["Rotation Variance"];
    
    if (settings["Rotation Speed"] !== undefined)
        document.getElementById('rotation-speed').value = settings["Rotation Speed"];
    
    if (settings["Rotation Speed Variance"] !== undefined)
        document.getElementById('rotation-speed-variance').value = settings["Rotation Speed Variance"];
    
    // Motion settings
    if (settings["Velocity"] !== undefined)
        document.getElementById('velocity').value = settings["Velocity"];
    
    if (settings["Velocity Variance"] !== undefined)
        document.getElementById('velocity-variance').value = settings["Velocity Variance"];
    
    if (settings["Velocity Direction"] !== undefined) {
        document.getElementById('velocity-direction').value = settings["Velocity Direction"];
        updateDirectionVisual('velocity-direction', 'velocity-line');
    }
    
    if (settings["Velocity Direction Variance"] !== undefined)
        document.getElementById('velocity-direction-variance').value = settings["Velocity Direction Variance"];
    
    if (settings["Gravity"] !== undefined)
        document.getElementById('gravity').value = settings["Gravity"];
    
    if (settings["Gravity Direction"] !== undefined) {
        document.getElementById('gravity-direction').value = settings["Gravity Direction"];
        updateDirectionVisual('gravity-direction', 'gravity-line');
    }
    
    if (settings["Resistance"] !== undefined)
        document.getElementById('resistance').value = settings["Resistance"];
    
    // Effects
    if (settings["Turbulent"] !== undefined)
        document.getElementById('turbulent').value = settings["Turbulent"];
    
    if (settings["Turbulent Speed"] !== undefined)
        document.getElementById('turbulent-speed').value = settings["Turbulent Speed"];
    
    // Handle shape types
    // First, uncheck all shape type checkboxes
    document.querySelectorAll('.shape-type-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Apply shape types if available in new format
    if (settings["Shape Types"] !== undefined && Array.isArray(settings["Shape Types"])) {
        settings["Shape Types"].forEach(shapeType => {
            const checkbox = document.getElementById('shape-type-' + shapeType);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    } 
    // Handle legacy format (single Shape Type)
    else if (settings["Shape Type"] !== undefined) {
        const checkbox = document.getElementById('shape-type-' + settings["Shape Type"]);
        if (checkbox) {
            checkbox.checked = true;
        }
    }
    
    // Update shape properties display
    const layerSelectionControl = document.getElementById('layer-selection-control');
    const rectangleProperties = document.getElementById('rectangle-properties');
    const starProperties = document.getElementById('star-properties');
    const starControls = document.querySelectorAll('.star-control');
    const polygonProperties = document.getElementById('polygon-properties');
    const polygonControls = document.querySelectorAll('.polygon-control');
    
    // Hide all shape-specific controls first
    layerSelectionControl.style.display = 'none';
    rectangleProperties.style.display = 'none';
    starProperties.style.display = 'none';
    starControls.forEach(control => control.style.display = 'none');
    polygonProperties.style.display = 'none';
    polygonControls.forEach(control => control.style.display = 'none');
    
    // Get selected shape types
    let selectedShapeTypes = [];
    
    if (settings["Shape Types"] !== undefined && Array.isArray(settings["Shape Types"])) {
        selectedShapeTypes = settings["Shape Types"];
    } else if (settings["Shape Type"] !== undefined) {
        selectedShapeTypes = [settings["Shape Type"]];
    }
    
    // Show appropriate controls based on shape types
    if (selectedShapeTypes.includes('rectangle')) {
        rectangleProperties.style.display = 'block';
        // Apply rectangle properties
        if (settings["Rectangle Roundness"] !== undefined) {
            document.getElementById('rectangle-roundness').value = settings["Rectangle Roundness"];
        }
    }
    
    if (selectedShapeTypes.includes('star')) {
        starProperties.style.display = 'block';
        starControls.forEach(control => control.style.display = 'block');
        // Apply star properties
        if (settings["Star Points"] !== undefined) {
            document.getElementById('star-points').value = settings["Star Points"];
        }
        if (settings["Star Inner Radius"] !== undefined) {
            document.getElementById('star-inner-radius').value = settings["Star Inner Radius"];
        }
        if (settings["Star Inner Roundness"] !== undefined) {
            document.getElementById('star-inner-roundness').value = settings["Star Inner Roundness"];
        }
        if (settings["Star Outer Roundness"] !== undefined) {
            document.getElementById('star-outer-roundness').value = settings["Star Outer Roundness"];
        }
    }
    
    if (selectedShapeTypes.includes('polygon')) {
        polygonProperties.style.display = 'block';
        polygonControls.forEach(control => control.style.display = 'block');
        // Apply polygon properties
        if (settings["Polygon Sides"] !== undefined) {
            document.getElementById('polygon-sides').value = settings["Polygon Sides"];
        }
        if (settings["Polygon Roundness"] !== undefined) {
            document.getElementById('polygon-roundness').value = settings["Polygon Roundness"];
        }
    }
    
    if (selectedShapeTypes.includes('selected-layer')) {
        layerSelectionControl.style.display = 'block';
        fetchAvailableLayers();
        
        // Set selected layer if available (after a brief delay to allow layers to load)
        if (settings["Selected Layer"] !== undefined) {
            setTimeout(function() {
                const layerDropdown = document.getElementById('selected-layer');
                layerDropdown.value = settings["Selected Layer"];
            }, 300);
        }
    }
    
    // Update all sliders to match their input values
    updateAllSliders();
}

// Update all slider values to match their corresponding inputs
function updateAllSliders() {
    const sliders = document.querySelectorAll('.input-slider');
    
    sliders.forEach(function(slider) {
        // Get the corresponding input (remove -slider suffix from ID)
        const inputId = slider.id.replace('-slider', '');
        const input = document.getElementById(inputId);
        
        if (input) {
            const value = parseFloat(input.value);
            
            // Check if value is within slider range, extend if needed
            const min = parseFloat(slider.min);
            let max = parseFloat(slider.max);
            
            // Special case for particle-count
            if (inputId === 'particle-count') {
                const totalValue = parseInt(document.getElementById('total-particles').value) || 500;
                if (max !== totalValue) {
                    max = totalValue;
                    slider.max = max;
                    input.max = max;
                }
                
                // Always set active particles to match total particles
                input.value = max;
                slider.value = max;
                return; // Skip the rest of this iteration
            }
            
            if (value < min) {
                slider.min = value;
            } else if (value > max && inputId !== 'particle-count') {
                // For non-particle-count inputs, extend the max if needed
                slider.max = value * 1.5;
            }
            
            slider.value = value;
        }
    });
}

// Setup HSB color pickers
function setupHSBColorPickers() {
    // Initialize the swatches
    updateSwatch('start');
    updateSwatch('end');
}

// Link a slider to its numeric input
function linkSliderToInput(slider, input, callback) {
    // Update input when slider changes
    slider.addEventListener('input', function() {
        input.value = slider.value;
        if (callback) callback();
    });
    
    // Update slider when input changes
    input.addEventListener('change', function() {
        var value = parseFloat(input.value);
        if (!isNaN(value)) {
            value = Math.max(slider.min, Math.min(slider.max, value));
            slider.value = value;
            input.value = value;
            if (callback) callback();
        }
    });
}

// HSB to RGB conversion
function hsbToRgb(h, s, b) {
    var i, f, p, q, t;
    var r, g, b1;
    
    h = h % 360;
    s = Math.max(0, Math.min(1, s));
    b = Math.max(0, Math.min(1, b));
    
    if (s === 0) {
        // Achromatic (grey)
        return [b, b, b];
    }
    
    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = b * (1 - s);
    q = b * (1 - s * f);
    t = b * (1 - s * (1 - f));
    
    switch (i) {
        case 0: r = b; g = t; b1 = p; break;
        case 1: r = q; g = b; b1 = p; break;
        case 2: r = p; g = b; b1 = t; break;
        case 3: r = p; g = q; b1 = b; break;
        case 4: r = t; g = p; b1 = b; break;
        case 5: r = b; g = p; b1 = q; break;
        default: r = 0; g = 0; b1 = 0; break;
    }
    
    return [r, g, b1];
}

// RGB to HSB conversion
function rgbToHsb(r, g, b) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var h, s, v; // Using v for value/brightness to avoid naming conflict with parameter b
    
    if (max === 0) {
        s = 0;
    } else {
        s = d / max;
    }
    
    v = max; // Renamed b to v for value/brightness
    
    if (max === min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6; // Normalize to 0-1 range first
        h *= 360; // Then convert to degrees
    }
    
    return [h, s, v]; // Return as 0-1 values without rounding
}

// Create particle system
function createParticleSystem() {
    // Gather all settings from UI
    var settings = gatherSettingsFromUI();
    
    // Initialize creation with total particles and selected system info
    var totalParticles = settings["Total Particles"];
    var activeParticles = settings["Active Particles"];
    var selectedSystem = document.getElementById('existing-systems').value;
    
    // Validate input
    if (isNaN(totalParticles) || totalParticles < 1 || totalParticles > 500) {
        alert('Please enter a valid number of total particles between 1 and 500.');
        debug.warn("Invalid total particle count: " + totalParticles);
        return;
    }
    
    // Ensure active particles doesn't exceed total particles
    if (activeParticles > totalParticles) {
        activeParticles = totalParticles;
        document.getElementById('particle-count').value = totalParticles;
    }
    
    debug("Creating particle system with " + totalParticles + " total particles, " + activeParticles + " active");
    if (selectedSystem !== 'none') {
        debug("Using settings from: " + selectedSystem);
    }
    
    // Show loading state
    var createBtn = document.getElementById('create-btn');
    var originalText = createBtn.textContent;
    createBtn.textContent = 'Creating...';
    createBtn.disabled = true;
    
    // Convert settings to JSON string
    var settingsJSON = JSON.stringify(settings);
    
    // Call the JSX function to create the particle system
    // Pass the settings JSON as additional parameter
    var scriptCall = 'createParticleSystem(' + totalParticles + ',' + activeParticles;
    
    // Add selected system if applicable
    if (selectedSystem !== 'none') {
        scriptCall += ',"' + selectedSystem + '"';
    } else {
        // Pass the current UI settings when not using an existing system
        scriptCall += ',null,' + "'" + settingsJSON + "'";
    }
    
    scriptCall += ')';
    
    csInterface.evalScript(scriptCall, function(result) {
        createBtn.textContent = originalText;
        createBtn.disabled = false;
        
        if (result && result !== 'success') {
            try {
                // Try to parse the result as JSON which might contain the new system name
                var resultObj = JSON.parse(result);
                if (resultObj && resultObj.success && resultObj.name) {
                    debug.success("Particle system created successfully: " + resultObj.name);
                    
                    // Check if the current shape type is "selected-layer" and refresh available layers
                    var currentShapeType = document.getElementById('shape-type').value;
                    if (currentShapeType === 'selected-layer') {
                        // Fetch available layers before refreshing system list
                        fetchAvailableLayers();
                    }
                    
                    // Refresh the list of existing systems
                    loadExistingSystems(function() {
                        // Then select the new system in the dropdown
                        var dropdown = document.getElementById('existing-systems');
                        for (var i = 0; i < dropdown.options.length; i++) {
                            if (dropdown.options[i].value === resultObj.name) {
                                dropdown.value = resultObj.name;
                                
                                // Trigger change event
                                var event = new Event('change');
                                dropdown.dispatchEvent(event);
                                
                                // Enable live editing for the new system
                                if (realtimeEnabled) {
                                    activeSystemName = resultObj.name;
                                }
                                
                                break;
                            }
                        }
                    });
                    return;
                }
            } catch (e) {
                // If parsing fails, fall back to the old behavior
                debug.error("Error parsing create result: " + e);
            }
        }
        
        if (result === 'success') {
            debug.success("Particle system created successfully!");
            
            // Check if the current shape type is "selected-layer" and refresh available layers
            var currentShapeType = document.getElementById('shape-type').value;
            if (currentShapeType === 'selected-layer') {
                // Fetch available layers before refreshing system list
                fetchAvailableLayers();
            }
            
            // Refresh the list of existing systems after a slight delay
            setTimeout(refreshExistingSystems, 500);
        } else {
            debug.error("Error creating particle system: " + result);
        }
    });
}

// Setup event listeners for hex color inputs
function setupHexInputs() {
    var startHexInput = document.getElementById('start-color-hex');
    var endHexInput = document.getElementById('end-color-hex');
    
    // Set initial hex values
    updateHexFromColor('start');
    updateHexFromColor('end');
    
    // Add event listeners for hex inputs - triggers on blur (lose focus)
    startHexInput.addEventListener('change', function() {
        updateColorFromHex('start');
    });
    
    endHexInput.addEventListener('change', function() {
        updateColorFromHex('end');
    });
    
    // Add keypress event for Enter key
    startHexInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            updateColorFromHex('start');
            this.blur(); // Remove focus after applying
        }
    });
    
    endHexInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            updateColorFromHex('end');
            this.blur(); // Remove focus after applying
        }
    });
}

// Update hex input from color state
function updateHexFromColor(prefix) {
    var hexInput = document.getElementById(prefix + '-color-hex');
    var color = colorState[prefix];
    var rgb = hsbToRgb(color.h, color.s / 100, color.b / 100);
    
    var r = Math.round(rgb[0] * 255).toString(16).padStart(2, '0');
    var g = Math.round(rgb[1] * 255).toString(16).padStart(2, '0');
    var b = Math.round(rgb[2] * 255).toString(16).padStart(2, '0');
    
    hexInput.value = '#' + r + g + b;
}

// Update color state from hex input
function updateColorFromHex(prefix) {
    var hexInput = document.getElementById(prefix + '-color-hex');
    var hexValue = hexInput.value;
    
    // Validate hex format (allow with or without # prefix)
    if (!hexValue.startsWith('#')) {
        hexValue = '#' + hexValue;
    }
    
    // Validate final hex format
    if (!hexValue.match(/^#[0-9A-Fa-f]{6}$/)) {
        // Revert to current color if invalid
        updateHexFromColor(prefix);
        return;
    }
    
    // Convert hex to RGB
    var r = parseInt(hexValue.substring(1, 3), 16);
    var g = parseInt(hexValue.substring(3, 5), 16);
    var b = parseInt(hexValue.substring(5, 7), 16);
    
    // Convert RGB to HSB
    var hsb = rgbToHsb(r, g, b);
    
    // Update color state with the correct value ranges
    // hsb[0] is already in degrees (0-360)
    // hsb[1] and hsb[2] are in 0-1 range and need to be converted to 0-100
    colorState[prefix] = {
        h: Math.round(hsb[0]),
        s: Math.round(hsb[1] * 100),
        b: Math.round(hsb[2] * 100),
        opacity: colorState[prefix].opacity // Preserve existing opacity
    };
    
    // Update the swatch
    updateSwatch(prefix);
    
    // Update hex value with proper formatting
    hexInput.value = hexValue;
    
    // Trigger real-time update if enabled
    if (realtimeEnabled) {
        handleControlChange({target: document.getElementById(prefix + '-opacity')});
    }
}

// Start polling for selected layer changes
function startSelectionPolling() {
    // Clear any existing polling
    stopSelectionPolling();
    
    // Counter for layer list refresh (to avoid refreshing on every poll)
    window.layerRefreshCounter = 0;
    
    // Start new polling at 1-second intervals
    selectedSystemPolling = setInterval(function() {
        // Check if extension is visible/active before polling
        csInterface.evalScript('(function() { return true; })()', function(result) {
            if (result === "true") {
                // Only poll if extension is active
                checkForSelectedLayerChanges();
                
                // Periodically refresh the systems list to detect deleted layers
                refreshExistingSystems();
                
                // Periodically refresh the layer list as well (every 3 seconds)
                window.layerRefreshCounter++;
                if (window.layerRefreshCounter >= 3) {
                    window.layerRefreshCounter = 0;
                    checkAndRefreshLayerList();
                }
            }
        });
    }, 1000); // Check every second
    
    debug("Selection polling started");
}

// Stop polling for selected layer changes
function stopSelectionPolling() {
    if (selectedSystemPolling) {
        clearInterval(selectedSystemPolling);
        selectedSystemPolling = null;
        debug("Selection polling stopped");
    }
}

// Restart polling for selected layer changes
function restartSelectionPolling() {
    stopSelectionPolling();
    startSelectionPolling();
}

// Check if the selected layer has changed
function checkForSelectedLayerChanges() {
    // Skip if we're already processing a dropdown change
    if (changingSystemDropdown) {
        return;
    }
    
    csInterface.evalScript('getSelectedParticleSystem()', function(result) {
        // Skip if we're already processing a dropdown change (check again in case it changed)
        if (changingSystemDropdown) {
            return;
        }
        
        try {
            var selectedSystem = JSON.parse(result);
            
            // Only update if the selection has changed
            if (selectedSystem && selectedSystem.name && 
                selectedSystem.name !== lastSelectedSystemName) {
                
                // Update the last selected system
                lastSelectedSystemName = selectedSystem.name;
                
                // Auto-select in dropdown
                var dropdown = document.getElementById('existing-systems');
                
                for (var i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value === selectedSystem.name) {
                        // Only change if it's different from current selection
                        if (dropdown.value !== selectedSystem.name) {
                            // Set flag to prevent re-entrancy
                            changingSystemDropdown = true;
                            
                            dropdown.value = selectedSystem.name;
                            // Trigger change event to load settings
                            var event = new Event('change');
                            dropdown.dispatchEvent(event);
                            debug("Auto-selected system (via polling): " + selectedSystem.name);
                            
                            // The flag will be reset when handleSystemChange completes
                        }
                        break;
                    }
                }
            } else if (!selectedSystem || !selectedSystem.name) {
                // Reset selected system when none is selected
                if (lastSelectedSystemName !== null) {
                    lastSelectedSystemName = null;
                    
                    // Get current selected value in dropdown
                    var dropdown = document.getElementById('existing-systems');
                    
                    // If there's no selected system, ensure dropdown is set to 'none'
                    if (dropdown.value !== 'none') {
                        changingSystemDropdown = true;
                        dropdown.value = 'none';
                        
                        // Trigger change event to properly disable realtime toggle
                        var event = new Event('change');
                        dropdown.dispatchEvent(event);
                        debug("Auto-selected 'none' (via polling)");
                        
                        // The flag will be reset when handleSystemChange completes
                    } else {
                        // Even if dropdown is already 'none', ensure realtime toggle is disabled
                        var realtimeToggle = document.getElementById('realtime-toggle');
                        realtimeToggle.disabled = true;
                        
                        if (realtimeToggle.checked) {
                            realtimeToggle.checked = false;
                            realtimeEnabled = false;
                            activeSystemName = null;
                            document.body.classList.remove('realtime-active');
                        }
                    }
                }
            }
        } catch (e) {
            // Silently handle errors to avoid annoying users
            console.log("Error in selection polling: " + e.toString());
            changingSystemDropdown = false;
        }
    });
}

// Clean up resources when extension closes
window.onbeforeunload = function() {
    stopSelectionPolling();
};

// Handle visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Extension is hidden, pause polling to save resources
        stopSelectionPolling();
    } else {
        // Extension is visible again, restart polling
        startSelectionPolling();
        
        // Also refresh the system list and selection
        loadExistingSystemsAndSelectCurrent();
    }
});

// Refresh the list of existing particle systems
function refreshExistingSystems() {
    // Use a simple counter to refresh less frequently than selection checks
    if (!window.systemRefreshCounter) {
        window.systemRefreshCounter = 0;
    }
    
    // Only refresh every 3 seconds (3 polling cycles) to reduce overhead
    window.systemRefreshCounter++;
    if (window.systemRefreshCounter >= 3) {
        window.systemRefreshCounter = 0;
        
        // Skip if we're in the middle of a dropdown change
        if (changingSystemDropdown) {
            return;
        }
        
        // Store the current selection before refreshing
        var currentSelection = document.getElementById('existing-systems').value;
        
        // Load existing systems
        loadExistingSystems(function() {
            // Check if the currently selected system (in dropdown) is 'none'
            var dropdown = document.getElementById('existing-systems');
            if (dropdown.value === 'none') {
                // Disable the realtime toggle if selected system is none
                var realtimeToggle = document.getElementById('realtime-toggle');
                realtimeToggle.disabled = true;
                
                // Also ensure realtime is turned off
                if (realtimeToggle.checked) {
                    realtimeToggle.checked = false;
                    realtimeEnabled = false;
                    activeSystemName = null;
                    document.body.classList.remove('realtime-active');
                    debug("Disabled realtime - no system selected");
                }
            }
            
            // If the currently active system is no longer in the dropdown, disable realtime
            if (realtimeEnabled && activeSystemName) {
                var stillExists = false;
                
                for (var i = 0; i < dropdown.options.length; i++) {
                    if (dropdown.options[i].value === activeSystemName) {
                        stillExists = true;
                        break;
                    }
                }
                
                // If the active system no longer exists
                if (!stillExists) {
                    // Disable real-time updates
                    document.getElementById('realtime-toggle').checked = false;
                    realtimeEnabled = false;
                    activeSystemName = null;
                    document.body.classList.remove('realtime-active');
                    debug("Disabled realtime - active system was deleted");
                }
            }
        });
    }
}

// Setup the panel flyout menu
function setupPanelMenu() {
    // Create menu XML
    var menuXML = '<Menu>' +
                  '<MenuItem Id="reload" Label="Reload Extension" />' +
                  '</Menu>';
    
    // Set the flyout menu
    csInterface.setPanelFlyoutMenu(menuXML);
    
    // Register the menu click event
    csInterface.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", handlePanelMenuClick);
}

// Handle panel menu clicks
function handlePanelMenuClick(event) {
    var menuId = event.data.menuId;
    
    if (menuId === "reload") {
        // Reload the extension
        reloadExtension();
    }
}

// Reload the extension
function reloadExtension() {
    debug("Reloading extension...");
    
    // Clean up resources and listeners
    if (selectedSystemPolling) {
        clearInterval(selectedSystemPolling);
        selectedSystemPolling = null;
    }
    
    // Clean up event listeners
    csInterface.removeEventListener("com.adobe.csxs.events.flyoutMenuClicked", handlePanelMenuClick);
    csInterface.removeEventListener("com.adobe.csxs.events.panelActivated", handlePanelFocusChange);
    csInterface.removeEventListener("applicationActive", handlePanelFocusChange);
    csInterface.removeEventListener("com.adobe.ae.layer.selected", handlePanelFocusChange);
    csInterface.removeEventListener("com.adobe.ae.composition.changed", handlePanelFocusChange);
    
    // Show a quick notification to user
    var notification = document.createElement('div');
    notification.className = 'reload-notification';
    notification.textContent = 'Reloading...';
    document.body.appendChild(notification);
    
    // Give a slight delay before reloading to show notification
    setTimeout(function() {
        // Reload the page
        window.location.reload();
    }, 300);
}

// Function to set up shape type dropdown behavior
function setupShapeTypeDropdown() {
    const shapeTypeCheckboxes = document.querySelectorAll('.shape-type-checkbox');
    const layerSelectionControl = document.getElementById('layer-selection-control');
    
    // Get all shape property controls
    const rectangleProperties = document.getElementById('rectangle-properties');
    const starProperties = document.getElementById('star-properties');
    const starControls = document.querySelectorAll('.star-control');
    const polygonProperties = document.getElementById('polygon-properties');
    const polygonControls = document.querySelectorAll('.polygon-control');
    
    // Helper function to hide all shape property controls
    const hideAllShapeProperties = () => {
        rectangleProperties.style.display = 'none';
        starProperties.style.display = 'none';
        starControls.forEach(control => control.style.display = 'none');
        polygonProperties.style.display = 'none';
        polygonControls.forEach(control => control.style.display = 'none');
    };
    
    // Function to update the shape controls based on selected checkboxes
    const updateShapeControls = () => {
        // First, hide all shape properties
        hideAllShapeProperties();
        
        // Hide layer selection by default
        layerSelectionControl.style.display = 'none';
        
        // Get all selected shape types
        const selectedShapeTypes = getSelectedShapeTypes();
        
        // Check each shape type and show its properties
        if (selectedShapeTypes.includes('rectangle')) {
            rectangleProperties.style.display = 'block';
        }
        
        if (selectedShapeTypes.includes('star')) {
            starProperties.style.display = 'block';
            starControls.forEach(control => control.style.display = 'block');
        }
        
        if (selectedShapeTypes.includes('polygon')) {
            polygonProperties.style.display = 'block';
            polygonControls.forEach(control => control.style.display = 'block');
        }
        
        if (selectedShapeTypes.includes('selected-layer')) {
            layerSelectionControl.style.display = 'block';
            // Fix dropdown positioning
            setupLayerDropdownPosition();
            // Fetch available layers
            fetchAvailableLayers();
        }
        
        // If real-time editing is enabled, update the particle system
        if (realtimeEnabled) {
            handleControlChange({});
        }
    };
    
    // Helper function to get selected shape types
    const getSelectedShapeTypes = () => {
        const selected = [];
        shapeTypeCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selected.push(checkbox.value);
            }
        });
        // If nothing is selected, default to ellipse
        if (selected.length === 0) {
            document.getElementById('shape-type-ellipse').checked = true;
            selected.push('ellipse');
        }
        return selected;
    };
    
    // Add change event listener to each checkbox
    shapeTypeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            updateShapeControls();
            
            // If the selected-layer checkbox was checked, refresh the layer list
            if (checkbox.value === 'selected-layer' && checkbox.checked) {
                refreshAvailableLayers();
            }
        });
    });
    
    // Make the entire shape checkbox div clickable
    document.querySelectorAll('.shape-checkbox').forEach(container => {
        container.addEventListener('click', function(e) {
            // If the click was directly on the checkbox, do nothing (avoid double toggle)
            // Also if the click was on the label, do nothing (label's "for" attribute already handles it)
            if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                return;
            }
            
            // Find the checkbox inside this container and toggle it
            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                
                // Trigger change event to update the UI
                const event = new Event('change');
                checkbox.dispatchEvent(event);
            }
        });
    });
    
    // Add change event listener for layer selection dropdown
    const layerSelectionDropdown = document.getElementById('selected-layer');
    layerSelectionDropdown.addEventListener('change', function() {
        if (realtimeEnabled) {
            handleControlChange({target: this});
        }
    });
    
    // Add click event to ensure dropdown displays correctly
    layerSelectionDropdown.addEventListener('mousedown', function(e) {
        // Get layer dropdown position
        const rect = this.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const dropdownHeight = 200; // Estimated dropdown height
        
        // If dropdown would extend beyond window
        if (rect.bottom + dropdownHeight > windowHeight) {
            // Create a custom dropdown positioned upward
            e.preventDefault();
            showCustomLayerDropdown(this, rect);
        }
    });
    
    // Add change listeners for all shape property controls to enable real-time updates
    document.querySelectorAll('.shape-property input').forEach(input => {
        input.addEventListener('change', function() {
            if (realtimeEnabled) {
                handleControlChange({target: this});
            }
        });
        
        input.addEventListener('input', function() {
            if (realtimeEnabled) {
                handleControlChange({target: this});
            }
        });
    });
}

// Function to set up layer dropdown positioning
function setupLayerDropdownPosition() {
    // Add CSS for dropdown styling if not already added
    if (!document.getElementById('dropdown-styles')) {
        const styleElem = document.createElement('style');
        styleElem.id = 'dropdown-styles';
        styleElem.textContent = `
            .custom-dropdown {
                position: absolute;
                background-color: #2D2D2D;
                border: 1px solid #555;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            }
            .custom-dropdown-option {
                padding: 8px 12px;
                cursor: pointer;
            }
            .custom-dropdown-option:hover {
                background-color: #3D3D3D;
            }
            .layer-shape { color: #4CAF50; }
            .layer-solid { color: #2196F3; }
            .layer-comp { color: #9C27B0; }
            .layer-text { color: #FF9800; }
            .layer-image { color: #00BCD4; }
            .layer-video { color: #F44336; }
        `;
        document.head.appendChild(styleElem);
    }
    
    // Ensure the layer selection control has position relative
    const layerSelectionControl = document.getElementById('layer-selection-control');
    layerSelectionControl.style.position = 'relative';
}

// Function to show custom layer dropdown
function showCustomLayerDropdown(select, rect) {
    // Remove any existing custom dropdowns
    const existingDropdown = document.querySelector('.custom-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    // Create custom dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';
    dropdown.style.width = rect.width + 'px';
    dropdown.style.left = rect.left + 'px';
    // Position above the select
    dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
    
    // Add options
    Array.from(select.options).forEach((option, index) => {
        const dropdownOption = document.createElement('div');
        dropdownOption.className = 'custom-dropdown-option';
        if (option.className) {
            dropdownOption.className += ' ' + option.className;
        }
        dropdownOption.dataset.value = option.value;
        dropdownOption.dataset.index = index;
        dropdownOption.textContent = option.text;
        
        // Apply click handler
        dropdownOption.addEventListener('click', function() {
            select.selectedIndex = this.dataset.index;
            select.value = this.dataset.value;
            
            // Trigger change event
            const event = new Event('change');
            select.dispatchEvent(event);
            
            // Close dropdown
            dropdown.remove();
        });
        
        dropdown.appendChild(dropdownOption);
    });
    
    // Add click outside to close
    document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target) && e.target !== select) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        }
    });
    
    // Add to document
    document.body.appendChild(dropdown);
}

// Function to fetch available layers from the composition
function fetchAvailableLayers(callback) {
    csInterface.evalScript('getAvailableLayers()', function(result) {
        if (result && result !== 'null' && result !== 'undefined') {
            try {
                const layers = JSON.parse(result);
                const layerDropdown = document.getElementById('selected-layer');
                const currentSelection = layerDropdown.value; // Save current selection
                
                // Clear existing options
                layerDropdown.innerHTML = '';
                
                if (layers.length === 0) {
                    // No layers available
                    const option = document.createElement('option');
                    option.value = 'none';
                    option.text = 'No Shape Layers Available';
                    layerDropdown.appendChild(option);
                } else {
                    // Add each shape layer as an option
                    layers.forEach(layer => {
                        const option = document.createElement('option');
                        option.value = layer.index;
                        option.text = layer.name;
                        option.dataset.hasShapePaths = layer.hasShapePaths;
                        layerDropdown.appendChild(option);
                    });
                    
                    // Try to restore the previous selection if it exists
                    let selectionFound = false;
                    for (let i = 0; i < layerDropdown.options.length; i++) {
                        if (layerDropdown.options[i].value === currentSelection) {
                            layerDropdown.value = currentSelection;
                            selectionFound = true;
                            break;
                        }
                    }
                    
                    // If the previous selection wasn't found, select the first option
                    if (!selectionFound && layerDropdown.options.length > 0 && currentSelection !== 'none') {
                        layerDropdown.selectedIndex = 0;
                    }
                }
                
                // Execute callback if provided
                if (typeof callback === 'function') {
                    callback();
                }
            } catch (e) {
                debug.error('Error parsing layers: ' + e);
                
                // Execute callback even on error
                if (typeof callback === 'function') {
                    callback();
                }
            }
        }
    });
}

// Function to add CSS styles for layer types
function addLayerTypeStyles() {
    // Not needed anymore since we only have shape layers
}

// Function to update additional controls based on selected layer type
function updateLayerSelectionControls() {
    // Not needed anymore since we only have shape layers
} 