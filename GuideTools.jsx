// Author: Jiaxuan Liu
// Version: 3.5

// Create main window with better naming and resizing
var mainWindow = new Window("palette", "GuideLine Tools", undefined, {resizeable: true});
mainWindow.orientation = "column";
mainWindow.alignChildren = ["fill", "top"];
mainWindow.spacing = 5;
mainWindow.margins = 10;

// --- Create Tabbed Panel with consistent sizing ---
var tabbedPanel = mainWindow.add("tabbedpanel");
tabbedPanel.alignChildren = "fill";
tabbedPanel.preferredSize.width = 300;
tabbedPanel.margins = 0;

// --- COMP GUIDES TAB ---
var tabComp = tabbedPanel.add("tab", undefined, "Composition");
tabComp.margins = 6;
tabComp.spacing = 6;
tabComp.alignChildren = ["fill", "top"];

// Add template dropdown at the top
var templateGroup = tabComp.add("group");
templateGroup.orientation = "row";
templateGroup.alignChildren = ["left", "center"];
templateGroup.spacing = 5;
templateGroup.add("statictext", undefined, "Templates:");
var templateDropdown = templateGroup.add("dropdownlist", undefined, [
    "Custom",
    "Rule of Thirds",
    "Golden Ratio",
    "16:9 Title Safe",
    "1.85:1 Widescreen",
    "Social Media - Square",
    "Social Media - 16:9",
    "Social Media - 9:16"
]);
templateDropdown.selection = 0;
templateDropdown.preferredSize.width = 150;
var btnApplyTemplate = templateGroup.add("button", undefined, "Apply");
btnApplyTemplate.preferredSize.width = 60;
btnApplyTemplate.helpTip = "Apply the selected guide template";

// Margin Panel with frame
var marginPanel = tabComp.add("panel", undefined, "Margins");
marginPanel.orientation = "column";
marginPanel.alignChildren = ["fill", "top"];
marginPanel.spacing = 4;
marginPanel.margins = 8;

// Margin Input Group with improved layout
var marginInputGroup = marginPanel.add("group");
marginInputGroup.orientation = "column";
marginInputGroup.alignChildren = ["fill", "top"];
marginInputGroup.spacing = 3;

// Units selection on top row
var unitRow = marginInputGroup.add("group");
unitRow.orientation = "row";
unitRow.alignChildren = ["left", "center"];
unitRow.add("statictext", undefined, "Units:");
var marginType = unitRow.add("dropdownlist", undefined, ["Pixels", "Percent"]);
marginType.selection = 0;
marginType.helpTip = "Select units for margin size";
marginType.minimumSize.width = 100;

// Pixels controls with labels
var pixelsGroup = marginInputGroup.add("group");
pixelsGroup.orientation = "row";
pixelsGroup.alignChildren = ["left", "center"];
pixelsGroup.spacing = 10;
pixelsGroup.add("statictext", undefined, "Pixels:");
var marginAmountPixels = pixelsGroup.add("edittext", undefined, "40");
marginAmountPixels.characters = 5;
marginAmountPixels.helpTip = "Margin size in pixels";

var marginAmountSliderPixels = pixelsGroup.add("slider", undefined, 40, 0, 500);
marginAmountSliderPixels.preferredSize.width = 150;

// Percent controls with labels
var percentGroup = marginInputGroup.add("group");
percentGroup.orientation = "row";
percentGroup.alignChildren = ["left", "center"];
percentGroup.spacing = 10;
percentGroup.add("statictext", undefined, "Percent:");
var marginAmountPercent = percentGroup.add("edittext", undefined, "10");
marginAmountPercent.characters = 5;
marginAmountPercent.helpTip = "Margin size in percent";

var marginAmountSliderPercent = percentGroup.add("slider", undefined, 10, 0, 50);
marginAmountSliderPercent.preferredSize.width = 150;

// Function to update the enabled state of input fields
function updateMarginInputs() {
    var isPixels = marginType.selection.index === 0;
    
    pixelsGroup.enabled = isPixels;
    percentGroup.enabled = !isPixels;
}

// Set initial enabled state
updateMarginInputs();

// Event listeners for pixel inputs
marginAmountPixels.onChange = function() {
    var val = parseInt(this.text);
    if (!isNaN(val) && val >= 0 && val <= 500) {
        marginAmountSliderPixels.value = val;
    } else {
        this.text = Math.round(marginAmountSliderPixels.value).toString();
    }
};

marginAmountSliderPixels.onChanging = function() {
    marginAmountPixels.text = Math.round(this.value).toString();
};

