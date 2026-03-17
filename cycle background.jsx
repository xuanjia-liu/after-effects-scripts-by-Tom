// Enhanced Color Manager with Background Cycling
// Combines Color Manager panel functionality with quick background cycling
// Alt+click: Open Color Manager UI
// Regular click: Cycle through background colors

(function() {
    // ========================================
    // CONFIGURATION & CONSTANTS
    // ========================================
    var CONFIG = {
        scriptName: "Color Manager + Background Cycling",
        version: "2.0",
        maxColors: 100,
        colorTolerance: 0.005,
        defaultButtonSize: { width: 35, height: 35 }
    };
    
    // ========================================
    // STATE MANAGEMENT
    // ========================================
    var state = {
        currentPalette: [],
        selectedColors: [],
        colorButtons: [],
        applyColorMode: "direct", // "direct" or "fill"
        applyToFill: true, // Whether to apply colors to fill
        applyToStroke: true, // Whether to apply colors to stroke
        panel: null,
        mainPanel: null,
        palettePanel: null,
        controlPanel: null
    };
    
    // ========================================
    // COLOR PALETTES
    // ========================================
    var defaultPalette = [
        [1, 0, 0],           // #FF0000 - Red
        [1, 0.647, 0],       // #FFA500 - Orange
        [1, 1, 0],           // #FFFF00 - Yellow
        [0, 1, 0],           // #00FF00 - Green
        [0, 0, 1],           // #0000FF - Blue
        [0.5, 0, 0.5],       // #800080 - Purple
        [0, 0, 0],           // #000000 - Black
        [1, 1, 1],           // #FFFFFF - White
        [0.502, 0.247, 0.008], // #803f02 - Brown
        [0.502, 0.502, 0.502]  // #808080 - Gray
    ];
    
    var presetPalettes = {
        "Astro": [
            [0.118, 0.118, 0.463], [0.294, 0.294, 0.765], [0.439, 0.498, 0.961],
            [0.631, 0.584, 0.976], [0.949, 0.631, 0.949]
        ],
        "Moon": [
            [0.906, 0.886, 0.953], [0.655, 0.698, 0.902], [0.408, 0.549, 0.792],
            [0.286, 0.427, 0.612], [0.176, 0.235, 0.404]
        ],
        "Cotton Candy Dreams": [
            [0.475, 0.863, 0.863], [1.0, 0.541, 0.616], [1.0, 0.941, 0.941],
            [1.0, 0.859, 0.859], [1.0, 0.620, 0.702]
        ],
        "Forest Moth": [
            [0.267, 0.337, 0.184], [0.514, 0.576, 0.302], [0.718, 0.784, 0.553],
            [0.914, 0.875, 0.706], [0.937, 0.749, 0.702]
        ],
        "Night Winter": [
            [0.078, 0.110, 0.200], [0.184, 0.271, 0.435], [0.325, 0.455, 0.675],
            [0.545, 0.686, 0.816], [0.937, 0.961, 0.980]
        ],
        "80's Alien": [
            [0.302, 0.416, 1.0], [0.604, 0.361, 1.0], [1.0, 0.341, 0.725],
            [1.0, 0.925, 0.439], [0.0, 1.0, 0.616]
        ],
        "Cyberpunk Dreams": [
            [1.0, 0.239, 0.580], [0.710, 0.188, 0.494], [0.416, 0.165, 0.596],
            [0.247, 0.110, 0.427], [0.125, 0.043, 0.294]
        ],
        "Skyward Blossoms": [
            [0.341, 0.682, 1.0], [0.600, 0.847, 1.0], [1.0, 0.722, 0.980],
            [1.0, 0.816, 0.702], [1.0, 0.600, 0.808]
        ],
        "Soft Green": [
            [0.667, 0.855, 0.718], [0.710, 0.890, 0.690], [0.831, 0.910, 0.792],
            [0.945, 0.945, 0.855], [0.965, 0.776, 0.714]
        ]
    };
    
    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    
    // Font utilities for consistent styling
    var FontUtils = {
        createFont: function(family, style, size) {
            try {
                return ScriptUI.newFont(family, style, size);
            } catch (e) {
                return ScriptUI.newFont("Arial", ScriptUI.FontStyle.REGULAR, size);
            }
        },
        
        getTitleFont: function() {
            return this.createFont("Arial", ScriptUI.FontStyle.BOLD, 12);
        },
        
        getBodyFont: function() {
            return this.createFont("Arial", ScriptUI.FontStyle.REGULAR, 10);
        },
        
        getSmallFont: function() {
            return this.createFont("Arial", ScriptUI.FontStyle.REGULAR, 9);
        }
    };
    
    // Color conversion utilities
    var ColorUtils = {
        rgbToHex: function(rgb) {
            var r = Math.round(rgb[0] * 255);
            var g = Math.round(rgb[1] * 255);
            var b = Math.round(rgb[2] * 255);
            return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        },
        
        hexToRgb: function(hex) {
        hex = hex.replace(/^#/, '');
            if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                return null;
            }
            var r = parseInt(hex.substr(0, 2), 16) / 255;
            var g = parseInt(hex.substr(2, 2), 16) / 255;
            var b = parseInt(hex.substr(4, 2), 16) / 255;
            return [r, g, b];
        },
        
        removeDuplicateColors: function(colors) {
            var unique = [];
            var tolerance = CONFIG.colorTolerance;
            
            for (var i = 0; i < colors.length; i++) {
                var color = colors[i];
                var isDuplicate = false;
                
                for (var j = 0; j < unique.length; j++) {
                    var existingColor = unique[j];
                    if (Math.abs(color[0] - existingColor[0]) < tolerance &&
                        Math.abs(color[1] - existingColor[1]) < tolerance &&
                        Math.abs(color[2] - existingColor[2]) < tolerance) {
                        isDuplicate = true;
                        break;
                    }
                }
                
                if (!isDuplicate) {
                    unique.push(color);
                }
            }
            
            return unique;
        }
    };
    
    // Error handling utility
    var ErrorHandler = {
        safeExecute: function(func, context, errorMessage) {
            try {
                return func.call(context);
            } catch (e) {
                if (errorMessage) {
                    alert(errorMessage + ": " + e.toString());
                }
                return null;
            }
        },
        
        safeSetValue: function(prop, value, currentTime) {
            if (!prop) return false;
            
            try {
                if (prop.isTimeVarying) {
                    prop.setValueAtTime(currentTime, value);
                } else {
                    prop.setValue(value);
                }
                return true;
            } catch (e) {
                return false;
            }
        }
    };
    
    // ========================================
    // COMPOSITION BACKGROUND FUNCTIONS
    // ========================================

    function getSelectedCompositions() {
        var selectedComps = [];
        var selectedItems = app.project.selection;
        
        // If there are selected items in project panel, use those
        if (selectedItems && selectedItems.length > 0) {
            for (var i = 0; i < selectedItems.length; i++) {
                if (selectedItems[i] instanceof CompItem) {
                    selectedComps.push(selectedItems[i]);
                }
            }
        }
        
        // If no compositions selected in project panel, fall back to active item
        if (selectedComps.length === 0 && app.project.activeItem && app.project.activeItem instanceof CompItem) {
            selectedComps.push(app.project.activeItem);
        }
        
        return selectedComps;
    }

    function setCompBackgroundColor(color, compositions) {
        if (!compositions || compositions.length === 0) return false;
        
        try {
            app.beginUndoGroup("Change Composition Background Color");
            
            for (var i = 0; i < compositions.length; i++) {
                compositions[i].bgColor = color;
            }
            
            return true;
        } catch (error) {
            alert("Error setting background color: " + error.toString());
            return false;
        } finally {
            app.endUndoGroup();
        }
    }

    function getActiveCompBackgroundColor() {
        var comps = getSelectedCompositions();
        if (comps.length === 0) return [0, 0, 0];
        
        // Return the background color of the first selected composition
        return comps[0].bgColor;
    }

    function hasSelectedCompositions() {
        return getSelectedCompositions().length > 0;
    }

    function cycleBackgroundColors() {
        var selectedComps = getSelectedCompositions();
        
        if (selectedComps.length === 0) {
            alert("Please select one or more compositions in the project panel.");
            return;
        }

        // Use the first composition's color as reference for cycling
        var currentBgColor = selectedComps[0].bgColor;
        var colors = [
            [0, 0, 0],                      // Black
            [0.239, 0.239, 0.239],          // #3d3d3d
            [0.533, 0.533, 0.533],          // #888888
            [0.867, 0.867, 0.867],          // #dddddd
            [1, 1, 1],                      // White
            [1, 0, 0]                       // Red
        ];
        
        // Find closest matching color
        var currentHex = ColorUtils.rgbToHex(currentBgColor);
        var foundIndex = -1;
        for (var i = 0; i < colors.length; i++) {
            if (ColorUtils.rgbToHex(colors[i]) === currentHex) {
                foundIndex = i;
                break;
            }
        }
        
        var nextIndex = (foundIndex + 1) % colors.length;
        setCompBackgroundColor(colors[nextIndex], selectedComps);
        
        // Show feedback about how many compositions were affected
        var message = "Background color changed for " + selectedComps.length + " composition" + 
                     (selectedComps.length === 1 ? "" : "s") + ":\n";
        for (var j = 0; j < Math.min(selectedComps.length, 5); j++) {
            message += "• " + selectedComps[j].name + "\n";
        }
        if (selectedComps.length > 5) {
            message += "• ... and " + (selectedComps.length - 5) + " more";
        }
        
        // Show brief notification (will auto-dismiss)
        $.writeln(message);
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    
    function init() {
        // Start with the full default palette
        state.currentPalette = defaultPalette.slice();
    }
    
    // ========================================
    // UI BUILDING - COLOR MANAGER PANEL
    // ========================================
    
    function buildUI() {
        // Create panel - works both as panel and window
        if (this instanceof Panel) {
            state.panel = this;
        } else {
            state.panel = new Window("palette", CONFIG.scriptName + " v" + CONFIG.version, undefined, {resizeable: true});
        }
        
        state.panel.text = CONFIG.scriptName + " v" + CONFIG.version;
        state.panel.orientation = "column";
        state.panel.alignChildren = "fill";
        state.panel.spacing = 10;
        state.panel.margins = 16;
        
        // Header with title and quick actions
        createHeader();
        
        // Main color palette area
        createPaletteSection();
        
        // Toolbar with main actions
        createToolbar();
        
        // Application mode and info
        createFooter();
        
        // Set panel size
        state.panel.layout.layout(true);
        state.panel.layout.resize();
    }
    
    function createHeader() {
        var headerGroup = state.panel.add("group");
        headerGroup.alignment = "fill";
        headerGroup.spacing = 8;
        
        // Title with icon-like styling
        var titleGroup = headerGroup.add("group");
        titleGroup.alignment = "left";
        
        var titleText = titleGroup.add("statictext", undefined, "Color Palette");
        titleText.graphics.foregroundColor = titleText.graphics.newPen(titleText.graphics.PenType.SOLID_COLOR, [1, 1, 1], 1);
        titleText.graphics.font = FontUtils.getTitleFont();
        
        // Quick action buttons
        var quickActionsGroup = headerGroup.add("group");
        quickActionsGroup.alignment = "right";
        quickActionsGroup.spacing = 4;
        
        var addBtn = quickActionsGroup.add("button", undefined, "+");
        addBtn.helpTip = "Add new color";
        addBtn.onClick = addNewColor;
        addBtn.preferredSize.width = 30;
        addBtn.preferredSize.height = 24;
        
        var extractBtn = quickActionsGroup.add("button", undefined, "📥 Extract");
        extractBtn.helpTip = "Extract colors from selection";
        extractBtn.onClick = extractColors;
        extractBtn.preferredSize.width = 70;
        extractBtn.preferredSize.height = 24;
        

        
        var saveBtn = quickActionsGroup.add("button", undefined, "💾");
        saveBtn.helpTip = "Save palette";
        saveBtn.onClick = savePalette;
        saveBtn.preferredSize.width = 30;
        saveBtn.preferredSize.height = 24;
        
        var loadBtn = quickActionsGroup.add("button", undefined, "📂");
        loadBtn.helpTip = "Load palette";
        loadBtn.onClick = loadPalette;
        loadBtn.preferredSize.width = 30;
        loadBtn.preferredSize.height = 24;
        
        var presetBtn = quickActionsGroup.add("button", undefined, "🎨");
        presetBtn.helpTip = "Load preset";
        presetBtn.onClick = loadPresetPalette;
        presetBtn.preferredSize.width = 30;
        presetBtn.preferredSize.height = 24;
    }
    
    function createPaletteSection() {
        // Main palette container
        var paletteContainer = state.panel.add("panel", undefined, "");
        paletteContainer.orientation = "column";
        paletteContainer.alignChildren = "fill";
        paletteContainer.margins = 4;
        paletteContainer.spacing = 0;
        
        // Palette grid
        state.palettePanel = paletteContainer.add("group");
        state.palettePanel.orientation = "column";
        state.palettePanel.alignChildren = "fill";
        state.palettePanel.spacing = 8;
        
        createPaletteGrid();
    }
    
    function createToolbar() {
        var toolbarGroup = state.panel.add("group");
        toolbarGroup.alignment = "fill";
        toolbarGroup.spacing = 6;
        
        // Left side - Main actions
        var leftGroup = toolbarGroup.add("group");
        leftGroup.alignment = "left";
        leftGroup.spacing = 4;
        
        var randomBtn = leftGroup.add("button", undefined, "Random");
        randomBtn.helpTip = "Apply random colors to selection";
        randomBtn.onClick = randomApplyColors;
        randomBtn.preferredSize.width = 60;
        randomBtn.preferredSize.height = 24;
        
        // Center - Selection controls
        var centerGroup = toolbarGroup.add("group");
        centerGroup.alignment = "center";
        centerGroup.spacing = 4;
        
        var selectAllBtn = centerGroup.add("button", undefined, "Select All");
        selectAllBtn.helpTip = "Select all colors";
        selectAllBtn.onClick = selectAllColors;
        selectAllBtn.preferredSize.width = 60;
        selectAllBtn.preferredSize.height = 24;
        
        var clearSelBtn = centerGroup.add("button", undefined, "Clear Selection");
        clearSelBtn.helpTip = "Clear selection";
        clearSelBtn.onClick = clearColorSelection;
        clearSelBtn.preferredSize.width = 88;
        clearSelBtn.preferredSize.height = 24;
        
        var deleteBtn = centerGroup.add("button", undefined, "🗑️");
        deleteBtn.helpTip = "Delete selected colors (or all colors if none selected)";
        deleteBtn.onClick = deleteColorsWithConfirmation;
        deleteBtn.preferredSize.width = 30;
        deleteBtn.preferredSize.height = 24;
    }
    
    function createFooter() {
        var footerContainer = state.panel.add("group");
        footerContainer.orientation = "column";
        footerContainer.alignment = "fill";
        footerContainer.spacing = 6;
        
        // First row - Application mode and fill/stroke options
        var firstRowGroup = footerContainer.add("group");
        firstRowGroup.alignment = "fill";
        firstRowGroup.spacing = 8;
        
        // Left side - Application mode and fill/stroke options
        var leftGroup = firstRowGroup.add("group");
        leftGroup.alignment = "left";
        leftGroup.spacing = 8;
        
        // Application mode
        var modeGroup = leftGroup.add("group");
        modeGroup.alignment = "left";
        modeGroup.spacing = 8;
        
        var modeLabel = modeGroup.add("statictext", undefined, "Mode:");
        modeLabel.graphics.foregroundColor = modeLabel.graphics.newPen(modeLabel.graphics.PenType.SOLID_COLOR, [0.4, 0.4, 0.4], 1);
        
        var directBtn = modeGroup.add("radiobutton", undefined, "Direct");
        directBtn.helpTip = "Apply color directly to layer properties";
        directBtn.value = (state.applyColorMode === "direct");
        directBtn.onClick = function() { state.applyColorMode = "direct"; };
        
        var fillBtn = modeGroup.add("radiobutton", undefined, "Fill Effect");
        fillBtn.helpTip = "Apply color using Fill effect";
        fillBtn.value = (state.applyColorMode === "fill");
        fillBtn.onClick = function() { state.applyColorMode = "fill"; };
        
        // Fill/Stroke options
        var applyGroup = leftGroup.add("group");
        applyGroup.alignment = "left";
        applyGroup.spacing = 8;
        
        var applyLabel = applyGroup.add("statictext", undefined, "Apply to:");
        applyLabel.graphics.foregroundColor = applyLabel.graphics.newPen(applyLabel.graphics.PenType.SOLID_COLOR, [0.4, 0.4, 0.4], 1);
        
        var fillCheckbox = applyGroup.add("checkbox", undefined, "Fill");
        fillCheckbox.helpTip = "Apply colors to fill properties";
        fillCheckbox.value = state.applyToFill;
        fillCheckbox.onClick = function() { state.applyToFill = this.value; };
        
        var strokeCheckbox = applyGroup.add("checkbox", undefined, "Stroke");
        strokeCheckbox.helpTip = "Apply colors to stroke properties";
        strokeCheckbox.value = state.applyToStroke;
        strokeCheckbox.onClick = function() { state.applyToStroke = this.value; };
        
        // Second row - Status and help
        var secondRowGroup = footerContainer.add("group");
        secondRowGroup.alignment = "fill";
        secondRowGroup.spacing = 8;


        var helpBtn = secondRowGroup.add("button", undefined, "?");
        helpBtn.helpTip = "Show help and shortcuts";
        helpBtn.preferredSize.width = 20;
        helpBtn.preferredSize.height = 20;
        helpBtn.alignment = "right";
        helpBtn.onClick = showHelp;
        
        var statusText = secondRowGroup.add("statictext", undefined, "Ready");
        statusText.alignment = ["fill", "center"];
        statusText.graphics.foregroundColor = statusText.graphics.newPen(statusText.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1);
        statusText.graphics.font = FontUtils.getSmallFont();
        
        
        // Store reference for updates
        state.statusText = statusText;
    }
    
    // Calculate optimal grid dimensions based on number of colors
    function calculateGridDimensions(numColors) {
        if (numColors <= 0) return {rows: 1, cols: 1};
        if (numColors <= 8) return {rows: 1, cols: numColors};
        
        // For 9 or more colors, use balanced grids with maximum 8 columns
        var cols = Math.min(8, numColors); // Maximum 8 columns
        var rows = Math.ceil(numColors / cols);
        
        return {rows: rows, cols: cols};
    }
    
    // Clear existing palette grid
    function clearPaletteGrid() {
        if (state.palettePanel) {
            // Remove all children
            while (state.palettePanel.children.length > 0) {
                state.palettePanel.remove(state.palettePanel.children[0]);
            }
        }
        state.colorButtons = [];
    }
    
    // Create the color palette grid
    function createPaletteGrid() {
        clearPaletteGrid();
        
        // If no colors, show minimal grid
        if (state.currentPalette.length === 0) {
            var emptyGroup = state.palettePanel.add("group");
            emptyGroup.alignment = "fill";
            var emptyText = emptyGroup.add("statictext", undefined, "No colors in palette. Click 'Add Color' to start.");
            emptyText.alignment = "center";
            state.panel.layout.layout(true);
            state.panel.layout.resize();
            return;
        }

        var numColors = state.currentPalette.length;
        var gridDims = calculateGridDimensions(numColors);
        
        for (var row = 0; row < gridDims.rows; row++) {
            var rowGroup = state.palettePanel.add("group");
            rowGroup.alignment = "fill";
            
            for (var col = 0; col < gridDims.cols; col++) {
                var index = row * gridDims.cols + col;
                if (index >= numColors) break;
                
                var colorBtn = rowGroup.add("button", undefined, "");
                colorBtn.preferredSize.width = CONFIG.defaultButtonSize.width;
                colorBtn.preferredSize.height = CONFIG.defaultButtonSize.height;
                colorBtn.index = index;
                colorBtn.selected = false; // Track selection state
                colorBtn.hovered = false; // Track hover state
                
                // Set color
                updateColorButton(colorBtn, index);
                
                // Click handlers
                colorBtn.onClick = colorButtonClick;
                colorBtn.onDraw = colorButtonDraw;
                
                // Hover effects
                colorBtn.addEventListener('mouseover', function() {
                    this.hovered = true;
                    this.notify('onDraw');
                });
                
                colorBtn.addEventListener('mouseout', function() {
                    this.hovered = false;
                    this.notify('onDraw');
                });
                
                state.colorButtons.push(colorBtn);
            }
        }
        
        // Update panel layout
        state.panel.layout.layout(true);
        state.panel.layout.resize();
    }
    
    // Update color button appearance
    function updateColorButton(btn, index) {
        if (index < state.currentPalette.length) {
            btn.color = state.currentPalette[index];
        } else {
            btn.color = [0.3, 0.3, 0.3]; // Gray for empty slots
        }
    }
    
    // Custom draw function for color buttons - Enhanced design
    function colorButtonDraw() {
        if (this.color) {
            var g = this.graphics;
            var color = this.color;
            var width = this.size.width;
            var height = this.size.height;
            
            // Clear the graphics context first
            g.newPath();
            g.rectPath(0, 0, width, height);
            
            // Create brush with the color
            var brush = g.newBrush(g.BrushType.SOLID_COLOR, color);
            g.fillPath(brush);
            
            // Enhanced border styling
            var borderColor, borderWidth;
            if (this.selected) {
                borderColor = [0.2, 0.6, 1.0]; // Blue for selected
                borderWidth = 3;
            } else if (this.hovered) {
                borderColor = [0.8, 0.8, 0.8]; // Light gray for hover
                borderWidth = 2;
            } else {
                borderColor = [0.3, 0.3, 0.3]; // Dark gray for normal
                borderWidth = 1;
            }
            
            var pen = g.newPen(g.PenType.SOLID_COLOR, borderColor, borderWidth);
            g.newPath();
            g.rectPath(0, 0, width, height);
            g.strokePath(pen);
            
            // Selection indicator - modern checkmark style
            if (this.selected) {
                var checkSize = 8;
                var checkX = width - checkSize - 3;
                var checkY = 3;
                
                // Background circle
                var circleBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.2, 0.6, 1.0]);
                g.newPath();
                g.ellipsePath(checkX, checkY, checkSize, checkSize);
                g.fillPath(circleBrush);
                
                // White checkmark
                var checkBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1]);
                g.newPath();
                g.moveTo(checkX + 2, checkY + 4);
                g.lineTo(checkX + 4, checkY + 6);
                g.lineTo(checkX + 6, checkY + 2);
                g.strokePath(g.newPen(g.PenType.SOLID_COLOR, [1, 1, 1], 1.5));
            }
            
            // Hover effect - subtle overlay
            if (this.hovered && !this.selected) {
                var overlayBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1, 0.1]);
                g.newPath();
                g.rectPath(0, 0, width, height);
                g.fillPath(overlayBrush);
            }
        }
    }
    
    // Color button click handler with enhanced interaction
    function colorButtonClick() {
        var index = this.index;
        
        // Check for modifier keys
        if (ScriptUI.environment.keyboardState.shiftKey) {
            // Shift+click: remove color
            removeColor(index);
        } else if (ScriptUI.environment.keyboardState.altKey) {
            // Alt+click: edit color
            editColor(index);
        } else if (ScriptUI.environment.keyboardState.ctrlKey || ScriptUI.environment.keyboardState.metaKey) {
            // Ctrl+click (or Cmd+click on Mac): toggle selection
            toggleColorSelection(index);
        } else {
            // Regular click: apply color
            if (index < state.currentPalette.length) {
                applyColor(state.currentPalette[index]);
            }
        }
        
        // Update status
        if (index < state.currentPalette.length) {
            var color = state.currentPalette[index];
            var rgbText = "RGB(" + Math.round(color[0]*255) + ", " + Math.round(color[1]*255) + ", " + Math.round(color[2]*255) + ")";
            updateStatus("Selected: " + rgbText);
        }
    }
    
    // ========================================
    // COLOR MANAGEMENT FUNCTIONS
    // ========================================
    
    // Add a new color to the palette
    function addNewColor() {
        if (state.currentPalette.length >= CONFIG.maxColors) {
            alert("Maximum number of colors reached (" + CONFIG.maxColors + ").");
            return;
        }
        
        // Create tabbed dialog for adding colors
        var addDialog = new Window("dialog", "Add Colors");
        addDialog.orientation = "column";
        addDialog.spacing = 8;
        addDialog.margins = 12;
        addDialog.preferredSize.width = 320;
        addDialog.preferredSize.height = 200;
        
        // Tab group
        var tabGroup = addDialog.add("tabbedpanel");
        tabGroup.preferredSize.width = 320;
        tabGroup.preferredSize.height = 200;
        
        // Tab 1: Single Color
        var singleColorTab = tabGroup.add("tab", undefined, "Single Color");
        singleColorTab.orientation = "column";
        singleColorTab.spacing = 6;
        singleColorTab.margins = 8;
        
        // Single color content
        var singleColorContent = createSingleColorTab(singleColorTab);
        
        // Tab 2: Paste Colors
        var pasteColorsTab = tabGroup.add("tab", undefined, "Paste Colors");
        pasteColorsTab.orientation = "column";
        pasteColorsTab.spacing = 6;
        pasteColorsTab.margins = 8;
        
        // Paste colors content
        var pasteColorsContent = createPasteColorsTab(pasteColorsTab);
        
        // Buttons
        var btnGroup = addDialog.add("group");
        var okBtn = btnGroup.add("button", undefined, "Add Colors");
        var cancelBtn = btnGroup.add("button", undefined, "Cancel");
        
        okBtn.onClick = function() {
            var activeTab = tabGroup.selection;
            if (activeTab === singleColorTab) {
                // Add single color
                var newColor = singleColorContent.getColor();
                if (newColor) {
                    state.currentPalette.push(newColor);
                    createPaletteGrid();
                    updateStatus("Added single color");
                }
            } else if (activeTab === pasteColorsTab) {
                // Add pasted colors
                var pastedColors = pasteColorsContent.getColors();
                var pasteMode = pasteColorsContent.getMode();
                if (pastedColors && pastedColors.length > 0) {
                    if (pasteMode === "replace") {
                        // Replace current palette with pasted colors
                        state.currentPalette = pastedColors.slice(0, CONFIG.maxColors);
                        updateStatus("Replaced palette with " + pastedColors.length + " colors from paste");
                    } else if (pasteMode === "prepend") {
                        // Prepend to current palette
                        var combined = pastedColors.concat(state.currentPalette);
                        state.currentPalette = ColorUtils.removeDuplicateColors(combined).slice(0, CONFIG.maxColors);
                        updateStatus("Added " + pastedColors.length + " colors to beginning of palette");
                    } else {
                        // Default: append to current palette
                        var combined = state.currentPalette.concat(pastedColors);
                        state.currentPalette = ColorUtils.removeDuplicateColors(combined).slice(0, CONFIG.maxColors);
                        updateStatus("Added " + pastedColors.length + " colors to end of palette");
                    }
                    createPaletteGrid();
                }
            }
            addDialog.close();
        };
        
        cancelBtn.onClick = function() { addDialog.close(); };
        
        addDialog.center();
        addDialog.show();
    }
    
    // Create single color tab content
    function createSingleColorTab(parent) {
        var content = {};
        
        // Main horizontal layout with preview on left, controls on right
        var mainGroup = parent.add("group");
        mainGroup.orientation = "column";
        mainGroup.spacing = 12;
        mainGroup.alignChildren = ["fill", "top"];
        
        // Color preview
        var previewGroup = mainGroup.add("group");
        previewGroup.orientation = "column";
        previewGroup.alignChildren = "center";
        previewGroup.spacing = 6;
        
        var colorPreview = previewGroup.add("panel");
        colorPreview.alignment = "fill";
        colorPreview.preferredSize.height = 70;
        colorPreview.currentColor = [1, 1, 1];
        
        // Custom draw function for color preview
        colorPreview.onDraw = function() {
            try {
                var g = this.graphics;
                var color = this.currentColor || [1, 1, 1];
                
                g.newPath();
                g.rectPath(0, 0, this.size.width, this.size.height);
                
                var brush = g.newBrush(g.BrushType.SOLID_COLOR, color);
                g.fillPath(brush);
                
                var pen = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0], 1);
                g.newPath();
                g.rectPath(0, 0, this.size.width, this.size.height);
                g.strokePath(pen);
            } catch (e) {
                var g = this.graphics;
                g.newPath();
                g.rectPath(0, 0, this.size.width, this.size.height);
                var fallbackBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.8, 0.8, 0.8]);
                g.fillPath(fallbackBrush);
            }
        };
        
        var rgbText = previewGroup.add("statictext", undefined, "RGB: 255,255,255");
        rgbText.preferredSize.width = 120;
        rgbText.alignment = "left";
        rgbText.graphics.font = FontUtils.getSmallFont();
        
        // Controls
        var controlsGroup = mainGroup.add("group");
        controlsGroup.orientation = "column";
        controlsGroup.alignChildren = "fill";
        controlsGroup.spacing = 4;
        
        // RGB sliders - more compact
        var rGroup = controlsGroup.add("group");
        rGroup.orientation = "row";
        rGroup.spacing = 4;
        var rLabel = rGroup.add("statictext", undefined, "R:");
        rLabel.preferredSize.width = 15;
        var rSlider = rGroup.add("slider", undefined, 255, 0, 255);
        rSlider.preferredSize.width = 160;
        var rValue = rGroup.add("edittext", undefined, "255");
        rValue.characters = 3;
        
        var gGroup = controlsGroup.add("group");
        gGroup.orientation = "row";
        gGroup.spacing = 4;
        var gLabel = gGroup.add("statictext", undefined, "G:");
        gLabel.preferredSize.width = 15;
        var gSlider = gGroup.add("slider", undefined, 255, 0, 255);
        gSlider.preferredSize.width = 160;
        var gValue = gGroup.add("edittext", undefined, "255");
        gValue.characters = 3;
        
        var bGroup = controlsGroup.add("group");
        bGroup.orientation = "row";
        bGroup.spacing = 4;
        var bLabel = bGroup.add("statictext", undefined, "B:");
        bLabel.preferredSize.width = 15;
        var bSlider = bGroup.add("slider", undefined, 255, 0, 255);
        bSlider.preferredSize.width = 160;
        var bValue = bGroup.add("edittext", undefined, "255");
        bValue.characters = 3;
        
        // Hex input - compact
        var hexGroup = controlsGroup.add("group");
        hexGroup.orientation = "row";
        hexGroup.spacing = 4;
        hexGroup.alignChildren = "center";
        
        hexGroup.add("statictext", undefined, "Hex:");
        var hexInput = hexGroup.add("edittext", undefined, "FFFFFF");
        hexInput.characters = 6;
        hexInput.helpTip = "Enter hex color code";
        
        // Function to update color preview
        function updateColorPreview() {
            var rgb = [rSlider.value / 255, gSlider.value / 255, bSlider.value / 255];
            colorPreview.currentColor = rgb;
            rgbText.text = "RGB: " + Math.round(rgb[0]*255) + "," + Math.round(rgb[1]*255) + "," + Math.round(rgb[2]*255);
            hexInput.text = ColorUtils.rgbToHex(rgb);
            
            try {
                colorPreview.hide();
                colorPreview.show();
            } catch (e) {
                mainGroup.layout.layout(true);
            }
        }
        
        // Function to update from hex
        function updateFromHex() {
            var rgb = ColorUtils.hexToRgb(hexInput.text);
            if (rgb) {
                rSlider.value = rgb[0] * 255;
                gSlider.value = rgb[1] * 255;
                bSlider.value = rgb[2] * 255;
                rValue.text = Math.round(rgb[0] * 255);
                gValue.text = Math.round(rgb[1] * 255);
                bValue.text = Math.round(rgb[2] * 255);
                updateColorPreview();
            }
        }
        
        // Event handlers
        rSlider.onChanging = function() { 
            rValue.text = Math.round(this.value); 
            updateColorPreview();
        };
        gSlider.onChanging = function() { 
            gValue.text = Math.round(this.value); 
            updateColorPreview();
        };
        bSlider.onChanging = function() { 
            bValue.text = Math.round(this.value); 
            updateColorPreview();
        };
        
        rValue.onChange = function() { 
            rSlider.value = parseInt(this.text) || 0; 
            updateColorPreview();
        };
        gValue.onChange = function() { 
            gSlider.value = parseInt(this.text) || 0; 
            updateColorPreview();
        };
        bValue.onChange = function() { 
            bSlider.value = parseInt(this.text) || 0; 
            updateColorPreview();
        };
        
        hexInput.onChange = function() {
            updateFromHex();
        };
        
        // Store getter function
        content.getColor = function() {
            return [rSlider.value / 255, gSlider.value / 255, bSlider.value / 255];
        };
        
        // Initialize
        updateColorPreview();
        
        return content;
    }
    
    // Create paste colors tab content
    function createPasteColorsTab(parent) {
        var content = {};
        
        // Info text - more compact
        var infoText = parent.add("statictext", undefined, "Paste hex codes, CSS colors, or JSON arrays:");
        infoText.alignment = "left";
        infoText.graphics.font = FontUtils.getSmallFont();
        
        // Text input area
        var pasteEdit = parent.add("edittext", undefined, "", {multiline:true, scrolling:true});
        pasteEdit.alignment = "fill";
        pasteEdit.preferredSize.height = 140;
        
        // Preview section - compact layout
        var previewGroup = parent.add("group");
        previewGroup.orientation = "column";
        previewGroup.spacing = 4;
        previewGroup.alignChildren = "fill";
        
        var previewHeader = previewGroup.add("group");
        previewHeader.orientation = "row";
        previewHeader.alignChildren = "center";
        var previewText = previewHeader.add("statictext", undefined, "Parsed: 0 colors");
        previewText.graphics.font = FontUtils.getSmallFont();
        
        var previewSwatches = previewGroup.add("group");
        previewSwatches.orientation = "row";
        previewSwatches.spacing = 3;
        previewSwatches.alignment = "left";
        
        // Mode selection - more compact
        var modeGroup = parent.add("group");
        modeGroup.orientation = "row";
        modeGroup.spacing = 8;
        modeGroup.alignChildren = "center";
        
        var modeLabel = modeGroup.add("statictext", undefined, "Mode:");
        modeLabel.graphics.font = FontUtils.getSmallFont();
        var appendRb = modeGroup.add("radiobutton", undefined, "Append");
        var prependRb = modeGroup.add("radiobutton", undefined, "Prepend");
        var replaceRb = modeGroup.add("radiobutton", undefined, "Replace");
        appendRb.value = true;
        
        // Store parsed colors
        var parsedColors = [];
        
        function updatePreview() {
            parsedColors = parseColorsFromText(pasteEdit.text);
            previewText.text = 'Found: ' + parsedColors.length + ' colors';
            
            // Remove old swatches
            while (previewSwatches.children.length > 0) {
                previewSwatches.remove(previewSwatches.children[0]);
            }
            
            // Add new swatches - smaller and more in a row
            for (var i=0; i<Math.min(parsedColors.length, 16); i++) {
                var c = parsedColors[i];
                var sw = previewSwatches.add('panel', undefined, '');
                sw.preferredSize = [16,16];
                sw.graphics.backgroundColor = sw.graphics.newBrush(sw.graphics.BrushType.SOLID_COLOR, c);
            }
            if (parsedColors.length > 16) {
                var moreText = previewSwatches.add("statictext", undefined, "+" + (parsedColors.length - 16));
                moreText.graphics.font = FontUtils.getSmallFont();
            }
            previewSwatches.layout.layout(true);
        }
        
        // Auto-parse on blur
        pasteEdit.onDeactivate = updatePreview;
        // Also auto-parse on initial show
        parent.onShow = updatePreview;
        
        // Store getter functions
        content.getColors = function() {
            updatePreview(); // Ensure up-to-date
            return parsedColors;
        };
        
        content.getMode = function() {
            if (replaceRb.value) return "replace";
            if (prependRb.value) return "prepend";
            return "append"; // Default
        };
        
        return content;
    }
    
    // Remove a color from the palette
    function removeColor(index) {
        if (index >= state.currentPalette.length) return;
        
        // Remove the color from the palette
        state.currentPalette.splice(index, 1);
        
        // Update selected colors array to adjust indices
        var updatedSelectedColors = [];
        for (var i = 0; i < state.selectedColors.length; i++) {
            var selectedColor = state.selectedColors[i];
            if (selectedColor.index < index) {
                // Index unchanged
                updatedSelectedColors.push(selectedColor);
            } else if (selectedColor.index > index) {
                // Shift index down by one
                selectedColor.index--;
                if (selectedColor.index < state.currentPalette.length) {
                    selectedColor.color = state.currentPalette[selectedColor.index];
                    updatedSelectedColors.push(selectedColor);
                }
            }
            // Skip if selectedColor.index === index (the removed color)
        }
        state.selectedColors = updatedSelectedColors;
        
        // Recreate the grid to accommodate the removed color
        createPaletteGrid();
    }
    
    // Toggle color selection for multi-select
    function toggleColorSelection(index) {
        if (index >= state.currentPalette.length) return;
        
        var button = state.colorButtons[index];
        button.selected = !button.selected;
        
        // Update selectedColors array
        var colorIndex = -1;
        for (var i = 0; i < state.selectedColors.length; i++) {
            if (state.selectedColors[i].index === index) {
                colorIndex = i;
                break;
            }
        }
        
        if (button.selected && colorIndex === -1) {
            // Add to selection
            state.selectedColors.push({
                index: index,
                color: state.currentPalette[index]
            });
        } else if (!button.selected && colorIndex !== -1) {
            // Remove from selection
            state.selectedColors.splice(colorIndex, 1);
        }
        
        button.notify("onDraw");
    }
    
    // Clear all color selections
    function clearColorSelection() {
        state.selectedColors = [];
        for (var i = 0; i < state.colorButtons.length; i++) {
            state.colorButtons[i].selected = false;
            state.colorButtons[i].notify("onDraw");
        }
    }
    
    // Select all colors in the palette
    function selectAllColors() {
        state.selectedColors = [];
        for (var i = 0; i < state.colorButtons.length && i < state.currentPalette.length; i++) {
            state.colorButtons[i].selected = true;
            state.selectedColors.push({
                index: i,
                color: state.currentPalette[i]
            });
            state.colorButtons[i].notify("onDraw");
        }
    }
    
    // Delete colors with confirmation dialog
    function deleteColorsWithConfirmation() {
        if (state.selectedColors.length > 0) {
            // Remove only selected colors (no confirmation needed)
            removeSelectedColors();
                } else {
            // Show confirmation dialog for deleting all colors
            var confirmDialog = new Window("dialog", "Confirm Delete All Colors");
            confirmDialog.orientation = "column";
            confirmDialog.spacing = 10;
            confirmDialog.margins = 16;
            confirmDialog.alignChildren = "center";
            
            var messageText = confirmDialog.add("statictext", undefined, "Are you sure you want to delete all colors from the palette?");
            messageText.alignment = "center";
            
            var buttonGroup = confirmDialog.add("group");
            var yesBtn = buttonGroup.add("button", undefined, "Yes, Delete All");
            var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
            
            yesBtn.onClick = function() {
                // Clear entire palette
                state.currentPalette = [];
                state.selectedColors = [];
                
                // Reset selection states
                for (var i = 0; i < state.colorButtons.length; i++) {
                    state.colorButtons[i].selected = false;
                }
                
                // Recreate grid (will show empty state message)
                createPaletteGrid();
                confirmDialog.close();
            };
            
            cancelBtn.onClick = function() {
                confirmDialog.close();
            };
            
            confirmDialog.center();
            confirmDialog.show();
        }
    }
    
    // Remove all selected colors from palette
    function removeSelectedColors() {
        if (state.selectedColors.length === 0) return;
        
        // Sort selected indices in descending order to remove from back to front
        var indicesToRemove = [];
        for (var i = 0; i < state.selectedColors.length; i++) {
            indicesToRemove.push(state.selectedColors[i].index);
        }
        indicesToRemove.sort(function(a, b) { return b - a; });
        
        // Remove colors from palette
        for (var j = 0; j < indicesToRemove.length; j++) {
            var indexToRemove = indicesToRemove[j];
            if (indexToRemove < state.currentPalette.length) {
                state.currentPalette.splice(indexToRemove, 1);
            }
        }
        
        // Clear the selection
        state.selectedColors = [];
        
        // Reset all selection states
        for (var k = 0; k < state.colorButtons.length; k++) {
            state.colorButtons[k].selected = false;
        }
        
        // Recreate grid to reflect removed colors
        createPaletteGrid();
    }
    
    // ========================================
    // ESSENTIAL FUNCTIONS (PLACEHOLDERS)
    // ========================================
    
    // Edit color at index
    function editColor(index) {
        try {
            var currentColor = (index < state.currentPalette.length) ? state.currentPalette[index] : [1, 1, 1];
            
            // Create color picker dialog with modern design
            var colorDialog = new Window("dialog", "🎨 Edit Color");
            colorDialog.orientation = "column";
            colorDialog.spacing = 12;
            colorDialog.margins = 20;
            colorDialog.alignChildren = "fill";
            colorDialog.preferredSize.width = 320;
            colorDialog.preferredSize.height = 400;
        
            // RGB sliders
            var rgbGroup = colorDialog.add("panel", undefined, "RGB Values");
            rgbGroup.orientation = "column";
            rgbGroup.margins = 10;
            
            var rGroup = rgbGroup.add("group");
            rGroup.add("statictext", undefined, "R:");
            var rSlider = rGroup.add("slider", undefined, currentColor[0] * 255, 0, 255);
            var rValue = rGroup.add("edittext", undefined, Math.round(currentColor[0] * 255));
            rValue.characters = 3;
            
            var gGroup = rgbGroup.add("group");
            gGroup.add("statictext", undefined, "G:");
            var gSlider = gGroup.add("slider", undefined, currentColor[1] * 255, 0, 255);
            var gValue = gGroup.add("edittext", undefined, Math.round(currentColor[1] * 255));
            gValue.characters = 3;
            
            var bGroup = rgbGroup.add("group");
            bGroup.add("statictext", undefined, "B:");
            var bSlider = bGroup.add("slider", undefined, currentColor[2] * 255, 0, 255);
            var bValue = bGroup.add("edittext", undefined, Math.round(currentColor[2] * 255));
            bValue.characters = 3;
            
            // Color preview
            var previewGroup = colorDialog.add("panel", undefined, "Color Preview");
        previewGroup.orientation = "column";
            previewGroup.margins = 10;
        previewGroup.alignChildren = "center";
        
            // Create a visual color preview panel
        var colorPreview = previewGroup.add("panel");
            colorPreview.preferredSize.width = 80;
            colorPreview.preferredSize.height = 40;
            colorPreview.currentColor = currentColor;
            
            // Custom draw function for color preview
            colorPreview.onDraw = function() {
                try {
                    var g = this.graphics;
                    var color = this.currentColor || [0.5, 0.5, 0.5];
                    
                    // Clear the graphics context
                    g.newPath();
                    g.rectPath(0, 0, this.size.width, this.size.height);
                    
                    // Create brush with the color
                    var brush = g.newBrush(g.BrushType.SOLID_COLOR, color);
                    g.fillPath(brush);
                    
                    // Draw border
                    var pen = g.newPen(g.PenType.SOLID_COLOR, [0, 0, 0], 2);
                    g.newPath();
                    g.rectPath(0, 0, this.size.width, this.size.height);
                    g.strokePath(pen);
                } catch (e) {
                    // Fallback if drawing fails
                    var g = this.graphics;
                    g.newPath();
                    g.rectPath(0, 0, this.size.width, this.size.height);
                    var fallbackBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.8, 0.8, 0.8]);
                    g.fillPath(fallbackBrush);
                }
            };
            
            // Also add RGB text values below
            var rgbText = previewGroup.add("statictext", undefined, "RGB: " + Math.round(currentColor[0]*255) + ", " + Math.round(currentColor[1]*255) + ", " + Math.round(currentColor[2]*255));
            rgbText.preferredSize.width = 120;
            rgbText.alignment = "center";
            
            // Initialize the color preview display
            colorPreview.currentColor = currentColor;
            
            // Function to update color preview
            function updateColorPreview() {
                var rgb = [rSlider.value / 255, gSlider.value / 255, bSlider.value / 255];
                colorPreview.currentColor = rgb;
                
                // Update the RGB text values
                rgbText.text = "RGB: " + Math.round(rgb[0]*255) + ", " + Math.round(rgb[1]*255) + ", " + Math.round(rgb[2]*255);
                
                // Force redraw of the color preview panel
                try {
                    colorPreview.hide();
                    colorPreview.show();
                } catch (e) {
                    // Alternative redraw method
                    colorDialog.layout.layout(true);
                }
            }
            
            // Hex color input
            var hexGroup = colorDialog.add("panel", undefined, "Hex Color");
        hexGroup.orientation = "row";
            hexGroup.margins = 10;
        hexGroup.alignChildren = "center";
            
            hexGroup.add("statictext", undefined, "#");
            var hexInput = hexGroup.add("edittext", undefined, ColorUtils.rgbToHex(currentColor));
            hexInput.characters = 6;
            hexInput.helpTip = "Enter hex color code (without #)";
            
            // Function to update hex input from RGB sliders
            function updateHexFromRGB() {
                var rgb = [rSlider.value / 255, gSlider.value / 255, bSlider.value / 255];
                hexInput.text = ColorUtils.rgbToHex(rgb);
            }
            
            // Function to update RGB sliders from hex input
            function updateRGBFromHex() {
                var rgb = ColorUtils.hexToRgb(hexInput.text);
                if (rgb) {
                    rSlider.value = rgb[0] * 255;
                    gSlider.value = rgb[1] * 255;
                    bSlider.value = rgb[2] * 255;
                    rValue.text = Math.round(rgb[0] * 255);
                    gValue.text = Math.round(rgb[1] * 255);
                    bValue.text = Math.round(rgb[2] * 255);
                }
            }
            
            // Sync sliders and values with hex update and color preview
            rSlider.onChanging = function() { 
                rValue.text = Math.round(this.value); 
                updateHexFromRGB();
                updateColorPreview();
            };
            gSlider.onChanging = function() { 
                gValue.text = Math.round(this.value); 
                updateHexFromRGB();
                updateColorPreview();
            };
            bSlider.onChanging = function() { 
                bValue.text = Math.round(this.value); 
                updateHexFromRGB();
                updateColorPreview();
            };
            
            rValue.onChange = function() { 
                rSlider.value = parseInt(this.text) || 0; 
                updateHexFromRGB();
                updateColorPreview();
            };
            gValue.onChange = function() { 
                gSlider.value = parseInt(this.text) || 0; 
                updateHexFromRGB();
                updateColorPreview();
            };
            bValue.onChange = function() { 
                bSlider.value = parseInt(this.text) || 0; 
                updateHexFromRGB();
                updateColorPreview();
            };
            
            // Update RGB when hex input changes
            hexInput.onChange = function() {
                updateRGBFromHex();
                updateColorPreview();
            };
            
            // Buttons
            var btnGroup = colorDialog.add("group");
            var okBtn = btnGroup.add("button", undefined, "OK");
            var cancelBtn = btnGroup.add("button", undefined, "Cancel");
            
            okBtn.onClick = function() {
                var newColor = [
                    rSlider.value / 255,
                    gSlider.value / 255,
                    bSlider.value / 255
                ];
                
                // Ensure palette has enough slots
                while (state.currentPalette.length <= index) {
                    state.currentPalette.push([0.5, 0.5, 0.5]);
                }
                
                state.currentPalette[index] = newColor;
                updateColorButton(state.colorButtons[index], index);
                state.colorButtons[index].notify("onDraw");
                colorDialog.close();
            };
            
            cancelBtn.onClick = function() { colorDialog.close(); };
            
            // Initialize color preview with current color
            updateColorPreview();
            
            colorDialog.center();
            colorDialog.show();
        } catch (e) {
            alert("Error creating color dialog: " + e.toString());
        }
    }
    
    // Apply color to selected layers or comp background
    function applyColor(color) {
        if (!color) return;
        
        app.beginUndoGroup("Apply Color");
        
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                updateStatus("Please select a composition", true);
                return;
            }
            
            var selectedLayers = comp.selectedLayers;
            var appliedCount = 0;
            
            if (selectedLayers.length === 0) {
                // Apply to comp background
                comp.bgColor = color;
                updateStatus("Applied color to composition background");
                } else {
                // Apply to selected layers
                for (var i = 0; i < selectedLayers.length; i++) {
                    if (applyColorToLayer(selectedLayers[i], color)) {
                        appliedCount++;
                    }
                }
                
                // Create status message with fill/stroke info
                var statusMsg = "Applied color to " + appliedCount + " layer(s)";
                if (state.applyToFill && state.applyToStroke) {
                    statusMsg += " (fill & stroke)";
                } else if (state.applyToFill) {
                    statusMsg += " (fill only)";
                } else if (state.applyToStroke) {
                    statusMsg += " (stroke only)";
                }
                updateStatus(statusMsg);
            }
            
        } catch (e) {
            updateStatus("Error applying color: " + e.toString(), true);
        }
        
        app.endUndoGroup();
    }
    
    // Apply color to a specific layer
    function applyColorToLayer(layer, color) {
        var currentTime = layer.containingComp.time;
        try {
            if (state.applyColorMode === "fill") {
                var fillEffect = getOrAddFillEffect(layer);
                if (fillEffect) {
                    ErrorHandler.safeSetValue(fillEffect.property("ADBE Fill-0002"), color, currentTime);
                }
            } else {
                // Apply directly to layer properties
                if (layer instanceof TextLayer) {
                    applyColorToText(layer, color, currentTime);
                } else if (layer instanceof ShapeLayer) {
                    applyColorToShape(layer, color, currentTime);
                } else if (layer instanceof AVLayer) {
                    if (layer.source instanceof FootageItem && layer.source.mainSource instanceof SolidSource) {
                        // Solid layer - change source color
                        layer.source.mainSource.color = color;
                    } else {
                        // For other layer types, add Fill effect
                        var fillEffectWithFallback = getOrAddFillEffect(layer);
                        if (fillEffectWithFallback) {
                            ErrorHandler.safeSetValue(fillEffectWithFallback.property("ADBE Fill-0002"), color, currentTime);
                        }
                    }
                }
            }
        } catch (e) {
            // If direct application fails, try Fill effect as fallback
            try {
                var fillEffectWithCatch = getOrAddFillEffect(layer);
                if (fillEffectWithCatch) {
                    ErrorHandler.safeSetValue(fillEffectWithCatch.property("ADBE Fill-0002"), color, currentTime);
                }
            } catch (e2) {}
        }
    }
    
    // Get or add Fill effect to layer
    function getOrAddFillEffect(layer) {
        var fillEffect = null;
        try {
            var effects = layer.property("ADBE Effect Parade");
            if (effects) {
                for (var i = 1; i <= effects.numProperties; i++) {
                    if (effects.property(i).matchName === "ADBE Fill") {
                        fillEffect = effects.property(i);
                        break; 
                    }
                }
            }
            if (!fillEffect) {
                fillEffect = effects.addProperty("ADBE Fill");
            }
        } catch (e) {
            // Ignore if effect parade is not available
        }
        return fillEffect;
    }
    
    // Apply color to text layer
    function applyColorToText(textLayer, color, currentTime) {
        try {
            var textProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
            var textDoc = textProp.value;
            
            // Apply to fill if enabled
            if (state.applyToFill) {
                textDoc.fillColor = color;
            }
            
            // Apply to stroke if enabled
            if (state.applyToStroke) {
                textDoc.strokeColor = color;
            }
            
            ErrorHandler.safeSetValue(textProp, textDoc, currentTime);
        } catch (e) {
            throw e;
        }
    }
    
    // Apply color to shape layer
    function applyColorToShape(shapeLayer, color, currentTime) {
        try {
            var contents = shapeLayer.property("ADBE Root Vectors Group");
            if (!contents) {
                contents = shapeLayer.property("Contents");
            }
            applyColorToShapeGroup(contents, color, currentTime);
        } catch (e) {
            throw e;
        }
    }
    
    // Recursively apply color to shape groups
    function applyColorToShapeGroup(group, color, currentTime) {
        if (!group) return;
        
        try {
            for (var i = 1; i <= group.numProperties; i++) {
                var prop = group.property(i);
                var matchName = prop.matchName;
                
                if (matchName === "ADBE Vector Group") {
                    // Recursively apply to groups - check for Contents property
                    if (prop.property("Contents")) {
                        applyColorToShapeGroup(prop.property("Contents"), color, currentTime);
                    } else {
                        applyColorToShapeGroup(prop, color, currentTime);
                    }
                } else if (matchName === "ADBE Vector Graphic - Fill" && state.applyToFill) {
                    // Apply to fill - use safe value setting for keyframe handling
                    try {
                        var colorProp = prop.property("Color");
                        if (colorProp) {
                            ErrorHandler.safeSetValue(colorProp, color, currentTime);
                        }
                    } catch (e) {
                        // Continue if this particular fill fails
                    }
                } else if (matchName === "ADBE Vector Graphic - Stroke" && state.applyToStroke) {
                    // Apply to stroke - use safe value setting for keyframe handling
                    try {
                        var colorProp = prop.property("Color");
                        if (colorProp) {
                            ErrorHandler.safeSetValue(colorProp, color, currentTime);
                        }
                    } catch (e) {
                        // Continue if this particular stroke fails
                    }
                }
                // Also check for nested contents
                else if ((prop.propertyType === PropertyType.INDEXED_GROUP || 
                         prop.propertyType === PropertyType.NAMED_GROUP) && 
                         prop.numProperties > 0) {
                    applyColorToShapeGroup(prop, color, currentTime);
                }
            }
        } catch (e) {
            // Continue processing even if some properties fail
        }
    }
    
    // Update status text
    function updateStatus(message, isError) {
        if (state.statusText) {
            state.statusText.text = message;
            var color = isError ? [0.8, 0.2, 0.2] : [0.2, 0.6, 0.2];
            state.statusText.graphics.foregroundColor = state.statusText.graphics.newPen(
                state.statusText.graphics.PenType.SOLID_COLOR, color, 1
            );
        }
    }
    
    // ========================================
    // EXTRACT COLORS FUNCTION
    // ========================================
    
    function extractColors() {
        app.beginUndoGroup("Extract Colors");
        
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }
            
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                // Extract from comp background
                extractCompBackgroundColor(comp);
                return;
            }
            
            // Show extraction options dialog
            var extractOptions = showExtractionDialog();
            if (!extractOptions) return; // User cancelled
            
            var extractedColors = [];
            var totalColorsFound = 0;
            
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                var colors = extractLayerColors(layer, extractOptions.includeHidden);
                
                for (var c = 0; c < colors.length; c++) {
                    var color = colors[c];
                    if (color && color.length >= 3) {
                        extractedColors.push([color[0], color[1], color[2]]);
                    }
                }
                totalColorsFound += colors.length;
            }
            
            // Remove duplicates
            var uniqueColors = ColorUtils.removeDuplicateColors(extractedColors);
            
            // If no colors found, keep current palette
            if (uniqueColors.length === 0) {
                alert("No colors could be extracted from the selected layers.\n\n" +
                     "This might happen if:\n" +
                     "• Layers have no visible fill/stroke colors\n" +
                     "• Layers are footage/compositions without accessible colors\n" +
                     "• Colors are controlled by expressions\n\n" +
                     "Try selecting shape layers or text layers with visible colors.");
                return;
            }
            
            // Apply to palette based on mode
            if (extractOptions.mode === "replace") {
                // Replace current palette with extracted colors
                state.currentPalette = uniqueColors.slice(0, CONFIG.maxColors);
            } else if (extractOptions.mode === "prepend") {
                // Prepend to current palette
                var combinedColors = uniqueColors.concat(state.currentPalette);
                var allUniqueColors = ColorUtils.removeDuplicateColors(combinedColors);
                state.currentPalette = allUniqueColors.slice(0, CONFIG.maxColors);
            } else {
                // Default: append to current palette
                var combinedColors = state.currentPalette.concat(uniqueColors);
                var allUniqueColors = ColorUtils.removeDuplicateColors(combinedColors);
                state.currentPalette = allUniqueColors.slice(0, CONFIG.maxColors);
            }
            
            // Recreate grid for new palette size
            createPaletteGrid();
            
            // Update status based on mode
            var statusMsg;
            if (extractOptions.mode === "replace") {
                statusMsg = "Replaced palette with " + uniqueColors.length + " unique colors from " + selectedLayers.length + " layers";
            } else if (extractOptions.mode === "prepend") {
                statusMsg = "Added " + uniqueColors.length + " unique colors to beginning of palette from " + selectedLayers.length + " layers";
            } else {
                statusMsg = "Added " + uniqueColors.length + " unique colors to end of palette from " + selectedLayers.length + " layers";
            }
            updateStatus(statusMsg);
            
        } catch (e) {
            alert("Error extracting colors: " + e.toString());
        }
        
        app.endUndoGroup();
    }
    
    // Show extraction options dialog
    function showExtractionDialog() {
        var comp = app.project.activeItem;
        var selectedLayers = comp ? comp.selectedLayers : [];
        
        // Quick preview extraction to show how many colors will be found
        var previewColors = [];
        var totalLayerColors = 0;
        
        try {
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                var colors = extractLayerColors(layer);
                previewColors = previewColors.concat(colors);
                totalLayerColors += colors.length;
            }
        } catch (e) {}
        
        var uniquePreviewColors = ColorUtils.removeDuplicateColors(previewColors);
        
        var dialog = new Window("dialog", "Extract Colors Options");
        dialog.orientation = "column";
        dialog.spacing = 10;
        dialog.margins = 16;
        
        // Mode selection
        var modeGroup = dialog.add("panel", undefined, "Extraction Mode");
        modeGroup.orientation = "column";
        modeGroup.margins = 10;
        
        var appendRb = modeGroup.add("radiobutton", undefined, "Add to end of current palette");
        var prependRb = modeGroup.add("radiobutton", undefined, "Add to beginning of current palette");
        var replaceRb = modeGroup.add("radiobutton", undefined, "Replace current palette");
        
        appendRb.value = true; // Default selection
        
        // Info section
        var infoGroup = dialog.add("panel", undefined, "Information");
        infoGroup.orientation = "column";
        infoGroup.margins = 10;
        
        var currentPaletteText = infoGroup.add("statictext", undefined, "Current palette: " + state.currentPalette.length + " colors");
        currentPaletteText.alignment = "left";
        
        var extractableColorsText = infoGroup.add("statictext", undefined, "Colors found in selection: " + uniquePreviewColors.length + " unique (" + totalLayerColors + " total)");
        extractableColorsText.alignment = "left";
        
        var selectedLayersText = infoGroup.add("statictext", undefined, "Selected layers: " + selectedLayers.length + " layers");
        selectedLayersText.alignment = "left";
        
        // Include hidden colors checkbox
        var includeHiddenGroup = dialog.add("group");
        var includeHiddenCheckbox = includeHiddenGroup.add("checkbox", undefined, "Include hidden (disabled) fills/strokes");
        includeHiddenCheckbox.value = false; // Default: do NOT include hidden
        
        // Buttons
        var buttonGroup = dialog.add("group");
        var okBtn = buttonGroup.add("button", undefined, "Extract");
        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        
        okBtn.onClick = function() {
            dialog.close(1); // Return 1 for OK
        };
        
        cancelBtn.onClick = function() {
            dialog.close(0); // Return 0 for Cancel
        };
        
        var result = dialog.show();
        
        if (result === 1) { // OK clicked
            var mode;
            if (replaceRb.value) {
                mode = "replace";
            } else if (prependRb.value) {
                mode = "prepend";
            } else {
                mode = "append"; // Default
            }
            
            return {
                mode: mode,
                includeHidden: includeHiddenCheckbox.value
            };
        }
        
        return null; // Cancelled
    }
    
    // Extract colors from a specific layer
    function extractLayerColors(layer, includeHidden) {
        var colors = [];
        
        try {
            if (layer instanceof TextLayer) {
                // Extract text colors
                colors = colors.concat(extractTextColors(layer, includeHidden));
            } else if (layer instanceof ShapeLayer) {
                // Extract shape colors
                colors = colors.concat(extractShapeColors(layer, includeHidden));
            } else if (layer instanceof AVLayer) {
                // Handle solids, footage, compositions
                try {
                    if (layer.source && layer.source instanceof FootageItem) {
                        if (layer.source.mainSource instanceof SolidSource) {
                            // Solid layer
                            var solidColor = layer.source.mainSource.color;
                            colors.push([solidColor[0], solidColor[1], solidColor[2]]);
                        }
                    }
                } catch (e) {
                    // Try alternate method for solid detection
                    try {
                        if (layer.source && layer.source.width && layer.source.height && layer.source.duration === 0) {
                            // Likely a solid - try to get color from source
                            if (layer.source.mainSource && layer.source.mainSource.color) {
                                var solidColor2 = layer.source.mainSource.color;
                                colors.push([solidColor2[0], solidColor2[1], solidColor2[2]]);
                            }
                        }
                    } catch (e2) {}
                }
            }
            
            // Check for effects that might have colors
            colors = colors.concat(extractEffectColors(layer));
            
        } catch (e) {
            // Continue if there's an error with this layer
        }
        
        return colors;
    }
    
    // Extract colors from text layer
    function extractTextColors(textLayer, includeHidden) {
        var colors = [];
        
        try {
            // Method 1: Try to get text document
            var textProps = textLayer.property("ADBE Text Properties");
            if (textProps) {
                var textDoc = textProps.property("ADBE Text Document");
                if (textDoc) {
                    var docValue = textDoc.value;
                    
                    // Get fill color
                    if (docValue.fillColor && (includeHidden || docValue.applyFill)) {
                        colors.push([docValue.fillColor[0], docValue.fillColor[1], docValue.fillColor[2]]);
                    }
                    
                    // Get stroke color
                    if (docValue.strokeColor && (includeHidden || docValue.applyStroke)) {
                        colors.push([docValue.strokeColor[0], docValue.strokeColor[1], docValue.strokeColor[2]]);
                    }
                }
            }
        } catch (e) {
            // Method 2: Try alternate approach
            try {
                var textProps2 = textLayer.property("Source Text");
                if (textProps2) {
                    var textDoc2 = textProps2.value;
                    if (textDoc2.fillColor && (includeHidden || textDoc2.applyFill)) {
                        colors.push([textDoc2.fillColor[0], textDoc2.fillColor[1], textDoc2.fillColor[2]]);
                    }
                }
            } catch (e2) {}
        }
        
        return colors;
    }
    
    // Extract colors from shape layer
    function extractShapeColors(shapeLayer, includeHidden) {
        var colors = [];
        
        try {
            // Try different ways to access shape contents
            var contents = shapeLayer.property("ADBE Root Vectors Group");
            if (!contents) {
                contents = shapeLayer.property("Contents");
            }
            
            if (contents) {
                colors = colors.concat(extractShapeGroupColors(contents, includeHidden));
            }
        } catch (e) {}
        
        return colors;
    }
    
    // Recursively extract colors from shape groups
    function extractShapeGroupColors(group, includeHidden) {
        var colors = [];
        
        if (!group) return colors;
        
        try {
            for (var i = 1; i <= group.numProperties; i++) {
                var prop = group.property(i);
                
                if (prop.matchName === "ADBE Vector Group") {
                    // Recursively check groups - try both direct and Contents approach
                    colors = colors.concat(extractShapeGroupColors(prop, includeHidden));
                    
                    // Also try accessing Contents property if it exists
                    try {
                        var subContents = prop.property("Contents");
                        if (subContents) {
                            colors = colors.concat(extractShapeGroupColors(subContents, includeHidden));
                        }
                    } catch (e) {}
                } else if (prop.matchName === "ADBE Vector Graphic - Fill") {
                    // Fill
                    if (includeHidden || prop.enabled) {
                        try {
                            var colorProp = prop.property("ADBE Vector Fill Color");
                            if (colorProp && colorProp.value) {
                                var fillColor = colorProp.value;
                                if (fillColor && fillColor.length >= 3) {
                                    colors.push([fillColor[0], fillColor[1], fillColor[2]]);
                                }
                            }
                        } catch (e) {}
                        
                        // Alternative property name
                        try {
                            var colorProp2 = prop.property("Color");
                            if (colorProp2 && colorProp2.value) {
                                var fillColor2 = colorProp2.value;
                                if (fillColor2 && fillColor2.length >= 3) {
                                    colors.push([fillColor2[0], fillColor2[1], fillColor2[2]]);
                                }
                            }
                        } catch (e) {}
                    }
                } else if (prop.matchName === "ADBE Vector Graphic - Stroke") {
                    // Stroke
                    if (includeHidden || prop.enabled) {
                        try {
                            var strokeColorProp = prop.property("ADBE Vector Stroke Color");
                            if (strokeColorProp && strokeColorProp.value) {
                                var strokeColor = strokeColorProp.value;
                                if (strokeColor && strokeColor.length >= 3) {
                                    colors.push([strokeColor[0], strokeColor[1], strokeColor[2]]);
                                }
                            }
                        } catch (e) {}
                        
                        // Alternative property name
                        try {
                            var strokeColorProp2 = prop.property("Color");
                            if (strokeColorProp2 && strokeColorProp2.value) {
                                var strokeColor2 = strokeColorProp2.value;
                                if (strokeColor2 && strokeColor2.length >= 3) {
                                    colors.push([strokeColor2[0], strokeColor2[1], strokeColor2[2]]);
                                }
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}
        
        return colors;
    }
    
    // Extract colors from layer effects
    function extractEffectColors(layer) {
        var colors = [];
        
        try {
            var effects = layer.property("ADBE Effect Parade");
            if (effects) {
                for (var i = 1; i <= effects.numProperties; i++) {
                    var effect = effects.property(i);
                    
                    // Check for Fill effect
                    if (effect.matchName === "ADBE Fill") {
                        try {
                            var fillColor = effect.property("ADBE Fill-0002").value;
                            colors.push([fillColor[0], fillColor[1], fillColor[2]]);
                        } catch (e) {}
                    }
                    
                    // Check for other effects with color properties
                    for (var j = 1; j <= effect.numProperties; j++) {
                        var prop = effect.property(j);
                        if (prop && prop.propertyType === PropertyType.COLOR) {
                            try {
                                var color = prop.value;
                                colors.push([color[0], color[1], color[2]]);
                            } catch (e) {}
                        }
                    }
                }
            }
        } catch (e) {}
        
        return colors;
    }
    
    // Extract composition background color
    function extractCompBackgroundColor(comp) {
        try {
            var bgColor = comp.bgColor;
            var newColor = [bgColor[0], bgColor[1], bgColor[2]];
            
            // Check if this color already exists in the palette
            var colorExists = false;
            var tolerance = CONFIG.colorTolerance;
            for (var i = 0; i < state.currentPalette.length; i++) {
                var existingColor = state.currentPalette[i];
                if (Math.abs(newColor[0] - existingColor[0]) < tolerance &&
                    Math.abs(newColor[1] - existingColor[1]) < tolerance &&
                    Math.abs(newColor[2] - existingColor[2]) < tolerance) {
                    colorExists = true;
                    break;
                }
            }
            
            // Add to end of palette if it doesn't already exist
            if (!colorExists) {
                state.currentPalette.push(newColor);
                
                // Respect maximum colors limit
                if (state.currentPalette.length > CONFIG.maxColors) {
                    state.currentPalette = state.currentPalette.slice(-CONFIG.maxColors);
                }
                
                // Recreate grid to show the new color
                createPaletteGrid();
                updateStatus("Extracted background color");
            }
        } catch (e) {
            alert("Error extracting background color: " + e.toString());
        }
    }
    
    // ========================================
    // RANDOM APPLY COLORS FUNCTION
    // ========================================
    
    function randomApplyColors() {
        if (state.selectedColors.length === 0) {
            alert("Please select one or more colors first (Ctrl+click on colors).");
            return;
        }
        
        app.beginUndoGroup("Random Apply Colors");
        
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) {
                alert("Please select a composition.");
                return;
            }
            
            var selectedLayers = comp.selectedLayers;
            if (selectedLayers.length === 0) {
                alert("Please select one or more layers.");
                return;
            }
            
            var appliedCount = 0;
            var shapeGroupsCount = 0;
            
            // Apply random colors to each selected layer
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                
                if (layer instanceof ShapeLayer) {
                    // For shape layers, apply random colors to individual shape groups
                    var groupsApplied = randomApplyToShapeGroups(layer);
                    if (groupsApplied > 0) {
                        appliedCount++;
                        shapeGroupsCount += groupsApplied;
                    }
                } else if (layer instanceof TextLayer || 
                          (layer instanceof AVLayer && layer.source instanceof FootageItem && 
                           layer.source.mainSource instanceof SolidSource)) {
                    
                    // For other layer types, apply one random color to the whole layer
                    var randomIndex = Math.floor(Math.random() * state.selectedColors.length);
                    var randomColor = state.selectedColors[randomIndex].color;
                    
                    try {
                        applyColorToLayer(layer, randomColor);
                        appliedCount++;
                    } catch (e) {
                        // Continue with next layer if this one fails
                    }
                }
            }
            
            if (appliedCount > 0) {
                var modeText = state.applyColorMode === "fill" ? "Fill Effect" : "Direct";
                var statusMsg = "Applied random colors to " + appliedCount + " layers (" + shapeGroupsCount + " shape groups) using " + modeText + " mode";
                
                // Add fill/stroke info to status
                if (state.applyToFill && state.applyToStroke) {
                    statusMsg += " (fill & stroke)";
                } else if (state.applyToFill) {
                    statusMsg += " (fill only)";
                } else if (state.applyToStroke) {
                    statusMsg += " (stroke only)";
                }
                
                updateStatus(statusMsg);
            } else {
                alert("No suitable layers found. Random colors can be applied to shape layers, text layers, and solid layers.");
            }
            
        } catch (e) {
            alert("Error applying random colors: " + e.toString());
        }
        
        app.endUndoGroup();
    }
    
    // Apply random colors to individual shape groups within a shape layer
    function randomApplyToShapeGroups(shapeLayer) {
        var appliedCount = 0;
        var currentTime = shapeLayer.containingComp.time;
        
        try {
            // Check if we should use Fill Effect mode for shape layers
            if (state.applyColorMode === "fill") {
                // Use Fill Effect mode - apply one random color to the whole shape layer
                var randomIndex = Math.floor(Math.random() * state.selectedColors.length);
                var randomColor = state.selectedColors[randomIndex].color;
                applyColorToLayer(shapeLayer, randomColor);
                appliedCount = 1;
            } else {
                // Use Direct mode - apply random colors to individual shape groups
                var contents = shapeLayer.property("ADBE Root Vectors Group");
                if (!contents) {
                    contents = shapeLayer.property("Contents");
                }
                
                if (contents) {
                    appliedCount = randomApplyToShapeGroupsRecursive(contents, currentTime);
                }
            }
        } catch (e) {
            // If recursive approach fails, try simple approach
            try {
                var randomIndex = Math.floor(Math.random() * state.selectedColors.length);
                var randomColor = state.selectedColors[randomIndex].color;
                applyColorToLayer(shapeLayer, randomColor);
                appliedCount = 1;
            } catch (e2) {}
        }
        
        return appliedCount;
    }
    
    // Recursively apply random colors to shape groups
    function randomApplyToShapeGroupsRecursive(group, currentTime) {
        var appliedCount = 0;
        
        try {
            for (var i = 1; i <= group.numProperties; i++) {
                var prop = group.property(i);
                var matchName = prop.matchName;
                
                if (matchName === "ADBE Vector Group") {
                    // For each shape group, apply a random color to its fills
                    var groupApplied = applyRandomColorToGroup(prop, currentTime);
                    appliedCount += groupApplied;
                    
                    // Also check for nested groups
                    if (prop.property("Contents")) {
                        appliedCount += randomApplyToShapeGroupsRecursive(prop.property("Contents"), currentTime);
                    } else {
                        appliedCount += randomApplyToShapeGroupsRecursive(prop, currentTime);
                    }
                } else if (matchName === "ADBE Vector Graphic - Fill" && state.applyToFill) {
                    // Apply random color to standalone fills
                    var randomIndex = Math.floor(Math.random() * state.selectedColors.length);
                    var randomColor = state.selectedColors[randomIndex].color;
                    
                    try {
                        var colorProp = prop.property("Color");
                        if (colorProp) {
                            ErrorHandler.safeSetValue(colorProp, randomColor, currentTime);
                            appliedCount++;
                        }
                    } catch (e) {}
                } else if (matchName === "ADBE Vector Graphic - Stroke" && state.applyToStroke) {
                    // Apply random color to standalone strokes
                    var randomIndex = Math.floor(Math.random() * state.selectedColors.length);
                    var randomColor = state.selectedColors[randomIndex].color;
                    
                    try {
                        var colorProp = prop.property("Color");
                        if (colorProp) {
                            ErrorHandler.safeSetValue(colorProp, randomColor, currentTime);
                            appliedCount++;
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
        
        return appliedCount;
    }
    
    // Apply random color to a specific shape group
    function applyRandomColorToGroup(group, currentTime) {
        var appliedCount = 0;
        var randomIndex = Math.floor(Math.random() * state.selectedColors.length);
        var randomColor = state.selectedColors[randomIndex].color;
        
        try {
            // Look for fills and strokes in this group
            for (var i = 1; i <= group.numProperties; i++) {
                var prop = group.property(i);
                if (prop.matchName === "ADBE Vector Graphic - Fill" && state.applyToFill) {
                    try {
                        var colorProp = prop.property("Color");
                        if (colorProp) {
                            ErrorHandler.safeSetValue(colorProp, randomColor, currentTime);
                            appliedCount++;
                        }
                    } catch (e) {}
                } else if (prop.matchName === "ADBE Vector Graphic - Stroke" && state.applyToStroke) {
                    try {
                        var colorProp = prop.property("Color");
                        if (colorProp) {
                            ErrorHandler.safeSetValue(colorProp, randomColor, currentTime);
                            appliedCount++;
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
        
        return appliedCount;
    }
    
    // ========================================
    // SAVE/LOAD PALETTE FUNCTIONS
    // ========================================
    
    function savePalette() {
        var file = File.saveDialog("Save Color Palette", "Color Palette Files:*.json");
        if (file) {
            try {
                file.open("w");
                var paletteData = {
                    name: "Color Palette",
                    version: "1.0",
                    colors: state.currentPalette
                };
                file.write(JSON.stringify(paletteData, null, 2));
                file.close();
                updateStatus("Palette saved successfully");
            } catch (e) {
                alert("Error saving palette: " + e.toString());
            }
        }
    }
    
    function loadPalette() {
        var file = File.openDialog("Load Color Palette", "Color Palette Files:*.json");
        if (file) {
            try {
                file.open("r");
                var content = file.read();
                file.close();
                
                var paletteData = JSON.parse(content);
                if (paletteData.colors && paletteData.colors.length > 0) {
                    state.currentPalette = paletteData.colors.slice(0, CONFIG.maxColors);
                    // Clear selection state when loading new palette
                    state.selectedColors = [];
                    
                    // Recreate grid for new palette size
                    createPaletteGrid();
                    updateStatus("Palette loaded successfully");
                } else {
                    alert("Invalid palette file format.");
                }
            } catch (e) {
                alert("Error loading palette: " + e.toString());
            }
        }
    }
    
    function loadPresetPalette() {
        var dialog = new Window("dialog", "Load Preset Palette");
        dialog.orientation = "column";
        dialog.spacing = 10;
        dialog.margins = 16;
        dialog.preferredSize.width = 260;
        dialog.preferredSize.height = 350;
        
        // Get preset names
        var presetNames = [];
        for (var name in presetPalettes) {
            presetNames.push(name);
        }
        
        // Main content area - preset list and preview side by side
        var contentGroup = dialog.add("group");
        contentGroup.orientation = "row";
        contentGroup.alignChildren = "fill";
        contentGroup.spacing = 8;
        
        // Left side - Preset list
        var listGroup = contentGroup.add("panel", undefined, "Select Preset Palette");
        listGroup.orientation = "column";
        listGroup.margins = 8;
        listGroup.preferredSize.width = 120;
        
        var listbox = listGroup.add("listbox", undefined, presetNames);
        listbox.preferredSize.height = 200;
        listbox.selection = 0; // Select first item by default
        
        // Right side - Preview colors
        var previewGroup = contentGroup.add("panel", undefined, "Preview");
        previewGroup.orientation = "column";
        previewGroup.margins = 8;
        previewGroup.alignChildren = "fill";
        previewGroup.spacing = 4;
        previewGroup.preferredSize.width = 72;
        
        var colorPreview = [];
        
        // Create 5 small color preview squares in a column
        for (var i = 0; i < 5; i++) {
            var colorSquare = previewGroup.add("panel");
            colorSquare.preferredSize.width = 40;
            colorSquare.preferredSize.height = 30;
            colorSquare.currentColor = [0.5, 0.5, 0.5]; // Default gray
            
            // Custom draw function for color preview
            colorSquare.onDraw = function() {
                try {
                    var g = this.graphics;
                    var color = this.currentColor || [0.5, 0.5, 0.5];
                    
                    // Clear the graphics context
                    g.newPath();
                    g.rectPath(0, 0, this.size.width, this.size.height);
                    
                    // Create brush with the color
                    var brush = g.newBrush(g.BrushType.SOLID_COLOR, color);
                    g.fillPath(brush);
                    
                    // Draw border
                    var pen = g.newPen(g.PenType.SOLID_COLOR, [0.3, 0.3, 0.3], 1);
                    g.newPath();
                    g.rectPath(0, 0, this.size.width, this.size.height);
                    g.strokePath(pen);
                } catch (e) {
                    // Fallback if drawing fails
                    var g = this.graphics;
                    g.newPath();
                    g.rectPath(0, 0, this.size.width, this.size.height);
                    var fallbackBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0.8, 0.8, 0.8]);
                    g.fillPath(fallbackBrush);
                }
            };
            
            colorPreview.push(colorSquare);
        }
        
        // Update preview when selection changes
        function updatePreview() {
            if (listbox.selection) {
                var selectedPalette = presetPalettes[listbox.selection.text];
                for (var i = 0; i < 5; i++) {
                    if (i < selectedPalette.length) {
                        // Set color for existing preview square
                        colorPreview[i].currentColor = selectedPalette[i];
                        colorPreview[i].visible = true;
                    } else {
                        // Hide preview square if no color available
                        colorPreview[i].visible = false;
                    }
                    // Force redraw
                    try {
                        colorPreview[i].notify('onDraw');
                    } catch (e) {
                        // Alternative redraw method
                        colorPreview[i].hide();
                        colorPreview[i].show();
                    }
                }
            }
        }
        
        listbox.onChange = updatePreview;
        updatePreview(); // Initial preview
        
        // Info text
        var infoText = dialog.add("statictext", undefined, "Current palette has " + state.currentPalette.length + " colors");
        infoText.alignment = "center";
        
        // Mode selection
        var modeGroup = dialog.add("panel", undefined, "Load Mode");
        modeGroup.orientation = "column";
        modeGroup.margins = 10;
        
        var appendRb = modeGroup.add("radiobutton", undefined, "Add to end of current palette");
        var prependRb = modeGroup.add("radiobutton", undefined, "Add to beginning of current palette");
        var replaceRb = modeGroup.add("radiobutton", undefined, "Replace current palette");
        
        appendRb.value = true; // Default to append mode
        
        // Buttons
        var buttonGroup = dialog.add("group");
        var okBtn = buttonGroup.add("button", undefined, "Load Preset");
        var cancelBtn = buttonGroup.add("button", undefined, "Cancel");
        
        okBtn.onClick = function() {
            dialog.close(1);
        };
        
        cancelBtn.onClick = function() {
            dialog.close(0);
        };
        
        var result = dialog.show();
        
        if (result === 1 && listbox.selection) { // OK clicked and palette selected
            var selectedPaletteName = listbox.selection.text;
            var selectedColors = presetPalettes[selectedPaletteName];
            
            var mode;
            if (replaceRb.value) {
                mode = "replace";
            } else if (prependRb.value) {
                mode = "prepend";
            } else {
                mode = "append"; // Default
            }
            
            // Apply to palette based on mode
            if (mode === "replace") {
                // Replace current palette with preset colors
                state.currentPalette = selectedColors.slice(0, CONFIG.maxColors);
            } else if (mode === "prepend") {
                // Prepend to current palette
                var combinedColors = selectedColors.concat(state.currentPalette);
                var allUniqueColors = ColorUtils.removeDuplicateColors(combinedColors);
                state.currentPalette = allUniqueColors.slice(0, CONFIG.maxColors);
            } else {
                // Default: append to current palette
                var combinedColors = state.currentPalette.concat(selectedColors);
                var allUniqueColors = ColorUtils.removeDuplicateColors(combinedColors);
                state.currentPalette = allUniqueColors.slice(0, CONFIG.maxColors);
            }
            
            // Recreate grid for new palette size
            createPaletteGrid();
            
            // Update status based on mode
            var statusMsg;
            if (mode === "replace") {
                statusMsg = "Replaced palette with preset: " + selectedPaletteName;
            } else if (mode === "prepend") {
                statusMsg = "Added preset to beginning: " + selectedPaletteName;
            } else {
                statusMsg = "Added preset to end: " + selectedPaletteName;
            }
            updateStatus(statusMsg);
        }
    }
    
    // ========================================
    // PASTE COLORS FUNCTION
    // ========================================
    

    
    // Parse color codes from text
    function parseColorsFromText(text) {
        var colors = [];
        if (!text) return colors;
        
        // 1. Hex codes: #RRGGBB, #RGB, RRGGBB, RGB, #RRGGBBAA, #AARRGGBB
        var hexRegex = /#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})\b/g;
        var match;
        while ((match = hexRegex.exec(text)) !== null) {
            var hex = match[1];
            if (hex.length === 3) {
                // Expand short hex
                hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
            }
            if (hex.length === 8) {
                // #RRGGBBAA or #AARRGGBB, ignore alpha, use first 6
                var r = parseInt(hex.substring(0,2), 16) / 255;
                var g = parseInt(hex.substring(2,4), 16) / 255;
                var b = parseInt(hex.substring(4,6), 16) / 255;
                colors.push([r,g,b]);
                continue;
            }
            if (hex.length === 6) {
                var r = parseInt(hex.substring(0,2), 16) / 255;
                var g = parseInt(hex.substring(2,4), 16) / 255;
                var b = parseInt(hex.substring(4,6), 16) / 255;
                colors.push([r,g,b]);
            }
        }
        
        // 2. CSS rgb/rgba
        var rgbRegex = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g;
        while ((match = rgbRegex.exec(text)) !== null) {
            var r = parseInt(match[1],10)/255;
            var g = parseInt(match[2],10)/255;
            var b = parseInt(match[3],10)/255;
            colors.push([r,g,b]);
        }
        
        // 3. JSON array: [ [r,g,b], ... ] or ["#RRGGBB", ...]
        try {
            var arr = JSON.parse(text);
            if (arr && arr.length) {
                for (var i=0; i<arr.length; i++) {
                    var c = arr[i];
                    if (typeof c === "string") {
                        // Try parse as hex
                        var hex = c.replace(/^#/,'');
                        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
                        if (hex.length === 8) {
                            var r = parseInt(hex.substring(0,2), 16) / 255;
                            var g = parseInt(hex.substring(2,4), 16) / 255;
                            var b = parseInt(hex.substring(4,6), 16) / 255;
                            colors.push([r,g,b]);
                        } else if (hex.length === 6) {
                            var r = parseInt(hex.substring(0,2), 16) / 255;
                            var g = parseInt(hex.substring(2,4), 16) / 255;
                            var b = parseInt(hex.substring(4,6), 16) / 255;
                            colors.push([r,g,b]);
                        }
                    } else if (c.length >= 3) {
                        // Assume [r,g,b] in 0-255 or 0-1
                        var r = c[0], g = c[1], b = c[2];
                        if (r > 1 || g > 1 || b > 1) {
                            r = r/255; g = g/255; b = b/255;
                        }
                        colors.push([r,g,b]);
                    }
                }
            }
        } catch(e) {}
        
        // Remove duplicates
        var unique = [];
        for (var i=0; i<colors.length; i++) {
            var found = false;
            for (var j=0; j<unique.length; j++) {
                if (Math.abs(colors[i][0]-unique[j][0])<0.001 && Math.abs(colors[i][1]-unique[j][1])<0.001 && Math.abs(colors[i][2]-unique[j][2])<0.001) {
                    found = true; break;
                }
            }
            if (!found) unique.push(colors[i]);
        }
        return unique;
    }
    
    // ========================================
    // HELP FUNCTION
    // ========================================
    
    function showHelp() {
        var helpDialog = new Window("dialog", "Color Manager Help & Shortcuts");
        helpDialog.orientation = "column";
        helpDialog.spacing = 8;
        helpDialog.margins = 16;
        helpDialog.alignChildren = "fill";
        
        // Help content
        var helpContainer = helpDialog.add("panel", undefined, "");
        helpContainer.orientation = "column";
        helpContainer.alignChildren = "fill";
        helpContainer.margins = 8;
        helpContainer.spacing = 4;
        
        // Title
        var titleText = helpContainer.add("statictext", undefined, "Color Manager - Quick Guide");
        titleText.alignment = "center";
        titleText.graphics.font = FontUtils.getTitleFont();
        
        // Basic Operations
        var basicOpsText = helpContainer.add("statictext", undefined, "🎨 Basic Operations:");
        basicOpsText.graphics.font = FontUtils.getBodyFont();
        
        // Individual operation items
        var clickOp = helpContainer.add("statictext", undefined, "• Click: Apply color to selected layers (respects Fill/Stroke settings)");
        clickOp.graphics.font = FontUtils.getBodyFont();
        
        var altClickOp = helpContainer.add("statictext", undefined, "• Alt+Click: Edit color");
        altClickOp.graphics.font = FontUtils.getBodyFont();
        
        var ctrlClickOp = helpContainer.add("statictext", undefined, "• Ctrl+Click: Select/deselect color");
        ctrlClickOp.graphics.font = FontUtils.getBodyFont();
        
        var shiftClickOp = helpContainer.add("statictext", undefined, "• Shift+Click: Remove color");
        shiftClickOp.graphics.font = FontUtils.getBodyFont();
        
        // Features section
        var featuresText = helpContainer.add("statictext", undefined, "🔧 Features:");
        featuresText.graphics.font = FontUtils.getBodyFont();
        
        var fillStrokeOp = helpContainer.add("statictext", undefined, "• Fill/Stroke: Choose which properties to apply colors to");
        fillStrokeOp.graphics.font = FontUtils.getBodyFont();
        
        var extractOp = helpContainer.add("statictext", undefined, "• Extract: Pull colors from selected layers (Append/Prepend/Replace modes)");
        extractOp.graphics.font = FontUtils.getBodyFont();
        
        var randomOp = helpContainer.add("statictext", undefined, "• Random: Apply random colors to selection (respects Direct/Fill Effect mode)");
        randomOp.graphics.font = FontUtils.getBodyFont();
        
        var pasteOp = helpContainer.add("statictext", undefined, "• Paste: Import colors from text/JSON (Append/Prepend/Replace modes)");
        pasteOp.graphics.font = FontUtils.getBodyFont();
        
        var saveOp = helpContainer.add("statictext", undefined, "• Save/Load: Persist palettes as JSON files");
        saveOp.graphics.font = FontUtils.getBodyFont();
        
        var presetOp = helpContainer.add("statictext", undefined, "• Presets: Load preset palettes (Append/Prepend/Replace modes)");
        presetOp.graphics.font = FontUtils.getBodyFont();
        
        // Close button
        var closeBtn = helpDialog.add("button", undefined, "Close");
        closeBtn.preferredSize.width = 80;
        closeBtn.onClick = function() { helpDialog.close(); };
        
        // Layout the dialog to fit content
        helpDialog.layout.layout(true);
        helpDialog.layout.resize();
        helpDialog.center();
        helpDialog.show();
    }
    
    // ========================================
    // MAIN EXECUTION
    // ========================================
    
    // Check if After Effects is available
    if (typeof app === "undefined") {
        alert("This script requires Adobe After Effects.");
        return;
    }
    
    // Initialize the script
    init();
    
    // If Alt/Option key is held, show the Color Manager UI
    // Otherwise, just cycle through background colors
    if (ScriptUI.environment.keyboardState.altKey) {
        // Show Color Manager UI
        buildUI();
        state.panel.center();
        state.panel.show();
    } else {
        cycleBackgroundColors();
    }
})();