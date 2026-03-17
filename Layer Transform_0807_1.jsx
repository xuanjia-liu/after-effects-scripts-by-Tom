(function () {
    // Configuration with consistent compact values
    var config = {
        panelName: "Transform Layers",
        spacing: 4,           // Compact spacing
        margins: 6,           // Compact margins
        sliderWidth: 100,     // Even more compact slider width
        inputWidth: 40,       // Input field width - CHANGED FROM 35 TO 40
        buttonWidth: 18,      // Button width - CHANGED FROM 24 TO 18
        navWidth: 70,         // Navigation width
        panelWidth: 300,      // More compact overall width
        randomizeRange: 50    // Default randomize range as percentage of max value
    };

    // Create and configure main window
    var window = new Window("palette", config.panelName, undefined, { resizeable: true });
    window.orientation = "column";
    window.alignChildren = "fill";
    window.spacing = config.spacing;
    window.margins = config.margins;
    window.preferredSize.width = config.panelWidth;

    // Global settings group - more compact
    var settingsGroup = window.add("group");
    settingsGroup.orientation = "row";
    settingsGroup.alignChildren = "center";
    settingsGroup.spacing = config.spacing;

    // Add to existing values checkbox
    var globalRelativeCheckbox = settingsGroup.add("checkbox", undefined, "Add to Existing");
    globalRelativeCheckbox.value = true;
    globalRelativeCheckbox.alignment = ["left", "center"];

    // Auto close checkbox
    var autoCloseCheckbox = settingsGroup.add("checkbox", undefined, "Auto Close");
    autoCloseCheckbox.value = false;
    autoCloseCheckbox.alignment = ["right", "center"];
    
    // === Main Tab Structure ===
    // Create top-level tabbed panel with just two tabs (Transform and Shape Groups)
    var mainTabbedPanel = window.add("tabbedpanel", undefined, undefined, {name: "mainTabbedPanel"});
    mainTabbedPanel.alignChildren = ["fill", "fill"];
    
    var transformTab = mainTabbedPanel.add("tab", undefined, "Transform");
    transformTab.alignChildren = ["fill", "fill"];
    transformTab.margins = config.margins;
    
    var shapeGroupsTab = mainTabbedPanel.add("tab", undefined, "Shape Groups");
    shapeGroupsTab.alignChildren = ["fill", "fill"];
    shapeGroupsTab.margins = config.margins;
    
    // Set the active tab
    mainTabbedPanel.selection = transformTab;

    // === Transform Tab Content ===
    // Create tabbed panel for transform controls
    var tabbedPanel = transformTab.add("group", undefined, undefined, { name: "tabbedPanel" });
    tabbedPanel.alignChildren = ["left", "fill"];
    tabbedPanel.spacing = config.spacing;

    // Navigation panel
    var tabbedPanelNav = tabbedPanel.add("listbox", undefined, ['Position', 'Rotation', 'Scale', 'Opacity']);
    tabbedPanelNav.preferredSize.width = config.navWidth;

    // Content panel
    var tabbedPanelInnerWrap = tabbedPanel.add("group");
    tabbedPanelInnerWrap.preferredSize.width = config.panelWidth - config.navWidth - (config.margins * 2) - config.spacing;
    tabbedPanelInnerWrap.alignment = ["fill", "fill"];
    tabbedPanelInnerWrap.orientation = ["stack"];

    /**
     * Creates a tab panel
     * @param {string} name - The name of the tab
     * @returns {Panel} - The created tab panel
     */
    function createTab(name) {
        var tab = tabbedPanelInnerWrap.add("group", undefined, { name: name });
        tab.text = name;
        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.spacing = config.spacing;
        tab.margins = 0;
        return tab;
    }

    // Create tabs
    var positionTab = createTab("Position");
    var rotationTab = createTab("Rotation");
    var scaleTab = createTab("Scale");
    var opacityTab = createTab("Opacity");

    /**
     * Creates a slider with input control group
     * @param {Panel} parent - The parent panel
     * @param {string} label - The label for the control
     * @param {number} defaultValue - The default value
     * @param {number} min - The minimum value
     * @param {number} max - The maximum value
     * @param {number} resetValue - The value to reset to
     * @param {Function} applyCallback - The callback when apply button is clicked
     * @param {Function} onChangeCallback - The callback when value changes
     * @param {Function} onChangingCallback - The callback when value is changing
     * @returns {Object} - The controls created
     */
    function createSliderInputGroup(parent, label, defaultValue, min, max, resetValue, applyCallback, onChangeCallback, onChangingCallback) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"]; // Changed from "fill" to "left"
        group.spacing = config.spacing;

        // Add label if provided
        if (label) {
            var labelSliderGroup = group.add("group");
            labelSliderGroup.orientation = "row";
            labelSliderGroup.alignChildren = ["left", "center"];
            labelSliderGroup.spacing = 0; // Remove gap between label and slider
            
            var staticLabel = labelSliderGroup.add("statictext", undefined, label + ":");
            staticLabel.preferredSize.width = 16;  // Reduced label width
            
            // Create slider in the same group as the label (no gap)
            var slider = labelSliderGroup.add("slider", undefined, defaultValue, min, max);
            slider.preferredSize.width = 80; // Reduced slider width
        } else {
            // If no label, just add the slider directly to the main group
            var slider = group.add("slider", undefined, defaultValue, min, max);
            slider.preferredSize.width = config.sliderWidth;
        }

        // Create input field
        var input = group.add("edittext", undefined, defaultValue.toString());
        input.characters = 3;  // Reduced characters
        input.preferredSize.width = config.inputWidth;
        input.alignment = ["left", "center"]; // Changed from "center" to "left"

        // Create button container with fixed width
        var buttonGroup = group.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["right", "center"]; // Align buttons to the right
        buttonGroup.spacing = 2; // Tighter spacing between buttons
        buttonGroup.preferredSize.width = config.buttonWidth * 3 + 4; // Fixed width for button container with extra button

        // Create randomize button
        var randomizeBtn = buttonGroup.add("button", undefined, "\u2685"); // DICE SYMBOL
        randomizeBtn.preferredSize.width = config.buttonWidth;
        randomizeBtn.preferredSize.height = config.buttonWidth;
        randomizeBtn.alignment = ["right", "center"];
        randomizeBtn.helpTip = "Randomize this value";
        
        // Create apply button
        var applyBtn = buttonGroup.add("button", undefined, "\u2713"); // CHECK MARK
        applyBtn.preferredSize.width = config.buttonWidth;
        applyBtn.preferredSize.height = config.buttonWidth;
        applyBtn.alignment = ["right", "center"]; // Change from "center" to "right"
        applyBtn.helpTip = "Apply this value";

        // Create reset button
        var resetBtn = buttonGroup.add("button", undefined, "\u21BA"); // CLOCKWISE OPEN CIRCLE ARROW
        resetBtn.preferredSize.width = config.buttonWidth;
        resetBtn.preferredSize.height = config.buttonWidth;
        resetBtn.alignment = ["right", "center"]; // Change from "center" to "right"
        resetBtn.helpTip = "Reset to " + resetValue;

        // Set up event handlers
        slider.onChange = function() {
            input.text = Math.round(this.value).toString();
            if(onChangeCallback) onChangeCallback();
        };
        
        slider.onChanging = function() {
            input.text = Math.round(this.value).toString();
            if(onChangingCallback) onChangingCallback();
        };
        
        input.onChanging = function() {
            var inputValue = parseFloat(this.text);
            if (!isNaN(inputValue)) {
                slider.value = inputValue;
            }
        };
        
        input.onValidate = function() {
            var value = parseFloat(this.text);
            if (isNaN(value)) {
                this.text = slider.value.toString();
            } else if (value < min) {
                this.text = min.toString();
                slider.value = min;
            } else if (value > max) {
                this.text = max.toString();
                slider.value = max;
            }
        };
        
        resetBtn.onClick = function() {
            input.text = resetValue.toString();
            slider.value = resetValue;
        };
        
        randomizeBtn.onClick = function() {
            var range = (max - min) * (config.randomizeRange / 100);
            var center = resetValue;
            var randomValue = Math.round(center + (Math.random() * 2 - 1) * range);
            
            // Ensure the random value is within min-max range
            randomValue = Math.max(min, Math.min(max, randomValue));
            
            input.text = randomValue.toString();
            slider.value = randomValue;
            if(onChangeCallback) onChangeCallback();
        };
        
        applyBtn.onClick = applyCallback;
        
        return { 
            group: group, 
            input: input, 
            slider: slider, 
            resetBtn: resetBtn, 
            randomizeBtn: randomizeBtn,
            applyBtn: applyBtn 
        };
    }

    /**
     * Creates action buttons for a tab
     * @param {Panel} parent - The parent panel
     * @param {Function} applyCallback - The callback when apply button is clicked
     * @param {Function} resetCallback - The callback when reset button is clicked
     * @returns {Object} - The buttons created
     */
    function createActionButtons(parent, applyCallback, resetCallback) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["fill", "center"];
        group.spacing = config.spacing;

        var applyBtn = group.add("button", undefined, "Apply All");
        applyBtn.preferredSize.width = 70;  // Consistent button width
        applyBtn.preferredSize.height = 22; // Consistent button height
        applyBtn.alignment = ["center", "center"];
        applyBtn.onClick = applyCallback;

        var resetBtn = group.add("button", undefined, "Reset All");
        resetBtn.preferredSize.width = 70;  // Consistent button width
        resetBtn.preferredSize.height = 22; // Consistent button height
        resetBtn.alignment = ["center", "center"];
        resetBtn.onClick = resetCallback;
        
        return { 
            apply: applyBtn, 
            reset: resetBtn 
        };
    }

    /**
     * Creates a section title with divider
     * @param {Panel} parent - The parent panel
     * @param {string} title - The title text
     * @returns {Group} - The group containing the title and divider
     */
    function createSectionTitle(parent, title) {
        var group = parent.add("group");
        group.orientation = "column";
        group.alignChildren = "fill";
        group.spacing = 2;
        
        var titleGroup = group.add("group");
        titleGroup.orientation = "row";
        titleGroup.alignChildren = "fill";
        titleGroup.add("statictext", undefined, title).preferredSize.width = 70; // Reduced title width
        
        group.add("panel", undefined, undefined, { borderStyle: "etchedin" }).preferredSize.height = 1; // Thinner divider
        
        return group;
    }

    // === Position Tab ===
    var xPositionControl = createSliderInputGroup(positionTab, "X", 0, -1000, 1000, 0,
        function() {
            applyPosition(parseFloat(xPositionControl.input.text), null, null, globalRelativeCheckbox.value, app.project.activeItem);
        }
    );
    
    var yPositionControl = createSliderInputGroup(positionTab, "Y", 0, -1000, 1000, 0,
        function() {
            applyPosition(null, parseFloat(yPositionControl.input.text), null, globalRelativeCheckbox.value, app.project.activeItem);
        }
    );
    
    var zPositionControl = createSliderInputGroup(positionTab, "Z", 0, -1000, 1000, 0,
        function() {
            applyPosition(null, null, parseFloat(zPositionControl.input.text), globalRelativeCheckbox.value, app.project.activeItem);
        }
    );

    var positionControlGroup = positionTab.add("group");
    positionControlGroup.orientation = "row";
    positionControlGroup.alignChildren = ["center", "center"]; // Changed from "fill" to "center"
    positionControlGroup.spacing = config.spacing;

    var addZeroBtn = positionControlGroup.add("button", undefined, "Add Zero");
    addZeroBtn.preferredSize.width = 80;  // Reduced button width
    addZeroBtn.preferredSize.height = 20; // Consistent utility button height
    addZeroBtn.alignment = ["left", "center"]; // Changed from "fill" to "left"
    addZeroBtn.helpTip = "Create a zero object parent for selected layers";

    var roundPositionBtn = positionControlGroup.add("button", undefined, "Round");
    roundPositionBtn.preferredSize.width = 80;  // Reduced button width
    roundPositionBtn.preferredSize.height = 20; // Consistent utility button height
    roundPositionBtn.alignment = ["left", "center"]; // Changed from "fill" to "left"
    roundPositionBtn.helpTip = "Round position values to integers";

    createActionButtons(positionTab,
        function() {
            var xPos = parseFloat(xPositionControl.input.text);
            var yPos = parseFloat(yPositionControl.input.text);
            var zPos = parseFloat(zPositionControl.input.text);
            applyPosition(xPos, yPos, zPos, globalRelativeCheckbox.value, app.project.activeItem);
        },
        function() {
            xPositionControl.input.text = "0"; xPositionControl.slider.value = 0;
            yPositionControl.input.text = "0"; yPositionControl.slider.value = 0;
            zPositionControl.input.text = "0"; zPositionControl.slider.value = 0;
            applyPosition(0, 0, 0, false, app.project.activeItem);
        }
    );

    // Add randomize position button
    var positionRandomizeBtn = positionTab.add("button", undefined, "Randomize Position");
    positionRandomizeBtn.onClick = function() {
        var xRange = 200; // Pixels
        var yRange = 200; // Pixels
        var zRange = 100; // Pixels
        
        xPositionControl.input.text = Math.round((Math.random() * 2 - 1) * xRange).toString();
        xPositionControl.slider.value = parseFloat(xPositionControl.input.text);
        
        yPositionControl.input.text = Math.round((Math.random() * 2 - 1) * yRange).toString();
        yPositionControl.slider.value = parseFloat(yPositionControl.input.text);
        
        zPositionControl.input.text = Math.round((Math.random() * 2 - 1) * zRange).toString();
        zPositionControl.slider.value = parseFloat(zPositionControl.input.text);
        
        var xPos = parseFloat(xPositionControl.input.text);
        var yPos = parseFloat(yPositionControl.input.text);
        var zPos = parseFloat(zPositionControl.input.text);
        applyPosition(xPos, yPos, zPos, globalRelativeCheckbox.value, app.project.activeItem);
    };
    positionRandomizeBtn.preferredSize.width = 120;
    positionRandomizeBtn.preferredSize.height = 20;
    positionRandomizeBtn.alignment = ["center", "center"];

    // === Rotation Tab ===
    var rotation2DGroup = createSectionTitle(rotationTab, "2D Rotation");
    
    var rotation2DControl = createSliderInputGroup(rotation2DGroup, "", 0, -180, 180, 0,
        function() {
            apply2DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation2DControl.slider.value);
        }
    );

    var rotation3DGroup = createSectionTitle(rotationTab, "3D Rotation");
    
    var rotation3DXControl = createSliderInputGroup(rotation3DGroup, "X", 0, -180, 180, 0,
        function() {
            apply3DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation3DXControl.slider.value, null, null);
        }
    );
    
    var rotation3DYControl = createSliderInputGroup(rotation3DGroup, "Y", 0, -180, 180, 0,
        function() {
            apply3DRotation(app.project.activeItem, globalRelativeCheckbox.value, null, rotation3DYControl.slider.value, null);
        }
    );
    
    var rotation3DZControl = createSliderInputGroup(rotation3DGroup, "Z", 0, -180, 180, 0,
        function() {
            apply3DRotation(app.project.activeItem, globalRelativeCheckbox.value, null, null, rotation3DZControl.slider.value);
        }
    );

    createActionButtons(rotationTab,
        function() {
            apply2DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation2DControl.slider.value);
            apply3DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation3DXControl.slider.value, rotation3DYControl.slider.value, rotation3DZControl.slider.value);
        },
        function() {
            rotation2DControl.input.text = "0"; rotation2DControl.slider.value = 0;
            rotation3DXControl.input.text = "0"; rotation3DXControl.slider.value = 0;
            rotation3DYControl.input.text = "0"; rotation3DYControl.slider.value = 0;
            rotation3DZControl.input.text = "0"; rotation3DZControl.slider.value = 0;
            apply2DRotation(app.project.activeItem, false, 0);
            apply3DRotation(app.project.activeItem, false, 0, 0, 0);
        }
    );

    // Add randomize rotation button
    var rotationRandomizeBtn = rotationTab.add("button", undefined, "Randomize Rotation");
    rotationRandomizeBtn.onClick = function() {
        var rotation2DRange = 180; // Degrees
        var rotation3DRange = 180; // Degrees
        
        rotation2DControl.input.text = Math.round((Math.random() * 2 - 1) * rotation2DRange).toString();
        rotation2DControl.slider.value = parseFloat(rotation2DControl.input.text);
        
        rotation3DXControl.input.text = Math.round((Math.random() * 2 - 1) * rotation3DRange).toString();
        rotation3DXControl.slider.value = parseFloat(rotation3DXControl.input.text);
        
        rotation3DYControl.input.text = Math.round((Math.random() * 2 - 1) * rotation3DRange).toString();
        rotation3DYControl.slider.value = parseFloat(rotation3DYControl.input.text);
        
        rotation3DZControl.input.text = Math.round((Math.random() * 2 - 1) * rotation3DRange).toString();
        rotation3DZControl.slider.value = parseFloat(rotation3DZControl.input.text);
        
        apply2DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation2DControl.slider.value);
        apply3DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation3DXControl.slider.value, rotation3DYControl.slider.value, rotation3DZControl.slider.value);
    };
    rotationRandomizeBtn.preferredSize.width = 120;
    rotationRandomizeBtn.preferredSize.height = 20;
    rotationRandomizeBtn.alignment = ["center", "center"];

    // === Scale Tab ===
    var xScaleControl = createSliderInputGroup(scaleTab, "X", 100, 0, 200, 100,
        function() {
            applyScale(parseFloat(xScaleControl.input.text) / 100, null, globalRelativeCheckbox.value, app.project.activeItem, linkScaleCheckbox.value);
        }
    );
    
    var yScaleControl = createSliderInputGroup(scaleTab, "Y", 100, 0, 200, 100,
        function() {
            applyScale(null, parseFloat(yScaleControl.input.text) / 100, globalRelativeCheckbox.value, app.project.activeItem, linkScaleCheckbox.value);
        }
    );
    
    var linkScaleCheckbox = scaleTab.add("checkbox", undefined, "Link X/Y");
    linkScaleCheckbox.value = true;
    linkScaleCheckbox.alignment = ["left", "center"];
    linkScaleCheckbox.helpTip = "Keep X and Y scale proportional";
    
    // Update Y scale controls based on link checkbox
    yScaleControl.group.enabled = !linkScaleCheckbox.value;
    linkScaleCheckbox.onClick = function() {
        yScaleControl.group.enabled = !this.value;
        if (this.value) {
            // Sync Y to X when linking is enabled
            yScaleControl.input.text = xScaleControl.input.text;
            yScaleControl.slider.value = xScaleControl.slider.value;
        }
    };

    // Add event to keep X and Y in sync when linked
    xScaleControl.slider.onChange = function() {
        xScaleControl.input.text = Math.round(this.value).toString();
        if (linkScaleCheckbox.value) {
            yScaleControl.input.text = xScaleControl.input.text;
            yScaleControl.slider.value = xScaleControl.slider.value;
        }
    };

    createActionButtons(scaleTab,
        function() {
            var xScale = parseFloat(xScaleControl.input.text) / 100;
            var yScale = parseFloat(yScaleControl.input.text) / 100;
            applyScale(xScale, yScale, globalRelativeCheckbox.value, app.project.activeItem, linkScaleCheckbox.value);
        },
        function() {
            xScaleControl.input.text = "100";
            xScaleControl.slider.value = 100;
            yScaleControl.input.text = "100";
            yScaleControl.slider.value = 100;
            applyScale(1, 1, false, app.project.activeItem, linkScaleCheckbox.value);
        }
    );

    // Add randomize scale button
    var scaleRandomizeBtn = scaleTab.add("button", undefined, "Randomize Scale");
    scaleRandomizeBtn.onClick = function() {
        var scaleRange = 100; // Percentage (50-150%)
        var baseScale = 100; // 100%
        
        var randomScale = Math.round(baseScale + (Math.random() * 2 - 1) * scaleRange);
        // Ensure scale is at least 10%
        randomScale = Math.max(10, randomScale);
        
        xScaleControl.input.text = randomScale.toString();
        xScaleControl.slider.value = randomScale;
        
        if (linkScaleCheckbox.value) {
            yScaleControl.input.text = xScaleControl.input.text;
            yScaleControl.slider.value = xScaleControl.slider.value;
        } else {
            var randomYScale = Math.round(baseScale + (Math.random() * 2 - 1) * scaleRange);
            randomYScale = Math.max(10, randomYScale);
            
            yScaleControl.input.text = randomYScale.toString();
            yScaleControl.slider.value = randomYScale;
        }
        
        var xScale = parseFloat(xScaleControl.input.text) / 100;
        var yScale = parseFloat(yScaleControl.input.text) / 100;
        applyScale(xScale, yScale, globalRelativeCheckbox.value, app.project.activeItem, linkScaleCheckbox.value);
    };
    scaleRandomizeBtn.preferredSize.width = 120;
    scaleRandomizeBtn.preferredSize.height = 20;
    scaleRandomizeBtn.alignment = ["center", "center"];

    // === Opacity Tab ===
    var opacityControl = createSliderInputGroup(opacityTab, "Opacity", 100, 0, 100, 100,
        function() {
            applyOpacity(parseFloat(opacityControl.input.text) / 100, app.project.activeItem);
        }
    );

    createActionButtons(opacityTab,
        function() {
            applyOpacity(parseFloat(opacityControl.input.text) / 100, app.project.activeItem);
        },
        function() {
            opacityControl.input.text = "100";
            opacityControl.slider.value = 100;
            applyOpacity(1, app.project.activeItem);
        }
    );

    // Add randomize opacity button
    var opacityRandomizeBtn = opacityTab.add("button", undefined, "Randomize Opacity");
    opacityRandomizeBtn.onClick = function() {
        var randomOpacity = Math.round(Math.random() * 100);
        
        opacityControl.input.text = randomOpacity.toString();
        opacityControl.slider.value = randomOpacity;
        
        applyOpacity(parseFloat(opacityControl.input.text) / 100, app.project.activeItem);
    };
    opacityRandomizeBtn.preferredSize.width = 120;
    opacityRandomizeBtn.preferredSize.height = 20;
    opacityRandomizeBtn.alignment = ["center", "center"];

    // Add reset all button to transform tab - more compact
    var resetAllButton = transformTab.add("button", undefined, "Reset All Transform");
    resetAllButton.onClick = function() {
        resetAllTransform(app.project.activeItem);
    };
    resetAllButton.preferredSize.width = 120; // Added fixed width
    resetAllButton.preferredSize.height = 20; // More compact height
    resetAllButton.alignment = ["center", "center"]; // Added center alignment
    resetAllButton.helpTip = "Reset position, rotation, scale and opacity to default values";
    
    // Add randomize all button to transform tab
    var randomizeAllButton = transformTab.add("button", undefined, "Randomize All Transform");
    randomizeAllButton.onClick = function() {
        // Randomize position
        var xRange = 200; // Pixels
        var yRange = 200; // Pixels
        var zRange = 100; // Pixels
        
        xPositionControl.input.text = Math.round((Math.random() * 2 - 1) * xRange).toString();
        xPositionControl.slider.value = parseFloat(xPositionControl.input.text);
        
        yPositionControl.input.text = Math.round((Math.random() * 2 - 1) * yRange).toString();
        yPositionControl.slider.value = parseFloat(yPositionControl.input.text);
        
        zPositionControl.input.text = Math.round((Math.random() * 2 - 1) * zRange).toString();
        zPositionControl.slider.value = parseFloat(zPositionControl.input.text);
        
        // Randomize rotation
        var rotation2DRange = 180; // Degrees
        var rotation3DRange = 180; // Degrees
        
        rotation2DControl.input.text = Math.round((Math.random() * 2 - 1) * rotation2DRange).toString();
        rotation2DControl.slider.value = parseFloat(rotation2DControl.input.text);
        
        rotation3DXControl.input.text = Math.round((Math.random() * 2 - 1) * rotation3DRange).toString();
        rotation3DXControl.slider.value = parseFloat(rotation3DXControl.input.text);
        
        rotation3DYControl.input.text = Math.round((Math.random() * 2 - 1) * rotation3DRange).toString();
        rotation3DYControl.slider.value = parseFloat(rotation3DYControl.input.text);
        
        rotation3DZControl.input.text = Math.round((Math.random() * 2 - 1) * rotation3DRange).toString();
        rotation3DZControl.slider.value = parseFloat(rotation3DZControl.input.text);
        
        // Randomize scale
        var scaleRange = 100; // Percentage (50-150%)
        var baseScale = 100; // 100%
        
        var randomScale = Math.round(baseScale + (Math.random() * 2 - 1) * scaleRange);
        // Ensure scale is at least 10%
        randomScale = Math.max(10, randomScale);
        
        xScaleControl.input.text = randomScale.toString();
        xScaleControl.slider.value = randomScale;
        
        if (linkScaleCheckbox.value) {
            yScaleControl.input.text = xScaleControl.input.text;
            yScaleControl.slider.value = xScaleControl.slider.value;
        } else {
            var randomYScale = Math.round(baseScale + (Math.random() * 2 - 1) * scaleRange);
            randomYScale = Math.max(10, randomYScale);
            
            yScaleControl.input.text = randomYScale.toString();
            yScaleControl.slider.value = randomYScale;
        }
        
        // Randomize opacity
        var randomOpacity = Math.round(Math.random() * 100);
        
        opacityControl.input.text = randomOpacity.toString();
        opacityControl.slider.value = randomOpacity;
        
        // Apply all transformations
        app.beginUndoGroup("Randomize All Transform");
        
        var xPos = parseFloat(xPositionControl.input.text);
        var yPos = parseFloat(yPositionControl.input.text);
        var zPos = parseFloat(zPositionControl.input.text);
        applyPosition(xPos, yPos, zPos, globalRelativeCheckbox.value, app.project.activeItem);
        
        apply2DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation2DControl.slider.value);
        apply3DRotation(app.project.activeItem, globalRelativeCheckbox.value, rotation3DXControl.slider.value, rotation3DYControl.slider.value, rotation3DZControl.slider.value);
        
        var xScale = parseFloat(xScaleControl.input.text) / 100;
        var yScale = parseFloat(yScaleControl.input.text) / 100;
        applyScale(xScale, yScale, globalRelativeCheckbox.value, app.project.activeItem, linkScaleCheckbox.value);
        
        applyOpacity(parseFloat(opacityControl.input.text) / 100, app.project.activeItem);
        
        app.endUndoGroup();
    };
    randomizeAllButton.preferredSize.width = 120; // Added fixed width
    randomizeAllButton.preferredSize.height = 20; // More compact height
    randomizeAllButton.alignment = ["center", "center"]; // Added center alignment
    randomizeAllButton.helpTip = "Apply random values to position, rotation, scale and opacity";
    
    // === Shape Groups Tab Content ===
    // More compact layout
    var shapeGroupsTopPanel = shapeGroupsTab.add("group");
    shapeGroupsTopPanel.orientation = "column"; // Changed from "row" to "column"
    shapeGroupsTopPanel.alignChildren = ["fill", "top"];
    shapeGroupsTopPanel.spacing = config.spacing;
    
    // Shape group selection dropdown - now full width
    var shapeGroupDropdownGroup = shapeGroupsTopPanel.add("group");
    shapeGroupDropdownGroup.orientation = "row";
    shapeGroupDropdownGroup.alignChildren = ["fill", "center"];
    shapeGroupDropdownGroup.spacing = config.spacing;
    
    // Add group dropdown with label
    var dropdownRow = shapeGroupDropdownGroup; // Now using the group directly
    
    dropdownRow.add("statictext", undefined, "Group:").preferredSize.width = 32;
    var shapeGroupDropdown = dropdownRow.add("dropdownlist");
    shapeGroupDropdown.alignment = ["fill", "center"];
    shapeGroupDropdown.add("item", "No shape layer selected");
    shapeGroupDropdown.selection = 0;
    
    var refreshShapeGroupsBtn = dropdownRow.add("button", undefined, "↻");
    refreshShapeGroupsBtn.preferredSize.width = 18; // Changed from 24 to 18
    refreshShapeGroupsBtn.preferredSize.height = 18; // Changed from 24 to 18
    refreshShapeGroupsBtn.helpTip = "Refresh shape groups list";
    
    // Coordinate system radio buttons - now below dropdown
    var coordSystemGroup = shapeGroupsTopPanel.add("panel", undefined, "Coordinate System");
    coordSystemGroup.orientation = "row";
    coordSystemGroup.alignChildren = ["left", "center"];
    coordSystemGroup.spacing = config.spacing;
    coordSystemGroup.margins = 4; // Reduced margins
    
    // Add coordinate system radio buttons
    var localRadio = coordSystemGroup.add("radiobutton", undefined, "Local");
    var layerRadio = coordSystemGroup.add("radiobutton", undefined, "Layer");
    var worldRadio = coordSystemGroup.add("radiobutton", undefined, "World");
    
    localRadio.value = true; // Default to local coordinates
    
    localRadio.helpTip = "Apply transforms in shape group's local space";
    layerRadio.helpTip = "Apply transforms relative to layer's orientation";
    worldRadio.helpTip = "Apply transforms in composition space";
    
    // Create a horizontal layout for shape transform controls
    var shapeControlsGroup = shapeGroupsTab.add("group");
    shapeControlsGroup.orientation = "row";
    shapeControlsGroup.alignChildren = ["left", "fill"];
    shapeControlsGroup.spacing = config.spacing;
    
    // Navigation panel for shape controls
    var shapeTabsNav = shapeControlsGroup.add("listbox", undefined, ['Position', 'Scale', 'Rotation']);
    shapeTabsNav.preferredSize.width = config.navWidth;
    
    // Content panel for shape controls
    var shapeTabsInnerWrap = shapeControlsGroup.add("group");
    shapeTabsInnerWrap.preferredSize.width = config.panelWidth - config.navWidth - (config.margins * 2) - config.spacing;
    shapeTabsInnerWrap.alignment = ["fill", "fill"];
    shapeTabsInnerWrap.orientation = ["stack"];
    
    // Create shape tabs
    var shapePositionTab = shapeTabsInnerWrap.add("group");
    shapePositionTab.orientation = "column";
    shapePositionTab.alignChildren = ["fill", "top"];
    shapePositionTab.spacing = config.spacing;
    
    var shapeScaleTab = shapeTabsInnerWrap.add("group");
    shapeScaleTab.orientation = "column";
    shapeScaleTab.alignChildren = ["fill", "top"];
    shapeScaleTab.spacing = config.spacing;
    
    var shapeRotationTab = shapeTabsInnerWrap.add("group");
    shapeRotationTab.orientation = "column";
    shapeRotationTab.alignChildren = ["fill", "top"];
    shapeRotationTab.spacing = config.spacing;
    
    // Position controls
    shapePositionTab.add("statictext", undefined, "Position").alignment = ["center", "top"];
    
    var shapeXPositionControl = createSliderInputGroup(shapePositionTab, "X", 0, -1000, 1000, 0,
        function() {
            applyShapeGroupTransform("position", 0, parseFloat(shapeXPositionControl.input.text), globalRelativeCheckbox.value);
        }
    );
    
    var shapeYPositionControl = createSliderInputGroup(shapePositionTab, "Y", 0, -1000, 1000, 0,
        function() {
            applyShapeGroupTransform("position", 1, parseFloat(shapeYPositionControl.input.text), globalRelativeCheckbox.value);
        }
    );
    
    // Scale controls
    shapeScaleTab.add("statictext", undefined, "Scale").alignment = ["center", "top"];
    
    var shapeXScaleControl = createSliderInputGroup(shapeScaleTab, "X", 100, 0, 200, 100,
        function() {
            applyShapeGroupTransform("scale", 0, parseFloat(shapeXScaleControl.input.text) / 100, globalRelativeCheckbox.value);
        }
    );
    
    var shapeYScaleControl = createSliderInputGroup(shapeScaleTab, "Y", 100, 0, 200, 100,
        function() {
            applyShapeGroupTransform("scale", 1, parseFloat(shapeYScaleControl.input.text) / 100, globalRelativeCheckbox.value);
        }
    );
    
    var shapeScaleLinkCheckbox = shapeScaleTab.add("checkbox", undefined, "Link X/Y");
    shapeScaleLinkCheckbox.value = true;
    shapeScaleLinkCheckbox.alignment = ["left", "center"];
    shapeScaleLinkCheckbox.helpTip = "Keep X and Y scale proportional";
    
    // Update shape Y scale controls based on link checkbox
    shapeYScaleControl.group.enabled = !shapeScaleLinkCheckbox.value;
    shapeScaleLinkCheckbox.onClick = function() {
        shapeYScaleControl.group.enabled = !this.value;
        if (this.value) {
            // Sync Y to X when linking is enabled
            shapeYScaleControl.input.text = shapeXScaleControl.input.text;
            shapeYScaleControl.slider.value = shapeXScaleControl.slider.value;
        }
    };
    
    // Add event to keep shape X and Y in sync when linked
    shapeXScaleControl.slider.onChange = function() {
        shapeXScaleControl.input.text = Math.round(this.value).toString();
        if (shapeScaleLinkCheckbox.value) {
            shapeYScaleControl.input.text = shapeXScaleControl.input.text;
            shapeYScaleControl.slider.value = shapeXScaleControl.slider.value;
        }
    };
    
    // Rotation control
    shapeRotationTab.add("statictext", undefined, "Rotation").alignment = ["center", "top"];
    
    var shapeRotationControl = createSliderInputGroup(shapeRotationTab, "", 0, -180, 180, 0,
        function() {
            applyShapeGroupTransform("rotation", null, parseFloat(shapeRotationControl.input.text), globalRelativeCheckbox.value);
        }
    );
    
    // Add tab panel logic
    var shapeTabs = [shapePositionTab, shapeScaleTab, shapeRotationTab];
    for (var i = 0; i < shapeTabs.length; i++) {
        shapeTabs[i].alignment = ["fill", "fill"];
        shapeTabs[i].visible = false;
    }
    
    shapeTabsNav.onChange = function() {
        if (shapeTabsNav.selection !== null) {
            for (var i = 0; i < shapeTabs.length; i++) {
                shapeTabs[i].visible = false;
            }
            shapeTabs[shapeTabsNav.selection.index].visible = true;
        }
    };
    
    // Initialize the first tab
    shapeTabsNav.selection = 0;
    shapeTabs[0].visible = true;
    
    // Add action buttons for shape controls
    var shapeActionGroup = shapeGroupsTab.add("group");
    shapeActionGroup.orientation = "row";
    shapeActionGroup.alignChildren = ["center", "center"];
    shapeActionGroup.spacing = config.spacing;
    
    var applyShapeBtn = shapeActionGroup.add("button", undefined, "Apply All");
    applyShapeBtn.preferredSize.width = 70;  // Match with Transform tab buttons
    applyShapeBtn.preferredSize.height = 22; // Match with Transform tab buttons
    applyShapeBtn.onClick = function() {
        // Apply all shape transforms
        var xPos = parseFloat(shapeXPositionControl.input.text);
        var yPos = parseFloat(shapeYPositionControl.input.text);
        var xScale = parseFloat(shapeXScaleControl.input.text) / 100;
        var yScale = parseFloat(shapeYScaleControl.input.text) / 100;
        var rotation = parseFloat(shapeRotationControl.input.text);
        
        // Check which tab is active
        if (shapeTabsNav.selection.index === 0) { // Position tab
            applyShapeGroupTransform("position", null, [xPos, yPos], globalRelativeCheckbox.value);
        } else if (shapeTabsNav.selection.index === 1) { // Scale tab
            applyShapeGroupTransform("scale", null, [xScale, yScale], globalRelativeCheckbox.value);
        } else if (shapeTabsNav.selection.index === 2) { // Rotation tab
            applyShapeGroupTransform("rotation", null, rotation, globalRelativeCheckbox.value);
        }
    };
    
    var resetShapeBtn = shapeActionGroup.add("button", undefined, "Reset All");
    resetShapeBtn.preferredSize.width = 70;  // Match with Transform tab buttons
    resetShapeBtn.preferredSize.height = 22; // Match with Transform tab buttons
    resetShapeBtn.onClick = function() {
        // Reset controls based on active tab
        if (shapeTabsNav.selection.index === 0) { // Position tab
            shapeXPositionControl.input.text = "0"; shapeXPositionControl.slider.value = 0;
            shapeYPositionControl.input.text = "0"; shapeYPositionControl.slider.value = 0;
            applyShapeGroupTransform("position", null, [0, 0], false);
        } else if (shapeTabsNav.selection.index === 1) { // Scale tab
            shapeXScaleControl.input.text = "100"; shapeXScaleControl.slider.value = 100;
            shapeYScaleControl.input.text = "100"; shapeYScaleControl.slider.value = 100;
            applyShapeGroupTransform("scale", null, [1, 1], false);
        } else if (shapeTabsNav.selection.index === 2) { // Rotation tab
            shapeRotationControl.input.text = "0"; shapeRotationControl.slider.value = 0;
            applyShapeGroupTransform("rotation", null, 0, false);
        }
    };
    
    // Add randomize button for shape tabs
    var shapeRandomizeBtn = shapeActionGroup.add("button", undefined, "Randomize");
    shapeRandomizeBtn.preferredSize.width = 70;  // Match with other buttons
    shapeRandomizeBtn.preferredSize.height = 22; // Match with other buttons
    shapeRandomizeBtn.onClick = function() {
        // Randomize controls based on active tab
        if (shapeTabsNav.selection.index === 0) { // Position tab
            var posRange = 200; // Pixels
            
            shapeXPositionControl.input.text = Math.round((Math.random() * 2 - 1) * posRange).toString();
            shapeXPositionControl.slider.value = parseFloat(shapeXPositionControl.input.text);
            
            shapeYPositionControl.input.text = Math.round((Math.random() * 2 - 1) * posRange).toString();
            shapeYPositionControl.slider.value = parseFloat(shapeYPositionControl.input.text);
            
            applyShapeGroupTransform("position", null, [
                parseFloat(shapeXPositionControl.input.text),
                parseFloat(shapeYPositionControl.input.text)
            ], globalRelativeCheckbox.value);
            
        } else if (shapeTabsNav.selection.index === 1) { // Scale tab
            var scaleRange = 100; // Percentage (50-150%)
            var baseScale = 100; // 100%
            
            var randomScale = Math.round(baseScale + (Math.random() * 2 - 1) * scaleRange);
            // Ensure scale is at least 10%
            randomScale = Math.max(10, randomScale);
            
            shapeXScaleControl.input.text = randomScale.toString();
            shapeXScaleControl.slider.value = randomScale;
            
            if (shapeScaleLinkCheckbox.value) {
                shapeYScaleControl.input.text = shapeXScaleControl.input.text;
                shapeYScaleControl.slider.value = shapeXScaleControl.slider.value;
            } else {
                var randomYScale = Math.round(baseScale + (Math.random() * 2 - 1) * scaleRange);
                randomYScale = Math.max(10, randomYScale);
                
                shapeYScaleControl.input.text = randomYScale.toString();
                shapeYScaleControl.slider.value = randomYScale;
            }
            
            applyShapeGroupTransform("scale", null, [
                parseFloat(shapeXScaleControl.input.text) / 100,
                parseFloat(shapeYScaleControl.input.text) / 100
            ], globalRelativeCheckbox.value);
            
        } else if (shapeTabsNav.selection.index === 2) { // Rotation tab
            var rotationRange = 180; // Degrees
            
            shapeRotationControl.input.text = Math.round((Math.random() * 2 - 1) * rotationRange).toString();
            shapeRotationControl.slider.value = parseFloat(shapeRotationControl.input.text);
            
            applyShapeGroupTransform("rotation", null, parseFloat(shapeRotationControl.input.text), globalRelativeCheckbox.value);
        }
    };
    
    // === Tabbed Panel Logic for Transform Tab ===
    var tabbedPanelTabs = [positionTab, rotationTab, scaleTab, opacityTab];
    for (var i = 0; i < tabbedPanelTabs.length; i++) {
        tabbedPanelTabs[i].alignment = ["fill", "fill"];
        tabbedPanelTabs[i].visible = false;
    }
    
    tabbedPanelNav.onChange = showTab;

    function showTab() {
        if (tabbedPanelNav.selection !== null) {
            for (var i = 0; i < tabbedPanelTabs.length; i++) {
                tabbedPanelTabs[i].visible = false;
            }
            tabbedPanelTabs[tabbedPanelNav.selection.index].visible = true;
        }
    }
    
    // Initialize the first tab
    tabbedPanelNav.selection = 0;
    showTab();
    
    // Add event listener for the main tab change
    mainTabbedPanel.onChange = function() {
        // Update shape groups when switching to Shape Groups tab
        if (mainTabbedPanel.selection === shapeGroupsTab) {
            updateShapeGroupDropdown();
        }
    };

    /**
     * Adds a zero position object as parent to a layer
     * @param {CompItem} comp - The composition
     * @param {Layer} layer - The layer to add a zero position parent to
     */
    function addZeroPositionToLayer(comp, layer) {
        try {
            var positionValue = layer.transform.position.value;
            var zeroLayer = comp.layers.addShape();
            zeroLayer.name = "z_" + layer.name;
            zeroLayer.transform.position.setValue(positionValue);
            zeroLayer.moveToEnd();
            zeroLayer.enabled = false;
            zeroLayer.guideLayer = true;
            zeroLayer.label = 0;
            zeroLayer.shy = true;
            zeroLayer.threeDLayer = layer.threeDLayer;
            zeroLayer.locked = true;
            layer.parent = zeroLayer;
        } catch (err) {
            alert("Error adding zero position to layer: " + err.toString());
        }
    }

    /**
     * Adds zero position objects to multiple layers
     * @param {CompItem} comp - The composition
     * @param {Array} selectedIndices - Array of layer indices
     */
    function addZeroPositionToLayers(comp, selectedIndices) {
        app.beginUndoGroup("Add Zero Position");
        try {
            var numIndices = selectedIndices.length;
            for (var i = 0; i < numIndices; i++) {
                var index = selectedIndices[i];
                var layer = comp.layer(index);
                addZeroPositionToLayer(comp, layer);
            }
            comp.hideShyLayers = true;
        } catch (err) {
            alert("Error adding zero position to layers: " + err.toString());
        }
        app.endUndoGroup();
    }

    /**
     * Saves selected layer indices and adds zero position objects
     * @param {CompItem} comp - The composition
     */
    function saveSelectedLayerIndices(comp) {
        try {
            var selectedIndices = [];
            var layers = comp.selectedLayers;
            var numLayers = layers.length;
            
            if (numLayers === 0) {
                alert("Please select at least one layer.");
                return;
            }
            
            for (var l = 0; l < numLayers; l++) {
                var layer = layers[l];
                selectedIndices.push(layer.index);
                layer.selected = false;
            }
            addZeroPositionToLayers(comp, selectedIndices);
        } catch (err) {
            alert("Error saving selected layer indices: " + err.toString());
        }
    }

    /**
     * Rounds position values of selected layers to integers
     */
    function roundProps() {
        try {
            var proj = app.project;
            var thisComp = proj.activeItem;
            var selLayers = thisComp.selectedLayers;
            
            if (selLayers.length === 0) {
                alert("Please select at least one layer.");
                return;
            }
            
            for (var currentLayer = 0; currentLayer < selLayers.length; currentLayer++) {
                var activeLayer = selLayers[currentLayer];
                var roundedValue = [];
                var layerPos = activeLayer.transform.position;
                
                for (var index = 0; index < layerPos.value.length; index++) {
                    var changedValue = Math.round(layerPos.value[index]);
                    roundedValue.push(changedValue);
                }
                
                layerPos.setValue(roundedValue);
                if (layerPos.expressionEnabled) {
                    layerPos.expressionEnabled = false;
                }
            }
        } catch (err) {
            alert("Error rounding position values: " + err.toString());
        }
    }

    // Button event handlers
    addZeroBtn.onClick = function() {
        var comp = app.project.activeItem;
        if (comp !== null && (comp instanceof CompItem)) {
            saveSelectedLayerIndices(comp);
        } else {
            alert("Please select a composition.");
        }
    };
    
    roundPositionBtn.onClick = function() {
        var comp = app.project.activeItem;
        if (comp !== null && (comp instanceof CompItem)) {
            app.beginUndoGroup("Round Position");
            roundProps();
            app.endUndoGroup();
        } else {
            alert("Please select a composition.");
        }
    };

    /**
     * Applies position transform to selected layers
     * @param {number} xPos - X position value
     * @param {number} yPos - Y position value
     * @param {number} zPos - Z position value
     * @param {boolean} relative - Whether to apply values relative to current values
     * @param {CompItem} myComp - The composition
     */
    function applyPosition(xPos, yPos, zPos, relative, myComp) {
        if (!(myComp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        if (myComp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup("Apply Layer Position");
        try {
            for (var h = 0; h < myComp.selectedLayers.length; h++) {
                var myLayer = myComp.selectedLayers[h];
                var moveVector = [xPos, yPos, zPos];
                var compCenter = [myComp.width / 2, myComp.height / 2, 0];
                
                if (xPos === null) { moveVector[0] = 0; }
                else if (!relative) moveVector[0] = compCenter[0] + xPos;
                
                if (yPos === null) { moveVector[1] = 0; }
                else if (!relative) moveVector[1] = compCenter[1] + yPos;
                
                if (zPos === null) { moveVector[2] = 0; }
                else if (!relative) moveVector[2] = compCenter[2] + zPos;
                
                if (myLayer.transform.position) {
                    if (relative) {
                        if (myLayer.transform.position.numKeys > 0) {
                            for (var i = 1; i <= myLayer.transform.position.numKeys; i++) {
                                myLayer.transform.position.setValueAtTime(
                                    myLayer.transform.position.keyTime(i), 
                                    sumArrays(myLayer.transform.position.keyValue(i), moveVector)
                                );
                            }
                        } else {
                            myLayer.transform.position.setValue(sumArrays(myLayer.transform.position.value, moveVector));
                        }
                    } else {
                        if (myLayer.transform.position.numKeys > 0) {
                            for (var i = 1; i <= myLayer.transform.position.numKeys; i++) {
                                var targetValue = [
                                    myLayer.transform.position.keyValue(i)[0], 
                                    myLayer.transform.position.keyValue(i)[1], 
                                    myLayer.transform.position.keyValue(i)[2]
                                ];
                                
                                if (xPos !== null) targetValue[0] = moveVector[0];
                                if (yPos !== null) targetValue[1] = moveVector[1];
                                if (zPos !== null) targetValue[2] = moveVector[2];
                                
                                myLayer.transform.position.setValueAtTime(
                                    myLayer.transform.position.keyTime(i), 
                                    targetValue
                                );
                            }
                        } else {
                            var targetValue = [
                                myLayer.transform.position.value[0], 
                                myLayer.transform.position.value[1], 
                                myLayer.transform.position.value[2]
                            ];
                            
                            if (xPos !== null) targetValue[0] = moveVector[0];
                            if (yPos !== null) targetValue[1] = moveVector[1];
                            if (zPos !== null) targetValue[2] = moveVector[2];
                            
                            myLayer.transform.position.setValue(targetValue);
                        }
                    }
                }
            }
        } catch (err) {
            alert("Error applying position: " + err.toString());
        }
        app.endUndoGroup();
        
        checkAutoClose();
    }

    /**
     * Applies 2D rotation to selected layers
     * @param {CompItem} myComp - The composition
     * @param {boolean} relative - Whether to apply values relative to current values
     * @param {number} rotationValue - Rotation value in degrees
     */
    function apply2DRotation(myComp, relative, rotationValue) {
        if (!(myComp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        if (myComp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup("Apply Layer 2D Rotation");
        try {
            for (var i = 0; i < myComp.selectedLayers.length; i++) {
                var layer = myComp.selectedLayers[i];
                if (layer.transform && layer.transform.rotation) {
                    if (relative) {
                        if (layer.transform.rotation.numKeys > 0) {
                            for (var j = 1; j <= layer.transform.rotation.numKeys; j++) {
                                layer.transform.rotation.setValueAtTime(
                                    layer.transform.rotation.keyTime(j), 
                                    layer.transform.rotation.keyValue(j) + rotationValue
                                );
                            }
                        } else {
                            layer.transform.rotation.setValue(layer.transform.rotation.value + rotationValue);
                        }
                    } else {
                        if (layer.transform.rotation.numKeys > 0) {
                            for (var j = 1; j <= layer.transform.rotation.numKeys; j++) {
                                layer.transform.rotation.setValueAtTime(
                                    layer.transform.rotation.keyTime(j), 
                                    rotationValue
                                );
                            }
                        } else {
                            layer.transform.rotation.setValue(rotationValue);
                        }
                    }
                }
            }
        } catch (err) {
            alert("Error applying 2D rotation: " + err.toString());
        }
        app.endUndoGroup();
        
        checkAutoClose();
    }

    /**
     * Applies 3D rotation to selected layers
     * @param {CompItem} myComp - The composition
     * @param {boolean} relative - Whether to apply values relative to current values
     * @param {number} xRot - X rotation value in degrees
     * @param {number} yRot - Y rotation value in degrees
     * @param {number} zRot - Z rotation value in degrees
     */
    function apply3DRotation(myComp, relative, xRot, yRot, zRot) {
        if (!(myComp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        if (myComp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup("Apply Layer 3D Rotation");
        try {
            for (var i = 0; i < myComp.selectedLayers.length; i++) {
                var layer = myComp.selectedLayers[i];
                
                // Check if layer is 3D
                if (!layer.threeDLayer) {
                    layer.threeDLayer = true;
                }
                
                if (layer.transform.orientation) {
                    var currentOrientation = layer.transform.orientation.value;
                    var newOrientation = [currentOrientation[0], currentOrientation[1], currentOrientation[2]];
                    
                    if (xRot !== null) {
                        if (relative) { 
                            newOrientation[0] = currentOrientation[0] + xRot; 
                        } else { 
                            newOrientation[0] = xRot; 
                        }
                    }
                    
                    if (yRot !== null) {
                        if (relative) { 
                            newOrientation[1] = currentOrientation[1] + yRot; 
                        } else { 
                            newOrientation[1] = yRot; 
                        }
                    }
                    
                    if (zRot !== null) {
                        if (relative) { 
                            newOrientation[2] = currentOrientation[2] + zRot; 
                        } else { 
                            newOrientation[2] = zRot; 
                        }
                    }
                    
                    layer.transform.orientation.setValue(newOrientation);
                }
            }
        } catch (err) {
            alert("Error applying 3D rotation: " + err.toString());
        }
        app.endUndoGroup();
        
        checkAutoClose();
    }

    /**
     * Applies scale transform to selected layers
     * @param {number} xScale - X scale multiplier (1.0 = 100%)
     * @param {number} yScale - Y scale multiplier (1.0 = 100%)
     * @param {boolean} relative - Whether to apply values relative to current values
     * @param {CompItem} myComp - The composition
     * @param {boolean} linkScale - Whether to link X and Y scale
     */
    function applyScale(xScale, yScale, relative, myComp, linkScale) {
        if (!(myComp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        if (myComp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup("Apply Layer Scale");
        try {
            for (var h = 0; h < myComp.selectedLayers.length; h++) {
                var myLayer = myComp.selectedLayers[h];
                var scaleVector = [xScale, yScale, 1];
                
                // Handle linked scale
                if (linkScale) {
                    if (xScale !== null) scaleVector[1] = scaleVector[0];
                    else if (yScale !== null) scaleVector[0] = scaleVector[1];
                }
                
                if (myLayer.transform.scale) {
                    if (relative) {
                        if (myLayer.transform.scale.numKeys > 0) {
                            for (var i = 1; i <= myLayer.transform.scale.numKeys; i++) {
                                var targetScale = [
                                    myLayer.transform.scale.keyValue(i)[0], 
                                    myLayer.transform.scale.keyValue(i)[1], 
                                    myLayer.transform.scale.keyValue(i)[2]
                                ];
                                
                                if (xScale !== null) targetScale[0] = scaleVector[0] * myLayer.transform.scale.keyValue(i)[0];
                                if (yScale !== null) targetScale[1] = scaleVector[1] * myLayer.transform.scale.keyValue(i)[1];
                                
                                myLayer.transform.scale.setValueAtTime(
                                    myLayer.transform.scale.keyTime(i), 
                                    targetScale
                                );
                            }
                        } else {
                            var targetScale = [
                                myLayer.transform.scale.value[0], 
                                myLayer.transform.scale.value[1], 
                                myLayer.transform.scale.value[2]
                            ];
                            
                            if (xScale !== null) targetScale[0] = scaleVector[0] * myLayer.transform.scale.value[0];
                            if (yScale !== null) targetScale[1] = scaleVector[1] * myLayer.transform.scale.value[1];
                            
                            myLayer.transform.scale.setValue(targetScale);
                        }
                    } else {
                        var targetScale = [
                            myLayer.transform.scale.value[0], 
                            myLayer.transform.scale.value[1], 
                            myLayer.transform.scale.value[2]
                        ];
                        
                        if (xScale !== null) targetScale[0] = scaleVector[0] * 100;
                        if (yScale !== null) targetScale[1] = scaleVector[1] * 100;
                        
                        myLayer.transform.scale.setValue([targetScale[0], targetScale[1], 100]);
                    }
                }
            }
        } catch (err) {
            alert("Error applying scale: " + err.toString());
        }
        app.endUndoGroup();
        
        checkAutoClose();
    }

    /**
     * Applies opacity to selected layers
     * @param {number} opacity - Opacity value (0-1)
     * @param {CompItem} myComp - The composition
     */
    function applyOpacity(opacity, myComp) {
        if (!(myComp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        if (myComp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup("Apply Layer Opacity");
        try {
            for (var h = 0; h < myComp.selectedLayers.length; h++) {
                var myLayer = myComp.selectedLayers[h];
                if (myLayer.transform.opacity) {
                    myLayer.transform.opacity.setValue(opacity * 100);
                }
            }
        } catch (err) {
            alert("Error applying opacity: " + err.toString());
        }
        app.endUndoGroup();
        
        checkAutoClose();
    }

    /**
     * Resets all transform properties of selected layers
     * @param {CompItem} myComp - The composition
     */
    function resetAllTransform(myComp) {
        if (!(myComp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        if (myComp.selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup("Reset All Transform");
        try {
            var compCenter = [myComp.width / 2, myComp.height / 2, 0];
            
            for (var h = 0; h < myComp.selectedLayers.length; h++) {
                var myLayer = myComp.selectedLayers[h];
                
                try {
                    // Reset Anchor Point to (0,0)
                    if (myLayer.transform && myLayer.transform.anchorPoint) {
                        if (myLayer.threeDLayer) {
                            myLayer.transform.anchorPoint.setValue([0, 0, 0]);
                        } else {
                            myLayer.transform.anchorPoint.setValue([0, 0]);
                        }
                    }
                    
                    // Reset Position
                    if (myLayer.transform && myLayer.transform.position) {
                        if (myLayer.transform.position.dimensionsSeparated) {
                            // Handle separated dimensions
                            if (myLayer.transform.xPosition) myLayer.transform.xPosition.setValue(compCenter[0]);
                            if (myLayer.transform.yPosition) myLayer.transform.yPosition.setValue(compCenter[1]);
                            if (myLayer.threeDLayer && myLayer.transform.zPosition) myLayer.transform.zPosition.setValue(0);
                        } else {
                            // Standard position property
                            if (myLayer.threeDLayer) {
                                myLayer.transform.position.setValue(compCenter);
                            } else {
                                myLayer.transform.position.setValue([compCenter[0], compCenter[1]]);
                            }
                        }
                    }
                    
                    // Reset Rotation - handle differently for 2D and 3D layers
                    if (myLayer.threeDLayer) {
                        // For 3D layers
                        if (myLayer.transform && myLayer.transform.xRotation) 
                            myLayer.transform.xRotation.setValue(0);
                        if (myLayer.transform && myLayer.transform.yRotation) 
                            myLayer.transform.yRotation.setValue(0);
                        if (myLayer.transform && myLayer.transform.zRotation) 
                            myLayer.transform.zRotation.setValue(0);
                    } else {
                        // For 2D layers
                        if (myLayer.transform && myLayer.transform.rotation) 
                            myLayer.transform.rotation.setValue(0);
                    }
                    
                    // Reset Scale - handle differently for 2D and 3D layers
                    if (myLayer.transform && myLayer.transform.scale) {
                        if (myLayer.threeDLayer) {
                            myLayer.transform.scale.setValue([100, 100, 100]);
                        } else {
                            myLayer.transform.scale.setValue([100, 100]);
                        }
                    }
                    
                    // Reset Orientation - only for 3D layers
                    if (myLayer.threeDLayer && myLayer.transform && myLayer.transform.orientation) {
                        myLayer.transform.orientation.setValue([0, 0, 0]);
                    }
                    
                    // Reset Opacity
                    if (myLayer.transform && myLayer.transform.opacity) {
                        myLayer.transform.opacity.setValue(100);
                    }
                } catch (layerErr) {
                    // Skip this layer and continue with others
                    $.writeln("Couldn't reset all properties on layer " + myLayer.name + ": " + layerErr.toString());
                }
            }
        } catch (err) {
            alert("Error resetting transforms: " + err.toString());
        }
        app.endUndoGroup();
    }

    /**
     * Gets all shape groups from a shape layer
     * @param {Layer} layer - The shape layer
     * @returns {Array} - Array of shape groups
     */
    function getShapeGroups(layer) {
        var groups = [];
        
        if (!(layer instanceof ShapeLayer)) {
            return groups;
        }
        
        try {
            // Get contents property group
            var contents = layer.property("ADBE Root Vectors Group");
            
            // Loop through all groups
            for (var i = 1; i <= contents.numProperties; i++) {
                var group = contents.property(i);
                groups.push({
                    name: group.name,
                    index: i,
                    group: group
                });
            }
        } catch (err) {
            alert("Error getting shape groups: " + err.toString());
        }
        
        return groups;
    }
    
    /**
     * Updates the shape group dropdown with groups from the selected layer
     */
    function updateShapeGroupDropdown() {
        try {
            // Clear dropdown
            shapeGroupDropdown.removeAll();
            
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
                shapeGroupDropdown.add("item", "No shape layer selected");
                shapeGroupDropdown.selection = 0;
                return;
            }
            
            var layer = comp.selectedLayers[0];
            
            // Check if it's a shape layer
            if (!(layer instanceof ShapeLayer)) {
                shapeGroupDropdown.add("item", "Selected layer is not a shape layer");
                shapeGroupDropdown.selection = 0;
                return;
            }
            
            // Get shape groups
            var groups = getShapeGroups(layer);
            
            if (groups.length === 0) {
                shapeGroupDropdown.add("item", "No shape groups found");
            } else {
                for (var i = 0; i < groups.length; i++) {
                    shapeGroupDropdown.add("item", groups[i].name);
                }
            }
            
            shapeGroupDropdown.selection = 0;
        } catch (err) {
            alert("Error updating shape groups: " + err.toString());
        }
    }
    
    /**
     * Gets the currently selected shape group
     * @returns {PropertyGroup|null} - The selected shape group or null if none selected
     */
    function getSelectedShapeGroup() {
        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem) || comp.selectedLayers.length === 0) {
                return null;
            }
            
            var layer = comp.selectedLayers[0];
            
            // Check if it's a shape layer
            if (!(layer instanceof ShapeLayer)) {
                return null;
            }
            
            // Check if a group is selected in dropdown
            if (!shapeGroupDropdown.selection) {
                return null;
            }
            
            // Get shape groups
            var contents = layer.property("ADBE Root Vectors Group");
            
            // Check if the selected index exists
            var index = shapeGroupDropdown.selection.index + 1;
            if (index > contents.numProperties) {
                return null;
            }
            
            return contents.property(index);
        } catch (err) {
            alert("Error getting selected shape group: " + err.toString());
            return null;
        }
    }
    
    /**
     * Gets the coordinate system mode from radio buttons
     * @returns {string} - "local", "layer", or "world"
     */
    function getCoordinateSystem() {
        if (layerRadio.value) return "layer";
        if (worldRadio.value) return "world";
        return "local"; // Default
    }
    
    /**
     * Transforms a point from one coordinate system to another
     * @param {Array} point - The point to transform [x, y]
     * @param {Layer} layer - The layer for reference
     * @param {string} fromSystem - Source coordinate system ("local", "layer", "world")
     * @param {string} toSystem - Target coordinate system ("local", "layer", "world")
     * @returns {Array} - Transformed point [x, y]
     */
    function transformPoint(point, layer, fromSystem, toSystem) {
        // If systems are the same, no transformation needed
        if (fromSystem === toSystem) return point.slice();
        
        var result = point.slice();
        
        try {
            // Get layer transform properties
            var layerPosition = layer.transform.position.value;
            var layerScale = layer.transform.scale.value;
            var layerRotation = layer.transform.rotation.value * Math.PI / 180; // Convert to radians
            
            // Local to Layer transformation
            if (fromSystem === "local" && toSystem === "layer") {
                // Scale is already handled in shape groups, so we only need rotation
                var cosTheta = Math.cos(layerRotation);
                var sinTheta = Math.sin(layerRotation);
                var x = result[0];
                var y = result[1];
                
                result[0] = x * cosTheta - y * sinTheta;
                result[1] = x * sinTheta + y * cosTheta;
            }
            
            // Local to World transformation
            else if (fromSystem === "local" && toSystem === "world") {
                // First convert to layer space
                var tempPoint = transformPoint(point, layer, "local", "layer");
                
                // Then add layer position to get world space
                result[0] = tempPoint[0] + layerPosition[0];
                result[1] = tempPoint[1] + layerPosition[1];
            }
            
            // Layer to Local transformation
            else if (fromSystem === "layer" && toSystem === "local") {
                // Inverse rotation
                var cosTheta = Math.cos(-layerRotation);
                var sinTheta = Math.sin(-layerRotation);
                var x = result[0];
                var y = result[1];
                
                result[0] = x * cosTheta - y * sinTheta;
                result[1] = x * sinTheta + y * cosTheta;
            }
            
            // Layer to World transformation
            else if (fromSystem === "layer" && toSystem === "world") {
                // Simply add layer position
                result[0] += layerPosition[0];
                result[1] += layerPosition[1];
            }
            
            // World to Local transformation
            else if (fromSystem === "world" && toSystem === "local") {
                // First convert to layer space
                var tempPoint = transformPoint(point, layer, "world", "layer");
                
                // Then to local space
                result = transformPoint(tempPoint, layer, "layer", "local");
            }
            
            // World to Layer transformation
            else if (fromSystem === "world" && toSystem === "layer") {
                // Subtract layer position
                result[0] -= layerPosition[0];
                result[1] -= layerPosition[1];
            }
        } catch (err) {
            alert("Error transforming point: " + err.toString());
        }
        
        return result;
    }
    
    /**
     * Transforms an angle from one coordinate system to another
     * @param {number} angle - The angle to transform (in degrees)
     * @param {Layer} layer - The layer for reference
     * @param {string} fromSystem - Source coordinate system ("local", "layer", "world")
     * @param {string} toSystem - Target coordinate system ("local", "layer", "world")
     * @returns {number} - Transformed angle (in degrees)
     */
    function transformAngle(angle, layer, fromSystem, toSystem) {
        // If systems are the same, no transformation needed
        if (fromSystem === toSystem) return angle;
        
        var result = angle;
        
        try {
            var layerRotation = layer.transform.rotation.value;
            
            // Local to Layer or World
            if (fromSystem === "local" && (toSystem === "layer" || toSystem === "world")) {
                result = angle + layerRotation;
            }
            
            // Layer or World to Local
            else if ((fromSystem === "layer" || fromSystem === "world") && toSystem === "local") {
                result = angle - layerRotation;
            }
            
            // Normalize to -180 to 180 range
            while (result > 180) result -= 360;
            while (result < -180) result += 360;
        } catch (err) {
            alert("Error transforming angle: " + err.toString());
        }
        
        return result;
    }
    
    /**
     * Adds two arrays element-wise
     * @param {Array} array1 - First array
     * @param {Array} array2 - Second array
     * @returns {Array} - Result array
     */
    function sumArrays(array1, array2) {
        var result = [];
        var len = Math.max(array1.length, array2.length);
        
        for (var i = 0; i < len; i++) {
            var val1 = i < array1.length ? array1[i] : 0;
            var val2 = i < array2.length ? array2[i] : 0;
            result.push(val1 + val2);
        }
        
        return result;
    }

    /**
     * Multiplies two arrays element-wise
     * @param {Array} array1 - First array
     * @param {Array} array2 - Second array
     * @returns {Array} - Result array
     */
    function mulArrays(array1, array2) {
        var result = [];
        var len = Math.max(array1.length, array2.length);
        
        for (var i = 0; i < len; i++) {
            var val1 = i < array1.length ? array1[i] : 1;
            var val2 = i < array2.length ? array2[i] : 1;
            result.push(val1 * val2);
        }
        
        return result;
    }
    
    /**
     * Applies a transform to the selected shape group
     * @param {string} property - The property to transform (position, scale, rotation, all)
     * @param {number|null} index - The index for vector properties (0 for x, 1 for y)
     * @param {number|Array|Object} value - The value to apply
     * @param {boolean} relative - Whether to apply values relative to current values
     */
    function applyShapeGroupTransform(property, index, value, relative) {
        var shapeGroup = getSelectedShapeGroup();
        
        if (!shapeGroup) {
            alert("Please select a shape group.");
            return;
        }
        
        app.beginUndoGroup("Apply Shape Group Transform");
        
        try {
            // Get layer and coordinate system
            var layer = app.project.activeItem.selectedLayers[0];
            var coordSystem = getCoordinateSystem();
            
            // Get transform property group
            var transform = shapeGroup.property("ADBE Vector Transform Group");
            
            if (property === "position" || property === "all") {
                var position = transform.property("ADBE Vector Position");
                var currentPosition = position.value;
                var posValues;
                
                if (Array.isArray(value)) {
                    posValues = value;
                } else if (property === "all" && typeof value === "object") {
                    posValues = value.position;
                } else {
                    // Single value with index (old behavior)
                    posValues = [0, 0];
                    posValues[index] = value;
                }
                
                if (coordSystem !== "local") {
                    // Transform position values based on coordinate system
                    var sourceSystem = coordSystem;
                    
                    // For relative mode, the input values are in the selected coordinate system
                    // For absolute mode, the input values are considered to be in the target coordinate system already
                    if (!relative) {
                        // Transform from the coordinate system to local
                        posValues = transformPoint(posValues, layer, sourceSystem, "local");
                    } else {
                        // For relative, transform the delta in the source system to a delta in local system
                        var zeroPoint = [0, 0];
                        var transformedZero = transformPoint(zeroPoint, layer, sourceSystem, "local");
                        var transformedValue = transformPoint(posValues, layer, sourceSystem, "local");
                        
                        // Get the delta in local space
                        posValues = [
                            transformedValue[0] - transformedZero[0],
                            transformedValue[1] - transformedZero[1]
                        ];
                    }
                }
                
                var newPosition;
                if (relative) {
                    newPosition = [
                        currentPosition[0] + posValues[0], 
                        currentPosition[1] + posValues[1]
                    ]; 
                } else {
                    newPosition = [posValues[0], posValues[1]];
                }
                
                position.setValue(newPosition);
            }
            
            if (property === "scale" || property === "all") {
                var scale = transform.property("ADBE Vector Scale");
                var currentScale = scale.value;
                var scaleValues;
                
                if (Array.isArray(value)) {
                    scaleValues = value;
                } else if (property === "all" && typeof value === "object") {
                    scaleValues = value.scale;
                } else {
                    // Single value with index (old behavior)
                    scaleValues = [1, 1];
                    scaleValues[index] = value;
                }
                
                var newScale;
                if (relative) {
                    newScale = [
                        currentScale[0] * scaleValues[0], 
                        currentScale[1] * scaleValues[1]
                    ];
                } else {
                    newScale = [
                        scaleValues[0] * 100, 
                        scaleValues[1] * 100
                    ];
                }
                
                scale.setValue(newScale);
            }
            
            if (property === "rotation" || property === "all") {
                var rotation = transform.property("ADBE Vector Rotation");
                var currentRotation = rotation.value;
                var rotValue;
                
                if (property === "all" && typeof value === "object") {
                    rotValue = value.rotation;
                } else {
                    rotValue = value;
                }
                
                // Handle coordinate system for rotation
                if (coordSystem !== "local") {
                    // Transform rotation based on coordinate system
                    if (!relative) {
                        // For absolute, transform from the coordinate system to local
                        rotValue = transformAngle(rotValue, layer, coordSystem, "local");
                    } else {
                        // For relative, the delta angle is simply added (coordinate systems don't change angle deltas)
                        // No transform needed
                    }
                }
                
                if (relative) {
                    rotation.setValue(currentRotation + rotValue);
                } else {
                    rotation.setValue(rotValue);
                }
            }
        } catch (err) {
            alert("Error applying shape group transform: " + err.toString());
        }
        
        app.endUndoGroup();
        
        checkAutoClose();
    }
    
    /**
     * Checks if auto close is enabled and closes the window
     */
    function checkAutoClose() {
        if (autoCloseCheckbox.value) {
            window.close();
        }
    }
    
    // Add event listeners for shape group tab
    refreshShapeGroupsBtn.onClick = updateShapeGroupDropdown;
    
    // Automatically update shape groups when script starts
    window.onShow = function() {
        updateShapeGroupDropdown();
    };
    
    // Center and show the window
    window.center();
    window.show();
})();