// Event listeners for percent inputs
marginAmountPercent.onChange = function() {
    var val = parseInt(this.text);
    if (!isNaN(val) && val >= 0 && val <= 50) {
        marginAmountSliderPercent.value = val;
    } else {
        this.text = Math.round(marginAmountSliderPercent.value).toString();
    }
};

marginAmountSliderPercent.onChanging = function() {
    marginAmountPercent.text = Math.round(this.value).toString();
};

// Event listener for the dropdown
marginType.onChange = updateMarginInputs;

// Margin Buttons with improved visual grouping and clarity
var marginButtonsPanel = marginPanel.add("group");
marginButtonsPanel.orientation = "column";
marginButtonsPanel.alignChildren = ["center", "top"];
marginButtonsPanel.spacing = 8;

var marginButtonsLabel = marginButtonsPanel.add("statictext", undefined, "Apply Margins To:");
marginButtonsLabel.alignment = ["center", "center"];

var marginButtonsRow = marginButtonsPanel.add("group");
marginButtonsRow.orientation = "row";
marginButtonsRow.alignChildren = ["center", "center"];
marginButtonsRow.spacing = 6;

// Use descriptive text instead of symbols
var btnMargTop = marginButtonsRow.add("button", undefined, "Top");
btnMargTop.preferredSize = [40, 22];
btnMargTop.helpTip = "Apply margin to top edge";

var btnMargLeft = marginButtonsRow.add("button", undefined, "Left");
btnMargLeft.preferredSize = [40, 22];
btnMargLeft.helpTip = "Apply margin to left edge";

var btnMargRight = marginButtonsRow.add("button", undefined, "Right");
btnMargRight.preferredSize = [40, 22];
btnMargRight.helpTip = "Apply margin to right edge";

var btnMargBottom = marginButtonsRow.add("button", undefined, "Bottom");
btnMargBottom.preferredSize = [40, 22];
btnMargBottom.helpTip = "Apply margin to bottom edge";

var btnMargAll = marginButtonsPanel.add("button", undefined, "Apply To All Sides");
btnMargAll.preferredSize = [120, 24];
btnMargAll.helpTip = "Apply margin to all sides";

// Center and Middle Guides in separate panel
var centerPanel = tabComp.add("panel", undefined, "Centerlines");
centerPanel.orientation = "column";
centerPanel.alignChildren = ["fill", "top"];
centerPanel.spacing = 8;
centerPanel.margins = 12;

var centerButtonsGroup = centerPanel.add("group");
centerButtonsGroup.orientation = "row";
centerButtonsGroup.alignChildren = ["center", "center"];
centerButtonsGroup.spacing = 6;

var btnCompCenter = centerButtonsGroup.add("button", undefined, "Both");
btnCompCenter.preferredSize = [60, 24];
btnCompCenter.helpTip = "Create horizontal and vertical centerlines";

var btnCompMiddle = centerButtonsGroup.add("button", undefined, "Horiz");
btnCompMiddle.preferredSize = [60, 24];
btnCompMiddle.helpTip = "Create horizontal centerline";

var btnCompVerticalCenter = centerButtonsGroup.add("button", undefined, "Vert");
btnCompVerticalCenter.preferredSize = [60, 24];
btnCompVerticalCenter.helpTip = "Create vertical centerline";

// --- LAYER GUIDES TAB ---
var tabLayer = tabbedPanel.add("tab", undefined, "Layer");
tabLayer.margins = 6;
tabLayer.spacing = 6;
tabLayer.alignChildren = ["fill", "top"];

// Layer guides instruction text
var layerGuideInstructions = tabLayer.add("statictext", undefined, "Select layer(s) first, then apply guides:");
layerGuideInstructions.alignment = ["fill", "top"];

// Layer Guides Panel for better organization
var edgesPanel = tabLayer.add("panel", undefined, "Layer Edges");
edgesPanel.orientation = "column";
edgesPanel.alignChildren = ["fill", "top"];
edgesPanel.spacing = 4;
edgesPanel.margins = 8;

// Create buttons for layer edges
var edgesButtonsRow = edgesPanel.add("group");
edgesButtonsRow.orientation = "row";
edgesButtonsRow.alignChildren = ["center", "center"];
edgesButtonsRow.spacing = 6;

function createLayerGuideButton(parentGroup, label, guideType, width) {
    var button = parentGroup.add("button", undefined, label);
    button.preferredSize = [width || 60, 24];
    button.onClick = function() {
        onButtonClickLayerGuides(guideType);
    };
    button.helpTip = "Create guide: " + guideType;
    return button;
}

