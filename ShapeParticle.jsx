// Improved Shape Layer Particle System with Turbulence
// Modified with controls on SP-ctrl layer and revised position linking
// Using looping wiggle for smooth seamless particle movement cycles
// Added shape options and rotation speed controls

(function() {
    // Check if a project is open
    if (!app.project) {
        alert("Please open a project first.");
        return;
    }

    var activeComp = app.project.activeItem;
    if (!activeComp || !(activeComp instanceof CompItem)) {
        alert("Please select or open a composition.");
        return;
    }
    
    // Show dialog to get particle count
    var particleCount = 50; // Default
    var particleShape = "circle"; // Default shape
    
    // Find existing particle systems in comp
    var existingParticleSystems = findExistingParticleSystems(activeComp);
    
    // Create panel instead of dialog for persistent usage
    var dialog = new Window("palette", "Particle System", undefined, {resizeable: true, closeButton: true});
    dialog.orientation = "column";
    dialog.alignChildren = ["center", "top"];
    dialog.spacing = 10;
    dialog.margins = 16;
    
    // Create tabbed panel for UI organization
    var tabbedPanel = dialog.add("tabbedpanel");
    tabbedPanel.alignChildren = "fill";
    tabbedPanel.preferredSize = [400, 350]; // Set reasonable size for tabbed panel
    
    // Create tabs
    var basicTab = tabbedPanel.add("tab", undefined, "Basic");
    basicTab.orientation = "column";
    basicTab.alignChildren = ["left", "top"];
    basicTab.spacing = 10;
    basicTab.margins = 10;
    
    var physicsTab = tabbedPanel.add("tab", undefined, "Physics");
    physicsTab.orientation = "column";
    physicsTab.alignChildren = ["left", "top"];
    physicsTab.spacing = 10;
    physicsTab.margins = 10;
    
    var appearanceTab = tabbedPanel.add("tab", undefined, "Appearance");
    appearanceTab.orientation = "column";
    appearanceTab.alignChildren = ["left", "top"];
    appearanceTab.spacing = 10;
    appearanceTab.margins = 10;
    
    // Make sure the appearance tab is properly initialized
    appearanceTab.enabled = true;
    
    // Set active tab
    tabbedPanel.selection = 0; // Start with Basic tab
    
    // MOVED TO BASIC TAB: Add dropdown to select from existing systems first
    var existingSystemGroup = basicTab.add("group");
    existingSystemGroup.orientation = "row";
    existingSystemGroup.alignChildren = ["left", "center"];
    existingSystemGroup.spacing = 10;
    existingSystemGroup.add("statictext", undefined, "Existing Systems:");
    
    var systemDropdown = existingSystemGroup.add("dropdownlist");
    systemDropdown.add("item", "None");
    
    // Add all existing particle systems to dropdown
    for (var i = 0; i < existingParticleSystems.length; i++) {
        systemDropdown.add("item", existingParticleSystems[i].name);
    }
    systemDropdown.selection = 0; // Default to "None"
    systemDropdown.size = [180, 25]; // Make dropdown wider
    
    // Add shape selection dropdown
    var shapeGroup = basicTab.add("group");
    shapeGroup.orientation = "row";
    shapeGroup.alignChildren = ["left", "center"];
    shapeGroup.spacing = 10;
    shapeGroup.add("statictext", undefined, "Shape Type:");
    var shapeDropdown = shapeGroup.add("dropdownlist");
    shapeDropdown.add("item", "Circle");
    shapeDropdown.add("item", "Rectangle");
    shapeDropdown.add("item", "Polygon");
    shapeDropdown.add("item", "Star");
    shapeDropdown.selection = 0; // Default to Circle
    shapeDropdown.size = [100, 25]; // Make dropdown wider
    
    // Replace text input with slider for particle count
    var countGroup = basicTab.add("group");
    countGroup.orientation = "row";
    countGroup.alignChildren = ["left", "center"];
    countGroup.spacing = 10;
    countGroup.add("statictext", undefined, "Number of Particles:");
    var countSlider = countGroup.add("slider", undefined, particleCount, 1, 200);
    countSlider.size = [150, 20];
    var countText = countGroup.add("edittext", undefined, particleCount);
    countText.characters = 3;
    
    // Update text when slider changes
    countSlider.onChanging = function() {
        countText.text = Math.round(this.value);
        handleLiveUpdate();
    };
    
    // Update slider when text changes
    countText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 1 && value <= 200) {
            countSlider.value = value;
        } else {
            this.text = Math.round(countSlider.value);
        }
        handleLiveUpdate();
    };
    
    // Add polygon sides input (only visible when polygon is selected)
    var polygonGroup = basicTab.add("group");
    polygonGroup.orientation = "row";
    polygonGroup.alignChildren = ["left", "center"];
    polygonGroup.spacing = 10;
    polygonGroup.add("statictext", undefined, "Polygon Sides:");
    var sidesInput = polygonGroup.add("edittext", undefined, "5");
    sidesInput.characters = 5;
    polygonGroup.visible = false; // Hide initially
    
    // Star specific controls
    var starGroup = basicTab.add("group");
    starGroup.orientation = "row";
    starGroup.alignChildren = ["left", "center"];
    starGroup.spacing = 10;
    starGroup.add("statictext", undefined, "Star Points:");
    var starPointsInput = starGroup.add("edittext", undefined, "5");
    starPointsInput.characters = 5;
    starGroup.visible = false; // Hide initially
    
    // Rectangle specific controls
    var rectangleGroup = basicTab.add("group");
    rectangleGroup.orientation = "row";
    rectangleGroup.alignChildren = ["left", "center"];
    rectangleGroup.spacing = 10;
    rectangleGroup.add("statictext", undefined, "Rectangle Ratio:");
    var ratioInput = rectangleGroup.add("edittext", undefined, "1.0");
    ratioInput.characters = 5;
    rectangleGroup.visible = false; // Hide initially
    
    // Show/hide shape-specific controls based on selection
    shapeDropdown.onChange = function() {
        polygonGroup.visible = (shapeDropdown.selection.text === "Polygon");
        starGroup.visible = (shapeDropdown.selection.text === "Star");
        rectangleGroup.visible = (shapeDropdown.selection.text === "Rectangle");
        handleLiveUpdate();
    };
    
    // Create buttons below the tabbed panel
    var buttonGroup = dialog.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignChildren = ["center", "center"];
    buttonGroup.spacing = 10;
    
    // Add live update checkbox to buttonGroup
    var liveUpdateCheckbox = buttonGroup.add("checkbox", undefined, "Live Update");
    liveUpdateCheckbox.value = false;
    
    var okButton = buttonGroup.add("button", undefined, "Create");
    var cancelButton = buttonGroup.add("button", undefined, "Close");
    
    // Create object to store settings from existing systems
    var loadedSettings = null;
    
    // Add physics controls to Physics tab
    
    // Velocity controls
    var velocityGroup = physicsTab.add("panel", undefined, "Velocity");
    velocityGroup.orientation = "column";
    velocityGroup.alignChildren = ["left", "top"];
    velocityGroup.spacing = 5;
    velocityGroup.margins = 10;
    
    // Velocity magnitude
    var velocityMagGroup = velocityGroup.add("group");
    velocityMagGroup.orientation = "row";
    velocityMagGroup.alignChildren = ["left", "center"];
    velocityMagGroup.add("statictext", undefined, "Velocity:");
    var velocitySlider = velocityMagGroup.add("slider", undefined, 100, 0, 500);
    velocitySlider.size = [150, 20];
    var velocityText = velocityMagGroup.add("edittext", undefined, "100");
    velocityText.characters = 5;
    
    // Velocity variance
    var velocityVarGroup = velocityGroup.add("group");
    velocityVarGroup.orientation = "row";
    velocityVarGroup.alignChildren = ["left", "center"];
    velocityVarGroup.add("statictext", undefined, "Velocity Variance:");
    var velocityVarSlider = velocityVarGroup.add("slider", undefined, 50, 0, 200);
    velocityVarSlider.size = [150, 20];
    var velocityVarText = velocityVarGroup.add("edittext", undefined, "50");
    velocityVarText.characters = 5;
    
    // Velocity direction
    var velocityDirGroup = velocityGroup.add("group");
    velocityDirGroup.orientation = "row";
    velocityDirGroup.alignChildren = ["left", "center"];
    velocityDirGroup.add("statictext", undefined, "Direction:");
    var velocityDirSlider = velocityDirGroup.add("slider", undefined, 0, -180, 180);
    velocityDirSlider.size = [150, 20];
    var velocityDirText = velocityDirGroup.add("edittext", undefined, "0");
    velocityDirText.characters = 5;
    
    // Velocity direction variance
    var velocityDirVarGroup = velocityGroup.add("group");
    velocityDirVarGroup.orientation = "row";
    velocityDirVarGroup.alignChildren = ["left", "center"];
    velocityDirVarGroup.add("statictext", undefined, "Direction Variance:");
    var velocityDirVarSlider = velocityDirVarGroup.add("slider", undefined, 10, 0, 180);
    velocityDirVarSlider.size = [150, 20];
    var velocityDirVarText = velocityDirVarGroup.add("edittext", undefined, "10");
    velocityDirVarText.characters = 5;
    
    // Gravity controls
    var gravityGroup = physicsTab.add("panel", undefined, "Gravity & Resistance");
    gravityGroup.orientation = "column";
    gravityGroup.alignChildren = ["left", "top"];
    gravityGroup.spacing = 5;
    gravityGroup.margins = 10;
    
    // Gravity magnitude
    var gravityMagGroup = gravityGroup.add("group");
    gravityMagGroup.orientation = "row";
    gravityMagGroup.alignChildren = ["left", "center"];
    gravityMagGroup.add("statictext", undefined, "Gravity:");
    var gravitySlider = gravityMagGroup.add("slider", undefined, 98, 0, 500);
    gravitySlider.size = [150, 20];
    var gravityText = gravityMagGroup.add("edittext", undefined, "98");
    gravityText.characters = 5;
    
    // Gravity direction
    var gravityDirGroup = gravityGroup.add("group");
    gravityDirGroup.orientation = "row";
    gravityDirGroup.alignChildren = ["left", "center"];
    gravityDirGroup.add("statictext", undefined, "Direction:");
    var gravityDirSlider = gravityDirGroup.add("slider", undefined, 180, -180, 180);
    gravityDirSlider.size = [150, 20];
    var gravityDirText = gravityDirGroup.add("edittext", undefined, "180");
    gravityDirText.characters = 5;
    
    // Resistance
    var resistanceGroup = gravityGroup.add("group");
    resistanceGroup.orientation = "row";
    resistanceGroup.alignChildren = ["left", "center"];
    resistanceGroup.add("statictext", undefined, "Resistance:");
    var resistanceSlider = resistanceGroup.add("slider", undefined, 0, 0, 100);
    resistanceSlider.size = [150, 20];
    var resistanceText = resistanceGroup.add("edittext", undefined, "0");
    resistanceText.characters = 5;
    
    // Emitter controls
    var emitterGroup = physicsTab.add("panel", undefined, "Emitter");
    emitterGroup.orientation = "column";
    emitterGroup.alignChildren = ["left", "top"];
    emitterGroup.spacing = 5;
    emitterGroup.margins = 10;
    
    // Particle lifetime
    var lifetimeGroup = emitterGroup.add("group");
    lifetimeGroup.orientation = "row";
    lifetimeGroup.alignChildren = ["left", "center"];
    lifetimeGroup.add("statictext", undefined, "Lifetime (sec):");
    var lifetimeSlider = lifetimeGroup.add("slider", undefined, 4, 0.1, 20);
    lifetimeSlider.size = [150, 20];
    var lifetimeText = lifetimeGroup.add("edittext", undefined, "4");
    lifetimeText.characters = 5;
    
    // Emitter Width
    var emitterWidthGroup = emitterGroup.add("group");
    emitterWidthGroup.orientation = "row";
    emitterWidthGroup.alignChildren = ["left", "center"];
    emitterWidthGroup.add("statictext", undefined, "Width:");
    var emitterWidthSlider = emitterWidthGroup.add("slider", undefined, 0, 0, 500);
    emitterWidthSlider.size = [150, 20];
    var emitterWidthText = emitterWidthGroup.add("edittext", undefined, "0");
    emitterWidthText.characters = 5;
    
    // Emitter Height
    var emitterHeightGroup = emitterGroup.add("group");
    emitterHeightGroup.orientation = "row";
    emitterHeightGroup.alignChildren = ["left", "center"];
    emitterHeightGroup.add("statictext", undefined, "Height:");
    var emitterHeightSlider = emitterHeightGroup.add("slider", undefined, 0, 0, 500);
    emitterHeightSlider.size = [150, 20];
    var emitterHeightText = emitterHeightGroup.add("edittext", undefined, "0");
    emitterHeightText.characters = 5;
    
    // Connect sliders to text fields
    velocitySlider.onChanging = function() { 
        velocityText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    velocityText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            velocitySlider.value = value;
        } else {
            this.text = Math.round(velocitySlider.value);
        }
        handleLiveUpdate();
    };
    
    velocityVarSlider.onChanging = function() { 
        velocityVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    velocityVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            velocityVarSlider.value = value;
        } else {
            this.text = Math.round(velocityVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    velocityDirSlider.onChanging = function() {
        velocityDirText.text = Math.round(this.value);
        handleLiveUpdate();
    };
    velocityDirText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= -180 && value <= 180) {
            velocityDirSlider.value = value;
        } else {
            this.text = Math.round(velocityDirSlider.value);
        }
        handleLiveUpdate();
    };
    
    velocityDirVarSlider.onChanging = function() { 
        velocityDirVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    velocityDirVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 180) {
            velocityDirVarSlider.value = value;
        } else {
            this.text = Math.round(velocityDirVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    gravitySlider.onChanging = function() { 
        gravityText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    gravityText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            gravitySlider.value = value;
        } else {
            this.text = Math.round(gravitySlider.value);
        }
        handleLiveUpdate();
    };
    
    gravityDirSlider.onChanging = function() {
        gravityDirText.text = Math.round(this.value);
        handleLiveUpdate();
    };
    gravityDirText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= -180 && value <= 180) {
            gravityDirSlider.value = value;
        } else {
            this.text = Math.round(gravityDirSlider.value);
        }
        handleLiveUpdate();
    };
    
    resistanceSlider.onChanging = function() { 
        resistanceText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    resistanceText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            resistanceSlider.value = value;
        } else {
            this.text = Math.round(resistanceSlider.value);
        }
        handleLiveUpdate();
    };
    
    lifetimeSlider.onChanging = function() { 
        lifetimeText.text = this.value.toFixed(1); 
        handleLiveUpdate();
    };
    lifetimeText.onChange = function() {
        var value = parseFloat(this.text);
        if (!isNaN(value) && value >= 0.1) {
            lifetimeSlider.value = value;
        } else {
            this.text = lifetimeSlider.value.toFixed(1);
        }
        handleLiveUpdate();
    };
    
    emitterWidthSlider.onChanging = function() { 
        emitterWidthText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    emitterWidthText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            emitterWidthSlider.value = value;
        } else {
            this.text = Math.round(emitterWidthSlider.value);
        }
        handleLiveUpdate();
    };
    
    emitterHeightSlider.onChanging = function() { 
        emitterHeightText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    emitterHeightText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            emitterHeightSlider.value = value;
        } else {
            this.text = Math.round(emitterHeightSlider.value);
        }
        handleLiveUpdate();
    };
    
    // Function to handle live updates when checkbox is checked
    function handleLiveUpdate() {
        if (liveUpdateCheckbox.value && systemDropdown.selection.index > 0) {
            var selectedSystem = existingParticleSystems[systemDropdown.selection.index - 1];
            
            // Update the particle layer's controls with current UI values
            try {
                app.beginUndoGroup("Update Particle System");
                
                // Get current shape type from UI
                var shapeType = shapeDropdown.selection.text;
                
                // Get current shape type from layer name
                var currentShapeType = "";
                if (selectedSystem.name.indexOf("[Star]") !== -1) {
                    currentShapeType = "Star";
                } else if (selectedSystem.name.indexOf("[Polygon]") !== -1) {
                    currentShapeType = "Polygon";
                } else if (selectedSystem.name.indexOf("[Rectangle]") !== -1) {
                    currentShapeType = "Rectangle";
                } else {
                    currentShapeType = "Circle";
                }
                
                // Extract the instance number from the layer name
                var instanceNum = selectedSystem.name.match(/\d+/)[0];
                
                // First update the actual particle count if needed
                var userParticleCount = parseInt(countText.text);
                if (!isNaN(userParticleCount) && userParticleCount > 0 && userParticleCount <= 500) {
                    // Find the corresponding particle layer
                    var particleLayerName = "Shape Particles " + instanceNum;
                    var particleLayer = null;
                    
                    for (var i = 1; i <= activeComp.numLayers; i++) {
                        if (activeComp.layer(i).name === particleLayerName) {
                            particleLayer = activeComp.layer(i);
                            break;
                        }
                    }
                    
                    if (particleLayer) {
                        // Get the current number of particles in the layer
                        var currentParticleCount = 0;
                        var contents = particleLayer.property("Contents");
                        
                        for (var j = 1; j <= contents.numProperties; j++) {
                            if (contents.property(j).name.indexOf("Particle ") === 0) {
                                currentParticleCount++;
                            }
                        }
                        
                        // If the actual number of particles needs to change
                        if (userParticleCount !== currentParticleCount) {
                            if (userParticleCount > currentParticleCount) {
                                // Add more particles - use existing shape type
                                for (var k = currentParticleCount + 1; k <= userParticleCount; k++) {
                                    var particleGroup = particleLayer.property("Contents").addProperty("ADBE Vector Group");
                                    particleGroup.name = "Particle " + k;
                                    
                                    // Add shape based on the current shape type
                                    var shape;
                                    
                                    if (currentShapeType === "Circle") {
                                        // Add ellipse shape
                                        shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
                                        shape.name = "Circle";
                                        shape.property("ADBE Vector Ellipse Size").setValue([10, 10]);
                                    }
                                    else if (currentShapeType === "Rectangle") {
                                        // Add rectangle shape
                                        shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
                                        shape.name = "Rectangle";
                                        
                                        // Set base size and link width/height ratio to control
                                        shape.property("ADBE Vector Rect Size").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Rectangle]\");\n" +
                                            "var baseRatio = ctrlLayer.effect(\"Rectangle Width Ratio\")(\"Slider\");\n" +
                                            "var ratioVar = ctrlLayer.effect(\"Rectangle Ratio Variance\")(\"Slider\");\n\n" +
                                            
                                            "// Generate a unique random ratio if variance is > 0\n" +
                                            "var finalRatio = baseRatio;\n" +
                                            "if (ratioVar > 0) {\n" +
                                            "    // Use normal distribution for more natural randomness\n" +
                                            "    // Create a unique seed for this particle\n" +
                                            "    seedRandom(" + k + " + 6500, true);\n" +
                                            "    var u1 = Math.max(0.0001, random()); // Ensure non-zero\n" +
                                            "    var u2 = random();\n" +
                                            "    \n" +
                                            "    // Box-Muller transform for normal distribution\n" +
                                            "    var z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);\n" +
                                            "    \n" +
                                            "    // Scale to variance (z is roughly in range -3 to 3 in normal distribution)\n" +
                                            "    var ratioVariation = z * (ratioVar / 3);\n" +
                                            "    \n" +
                                            "    // Apply variation but ensure ratio stays positive\n" +
                                            "    finalRatio = Math.max(0.1, baseRatio + ratioVariation);\n" +
                                            "}\n\n" +
                                            
                                            "[10 * finalRatio, 10];";
                                        
                                        // Link roundness to control
                                        shape.property("ADBE Vector Rect Roundness").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Rectangle]\");\n" +
                                            "ctrlLayer.effect(\"Rectangle Roundness\")(\"Slider\");";
                                    }
                                    else if (currentShapeType === "Polygon") {
                                        // Create the star shape as a polygon
                                        shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
                                        shape.name = "Polygon";
                                        
                                        // Set to polygon mode (not star)
                                        shape.property("ADBE Vector Star Type").setValue(2); // 2 = Polygon
                                        
                                        // Set default points (5 sides)
                                        shape.property("ADBE Vector Star Points").setValue(5);
                                        
                                        // Set fixed size 
                                        shape.property("ADBE Vector Star Outer Radius").setValue(10);

                                        // Set default roundness (0)
                                        shape.property("ADBE Vector Star Outer Roundess").setValue(0);
                                        
                                        // Add the expressions for dynamic control
                                        shape.property("ADBE Vector Star Points").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                                            "Math.max(3, Math.round(ctrlLayer.effect(\"Sides\")(\"Slider\")));";
                                        
                                        shape.property("ADBE Vector Star Outer Radius").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                                            "ctrlLayer.effect(\"Radius\")(\"Slider\");";
                                        
                                        shape.property("ADBE Vector Star Outer Roundess").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                                            "ctrlLayer.effect(\"Roundness\")(\"Slider\");"; 

                                        shape.property("ADBE Vector Star Rotation").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                                            "ctrlLayer.effect(\"Shape Rotation\")(\"Angle\");";
                                    }
                                    else if (currentShapeType === "Star") {
                                        // Create the star shape
                                        shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
                                        shape.name = "Star";
                                        
                                        // Set to star mode
                                        shape.property("ADBE Vector Star Type").setValue(1); // 1 = Star
                                        
                                        // Set default points (5 points)
                                        shape.property("ADBE Vector Star Points").setValue(5);
                                        
                                        // Set default sizes 
                                        shape.property("ADBE Vector Star Outer Radius").setValue(10);
                                        shape.property("ADBE Vector Star Inner Radius").setValue(5);
                                        
                                        // Add the expressions for dynamic control
                                        shape.property("ADBE Vector Star Points").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                                            "Math.max(3, Math.round(ctrlLayer.effect(\"Points\")(\"Slider\")));";
                                        
                                        shape.property("ADBE Vector Star Outer Radius").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                                            "ctrlLayer.effect(\"Outer Radius\")(\"Slider\");";
                                        
                                        shape.property("ADBE Vector Star Inner Radius").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                                            "ctrlLayer.effect(\"Inner Radius\")(\"Slider\");";
                                        
                                        shape.property("ADBE Vector Star Outer Roundess").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                                            "ctrlLayer.effect(\"Outer Roundness\")(\"Slider\");"; 

                                        shape.property("ADBE Vector Star Inner Roundess").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                                            "ctrlLayer.effect(\"Inner Roundness\")(\"Slider\");";

                                        shape.property("ADBE Vector Star Rotation").expression = 
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                                            "ctrlLayer.effect(\"Shape Rotation\")(\"Angle\");";
                                    }
                                    
                                   // Add fill
                                    var fill = particleGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
                                    fill.name = "Particle " + k + " Fill";

                                    // Create the fill expression directly instead of trying to copy it
                                    try {
                                        // Extract the instance number from the layer name
                                        var instanceNum = selectedSystem.name.match(/\d+/)[0];
                                        
                                        // Determine the shape type from the control layer name
                                        var shapeType = "";
                                        if (selectedSystem.name.indexOf("[Star]") !== -1) {
                                            shapeType = "Star";
                                        } else if (selectedSystem.name.indexOf("[Polygon]") !== -1) {
                                            shapeType = "Polygon";
                                        } else if (selectedSystem.name.indexOf("[Rectangle]") !== -1) {
                                            shapeType = "Rectangle";
                                        } else {
                                            shapeType = "Circle";
                                        }
                                        
                                        // Build the fill expression - same as in createParticles function
                                        var fillExpression = "// Advanced color expression with smoother transition logic\n" +
                                            "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum;
                                            
                                        // Add shape type suffix to layer name
                                        if (shapeType === "Circle") {
                                            fillExpression += " [Circle]";
                                        } else if (shapeType === "Rectangle") {
                                            fillExpression += " [Rectangle]";
                                        } else if (shapeType === "Polygon") {
                                            fillExpression += " [Polygon]";
                                        } else if (shapeType === "Star") {
                                            fillExpression += " [Star]";
                                        }
                                            
                                        fillExpression += "\");\n" +
                                            "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                                            "var particleNum = " + k + ";\n\n" +
                                            
                                            "// Get color parameters\n" +
                                            "var startColor = ctrlLayer.effect(\"Start Color\")(\"Color\");\n" +
                                            "var endColor = ctrlLayer.effect(\"End Color\")(\"Color\");\n" +
                                            "var colorVar = ctrlLayer.effect(\"Color Variance\")(\"Slider\") / 100;\n" +
                                            "var colorOffset = ctrlLayer.effect(\"Color Offset\")(\"Slider\") / 100;\n" +
                                            "var emitterPos = [0, 0]; // Use origin instead of emitter position\n" +
                                            "var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n\n" +
                                            
                                            "// Get physics parameters to calculate max travel distance\n" +
                                            "var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                                            "var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                                            "var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
                                            
                                            "// Calculate max travel distance based on physics\n" +
                                            "var maxDistance;\n" +
                                            "if (resistance > 0) {\n" +
                                            "    // With resistance, the max distance is limited\n" +
                                            "    // Using velocity/resistance as distance limit with terminal velocity\n" +
                                            "    var terminalTime = 5 / resistance; // Time to reach ~99% of terminal velocity\n" +
                                            "    var effectiveTime = Math.min(lifetime, terminalTime);\n" +
                                            "    maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
                                            "    \n" +
                                            "    // Add gravity contribution with resistance\n" +
                                            "    if (gravity > 0) {\n" +
                                            "        maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
                                            "    }\n" +
                                            "} else {\n" +
                                            "    // Without resistance, simple physics formula\n" +
                                            "    // d = vt + 0.5at²\n" +
                                            "    maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
                                            "}\n" +
                                            "\n" +
                                            "// Ensure minimum distance for visibility\n" +
                                            "maxDistance = Math.max(100, maxDistance);\n\n" +
                                            
                                            "// Make a unique random seed for this particle\n" +
                                            "seedRandom(particleNum, true);\n" +
                                            
                                            "// Generate offset for this particle (affects timing and visual effects)\n" +
                                            "var timeOffset = colorOffset > 0 ? random(0, lifetime * colorOffset) : 0;\n" +
                                            "var t = (time + timeOffset) % lifetime;\n\n" +
                                            
                                            "// Get the birth position\n" +
                                            "var birthX = emitterPos[0];\n" +
                                            "var birthY = emitterPos[1];\n\n" +
                                            
                                            "// Get the current position from the parent group's position\n" +
                                            "try {\n" +
                                            "    // First get the layer and parent group name\n" +
                                            "    var layerName = thisLayer.name;\n" +
                                            "    var groupName = thisProperty.propertyGroup(3).name; // Go up to get the particle group\n" +
                                            "    \n" +
                                            "    // Access the position of this particle group\n" +
                                            "    var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
                                            "    var currentX = currentPos[0];\n" +
                                            "    var currentY = currentPos[1];\n" +
                                            "} catch(err) {\n" +
                                            "    // Fallback to using a simple approximation based on physics if we can't get position\n" +
                                            "    var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                                            "    var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                                            "    \n" +
                                            "    // Simplified position calculation\n" +
                                            "    var velX = Math.cos(angle) * velocity;\n" +
                                            "    var velY = Math.sin(angle) * velocity;\n" +
                                            "    var gravX = Math.cos(gravAngle) * gravity;\n" +
                                            "    var gravY = Math.sin(gravAngle) * gravity;\n" +
                                            "    \n" +
                                            "    // Basic physics\n" +
                                            "    currentX = birthX + (velX * t) + (0.5 * gravX * t * t);\n" +
                                            "    currentY = birthY + (velY * t) + (0.5 * gravY * t * t);\n" +
                                            "}\n\n" +
                                            
                                            "// Calculate the distance from birth position\n" +
                                            "var dX = currentX - birthX;\n" +
                                            "var dY = currentY - birthY;\n" +
                                            "var currentDistance = Math.sqrt(dX*dX + dY*dY);\n\n" +
                                            
                                            "// Calculate distance ratio (0-1) for color interpolation\n" +
                                            "var distRatio = currentDistance / maxDistance;\n" +
                                            "\n" +
                                            "// Apply color offset with smoother distribution\n" +
                                            "if (colorOffset > 0) {\n" +
                                            "    // Generate a stable offset value using a more natural distribution\n" +
                                            "    seedRandom(particleNum + 7000, true);\n" +
                                            "    \n" +
                                            "    // Create a more natural random distribution (closer to normal)\n" +
                                            "    var r1 = random();\n" +
                                            "    var r2 = random();\n" +
                                            "    var normalRand = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);\n" +
                                            "    normalRand = normalRand / 3; // Scale to roughly -1 to 1 range\n" +
                                            "    \n" +
                                            "    // Apply a smoother offset that's biased toward center\n" +
                                            "    var visualOffset = colorOffset * normalRand * 0.5;\n" +
                                            "    distRatio = Math.max(0, Math.min(1, distRatio + visualOffset));\n" +
                                            "}\n\n" +
                                            
                                            "// Safety check\n" +
                                            "distRatio = Math.max(0, Math.min(1, distRatio)); // Clamp between 0-1\n" +
                                            "if (isNaN(distRatio)) distRatio = 0;\n\n" +
                                            
                                            "// Helper functions for HSL to RGB conversion\n" +
                                            "function hue2rgb(p, q, t) {\n" +
                                            "    if (t < 0) t += 1;\n" +
                                            "    if (t > 1) t -= 1;\n" +
                                            "    if (t < 1/6) return p + (q - p) * 6 * t;\n" +
                                            "    if (t < 1/2) return q;\n" +
                                            "    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;\n" +
                                            "    return p;\n" +
                                            "}\n\n" +
                                            
                                            "function hslToRgb(h, s, l) {\n" +
                                            "    var r, g, b;\n" +
                                            "    if (s === 0) {\n" +
                                            "        r = g = b = l; // achromatic\n" +
                                            "    } else {\n" +
                                            "        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;\n" +
                                            "        var p = 2 * l - q;\n" +
                                            "        r = hue2rgb(p, q, h + 1/3);\n" +
                                            "        g = hue2rgb(p, q, h);\n" +
                                            "        b = hue2rgb(p, q, h - 1/3);\n" +
                                            "    }\n" +
                                            "    return [r, g, b, 1];\n" +
                                            "}\n\n" +
                                            
                                            "function rgbToHsl(r, g, b) {\n" +
                                            "    var max = Math.max(r, g, b), min = Math.min(r, g, b);\n" +
                                            "    var h, s, l = (max + min) / 2;\n\n" +
                                            
                                            "    if (max === min) {\n" +
                                            "        h = s = 0; // achromatic\n" +
                                            "    } else {\n" +
                                            "        var d = max - min;\n" +
                                            "        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);\n" +
                                            "        switch (max) {\n" +
                                            "            case r: h = (g - b) / d + (g < b ? 6 : 0); break;\n" +
                                            "            case g: h = (b - r) / d + 2; break;\n" +
                                            "            case b: h = (r - g) / d + 4; break;\n" +
                                            "        }\n" +
                                            "        h /= 6;\n" +
                                            "    }\n" +
                                            "    return [h, s, l];\n" +
                                            "}\n\n" +
                                            
                                            "// Apply smoother color variance\n" +
                                            "var startColorHSL, endColorHSL, startColorVar, endColorVar;\n\n" +
                                            
                                            "// Convert RGB to HSL for more natural color variation\n" +
                                            "startColorHSL = rgbToHsl(startColor[0], startColor[1], startColor[2]);\n" +
                                            "endColorHSL = rgbToHsl(endColor[0], endColor[1], endColor[2]);\n\n" +
                                            
                                            "if (colorVar > 0) {\n" +
                                            "    // Create smoother variance for each particle\n" +
                                            "    seedRandom(particleNum + 3000, true);\n" +
                                            "    var r1 = random();\n" +
                                            "    var r2 = random();\n" +
                                            "    var normalRand1 = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2) / 5;\n" +
                                            "    \n" +
                                            "    seedRandom(particleNum + 4000, true);\n" +
                                            "    var r3 = random();\n" +
                                            "    var r4 = random();\n" +
                                            "    var normalRand2 = Math.sqrt(-2 * Math.log(r3)) * Math.cos(2 * Math.PI * r4) / 5;\n" +
                                            "    \n" +
                                            "    // Vary primarily saturation and lightness, less on hue for better color coherence\n" +
                                            "    var startHVar = startColorHSL[0] + normalRand1 * colorVar * 0.3; // Subtle hue shift\n" +
                                            "    var startSVar = Math.min(Math.max(startColorHSL[1] + normalRand2 * colorVar, 0), 1);\n" +
                                            "    var startLVar = Math.min(Math.max(startColorHSL[2] + normalRand1 * colorVar, 0.1), 0.9);\n" +
                                            "    \n" +
                                            "    seedRandom(particleNum + 5000, true);\n" +
                                            "    var r5 = random();\n" +
                                            "    var r6 = random();\n" +
                                            "    var normalRand3 = Math.sqrt(-2 * Math.log(r5)) * Math.cos(2 * Math.PI * r6) / 5;\n" +
                                            "    \n" +
                                            "    var endHVar = endColorHSL[0] + normalRand3 * colorVar * 0.3; // Subtle hue shift\n" +
                                            "    var endSVar = Math.min(Math.max(endColorHSL[1] + normalRand2 * colorVar, 0), 1);\n" +
                                            "    var endLVar = Math.min(Math.max(endColorHSL[2] + normalRand3 * colorVar, 0.1), 0.9);\n" +
                                            "    \n" +
                                            "    // Normalize hue values\n" +
                                            "    startHVar = (startHVar % 1 + 1) % 1;\n" +
                                            "    endHVar = (endHVar % 1 + 1) % 1;\n" +
                                            "    \n" +
                                            "    // Convert back to RGB\n" +
                                            "    startColorVar = hslToRgb(startHVar, startSVar, startLVar);\n" +
                                            "    endColorVar = hslToRgb(endHVar, endSVar, endLVar);\n" +
                                            "    \n" +
                                            "    // Preserve alpha\n" +
                                            "    startColorVar[3] = startColor[3];\n" +
                                            "    endColorVar[3] = endColor[3];\n" +
                                            "} else {\n" +
                                            "    // Use original colors if no variance\n" +
                                            "    startColorVar = startColor;\n" +
                                            "    endColorVar = endColor;\n" +
                                            "}\n\n" +
                                            
                                            "// Custom smoothstep function for improved easing\n" +
                                            "function smootherstep(edge0, edge1, x) {\n" +
                                            "    // Scale, bias and saturate x to 0..1 range\n" +
                                            "    x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));\n" +
                                            "    // Evaluate polynomial - smoother than cubic\n" +
                                            "    return x * x * x * (x * (x * 6 - 15) + 10);\n" +
                                            "}\n\n" +
                                            
                                            "// Apply advanced easing to color transition\n" +
                                            "var t1 = 0.2;  // First control point\n" +
                                            "var t2 = 0.8;  // Second control point\n" +
                                            "var easedRatio;\n\n" +
                                            
                                            "// Apply multi-segment easing for more natural color progression\n" +
                                            "if (distRatio < t1) {\n" +
                                            "    // Ease-in segment\n" +
                                            "    easedRatio = smootherstep(0, t1, distRatio) * t1;\n" +
                                            "} else if (distRatio > t2) {\n" +
                                            "    // Ease-out segment\n" +
                                            "    easedRatio = t2 + smootherstep(t2, 1, distRatio) * (1 - t2);\n" +
                                            "} else {\n" +
                                            "    // Linear middle segment for predictable gradient\n" +
                                            "    easedRatio = t1 + (distRatio - t1) * (t2 - t1) / (t2 - t1);\n" +
                                            "}\n\n" +
                                            
                                            "// Special case for color blending - use HSL interpolation for more pleasing gradients\n" +
                                            "// Convert RGB to HSL\n" +
                                            "var hsla1 = rgbToHsl(startColorVar[0], startColorVar[1], startColorVar[2]);\n" +
                                            "var hsla2 = rgbToHsl(endColorVar[0], endColorVar[1], endColorVar[2]);\n" +
                                            "hsla1.push(startColorVar[3]); // Add alpha\n" +
                                            "hsla2.push(endColorVar[3]);\n\n" +
                                            
                                            "// Handle hue wrapping for shorter distance interpolation\n" +
                                            "if (Math.abs(hsla2[0] - hsla1[0]) > 0.5) {\n" +
                                            "    if (hsla1[0] > hsla2[0]) hsla2[0] += 1;\n" +
                                            "    else hsla1[0] += 1;\n" +
                                            "}\n\n" +
                                            
                                            "// Interpolate in HSL space\n" +
                                            "var h = (hsla1[0] + easedRatio * (hsla2[0] - hsla1[0])) % 1;\n" +
                                            "var s = hsla1[1] + easedRatio * (hsla2[1] - hsla1[1]);\n" +
                                            "var l = hsla1[2] + easedRatio * (hsla2[2] - hsla1[2]);\n" +
                                            "var a = hsla1[3] + easedRatio * (hsla2[3] - hsla1[3]);\n\n" +
                                            
                                            "// Convert back to RGB\n" +
                                            "var finalColor = hslToRgb(h, s, l);\n" +
                                            "finalColor[3] = a; // Apply interpolated alpha\n\n" +
                                            
                                            "finalColor;";
                                        
                                        // Apply the expression to the fill color
                                        fill.property("ADBE Vector Fill Color").expression = fillExpression;
                                        
                                    } catch (err) {
                                        // If there's an error with fill properties, log it but continue
                                        $.writeln("Error setting fill expression for particle " + k + ": " + err.toString());
                                        // Set a default fill color
                                        fill.property("ADBE Vector Fill Color").setValue([1, 1, 1, 1]); // White
                                    }
                                    
                                    // Set up transform properties with expressions
                                    var transformProp = particleGroup.property("Transform");
                                    if (transformProp) {
                                        // Get expressions from existing particle
                                        if (contents.property(1) && contents.property(1).property("Transform")) {
                                            var existingTransform = contents.property(1).property("Transform");
                                            
                                            try {
                                                // Position expression - with null check
                                                if (existingTransform.property("Position") && existingTransform.property("Position").expression) {
                                                    var posExpression = existingTransform.property("Position").expression;
                                                    posExpression = posExpression.replace(/var particleNum = \d+;/, "var particleNum = " + k + ";");
                                                    transformProp.property("Position").expression = posExpression;
                                                }
                                                
                                                // Scale expression - with null check
                                                if (existingTransform.property("Scale") && existingTransform.property("Scale").expression) {
                                                    var scaleExpression = existingTransform.property("Scale").expression;
                                                    scaleExpression = scaleExpression.replace(/var particleNum = \d+;/, "var particleNum = " + k + ";");
                                                    transformProp.property("Scale").expression = scaleExpression;
                                                }
                                                
                                                // Rotation expression - with null check
                                                if (existingTransform.property("Rotation") && existingTransform.property("Rotation").expression) {
                                                    var rotationExpression = existingTransform.property("Rotation").expression;
                                                    rotationExpression = rotationExpression.replace(/var particleNum = \d+;/, "var particleNum = " + k + ";");
                                                    transformProp.property("Rotation").expression = rotationExpression;
                                                }
                                                
                                                // Opacity expression - with null check
                                                if (existingTransform.property("Opacity") && existingTransform.property("Opacity").expression) {
                                                    var opacityExpression = existingTransform.property("Opacity").expression;
                                                    opacityExpression = opacityExpression.replace(/var particleNum = \d+;/, "var particleNum = " + k + ";");
                                                    transformProp.property("Opacity").expression = opacityExpression;
                                                }
                                            } catch (err) {
                                                // If any error occurs, log it but continue creating particles
                                                $.writeln("Error copying expressions for particle " + k + ": " + err.toString());
                                            }
                                        }
                                    }
                                }
                            }
                            else if (userParticleCount < currentParticleCount) {
                                // Remove excess particles
                                for (var m = currentParticleCount; m > userParticleCount; m--) {
                                    var particleName = "Particle " + m;
                                    var particleIndex = -1;
                                    
                                    // Find the particle to remove
                                    for (var n = 1; n <= contents.numProperties; n++) {
                                        if (contents.property(n).name === particleName) {
                                            particleIndex = n;
                                            break;
                                        }
                                    }
                                    
                                    if (particleIndex > 0) {
                                        contents.property(particleIndex).remove();
                                    }
                                }
                            }
                            
                            // Update the Active Particles slider to match the actual count
                            var ctrlEffect = selectedSystem.effect("Active Particles");
                            if (ctrlEffect) {
                                ctrlEffect.property("Slider").setValue(userParticleCount);
                            }
                        }
                        
                        // If shape type has changed, check if we need to update existing particles
                        if (shapeType !== currentShapeType) {
                            // TODO: Implement shape type conversion for existing particles
                            // This would be complex - for now we'll just alert the user
                            alert("Changing shape type for existing particles isn't supported yet.\nCreate a new particle system with the desired shape type.");
                        }
                        else {
                            // Update shape-specific properties for the current shape type
                            if (shapeType === "Star") {
                                var starPoints = parseInt(starPointsInput.text);
                                if (!isNaN(starPoints) && starPoints >= 3 && starPoints <= 20) {
                                    var pointsEffect = selectedSystem.effect("Points");
                                    if (pointsEffect) {
                                        pointsEffect.property("Slider").setValue(starPoints);
                                    }
                                }
                            } else if (shapeType === "Polygon") {
                                var sides = parseInt(sidesInput.text);
                                if (!isNaN(sides) && sides >= 3 && sides <= 12) {
                                    var sidesEffect = selectedSystem.effect("Sides");
                                    if (sidesEffect) {
                                        sidesEffect.property("Slider").setValue(sides);
                                    }
                                }
                            } else if (shapeType === "Rectangle") {
                                var ratio = parseFloat(ratioInput.text);
                                if (!isNaN(ratio) && ratio > 0) {
                                    var ratioEffect = selectedSystem.effect("Rectangle Width Ratio");
                                    if (ratioEffect) {
                                        ratioEffect.property("Slider").setValue(ratio);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Now update all the new UI control values to the particle system
                
                // Physics controls
                updateEffectValue(selectedSystem, "Velocity", velocityText);
                updateEffectValue(selectedSystem, "Velocity Variance", velocityVarText);
                updateEffectValue(selectedSystem, "Velocity Direction", velocityDirText, "Angle");
                updateEffectValue(selectedSystem, "Velocity Direction Variance", velocityDirVarText);
                updateEffectValue(selectedSystem, "Gravity", gravityText);
                updateEffectValue(selectedSystem, "Gravity Direction", gravityDirText, "Angle");
                updateEffectValue(selectedSystem, "Resistance", resistanceText);
                updateEffectValue(selectedSystem, "Particle Lifetime (sec)", lifetimeText);
                updateEffectValue(selectedSystem, "Emitter Width", emitterWidthText);
                updateEffectValue(selectedSystem, "Emitter Height", emitterHeightText);
                
                // Appearance controls
                updateEffectValue(selectedSystem, "Particle Size", particleSizeText);
                updateEffectValue(selectedSystem, "Size Variance", sizeVarText);
                updateEffectValue(selectedSystem, "Color Variance", colorVarText);
                updateEffectValue(selectedSystem, "Color Offset", colorOffsetText);
                updateEffectValue(selectedSystem, "Max Opacity", maxOpacityText);
                updateEffectValue(selectedSystem, "Opacity Variance", opacityVarText);
                updateEffectValue(selectedSystem, "Fade In Distance %", fadeInText);
                updateEffectValue(selectedSystem, "Fade Out Start %", fadeOutText);
                updateEffectValue(selectedSystem, "Rotation Speed", rotSpeedText);
                updateEffectValue(selectedSystem, "Rotation Speed Variance", rotSpeedVarText);
                updateEffectValue(selectedSystem, "Rotation Variance", rotVarText);
                updateEffectValue(selectedSystem, "Turbulent", turbAmountText);
                updateEffectValue(selectedSystem, "Turbulent Speed", turbSpeedText);
                
                app.endUndoGroup();
            } catch (e) {
                app.endUndoGroup(); // Ensure we end the undo group even if an error occurs
                
                // Create a more detailed error message
                var errorMsg = "Error updating particle system: " + e.toString();
                
                // Add debugging info if available
                if (e.fileName) {
                    errorMsg += "\nFile: " + e.fileName;
                }
                if (e.line) {
                    errorMsg += "\nLine: " + e.line;
                }
                
                // If it's likely a null reference error, add specific advice
                if (e.toString().indexOf("null is not an object") !== -1) {
                    errorMsg += "\n\nPossible causes:\n";
                    errorMsg += "• Control layer name mismatch\n";
                    errorMsg += "• Missing expression controller effects\n";
                    errorMsg += "• Shape type or property structure mismatch\n\n";
                    errorMsg += "Try creating a new particle system or check if the control layer (SP-ctrl) exists.";
                }
                
                alert(errorMsg);
                
                // Log the error to the console for debugging
                $.writeln("PARTICLE SYSTEM ERROR: " + e.toString());
                if (e.stack) {
                    $.writeln("Stack trace: " + e.stack);
                }
            }
        }
    }
    
    // Helper function to update effect values from UI
    function updateEffectValue(layer, effectName, textField, propertyName) {
        try {
            var effect = layer.effect(effectName);
            if (effect) {
                var value;
                if (textField.text.indexOf(".") !== -1) {
                    value = parseFloat(textField.text);
                } else {
                    value = parseInt(textField.text);
                }
                
                if (!isNaN(value)) {
                    if (propertyName && propertyName === "Angle") {
                        effect.property("Angle").setValue(value);
                    } else {
                        effect.property("Slider").setValue(value);
                    }
                }
            }
        } catch (err) {
            // Silently ignore any errors updating individual effects
            $.writeln("Error updating " + effectName + ": " + err.toString());
        }
    }
    
    // Call handle live update when UI elements change
    countSlider.onChanging = function() {
        countText.text = Math.round(this.value);
        handleLiveUpdate();
    };
    
    countText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 1 && value <= 500) {
            countSlider.value = value;
        } else {
            this.text = Math.round(countSlider.value);
        }
        handleLiveUpdate();
    };
    
    sidesInput.onChange = function() {
        handleLiveUpdate();
    };
    
    starPointsInput.onChange = function() {
        handleLiveUpdate();
    };
    
    ratioInput.onChange = function() {
        handleLiveUpdate();
    };
    
    // Automatically load settings when dropdown selection changes
    systemDropdown.onChange = function() {
        if (systemDropdown.selection.index > 0) {
            var selectedSystem = existingParticleSystems[systemDropdown.selection.index - 1];
            loadedSettings = readParticleSystemSettings(selectedSystem);
            
            // Update particle count from the loaded system
            if (loadedSettings && loadedSettings.hasOwnProperty("totalParticles")) {
                countText.text = loadedSettings.totalParticles.toString();
                countSlider.value = loadedSettings.totalParticles;
            }
            
            // Try to detect shape type from loaded settings and update dropdown
            if (loadedSettings && loadedSettings.hasOwnProperty("isStar")) {
                shapeDropdown.selection = 3; // Star
                if (loadedSettings.hasOwnProperty("Star Points")) {
                    starPointsInput.text = loadedSettings["Star Points"].toString();
                }
                polygonGroup.visible = false;
                starGroup.visible = true;
                rectangleGroup.visible = false;
            } else if (loadedSettings && loadedSettings.hasOwnProperty("isPolygon")) {
                shapeDropdown.selection = 2; // Polygon
                if (loadedSettings.hasOwnProperty("Polygon Sides")) {
                    sidesInput.text = loadedSettings["Polygon Sides"].toString();
                }
                polygonGroup.visible = true;
                starGroup.visible = false;
                rectangleGroup.visible = false;
            } else if (loadedSettings && loadedSettings.hasOwnProperty("isRectangle")) {
                shapeDropdown.selection = 1; // Rectangle
                if (loadedSettings.hasOwnProperty("Rectangle Width Ratio")) {
                    ratioInput.text = loadedSettings["Rectangle Width Ratio"].toString();
                }
                polygonGroup.visible = false;
                starGroup.visible = false;
                rectangleGroup.visible = true;
            } else {
                shapeDropdown.selection = 0; // Circle (default)
                polygonGroup.visible = false;
                starGroup.visible = false;
                rectangleGroup.visible = false;
            }
            
            // Update all UI controls with loaded settings
            
            // Update physics controls
            updateControlFromSettings("Velocity", velocitySlider, velocityText);
            updateControlFromSettings("Velocity Variance", velocityVarSlider, velocityVarText);
            updateControlFromSettings("Velocity Direction", velocityDirSlider, velocityDirText, true);
            updateControlFromSettings("Velocity Direction Variance", velocityDirVarSlider, velocityDirVarText);
            updateControlFromSettings("Gravity", gravitySlider, gravityText);
            updateControlFromSettings("Gravity Direction", gravityDirSlider, gravityDirText, true);
            updateControlFromSettings("Resistance", resistanceSlider, resistanceText);
            updateControlFromSettings("Particle Lifetime (sec)", lifetimeSlider, lifetimeText, false, "toFixed", 1);
            updateControlFromSettings("Emitter Width", emitterWidthSlider, emitterWidthText);
            updateControlFromSettings("Emitter Height", emitterHeightSlider, emitterHeightText);
            
            // Update appearance controls
            updateControlFromSettings("Particle Size", particleSizeSlider, particleSizeText);
            updateControlFromSettings("Size Variance", sizeVarSlider, sizeVarText);
            updateControlFromSettings("Color Variance", colorVarSlider, colorVarText);
            updateControlFromSettings("Color Offset", colorOffsetSlider, colorOffsetText);
            updateControlFromSettings("Max Opacity", maxOpacitySlider, maxOpacityText);
            updateControlFromSettings("Opacity Variance", opacityVarSlider, opacityVarText);
            updateControlFromSettings("Fade In Distance %", fadeInSlider, fadeInText);
            updateControlFromSettings("Fade Out Start %", fadeOutSlider, fadeOutText);
            updateControlFromSettings("Rotation Speed", rotSpeedSlider, rotSpeedText);
            updateControlFromSettings("Rotation Speed Variance", rotSpeedVarSlider, rotSpeedVarText);
            updateControlFromSettings("Rotation Variance", rotVarSlider, rotVarText);
            updateControlFromSettings("Turbulent", turbAmountSlider, turbAmountText);
            updateControlFromSettings("Turbulent Speed", turbSpeedSlider, turbSpeedText, false, "toFixed", 1);
            
            // Try to read color values
            if (loadedSettings && loadedSettings.hasOwnProperty("Start Color")) {
                startColorButton.fillBrush = startColorButton.graphics.newBrush(
                    startColorButton.graphics.BrushType.SOLID_COLOR,
                    loadedSettings["Start Color"]
                );
                startColorButton.notify("onDraw");
                startColorHexText.text = rgbToHex(loadedSettings["Start Color"]);
            }
            
            if (loadedSettings && loadedSettings.hasOwnProperty("End Color")) {
                endColorButton.fillBrush = endColorButton.graphics.newBrush(
                    endColorButton.graphics.BrushType.SOLID_COLOR,
                    loadedSettings["End Color"]
                );
                endColorButton.notify("onDraw");
                endColorHexText.text = rgbToHex(loadedSettings["End Color"]);
            }
            
        } else {
            // Reset to default if "None" is selected
            loadedSettings = null;
            countText.text = "50";
            countSlider.value = 50;
            shapeDropdown.selection = 0; // Reset to Circle
            polygonGroup.visible = false;
            rectangleGroup.visible = false;
            
            // Reset all controls to defaults
            resetControlsToDefaults();
        }
    };
    
    // Helper function to update a UI control from loaded settings
    function updateControlFromSettings(settingName, slider, textField, isAngle, formatFunc, formatParam) {
        if (loadedSettings && loadedSettings.hasOwnProperty(settingName)) {
            var value = loadedSettings[settingName];
            
            if (slider) {
                slider.value = value;
            }
            
            if (textField) {
                if (isAngle) {
                    textField.text = value;
                    
                    // Update corresponding slider if it exists
                    if (settingName === "Velocity Direction" && velocityDirSlider) {
                        velocityDirSlider.value = value;
                    } else if (settingName === "Gravity Direction" && gravityDirSlider) {
                        gravityDirSlider.value = value;
                    }
                } else if (formatFunc === "toFixed" && formatParam !== undefined) {
                    textField.text = value.toFixed(formatParam);
                } else if (typeof formatFunc === "function") {
                    textField.text = formatFunc(value, formatParam);
                } else {
                    textField.text = value.toString();
                }
            }
        }
    }
    
    // Function to reset all controls to default values
    function resetControlsToDefaults() {
        // Basic panel
        countSlider.value = 50;
        countText.text = "50";
        emissionSlider.value = 5;
        emissionText.text = "5";
        lifetimeSlider.value = 2;
        lifetimeText.text = "2.0";
        lifetimeVarSlider.value = 50;
        lifetimeVarText.text = "50";
        velocitySlider.value = 100;
        velocityText.text = "100";
        velocityVarSlider.value = 50;
        velocityVarText.text = "50";
        velocityDirSlider.value = -90;
        velocityDirText.text = "-90";
        velocityDirVarSlider.value = 10;
        velocityDirVarText.text = "10";
        gravitySlider.value = 0;
        gravityText.text = "0";
        gravityDirSlider.value = 180;
        gravityDirText.text = "180";
        
        // Physics panel
        resistanceSlider.value = 0;
        resistanceText.text = "0";
        resistanceVarSlider.value = 0;
        resistanceVarText.text = "0";
        repelSlider.value = 0;
        repelText.text = "0";
        repelRadiusSlider.value = 50;
        repelRadiusText.text = "50";
        attractSlider.value = 0;
        attractText.text = "0";
        attractRadiusSlider.value = 200;
        attractRadiusText.text = "200";
        
        // Appearance panel
        particleSizeSlider.value = 50;
        particleSizeText.text = "50";
        sizeVarSlider.value = 5;
        sizeVarText.text = "5";
        
        // Reset color buttons
        startColorButton.fillBrush = startColorButton.graphics.newBrush(
            startColorButton.graphics.BrushType.SOLID_COLOR, [1, 1, 1, 1]
        );
        startColorButton.notify("onDraw");
        startColorHexText.text = "#FFFFFF";
        
        endColorButton.fillBrush = endColorButton.graphics.newBrush(
            endColorButton.graphics.BrushType.SOLID_COLOR, [1, 1, 1, 0]
        );
        endColorButton.notify("onDraw");
        endColorHexText.text = "#FFFFFF";
        
        colorVarSlider.value = 0;
        colorVarText.text = "0";
        colorOffsetSlider.value = 20;
        colorOffsetText.text = "20";
        maxOpacitySlider.value = 100;
        maxOpacityText.text = "100";
        opacityVarSlider.value = 20;
        opacityVarText.text = "20";
        fadeInSlider.value = 10;
        fadeInText.text = "10";
        fadeOutSlider.value = 80;
        fadeOutText.text = "80";
        rotSpeedSlider.value = 0;
        rotSpeedText.text = "0";
        rotSpeedVarSlider.value = 0;
        rotSpeedVarText.text = "0";
        rotVarSlider.value = 180;
        rotVarText.text = "180";
        turbAmountSlider.value = 40;
        turbAmountText.text = "40";
        turbSpeedSlider.value = 1;
        turbSpeedText.text = "1.0";
    }
    
    // Handle OK button click
    okButton.onClick = function() {
        var userInput = parseInt(countText.text);
        if (!isNaN(userInput) && userInput > 0 && userInput <= 200) {
            particleCount = userInput;
            
            // Get shape type from dropdown
            var shapeType = shapeDropdown.selection.text;
            
            // Validate shape-specific parameters
            if (shapeType === "Star") {
                var points = parseInt(starPointsInput.text);
                if (!isNaN(points) && points >= 3 && points <= 20) {
                    // Store star points in settings
                    if (!loadedSettings) loadedSettings = {};
                    loadedSettings.isStar = true;
                    loadedSettings["Star Points"] = points;
                } else {
                    alert("Please enter a valid number of star points (3-20).");
                    return;
                }
            } else if (shapeType === "Polygon") {
                var sides = parseInt(sidesInput.text);
                if (!isNaN(sides) && sides >= 3 && sides <= 16) {
                    // Store polygon sides in settings
                    if (!loadedSettings) loadedSettings = {};
                    loadedSettings.isPolygon = true;
                    loadedSettings["Polygon Sides"] = sides;
                } else {
                    alert("Please enter a valid number of polygon sides (3-16).");
                    return;
                }
            } else if (shapeType === "Rectangle") {
                var ratio = parseFloat(ratioInput.text);
                if (!isNaN(ratio) && ratio > 0 && ratio <= 10) {
                    // Store rectangle ratio in settings
                    if (!loadedSettings) loadedSettings = {};
                    loadedSettings.isRectangle = true;
                    loadedSettings["Rectangle Width Ratio"] = ratio;
                } else {
                    alert("Please enter a valid rectangle ratio greater than 0 and less than or equal to 10.");
                    return;
                }
            }
            
            createParticleSystem();
        } else {
            alert("Please enter a valid number between 1 and 200.");
        }
    };
    
    // Handle Cancel button click
    cancelButton.onClick = function() {
        dialog.close();
    };
    
    // Function to create the particle system
    function createParticleSystem() {
        app.beginUndoGroup("Create Particle System");

        try {
            // Generate a unique number for the layer names
            var instanceNum = 1;
            while (hasLayerName("Shape Particles " + instanceNum, activeComp)) {
                instanceNum++;
            }
            
            // First create shape layer for the particles
            var particleLayer = activeComp.layers.addShape();
            particleLayer.name = "Shape Particles " + instanceNum;
            
            // Set the particle layer position to comp center initially
            particleLayer.property("Position").setValue([activeComp.width/2, activeComp.height/2]);
            
            // Then create control layer
            var controlLayer = createControlLayer(activeComp, instanceNum);
            
            // Add suffix to layer name to indicate shape type (for expressions to reference)
            var shapeType = shapeDropdown.selection.text;
            if (shapeType === "Star") {
                controlLayer.name = "SP-ctrl " + instanceNum + " [Star]";
            } else if (shapeType === "Polygon") {
                controlLayer.name = "SP-ctrl " + instanceNum + " [Polygon]";
            } else if (shapeType === "Rectangle") {
                controlLayer.name = "SP-ctrl " + instanceNum + " [Rectangle]";
            } else {
                controlLayer.name = "SP-ctrl " + instanceNum + " [Circle]";
            }
            
            // Link SP-ctrl layer position to particle layer initially
            controlLayer.property("Position").expression = 
                "thisComp.layer(\"Shape Particles " + instanceNum + "\").transform.position";
                
            // After creation, switch the expression to have particles follow the control
            particleLayer.property("Position").expression = 
                "thisComp.layer(\"" + controlLayer.name + "\").transform.position";
                
            // Remove the expression from control layer after initial positioning
            controlLayer.property("Position").expression = "";
            
            // Add effect controls to the control layer
            addParticleControls(controlLayer, particleCount, shapeType);
            
            // Apply loaded settings if available
            if (loadedSettings) {
                applyParticleSystemSettings(controlLayer, loadedSettings);
            }

            // Create particle system with selected shape
            createParticles(particleLayer, instanceNum, particleCount, shapeType);
            
            // Add the new system to our dropdown and update the UI
            existingParticleSystems = findExistingParticleSystems(activeComp);
            systemDropdown.removeAll();
            systemDropdown.add("item", "None");
            
            // Add all existing particle systems to dropdown
            for (var i = 0; i < existingParticleSystems.length; i++) {
                systemDropdown.add("item", existingParticleSystems[i].name);
            }
            
            // Select the newly created system
            for (var i = 1; i <= systemDropdown.items.length; i++) {
                if (systemDropdown.items[i-1].text === controlLayer.name) {
                    systemDropdown.selection = i-1;
                    break;
                }
            }

        } catch (e) {
            alert("Error creating particle system: " + e.toString());
        } finally {
            app.endUndoGroup();
        }
    }
    
    
    // Helper function to check if a layer name already exists
    function hasLayerName(name, comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) {
                return true;
            }
        }
        return false;
    }
    
    // Function to find existing particle systems in the composition
    function findExistingParticleSystems(comp) {
        var systems = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            
            // Check if it's a shape layer with SP-ctrl naming pattern
            if (layer.name.indexOf("SP-ctrl") === 0) {
                systems.push(layer);
            }
        }
        return systems;
    }
    
    // Function to check if a selected layer is a particle system control layer and select it in the dropdown
    function selectParticleSystemFromSelectedLayer() {
        try {
            // Check if there's an active composition
            if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
                return;
            }
            
            var comp = app.project.activeItem;
            
            // Check if there are selected layers
            if (comp.selectedLayers.length === 0) {
                return;
            }
            
            // Get the first selected layer
            var selectedLayer = comp.selectedLayers[0];
            
            // Check if the selected layer is a particle system control layer
            if (selectedLayer.name.indexOf("SP-ctrl") === 0) {
                // Find this layer in existingParticleSystems
                existingParticleSystems = findExistingParticleSystems(comp);
                
                // Update the systemDropdown with the current systems
                systemDropdown.removeAll();
                systemDropdown.add("item", "None");
                
                for (var i = 0; i < existingParticleSystems.length; i++) {
                    systemDropdown.add("item", existingParticleSystems[i].name);
                    
                    // If this is the selected layer, select it in the dropdown
                    if (existingParticleSystems[i].name === selectedLayer.name) {
                        systemDropdown.selection = i + 1; // +1 because "None" is at index 0
                        
                        // Also update the UI based on the selected system
                        var settings = readParticleSystemSettings(selectedLayer);
                        loadedSettings = settings;
                        
                        // Update particle count
                        countText.text = settings.totalParticles;
                        countSlider.value = settings.totalParticles;
                        
                        // Update shape type dropdown
                        if (settings.isStar) {
                            shapeDropdown.selection = 3; // Star
                            rectangleGroup.visible = false;
                            polygonGroup.visible = false;
                        } else if (settings.isPolygon) {
                            shapeDropdown.selection = 2; // Polygon
                            rectangleGroup.visible = false;
                            polygonGroup.visible = true;
                        } else if (settings.isRectangle) {
                            shapeDropdown.selection = 1; // Rectangle
                            rectangleGroup.visible = true;
                            polygonGroup.visible = false;
                        } else {
                            shapeDropdown.selection = 0; // Circle
                            rectangleGroup.visible = false;
                            polygonGroup.visible = false;
                        }
                    }
                }
            }
        } catch (e) {
            // Silent failure - don't disturb the user if something goes wrong here
        }
    }
    
    // Function to check if layer has particle system controls
    function hasParticleSystemControls(layer) {
        try {
            // Look for characteristic effects of our particle system
            return (layer.effect("Particle Lifetime (sec)") !== null && 
                   layer.effect("Rotation Variance") !== null);
        } catch (e) {
            return false;
        }
    }
    
    // Function to read settings from an existing particle system
    function readParticleSystemSettings(layer) {
        var settings = {
            totalParticles: 50 // Default
        };
        
        try {
            // Read particle count from the Active Particles slider
            var activeParticles = layer.effect("Active Particles");
            if (activeParticles) {
                settings.totalParticles = activeParticles.property("Slider").value;
            }
            
            // Detect shape type from layer name
            if (layer.name.indexOf("[Star]") !== -1) {
                settings.isStar = true;
            } else if (layer.name.indexOf("[Polygon]") !== -1) {
                settings.isPolygon = true;
            } else if (layer.name.indexOf("[Rectangle]") !== -1) {
                settings.isRectangle = true;
            }
            
            // Read other settings - focus on the most important ones with corrected names
            var effectsToRead = [
                "Position Offset", "Color Offset", "Fade In Distance %", "Fade Out Start %",
                "Rotation Variance", "Emitter Width", "Emitter Height", 
                "Particle Lifetime (sec)", "Particle Size", "Size Variance", 
                "Velocity", "Velocity Variance", "Velocity Direction", 
                "Velocity Direction Variance", "Gravity", "Gravity Direction", 
                "Resistance", "Max Opacity", "Opacity Variance",
                "Start Color", "End Color", "Color Variance", 
                "Turbulent Speed", "Turbulent", "Rotation Speed", "Rotation Speed Variance",
                // Shape-specific properties
                "Rectangle Width Ratio", "Rectangle Ratio Variance", "Rectangle Roundness",
                "Rectangle Pulsate", // New Rectangle slider
                // Polygon properties
                "Sides", "Radius", "Roundness", "Shape Rotation",
                "Polygon Spin Rate", // New Polygon slider
                // Star properties
                "Points", "Outer Radius", "Inner Radius", "Outer Roundness", "Inner Roundness",
                "Star Point Wave", // New Star slider
                // Circle properties
                "Circle Ripple" // New Circle slider
            ];
            
            // Read each effect with better error handling
            for (var i = 0; i < effectsToRead.length; i++) {
                var effectName = effectsToRead[i];
                try {
                    var effect = layer.effect(effectName);
                    
                    if (effect) {
                        // Handle different property types accordingly
                        if (effectName === "Start Color" || 
                            effectName === "End Color") {
                            // These are multi-dimensional values
                            settings[effectName] = effect.property(1).value;
                        } else if (effectName === "Velocity Direction" || 
                                  effectName === "Gravity Direction" ||
                                  effectName === "Shape Rotation") {
                            // These are angle values
                            settings[effectName] = effect.property("Angle").value;
                        } else {
                            // Most effects are sliders
                            settings[effectName] = effect.property("Slider").value;
                        }
                    }
                } catch (effectError) {
                    // Skip this effect if there's an error
                    // This prevents one missing/invalid effect from breaking the entire function
                }
            }
        } catch (e) {
            alert("Error reading settings: " + e.toString());
        }
        
        return settings;
    }
    
    // Function to apply settings to a new particle system
    function applyParticleSystemSettings(layer, settings) {
        try {
            // Apply each setting to the appropriate effect
            for (var key in settings) {
                if (key === "totalParticles" || key === "isStar" || 
                    key === "isPolygon" || key === "isRectangle") {
                    // Skip - these are special properties, not effects
                    continue;
                }
                
                try {
                    var effect = layer.effect(key);
                    if (effect) {
                        if (key === "Start Color" || 
                            key === "End Color") {
                            // These are multi-dimensional values
                            effect.property(1).setValue(settings[key]);
                        } else if (key === "Velocity Direction" || 
                                key === "Gravity Direction" ||
                                key === "Shape Rotation") {
                            // These are angle values
                            effect.property("Angle").setValue(settings[key]);
                        } else {
                            // Most effects are sliders
                            effect.property("Slider").setValue(settings[key]);
                        }
                    }
                } catch (settingError) {
                    // Skip this setting if there's an error
                    // This allows the function to continue applying other valid settings
                }
            }
        } catch (e) {
            alert("Error applying settings: " + e.toString());
        }
    }
    
    // Function to create control layer
    function createControlLayer(comp, instanceNum) {
        // Create a shape layer for visualization and controls
        var controlLayer = comp.layers.addShape();
        controlLayer.name = "SP-ctrl " + instanceNum;
        controlLayer.guideLayer = true; // Make it a guide layer
        
        // Add a rectangle shape for emitter area visualization
        var rectGroup = controlLayer.property("Contents").addProperty("ADBE Vector Group");
        rectGroup.name = "Emitter Area";
        
        var rect = rectGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
        rect.name = "Rectangle";
        
        // Size linked to emitter width and height on the control layer (self-reference)
        rect.property("ADBE Vector Rect Size").expression = 
            "w = effect(\"Emitter Width\")(\"Slider\");\n" +
            "h = effect(\"Emitter Height\")(\"Slider\");\n" +
            "[w, h]";
        
        // Add stroke
        var stroke = rectGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
        stroke.name = "Outline";
        stroke.property("ADBE Vector Stroke Width").setValue(2);
        stroke.property("ADBE Vector Stroke Color").setValue([1, 1, 0, 1]); // Yellow
        
        // Make stroke dashed
        stroke.property("ADBE Vector Stroke Line Cap").setValue(2); // Round cap
        stroke.property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Dash 1").setValue(10);
        stroke.property("ADBE Vector Stroke Dashes").addProperty("ADBE Vector Stroke Gap 1").setValue(10);
        
        // Add fill
        var fill = rectGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Area Fill";
        fill.property("ADBE Vector Fill Color").setValue([1, 1, 0, 1]); // Yellow
        fill.property("ADBE Vector Fill Opacity").setValue(15); // Very transparent
        
        // Hide when width and height are both 0
        rectGroup.property("Transform").property("Opacity").expression = 
            "w = effect(\"Emitter Width\")(\"Slider\");\n" +
            "h = effect(\"Emitter Height\")(\"Slider\");\n" +
            "(w == 0 && h == 0) ? 0 : 100;";
            
        return controlLayer;
    }

    // Function to add effect controls to the layer
    function addParticleControls(layer, maxParticles, shapeType) {
        // Add the new Active Particles control at the top for visibility
        var activeParticles = layer.Effects.addProperty("ADBE Slider Control");
        activeParticles.name = "Active Particles";
        activeParticles.property("Slider").setValue(maxParticles); // Default to all particles without keyframe
        
        // Set slider range
        var sliderProperty = activeParticles.property("Slider");
        sliderProperty.minimum = 0;
        sliderProperty.maximum = maxParticles;
        
        // Add shape-specific controls
        if (shapeType === "Rectangle") {
            // Add rectangle specific controls
            var rectWidthRatio = layer.Effects.addProperty("ADBE Slider Control");
            rectWidthRatio.name = "Rectangle Width Ratio";
            rectWidthRatio.property("Slider").setValue(loadedSettings && loadedSettings["Rectangle Width Ratio"] ? 
                loadedSettings["Rectangle Width Ratio"] : 1); // Default equal width/height
                var sliderProperty = rectWidthRatio.property("Slider");
sliderProperty.minimum = 0.01;
sliderProperty.maximum = 10;
            
            var rectRatioVariance = layer.Effects.addProperty("ADBE Slider Control");
            rectRatioVariance.name = "Rectangle Ratio Variance";
            rectRatioVariance.property("Slider").setValue(loadedSettings && loadedSettings["Rectangle Ratio Variance"] ? 
                loadedSettings["Rectangle Ratio Variance"] : 0); // Default no variance
            
            var rectRoundness = layer.Effects.addProperty("ADBE Slider Control");
            rectRoundness.name = "Rectangle Roundness";
            rectRoundness.property("Slider").setValue(0); // Default no roundness
            
            // Add new Rectangle-specific movement slider
            var rectPulsate = layer.Effects.addProperty("ADBE Slider Control");
            rectPulsate.name = "Rectangle Pulsate";
            rectPulsate.property("Slider").setValue(0); // Default no pulsate effect
            var sliderProperty = rectPulsate.property("Slider");
            sliderProperty.minimum = 0;
            sliderProperty.maximum = 100;
        }
        else if (shapeType === "Polygon") {
            // Add polygon specific controls
            var polySides = layer.Effects.addProperty("ADBE Slider Control");
            polySides.name = "Sides";
            polySides.property("Slider").setValue(loadedSettings && loadedSettings["Polygon Sides"] ? 
                loadedSettings["Polygon Sides"] : 5); // Default pentagon
                var sliderProperty = polySides.property("Slider");
sliderProperty.minimum = 3;
sliderProperty.maximum = 24;
            
            var polyRadius = layer.Effects.addProperty("ADBE Slider Control");
            polyRadius.name = "Radius";
            polyRadius.property("Slider").setValue(10); // Base size, will be scaled
            
            var polyRoundness = layer.Effects.addProperty("ADBE Slider Control");
            polyRoundness.name = "Roundness";
            polyRoundness.property("Slider").setValue(0); // Default sharp corners
            
            var polyRotation = layer.Effects.addProperty("ADBE Angle Control");
            polyRotation.name = "Shape Rotation";
            polyRotation.property("Angle").setValue(0); // Default no rotation
            
            // Add new Polygon-specific movement slider
            var polySpinRate = layer.Effects.addProperty("ADBE Slider Control");
            polySpinRate.name = "Polygon Spin Rate";
            polySpinRate.property("Slider").setValue(0); // Default no spin
            var sliderProperty = polySpinRate.property("Slider");
            sliderProperty.minimum = -100;
            sliderProperty.maximum = 100;
        }
        else if (shapeType === "Star") {
            // Add star specific controls
            var starPoints = layer.Effects.addProperty("ADBE Slider Control");
            starPoints.name = "Points";
            starPoints.property("Slider").setValue(loadedSettings && loadedSettings["Star Points"] ? 
                loadedSettings["Star Points"] : 5); // Default 5 points
                var sliderProperty = starPoints.property("Slider");
sliderProperty.minimum = 3;
sliderProperty.maximum = 32;
            
            var starOuterRadius = layer.Effects.addProperty("ADBE Slider Control");
            starOuterRadius.name = "Outer Radius";
            starOuterRadius.property("Slider").setValue(10); // Base size, will be scaled
            
            var starInnerRadius = layer.Effects.addProperty("ADBE Slider Control");
            starInnerRadius.name = "Inner Radius";
            starInnerRadius.property("Slider").setValue(5); // Default half of outer radius
            
            var starOuterRoundness = layer.Effects.addProperty("ADBE Slider Control");
            starOuterRoundness.name = "Outer Roundness";
            starOuterRoundness.property("Slider").setValue(0); // Default sharp corners
            
            var starInnerRoundness = layer.Effects.addProperty("ADBE Slider Control");
            starInnerRoundness.name = "Inner Roundness";
            starInnerRoundness.property("Slider").setValue(0); // Default sharp corners
            
            var starRotation = layer.Effects.addProperty("ADBE Angle Control");
            starRotation.name = "Shape Rotation";
            starRotation.property("Angle").setValue(0); // Default no rotation
            
            // Add new Star-specific movement slider
            var starPointWave = layer.Effects.addProperty("ADBE Slider Control");
            starPointWave.name = "Star Point Wave";
            starPointWave.property("Slider").setValue(0); // Default no wave effect
            var sliderProperty = starPointWave.property("Slider");
            sliderProperty.minimum = 0;
            sliderProperty.maximum = 100;
        }
        else if (shapeType === "Circle") {
            // Add new Circle-specific slider since Circle doesn't have any specific controls
            var circleRipple = layer.Effects.addProperty("ADBE Slider Control");
            circleRipple.name = "Circle Ripple";
            circleRipple.property("Slider").setValue(0); // Default no ripple effect
            var sliderProperty = circleRipple.property("Slider");
            sliderProperty.minimum = 0;
            sliderProperty.maximum = 100;
        }
        
        // Add offset spread controls
        var positionOffset = layer.Effects.addProperty("ADBE Slider Control");
        positionOffset.name = "Position Offset";
        positionOffset.property("Slider").setValue(100); // Default 100% spread
        
        var colorOffset = layer.Effects.addProperty("ADBE Slider Control");
        colorOffset.name = "Color Offset";
        colorOffset.property("Slider").setValue(20); // Default 20% spread
        
        // Add fade in percentage control
        var fadeInPercentage = layer.Effects.addProperty("ADBE Slider Control");
        fadeInPercentage.name = "Fade In Distance %";
        fadeInPercentage.property("Slider").setValue(10); // Default 10% of max distance
        
        // Add fade out percentage control
        var fadeOutPercentage = layer.Effects.addProperty("ADBE Slider Control");
        fadeOutPercentage.name = "Fade Out Start %";
        fadeOutPercentage.property("Slider").setValue(80); // Default 80% of max distance
        
        // Add turbulence controls
        var turbulentSpeed = layer.Effects.addProperty("ADBE Slider Control");
        turbulentSpeed.name = "Turbulent Speed";
        turbulentSpeed.property("Slider").setValue(1); // Default 1 Hz
        
        var turbulentAmount = layer.Effects.addProperty("ADBE Slider Control");
        turbulentAmount.name = "Turbulent";
        turbulentAmount.property("Slider").setValue(40); // Default 40 pixels
        
        // Add rotation variance control (repurposed for initial rotation)
        var rotationVariance = layer.Effects.addProperty("ADBE Slider Control");
        rotationVariance.name = "Rotation Variance";
        rotationVariance.property("Slider").setValue(180); // Default 180 degrees variance
        
        // Add rotation speed control
        var rotationSpeed = layer.Effects.addProperty("ADBE Slider Control");
        rotationSpeed.name = "Rotation Speed";
        rotationSpeed.property("Slider").setValue(0); // Default 0 degrees per second
        
        // Add rotation speed variance control
        var rotationSpeedVariance = layer.Effects.addProperty("ADBE Slider Control");
        rotationSpeedVariance.name = "Rotation Speed Variance";
        rotationSpeedVariance.property("Slider").setValue(0); // Default 0 degrees variance
        
        // Emitter area controls
        var emitterWidth = layer.Effects.addProperty("ADBE Slider Control");
        emitterWidth.name = "Emitter Width";
        emitterWidth.property("Slider").setValue(0); // Default to point emitter
        
        var emitterHeight = layer.Effects.addProperty("ADBE Slider Control");
        emitterHeight.name = "Emitter Height";
        emitterHeight.property("Slider").setValue(0); // Default to point emitter
        
        // Basic particle properties
        var particleLifetime = layer.Effects.addProperty("ADBE Slider Control");
        particleLifetime.name = "Particle Lifetime (sec)";
        particleLifetime.property("Slider").setValue(4);

        var particleSize = layer.Effects.addProperty("ADBE Slider Control");
        particleSize.name = "Particle Size";
        particleSize.property("Slider").setValue(10);

        var particleSizeVariance = layer.Effects.addProperty("ADBE Slider Control");
        particleSizeVariance.name = "Size Variance";
        particleSizeVariance.property("Slider").setValue(5);

        // Velocity and direction controls
        var velocityMagnitude = layer.Effects.addProperty("ADBE Slider Control");
        velocityMagnitude.name = "Velocity";
        velocityMagnitude.property("Slider").setValue(100);

        var velocityVariance = layer.Effects.addProperty("ADBE Slider Control");
        velocityVariance.name = "Velocity Variance";
        velocityVariance.property("Slider").setValue(50);
        
        var velocityDirection = layer.Effects.addProperty("ADBE Angle Control");
        velocityDirection.name = "Velocity Direction";
        velocityDirection.property("Angle").setValue(0);
        
        var velocityDirectionVariance = layer.Effects.addProperty("ADBE Slider Control");
        velocityDirectionVariance.name = "Velocity Direction Variance";
        velocityDirectionVariance.property("Slider").setValue(10);
        
        // Gravity controls
        var gravity = layer.Effects.addProperty("ADBE Slider Control");
        gravity.name = "Gravity";
        gravity.property("Slider").setValue(98);
        
        var gravityDirection = layer.Effects.addProperty("ADBE Angle Control");
        gravityDirection.name = "Gravity Direction";
        gravityDirection.property("Angle").setValue(180);
        
        // Add resistance control
        var resistance = layer.Effects.addProperty("ADBE Slider Control");
        resistance.name = "Resistance";
        resistance.property("Slider").setValue(0);
        
        // Opacity controls
        var maxOpacity = layer.Effects.addProperty("ADBE Slider Control");
        maxOpacity.name = "Max Opacity";
        maxOpacity.property("Slider").setValue(100);
        
        var opacityVariance = layer.Effects.addProperty("ADBE Slider Control");
        opacityVariance.name = "Opacity Variance";
        opacityVariance.property("Slider").setValue(20);

        // Color controls
        var startColor = layer.Effects.addProperty("ADBE Color Control");
        startColor.name = "Start Color";
        startColor.property("Color").setValue([1, 1, 1, 1]); // White

        var endColor = layer.Effects.addProperty("ADBE Color Control");
        endColor.name = "End Color";
        endColor.property("Color").setValue([1, 1, 1, 0]); // Transparent white
        
        // Add color variation controls
        var colorVariance = layer.Effects.addProperty("ADBE Slider Control");
        colorVariance.name = "Color Variance";
        colorVariance.property("Slider").setValue(0);
    }

    // Function to create particles with Scale-based sizing and support for multiple shape types
    function createParticles(layer, instanceNum, count, shapeType) {
        // Create individual particle groups
        for (var i = 1; i <= count; i++) {
            var particleGroup = layer.property("Contents").addProperty("ADBE Vector Group");
            particleGroup.name = "Particle " + i;
            
            // Add shape based on the selected shape type
            var shape;
            
            if (shapeType === "Circle") {
                // Add ellipse shape
                shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
                shape.name = "Circle";
                shape.property("ADBE Vector Ellipse Size").setValue([10, 10]);
                
                // Add expression for ripple effect using new Circle Ripple slider
                shape.property("ADBE Vector Ellipse Size").expression = 
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Circle]\");\n" +
                    "var rippleAmount = ctrlLayer.effect(\"Circle Ripple\")(\"Slider\");\n" +
                    "var particleSize = ctrlLayer.effect(\"Particle Size\")(\"Slider\");\n\n" +
                    
                    "// Generate a seed for this particle\n" +
                    "seedRandom(" + i + " + 3333, true);\n" +
                    "var offset = random(0, 100);\n\n" +
                    
                    "// Create ripple effect if enabled\n" +
                    "var size = particleSize;\n" +
                    "if (rippleAmount > 0) {\n" +
                    "    // Apply sine wave to create ripple\n" +
                    "    var rippleFactor = 1 + (Math.sin(time * 3 + offset) * (rippleAmount/100) * 0.5);\n" +
                    "    size = particleSize * rippleFactor;\n" +
                    "}\n\n" +
                    
                    "[size, size];";
            }
            else if (shapeType === "Rectangle") {
                // Add rectangle shape
                shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
                shape.name = "Rectangle";
                
                // Set base size and link width/height ratio to control
                shape.property("ADBE Vector Rect Size").expression = 
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Rectangle]\");\n" +
                    "var baseRatio = ctrlLayer.effect(\"Rectangle Width Ratio\")(\"Slider\");\n" +
                    "var ratioVar = ctrlLayer.effect(\"Rectangle Ratio Variance\")(\"Slider\");\n" +
                    "var pulsateAmount = ctrlLayer.effect(\"Rectangle Pulsate\")(\"Slider\");\n\n" +
                    
                    "// Generate a unique random ratio if variance is > 0\n" +
                    "var finalRatio = baseRatio;\n" +
                    "if (ratioVar > 0) {\n" +
                    "    // Use normal distribution for more natural randomness\n" +
                    "    // Create a unique seed for this particle\n" +
                    "    seedRandom(" + i + " + 6500, true);\n" +
                    "    var u1 = Math.max(0.0001, random()); // Ensure non-zero\n" +
                    "    var u2 = random();\n" +
                    "    \n" +
                    "    // Box-Muller transform for normal distribution\n" +
                    "    var z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);\n" +
                    "    \n" +
                    "    // Scale to variance (z is roughly in range -3 to 3 in normal distribution)\n" +
                    "    var ratioVariation = z * (ratioVar / 3);\n" +
                    "    \n" +
                    "    // Apply variation but ensure ratio stays positive\n" +
                    "    finalRatio = Math.max(0.1, baseRatio + ratioVariation);\n" +
                    "}\n\n" +
                    
                    "// Add pulsate effect if enabled\n" +
                    "if (pulsateAmount > 0) {\n" +
                    "    // Create a unique offset for this particle\n" +
                    "    seedRandom(" + i + " + 7777, true);\n" +
                    "    var offset = random(0, 100);\n" +
                    "    \n" +
                    "    // Modify ratio with sine wave\n" +
                    "    var pulsateFactor = Math.sin(time * 2 + offset) * (pulsateAmount/100) * 0.5;\n" +
                    "    finalRatio = finalRatio * (1 + pulsateFactor);\n" +
                    "}\n\n" +
                    
                    "[10 * finalRatio, 10];";
                
                // Link roundness to control
                shape.property("ADBE Vector Rect Roundness").expression = 
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Rectangle]\");\n" +
                    "ctrlLayer.effect(\"Rectangle Roundness\")(\"Slider\");";
            }
            else if (shapeType === "Polygon") {
                // Create the star shape as a polygon
                shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
                shape.name = "Polygon";
                
                // Immediately set properties in a simple, direct way without expressions first
                try {
                    // Set to polygon mode (not star)
                    shape.property("ADBE Vector Star Type").setValue(2); // 2 = Polygon
                    
                    // Set default points (5 sides)
                    shape.property("ADBE Vector Star Points").setValue(5);
                    
                    // Set fixed size 
                    shape.property("ADBE Vector Star Outer Radius").setValue(10);

                    // Set default roundness (0)
                    shape.property("ADBE Vector Star Outer Roundess").setValue(0);
                    
                    // Now add the expressions for dynamic control - match the reference script property names
                    shape.property("ADBE Vector Star Points").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                        "Math.max(3, Math.round(ctrlLayer.effect(\"Sides\")(\"Slider\")));";
                    
                    shape.property("ADBE Vector Star Outer Radius").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                        "ctrlLayer.effect(\"Radius\")(\"Slider\");";
                    
                    // Updated roundness expression with correct syntax and dynamic layer reference
                    shape.property("ADBE Vector Star Outer Roundess").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                        "ctrlLayer.effect(\"Roundness\")(\"Slider\");"; 

                    // For rotation, use the new spin rate slider
                    shape.property("ADBE Vector Star Rotation").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Polygon]\");\n" +
                        "var baseRotation = ctrlLayer.effect(\"Shape Rotation\")(\"Angle\");\n" +
                        "var spinRate = ctrlLayer.effect(\"Polygon Spin Rate\")(\"Slider\");\n\n" +
                        
                        "// Create individual spin offset\n" +
                        "seedRandom(" + i + " + 8888, true);\n" +
                        "var spinOffset = random(-0.5, 0.5);\n\n" +
                        
                        "// Calculate rotation based on spin rate\n" +
                        "var rotationValue = baseRotation;\n" +
                        "if (spinRate != 0) {\n" +
                        "    // Add spinning motion\n" +
                        "    rotationValue += time * spinRate * (1 + spinOffset);\n" +
                        "}\n\n" +
                        
                        "rotationValue;";

                } catch (e) {
                    alert("Error: " + e.message);
                }
            }
            else if (shapeType === "Star") {
                // Create the star shape
                shape = particleGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
                shape.name = "Star";
                
                // Immediately set properties in a simple, direct way without expressions first
                try {
                    // Set to star mode
                    shape.property("ADBE Vector Star Type").setValue(1); // 1 = Star
                    
                    // Set default points (5 points)
                    shape.property("ADBE Vector Star Points").setValue(5);
                    
                    // Set default sizes 
                    shape.property("ADBE Vector Star Outer Radius").setValue(10);
                    shape.property("ADBE Vector Star Inner Radius").setValue(5);
                    
                    // Now add the expressions for dynamic control - match the reference script property names
                    shape.property("ADBE Vector Star Points").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                        "Math.max(3, Math.round(ctrlLayer.effect(\"Points\")(\"Slider\")));";
                    
                    shape.property("ADBE Vector Star Outer Radius").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                        "ctrlLayer.effect(\"Outer Radius\")(\"Slider\");";
                    
                    shape.property("ADBE Vector Star Inner Radius").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                        "var baseRadius = ctrlLayer.effect(\"Inner Radius\")(\"Slider\");\n" +
                        "var waveAmount = ctrlLayer.effect(\"Star Point Wave\")(\"Slider\");\n\n" +
                        
                        "// Create individual wave offset\n" +
                        "seedRandom(" + i + " + 9999, true);\n" +
                        "var offset = random(0, 10);\n\n" +
                        
                        "// Add wave effect to inner radius\n" +
                        "var finalRadius = baseRadius;\n" +
                        "if (waveAmount > 0) {\n" +
                        "    var waveFactor = Math.sin(time * 3 + offset) * (waveAmount/100) * 0.8;\n" +
                        "    finalRadius = baseRadius * (1 + waveFactor);\n" +
                        "}\n\n" +
                        
                        "finalRadius;";
                    
                    // Updated expressions for roundness controls with correct match names
                    shape.property("ADBE Vector Star Outer Roundess").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                        "ctrlLayer.effect(\"Outer Roundness\")(\"Slider\");"; 

                    shape.property("ADBE Vector Star Inner Roundess").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                        "ctrlLayer.effect(\"Inner Roundness\")(\"Slider\");";

                    // For rotation
                    shape.property("ADBE Vector Star Rotation").expression = 
                        "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum + " [Star]\");\n" +
                        "ctrlLayer.effect(\"Shape Rotation\")(\"Angle\");";
                } catch (e) {
                    alert("Error: " + e.message);
                }
            }
            
            // Add fill to each individual particle
            var fill = particleGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
            fill.name = "Particle " + i + " Fill";
            
            // Enhanced color expression with improved gradient transitions
            var fillExpression = "// Advanced color expression with smoother transition logic\n" +
                "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum;
                
            // Add shape type suffix to layer name
            if (shapeType === "Circle") {
                fillExpression += " [Circle]";
            } else if (shapeType === "Rectangle") {
                fillExpression += " [Rectangle]";
            } else if (shapeType === "Polygon") {
                fillExpression += " [Polygon]";
            } else if (shapeType === "Star") {
                fillExpression += " [Star]";
            }
                
            fillExpression += "\");\n" +
                "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                "var particleNum = " + i + ";\n\n" +
                
                "// Get color parameters\n" +
                "var startColor = ctrlLayer.effect(\"Start Color\")(\"Color\");\n" +
                "var endColor = ctrlLayer.effect(\"End Color\")(\"Color\");\n" +
                "var colorVar = ctrlLayer.effect(\"Color Variance\")(\"Slider\") / 100;\n" +
                "var colorOffset = ctrlLayer.effect(\"Color Offset\")(\"Slider\") / 100;\n" +
                "var emitterPos = [0, 0]; // Use origin instead of emitter position\n" +
                "var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n\n" +
                
                "// Get physics parameters to calculate max travel distance\n" +
                "var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                "var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                "var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
                
                "// Calculate max travel distance based on physics\n" +
                "var maxDistance;\n" +
                "if (resistance > 0) {\n" +
                "    // With resistance, the max distance is limited\n" +
                "    // Using velocity/resistance as distance limit with terminal velocity\n" +
                "    var terminalTime = 5 / resistance; // Time to reach ~99% of terminal velocity\n" +
                "    var effectiveTime = Math.min(lifetime, terminalTime);\n" +
                "    maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
                "    \n" +
                "    // Add gravity contribution with resistance\n" +
                "    if (gravity > 0) {\n" +
                "        maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
                "    }\n" +
                "} else {\n" +
                "    // Without resistance, simple physics formula\n" +
                "    // d = vt + 0.5at²\n" +
                "    maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
                "}\n" +
                "\n" +
                "// Ensure minimum distance for visibility\n" +
                "maxDistance = Math.max(100, maxDistance);\n\n" +
                
                "// Make a unique random seed for this particle\n" +
                "seedRandom(particleNum, true);\n" +
                
                "// Generate offset for this particle (affects timing and visual effects)\n" +
                "var timeOffset = colorOffset > 0 ? random(0, lifetime * colorOffset) : 0;\n" +
                "var t = (time + timeOffset) % lifetime;\n\n" +
                
                "// Get the birth position\n" +
                "var birthX = emitterPos[0];\n" +
                "var birthY = emitterPos[1];\n\n" +
                
                "// Get the current position from the parent group's position\n" +
                "try {\n" +
                "    // First get the layer and parent group name\n" +
                "    var layerName = thisLayer.name;\n" +
                "    var groupName = thisProperty.propertyGroup(3).name; // Go up to get the particle group\n" +
                "    \n" +
                "    // Access the position of this particle group\n" +
                "    var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
                "    var currentX = currentPos[0];\n" +
                "    var currentY = currentPos[1];\n" +
                "} catch(err) {\n" +
                "    // Fallback to using a simple approximation based on physics if we can't get position\n" +
                "    var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                "    var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                "    \n" +
                "    // Simplified position calculation\n" +
                "    var velX = Math.cos(angle) * velocity;\n" +
                "    var velY = Math.sin(angle) * velocity;\n" +
                "    var gravX = Math.cos(gravAngle) * gravity;\n" +
                "    var gravY = Math.sin(gravAngle) * gravity;\n" +
                "    \n" +
                "    // Basic physics\n" +
                "    currentX = birthX + (velX * t) + (0.5 * gravX * t * t);\n" +
                "    currentY = birthY + (velY * t) + (0.5 * gravY * t * t);\n" +
                "}\n\n" +
                
                "// Calculate the distance from birth position\n" +
                "var dX = currentX - birthX;\n" +
                "var dY = currentY - birthY;\n" +
                "var currentDistance = Math.sqrt(dX*dX + dY*dY);\n\n" +
                
                "// Calculate distance ratio (0-1) for color interpolation\n" +
                "var distRatio = currentDistance / maxDistance;\n" +
                "\n" +
                "// Apply color offset with smoother distribution\n" +
                "if (colorOffset > 0) {\n" +
                "    // Generate a stable offset value using a more natural distribution\n" +
                "    seedRandom(particleNum + 7000, true);\n" +
                "    \n" +
                "    // Create a more natural random distribution (closer to normal)\n" +
                "    var r1 = random();\n" +
                "    var r2 = random();\n" +
                "    var normalRand = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);\n" +
                "    normalRand = normalRand / 3; // Scale to roughly -1 to 1 range\n" +
                "    \n" +
                "    // Apply a smoother offset that's biased toward center\n" +
                "    var visualOffset = colorOffset * normalRand * 0.5;\n" +
                "    distRatio = Math.max(0, Math.min(1, distRatio + visualOffset));\n" +
                "}\n\n" +
                
                "// Safety check\n" +
                "distRatio = Math.max(0, Math.min(1, distRatio)); // Clamp between 0-1\n" +
                "if (isNaN(distRatio)) distRatio = 0;\n\n" +
                
                "// Helper functions for HSL to RGB conversion\n" +
                "function hue2rgb(p, q, t) {\n" +
                "    if (t < 0) t += 1;\n" +
                "    if (t > 1) t -= 1;\n" +
                "    if (t < 1/6) return p + (q - p) * 6 * t;\n" +
                "    if (t < 1/2) return q;\n" +
                "    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;\n" +
                "    return p;\n" +
                "}\n\n" +
                
                "function hslToRgb(h, s, l) {\n" +
                "    var r, g, b;\n" +
                "    if (s === 0) {\n" +
                "        r = g = b = l; // achromatic\n" +
                "    } else {\n" +
                "        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;\n" +
                "        var p = 2 * l - q;\n" +
                "        r = hue2rgb(p, q, h + 1/3);\n" +
                "        g = hue2rgb(p, q, h);\n" +
                "        b = hue2rgb(p, q, h - 1/3);\n" +
                "    }\n" +
                "    return [r, g, b, 1];\n" +
                "}\n\n" +
                
                "function rgbToHsl(r, g, b) {\n" +
                "    var max = Math.max(r, g, b), min = Math.min(r, g, b);\n" +
                "    var h, s, l = (max + min) / 2;\n\n" +
                
                "    if (max === min) {\n" +
                "        h = s = 0; // achromatic\n" +
                "    } else {\n" +
                "        var d = max - min;\n" +
                "        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);\n" +
                "        switch (max) {\n" +
                "            case r: h = (g - b) / d + (g < b ? 6 : 0); break;\n" +
                "            case g: h = (b - r) / d + 2; break;\n" +
                "            case b: h = (r - g) / d + 4; break;\n" +
                "        }\n" +
                "        h /= 6;\n" +
                "    }\n" +
                "    return [h, s, l];\n" +
                "}\n\n" +
                
                "// Apply smoother color variance\n" +
                "var startColorHSL, endColorHSL, startColorVar, endColorVar;\n\n" +
                
                "// Convert RGB to HSL for more natural color variation\n" +
                "startColorHSL = rgbToHsl(startColor[0], startColor[1], startColor[2]);\n" +
                "endColorHSL = rgbToHsl(endColor[0], endColor[1], endColor[2]);\n\n" +
                
                "if (colorVar > 0) {\n" +
                "    // Create smoother variance for each particle\n" +
                "    seedRandom(particleNum + 3000, true);\n" +
                "    var r1 = random();\n" +
                "    var r2 = random();\n" +
                "    var normalRand1 = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2) / 5;\n" +
                "    \n" +
                "    seedRandom(particleNum + 4000, true);\n" +
                "    var r3 = random();\n" +
                "    var r4 = random();\n" +
                "    var normalRand2 = Math.sqrt(-2 * Math.log(r3)) * Math.cos(2 * Math.PI * r4) / 5;\n" +
                "    \n" +
                "    // Vary primarily saturation and lightness, less on hue for better color coherence\n" +
                "    var startHVar = startColorHSL[0] + normalRand1 * colorVar * 0.3; // Subtle hue shift\n" +
                "    var startSVar = Math.min(Math.max(startColorHSL[1] + normalRand2 * colorVar, 0), 1);\n" +
                "    var startLVar = Math.min(Math.max(startColorHSL[2] + normalRand1 * colorVar, 0.1), 0.9);\n" +
                "    \n" +
                "    seedRandom(particleNum + 5000, true);\n" +
                "    var r5 = random();\n" +
                "    var r6 = random();\n" +
                "    var normalRand3 = Math.sqrt(-2 * Math.log(r5)) * Math.cos(2 * Math.PI * r6) / 5;\n" +
                "    \n" +
                "    var endHVar = endColorHSL[0] + normalRand3 * colorVar * 0.3; // Subtle hue shift\n" +
                "    var endSVar = Math.min(Math.max(endColorHSL[1] + normalRand2 * colorVar, 0), 1);\n" +
                "    var endLVar = Math.min(Math.max(endColorHSL[2] + normalRand3 * colorVar, 0.1), 0.9);\n" +
                "    \n" +
                "    // Normalize hue values\n" +
                "    startHVar = (startHVar % 1 + 1) % 1;\n" +
                "    endHVar = (endHVar % 1 + 1) % 1;\n" +
                "    \n" +
                "    // Convert back to RGB\n" +
                "    startColorVar = hslToRgb(startHVar, startSVar, startLVar);\n" +
                "    endColorVar = hslToRgb(endHVar, endSVar, endLVar);\n" +
                "    \n" +
                "    // Preserve alpha\n" +
                "    startColorVar[3] = startColor[3];\n" +
                "    endColorVar[3] = endColor[3];\n" +
                "} else {\n" +
                "    // Use original colors if no variance\n" +
                "    startColorVar = startColor;\n" +
                "    endColorVar = endColor;\n" +
                "}\n\n" +
                
                "// Custom smoothstep function for improved easing\n" +
                "function smootherstep(edge0, edge1, x) {\n" +
                "    // Scale, bias and saturate x to 0..1 range\n" +
                "    x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));\n" +
                "    // Evaluate polynomial - smoother than cubic\n" +
                "    return x * x * x * (x * (x * 6 - 15) + 10);\n" +
                "}\n\n" +
                
                "// Apply advanced easing to color transition\n" +
                "var t1 = 0.2;  // First control point\n" +
                "var t2 = 0.8;  // Second control point\n" +
                "var easedRatio;\n\n" +
                
                "// Apply multi-segment easing for more natural color progression\n" +
                "if (distRatio < t1) {\n" +
                "    // Ease-in segment\n" +
                "    easedRatio = smootherstep(0, t1, distRatio) * t1;\n" +
                "} else if (distRatio > t2) {\n" +
                "    // Ease-out segment\n" +
                "    easedRatio = t2 + smootherstep(t2, 1, distRatio) * (1 - t2);\n" +
                "} else {\n" +
                "    // Linear middle segment for predictable gradient\n" +
                "    easedRatio = t1 + (distRatio - t1) * (t2 - t1) / (t2 - t1);\n" +
                "}\n\n" +
                
                "// Special case for color blending - use HSL interpolation for more pleasing gradients\n" +
                "// Convert RGB to HSL\n" +
                "var hsla1 = rgbToHsl(startColorVar[0], startColorVar[1], startColorVar[2]);\n" +
                "var hsla2 = rgbToHsl(endColorVar[0], endColorVar[1], endColorVar[2]);\n" +
                "hsla1.push(startColorVar[3]); // Add alpha\n" +
                "hsla2.push(endColorVar[3]);\n\n" +
                
                "// Handle hue wrapping for shorter distance interpolation\n" +
                "if (Math.abs(hsla2[0] - hsla1[0]) > 0.5) {\n" +
                "    if (hsla1[0] > hsla2[0]) hsla2[0] += 1;\n" +
                "    else hsla1[0] += 1;\n" +
                "}\n\n" +
                
                "// Interpolate in HSL space\n" +
                "var h = (hsla1[0] + easedRatio * (hsla2[0] - hsla1[0])) % 1;\n" +
                "var s = hsla1[1] + easedRatio * (hsla2[1] - hsla1[1]);\n" +
                "var l = hsla1[2] + easedRatio * (hsla2[2] - hsla1[2]);\n" +
                "var a = hsla1[3] + easedRatio * (hsla2[3] - hsla1[3]);\n\n" +
                
                "// Convert back to RGB\n" +
                "var finalColor = hslToRgb(h, s, l);\n" +
                "finalColor[3] = a; // Apply interpolated alpha\n\n" +
                
                "finalColor;";
            
            fill.property("ADBE Vector Fill Color").expression = fillExpression;
            
            // Position expression with control layer reference for turbulence
            var transformProp = particleGroup.property("Transform");
            if (transformProp) {
                // Position expression modified to create trails when emitter moves
                var posExpression = "// Position expression for trail effect\n" +
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum;
                
                // Add shape type suffix to layer name
                if (shapeType === "Circle") {
                    posExpression += " [Circle]";
                } else if (shapeType === "Rectangle") {
                    posExpression += " [Rectangle]";
                } else if (shapeType === "Polygon") {
                    posExpression += " [Polygon]";
                } else if (shapeType === "Star") {
                    posExpression += " [Star]";
                }
                
                posExpression += "\");\n" +
                    "var particleLayer = thisLayer;\n" +
                    "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                    "var particleNum = " + i + ";\n\n" +
                    
                    "// Hide inactive particles\n" +
                    "if (particleNum > activeCount) {\n" +
                    "    [-1000, -1000];\n" +
                    "} else {\n" +
                    "    // Get movement parameters\n" +
                    "    var emitterWidth = ctrlLayer.effect(\"Emitter Width\")(\"Slider\");\n" +
                    "    var emitterHeight = ctrlLayer.effect(\"Emitter Height\")(\"Slider\");\n" +
                    "    var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                    "    var velVar = ctrlLayer.effect(\"Velocity Variance\")(\"Slider\");\n" +
                    "    var velAngle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                    "    var velAngleVar = degreesToRadians(ctrlLayer.effect(\"Velocity Direction Variance\")(\"Slider\"));\n" +
                    "    var gravMag = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                    "    var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                    "    var gravX = gravMag * Math.cos(gravAngle);\n" +
                    "    var gravY = gravMag * Math.sin(gravAngle);\n" +
                    "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n" +
                    "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n" +
                    "    var posOffset = ctrlLayer.effect(\"Position Offset\")(\"Slider\") / 100;\n" +
                    "    var turbSpeed = ctrlLayer.effect(\"Turbulent Speed\")(\"Slider\");\n" +
                    "    var turbAmount = ctrlLayer.effect(\"Turbulent\")(\"Slider\");\n\n" +
                    
                    "    // Make a unique random seed for this particle\n" +
                    "    seedRandom(particleNum, true);\n" +
                    
                    "    // Apply position offset (only affects position timing)\n" +
                    "    var maxOffset = lifetime * posOffset;\n" +
                    "    var offset = random(0, maxOffset);\n" +
                    "    var t = (time + offset) % lifetime;\n\n" +
                    
                    "    // Generate birth position within the emitter area\n" +
                    "    var birthX = 0;\n" +
                    "    var birthY = 0;\n\n" +
                    
                    "    // Only apply random position if we have a non-zero emitter area\n" +
                    "    if (emitterWidth > 0) {\n" +
                    "        birthX += random(-emitterWidth/2, emitterWidth/2);\n" +
                    "    }\n\n" +
                    
                    "    if (emitterHeight > 0) {\n" +
                    "        birthY += random(-emitterHeight/2, emitterHeight/2);\n" +
                    "    }\n\n" +
                    
                    "    // Randomize velocity\n" +
                    "    var myVelocity = velocity + random(-velVar, velVar);\n\n" +
                    
                    "    // Randomize direction if we have direction variance\n" +
                    "    var myVelAngle = velAngle;\n" +
                    "    if (velAngleVar > 0) {\n" +
                    "        myVelAngle += random(-velAngleVar, velAngleVar);\n" +
                    "    }\n\n" +
                    
                    "    // Convert angle to velocity components\n" +
                    "    var myVelX = Math.cos(myVelAngle) * myVelocity;\n" +
                    "    var myVelY = Math.sin(myVelAngle) * myVelocity;\n\n" +
                    
                    "    // Calculate position with physics including resistance\n" +
                    "    var x, y;\n" +
                    "    if (resistance > 0) {\n" +
                    "        // Apply exponential decay to velocity when there's resistance\n" +
                    "        var resistFactor = Math.exp(-resistance * t);\n" +
                    "        \n" +
                    "        // For position with resistance, more complex integration\n" +
                    "        if (resistance > 0.001) {\n" +
                    "            // With resistance, velocity decays over time\n" +
                    "            var r = resistance;\n" +
                    "            \n" +
                    "            // Position with resistance and gravity\n" +
                    "            x = birthX + myVelX * (1 - resistFactor) / r + gravX * ((t - (1 - resistFactor) / r) / r);\n" +
                    "            y = birthY + myVelY * (1 - resistFactor) / r + gravY * ((t - (1 - resistFactor) / r) / r);\n" +
                    "        } else {\n" +
                    "            // Fallback for very small resistance values\n" +
                    "            x = birthX + (myVelX * resistFactor * t) + (0.5 * gravX * t * t);\n" +
                    "            y = birthY + (myVelY * resistFactor * t) + (0.5 * gravY * t * t);\n" +
                    "        }\n" +
                    "    } else {\n" +
                    "        // Without resistance, standard physics equations\n" +
                    "        x = birthX + (myVelX * t) + (0.5 * gravX * t * t);\n" +
                    "        y = birthY + (myVelY * t) + (0.5 * gravY * t * t);\n" +
                    "    }\n\n" +
                    
                    "    // Add looping wiggle turbulence\n" +
                    "    if (turbAmount > 0 && turbSpeed > 0) {\n" +
                    "        // Create a unique wiggle seed for this particle\n" +
                    "        seedRandom(particleNum * 1000, true);\n" +
                    "        var wiggleSeed = random(1, 10);\n" +
                    "        \n" +
                    "        // Get the loop time - use lifetime for perfect loops\n" +
                    "        var loopTime = lifetime;\n" +
                    "        \n" +
                    "        // Normalized time within the loop\n" +
                    "        var loopT = t % loopTime;\n" +
                    "        \n" +
                    "        // Calculate two wiggle values at current time and loop end\n" +
                    "        var wiggle1 = wiggle(turbSpeed, turbAmount, 1, 0.5, loopT + wiggleSeed);\n" +
                    "        var wiggle2 = wiggle(turbSpeed, turbAmount, 1, 0.5, loopT - loopTime + wiggleSeed);\n" +
                    "        \n" +
                    "        // Interpolate between the two wiggle values for seamless looping\n" +
                    "        var turbulence = linear(loopT, 0, loopTime, wiggle1, wiggle2);\n" +
                    "        \n" +
                    "        // Apply turbulence to position\n" +
                    "        x += turbulence[0];\n" +
                    "        y += turbulence[1];\n" +
                    "    }\n\n" +
                    
                    "    [x, y];\n" +
                    "}";
                
                transformProp.property("Position").expression = posExpression;
                
                // Modified scale expression that handles different shape types
                var scaleExpression = "// Scale expression with distance-based fade logic\n" +
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum;
                
                // Add shape type suffix to layer name
                if (shapeType === "Circle") {
                    scaleExpression += " [Circle]";
                } else if (shapeType === "Rectangle") {
                    scaleExpression += " [Rectangle]";
                } else if (shapeType === "Polygon") {
                    scaleExpression += " [Polygon]";
                } else if (shapeType === "Star") {
                    scaleExpression += " [Star]";
                }
                
                scaleExpression += "\");\n" +
                    "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                    "var particleNum = " + i + ";\n\n" +
                    
                    "// Hide inactive particles\n" +
                    "if (particleNum > activeCount) {\n" +
                    "    [0, 0];\n" +
                    "} else {\n" +
                    "    // Get base size parameters\n" +
                    "    var size = ctrlLayer.effect(\"Particle Size\")(\"Slider\");\n" +
                    "    var sizeVar = ctrlLayer.effect(\"Size Variance\")(\"Slider\");\n" +
                    "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n" +
                    "    var fadeInPct = ctrlLayer.effect(\"Fade In Distance %\")(\"Slider\") / 100;\n" +
                    "    var fadeOutPct = ctrlLayer.effect(\"Fade Out Start %\")(\"Slider\") / 100;\n\n" +
                    
                    "    // Get physics parameters to calculate max travel distance\n" +
                    "    var emitterPos = [0, 0]; // Use origin instead of emitter position\n" +
                    "    var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                    "    var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                    "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
                    
                    "    // Calculate max travel distance based on physics\n" +
                    "    var maxDistance;\n" +
                    "    if (resistance > 0) {\n" +
                    "        // With resistance, the max distance is limited\n" +
                    "        var terminalTime = 5 / resistance; // Time to reach ~99% of terminal velocity\n" +
                    "        var effectiveTime = Math.min(lifetime, terminalTime);\n" +
                    "        maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
                    "        \n" +
                    "        // Add gravity contribution with resistance\n" +
                    "        if (gravity > 0) {\n" +
                    "            maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
                    "        }\n" +
                    "    } else {\n" +
                    "        // Without resistance, simple physics formula\n" +
                    "        // d = vt + 0.5at²\n" +
                    "        maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
                    "    }\n" +
                    "    \n" +
                    "    // Ensure minimum distance for visibility\n" +
                    "    maxDistance = Math.max(100, maxDistance);\n\n" +
                    
                    "    // Make a unique random seed for this particle\n" +
                    "    seedRandom(particleNum, true);\n" +
                    "    \n" +
                    "    // Get particle lifecycle timing\n" +
                    "    var offset = random(0, lifetime);\n" +
                    "    var t = (time + offset) % lifetime;\n\n" +
                    
                    "    // Get the birth position\n" +
                    "    var birthX = emitterPos[0];\n" +
                    "    var birthY = emitterPos[1];\n\n" +
                    
                    "    // Get the current position from the parent group's position\n" +
                    "    try {\n" +
                    "        // First get the layer and parent group name\n" +
                    "        var layerName = thisLayer.name;\n" +
                    "        var groupName = thisProperty.propertyGroup(2).name; // Go up to get the particle group\n" +
                    "        \n" +
                    "        // Access the position of this particle group\n" +
                    "        var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
                    "        var currentX = currentPos[0];\n" +
                    "        var currentY = currentPos[1];\n" +
                    "    } catch(err) {\n" +
                    "        // Fallback to using a simple approximation based on physics if we can't get position\n" +
                    "        var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                    "        var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                    "        \n" +
                    "        // Simplified position calculation\n" +
                    "        var velX = Math.cos(angle) * velocity;\n" +
                    "        var velY = Math.sin(angle) * velocity;\n" +
                    "        var gravX = Math.cos(gravAngle) * gravity;\n" +
                    "        var gravY = Math.sin(gravAngle) * gravity;\n" +
                    "        \n" +
                    "        // Basic physics\n" +
                    "        currentX = birthX + (velX * t) + (0.5 * gravX * t * t);\n" +
                    "        currentY = birthY + (velY * t) + (0.5 * gravY * t * t);\n" +
                    "    }\n\n" +
                    
                    "    // Calculate the distance from birth position\n" +
                    "    var dX = currentX - birthX;\n" +
                    "    var dY = currentY - birthY;\n" +
                    "    var currentDistance = Math.sqrt(dX*dX + dY*dY);\n\n" +
                    
                    "    // Calculate distance ratio (0-1) for fade logic\n" +
                    "    var distRatio = currentDistance / maxDistance;\n" +
                    "    distRatio = Math.max(0, Math.min(1, distRatio)); // Clamp between 0-1\n\n" +
                    
                    "    // Generate normally distributed random variation for base size\n" +
                    "    seedRandom(particleNum + 100, true);\n" +
                    "    var u1 = Math.max(0.0001, random()); // Ensure non-zero value\n" +
                    "    var u2 = random();\n" +
                    "    var z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);\n" +
                    "    \n" +
                    "    // Scale the normal distribution by the variance parameter\n" +
                    "    var normalScaling = sizeVar / 3;\n" +
                    "    var sizeVariation = z * normalScaling;\n\n" +
                    
                    "    // Calculate base size with normal distribution of randomness\n" +
                    "    var baseSize = size + sizeVariation;\n" +
                    "    baseSize = Math.max(size * 0.1, baseSize); // Min size is 10% of base size\n" +
                    "    baseSize = Math.min(size * 2, baseSize);   // Max size is 200% of base size\n\n" +
                    
                    "    // Calculate fade factor based on actual distance traveled\n" +
                    "    var sizeFactor = 1; // Default to full size\n" +
                    "    \n" +
                    "    if (distRatio < fadeInPct) {\n" +
                    "        // Fade in phase - grow from 0 to full size\n" +
                    "        sizeFactor = distRatio / fadeInPct;\n" +
                    "    } else if (distRatio > fadeOutPct) {\n" +
                    "        // Fade out phase - shrink from full size to 0\n" +
                    "        sizeFactor = (1 - distRatio) / (1 - fadeOutPct);\n" +
                    "    }\n\n" +
                    
                    "    // Apply ease to make transitions smoother - more gradual easing\n" +
                    "    sizeFactor = ease(sizeFactor, 0.33, 0.67, 0, 1);\n\n" +
                    
                    "    // Apply fade factor to size\n" +
                    "    var finalSize = baseSize * sizeFactor;\n" +
                    "    \n" +
                    "    // Convert from absolute pixel size to scale percentage\n" +
                    "    // The base size for shapes is 10px\n" +
                    "    var scalePercentage = (finalSize / 10) * 100;\n" +
                    "    \n" +
                    "    // All shapes use the same scale percentage now\n" +
                    "    [scalePercentage, scalePercentage];\n" +
                    "}";
                
                transformProp.property("Scale").expression = scaleExpression;
                
                // Updated Rotation expression with speed and variance
                var rotationExpression = "// Rotation expression with speed and variance\n" +
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum;
                
                // Add shape type suffix to layer name
                if (shapeType === "Circle") {
                    rotationExpression += " [Circle]";
                } else if (shapeType === "Rectangle") {
                    rotationExpression += " [Rectangle]";
                } else if (shapeType === "Polygon") {
                    rotationExpression += " [Polygon]";
                } else if (shapeType === "Star") {
                    rotationExpression += " [Star]";
                }
                
                rotationExpression += "\");\n" +
                    "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                    "var particleNum = " + i + ";\n\n" +
                    
                    "// Hide inactive particles\n" +
                    "if (particleNum > activeCount) {\n" +
                    "    0;\n" +
                    "} else {\n" +
                    "    // Get rotation parameters\n" +
                    "    var rotVariance = ctrlLayer.effect(\"Rotation Variance\")(\"Slider\");\n" +
                    "    var rotSpeed = ctrlLayer.effect(\"Rotation Speed\")(\"Slider\");\n" +
                    "    var rotSpeedVar = ctrlLayer.effect(\"Rotation Speed Variance\")(\"Slider\");\n" +
                    "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n\n" +
                    
                    "    // Check if we should randomize direction (when rotSpeedVar is negative)\n" +
                    "    var randomizeDirection = rotSpeedVar < 0;\n" +
                    "    \n" +
                    "    // Use absolute value for calculations, but keep the flag\n" +
                    "    rotSpeedVar = Math.abs(rotSpeedVar);\n\n" +
                    
                    "    // Create unique random seeds for this particle\n" +
                    "    seedRandom(particleNum + 2000, true);\n" +
                    "    \n" +
                    "    // Generate random initial rotation angle based on variance\n" +
                    "    var initialRotation = random(-rotVariance, rotVariance);\n" +
                    "    \n" +
                    "    // Generate timing offset for this particle\n" +
                    "    var offset = random(0, lifetime);\n" +
                    "    var t = (time + offset) % lifetime;\n\n" +
                    
                    "    // Generate random rotation speed with variance\n" +
                    "    seedRandom(particleNum + 8000, true);\n" +
                    "    var myRotSpeed = rotSpeed;\n" +
                    "    if (rotSpeedVar > 0) {\n" +
                    "        // Create a more natural variation using normal distribution\n" +
                    "        var u1 = Math.max(0.0001, random()); // Ensure non-zero\n" +
                    "        var u2 = random();\n" +
                    "        var z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);\n" +
                    "        \n" +
                    "        // Apply variance with normal distribution (better than uniform)\n" +
                    "        var speedVar = z * (rotSpeedVar / 3); // Scale to make 3-sigma approximately match variance\n" +
                    "        myRotSpeed += speedVar;\n" +
                    "    }\n\n" +
                    
                    "    // Randomize direction if flag is set\n" +
                    "    if (randomizeDirection) {\n" +
                    "        // Generate a random value to determine direction\n" +
                    "        seedRandom(particleNum + 9000, true);\n" +
                    "        if (random() < 0.5) {\n" +
                    "            // Reverse direction for approximately half the particles\n" +
                    "            myRotSpeed *= -1;\n" +
                    "        }\n" +
                    "    }\n\n" +
                    
                    "    // Apply continuous rotation plus initial angle\n" +
                    "    initialRotation + (myRotSpeed * t);\n" +
                    "}\n";
                
                transformProp.property("Rotation").expression = rotationExpression;
                
                // Opacity expression with control layer reference
                var opacityExpression = "// Opacity expression with distance-based fade logic\n" +
                    "var ctrlLayer = thisComp.layer(\"SP-ctrl " + instanceNum;
                
                // Add shape type suffix to layer name
                if (shapeType === "Circle") {
                    opacityExpression += " [Circle]";
                } else if (shapeType === "Rectangle") {
                    opacityExpression += " [Rectangle]";
                } else if (shapeType === "Polygon") {
                    opacityExpression += " [Polygon]";
                } else if (shapeType === "Star") {
                    opacityExpression += " [Star]";
                }
                
                opacityExpression += "\");\n" +
                    "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                    "var particleNum = " + i + ";\n\n" +
                    
                    "// Hide inactive particles\n" +
                    "if (particleNum > activeCount) {\n" +
                    "    0;\n" +
                    "} else {\n" +
                    "    // Get basic opacity parameters\n" +
                    "    var maxOpacity = ctrlLayer.effect(\"Max Opacity\")(\"Slider\");\n" +
                    "    var opacityVar = ctrlLayer.effect(\"Opacity Variance\")(\"Slider\");\n" +
                    "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n" +
                    "    var fadeInPct = ctrlLayer.effect(\"Fade In Distance %\")(\"Slider\") / 100;\n" +
                    "    var fadeOutPct = ctrlLayer.effect(\"Fade Out Start %\")(\"Slider\") / 100;\n\n" +
                    
                    "    // Get physics parameters to calculate max travel distance\n" +
                    "    var emitterPos = [0, 0]; // Use origin instead of emitter position\n" +
                    "    var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                    "    var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                    "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
                    
                    "    // Calculate max travel distance based on physics\n" +
                    "    var maxDistance;\n" +
                    "    if (resistance > 0) {\n" +
                    "        // With resistance, the max distance is limited\n" +
                    "        var terminalTime = 5 / resistance; // Time to reach ~99% of terminal velocity\n" +
                    "        var effectiveTime = Math.min(lifetime, terminalTime);\n" +
                    "        maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
                    "        \n" +
                    "        // Add gravity contribution with resistance\n" +
                    "        if (gravity > 0) {\n" +
                    "            maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
                    "        }\n" +
                    "    } else {\n" +
                    "        // Without resistance, simple physics formula\n" +
                    "        // d = vt + 0.5at²\n" +
                    "        maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
                    "    }\n" +
                    "    \n" +
                    "    // Ensure minimum distance for visibility\n" +
                    "    maxDistance = Math.max(100, maxDistance);\n\n" +
                    
                    "    // Make a unique random seed for this particle\n" +
                    "    seedRandom(particleNum, true);\n" +
                    "    \n" +
                    "    // Apply opacity variation\n" +
                    "    var myMaxOpacity = maxOpacity + random(-opacityVar, opacityVar);\n" +
                    "    myMaxOpacity = Math.max(0, Math.min(100, myMaxOpacity)); // Clamp to valid range\n\n" +
                    
                    "    // Get particle lifecycle timing\n" +
                    "    var offset = random(0, lifetime);\n" +
                    "    var t = (time + offset) % lifetime;\n\n" +
                    
                    "    // Get the birth position\n" +
                    "    var birthX = emitterPos[0];\n" +
                    "    var birthY = emitterPos[1];\n\n" +
                    
                    "    // Get the current position from the parent group's position\n" +
                    "    try {\n" +
                    "        // First get the layer and parent group name\n" +
                    "        var layerName = thisLayer.name;\n" +
                    "        var groupName = thisProperty.propertyGroup(2).name; // Go up to get the particle group\n" +
                    "        \n" +
                    "        // Access the position of this particle group\n" +
                    "        var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
                    "        var currentX = currentPos[0];\n" +
                    "        var currentY = currentPos[1];\n" +
                    "    } catch(err) {\n" +
                    "        // Fallback to using a simple approximation based on physics if we can't get position\n" +
                    "        var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                    "        var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                    "        \n" +
                    "        // Simplified position calculation\n" +
                    "        var velX = Math.cos(angle) * velocity;\n" +
                    "        var velY = Math.sin(angle) * velocity;\n" +
                    "        var gravX = Math.cos(gravAngle) * gravity;\n" +
                    "        var gravY = Math.sin(gravAngle) * gravity;\n" +
                    "        \n" +
                    "        // Basic physics\n" +
                    "        currentX = birthX + (velX * t) + (0.5 * gravX * t * t);\n" +
                    "        currentY = birthY + (velY * t) + (0.5 * gravY * t * t);\n" +
                    "    }\n\n" +
                    
                    "    // Calculate the distance from birth position\n" +
                    "    var dX = currentX - birthX;\n" +
                    "    var dY = currentY - birthY;\n" +
                    "    var currentDistance = Math.sqrt(dX*dX + dY*dY);\n\n" +
                    
                    "    // Calculate distance ratio (0-1) for fade logic\n" +
                    "    var distRatio = currentDistance / maxDistance;\n" +
                    "    distRatio = Math.max(0, Math.min(1, distRatio)); // Clamp between 0-1\n\n" +
                    
                    "    // Calculate fade factor based on actual distance traveled\n" +
                    "    var opacityFactor = 1; // Default to full opacity\n" +
                    "    \n" +
                    "    if (distRatio < fadeInPct) {\n" +
                    "        // Fade in phase - increase from 0 to full opacity\n" +
                    "        opacityFactor = distRatio / fadeInPct;\n" +
                    "    } else if (distRatio > fadeOutPct) {\n" +
                    "        // Fade out phase - decrease from full opacity to 0\n" +
                    "        opacityFactor = (1 - distRatio) / (1 - fadeOutPct);\n" +
                    "    }\n\n" +
                    
                    "    // Apply ease to make transitions smoother - more gradual easing\n" +
                    "    opacityFactor = ease(opacityFactor, 0.33, 0.67, 0, 1);\n\n" +
                    
                    "    // Apply fade factor to opacity\n" +
                    "    myMaxOpacity * opacityFactor;\n" +
                    "}";
                
                transformProp.property("Opacity").expression = opacityExpression;
            }
        }
    }
    
    // Add appearance controls to Appearance tab
    
    // Particle size controls
    var sizeGroup = appearanceTab.add("panel", undefined, "Size");
    sizeGroup.orientation = "column";
    sizeGroup.alignChildren = ["left", "top"];
    sizeGroup.spacing = 5;
    sizeGroup.margins = 10;
    
    // Particle size
    var particleSizeGroup = sizeGroup.add("group");
    particleSizeGroup.orientation = "row";
    particleSizeGroup.alignChildren = ["left", "center"];
    particleSizeGroup.add("statictext", undefined, "Size:");
    var particleSizeSlider = particleSizeGroup.add("slider", undefined, 10, 1, 100);
    particleSizeSlider.size = [150, 20];
    var particleSizeText = particleSizeGroup.add("edittext", undefined, "10");
    particleSizeText.characters = 5;
    
    // Size variance
    var sizeVarGroup = sizeGroup.add("group");
    sizeVarGroup.orientation = "row";
    sizeVarGroup.alignChildren = ["left", "center"];
    sizeVarGroup.add("statictext", undefined, "Size Variance:");
    var sizeVarSlider = sizeVarGroup.add("slider", undefined, 5, 0, 50);
    sizeVarSlider.size = [150, 20];
    var sizeVarText = sizeVarGroup.add("edittext", undefined, "5");
    sizeVarText.characters = 5;
    
    // Color controls
    var colorGroup = appearanceTab.add("panel", undefined, "Color");
    colorGroup.orientation = "column";
    colorGroup.alignChildren = ["left", "top"];
    colorGroup.spacing = 5;
    colorGroup.margins = 10;
    
    // Start color
    var startColorGroup = colorGroup.add("group");
    startColorGroup.orientation = "row";
    startColorGroup.alignChildren = ["left", "center"];
    startColorGroup.add("statictext", undefined, "Start Color:");
    var startColorButton = startColorGroup.add("button", undefined, ""); 
    startColorButton.size = [30, 20];
    startColorButton.fillBrush = startColorButton.graphics.newBrush(startColorButton.graphics.BrushType.SOLID_COLOR, [1, 1, 1, 1]);
    startColorButton.onDraw = colorButtonDraw;
    var startColorHexText = startColorGroup.add("statictext", undefined, "#FFFFFF");
    startColorHexText.characters = 9;
    
    // End color
    var endColorGroup = colorGroup.add("group");
    endColorGroup.orientation = "row";
    endColorGroup.alignChildren = ["left", "center"];
    endColorGroup.add("statictext", undefined, "End Color:");
    var endColorButton = endColorGroup.add("button", undefined, "");
    endColorButton.size = [30, 20];
    endColorButton.fillBrush = endColorButton.graphics.newBrush(endColorButton.graphics.BrushType.SOLID_COLOR, [1, 1, 1, 0]);
    endColorButton.onDraw = colorButtonDraw;
    var endColorHexText = endColorGroup.add("statictext", undefined, "#FFFFFF");
    endColorHexText.characters = 9;
    
    // Color variance
    var colorVarGroup = colorGroup.add("group");
    colorVarGroup.orientation = "row";
    colorVarGroup.alignChildren = ["left", "center"];
    colorVarGroup.add("statictext", undefined, "Color Variance:");
    var colorVarSlider = colorVarGroup.add("slider", undefined, 0, 0, 100);
    colorVarSlider.size = [150, 20];
    var colorVarText = colorVarGroup.add("edittext", undefined, "0");
    colorVarText.characters = 5;
    
    // Color offset
    var colorOffsetGroup = colorGroup.add("group");
    colorOffsetGroup.orientation = "row";
    colorOffsetGroup.alignChildren = ["left", "center"];
    colorOffsetGroup.add("statictext", undefined, "Color Offset:");
    var colorOffsetSlider = colorOffsetGroup.add("slider", undefined, 20, 0, 100);
    colorOffsetSlider.size = [150, 20];
    var colorOffsetText = colorOffsetGroup.add("edittext", undefined, "20");
    colorOffsetText.characters = 5;
    
    // Opacity controls
    var opacityGroup = appearanceTab.add("panel", undefined, "Opacity");
    opacityGroup.orientation = "column";
    opacityGroup.alignChildren = ["left", "top"];
    opacityGroup.spacing = 5;
    opacityGroup.margins = 10;
    
    // Max opacity
    var maxOpacityGroup = opacityGroup.add("group");
    maxOpacityGroup.orientation = "row";
    maxOpacityGroup.alignChildren = ["left", "center"];
    maxOpacityGroup.add("statictext", undefined, "Max Opacity (%):");
    var maxOpacitySlider = maxOpacityGroup.add("slider", undefined, 100, 0, 100);
    maxOpacitySlider.size = [150, 20];
    var maxOpacityText = maxOpacityGroup.add("edittext", undefined, "100");
    maxOpacityText.characters = 5;
    
    // Opacity variance
    var opacityVarGroup = opacityGroup.add("group");
    opacityVarGroup.orientation = "row";
    opacityVarGroup.alignChildren = ["left", "center"];
    opacityVarGroup.add("statictext", undefined, "Opacity Variance:");
    var opacityVarSlider = opacityVarGroup.add("slider", undefined, 20, 0, 100);
    opacityVarSlider.size = [150, 20];
    var opacityVarText = opacityVarGroup.add("edittext", undefined, "20");
    opacityVarText.characters = 5;
    
    // Fade controls
    var fadeGroup = opacityGroup.add("group");
    fadeGroup.orientation = "row";
    fadeGroup.alignChildren = ["left", "center"];
    fadeGroup.spacing = 5;
    
    // Fade in
    fadeGroup.add("statictext", undefined, "Fade In %:");
    var fadeInSlider = fadeGroup.add("slider", undefined, 10, 0, 100);
    fadeInSlider.size = [70, 20];
    var fadeInText = fadeGroup.add("edittext", undefined, "10");
    fadeInText.characters = 3;
    
    // Fade out
    fadeGroup.add("statictext", undefined, "Out %:");
    var fadeOutSlider = fadeGroup.add("slider", undefined, 80, 0, 100);
    fadeOutSlider.size = [70, 20];
    var fadeOutText = fadeGroup.add("edittext", undefined, "80");
    fadeOutText.characters = 3;
    
    // Rotation & Turbulence
    var rotTurbGroup = appearanceTab.add("panel", undefined, "Rotation & Turbulence");
    rotTurbGroup.orientation = "column";
    rotTurbGroup.alignChildren = ["left", "top"];
    rotTurbGroup.spacing = 5;
    rotTurbGroup.margins = 10;
    
    // Rotation speed
    var rotSpeedGroup = rotTurbGroup.add("group");
    rotSpeedGroup.orientation = "row";
    rotSpeedGroup.alignChildren = ["left", "center"];
    rotSpeedGroup.add("statictext", undefined, "Rotation Speed:");
    var rotSpeedSlider = rotSpeedGroup.add("slider", undefined, 0, -360, 360);
    rotSpeedSlider.size = [150, 20];
    var rotSpeedText = rotSpeedGroup.add("edittext", undefined, "0");
    rotSpeedText.characters = 5;
    
    // Rotation speed variance
    var rotSpeedVarGroup = rotTurbGroup.add("group");
    rotSpeedVarGroup.orientation = "row";
    rotSpeedVarGroup.alignChildren = ["left", "center"];
    rotSpeedVarGroup.add("statictext", undefined, "Speed Variance:");
    var rotSpeedVarSlider = rotSpeedVarGroup.add("slider", undefined, 0, -360, 360);
    rotSpeedVarSlider.size = [150, 20];
    var rotSpeedVarText = rotSpeedVarGroup.add("edittext", undefined, "0");
    rotSpeedVarText.characters = 5;
    
    // Rotation variance
    var rotVarGroup = rotTurbGroup.add("group");
    rotVarGroup.orientation = "row";
    rotVarGroup.alignChildren = ["left", "center"];
    rotVarGroup.add("statictext", undefined, "Initial Variance:");
    var rotVarSlider = rotVarGroup.add("slider", undefined, 180, 0, 360);
    rotVarSlider.size = [150, 20];
    var rotVarText = rotVarGroup.add("edittext", undefined, "180");
    rotVarText.characters = 5;
    
    // Turbulence amount
    var turbAmountGroup = rotTurbGroup.add("group");
    turbAmountGroup.orientation = "row";
    turbAmountGroup.alignChildren = ["left", "center"];
    turbAmountGroup.add("statictext", undefined, "Turbulence:");
    var turbAmountSlider = turbAmountGroup.add("slider", undefined, 40, 0, 200);
    turbAmountSlider.size = [150, 20];
    var turbAmountText = turbAmountGroup.add("edittext", undefined, "40");
    turbAmountText.characters = 5;
    
    // Turbulence speed
    var turbSpeedGroup = rotTurbGroup.add("group");
    turbSpeedGroup.orientation = "row";
    turbSpeedGroup.alignChildren = ["left", "center"];
    turbSpeedGroup.add("statictext", undefined, "Turb. Speed:");
    var turbSpeedSlider = turbSpeedGroup.add("slider", undefined, 1, 0, 10);
    turbSpeedSlider.size = [150, 20];
    var turbSpeedText = turbSpeedGroup.add("edittext", undefined, "1");
    turbSpeedText.characters = 5;
    
    // Function to draw a color button
    function colorButtonDraw() {
        with (this) {
            graphics.drawOSControl();
            graphics.rectPath(0, 0, size[0], size[1]);
            graphics.fillPath(fillBrush);
        }
    }
    
    // Connect appearance sliders to text fields
    particleSizeSlider.onChanging = function() { 
        particleSizeText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    particleSizeText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 1) {
            particleSizeSlider.value = value;
        } else {
            this.text = Math.round(particleSizeSlider.value);
        }
        handleLiveUpdate();
    };
    
    sizeVarSlider.onChanging = function() { 
        sizeVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    sizeVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            sizeVarSlider.value = value;
        } else {
            this.text = Math.round(sizeVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    // Color buttons
    startColorButton.onClick = function() {
        var currentColor = startColorButton.fillBrush.color;
        var result = showColorPicker(currentColor, "Select Start Color");
        
        if (result) {
            startColorButton.fillBrush = startColorButton.graphics.newBrush(
                startColorButton.graphics.BrushType.SOLID_COLOR,
                result.color
            );
            startColorHexText.text = result.hex;
            startColorButton.notify("onDraw");
            
            // Apply the color to the particle system if exists
            if (systemDropdown.selection.index > 0) {
                var selectedSystem = existingParticleSystems[systemDropdown.selection.index - 1];
                
                if (selectedSystem) {
                    // Get the Start Color effect
                    var startColorEffect = selectedSystem.effect("Start Color");
                    if (startColorEffect) {
                        startColorEffect.property("Color").setValue(result.color);
                    }
                }
            }
            
            handleLiveUpdate();
        }
    };
    
    endColorButton.onClick = function() {
        var currentColor = endColorButton.fillBrush.color;
        var result = showColorPicker(currentColor, "Select End Color");
        
        if (result) {
            endColorButton.fillBrush = endColorButton.graphics.newBrush(
                endColorButton.graphics.BrushType.SOLID_COLOR,
                result.color
            );
            endColorHexText.text = result.hex;
            endColorButton.notify("onDraw");
            
            // Apply the color to the particle system if exists
            if (systemDropdown.selection.index > 0) {
                var selectedSystem = existingParticleSystems[systemDropdown.selection.index - 1];
                
                if (selectedSystem) {
                    // Get the End Color effect
                    var endColorEffect = selectedSystem.effect("End Color");
                    if (endColorEffect) {
                        endColorEffect.property("Color").setValue(result.color);
                    }
                }
            }
            
            handleLiveUpdate();
        }
    };
    
    colorVarSlider.onChanging = function() { 
        colorVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    colorVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            colorVarSlider.value = value;
        } else {
            this.text = Math.round(colorVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    colorOffsetSlider.onChanging = function() { 
        colorOffsetText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    colorOffsetText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            colorOffsetSlider.value = value;
        } else {
            this.text = Math.round(colorOffsetSlider.value);
        }
        handleLiveUpdate();
    };
    
    maxOpacitySlider.onChanging = function() { 
        maxOpacityText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    maxOpacityText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            maxOpacitySlider.value = value;
        } else {
            this.text = Math.round(maxOpacitySlider.value);
        }
        handleLiveUpdate();
    };
    
    opacityVarSlider.onChanging = function() { 
        opacityVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    opacityVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            opacityVarSlider.value = value;
        } else {
            this.text = Math.round(opacityVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    fadeInSlider.onChanging = function() { 
        fadeInText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    fadeInText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            fadeInSlider.value = value;
        } else {
            this.text = Math.round(fadeInSlider.value);
        }
        handleLiveUpdate();
    };
    
    fadeOutSlider.onChanging = function() { 
        fadeOutText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    fadeOutText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 100) {
            fadeOutSlider.value = value;
        } else {
            this.text = Math.round(fadeOutSlider.value);
        }
        handleLiveUpdate();
    };
    
    rotSpeedSlider.onChanging = function() { 
        rotSpeedText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    rotSpeedText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= -360 && value <= 360) {
            rotSpeedSlider.value = value;
        } else {
            this.text = Math.round(rotSpeedSlider.value);
        }
        handleLiveUpdate();
    };
    
    rotSpeedVarSlider.onChanging = function() { 
        rotSpeedVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    rotSpeedVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= -360 && value <= 360) {
            rotSpeedVarSlider.value = value;
        } else {
            this.text = Math.round(rotSpeedVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    rotVarSlider.onChanging = function() { 
        rotVarText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    rotVarText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0 && value <= 360) {
            rotVarSlider.value = value;
        } else {
            this.text = Math.round(rotVarSlider.value);
        }
        handleLiveUpdate();
    };
    
    turbAmountSlider.onChanging = function() { 
        turbAmountText.text = Math.round(this.value); 
        handleLiveUpdate();
    };
    turbAmountText.onChange = function() {
        var value = parseInt(this.text);
        if (!isNaN(value) && value >= 0) {
            turbAmountSlider.value = value;
        } else {
            this.text = Math.round(turbAmountSlider.value);
        }
        handleLiveUpdate();
    };
    
    turbSpeedSlider.onChanging = function() { 
        turbSpeedText.text = this.value.toFixed(1); 
        handleLiveUpdate();
    };
    turbSpeedText.onChange = function() {
        var value = parseFloat(this.text);
        if (!isNaN(value) && value >= 0) {
            turbSpeedSlider.value = value;
        } else {
            this.text = turbSpeedSlider.value.toFixed(1);
        }
        handleLiveUpdate();
    };
    
    // Function to convert RGB values (0-1) to Hex color string
    function rgbToHex(rgb) {
        function toHex(value) {
            // Convert 0-1 value to 0-255 and then to hex
            var hex = Math.round(value * 255).toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        
        var r = toHex(rgb[0]);
        var g = toHex(rgb[1]);
        var b = toHex(rgb[2]);
        
        return "#" + r + g + b;
    }
    
    // Function to convert RGB to HSB (RGB values from 0-1, returns HSB with h:0-360, s:0-100, b:0-100)
    function rgbToHsb(r, g, b) {
        var max = Math.max(r, g, b);
        var min = Math.min(r, g, b);
        var delta = max - min;
        var h = 0, s = 0, v = max;
        
        // Calculate hue
        if (delta !== 0) {
            if (max === r) {
                h = ((g - b) / delta) % 6;
            } else if (max === g) {
                h = (b - r) / delta + 2;
            } else { // max === b
                h = (r - g) / delta + 4;
            }
            
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }
        
        // Calculate saturation
        s = max === 0 ? 0 : Math.round((delta / max) * 100);
        
        // Calculate brightness (value)
        v = Math.round(max * 100);
        
        return [h, s, v];
    }
    
    // Function to convert HSB to RGB (HSB with h:0-360, s:0-100, b:0-100, returns RGB values from 0-1)
    function hsbToRgb(h, s, v) {
        h = h % 360;
        s = s / 100;
        v = v / 100;
        
        var c = v * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = v - c;
        var r = 0, g = 0, b = 0;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return [r + m, g + m, b + m];
    }
    
    // Function to show a color picker dialog and return the chosen color
    function showColorPicker(initialColor, title) {
        // Create a color picker dialog
        var colorDialog = new Window("dialog", title || "Select Color");
        colorDialog.orientation = "column";
        colorDialog.alignChildren = ["center", "top"];
        colorDialog.spacing = 10;
        colorDialog.margins = 16;
        
        // Current color preview
        var preview = colorDialog.add("panel", undefined, "Preview");
        preview.size = [200, 60];
        
        var previewColor = preview.add("button", undefined, "");
        previewColor.bounds = [10, 20, 50, 50];
        previewColor.fillBrush = previewColor.graphics.newBrush(
            previewColor.graphics.BrushType.SOLID_COLOR, 
            initialColor || [1, 1, 1, 1]
        );
        previewColor.onDraw = colorButtonDraw;
        
        var hexValue = preview.add("statictext", undefined, "");
        hexValue.bounds = [60, 30, 190, 50];
        hexValue.text = rgbToHex(initialColor || [1, 1, 1]);
        
        // Convert initial RGB color to HSB
        var initialHsb = rgbToHsb(
            initialColor ? initialColor[0] : 1,
            initialColor ? initialColor[1] : 1,
            initialColor ? initialColor[2] : 1
        );
        
        // HSB controls group
        var hsbGroup = colorDialog.add("group");
        hsbGroup.orientation = "column";
        hsbGroup.alignChildren = ["left", "center"];
        hsbGroup.spacing = 5;
        
        // Hue slider (0-360)
        var hGroup = hsbGroup.add("group");
        hGroup.orientation = "row";
        hGroup.alignChildren = ["left", "center"];
        hGroup.add("statictext", undefined, "H:");
        var hSlider = hGroup.add("slider", undefined, initialHsb[0], 0, 360);
        hSlider.size = [150, 20];
        var hText = hGroup.add("edittext", undefined, Math.round(initialHsb[0]));
        hText.characters = 4;
        
        // Saturation slider (0-100)
        var sGroup = hsbGroup.add("group");
        sGroup.orientation = "row";
        sGroup.alignChildren = ["left", "center"];
        sGroup.add("statictext", undefined, "S:");
        var sSlider = sGroup.add("slider", undefined, initialHsb[1], 0, 100);
        sSlider.size = [150, 20];
        var sText = sGroup.add("edittext", undefined, Math.round(initialHsb[1]));
        sText.characters = 4;
        
        // Brightness slider (0-100)
        var bGroup = hsbGroup.add("group");
        bGroup.orientation = "row";
        bGroup.alignChildren = ["left", "center"];
        bGroup.add("statictext", undefined, "B:");
        var bSlider = bGroup.add("slider", undefined, initialHsb[2], 0, 100);
        bSlider.size = [150, 20];
        var bText = bGroup.add("edittext", undefined, Math.round(initialHsb[2]));
        bText.characters = 4;
        
        // Alpha slider (0-100)
        var aGroup = hsbGroup.add("group");
        aGroup.orientation = "row";
        aGroup.alignChildren = ["left", "center"];
        aGroup.add("statictext", undefined, "A:");
        var aSlider = aGroup.add("slider", undefined, initialColor ? Math.round(initialColor[3] * 100) : 100, 0, 100);
        aSlider.size = [150, 20];
        var aText = aGroup.add("edittext", undefined, initialColor ? Math.round(initialColor[3] * 100) : 100);
        aText.characters = 4;
        
        // RGB display (read-only)
        var rgbDisplay = colorDialog.add("panel", undefined, "RGB Values");
        rgbDisplay.orientation = "row";
        rgbDisplay.alignChildren = ["left", "center"];
        rgbDisplay.spacing = 10;
        rgbDisplay.size = [200, 40];
        
        var rText = rgbDisplay.add("statictext", undefined, "R:");
        var rValue = rgbDisplay.add("statictext", undefined, "255");
        rValue.characters = 3;
        
        var gText = rgbDisplay.add("statictext", undefined, "G:");
        var gValue = rgbDisplay.add("statictext", undefined, "255");
        gValue.characters = 3;
        
        var bText = rgbDisplay.add("statictext", undefined, "B:");
        var bValue = rgbDisplay.add("statictext", undefined, "255");
        bValue.characters = 3;
        
        // Buttons
        var buttonGroup = colorDialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignChildren = ["center", "center"];
        buttonGroup.spacing = 10;
        
        var okButton = buttonGroup.add("button", undefined, "OK");
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        
        // Current selected color
        var selectedColor = initialColor || [1, 1, 1, 1];
        
        // Function to update preview
        function updatePreview() {
            var h = hSlider.value;
            var s = sSlider.value;
            var b = bSlider.value;
            var a = aSlider.value / 100;
            
            // Convert HSB to RGB
            var rgb = hsbToRgb(h, s, b);
            selectedColor = [rgb[0], rgb[1], rgb[2], a];
            
            // Update RGB display values
            rValue.text = Math.round(rgb[0] * 255);
            gValue.text = Math.round(rgb[1] * 255);
            bValue.text = Math.round(rgb[2] * 255);
            
            // Update color preview
            previewColor.fillBrush = previewColor.graphics.newBrush(
                previewColor.graphics.BrushType.SOLID_COLOR, 
                selectedColor
            );
            hexValue.text = rgbToHex(rgb);
            previewColor.notify("onDraw");
        }
        
        // Connect controls
        hSlider.onChanging = function() { 
            hText.text = Math.round(this.value); 
            updatePreview();
        };
        hText.onChange = function() {
            var value = parseInt(this.text);
            if (!isNaN(value) && value >= 0 && value <= 360) {
                hSlider.value = value;
            } else {
                this.text = Math.round(hSlider.value);
            }
            updatePreview();
        };
        
        sSlider.onChanging = function() { 
            sText.text = Math.round(this.value); 
            updatePreview();
        };
        sText.onChange = function() {
            var value = parseInt(this.text);
            if (!isNaN(value) && value >= 0 && value <= 100) {
                sSlider.value = value;
            } else {
                this.text = Math.round(sSlider.value);
            }
            updatePreview();
        };
        
        bSlider.onChanging = function() { 
            bText.text = Math.round(this.value); 
            updatePreview();
        };
        bText.onChange = function() {
            var value = parseInt(this.text);
            if (!isNaN(value) && value >= 0 && value <= 100) {
                bSlider.value = value;
            } else {
                this.text = Math.round(bSlider.value);
            }
            updatePreview();
        };
        
        aSlider.onChanging = function() { 
            aText.text = Math.round(this.value); 
            updatePreview();
        };
        aText.onChange = function() {
            var value = parseInt(this.text);
            if (!isNaN(value) && value >= 0 && value <= 100) {
                aSlider.value = value;
            } else {
                this.text = Math.round(aSlider.value);
            }
            updatePreview();
        };
        
        okButton.onClick = function() {
            colorDialog.close(1);
        };
        
        cancelButton.onClick = function() {
            colorDialog.close(0);
        };
        
        updatePreview();
        
        // Show the dialog and return the chosen color if OK was clicked
        if (colorDialog.show() == 1) {
            return {
                color: selectedColor,
                hex: hexValue.text
            };
        }
        return null;
    }
    
    // Show the dialog now that all controls are initialized
    dialog.center();
    
    // Check if a particle system control layer is already selected
    selectParticleSystemFromSelectedLayer();
    
    dialog.show();
})();