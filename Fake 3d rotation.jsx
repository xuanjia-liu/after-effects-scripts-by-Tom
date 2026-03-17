// Fake 3D Along Trajectory - After Effects Script
// Creates natural 3D rotation simulation for 2D shape layers based on movement

(function() {
    "use strict";
    
    // Script Info
    var scriptName = "Fake 3D Along Trajectory";
    var scriptVersion = "1.0";
    
    // Global variables
    var mainPanel;
    var rotationSpeedSlider, randomnessSlider, airResistanceSlider;
    var twirlSpeedSlider, anchorOffsetSlider;
    var applyButton, resetButton;
    var realtimeCheckbox, directionRandomnessCheckbox;
    var loopTimeInput, loopEnabledCheckbox;
    
    // Default values
    var defaultRotationSpeed = 0.5;
    var defaultRandomness = 0.2;
    var defaultAirResistance = 0.3;
    var defaultTwirlSpeed = 1.0;
    var defaultAnchorOffset = 0.3;
    
    // Main function
    function buildUI(thisObj) {
        // Create main panel as palette or panel
        var isPanel = (thisObj instanceof Panel);
        var mainPanel = (isPanel) ? thisObj : new Window("palette", scriptName + " v" + scriptVersion);
        mainPanel.orientation = "column";
        mainPanel.alignChildren = "fill";
        mainPanel.spacing = 10;
        mainPanel.margins = 16;
        
        // Header
        var headerGroup = mainPanel.add("group");
        headerGroup.orientation = "row";
        headerGroup.alignChildren = "center";
        var headerText = headerGroup.add("statictext", undefined, "Create 3D Confetti Tumbling & Twirling Effects");
        headerText.graphics.font = ScriptUI.newFont("dialog", "bold", 14);
        
        // Instructions
        var instructGroup = mainPanel.add("group");
        instructGroup.orientation = "column";
        instructGroup.alignChildren = "left";
        instructGroup.add("statictext", undefined, "Select 2D shape layers or layers with shape groups");
        instructGroup.add("statictext", undefined, "Creates realistic 3D confetti tumbling effects with natural twirling motion");
        
        // Separator
        mainPanel.add("panel", undefined, "");
        
        // Controls Group
        var controlsGroup = mainPanel.add("group");
        controlsGroup.orientation = "column";
        controlsGroup.alignChildren = "fill";
        controlsGroup.spacing = 15;
        
        // Rotation Speed Control
        var speedGroup = controlsGroup.add("group");
        speedGroup.orientation = "row";
        speedGroup.alignChildren = "center";
        speedGroup.add("statictext", undefined, "Rotation Speed:");
        rotationSpeedSlider = speedGroup.add("slider", undefined, defaultRotationSpeed, 0.05, 2.0);
        rotationSpeedSlider.preferredSize.width = 200;
        var speedValue = speedGroup.add("statictext", undefined, defaultRotationSpeed.toFixed(2));
        speedValue.preferredSize.width = 40;
        
        rotationSpeedSlider.onChanging = function() {
            speedValue.text = rotationSpeedSlider.value.toFixed(2);
        };
        
        // Randomness Control
        var randomGroup = controlsGroup.add("group");
        randomGroup.orientation = "row";
        randomGroup.alignChildren = "center";
        randomGroup.add("statictext", undefined, "Randomness:");
        randomnessSlider = randomGroup.add("slider", undefined, defaultRandomness, 0.0, 1.0);
        randomnessSlider.preferredSize.width = 200;
        var randomValue = randomGroup.add("statictext", undefined, defaultRandomness.toFixed(2));
        randomValue.preferredSize.width = 30;
        
        randomnessSlider.onChanging = function() {
            randomValue.text = randomnessSlider.value.toFixed(2);
        };
        
        // Air Resistance Control
        var airResistGroup = controlsGroup.add("group");
        airResistGroup.orientation = "row";
        airResistGroup.alignChildren = "center";
        airResistGroup.add("statictext", undefined, "Air Resistance:");
        airResistanceSlider = airResistGroup.add("slider", undefined, defaultAirResistance, 0.0, 1.0);
        airResistanceSlider.preferredSize.width = 200;
        var airResistValue = airResistGroup.add("statictext", undefined, defaultAirResistance.toFixed(2));
        airResistValue.preferredSize.width = 40;
        
        airResistanceSlider.onChanging = function() {
            airResistValue.text = airResistanceSlider.value.toFixed(2);
        };
        
        // Twirl Speed Control
        var twirlGroup = controlsGroup.add("group");
        twirlGroup.orientation = "row";
        twirlGroup.alignChildren = "center";
        twirlGroup.add("statictext", undefined, "Twirl Speed:");
        twirlSpeedSlider = twirlGroup.add("slider", undefined, defaultTwirlSpeed, 0.0, 3.0);
        twirlSpeedSlider.preferredSize.width = 200;
        var twirlValue = twirlGroup.add("statictext", undefined, defaultTwirlSpeed.toFixed(2));
        twirlValue.preferredSize.width = 40;
        
        twirlSpeedSlider.onChanging = function() {
            twirlValue.text = twirlSpeedSlider.value.toFixed(2);
        };
        
        // Anchor Offset Control
        var anchorGroup = controlsGroup.add("group");
        anchorGroup.orientation = "row";
        anchorGroup.alignChildren = "center";
        anchorGroup.add("statictext", undefined, "Anchor Offset:");
        anchorOffsetSlider = anchorGroup.add("slider", undefined, defaultAnchorOffset, 0.0, 1.0);
        anchorOffsetSlider.preferredSize.width = 200;
        var anchorValue = anchorGroup.add("statictext", undefined, defaultAnchorOffset.toFixed(2));
        anchorValue.preferredSize.width = 40;
        
        anchorOffsetSlider.onChanging = function() {
            anchorValue.text = anchorOffsetSlider.value.toFixed(2);
        };
        
        // Separator
        mainPanel.add("panel", undefined, "");
        
        // Loop Control Group
        var loopGroup = mainPanel.add("group");
        loopGroup.orientation = "column";
        loopGroup.alignChildren = "fill";
        loopGroup.spacing = 8;
        
        // Loop Enable Checkbox
        loopEnabledCheckbox = loopGroup.add("checkbox", undefined, "Enable Loop");
        loopEnabledCheckbox.value = false;
        
        // Loop Time Input
        var loopTimeGroup = loopGroup.add("group");
        loopTimeGroup.orientation = "row";
        loopTimeGroup.alignChildren = "center";
        loopTimeGroup.add("statictext", undefined, "Loop Time (sec):");
        loopTimeInput = loopTimeGroup.add("edittext", undefined, "5.0");
        loopTimeInput.preferredSize.width = 60;
        
        // Quick Set Work Area Button
        var workAreaButton = loopTimeGroup.add("button", undefined, "Set Work Area");
        workAreaButton.preferredSize.width = 80;
        
        workAreaButton.onClick = function() {
            try {
                var comp = app.project.activeItem;
                if (comp && comp instanceof CompItem) {
                    var workAreaDuration = comp.workAreaDuration;
                    loopTimeInput.text = workAreaDuration.toFixed(2);
                } else {
                    alert("Please select a composition first.");
                }
            } catch (e) {
                alert("Error getting work area: " + e.toString());
            }
        };
        
        // Separator
        mainPanel.add("panel", undefined, "");
        
        // Checkboxes Group
        var checkboxGroup = mainPanel.add("group");
        checkboxGroup.orientation = "column";
        checkboxGroup.alignChildren = "left";
        checkboxGroup.spacing = 8;
        
        // Realtime Adjustment Checkbox
        realtimeCheckbox = checkboxGroup.add("checkbox", undefined, "Realtime Adjustment");
        realtimeCheckbox.value = false;
        
        // Direction Randomness Checkbox
        directionRandomnessCheckbox = checkboxGroup.add("checkbox", undefined, "Direction Randomness");
        directionRandomnessCheckbox.value = true;
        
        // Separator
        mainPanel.add("panel", undefined, "");
        
        // Buttons Group
        var buttonGroup = mainPanel.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = "center";
        buttonGroup.spacing = 10;
        
        applyButton = buttonGroup.add("button", undefined, "Apply Fake 3D");
        applyButton.preferredSize.width = 120;
        
        resetButton = buttonGroup.add("button", undefined, "Reset");
        resetButton.preferredSize.width = 80;
        
        var cancelButton = buttonGroup.add("button", undefined, "Cancel");
        cancelButton.preferredSize.width = 80;
        
        // Button Events
        applyButton.onClick = function() {
            applyFake3D();
        };
        
        resetButton.onClick = function() {
            resetLayers();
        };
        
        cancelButton.onClick = function() {
            mainPanel.close();
        };
        
        // Realtime adjustment events
        rotationSpeedSlider.onChanging = function() {
            speedValue.text = rotationSpeedSlider.value.toFixed(2);
            if (realtimeCheckbox.value) {
                applyFake3D();
            }
        };
        
        randomnessSlider.onChanging = function() {
            randomValue.text = randomnessSlider.value.toFixed(2);
            if (realtimeCheckbox.value) {
                applyFake3D();
            }
        };
        
        airResistanceSlider.onChanging = function() {
            airResistValue.text = airResistanceSlider.value.toFixed(2);
            if (realtimeCheckbox.value) {
                applyFake3D();
            }
        };
        
        twirlSpeedSlider.onChanging = function() {
            twirlValue.text = twirlSpeedSlider.value.toFixed(2);
            if (realtimeCheckbox.value) {
                applyFake3D();
            }
        };
        
        anchorOffsetSlider.onChanging = function() {
            anchorValue.text = anchorOffsetSlider.value.toFixed(2);
            if (realtimeCheckbox.value) {
                applyFake3D();
            }
        };
        
        // Loop input change event
        loopTimeInput.onChanging = function() {
            if (realtimeCheckbox.value && loopEnabledCheckbox.value) {
                applyFake3D();
            }
        };
        
        return mainPanel;
    }
    
    // Generate unique seed for each layer
    function generateSeed(layer, index) {
        var name = layer.name || "layer";
        var seed = 0;
        for (var i = 0; i < name.length; i++) {
            seed += name.charCodeAt(i);
        }
        return seed + index * 1000;
    }
    
    // Create expression for fake 3D rotation with twirl
    function createFake3DExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime, twirlSpeed) {
        return [
            "// Fake 3D Confetti Rotation Expression with Twirl",
            "var rotSpeed = " + rotSpeed + ";",
            "var randomness = " + randomness + ";",
            "var seed = " + seed + ";",
            "var airResistance = " + airResistance + ";",
            "var directionRandomness = " + directionRandomness + ";",
            "var loopEnabled = " + loopEnabled + ";",
            "var loopTime = " + loopTime + ";",
            "var twirlSpeed = " + twirlSpeed + ";",
            "",
            "// Get current position and previous position",
            "var pos = transform.position;",
            "var prevPos = transform.position.valueAtTime(time - thisComp.frameDuration);",
            "",
            "// Calculate velocity vector",
            "var velocity = sub(pos, prevPos);",
            "var speed = length(velocity);",
            "",
            "// Normalize velocity for direction",
            "var direction = velocity;",
            "if (speed > 0.001) {",
            "    direction = div(velocity, speed);",
            "} else {",
            "    direction = [1, 0];",
            "}",
            "",
            "// Calculate movement angle with continuity checking",
            "var currentAngle = Math.atan2(direction[1], direction[0]) * 180 / Math.PI;",
            "var moveAngle = currentAngle;",
            "",
            "// Smooth angle transitions to prevent sudden 180° flips",
            "if (time > inPoint + thisComp.frameDuration) {",
            "    var prevDirection = velocity;",
            "    var prevPrevPos = transform.position.valueAtTime(time - 2 * thisComp.frameDuration);",
            "    if (length(sub(prevPos, prevPrevPos)) > 0.001) {",
            "        prevDirection = sub(prevPos, prevPrevPos);",
            "        prevDirection = div(prevDirection, length(prevDirection));",
            "        var prevAngle = Math.atan2(prevDirection[1], prevDirection[0]) * 180 / Math.PI;",
            "        ",
            "        // Check for discontinuous jump (greater than 90 degrees)",
            "        var angleDiff = currentAngle - prevAngle;",
            "        if (angleDiff > 180) angleDiff -= 360;",
            "        if (angleDiff < -180) angleDiff += 360;",
            "        ",
            "        // If jump is too large, smooth it out",
            "        if (Math.abs(angleDiff) > 90) {",
            "            var smoothingFactor = 0.3; // Adjust for more/less smoothing",
            "            moveAngle = prevAngle + (angleDiff * smoothingFactor);",
            "        }",
            "    }",
            "}",
            "",
            "// Get shape size for air resistance calculation",
            "var shapeSize = 1;",
            "try {",
            "    var scale = transform.scale;",
            "    if (scale && scale.length >= 2) {",
            "        shapeSize = Math.max(scale[0], scale[1]) / 100; // Normalize to 0-1 range",
            "    }",
            "} catch (e) {",
            "    shapeSize = 1; // Default size",
            "}",
            "",
            "// Create tumbling rotation with size-based air resistance",
            "seedRandom(seed, true);",
            "var randomSpinRate = (random() * 0.8 + 0.6) * randomness + 0.5; // 0.5 to 1.9",
            "var randomOffset = random() * 360;",
            "",
            "// Apply air resistance based on shape size",
            "var sizeMultiplier = 1 - (shapeSize * airResistance);",
            "sizeMultiplier = Math.max(sizeMultiplier, 0.1); // Minimum 10% speed",
            "",
            "// Direction randomness - some shapes rotate opposite direction",
            "var directionMultiplier = 1;",
            "if (directionRandomness) {",
            "    seedRandom(seed + 1000, true);",
            "    directionMultiplier = (random() > 0.5) ? 1 : -1;",
            "}",
            "",
            "// Calculate phase for loop or continuous",
            "var phase;",
            "if (loopEnabled && loopTime > 0) {",
            "    phase = ((time / loopTime) * 2 * Math.PI * rotSpeed * randomSpinRate * sizeMultiplier * directionMultiplier) + randomOffset;",
            "} else {",
            "    phase = (time * rotSpeed * 2 * Math.PI * randomSpinRate * sizeMultiplier * directionMultiplier) + randomOffset;",
            "}",
            "",
            "// Use linear phase for constant speed",
            "var rotationPhase = Math.sin(phase) * 60; // 60 deg amplitude, can be tweaked",
            "var speedInfluence = Math.min(speed * rotSpeed * 0.5 * sizeMultiplier, 180);",
            "",
            "// Calculate twirl rotation (continuous spin around anchor)",
            "seedRandom(seed + 200, true);",
            "var twirlRate = (random() * 0.6 + 0.7) * twirlSpeed; // 0.7 to 1.3 * twirlSpeed",
            "var twirlOffset = random() * 360;",
            "",
            "// Twirl phase calculation",
            "var twirlPhase;",
            "if (loopEnabled && loopTime > 0) {",
            "    twirlPhase = ((time / loopTime) * 360 * twirlRate * directionMultiplier) + twirlOffset;",
            "} else {",
            "    twirlPhase = (time * 360 * twirlRate * directionMultiplier) + twirlOffset;",
            "}",
            "",
            "// Final rotation: tumbling + twirling",
            "var tumblingRotation = moveAngle + rotationPhase + speedInfluence;",
            "var finalRotation = tumblingRotation + (twirlPhase % 360);",
            "",
            "finalRotation;"
        ].join("\n");
    }
    
    // Create expression for scale X (simulates 3D foreshortening)
    function createScaleXExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime) {
        return [
            "// Scale X - 3D Foreshortening (Width perspective)",
            "var rotSpeed = " + rotSpeed + ";",
            "var randomness = " + randomness + ";",
            "var seed = " + seed + ";",
            "var airResistance = " + airResistance + ";",
            "var directionRandomness = " + directionRandomness + ";",
            "var loopEnabled = " + loopEnabled + ";",
            "var loopTime = " + loopTime + ";",
            "",
            "// Get original scale value to preserve it",
            "var originalScaleX;",
            "try {",
            "    // Check if there are any keyframes to preserve",
            "    if (numKeys > 0) {",
            "        // Use the first keyframe value",
            "        originalScaleX = key(1).value;",
            "    } else {",
            "        // Use value at layer start time or default",
            "        var startTime = Math.max(inPoint, 0);",
            "        originalScaleX = valueAtTime(startTime);",
            "    }",
            "} catch (e) {",
            "    // Fallback to default value",
            "    originalScaleX = 100;",
            "}",
            "",
            "// Get velocity for additional tumbling",
            "var pos = transform.position;",
            "var prevPos = transform.position.valueAtTime(time - thisComp.frameDuration);",
            "var velocity = sub(pos, prevPos);",
            "var speed = length(velocity);",
            "",
            "// Get shape size for air resistance calculation",
            "var shapeSize = originalScaleX / 100; // Normalize to 0-1 range",
            "",
            "// Create 3D rotation phase with size influence",
            "seedRandom(seed, true);",
            "var randomSpinRate = (random() * 0.8 + 0.6) * randomness + 0.5;",
            "var randomOffset = random() * 360;",
            "",
            "// Apply air resistance based on shape size",
            "var sizeMultiplier = 1 - (shapeSize * airResistance);",
            "sizeMultiplier = Math.max(sizeMultiplier, 0.1); // Minimum 10% speed",
            "",
            "// Direction randomness - some shapes rotate opposite direction",
            "var directionMultiplier = 1;",
            "if (directionRandomness) {",
            "    seedRandom(seed + 1000, true);",
            "    directionMultiplier = (random() > 0.5) ? 1 : -1;",
            "}",
            "",
            "// Calculate time for loop or continuous",
            "var currentTime;",
            "if (loopEnabled && loopTime > 0) {",
            "    // Create seamless loop using trigonometric functions",
            "    var loopPhase = (time / loopTime) * 2 * Math.PI;",
            "    currentTime = loopPhase;",
            "} else {",
            "    currentTime = time;",
            "}",
            "",
            "// X-axis rotation phase for foreshortening with size influence",
            // Improved: use linear phase for constant speed, no slow-down
            "var phaseX;",
            "if (loopEnabled && loopTime > 0) {",
            "    phaseX = ((time / loopTime) * 2 * Math.PI * rotSpeed * randomSpinRate * sizeMultiplier * directionMultiplier) + randomOffset;",
            "} else {",
            "    phaseX = (time * rotSpeed * 2 * Math.PI * randomSpinRate * sizeMultiplier * directionMultiplier) + randomOffset;",
            "}",
            "var rotationPhaseX = Math.sin(phaseX) * 60; // 60 deg amplitude, can be tweaked",
            "var speedInfluence = Math.min(speed * rotSpeed * 0.5 * sizeMultiplier, 180);",
            "var totalPhaseX = rotationPhaseX + speedInfluence;",
            "",
            "// Create foreshortening effect (edge-on = thin, face-on = normal)",
            "var foreshortening = Math.abs(Math.cos(totalPhaseX * Math.PI / 180));",
            "var minScale = 0.1; // Very thin when edge-on",
            "var maxScale = 1.0; // Normal when face-on",
            "",
            "// Scale multiplier from thin to normal based on viewing angle",
            "var scaleMultiplier = (foreshortening * (maxScale - minScale) + minScale);",
            "",
            "// Add slight random variation",
            "var randomVariation = 1 + (random() - 0.5) * randomness * 0.1;",
            "scaleMultiplier *= randomVariation;",
            "",
            "// Apply 3D effect to original scale",
            "originalScaleX * scaleMultiplier;"
        ].join("\n");
    }
    
    // Create expression for scale Y (simulates 3D height foreshortening)
    function createScaleYExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime) {
        return [
            "// Scale Y - 3D Foreshortening (Height perspective)",
            "var rotSpeed = " + rotSpeed + ";",
            "var randomness = " + randomness + ";",
            "var seed = " + seed + ";",
            "var airResistance = " + airResistance + ";",
            "var directionRandomness = " + directionRandomness + ";",
            "var loopEnabled = " + loopEnabled + ";",
            "var loopTime = " + loopTime + ";",
            "",
            "// Get original scale value to preserve it",
            "var originalScaleY;",
            "try {",
            "    // Check if there are any keyframes to preserve",
            "    if (numKeys > 0) {",
            "        // Use the first keyframe value",
            "        originalScaleY = key(1).value;",
            "    } else {",
            "    // Use value at layer start time or default",
            "        var startTime = Math.max(inPoint, 0);",
            "        originalScaleY = valueAtTime(startTime);",
            "    }",
            "} catch (e) {",
            "    // Fallback to default value",
            "    originalScaleY = 100;",
            "}",
            "",
            "// Get velocity for additional tumbling",
            "var pos = transform.position;",
            "var prevPos = transform.position.valueAtTime(time - thisComp.frameDuration);",
            "var velocity = sub(pos, prevPos);",
            "var speed = length(velocity);",
            "",
            "// Get shape size for air resistance calculation",
            "var shapeSize = originalScaleY / 100; // Normalize to 0-1 range",
            "",
            "// Create different 3D rotation phase for Y axis (perpendicular rotation)",
            "seedRandom(seed + 100, true); // Different seed for Y axis",
            "var randomSpinRateY = (random() * 0.8 + 0.6) * randomness + 0.5;",
            "var randomOffsetY = random() * 360;",
            "",
            "// Apply air resistance based on shape size",
            "var sizeMultiplier = 1 - (shapeSize * airResistance);",
            "sizeMultiplier = Math.max(sizeMultiplier, 0.1); // Minimum 10% speed",
            "",
            "// Direction randomness - some shapes rotate opposite direction",
            "var directionMultiplier = 1;",
            "if (directionRandomness) {",
            "    seedRandom(seed + 1000, true);",
            "    directionMultiplier = (random() > 0.5) ? 1 : -1;",
            "}",
            "",
            "// Calculate time for loop or continuous",
            "var currentTime;",
            "if (loopEnabled && loopTime > 0) {",
            "    // Create seamless loop using trigonometric functions",
            "    var loopPhase = (time / loopTime) * 2 * Math.PI;",
            "    currentTime = loopPhase;",
            "} else {",
            "    currentTime = time;",
            "}",
            "",
            "// Y-axis rotation phase (perpendicular to X, different timing) with size influence",
            // Improved: use linear phase for constant speed, no slow-down
            "var phaseY;",
            "if (loopEnabled && loopTime > 0) {",
            "    phaseY = ((time / loopTime) * 2 * Math.PI * rotSpeed * randomSpinRateY * sizeMultiplier * directionMultiplier) + randomOffsetY + 63;",
            "} else {",
            "    phaseY = (time * rotSpeed * 2 * Math.PI * randomSpinRateY * sizeMultiplier * directionMultiplier) + randomOffsetY + 63;",
            "}",
            "var rotationPhaseY = Math.sin(phaseY) * 60; // 60 deg amplitude, can be tweaked",
            "var speedInfluenceY = Math.min(speed * rotSpeed * 0.3 * sizeMultiplier, 120);",
            "var totalPhaseY = rotationPhaseY + speedInfluenceY;",
            "",
            "// Create foreshortening effect for height",
            "var foreshorteningY = Math.abs(Math.sin(totalPhaseY * Math.PI / 180));",
            "var minScaleY = 0.15; // Thin when edge-on from this axis",
            "var maxScaleY = 1.0;  // Normal when face-on from this axis",
            "",
            "// Scale multiplier from thin to normal based on Y-axis viewing angle",
            "var scaleMultiplierY = (foreshorteningY * (maxScaleY - minScaleY) + minScaleY);",
            "",
            "// Add slight random variation",
            "var randomVariationY = 1 + (random() - 0.5) * randomness * 0.1;",
            "scaleMultiplierY *= randomVariationY;",
            "",
            "// Apply 3D effect to original scale",
            "originalScaleY * scaleMultiplierY;"
        ].join("\n");
    }
    
    // Create combined scale expression (fallback when dimension separation fails)
    function createCombinedScaleExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime) {
        return [
            "// Combined 3D Confetti Scale Expression",
            "var rotSpeed = " + rotSpeed + ";",
            "var randomness = " + randomness + ";",
            "var seed = " + seed + ";",
            "var airResistance = " + airResistance + ";",
            "var directionRandomness = " + directionRandomness + ";",
            "var loopEnabled = " + loopEnabled + ";",
            "var loopTime = " + loopTime + ";",
            "",
            "// Get original scale values to preserve them",
            "var originalScale;",
            "try {",
            "    // Check if there are any keyframes to preserve",
            "    if (numKeys > 0) {",
            "        // Use the first keyframe value",
            "        originalScale = key(1).value;",
            "    } else {",
            "        // Use value at layer start time or default",
            "        var startTime = Math.max(inPoint, 0);",
            "        originalScale = valueAtTime(startTime);",
            "    }",
            "    // Ensure it's an array of two values",
            "    if (!originalScale || originalScale.length != 2) {",
            "        originalScale = [100, 100]; // Fallback for non-array",
            "    }",
            "} catch (e) {",
            "    // Fallback to default values",
            "    originalScale = [100, 100];",
            "}",
            "",
            "// Get velocity for tumbling influence",
            "var pos = transform.position;",
            "var prevPos = transform.position.valueAtTime(time - thisComp.frameDuration);",
            "var velocity = sub(pos, prevPos);",
            "var speed = length(velocity);",
            "",
            "// Get shape size for air resistance calculation",
            "var shapeSize = Math.max(originalScale[0], originalScale[1]) / 100; // Normalize to 0-1 range",
            "",
            "// Create 3D rotation phases for both axes",
            "seedRandom(seed, true);",
            "var randomSpinRateX = (random() * 0.8 + 0.6) * randomness + 0.5;",
            "var randomOffsetX = random() * 360;",
            "",
            "seedRandom(seed + 100, true);",
            "var randomSpinRateY = (random() * 0.8 + 0.6) * randomness + 0.5;",
            "var randomOffsetY = random() * 360;",
            "",
            "// Apply air resistance based on shape size",
            "var sizeMultiplier = 1 - (shapeSize * airResistance);",
            "sizeMultiplier = Math.max(sizeMultiplier, 0.1); // Minimum 10% speed",
            "",
            "// Direction randomness - some shapes rotate opposite direction",
            "var directionMultiplier = 1;",
            "if (directionRandomness) {",
            "    seedRandom(seed + 1000, true);",
            "    directionMultiplier = (random() > 0.5) ? 1 : -1;",
            "}",
            "",
            "// Calculate time for loop or continuous",
            "var currentTime;",
            "if (loopEnabled && loopTime > 0) {",
            "    // Create seamless loop using trigonometric functions",
            "    var loopPhase = (time / loopTime) * 2 * Math.PI;",
            "    currentTime = loopPhase;",
            "} else {",
            "    currentTime = time;",
            "}",
            "",
            "// Different rotation phases for X and Y axes with size influence",
            // Improved: use linear phase for constant speed, no slow-down
            "var phaseX;",
            "if (loopEnabled && loopTime > 0) {",
            "    phaseX = ((time / loopTime) * 2 * Math.PI * rotSpeed * randomSpinRateX * sizeMultiplier * directionMultiplier) + randomOffsetX;",
            "} else {",
            "    phaseX = (time * rotSpeed * 2 * Math.PI * randomSpinRateX * sizeMultiplier * directionMultiplier) + randomOffsetX;",
            "}",
            "var rotationPhaseX = Math.sin(phaseX) * 60; // 60 deg amplitude, can be tweaked",
            "var phaseY;",
            "if (loopEnabled && loopTime > 0) {",
            "    phaseY = ((time / loopTime) * 2 * Math.PI * rotSpeed * randomSpinRateY * sizeMultiplier * directionMultiplier) + randomOffsetY + 63;",
            "} else {",
            "    phaseY = (time * rotSpeed * 2 * Math.PI * randomSpinRateY * sizeMultiplier * directionMultiplier) + randomOffsetY + 63;",
            "}",
            "var rotationPhaseY = Math.sin(phaseY) * 60; // 60 deg amplitude, can be tweaked",
            "",
            "var speedInfluenceX = Math.min(speed * rotSpeed * 0.5 * sizeMultiplier, 180);",
            "var speedInfluenceY = Math.min(speed * rotSpeed * 0.3 * sizeMultiplier, 120);",
            "",
            "var totalPhaseX = rotationPhaseX + speedInfluenceX;",
            "var totalPhaseY = rotationPhaseY + speedInfluenceY;",
            "",
            "// Create foreshortening effects (proper 3D perspective)",
            "var foreshorteningX = Math.abs(Math.cos(totalPhaseX * Math.PI / 180));",
            "var foreshorteningY = Math.abs(Math.sin(totalPhaseY * Math.PI / 180));",
            "",
            "// Scale multipliers for confetti effect",
            "var scaleMultiplierX = (foreshorteningX * 0.9 + 0.1); // 0.1 to 1.0",
            "var scaleMultiplierY = (foreshorteningY * 0.85 + 0.15); // 0.15 to 1.0",
            "",
            "// Add random variations",
            "var randomVariationX = 1 + (random() - 0.5) * randomness * 0.1;",
            "var randomVariationY = 1 + (random() - 0.5) * randomness * 0.1;",
            "",
            "scaleMultiplierX *= randomVariationX;",
            "scaleMultiplierY *= randomVariationY;",
            "",
            "// Apply 3D effects to original scales",
            "[originalScale[0] * scaleMultiplierX, originalScale[1] * scaleMultiplierY];"
        ].join("\n");
    }
    
    // Create expression for randomized anchor point
    function createAnchorPointExpression(seed, anchorOffset) {
        return [
            "// Randomized Anchor Point for Natural Twirling",
            "var seed = " + seed + ";",
            "var anchorOffset = " + anchorOffset + ";",
            "",
            "// Get original anchor point to preserve it",
            "var originalAnchor;",
            "try {",
            "    // Check if there are any keyframes to preserve",
            "    if (numKeys > 0) {",
            "        // Use the first keyframe value",
            "        originalAnchor = key(1).value;",
            "    } else {",
            "        // Use value at layer start time or default",
            "        var startTime = Math.max(inPoint, 0);",
            "        originalAnchor = valueAtTime(startTime);",
            "    }",
            "    // Ensure it's an array of two values",
            "    if (!originalAnchor || originalAnchor.length != 2) {",
            "        originalAnchor = [0, 0]; // Fallback for non-array",
            "    }",
            "} catch (e) {",
            "    // Fallback to default values",
            "    originalAnchor = [0, 0];",
            "}",
            "",
            "// Get shape bounds for proportional offset",
            "var shapeBounds = 100; // Default size",
            "try {",
            "    var scale = transform.scale;",
            "    if (scale && scale.length >= 2) {",
            "        shapeBounds = Math.max(scale[0], scale[1]); // Use larger dimension",
            "    }",
            "} catch (e) {",
            "    shapeBounds = 100; // Default",
            "}",
            "",
            "// Calculate random offset based on shape size",
            "var maxOffset = (shapeBounds / 100) * anchorOffset * 50; // Scale offset to shape size",
            "",
            "// Generate consistent random offsets",
            "seedRandom(seed + 300, true);",
            "var offsetX = (random() - 0.5) * maxOffset;",
            "var offsetY = (random() - 0.5) * maxOffset;",
            "",
            "// Apply offset to original anchor point",
            "[originalAnchor[0] + offsetX, originalAnchor[1] + offsetY];"
        ].join("\n");
    }
    
    // Apply expressions to a shape group
    function applyToShapeGroup(shapeGroup, rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime, twirlSpeed, anchorOffset) {
        try {
            var transform = shapeGroup.property("Transform");
            if (transform) {
                // Apply anchor point randomization
                var anchorPoint = transform.property("Anchor Point");
                if (anchorPoint && anchorPoint.canSetExpression && anchorOffset > 0) {
                    anchorPoint.expression = createAnchorPointExpression(seed, anchorOffset);
                }
                
                // Apply rotation expression with twirl
                var rotation = transform.property("Rotation");
                if (rotation && rotation.canSetExpression) {
                    rotation.expression = createFake3DExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime, twirlSpeed);
                }
                
                // Apply scale expressions
                var scale = transform.property("Scale");
                if (scale && scale.canSetExpression) {
                    try {
                        // First separate dimensions
                        scale.dimensionsSeparated = true;
                        
                        // Access individual scale properties by name
                        var scaleX = transform.property("ADBE Scale X") || transform.property("X Scale");
                        var scaleY = transform.property("ADBE Scale Y") || transform.property("Y Scale");
                        
                        if (scaleX && scaleX.canSetExpression) {
                            scaleX.expression = createScaleXExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime);
                        }
                        
                        if (scaleY && scaleY.canSetExpression) {
                            scaleY.expression = createScaleYExpression(rotSpeed, randomness, seed + 50, airResistance, directionRandomness, loopEnabled, loopTime);
                        }
                    } catch (scaleError) {
                        // Alternative method - apply to combined scale property
                        scale.expression = createCombinedScaleExpression(rotSpeed, randomness, seed, airResistance, directionRandomness, loopEnabled, loopTime);
                    }
                }
            }
        } catch (e) {
            // Skip if transform not available
        }
    }
    
    // Apply fake 3D to selected layers
    function applyFake3D() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }

        app.beginUndoGroup(scriptName + " - Apply Fake 3D");
        
        try {
            var rotSpeed = rotationSpeedSlider.value;
            var randomness = randomnessSlider.value;
            var airResistance = airResistanceSlider.value;
            var twirlSpeed = twirlSpeedSlider.value;
            var anchorOffset = anchorOffsetSlider.value;
            var directionRandomness = directionRandomnessCheckbox.value;
            var loopEnabled = loopEnabledCheckbox.value;
            var loopTime = parseFloat(loopTimeInput.text) || 5.0;
            
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                var layerSeed = generateSeed(layer, i);
                
                // Check if it's a shape layer
                if (layer instanceof ShapeLayer) {
                    var contents = layer.property("Contents");
                    if (contents) {
                        // Apply to each shape group
                        for (var j = 1; j <= contents.numProperties; j++) {
                            var shapeGroup = contents.property(j);
                            if (shapeGroup && shapeGroup.matchName === "ADBE Vector Group") {
                                var groupSeed = layerSeed + j * 100;
                                applyToShapeGroup(shapeGroup, rotSpeed, randomness, groupSeed, airResistance, directionRandomness, loopEnabled, loopTime, twirlSpeed, anchorOffset);
                            }
                        }
                    }
                } else {
                    // Apply to layer transform
                    try {
                        var transform = layer.property("Transform");
                        if (transform) {
                            // Apply anchor point randomization
                            var anchorPoint = transform.property("Anchor Point");
                            if (anchorPoint && anchorPoint.canSetExpression && anchorOffset > 0) {
                                anchorPoint.expression = createAnchorPointExpression(layerSeed, anchorOffset);
                            }
                            
                            // Apply rotation expression with twirl
                            var rotation = transform.property("Rotation");
                            if (rotation && rotation.canSetExpression) {
                                rotation.expression = createFake3DExpression(rotSpeed, randomness, layerSeed, airResistance, directionRandomness, loopEnabled, loopTime, twirlSpeed);
                            }
                            
                            // Apply scale expressions
                            var scale = transform.property("Scale");
                            if (scale && scale.canSetExpression) {
                                try {
                                    // First separate dimensions
                                    scale.dimensionsSeparated = true;
                                    
                                    // Access individual scale properties by name
                                    var scaleX = transform.property("ADBE Scale X") || transform.property("X Scale");
                                    var scaleY = transform.property("ADBE Scale Y") || transform.property("Y Scale");
                                    
                                    if (scaleX && scaleX.canSetExpression) {
                                        scaleX.expression = createScaleXExpression(rotSpeed, randomness, layerSeed, airResistance, directionRandomness, loopEnabled, loopTime);
                                    }
                                    
                                    if (scaleY && scaleY.canSetExpression) {
                                        scaleY.expression = createScaleYExpression(rotSpeed, randomness, layerSeed + 50, airResistance, directionRandomness, loopEnabled, loopTime);
                                    }
                                } catch (scaleError) {
                                    // Alternative method - apply to combined scale property
                                    scale.expression = createCombinedScaleExpression(rotSpeed, randomness, layerSeed, airResistance, directionRandomness, loopEnabled, loopTime);
                                }
                            }
                        }
                    } catch (e) {
                        // Skip if not applicable to this layer type
                    }
                }
            }
            
            // Silent application - no popup confirmation
            
        } catch (e) {
            alert("Error applying fake 3D: " + e.toString() + "\n\nPlease ensure layers are unlocked and expressions are enabled.");
        }
        
        app.endUndoGroup();
    }
    
    // Reset expressions on selected layers
    function resetLayers() {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            alert("Please select at least one layer.");
            return;
        }
        
        app.beginUndoGroup(scriptName + " - Reset");
        
        try {
            for (var i = 0; i < selectedLayers.length; i++) {
                var layer = selectedLayers[i];
                
                // Reset shape layer
                if (layer instanceof ShapeLayer) {
                    var contents = layer.property("Contents");
                    if (contents) {
                        for (var j = 1; j <= contents.numProperties; j++) {
                            var shapeGroup = contents.property(j);
                            if (shapeGroup && shapeGroup.matchName === "ADBE Vector Group") {
                                try {
                                    var transform = shapeGroup.property("Transform");
                                    if (transform) {
                                        var rotation = transform.property("Rotation");
                                        var scale = transform.property("Scale");
                                        var anchorPoint = transform.property("Anchor Point");
                                        
                                        if (rotation) rotation.expression = "";
                                        if (anchorPoint) anchorPoint.expression = "";
                                        if (scale) {
                                            // Reset individual scale properties if they exist
                                            var scaleX = transform.property("ADBE Scale X") || transform.property("X Scale");
                                            var scaleY = transform.property("ADBE Scale Y") || transform.property("Y Scale");
                                            
                                            if (scaleX) scaleX.expression = "";
                                            if (scaleY) scaleY.expression = "";
                                            
                                            // Reset combined scale and dimensions
                                            scale.expression = "";
                                            scale.dimensionsSeparated = false;
                                        }
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                } else {
                    // Reset layer transform
                    try {
                        var transform = layer.property("Transform");
                        if (transform) {
                            var rotation = transform.property("Rotation");
                            var scale = transform.property("Scale");
                            var anchorPoint = transform.property("Anchor Point");
                            
                            if (rotation) rotation.expression = "";
                            if (anchorPoint) anchorPoint.expression = "";
                            if (scale) {
                                // Reset individual scale properties if they exist
                                var scaleX = transform.property("ADBE Scale X") || transform.property("X Scale");
                                var scaleY = transform.property("ADBE Scale Y") || transform.property("Y Scale");
                                
                                if (scaleX) scaleX.expression = "";
                                if (scaleY) scaleY.expression = "";
                                
                                // Reset combined scale and dimensions
                                scale.expression = "";
                                scale.dimensionsSeparated = false;
                            }
                        }
                    } catch (e) {}
                }
            }
            
            // Silent reset - no popup confirmation
            
        } catch (e) {
            alert("Error resetting: " + e.toString());
        }

        app.endUndoGroup();
    }
    
    // Initialize and show UI
    function init(thisObj) {
        // Check if After Effects is available
        if (typeof app === "undefined") {
            alert("This script must be run from within After Effects.");
            return;
        }
        // Build and show UI
        var ui = buildUI(thisObj);
        if (ui instanceof Window) {
            ui.center();
            ui.show();
        }
    }
    // Run the script as a panel if possible
    if (typeof($.global) !== 'undefined' && $.global["fake3DConfettiPanel"]){
        init($.global["fake3DConfettiPanel"]);
    } else {
        init();
    }
    
})();