var btnLayerLeft = createLayerGuideButton(edgesButtonsRow, "Left", "Left");
var btnLayerRight = createLayerGuideButton(edgesButtonsRow, "Right", "Right");
var btnLayerTop = createLayerGuideButton(edgesButtonsRow, "Top", "Top");
var btnLayerBottom = createLayerGuideButton(edgesButtonsRow, "Bottom", "Bottom");

// Create panel for layer centers
var centerLayerPanel = tabLayer.add("panel", undefined, "Layer Centers");
centerLayerPanel.orientation = "column";
centerLayerPanel.alignChildren = ["fill", "top"];
centerLayerPanel.spacing = 4;
centerLayerPanel.margins = 8;

var centerLayerRow = centerLayerPanel.add("group");
centerLayerRow.orientation = "row";
centerLayerRow.alignChildren = ["center", "center"];
centerLayerRow.spacing = 6;

var btnLayerCenter = createLayerGuideButton(centerLayerRow, "Center", "Center");
var btnLayerMiddle = createLayerGuideButton(centerLayerRow, "Middle", "Middle");
var btnLayerAnchor = createLayerGuideButton(centerLayerRow, "Anchor", "Anchor");
var btnLayerAround = createLayerGuideButton(centerLayerRow, "All Edges", "Around", 80);

// --- DISTRIBUTE GUIDES TAB ---
var tabDistribute = tabbedPanel.add("tab", undefined, "Grid");
tabDistribute.margins = 6;
tabDistribute.spacing = 6;
tabDistribute.alignChildren = ["fill", "top"];

// Distribute Panel with improved organization
var distributePanel = tabDistribute.add("panel", undefined, "Guide Grid");
distributePanel.orientation = "column";
distributePanel.alignChildren = ["fill", "top"];
distributePanel.spacing = 4;
distributePanel.margins = 8;

// Visual representation of guide grid
var gridPreview = distributePanel.add("group");
gridPreview.alignment = ["center", "top"];
gridPreview.preferredSize = [120, 80];
gridPreview.graphics.backgroundColor = gridPreview.graphics.newBrush(gridPreview.graphics.BrushType.SOLID_COLOR, [0.9, 0.9, 0.9, 1]);

// Distribution controls with improved layout
var distributionControls = distributePanel.add("group");
distributionControls.orientation = "column";
distributionControls.alignChildren = ["fill", "top"];
distributionControls.spacing = 4;

// Horizontal guides input
var horizontalGroup = distributionControls.add("group");
horizontalGroup.orientation = "row";
horizontalGroup.alignChildren = ["left", "center"];
horizontalGroup.spacing = 10;
horizontalGroup.add("statictext", undefined, "Horizontal Guides:");
var distributeY = horizontalGroup.add("edittext", undefined, "2");
distributeY.characters = 3;
distributeY.helpTip = "Number of horizontal guides";

var distributeYSlider = horizontalGroup.add("slider", undefined, 2, 1, 10);
distributeYSlider.preferredSize.width = 150;

// Vertical guides input
var verticalGroup = distributionControls.add("group");
verticalGroup.orientation = "row";
verticalGroup.alignChildren = ["left", "center"];
verticalGroup.spacing = 10;
verticalGroup.add("statictext", undefined, "Vertical Guides:");
var distributeX = verticalGroup.add("edittext", undefined, "2");
distributeX.characters = 3;
distributeX.helpTip = "Number of vertical guides";

var distributeXSlider = verticalGroup.add("slider", undefined, 2, 1, 10);
distributeXSlider.preferredSize.width = 150;

// Slider event handlers
distributeXSlider.onChanging = function() {
    distributeX.text = Math.round(this.value).toString();
    updateGridPreview();
};

distributeYSlider.onChanging = function() {
    distributeY.text = Math.round(this.value).toString();
    updateGridPreview();
};

// Text field event handlers
distributeX.onChange = function() {
    var val = parseInt(this.text);
    if (!isNaN(val) && val >= 1 && val <= 10) {
        distributeXSlider.value = val;
    } else {
        this.text = distributeXSlider.value.toString();
    }
    updateGridPreview();
};

distributeY.onChange = function() {
    var val = parseInt(this.text);
    if (!isNaN(val) && val >= 1 && val <= 10) {
        distributeYSlider.value = val;
    } else {
        this.text = distributeYSlider.value.toString();
    }
    updateGridPreview();
};

// Function to update grid preview (placeholder for actual implementation)
function updateGridPreview() {
    // This would redraw the grid preview based on current values
    // Would require implementing actual drawing functions
}

var btnDistribute = distributePanel.add("button", undefined, "Create Guide Grid");
btnDistribute.preferredSize = [120, 24];
btnDistribute.alignment = ["center", "bottom"];
btnDistribute.helpTip = "Create a grid of guides based on X & Y values";

// --- SETTINGS PANEL ---
var settingsPanel = mainWindow.add("panel", undefined, "Settings");
settingsPanel.orientation = "column";
settingsPanel.alignChildren = ["fill", "top"];
settingsPanel.spacing = 4;
settingsPanel.margins = 8;

// Auto clear option
var clearGroup = settingsPanel.add("group");
clearGroup.orientation = "row";
clearGroup.alignChildren = ["left", "center"];
var chkAutoClear = clearGroup.add("checkbox", undefined, "Auto Clear Guides");
chkAutoClear.value = true;
chkAutoClear.helpTip = "Clear existing guides before applying new ones";

// Clear guides button
var btnClearAll = settingsPanel.add("button", undefined, "Clear All Guides");
btnClearAll.helpTip = "Remove all guides from the active composition";

// Status bar
var statusBar = mainWindow.add("statictext", undefined, "Ready");
statusBar.alignment = ["fill", "bottom"];

// Apply Template Button Event Handler - THIS WAS MISSING
btnApplyTemplate.onClick = function() {
    var comp = getActiveComp();
    if (!comp) return;
    
    if (chkAutoClear.value) {
        clearGuides();
    }
    
    app.beginUndoGroup("Apply Template: " + templateDropdown.selection.text);
    
    try {
        switch (templateDropdown.selection.index) {
            case 1: // Rule of Thirds
                applyRuleOfThirds(comp);
                break;
            case 2: // Golden Ratio
                applyGoldenRatio(comp);
                break;
            case 3: // 16:9 Title Safe
                applyTitleSafe(comp);
                break;
            case 4: // 1.85:1 Widescreen
                applyWidescreen(comp);
                break;
            case 5: // Social Media - Square
                applySquareSocialMedia(comp);
                break;
            case 6: // Social Media - 16:9
                apply16x9SocialMedia(comp);
                break;
            case 7: // Social Media - 9:16
                apply9x16SocialMedia(comp);
                break;
            default:
                statusBar.text = "No template selected";
                break;
        }
        
        if (templateDropdown.selection.index > 0) {
            statusBar.text = "Applied template: " + templateDropdown.selection.text;
        }
    } catch (error) {
        statusBar.text = "Error applying template: " + error.toString();
    }
    
    app.endUndoGroup();
};

// Display Window
// --- Template Functions ---

// Apply Rule of Thirds template
function applyRuleOfThirds(comp) {
    // Horizontal lines at 1/3 and 2/3
    comp.addGuide(0, comp.height / 3);
    comp.addGuide(0, (comp.height / 3) * 2);
    
    // Vertical lines at 1/3 and 2/3
    comp.addGuide(1, comp.width / 3);
    comp.addGuide(1, (comp.width / 3) * 2);
}

// Apply Golden Ratio template (Phi ≈ 1.618)
function applyGoldenRatio(comp) {
    var phi = 1.618;
    
    // Calculate golden sections
    var shortSideH = comp.height / phi;
    var shortSideW = comp.width / phi;
    
    // Horizontal guides
    comp.addGuide(0, shortSideH);
    comp.addGuide(0, comp.height - shortSideH);
    
    // Vertical guides
    comp.addGuide(1, shortSideW);
    comp.addGuide(1, comp.width - shortSideW);
}

// Apply 16:9 Title Safe guides (10% margin)
function applyTitleSafe(comp) {
    var safeMargin = 0.1; // 10% margin
    
    // Action safe area (10% margin)
    comp.addGuide(0, comp.height * safeMargin);
    comp.addGuide(0, comp.height * (1 - safeMargin));
    comp.addGuide(1, comp.width * safeMargin);
    comp.addGuide(1, comp.width * (1 - safeMargin));
    
    // Title safe area (5% additional margin from action safe)
    var titleMargin = safeMargin + 0.05;
    comp.addGuide(0, comp.height * titleMargin);
    comp.addGuide(0, comp.height * (1 - titleMargin));
    comp.addGuide(1, comp.width * titleMargin);
    comp.addGuide(1, comp.width * (1 - titleMargin));
}

// Apply 1.85:1 Widescreen guides
function applyWidescreen(comp) {
    var targetRatio = 1.85;
    var currentRatio = comp.width / comp.height;
    
    if (currentRatio > targetRatio) {
        // Comp is wider than 1.85:1, add vertical guides
        var actualWidth = comp.height * targetRatio;
        var margin = (comp.width - actualWidth) / 2;
        
        comp.addGuide(1, margin);
        comp.addGuide(1, comp.width - margin);
    } else if (currentRatio < targetRatio) {
        // Comp is taller than 1.85:1, add horizontal guides
        var actualHeight = comp.width / targetRatio;
        var margin = (comp.height - actualHeight) / 2;
        
        comp.addGuide(0, margin);
        comp.addGuide(0, comp.height - margin);
    }
    
    // Add center guides
    comp.addGuide(0, comp.height / 2);
    comp.addGuide(1, comp.width / 2);
}

// Apply Square Social Media guides
function applySquareSocialMedia(comp) {
    var currentRatio = comp.width / comp.height;
    
    if (currentRatio > 1) {
        // Comp is wider than 1:1, add vertical guides for square
        var squareWidth = comp.height;
        var margin = (comp.width - squareWidth) / 2;
        
        comp.addGuide(1, margin);
        comp.addGuide(1, comp.width - margin);
    } else if (currentRatio < 1) {
        // Comp is taller than 1:1, add horizontal guides for square
        var squareHeight = comp.width;
        var margin = (comp.height - squareHeight) / 2;
        
        comp.addGuide(0, margin);
        comp.addGuide(0, comp.height - margin);
    }
    
    // Add center guides
    comp.addGuide(0, comp.height / 2);
    comp.addGuide(1, comp.width / 2);
    
    // Add safe area (10% inside)
    var safeMargin = Math.min(comp.width, comp.height) * 0.1;
    if (currentRatio >= 1) {
        // Square or landscape
        comp.addGuide(0, safeMargin);
        comp.addGuide(0, comp.height - safeMargin);
        comp.addGuide(1, margin + safeMargin);
        comp.addGuide(1, comp.width - margin - safeMargin);
    } else {
        // Portrait
        comp.addGuide(0, margin + safeMargin);
        comp.addGuide(0, comp.height - margin - safeMargin);
        comp.addGuide(1, safeMargin);
        comp.addGuide(1, comp.width - safeMargin);
    }
}

// Apply 16:9 Social Media guides
function apply16x9SocialMedia(comp) {
    var targetRatio = 16/9;
    var currentRatio = comp.width / comp.height;
    
    if (currentRatio > targetRatio) {
        // Comp is wider than 16:9, add vertical guides
        var actualWidth = comp.height * targetRatio;
        var margin = (comp.width - actualWidth) / 2;
        
        comp.addGuide(1, margin);
        comp.addGuide(1, comp.width - margin);
    } else if (currentRatio < targetRatio) {
        // Comp is taller than 16:9, add horizontal guides
        var actualHeight = comp.width / targetRatio;
        var margin = (comp.height - actualHeight) / 2;
        
        comp.addGuide(0, margin);
        comp.addGuide(0, comp.height - margin);
    }
    
    // Add center guides
    comp.addGuide(0, comp.height / 2);
    comp.addGuide(1, comp.width / 2);
    
    // Add safe area (10% inside)
    var safeMarginH = comp.height * 0.1;
    var safeMarginW = comp.width * 0.1;
    
    comp.addGuide(0, safeMarginH);
    comp.addGuide(0, comp.height - safeMarginH);
    comp.addGuide(1, safeMarginW);
    comp.addGuide(1, comp.width - safeMarginW);
}

// Apply 9:16 Social Media guides (vertical video)
function apply9x16SocialMedia(comp) {
    var targetRatio = 9/16;
    var currentRatio = comp.width / comp.height;
    
    if (currentRatio > targetRatio) {
        // Comp is wider than 9:16, add vertical guides
        var actualWidth = comp.height * targetRatio;
        var margin = (comp.width - actualWidth) / 2;
        
        comp.addGuide(1, margin);
        comp.addGuide(1, comp.width - margin);
    } else if (currentRatio < targetRatio) {
        // Comp is taller than 9:16, add horizontal guides
        var actualHeight = comp.width / targetRatio;
        var margin = (comp.height - actualHeight) / 2;
        
        comp.addGuide(0, margin);
        comp.addGuide(0, comp.height - margin);
    }
    
    // Add center guides
    comp.addGuide(0, comp.height / 2);
    comp.addGuide(1, comp.width / 2);
    
    // Add safe area (10% inside)
    var safeMarginH = comp.height * 0.1;
    var safeMarginW = comp.width * 0.1;
    
    comp.addGuide(0, safeMarginH);
    comp.addGuide(0, comp.height - safeMarginH);
    comp.addGuide(1, safeMarginW);
    comp.addGuide(1, comp.width - safeMarginW);
}

// Clear Guides Function
function clearGuides() {
    var comp = getActiveComp();
    if (!comp) return;

    app.beginUndoGroup("Clear All Guides");
    try {
        while (comp.guides.length > 0) {
            comp.removeGuide(0);
        }
        statusBar.text = "Cleared all guides";
    } catch (error) {
        statusBar.text = "Error: " + error.toString();
    }
    app.endUndoGroup();
}

// Distribute Guides Function with improved error handling
function distributeGuides(orientationType, amount) {
    var comp = getActiveComp();
    if (!comp) return;

    amount = parseInt(amount);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid number of guides.");
        statusBar.text = "Error: Invalid guide amount";
        return;
    }

    var dimension = orientationType ? comp.width : comp.height;
    
    app.beginUndoGroup("Distribute " + (orientationType ? "Vertical" : "Horizontal") + " Guides");
    try {
        for (var i = 0; i < amount; i++) {
            var placement = (dimension / (parseInt(amount) + 1)) * (i + 1);
            comp.addGuide(orientationType, placement);
        }
        statusBar.text = "Created " + amount + " " + (orientationType ? "vertical" : "horizontal") + " guides";
    } catch (error) {
        statusBar.text = "Error: " + error.toString();
    }
    app.endUndoGroup();
}

// Create Margin Function with improved validation
function createMargin(buttonIndex) {
    var comp = getActiveComp();
    if (!comp) return;

    var orientationType = buttonIndex % 2; // 0,2 = horizontal, 1,3 = vertical
    var dimension = orientationType ? comp.width : comp.height;
    var marginValue;
    
    try {
        if (marginType.selection.index === 0) { // pixels
            marginValue = Math.max(0, Math.min(dimension, parseInt(marginAmountPixels.text)));
        } else { // percent
            var percent = Math.max(0, Math.min(100, parseFloat(marginAmountPercent.text)));
            marginValue = (percent / 100) * dimension;
        }
        
        // Determine placement based on edge (top/left vs bottom/right)
        var placement = (buttonIndex < 2) ? marginValue : dimension - marginValue;
        
        app.beginUndoGroup("Create Margin Guide");
        comp.addGuide(orientationType, placement);
        
        var edgeNames = ["Top", "Left", "Bottom", "Right"];
        statusBar.text = "Added " + edgeNames[buttonIndex] + " margin guide";
        
        app.endUndoGroup();
    } catch (error) {
        statusBar.text = "Error: " + error.toString();
    }
}

// Add Comp Guide Functions with improved status feedback
function addCompGuide(guideType) {
    var comp = getActiveComp();
    if (!comp) return;

    app.beginUndoGroup("Add Comp Guide: " + guideType);
    try {
        switch (guideType) {
            case "Center":
                comp.addGuide(0, comp.height / 2);
                comp.addGuide(1, comp.width / 2);
                statusBar.text = "Added horizontal and vertical centerlines";
                break;
            case "Middle":
                comp.addGuide(0, comp.height / 2);
                statusBar.text = "Added horizontal centerline";
                break;
            case "Vertical Center":
                comp.addGuide(1, comp.width / 2);
                statusBar.text = "Added vertical centerline";
                break;
        }
    } catch (error) {
        statusBar.text = "Error: " + error.toString();
    }
    app.endUndoGroup();
}

// Layer Guide Functions with improved error handling and transformation support
function addSpecificGuide(comp, layer, guideType) {
    try {
        var undoGroupName = "Add " + guideType + " Guide: " + layer.name;
        app.beginUndoGroup(undoGroupName);
        
        // Get transformed bounds that account for scale, rotation, and parent hierarchy
        var bounds = getTransformedLayerBounds(comp, layer);
        var position = layer.transform.position.value;
        
        switch (guideType) {
            case "Left":
                comp.addGuide(1, bounds.left);
                break;
            case "Right":
                comp.addGuide(1, bounds.right);
                break;
            case "Top":
                comp.addGuide(0, bounds.top);
                break;
            case "Bottom":
                comp.addGuide(0, bounds.bottom);
                break;
            case "Center":
                comp.addGuide(1, bounds.centerX);
                break;
            case "Middle":
                comp.addGuide(0, bounds.centerY);
                break;
            case "Anchor":
                // For anchor point, we need to consider parent transforms
                if (layer.parent) {
                    var parentTransform = getParentTransform(layer, comp.time);
                    comp.addGuide(1, position[0] * parentTransform.scaleX + parentTransform.x);
                    comp.addGuide(0, position[1] * parentTransform.scaleY + parentTransform.y);
                } else {
                    comp.addGuide(1, position[0]);
                    comp.addGuide(0, position[1]);
                }
                break;
            case "Around":
                comp.addGuide(1, bounds.left);
                comp.addGuide(1, bounds.right);
                comp.addGuide(0, bounds.top);
                comp.addGuide(0, bounds.bottom);
                break;
        }
        
        statusBar.text = "Added guide(s) for " + layer.name + " (" + guideType + ")";
        app.endUndoGroup();
    } catch (error) {
        statusBar.text = "Error: " + error.toString();
        app.endUndoGroup();
    }
}

// Function to handle layer guide button clicks
function onButtonClickLayerGuides(guideType) {
    var comp = getActiveComp();
    if (!comp) return;
    
    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
        alert("Please select one or more layers in the composition.");
        statusBar.text = "Error: No layers selected";
        return;
    }
    
    if (chkAutoClear.value) {
        clearGuides();
    }
    
    // Create one undo group for the entire operation
    app.beginUndoGroup("Add " + guideType + " Guides to " + selectedLayers.length + " layers");
    
    for (var i = 0; i < selectedLayers.length; i++) {
        // Don't create separate undo groups within the loop
        try {
            // Get transformed bounds that account for scale, rotation, and parent hierarchy
            var layer = selectedLayers[i];
            var bounds = getTransformedLayerBounds(comp, layer);
            var position = layer.transform.position.value;
            
            switch (guideType) {
                case "Left":
                    comp.addGuide(1, bounds.left);
                    break;
                case "Right":
                    comp.addGuide(1, bounds.right);
                    break;
                case "Top":
                    comp.addGuide(0, bounds.top);
                    break;
                case "Bottom":
                    comp.addGuide(0, bounds.bottom);
                    break;
                case "Center":
                    comp.addGuide(1, bounds.centerX);
                    break;
                case "Middle":
                    comp.addGuide(0, bounds.centerY);
                    break;
                case "Anchor":
                    // For anchor point, we need to consider parent transforms
                    if (layer.parent) {
                        var parentTransform = getParentTransform(layer, comp.time);
                        comp.addGuide(1, position[0] * parentTransform.scaleX + parentTransform.x);
                        comp.addGuide(0, position[1] * parentTransform.scaleY + parentTransform.y);
                    } else {
                        comp.addGuide(1, position[0]);
                        comp.addGuide(0, position[1]);
                    }
                    break;
                case "Around":
                    comp.addGuide(1, bounds.left);
                    comp.addGuide(1, bounds.right);
                    comp.addGuide(0, bounds.top);
                    comp.addGuide(0, bounds.bottom);
                    break;
            }
            
            statusBar.text = "Added guide(s) for " + selectedLayers.length + " layers (" + guideType + ")";
        } catch (error) {
            statusBar.text = "Error with layer " + layer.name + ": " + error.toString();
        }
    }
    
    app.endUndoGroup();
}

// --- BUTTON EVENT HANDLERS ---

// Comp centerline buttons
btnCompCenter.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    addCompGuide("Center");
};

btnCompMiddle.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    addCompGuide("Middle");
};

btnCompVerticalCenter.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    addCompGuide("Vertical Center");
};

// Distribute button
btnDistribute.onClick = function() {
    var comp = getActiveComp();
    if (!comp) return;

    if (chkAutoClear.value) {
        clearGuides();
    }

    try {
        app.beginUndoGroup("Create Guide Grid");
        distributeGuides(0, distributeY.text); // Horizontal
        distributeGuides(1, distributeX.text); // Vertical
        statusBar.text = "Created guide grid: " + distributeX.text + "×" + distributeY.text;
        app.endUndoGroup();
    } catch (error) {
        statusBar.text = "Error creating grid: " + error.toString();
        app.endUndoGroup();
    }
};

// Clear button
btnClearAll.onClick = function() {
    clearGuides();
};

// Margin buttons
btnMargTop.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    createMargin(0);
};

btnMargLeft.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    createMargin(1);
};

btnMargBottom.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    createMargin(2);
};

btnMargRight.onClick = function() {
    if (chkAutoClear.value) clearGuides();
    createMargin(3);
};

btnMargAll.onClick = function() {
    var comp = getActiveComp();
    if (!comp) return;

    if (chkAutoClear.value) {
        clearGuides();
    }
    
    app.beginUndoGroup("Create All Margins");
    try {
        for (var i = 0; i < 4; i++) {
            createMargin(i);
        }
        statusBar.text = "Added guides to all sides";
    } catch (error) {
        statusBar.text = "Error: " + error.toString();
    }
    app.endUndoGroup();
};

// Initialize the grid preview
updateGridPreview();

mainWindow.show();

// --- UTILITY FUNCTIONS ---

// Check for active composition
function getActiveComp() {
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
        alert("Please select a composition.");
        statusBar.text = "Error: No composition selected";
        return null;
    }
    return comp;
}

// Calculate layer bounds considering transformations
function getTransformedLayerBounds(comp, layer) {
    // Store the current time for consistent calculations
    var time = comp.time;
    
    try {
        // Get basic properties
        var rect = layer.sourceRectAtTime(time, false);
        var width = rect.width;
        var height = rect.height;
        
        // Get transformation values at current time
        var position = layer.transform.position.valueAtTime(time, false);
        var anchorPoint = layer.transform.anchorPoint.valueAtTime(time, false);
        var scale = layer.transform.scale.valueAtTime(time, false);
        var rotation = layer.transform.rotation.valueAtTime(time, false) * (Math.PI/180); // Convert to radians

        // Calculate scaling
        var scaleX = scale[0] / 100;
        var scaleY = scale[1] / 100;
        
        // Apply scaling to dimensions
        var scaledWidth = width * scaleX;
        var scaledHeight = height * scaleY;
        
        // Calculate the offset from anchor point (also scaled)
        var anchorOffsetX = (anchorPoint[0] - rect.left) * scaleX;
        var anchorOffsetY = (anchorPoint[1] - rect.top) * scaleY;
        
        // Create points for the four corners (relative to anchor)
        var points = [
            [-anchorOffsetX, -anchorOffsetY],                       // Top-left
            [-anchorOffsetX + scaledWidth, -anchorOffsetY],         // Top-right
            [-anchorOffsetX + scaledWidth, -anchorOffsetY + scaledHeight], // Bottom-right
            [-anchorOffsetX, -anchorOffsetY + scaledHeight]         // Bottom-left
        ];
        
        // Apply rotation to each point
        var rotatedPoints = [];
        for (var i = 0; i < points.length; i++) {
            var x = points[i][0];
            var y = points[i][1];
            
            // Rotate point
            var rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
            var rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
            
            // Add position (accounting for parent transformations if any)
            var finalX = rotatedX + position[0];
            var finalY = rotatedY + position[1];
            
            // Add parent transformations if needed
            if (layer.parent) {
                var parentTransform = getParentTransform(layer, time);
                finalX = finalX * parentTransform.scaleX + parentTransform.x;
                finalY = finalY * parentTransform.scaleY + parentTransform.y;
            }
            
            rotatedPoints.push([finalX, finalY]);
        }
        
        // Find the min/max to create new bounds
        var minX = rotatedPoints[0][0];
        var minY = rotatedPoints[0][1];
        var maxX = rotatedPoints[0][0];
        var maxY = rotatedPoints[0][1];
        
        for (var j = 1; j < rotatedPoints.length; j++) {
            minX = Math.min(minX, rotatedPoints[j][0]);
            minY = Math.min(minY, rotatedPoints[j][1]);
            maxX = Math.max(maxX, rotatedPoints[j][0]);
            maxY = Math.max(maxY, rotatedPoints[j][1]);
        }
        
        // Return the transformed bounds
        return {
            left: minX,
            top: minY,
            right: maxX,
            bottom: maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    } catch (error) {
        // Fallback to basic position-based calculation
        statusBar.text = "Warning: Using simplified bounds calculation";
        var rect = layer.sourceRectAtTime(time, false);
        var pos = layer.transform.position.valueAtTime(time, false);
        var anchor = layer.transform.anchorPoint.valueAtTime(time, false);
        
        var left = pos[0] - anchor[0] + rect.left;
        var top = pos[1] - anchor[1] + rect.top;
        
        return {
            left: left,
            top: top,
            right: left + rect.width,
            bottom: top + rect.height,
            width: rect.width,
            height: rect.height,
            centerX: left + rect.width / 2,
            centerY: top + rect.height / 2
        };
    }
}

// Get parent transformation chain
function getParentTransform(layer, time) {
    var result = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    
    if (!layer.parent) return result;
    
    var currentLayer = layer.parent;
    
    while (currentLayer) {
        var pos = currentLayer.transform.position.valueAtTime(time, false);
        var scale = currentLayer.transform.scale.valueAtTime(time, false);
        
        // Accumulate transformations
        result.scaleX *= scale[0] / 100;
        result.scaleY *= scale[1] / 100;
        result.x += pos[0];
        result.y += pos[1];
        
        // Move up the parent chain
        currentLayer = currentLayer.parent;
    }
    
    return result;
}