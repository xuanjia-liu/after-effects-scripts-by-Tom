// Shape Particle System Extension
// Host script that runs in After Effects


// Function to create particles with updated control layer reference
function createParticles(layer, instanceNum, count, startIndex, settings) {
    // Set default starting index if not provided
    startIndex = startIndex || 1;
    
    // Get shape types from settings if available
    var shapeTypes = ["ellipse"]; // Default shape type
    var selectedLayerIndex = null;
    
    if (settings) {
        // Check for new multi-select format
        if (settings["Shape Types"] && settings["Shape Types"].length > 0) {
            shapeTypes = settings["Shape Types"];
        }
        // Check for legacy format
        else if (settings["Shape Type"]) {
            shapeTypes = [settings["Shape Type"]];
        }
        
        if (settings["Selected Layer"]) {
            selectedLayerIndex = parseInt(settings["Selected Layer"]);
        }
    }
    
    // Create individual particle groups
    for (var i = startIndex; i < startIndex + count; i++) {
        var particleGroup = layer.property("Contents").addProperty("ADBE Vector Group");
        particleGroup.name = "Particle " + i;
        
        // Randomly select one of the shape types for this particle
        var shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
        
        // Add shape based on shape type
        addShapeToParticle(particleGroup, shapeType, selectedLayerIndex);
        
        // Add fill to each individual particle
        var fill = particleGroup.property("Contents").addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Particle " + i + " Fill";
        
        // Color expression - using pattern matching for control layer
        var fillExpression = "// Color expression with support for distance and time based fading\n" +
            "// Find control layer using pattern matching\n" +
            "var ctrlLayerName = null;\n" +
            "for (var i = 1; i <= thisComp.numLayers; i++) {\n" +
            "    var layerName = thisComp.layer(i).name;\n" +
            "    if (layerName.indexOf(\"SP-ctrl " + instanceNum + "\") === 0) {\n" +
            "        ctrlLayerName = layerName;\n" +
            "        break;\n" +
            "    }\n" +
            "}\n" +
            "if (!ctrlLayerName) {\n" +
            "    // Fallback to just the base name\n" +
            "    ctrlLayerName = \"SP-ctrl " + instanceNum + "\";\n" +
            "}\n" +
            "var ctrlLayer = thisComp.layer(ctrlLayerName);\n" +
            "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
            "var particleNum = " + i + ";\n\n" +
            
            "// Hide inactive particles\n" +
            "if (particleNum > activeCount) {\n" +
            "    [0, 0, 0, 0];\n" +
            "} else {\n" +
            "    // Get color parameters\n" +
            "    var startColor = ctrlLayer.effect(\"Start Color\")(\"Color\");\n" +
            "    var endColor = ctrlLayer.effect(\"End Color\")(\"Color\");\n" +
            "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n" +
            "    var colorOffset = ctrlLayer.effect(\"Color Offset\")(\"Slider\") / 100;\n" +
            "    var colorVar = ctrlLayer.effect(\"Color Variance\")(\"Slider\") / 100;\n" +
            "    var fadeInPct = ctrlLayer.effect(\"Fade In Distance %\")(\"Slider\") / 100;\n" +
            "    var fadeOutPct = ctrlLayer.effect(\"Fade Out Start %\")(\"Slider\") / 100;\n" +
            "    var fadeMethod = ctrlLayer.effect(\"Color Fade Method\")(\"Slider\") > 0.5 ? \"distance\" : \"time\";\n\n" +
            
            "    // Physics parameters for distance calculation\n" +
            "    var emitterPos = [0, 0]; // Use origin\n" +
            "    var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
            "    var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
            "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
            
            "    // Calculate max travel distance based on physics\n" +
            "    var maxDistance;\n" +
            "    if (resistance > 0) {\n" +
            "        var terminalTime = 5 / resistance;\n" +
            "        var effectiveTime = Math.min(lifetime, terminalTime);\n" +
            "        maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
            "        if (gravity > 0) {\n" +
            "            maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
            "        }\n" +
            "    } else {\n" +
            "        maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
            "    }\n" +
            "    maxDistance = Math.max(100, maxDistance);\n\n" +
            
            "    // Helper functions for HSL color space\n" +
            "    function hue2rgb(p, q, t) {\n" +
            "        if (t < 0) t += 1;\n" +
            "        if (t > 1) t -= 1;\n" +
            "        if (t < 1/6) return p + (q - p) * 6 * t;\n" +
            "        if (t < 1/2) return q;\n" +
            "        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;\n" +
            "        return p;\n" +
            "    }\n\n" +
            
            "    function hslToRgb(h, s, l) {\n" +
            "        // Safety check for undefined inputs\n" +
            "        h = typeof h === 'number' ? h : 0;\n" +
            "        s = typeof s === 'number' ? s : 0;\n" +
            "        l = typeof l === 'number' ? l : 0;\n" +
            "        \n" +
            "        var r, g, b;\n" +
            "        if (s === 0) {\n" +
            "            r = g = b = l; // achromatic\n" +
            "        } else {\n" +
            "            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;\n" +
            "            var p = 2 * l - q;\n" +
            "            r = hue2rgb(p, q, h + 1/3);\n" +
            "            g = hue2rgb(p, q, h);\n" +
            "            b = hue2rgb(p, q, h - 1/3);\n" +
            "        }\n" +
            "        return [r, g, b];\n" +
            "    }\n\n" +
            
            "    function rgbToHsl(r, g, b) {\n" +
            "        // Safety check for undefined inputs\n" +
            "        r = typeof r === 'number' ? r : 0;\n" +
            "        g = typeof g === 'number' ? g : 0;\n" +
            "        b = typeof b === 'number' ? b : 0;\n" +
            "        \n" +
            "        var max = Math.max(r, g, b), min = Math.min(r, g, b);\n" +
            "        var h, s, l = (max + min) / 2;\n\n" +
            
            "        if (max === min) {\n" +
            "            h = s = 0; // achromatic\n" +
            "        } else {\n" +
            "            var d = max - min;\n" +
            "            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);\n" +
            "            switch (max) {\n" +
            "                case r: h = (g - b) / d + (g < b ? 6 : 0); break;\n" +
            "                case g: h = (b - r) / d + 2; break;\n" +
            "                case b: h = (r - g) / d + 4; break;\n" +
            "                default: h = 0; // Safety fallback\n" +
            "            }\n" +
            "            h /= 6;\n" +
            "        }\n" +
            "        return [h, s, l];\n" +
            "    }\n\n" +
            
            "    // Make a unique random seed for this particle\n" +
            "    seedRandom(particleNum, true);\n" +
            "    \n" +
            "    // Generate offset for this particle\n" +
            "    var offset = random(0, lifetime);\n" +
            "    var timeOffset = colorOffset > 0 ? random(0, lifetime * colorOffset) : 0;\n" +
            "    var t = (time + offset) % lifetime;\n" +
            "    var lifecycleRatio = t / lifetime;\n\n" +
            
            "    // Try to get current position\n" +
            "    var currentDistance = 0;\n" +
            "    try {\n" +
            "        var layerName = thisLayer.name;\n" +
            "        var groupName = thisProperty.propertyGroup(3).name;\n" +
            "        var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
            "        var birthPos = [0, 0]; // Birth at origin\n" +
            "        var dX = currentPos[0] - birthPos[0];\n" +
            "        var dY = currentPos[1] - birthPos[1];\n" +
            "        currentDistance = Math.sqrt(dX*dX + dY*dY);\n" +
            "    } catch(err) {\n" +
            "        // Fallback to time-based estimation if we can't get position\n" +
            "        var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
            "        var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
            "        var velX = Math.cos(angle) * velocity;\n" +
            "        var velY = Math.sin(angle) * velocity;\n" +
            "        var gravX = Math.cos(gravAngle) * gravity;\n" +
            "        var gravY = Math.sin(gravAngle) * gravity;\n" +
            "        var estX = velX * t + (0.5 * gravX * t * t);\n" +
            "        var estY = velY * t + (0.5 * gravY * t * t);\n" +
            "        currentDistance = Math.sqrt(estX*estX + estY*estY);\n" +
            "    }\n\n" +
            
            "    // Calculate distance ratio (0-1)\n" +
            "    var distRatio = currentDistance / maxDistance;\n" +
            "    distRatio = Math.max(0, Math.min(1, distRatio));\n\n" +
            
            "    // Determine interpolation ratio based on fade method\n" +
            "    var colorRatio;\n" +
            "    \n" +
            "    if (fadeMethod == \"distance\") {\n" +
            "        // Distance-based color interpolation\n" +
            "        colorRatio = distRatio;\n" +
            "    } else {\n" +
            "        // Time-based color interpolation\n" +
            "        colorRatio = lifecycleRatio;\n" +
            "    }\n\n" +
            
            "    // Convert RGB to HSL for more natural color interpolation\n" +
            "    // Add safety checks for color values\n" +
            "    var safeStartColor = startColor || [0, 0, 1, 1]; // Default to blue if undefined\n" +
            "    var safeEndColor = endColor || [0.67, 0, 1, 1]; // Default to purple if undefined\n" +
            "    \n" +
            "    try {\n" +
            "        var hsla1 = rgbToHsl(safeStartColor[0], safeStartColor[1], safeStartColor[2]);\n" +
            "        var hsla2 = rgbToHsl(safeEndColor[0], safeEndColor[1], safeEndColor[2]);\n" +
            "        hsla1.push(safeStartColor[3] || 1); // Add alpha with default to 1\n" +
            "        hsla2.push(safeEndColor[3] || 1); // Add alpha with default to 1\n" +
            "    } catch (err) {\n" +
            "        // Fallback to default colors if conversion fails\n" +
            "        hsla1 = [0.66, 1, 0.5, 1]; // Blue in HSL\n" +
            "        hsla2 = [0.83, 1, 0.5, 1]; // Purple in HSL\n" +
            "    }\n" +
            
            "    // Apply color variance if needed\n" +
            "    var startColorVar, endColorVar;\n" +
            "    if (colorVar > 0) {\n" +
            "        // Create smoother variance for this particle\n" +
            "        seedRandom(particleNum + 3000, true);\n" +
            "        var r1 = random();\n" +
            "        var r2 = random();\n" +
            "        var normalRand1 = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2) / 5;\n" +
            "        \n" +
            "        seedRandom(particleNum + 4000, true);\n" +
            "        var r3 = random();\n" +
            "        var r4 = random();\n" +
            "        var normalRand2 = Math.sqrt(-2 * Math.log(r3)) * Math.cos(2 * Math.PI * r4) / 5;\n" +
            "        \n" +
            "        // Vary primarily saturation and lightness, less on hue for better coherence\n" +
            "        var startHVar = hsla1[0] + normalRand1 * colorVar * 0.3; // Subtle hue shift\n" +
            "        var startSVar = Math.min(Math.max(hsla1[1] + normalRand2 * colorVar, 0), 1);\n" +
            "        var startLVar = Math.min(Math.max(hsla1[2] + normalRand1 * colorVar, 0.1), 0.9);\n" +
            "        \n" +
            "        seedRandom(particleNum + 5000, true);\n" +
            "        var r5 = random();\n" +
            "        var r6 = random();\n" +
            "        var normalRand3 = Math.sqrt(-2 * Math.log(r5)) * Math.cos(2 * Math.PI * r6) / 5;\n" +
            "        \n" +
            "        var endHVar = hsla2[0] + normalRand3 * colorVar * 0.3; // Subtle hue shift\n" +
            "        var endSVar = Math.min(Math.max(hsla2[1] + normalRand2 * colorVar, 0), 1);\n" +
            "        var endLVar = Math.min(Math.max(hsla2[2] + normalRand3 * colorVar, 0.1), 0.9);\n" +
            "        \n" +
            "        // Normalize hue values\n" +
            "        startHVar = (startHVar % 1 + 1) % 1;\n" +
            "        endHVar = (endHVar % 1 + 1) % 1;\n" +
            "        \n" +
            "        // Replace the original HSL values with varied ones\n" +
            "        hsla1[0] = startHVar;\n" +
            "        hsla1[1] = startSVar;\n" +
            "        hsla1[2] = startLVar;\n" +
            "        \n" +
            "        hsla2[0] = endHVar;\n" +
            "        hsla2[1] = endSVar;\n" +
            "        hsla2[2] = endLVar;\n" +
            "    }\n\n" +
            
            "    // Handle hue wrapping for shorter distance interpolation\n" +
            "    if (Math.abs(hsla2[0] - hsla1[0]) > 0.5) {\n" +
            "        if (hsla1[0] > hsla2[0]) hsla2[0] += 1;\n" +
            "        else hsla1[0] += 1;\n" +
            "    }\n\n" +
            
            "    // Use a simple linear interpolation for color transition\n" +
            "    // Interpolate in HSL space\n" +
            "    var h = (hsla1[0] + colorRatio * (hsla2[0] - hsla1[0])) % 1;\n" +
            "    var s = hsla1[1] + colorRatio * (hsla2[1] - hsla1[1]);\n" +
            "    var l = hsla1[2] + colorRatio * (hsla2[2] - hsla1[2]);\n" +
            "    var a = hsla1[3] + colorRatio * (hsla2[3] - hsla1[3]);\n\n" +
            
            "    // Convert back to RGB\n" +
            "    var finalColor = hslToRgb(h, s, l);\n" +
            "    finalColor.push(a); // Add back alpha channel\n\n" +
            
            "    finalColor;\n" +
            "}";
            
        fill.property("ADBE Vector Fill Color").expression = fillExpression;
        
        // Position expression with control layer reference for turbulence
        var transformProp = particleGroup.property("Transform");
        if (transformProp) {
            // Position expression
            var posExpression = "// Position expression for trail effect\n" +
                "// Find control layer using pattern matching\n" +
                "var ctrlLayerName = null;\n" +
                "for (var i = 1; i <= thisComp.numLayers; i++) {\n" +
                "    var layerName = thisComp.layer(i).name;\n" +
                "    if (layerName.indexOf(\"SP-ctrl " + instanceNum + "\") === 0) {\n" +
                "        ctrlLayerName = layerName;\n" +
                "        break;\n" +
                "    }\n" +
                "}\n" +
                "if (!ctrlLayerName) {\n" +
                "    // Fallback to just the base name\n" +
                "    ctrlLayerName = \"SP-ctrl " + instanceNum + "\";\n" +
                "}\n" +
                "var ctrlLayer = thisComp.layer(ctrlLayerName);\n" +
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
                "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n" +
                "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n" +
                "    var posOffset = ctrlLayer.effect(\"Position Offset\")(\"Slider\") / 100;\n" +
                "    var turbAmount = ctrlLayer.effect(\"Turbulent\")(\"Slider\");\n" +
                "    var turbSpeed = ctrlLayer.effect(\"Turbulent Speed\")(\"Slider\");\n\n" +
                
                "    // Make a unique random seed for this particle\n" +
                "    seedRandom(particleNum, true);\n" +
                
                "    // Apply position offset and get time in particle lifecycle\n" +
                "    var offset = random(0, lifetime * posOffset);\n" +
                "    var t = (time + offset) % lifetime;\n" +
                "    var particleBirthTime = time - t;\n\n" +
                
                "    // Generate random offset within the emitter area\n" +
                "    var birthOffsetX = emitterWidth > 0 ? random(-emitterWidth/2, emitterWidth/2) : 0;\n" +
                "    var birthOffsetY = emitterHeight > 0 ? random(-emitterHeight/2, emitterHeight/2) : 0;\n\n" +
                
                "    // Calculate physics\n" +
                "    var myVelocity = velocity + random(-velVar, velVar);\n" +
                "    var myVelAngle = velAngle + (velAngleVar > 0 ? random(-velAngleVar, velAngleVar) : 0);\n" +
                "    var myVelX = Math.cos(myVelAngle) * myVelocity;\n" +
                "    var myVelY = Math.sin(myVelAngle) * myVelocity;\n" +
                "    var gravX = Math.cos(gravAngle) * gravMag;\n" +
                "    var gravY = Math.sin(gravAngle) * gravMag;\n\n" +
                
                "    // Calculate movement\n" +
                "    var moveX, moveY;\n" +
                "    if (resistance > 0) {\n" +
                "        var resistFactor = Math.exp(-resistance * t);\n" +
                "        moveX = myVelX * (1 - resistFactor) / resistance + gravX * ((t - (1 - resistFactor) / resistance) / resistance);\n" +
                "        moveY = myVelY * (1 - resistFactor) / resistance + gravY * ((t - (1 - resistFactor) / resistance) / resistance);\n" +
                "    } else {\n" +
                "        moveX = (myVelX * t) + (0.5 * gravX * t * t);\n" +
                "        moveY = (myVelY * t) + (0.5 * gravY * t * t);\n" +
                "    }\n\n" +
                
                "    // Apply turbulence if needed\n" +
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
                "        moveX += turbulence[0];\n" +
                "        moveY += turbulence[1];\n" +
                "    }\n\n" +
                
                "    // Get emitter position at birth\n" +
                "    var emitterAtBirth = ctrlLayer.toWorld([birthOffsetX, birthOffsetY], particleBirthTime);\n\n" +
                
                "    // Calculate final position\n" +
                "    var worldPos = [emitterAtBirth[0] + moveX, emitterAtBirth[1] + moveY];\n" +
                "    particleLayer.fromWorld(worldPos);\n" +
                "}";
                
            transformProp.property("Position").expression = posExpression;
            
            // Scale expression that replaces the size logic
            var scaleExpression = "// Scale expression with distance-based fade logic\n" +
                "// Find control layer using pattern matching\n" +
                "var ctrlLayerName = null;\n" +
                "for (var i = 1; i <= thisComp.numLayers; i++) {\n" +
                "    var layerName = thisComp.layer(i).name;\n" +
                "    if (layerName.indexOf(\"SP-ctrl " + instanceNum + "\") === 0) {\n" +
                "        ctrlLayerName = layerName;\n" +
                "        break;\n" +
                "    }\n" +
                "}\n" +
                "if (!ctrlLayerName) {\n" +
                "    // Fallback to just the base name\n" +
                "    ctrlLayerName = \"SP-ctrl " + instanceNum + "\";\n" +
                "}\n" +
                "var ctrlLayer = thisComp.layer(ctrlLayerName);\n" +
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
                "    var fadeOutPct = ctrlLayer.effect(\"Fade Out Start %\")(\"Slider\") / 100;\n" +
                "    var fadeMethod = ctrlLayer.effect(\"Size Fade Method\")(\"Slider\") > 0.5 ? \"distance\" : \"time\";\n\n" +
                
                "    // Physics parameters for distance calculation\n" +
                "    var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                "    var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
                
                "    // Calculate max travel distance based on physics\n" +
                "    var maxDistance;\n" +
                "    if (resistance > 0) {\n" +
                "        var terminalTime = 5 / resistance;\n" +
                "        var effectiveTime = Math.min(lifetime, terminalTime);\n" +
                "        maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
                "        if (gravity > 0) {\n" +
                "            maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
                "        }\n" +
                "    } else {\n" +
                "        maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
                "    }\n" +
                "    maxDistance = Math.max(100, maxDistance);\n\n" +
                
                "    // Make a unique random seed for this particle\n" +
                "    seedRandom(particleNum + 1000, true);\n" +
                "    \n" +
                "    // Apply size variation - using normal-ish distribution for more natural look\n" +
                "    var sizeMultiplier = 1;\n" +
                "    if (sizeVar > 0) {\n" +
                "        // Smoother than uniform random\n" +
                "        var r1 = random();\n" +
                "        var r2 = random();\n" +
                "        var normalRand = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2) / 5;\n" +
                "        sizeMultiplier += normalRand * sizeVar / 100;\n" +
                "        sizeMultiplier = Math.max(0.1, sizeMultiplier); // Don't allow negative or tiny size\n" +
                "    }\n" +
                "    var mySize = size * sizeMultiplier;\n\n" +
                
                "    // Get particle lifecycle timing\n" +
                "    var offset = random(0, lifetime);\n" +
                "    var t = (time + offset) % lifetime;\n" +
                "    var lifecycleRatio = t / lifetime;\n\n" +
                
                "    // Try to get current position for distance-based fading\n" +
                "    var currentDistance = 0;\n" +
                "    if (fadeMethod == \"distance\") {\n" +
                "        try {\n" +
                "            var layerName = thisLayer.name;\n" +
                "            var groupName = thisProperty.propertyGroup(2).name;\n" +
                "            var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
                "            var birthPos = [0, 0]; // Birth at origin\n" +
                "            var dX = currentPos[0] - birthPos[0];\n" +
                "            var dY = currentPos[1] - birthPos[1];\n" +
                "            currentDistance = Math.sqrt(dX*dX + dY*dY);\n" +
                "        } catch(err) {\n" +
                "            // Fallback to time-based estimation if we can't get position\n" +
                "            var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                "            var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                "            var velX = Math.cos(angle) * velocity;\n" +
                "            var velY = Math.sin(angle) * velocity;\n" +
                "            var gravX = Math.cos(gravAngle) * gravity;\n" +
                "            var gravY = Math.sin(gravAngle) * gravity;\n" +
                "            var estX = velX * t + (0.5 * gravX * t * t);\n" +
                "            var estY = velY * t + (0.5 * gravY * t * t);\n" +
                "            currentDistance = Math.sqrt(estX*estX + estY*estY);\n" +
                "        }\n" +
                "    }\n\n" +
                
                "    // Calculate distance ratio (0-1)\n" +
                "    var distRatio = currentDistance / maxDistance;\n" +
                "    distRatio = Math.max(0, Math.min(1, distRatio));\n\n" +
                
                "    // Determine size factor based on selected method\n" +
                "    var sizeFactor = 1;\n" +
                "    \n" +
                "    if (fadeMethod == \"distance\") {\n" +
                "        // Distance-based scaling\n" +
                "        if (distRatio < fadeInPct) {\n" +
                "            sizeFactor = distRatio / fadeInPct;\n" +
                "        } else if (distRatio > fadeOutPct) {\n" +
                "            sizeFactor = (1 - distRatio) / (1 - fadeOutPct);\n" +
                "        }\n" +
                "    } else {\n" +
                "        // Time-based scaling\n" +
                "        if (lifecycleRatio < fadeInPct) {\n" +
                "            sizeFactor = lifecycleRatio / fadeInPct;\n" +
                "        } else if (lifecycleRatio > fadeOutPct) {\n" +
                "            sizeFactor = (1 - lifecycleRatio) / (1 - fadeOutPct);\n" +
                "        }\n" +
                "    }\n\n" +
                
                "    // Apply ease\n" +
                "    sizeFactor = ease(sizeFactor, 0.33, 0.67, 0, 1);\n\n" +
                
                "    // Final size\n" +
                "    [mySize * sizeFactor, mySize * sizeFactor];\n" +
                "}";
                
            transformProp.property("Scale").expression = scaleExpression;
            
            // Rotation expression for random rotation
            var rotationExpression = "// Rotation expression with random initial angle\n" +
                "// Find control layer using pattern matching\n" +
                "var ctrlLayerName = null;\n" +
                "for (var i = 1; i <= thisComp.numLayers; i++) {\n" +
                "    var layerName = thisComp.layer(i).name;\n" +
                "    if (layerName.indexOf(\"SP-ctrl " + instanceNum + "\") === 0) {\n" +
                "        ctrlLayerName = layerName;\n" +
                "        break;\n" +
                "    }\n" +
                "}\n" +
                "if (!ctrlLayerName) {\n" +
                "    // Fallback to just the base name\n" +
                "    ctrlLayerName = \"SP-ctrl " + instanceNum + "\";\n" +
                "}\n" +
                "var ctrlLayer = thisComp.layer(ctrlLayerName);\n" +
                "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                "var particleNum = " + i + ";\n\n" +
                
                "// Hide inactive particles (rotation doesn't matter when hidden)\n" +
                "if (particleNum > activeCount) {\n" +
                "    0;\n" +
                "} else {\n" +
                "    // Get rotation parameters\n" +
                "    var rotVar = ctrlLayer.effect(\"Rotation Variance\")(\"Slider\");\n" +
                "    var rotSpeed = ctrlLayer.effect(\"Rotation Speed\")(\"Slider\");\n" +
                "    var rotSpeedVar = ctrlLayer.effect(\"Rotation Speed Variance\")(\"Slider\");\n" +
                "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n\n" +
                
                "    // Make a unique random seed for this particle\n" +
                "    seedRandom(particleNum + 2000, true);\n" +
                
                "    // Generate random initial rotation based on variance\n" +
                "    var initRot = 0;\n" +
                "    if (rotVar > 0) {\n" +
                "        initRot = random(-rotVar, rotVar);\n" +
                "    }\n" +
                
                "    // Generate random rotation speed based on variance\n" +
                "    var myRotSpeed = rotSpeed;\n" +
                "    if (rotSpeedVar > 0) {\n" +
                "        // If rotSpeedVar is positive, add the variance\n" +
                "        myRotSpeed += random(-rotSpeedVar, rotSpeedVar);\n" +
                "    } else if (rotSpeedVar < 0) {\n" +
                "        // If rotSpeedVar is negative, randomize the direction\n" +
                "        // Use the absolute value as the variance range\n" +
                "        var absRotSpeedVar = Math.abs(rotSpeedVar);\n" +
                "        var absRotSpeed = Math.abs(rotSpeed);\n" +
                "        // Generate random variance\n" +
                "        var variance = random(-absRotSpeedVar, absRotSpeedVar);\n" +
                "        // Apply variance to speed\n" +
                "        var speedWithVariance = absRotSpeed + variance;\n" +
                "        // Randomly pick direction\n" +
                "        myRotSpeed = random() < 0.5 ? speedWithVariance : -speedWithVariance;\n" +
                "    }\n" +
                
                "    // Apply time factor (use position offset for timing consistency)\n" +
                "    var posOffset = ctrlLayer.effect(\"Position Offset\")(\"Slider\") / 100;\n" +
                "    seedRandom(particleNum, true);\n" +
                "    var offset = random(0, lifetime * posOffset);\n" +
                "    \n" +
                "    // Use actual time without modulo to avoid rotation snaps\n" +
                "    // This ensures continuous rotation throughout the particle's lifetime\n" +
                "    var t = time + offset;\n" +
                "    \n" +
                "    // Apply rotation\n" +
                "    initRot + (myRotSpeed * t);\n" +
                "}";
                
            transformProp.property("Rotation").expression = rotationExpression;
            
            // Opacity expression for fade in/out
            var opacityExpression = "// Opacity expression with distance-based fade logic\n" +
                "// Find control layer using pattern matching\n" +
                "var ctrlLayerName = null;\n" +
                "for (var i = 1; i <= thisComp.numLayers; i++) {\n" +
                "    var layerName = thisComp.layer(i).name;\n" +
                "    if (layerName.indexOf(\"SP-ctrl " + instanceNum + "\") === 0) {\n" +
                "        ctrlLayerName = layerName;\n" +
                "        break;\n" +
                "    }\n" +
                "}\n" +
                "if (!ctrlLayerName) {\n" +
                "    // Fallback to just the base name\n" +
                "    ctrlLayerName = \"SP-ctrl " + instanceNum + "\";\n" +
                "}\n" +
                "var ctrlLayer = thisComp.layer(ctrlLayerName);\n" +
                "var activeCount = ctrlLayer.effect(\"Active Particles\")(\"Slider\");\n" +
                "var particleNum = " + i + ";\n\n" +
                
                "// Hide inactive particles\n" +
                "if (particleNum > activeCount) {\n" +
                "    0;\n" +
                "} else {\n" +
                "    // Get opacity parameters\n" +
                "    var maxOpacity = ctrlLayer.effect(\"Max Opacity\")(\"Slider\");\n" +
                "    var opacityVar = ctrlLayer.effect(\"Opacity Variance\")(\"Slider\");\n" +
                "    var lifetime = ctrlLayer.effect(\"Particle Lifetime (sec)\")(\"Slider\");\n" +
                "    var fadeInPct = ctrlLayer.effect(\"Fade In Distance %\")(\"Slider\") / 100;\n" +
                "    var fadeOutPct = ctrlLayer.effect(\"Fade Out Start %\")(\"Slider\") / 100;\n" +
                "    var fadeMethod = ctrlLayer.effect(\"Opacity Fade Method\")(\"Slider\") > 0.5 ? \"distance\" : \"time\";\n\n" +
                
                "    // Physics parameters for distance calculation\n" +
                "    var velocity = ctrlLayer.effect(\"Velocity\")(\"Slider\");\n" +
                "    var gravity = ctrlLayer.effect(\"Gravity\")(\"Slider\");\n" +
                "    var resistance = ctrlLayer.effect(\"Resistance\")(\"Slider\") / 100;\n\n" +
                
                "    // Calculate max travel distance based on physics\n" +
                "    var maxDistance;\n" +
                "    if (resistance > 0) {\n" +
                "        var terminalTime = 5 / resistance;\n" +
                "        var effectiveTime = Math.min(lifetime, terminalTime);\n" +
                "        maxDistance = velocity * (1 - Math.exp(-resistance * effectiveTime)) / resistance;\n" +
                "        if (gravity > 0) {\n" +
                "            maxDistance += (gravity / resistance) * (effectiveTime - (1 - Math.exp(-resistance * effectiveTime)) / resistance);\n" +
                "        }\n" +
                "    } else {\n" +
                "        maxDistance = (velocity * lifetime) + (0.5 * gravity * lifetime * lifetime);\n" +
                "    }\n" +
                "    maxDistance = Math.max(100, maxDistance);\n\n" +
                
                "    // Make a unique random seed for this particle\n" +
                "    seedRandom(particleNum, true);\n" +
                "    \n" +
                "    // Apply opacity variation\n" +
                "    var myMaxOpacity = maxOpacity + random(-opacityVar, opacityVar);\n" +
                "    myMaxOpacity = Math.max(0, Math.min(100, myMaxOpacity));\n\n" +
                
                "    // Get particle lifecycle timing\n" +
                "    var offset = random(0, lifetime);\n" +
                "    var t = (time + offset) % lifetime;\n" +
                "    var lifecycleRatio = t / lifetime;\n\n" +
                
                "    // Try to get current position for distance-based fading\n" +
                "    var currentDistance = 0;\n" +
                "    if (fadeMethod == \"distance\") {\n" +
                "        try {\n" +
                "            var layerName = thisLayer.name;\n" +
                "            var groupName = thisProperty.propertyGroup(2).name;\n" +
                "            var currentPos = thisLayer.content(groupName).transform.position.value;\n" +
                "            var birthPos = [0, 0]; // Birth at origin\n" +
                "            var dX = currentPos[0] - birthPos[0];\n" +
                "            var dY = currentPos[1] - birthPos[1];\n" +
                "            currentDistance = Math.sqrt(dX*dX + dY*dY);\n" +
                "        } catch(err) {\n" +
                "            // Fallback to time-based estimation if we can't get position\n" +
                "            var angle = degreesToRadians(ctrlLayer.effect(\"Velocity Direction\")(\"Angle\") + 270);\n" +
                "            var gravAngle = degreesToRadians(ctrlLayer.effect(\"Gravity Direction\")(\"Angle\") + 270);\n" +
                "            var velX = Math.cos(angle) * velocity;\n" +
                "            var velY = Math.sin(angle) * velocity;\n" +
                "            var gravX = Math.cos(gravAngle) * gravity;\n" +
                "            var gravY = Math.sin(gravAngle) * gravity;\n" +
                "            var estX = velX * t + (0.5 * gravX * t * t);\n" +
                "            var estY = velY * t + (0.5 * gravY * t * t);\n" +
                "            currentDistance = Math.sqrt(estX*estX + estY*estY);\n" +
                "        }\n" +
                "    }\n\n" +
                
                "    // Calculate distance ratio (0-1)\n" +
                "    var distRatio = currentDistance / maxDistance;\n" +
                "    distRatio = Math.max(0, Math.min(1, distRatio));\n\n" +
                
                "    // Determine fade factor based on selected method\n" +
                "    var opacityFactor = 1;\n" +
                "    \n" +
                "    if (fadeMethod == \"distance\") {\n" +
                "        // Distance-based fade\n" +
                "        if (distRatio < fadeInPct) {\n" +
                "            opacityFactor = distRatio / fadeInPct;\n" +
                "        } else if (distRatio > fadeOutPct) {\n" +
                "            opacityFactor = (1 - distRatio) / (1 - fadeOutPct);\n" +
                "        }\n" +
                "    } else {\n" +
                "        // Time-based fade\n" +
                "        if (lifecycleRatio < fadeInPct) {\n" +
                "            opacityFactor = lifecycleRatio / fadeInPct;\n" +
                "        } else if (lifecycleRatio > fadeOutPct) {\n" +
                "            opacityFactor = (1 - lifecycleRatio) / (1 - fadeOutPct);\n" +
                "        }\n" +
                "    }\n\n" +
                
                "    // Apply ease\n" +
                "    opacityFactor = ease(opacityFactor, 0.33, 0.67, 0, 1);\n\n" +
                
                "    // Final opacity\n" +
                "    myMaxOpacity * opacityFactor;\n" +
                "}";
                
            transformProp.property("Opacity").expression = opacityExpression;
        }
        
        // ... rest of the function
    }
}

// Function to add the appropriate shape to a particle based on type
function addShapeToParticle(particleGroup, shapeType, selectedLayerIndex) {
    var shapeContent = particleGroup.property("Contents");
    var activeComp = app.project.activeItem;
    var ctrlLayer = null;
    
    // Find the control layer to access shape properties
    for (var i = 1; i <= activeComp.numLayers; i++) {
        if (activeComp.layer(i).name.indexOf("SP-ctrl") === 0) {
            ctrlLayer = activeComp.layer(i);
            break;
        }
    }
    
    switch(shapeType) {
        case "ellipse":
            // Add ellipse shape
            var ellipse = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
            ellipse.name = "Circle";
            // Set a fixed size for the ellipse - we'll use scale to control actual size
            ellipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
            break;
            
        case "rectangle":
            // Add rectangle shape
            var rect = shapeContent.addProperty("ADBE Vector Shape - Rect");
            rect.name = "Rectangle";
            // Set a fixed size for the rectangle
            rect.property("ADBE Vector Rect Size").setValue([100, 100]);
            
            // Get roundness from control layer if available
            var roundness = 0;
            if (ctrlLayer && ctrlLayer.effect("Rectangle Roundness")) {
                roundness = ctrlLayer.effect("Rectangle Roundness").property("Slider").value;
            }
            
            // Set rounded corners
            rect.property("ADBE Vector Rect Roundness").setValue(roundness);
            break;
            
        case "star":
            // Add star shape
            var star = shapeContent.addProperty("ADBE Vector Shape - Star");
            star.name = "Star";
            
            // Get star properties from control layer if available
            var points = 5;
            var innerRadius = 25;
            var outerRadius = 50;
            var innerRoundness = 0;
            var outerRoundness = 0;
            
            if (ctrlLayer) {
                if (ctrlLayer.effect("Star Points")) {
                    points = ctrlLayer.effect("Star Points").property("Slider").value;
                }
                
                if (ctrlLayer.effect("Star Inner Radius")) {
                    // Convert percentage to actual radius
                    var innerRadiusPercent = ctrlLayer.effect("Star Inner Radius").property("Slider").value;
                    innerRadius = outerRadius * (innerRadiusPercent / 100);
                }
                
                if (ctrlLayer.effect("Star Inner Roundness")) {
                    innerRoundness = ctrlLayer.effect("Star Inner Roundness").property("Slider").value;
                }
                
                if (ctrlLayer.effect("Star Outer Roundness")) {
                    outerRoundness = ctrlLayer.effect("Star Outer Roundness").property("Slider").value;
                }
            }
            
            // Configure star properties
            star.property("ADBE Vector Star Type").setValue(1); // Star type (1 = star)
            star.property("ADBE Vector Star Points").setValue(points); // Number of points
            star.property("ADBE Vector Star Outer Radius").setValue(outerRadius); // Outer radius
            star.property("ADBE Vector Star Inner Radius").setValue(innerRadius); // Inner radius
            star.property("ADBE Vector Star Inner Roundess").setValue(innerRoundness); // Inner roundness
            star.property("ADBE Vector Star Outer Roundess").setValue(outerRoundness); // Outer roundness
            break;
            
        case "polygon":
            // Add polygon shape
            var poly = shapeContent.addProperty("ADBE Vector Shape - Star");
            poly.name = "Polygon";
            
            // Get polygon properties from control layer if available
            var sides = 6;
            var polyRoundness = 0;
            
            if (ctrlLayer) {
                if (ctrlLayer.effect("Polygon Sides")) {
                    sides = ctrlLayer.effect("Polygon Sides").property("Slider").value;
                }
                
                if (ctrlLayer.effect("Polygon Roundness")) {
                    polyRoundness = ctrlLayer.effect("Polygon Roundness").property("Slider").value;
                }
            }
            
            // Configure polygon properties (a polygon is just a star with type=2)
            poly.property("ADBE Vector Star Type").setValue(2); // Polygon type
            poly.property("ADBE Vector Star Points").setValue(sides); // Number of sides
            poly.property("ADBE Vector Star Outer Radius").setValue(50); // Radius
            poly.property("ADBE Vector Star Outer Roundess").setValue(polyRoundness); // Roundness
            break;
            
        case "selected-layer":
            if (activeComp) {
                try {
                    var selectedLayer = null;
                    
                    // First try to get the layer by index
                    if (selectedLayerIndex) {
                        try {
                            var layerByIndex = activeComp.layer(parseInt(selectedLayerIndex));
                            if (layerByIndex && layerByIndex instanceof ShapeLayer) {
                                selectedLayer = layerByIndex;
                            }
                        } catch (e) {
                            // Continue to fallback methods if this fails
                        }
                    }
                    
                    // If layer by index doesn't work, try to get it by name from control layer comment
                    if (!selectedLayer && ctrlLayer && ctrlLayer.comment && ctrlLayer.comment.indexOf("Selected Layer: ") === 0) {
                        var layerName = ctrlLayer.comment.substring("Selected Layer: ".length);
                        // Try to find a layer with this name
                        for (var i = 1; i <= activeComp.numLayers; i++) {
                            if (activeComp.layer(i).name === layerName && 
                                activeComp.layer(i) instanceof ShapeLayer) {
                                selectedLayer = activeComp.layer(i);
                                
                                // Update the index in the effect control to match found layer
                                if (ctrlLayer && ctrlLayer.effect("Selected Layer")) {
                                    ctrlLayer.effect("Selected Layer").property("Slider").setValue(i);
                                }
                                break;
                            }
                        }
                    }
                    
                    // If we found a valid shape layer, use it
                    if (selectedLayer && selectedLayer instanceof ShapeLayer) {
                        // Store the selected layer index in the control layer
                        if (ctrlLayer && ctrlLayer.effect("Selected Layer")) {
                            ctrlLayer.effect("Selected Layer").property("Slider").setValue(selectedLayer.index);
                        }
                        
                        // Check if this is a particle with an index (to use for random selection)
                        var particleIndex = -1;
                        if (particleGroup.name.indexOf("Particle ") === 0) {
                            particleIndex = parseInt(particleGroup.name.split(" ")[1]) || -1;
                        }
                        
                        // Get all paths from the shape layer
                        var pathResult = getAllPathsFromShapeLayer(selectedLayer);
                        
                        if (pathResult.success && pathResult.pathsData.length > 0) {
                            // Select a path based on particle index
                            var selectedPathIndex;
                            
                            if (particleIndex >= 0) {
                                // Use a deterministic selection based on particle index
                                // This ensures each particle gets a specific shape
                                selectedPathIndex = particleIndex % pathResult.pathsData.length;
                            } else {
                                // Random selection fallback
                                selectedPathIndex = Math.floor(Math.random() * pathResult.pathsData.length);
                            }
                            
                            var selectedPathData = pathResult.pathsData[selectedPathIndex];
                            
                            // Create path in the particle
                            var targetPath = shapeContent.addProperty("ADBE Vector Shape - Group");
                            targetPath.name = "Layer Path " + (selectedPathIndex + 1);
                            
                            // Center the selected path
                            var centeredPath = centerPath(selectedPathData.path, selectedPathData.bounds);
                            targetPath.property("ADBE Vector Shape").setValue(centeredPath);
                        } else {
                            // Fall back to the old method for backward compatibility
                            var result = copyShapePathFromLayer(selectedLayer, shapeContent);
                            if (!result.success) {
                                // If still fails, create a fallback ellipse
                                var fallbackEllipse = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
                                fallbackEllipse.name = "Fallback Circle";
                                fallbackEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
                            }
                        }
                    } else {
                        // If no valid shape layer found, fall back to ellipse
                        var nonShapeEllipse = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
                        nonShapeEllipse.name = "Default Circle";
                        nonShapeEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
                    }
                } catch (e) {
                    // If there's an error, fall back to ellipse
                    var errorEllipse = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
                    errorEllipse.name = "Error Fallback Circle";
                    errorEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
                }
            } else {
                // If no active comp, fall back to ellipse
                var defaultEllipse = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
                defaultEllipse.name = "Default Circle";
                defaultEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
            }
            break;
            
        default:
            // Default to ellipse
            var defaultShape = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
            defaultShape.name = "Default Shape";
            defaultShape.property("ADBE Vector Ellipse Size").setValue([100, 100]);
    }
}

// Function to copy shape path from a shape layer
function copyShapePathFromLayer(shapeLayer, targetContent) {
    try {
        // Try to find shape paths in the layer
        var foundPaths = false;
        var contents = shapeLayer.property("Contents");
        var pathsData = []; // Array to store multiple paths and their bounds
        
        // Helper function to search for paths recursively
        function findAndCopyPath(contents) {
            var foundAnyPath = false;
            
            for (var i = 1; i <= contents.numProperties; i++) {
                var prop = contents.property(i);
                
                // If it's a shape group, check its contents
                if (prop.matchName === "ADBE Vector Group") {
                    var groupContents = prop.property("Contents");
                    // First, try to find paths directly in this group
                    for (var j = 1; j <= groupContents.numProperties; j++) {
                        var subProp = groupContents.property(j);
                        if (subProp.matchName === "ADBE Vector Shape - Group") {
                            // Found a path!
                            var path = subProp.property("ADBE Vector Shape");
                            
                            // Copy path value at time 0
                            var pathValue = path.valueAtTime(0, false);
                            
                            // Calculate bounds of the path
                            var bounds = calculatePathBounds(pathValue);
                            
                            // Store path and bounds
                            pathsData.push({
                                path: pathValue,
                                bounds: bounds
                            });
                            
                            foundPaths = true;
                            foundAnyPath = true;
                            // Don't return here, continue collecting paths
                        }
                    }
                    
                    // If no path found directly, search deeper in the group
                    var foundInnerPath = findAndCopyPath(groupContents);
                    if (foundInnerPath) {
                        foundAnyPath = true;
                    }
                }
                // If it's a path directly, copy it
                else if (prop.matchName === "ADBE Vector Shape - Group") {
                    var path = prop.property("ADBE Vector Shape");
                    
                    // Copy path value at time 0
                    var pathValue = path.valueAtTime(0, false);
                    
                    // Calculate bounds of the path
                    var bounds = calculatePathBounds(pathValue);
                    
                    // Store path and bounds
                    pathsData.push({
                        path: pathValue,
                        bounds: bounds
                    });
                    
                    foundPaths = true;
                    foundAnyPath = true;
                    // Don't return here, continue collecting paths
                }
            }
            return foundAnyPath;
        }
        
        // Start the recursive search
        findAndCopyPath(contents);
        
        // If path was found, copy it and center it
        if (foundPaths && pathsData.length > 0) {
            // For now, just use the first path to maintain backward compatibility
            // The addShapeToParticle function will handle multiple paths
            var firstPathData = pathsData[0];
            var targetPath = targetContent.addProperty("ADBE Vector Shape - Group");
            targetPath.name = "Layer Path";
            
            // Center the path by applying offset
            var centeredPath = centerPath(firstPathData.path, firstPathData.bounds);
            targetPath.property("ADBE Vector Shape").setValue(centeredPath);
            
            // Store all paths data for later use
            return {
                success: true, 
                pathsData: pathsData
            };
        } else {
            // If no path found, fall back to ellipse
            var fallbackEllipse = targetContent.addProperty("ADBE Vector Shape - Ellipse");
            fallbackEllipse.name = "Fallback Circle";
            fallbackEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
            
            return {
                success: false,
                pathsData: []
            };
        }
    } catch (e) {
        // If there's an error, fall back to ellipse
        var errorEllipse = targetContent.addProperty("ADBE Vector Shape - Ellipse");
        errorEllipse.name = "Error Fallback Circle";
        errorEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
        
        return {
            success: false,
            pathsData: [],
            error: e.toString()
        };
    }
}

// Function to collect all paths from a shape layer for multi-shape support
function getAllPathsFromShapeLayer(shapeLayer) {
    try {
        var pathsData = []; // Array to store multiple paths and their bounds
        var contents = shapeLayer.property("Contents");
        
        // Helper function to search for paths recursively
        function findAllPaths(contents) {
            for (var i = 1; i <= contents.numProperties; i++) {
                var prop = contents.property(i);
                
                // If it's a shape group, check its contents
                if (prop.matchName === "ADBE Vector Group") {
                    var groupContents = prop.property("Contents");
                    // First, try to find paths directly in this group
                    for (var j = 1; j <= groupContents.numProperties; j++) {
                        var subProp = groupContents.property(j);
                        if (subProp.matchName === "ADBE Vector Shape - Group") {
                            // Found a path!
                            var path = subProp.property("ADBE Vector Shape");
                            
                            // Copy path value at time 0
                            var pathValue = path.valueAtTime(0, false);
                            
                            // Calculate bounds of the path
                            var bounds = calculatePathBounds(pathValue);
                            
                            // Store path and bounds
                            pathsData.push({
                                path: pathValue,
                                bounds: bounds
                            });
                        }
                    }
                    
                    // Search deeper in the group for more paths
                    findAllPaths(groupContents);
                }
                // If it's a path directly, copy it
                else if (prop.matchName === "ADBE Vector Shape - Group") {
                    var path = prop.property("ADBE Vector Shape");
                    
                    // Copy path value at time 0
                    var pathValue = path.valueAtTime(0, false);
                    
                    // Calculate bounds of the path
                    var bounds = calculatePathBounds(pathValue);
                    
                    // Store path and bounds
                    pathsData.push({
                        path: pathValue,
                        bounds: bounds
                    });
                }
            }
        }
        
        // Start the recursive search
        findAllPaths(contents);
        
        return {
            success: pathsData.length > 0,
            pathsData: pathsData
        };
    } catch (e) {
        return {
            success: false,
            pathsData: [],
            error: e.toString()
        };
    }
}

// Helper function to calculate path bounds
function calculatePathBounds(pathValue) {
    try {
        var vertices = pathValue.vertices;
        if (!vertices || vertices.length === 0) {
            return {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, centerX: 0, centerY: 0};
        }
        
        // Initialize bounds with first vertex
        var left = vertices[0][0];
        var top = vertices[0][1];
        var right = vertices[0][0];
        var bottom = vertices[0][1];
        
        // Find min/max values
        for (var i = 1; i < vertices.length; i++) {
            var vertex = vertices[i];
            left = Math.min(left, vertex[0]);
            top = Math.min(top, vertex[1]);
            right = Math.max(right, vertex[0]);
            bottom = Math.max(bottom, vertex[1]);
        }
        
        // Calculate width, height and center
        var width = right - left;
        var height = bottom - top;
        var centerX = left + width / 2;
        var centerY = top + height / 2;
        
        return {
            left: left,
            top: top,
            right: right,
            bottom: bottom,
            width: width,
            height: height,
            centerX: centerX,
            centerY: centerY
        };
    } catch (e) {
        return {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, centerX: 0, centerY: 0};
    }
}

// Helper function to center a path
function centerPath(pathValue, bounds) {
    try {
        // Create a copy of the path value
        var newPath = new Shape();
        newPath.closed = pathValue.closed;
        
        // Scale factor to increase shape size
        var scaleFactor = 10;
        
        // Copy vertices, apply centering offset, and scale by 10x
        var vertices = [];
        for (var i = 0; i < pathValue.vertices.length; i++) {
            // Center the point first, then scale it
            var x = (pathValue.vertices[i][0] - bounds.centerX) * scaleFactor;
            var y = (pathValue.vertices[i][1] - bounds.centerY) * scaleFactor;
            vertices.push([x, y]);
        }
        newPath.vertices = vertices;
        
        // Copy in tangents and scale them by the same factor
        var inTangents = [];
        for (var i = 0; i < pathValue.inTangents.length; i++) {
            // Scale the tangents by the same factor to maintain curve shape
            var tx = pathValue.inTangents[i][0] * scaleFactor;
            var ty = pathValue.inTangents[i][1] * scaleFactor;
            inTangents.push([tx, ty]);
        }
        newPath.inTangents = inTangents;
        
        // Copy out tangents and scale them by the same factor
        var outTangents = [];
        for (var i = 0; i < pathValue.outTangents.length; i++) {
            // Scale the tangents by the same factor to maintain curve shape
            var tx = pathValue.outTangents[i][0] * scaleFactor;
            var ty = pathValue.outTangents[i][1] * scaleFactor;
            outTangents.push([tx, ty]);
        }
        newPath.outTangents = outTangents;
        
        return newPath;
    } catch (e) {
        return pathValue; // Return original if anything goes wrong
    }
}

// Function to add a layer reference to a particle
function addLayerReferenceToParticle(particleGroup, layerIndex) {
    try {
        // Add a rectangle as a placeholder for the layer reference
        var shapeContent = particleGroup.property("Contents");
        var rect = shapeContent.addProperty("ADBE Vector Shape - Rect");
        rect.name = "Layer Reference";
        
        // Make the rectangle small initially
        rect.property("ADBE Vector Rect Size").setValue([10, 10]);
        
        // Add an expression to the fill that will make it invisible
        var fill = particleGroup.property("Contents").property("Particle " + particleGroup.name.split(" ")[1] + " Fill");
        if (fill) {
            fill.property("ADBE Vector Fill Opacity").setValue(0);
        }
        
        // Calculate proper index using "thisComp.layer(index)" syntax
        var layerExpression = "// Reference to source layer\n" +
            "var sourceLayer = thisComp.layer(" + layerIndex + ");\n" +
            "var offsetTime = 0; // You can adjust this for animation timing\n\n" +
            "// Get layer dimensions\n" +
            "var layerWidth = sourceLayer.width;\n" +
            "var layerHeight = sourceLayer.height;\n\n" +
            "// Size the rect to match the layer aspect ratio\n" +
            "[layerWidth, layerHeight];";
        
        rect.property("ADBE Vector Rect Size").expression = layerExpression;
        
        // Add a repeater to create only one instance
        var repeater = shapeContent.addProperty("ADBE Vector Filter - Repeater");
        repeater.property("ADBE Vector Repeater Copies").setValue(1);
        
        // Add an image fill effect
        var imageEffect = particleGroup.property("Effects").addProperty("ADBE Exposure");
        imageEffect.name = "Layer Reference";
        
        // Set up the image fill expression
        var imageExpression = "// Reference the layer for this particle\n" +
            "var sourceLayer = thisComp.layer(" + layerIndex + ");\n" +
            "var particleLayer = thisLayer;\n\n" +
            "// Use this effect to make the layer reference visible\n" +
            "0; // Just a placeholder value";
            
        imageEffect.property("ADBE Exposure-0001").expression = imageExpression;
        
        return true;
    } catch (e) {
        // If there's an error, fall back to a simple shape
        var shapeContent = particleGroup.property("Contents");
        var fallbackEllipse = shapeContent.addProperty("ADBE Vector Shape - Ellipse");
        fallbackEllipse.name = "Fallback Circle";
        fallbackEllipse.property("ADBE Vector Ellipse Size").setValue([100, 100]);
        
        return false;
    }
}

// Function to find existing particle systems in the active composition
function findExistingParticleSystems() {
    // Check if a project is open
    if (!app.project) {
        return "[]";
    }

    var activeComp = app.project.activeItem;
    if (!activeComp || !(activeComp instanceof CompItem)) {
        return "[]";
    }
    
    var systems = [];
    for (var i = 1; i <= activeComp.numLayers; i++) {
        var layer = activeComp.layer(i);
        
        // Check if it's a control layer with SP-ctrl naming pattern
        if (layer.name.indexOf("SP-ctrl") === 0) {
            systems.push({
                name: layer.name,
                index: i
            });
        }
    }
    
    return JSON.stringify(systems);
}

// Function to read settings from an existing particle system
function readParticleSystemSettings(layerName) {
    // Check if a project is open
    if (!app.project) {
        return "{}";
    }

    var activeComp = app.project.activeItem;
    if (!activeComp || !(activeComp instanceof CompItem)) {
        return "{}";
    }
    
    var settings = {};
    
    try {
        // Find the control layer by name
        var controlLayer = null;
        for (var i = 1; i <= activeComp.numLayers; i++) {
            if (activeComp.layer(i).name === layerName) {
                controlLayer = activeComp.layer(i);
                break;
            }
        }
        
        if (!controlLayer) {
            return "{}";
        }
        
        // Find the corresponding particle layer
        var particleLayer = null;
        // Extract the instance number (e.g., "SP-ctrl 1" -> "1")
        var instanceNum = controlLayer.name.match(/SP-ctrl (\d+)/);
        if (instanceNum && instanceNum[1]) {
            var particleLayerName = "Shape Particles " + instanceNum[1];
            // Look for the matching particle layer
            for (var i = 1; i <= activeComp.numLayers; i++) {
                if (activeComp.layer(i).name === particleLayerName) {
                    particleLayer = activeComp.layer(i);
                    break;
                }
            }
        }
        
        // Read particle count from the Active Particles slider
        var activeParticles = controlLayer.effect("Active Particles");
        if (activeParticles) {
            settings.totalParticles = activeParticles.property("Slider").value;
            // Also store as "Active Particles" for mapping in the UI
            settings["Active Particles"] = activeParticles.property("Slider").value;
        }
        
        // Read total particles count
        var totalParticles = controlLayer.effect("Total Particles");
        if (totalParticles) {
            settings["Total Particles"] = totalParticles.property("Slider").value;
        } else {
            // If the control doesn't exist (older particle systems), default to same as active
            settings["Total Particles"] = settings["Active Particles"] || 50;
        }
        
        // Read all possible settings
        var effectsToRead = [
            // Basic settings
            "Emitter Width", "Emitter Height", "Particle Lifetime (sec)",
            "Position Offset", "Fade In Distance %", "Fade Out Start %",
            
            // Appearance settings
            "Particle Size", "Size Variance", "Size Fade Method",
            "Start Color", "End Color", "Color Offset", "Color Fade Method",
            "Max Opacity", "Opacity Variance", "Opacity Fade Method", 
            "Rotation Variance",
            
            // Motion settings
            "Velocity", "Velocity Variance", "Velocity Direction", 
            "Velocity Direction Variance", "Gravity", "Gravity Direction", 
            "Resistance",
            
            // Effects
            "Turbulent", "Turbulent Speed"
        ];
        
        // Read each effect
        for (var i = 0; i < effectsToRead.length; i++) {
            var effectName = effectsToRead[i];
            var effect = controlLayer.effect(effectName);
            
            if (effect) {
                // Handle different property types accordingly
                if (effectName === "Start Color" || 
                    effectName === "End Color") {
                    // These are multi-dimensional values
                    settings[effectName] = effect.property(1).value;
                } else if (effectName === "Velocity Direction" || 
                           effectName === "Gravity Direction") {
                    // These are angle values
                    settings[effectName] = effect.property("Angle").value;
                } else {
                    // Most effects are sliders
                    settings[effectName] = effect.property("Slider").value;
                }
            }
        }
        
        // Read shape-specific properties to help determine shape types
        var shapePropertiesToRead = [
            "Rectangle Roundness", "Star Points", "Star Inner Radius", 
            "Star Inner Roundness", "Star Outer Roundness", "Polygon Sides",
            "Polygon Roundness", "Selected Layer"
        ];
        
        for (var i = 0; i < shapePropertiesToRead.length; i++) {
            var propName = shapePropertiesToRead[i];
            var effect = controlLayer.effect(propName);
            if (effect) {
                settings[propName] = effect.property("Slider").value;
            }
        }
        
        // If we found both control and particle layers, determine actual shape types
        if (controlLayer && particleLayer) {
            settings["Shape Types"] = getCurrentShapeTypes(controlLayer, particleLayer);
        } else {
            // If we couldn't find the particle layer, use properties to guess shape types
            var shapeTypes = [];
            
            // Check for selected layer
            if (settings["Selected Layer"] > 0) {
                shapeTypes.push("selected-layer");
            }
            
            // Check for rectangle shape
            if (settings["Rectangle Roundness"] !== undefined) {
                shapeTypes.push("rectangle");
            }
            
            // Check for star shape
            if (settings["Star Points"] !== undefined) {
                shapeTypes.push("star");
            }
            
            // Check for polygon shape
            if (settings["Polygon Sides"] !== undefined) {
                shapeTypes.push("polygon");
            }
            
            // If no special shapes found, default to ellipse
            if (shapeTypes.length === 0 || (shapeTypes.length === 1 && shapeTypes[0] === "selected-layer")) {
                shapeTypes.push("ellipse");
            }
            
            settings["Shape Types"] = shapeTypes;
        }
    } catch (e) {
        return "{\"error\": \"" + e.toString() + "\"}";
    }
    
    return JSON.stringify(settings);
}

// Function to create a new particle system
function createParticleSystem(totalParticles, activeParticles, selectedSystemName, settingsJSON) {
    try {
        // Check if a project is open
        if (!app.project) {
            return "Please open a project first.";
        }

        var activeComp = app.project.activeItem;
        if (!activeComp || !(activeComp instanceof CompItem)) {
            return "Please select or open a composition.";
        }
        
        // Validate particle count
        if (isNaN(totalParticles) || totalParticles < 1 || totalParticles > 500) {
            return "Please enter a valid total particle count between 1 and 500.";
        }
        
        if (isNaN(activeParticles) || activeParticles < 1 || activeParticles > totalParticles) {
            activeParticles = totalParticles; // Default to all particles active
        }
        
        // Begin undo group
        app.beginUndoGroup("Create Particle System");
        
        // Load settings from selected system if provided
        var loadedSettings = null;
        if (selectedSystemName && selectedSystemName !== "none") {
            for (var i = 1; i <= activeComp.numLayers; i++) {
                if (activeComp.layer(i).name === selectedSystemName) {
                    loadedSettings = readSettingsFromLayer(activeComp.layer(i));
                    break;
                }
            }
        } 
        // Otherwise parse settings from JSON if provided
        else if (settingsJSON) {
            try {
                loadedSettings = JSON.parse(settingsJSON);
            } catch (e) {
                alert("Error parsing settings: " + e);
            }
        }
        
        // Store selected layer information before creating new layers (which changes indices)
        var selectedLayerInfo = null;
        if (loadedSettings && loadedSettings["Selected Layer"]) {
            var selectedLayerIndex = parseInt(loadedSettings["Selected Layer"]);
            if (!isNaN(selectedLayerIndex) && selectedLayerIndex > 0 && selectedLayerIndex <= activeComp.numLayers) {
                try {
                    var selectedLayer = activeComp.layer(selectedLayerIndex);
                    if (selectedLayer && selectedLayer instanceof ShapeLayer) {
                        selectedLayerInfo = {
                            index: selectedLayerIndex,
                            name: selectedLayer.name
                        };
                    }
                } catch (e) {
                    // If we can't access the layer, just continue without it
                }
            }
        }
        
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
        
        // If we had a selected layer, adjust its index to account for the new layers we just added
        // Typically, the index would increase by 2 (particle layer and control layer)
        if (selectedLayerInfo && loadedSettings) {
            // Since we're adding 2 new layers at the top, original layers shift down by 2 positions
            // Update the index in settings
            var adjustedIndex = selectedLayerInfo.index + 2;
            loadedSettings["Selected Layer"] = adjustedIndex;
            
            // Also store the layer name in a comment on the control layer for better reference
            controlLayer.comment = "Selected Layer: " + selectedLayerInfo.name;
        }
        
        // Link SP-ctrl layer position to particle layer initially
        controlLayer.property("Position").expression = 
            "thisComp.layer(\"Shape Particles " + instanceNum + "\").transform.position";
            
        // After creation, switch the expression to have particles follow the control
        particleLayer.property("Position").expression = 
            "thisComp.layer(\"SP-ctrl " + instanceNum + "\").transform.position";
            
        // Remove the expression from control layer after initial positioning
        controlLayer.property("Position").expression = "";
        
        // Add effect controls to the control layer
        addParticleControls(controlLayer, totalParticles, activeParticles);
        
        // Apply loaded settings if available
        if (loadedSettings) {
            applyParticleSystemSettings(controlLayer, loadedSettings);
        }

        // Create particle system with the specified shape
        createParticles(particleLayer, instanceNum, totalParticles, 1, loadedSettings);
        
        app.endUndoGroup();
        
        // Return a JSON response with success and the name of the created system
        return JSON.stringify({
            success: true,
            name: controlLayer.name
        });
    } catch (e) {
        if (app.project) app.endUndoGroup();
        return e.toString();
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

// Helper function to read settings directly from a layer object
function readSettingsFromLayer(layer) {
    var settings = {
        totalParticles: 50 // Default
    };
    
    try {
        // Read particle count from the Active Particles slider
        var activeParticles = layer.effect("Active Particles");
        if (activeParticles) {
            settings.totalParticles = activeParticles.property("Slider").value;
        }
        
        // Total Particles control is no longer in the effect controls
        // We'll derive from our local settings or active particles
        settings["Total Particles"] = settings.totalParticles;
        
        // Read other settings - focus on the most important ones
        var effectsToRead = [
            "Active Particles", "Position Offset", "Color Offset", "Fade In Distance %",
            "Fade Out Start %", "Rotation Variance", "Emitter Width", 
            "Emitter Height", "Particle Lifetime (sec)", "Particle Size", 
            "Size Variance", "Velocity", "Velocity Variance", "Velocity Direction", 
            "Velocity Direction Variance", "Gravity", "Gravity Direction", 
            "Resistance", "Max Opacity", "Opacity Variance", "Start Color", 
            "End Color", "Color Variance", "Turbulent Speed", "Turbulent",
            // Add shape-specific properties
            "Rectangle Roundness", "Star Points", "Star Inner Radius", 
            "Star Inner Roundness", "Star Outer Roundness", "Polygon Sides",
            "Polygon Roundness", "Selected Layer"
        ];
        
        // Read each effect
        for (var i = 0; i < effectsToRead.length; i++) {
            var effectName = effectsToRead[i];
            var effect = layer.effect(effectName);
            
            if (effect) {
                // Handle different property types accordingly
                if (effectName === "Start Color" || 
                    effectName === "End Color") {
                    // These are multi-dimensional values
                    settings[effectName] = effect.property(1).value;
                } else if (effectName === "Velocity Direction" || 
                           effectName === "Gravity Direction") {
                    // These are angle values
                    settings[effectName] = effect.property("Angle").value;
                } else {
                    // Most effects are sliders
                    settings[effectName] = effect.property("Slider").value;
                }
            }
        }
        
        // Try to determine shape types from layer name and properties
        var layerName = layer.name;
        var shapeTypes = [];
        
        // Check for ellipse shape
        if (layerName.indexOf("[Circle]") !== -1 || layerName.indexOf("Ellipse") !== -1) {
            shapeTypes.push("ellipse");
        }
        
        // Check for rectangle shape
        if (layerName.indexOf("[Rectangle]") !== -1 || settings["Rectangle Roundness"] !== undefined) {
            shapeTypes.push("rectangle");
        }
        
        // Check for star shape
        if (layerName.indexOf("[Star]") !== -1 || settings["Star Points"] !== undefined) {
            shapeTypes.push("star");
        }
        
        // Check for polygon shape
        if (layerName.indexOf("[Polygon]") !== -1 || settings["Polygon Sides"] !== undefined) {
            shapeTypes.push("polygon");
        }
        
        // Check for selected layer
        if (layerName.indexOf("[Selected Layer]") !== -1 || settings["Selected Layer"] !== undefined) {
            shapeTypes.push("selected-layer");
        }
        
        // If we found any shape types, store them
        if (shapeTypes.length > 0) {
            settings["Shape Types"] = shapeTypes;
        } else {
            // Default to ellipse if we couldn't determine shape types
            settings["Shape Types"] = ["ellipse"];
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
            if (key === "totalParticles") {
                // Set the active particles count
                var activeParticles = layer.effect("Active Particles");
                if (activeParticles) {
                    activeParticles.property("Slider").setValue(settings[key]);
                }
                continue;
            }
            
            // Special handling for Total Particles
            if (key === "Total Particles") {
                // Total Particles control is removed - no need to set it
                continue;
            }
            
            // Skip shape types array as it's handled specially
            if (key === "Shape Types") {
                continue;
            }
            
            // Skip Shape Type as we're using Shape Types array now
            if (key === "Shape Type") {
                continue;
            }
            
            var effect = layer.effect(key);
            if (effect) {
                // Different handling based on effect type
                if (key === "Start Color" || key === "End Color") {
                    effect.property(1).setValue(settings[key]);
                } else if (key === "Velocity Direction" || key === "Gravity Direction") {
                    effect.property("Angle").setValue(settings[key]);
                } else {
                    effect.property("Slider").setValue(settings[key]);
                }
            }
        }
        
        // Set the layer name to include shape types in the name suffix
        var layerName = layer.name;
        
        // Extract the instance number from the current name (SP-ctrl X)
        var instanceNum = layerName.match(/SP-ctrl (\d+)/);
        
        if (instanceNum && instanceNum[1]) {
            instanceNum = instanceNum[1];
            
            // Create a new name with only the instance number, no shape types
            var newName = "SP-ctrl " + instanceNum;
            
            // Update the layer name (only if different to avoid unnecessary updates)
            if (layer.name !== newName) {
                layer.name = newName;
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

// Function to add all the particle control effects to a layer
function addParticleControls(layer, maxParticles, activeParticles) {
    // Count controls
    // Total Particles control removed as changing it requires system rebuild
    
    var particleCount = layer.Effects.addProperty("ADBE Slider Control");
    particleCount.name = "Active Particles";
    particleCount.property("Slider").setValue(activeParticles);
    
    // Emitter settings
    var emitterWidth = layer.Effects.addProperty("ADBE Slider Control");
    emitterWidth.name = "Emitter Width";
    emitterWidth.property("Slider").setValue(100);
    
    var emitterHeight = layer.Effects.addProperty("ADBE Slider Control");
    emitterHeight.name = "Emitter Height";
    emitterHeight.property("Slider").setValue(100);
    
    // Add Selected Layer effect to store the layer index
    var selectedLayer = layer.Effects.addProperty("ADBE Slider Control");
    selectedLayer.name = "Selected Layer";
    selectedLayer.property("Slider").setValue(0); // Default to no layer selected
    
    // Lifecycle settings
    var lifetime = layer.Effects.addProperty("ADBE Slider Control");
    lifetime.name = "Particle Lifetime (sec)";
    lifetime.property("Slider").setValue(4);
    
    var positionOffset = layer.Effects.addProperty("ADBE Slider Control");
    positionOffset.name = "Position Offset";
    positionOffset.property("Slider").setValue(100);
    
    var fadeIn = layer.Effects.addProperty("ADBE Slider Control");
    fadeIn.name = "Fade In Distance %";
    fadeIn.property("Slider").setValue(10);
    
    var fadeOut = layer.Effects.addProperty("ADBE Slider Control");
    fadeOut.name = "Fade Out Start %";
    fadeOut.property("Slider").setValue(80);
    
    // Appearance settings
    var particleSize = layer.Effects.addProperty("ADBE Slider Control");
    particleSize.name = "Particle Size";
    particleSize.property("Slider").setValue(10);
    
    var sizeVariance = layer.Effects.addProperty("ADBE Slider Control");
    sizeVariance.name = "Size Variance";
    sizeVariance.property("Slider").setValue(5);
    
    var sizeFadeMethod = layer.Effects.addProperty("ADBE Slider Control");
    sizeFadeMethod.name = "Size Fade Method";
    sizeFadeMethod.property("Slider").setValue(1); // 0=Time, 1=Distance
    
    // Color settings
    var startColor = layer.Effects.addProperty("ADBE Color Control");
    startColor.name = "Start Color";
    startColor.property(1).setValue([1, 1, 1, 1]); // White with full opacity
    
    var endColor = layer.Effects.addProperty("ADBE Color Control");
    endColor.name = "End Color";
    endColor.property(1).setValue([1, 1, 1, 0]); // White with 0 opacity
    
    var colorOffset = layer.Effects.addProperty("ADBE Slider Control");
    colorOffset.name = "Color Offset";
    colorOffset.property("Slider").setValue(20);
    
    var colorFadeMethod = layer.Effects.addProperty("ADBE Slider Control");
    colorFadeMethod.name = "Color Fade Method";
    colorFadeMethod.property("Slider").setValue(1); // 0=Time, 1=Distance
    
    var colorVariance = layer.Effects.addProperty("ADBE Slider Control");
    colorVariance.name = "Color Variance";
    colorVariance.property("Slider").setValue(0);
    
    // Opacity settings
    var maxOpacity = layer.Effects.addProperty("ADBE Slider Control");
    maxOpacity.name = "Max Opacity";
    maxOpacity.property("Slider").setValue(100);
    
    var opacityVariance = layer.Effects.addProperty("ADBE Slider Control");
    opacityVariance.name = "Opacity Variance";
    opacityVariance.property("Slider").setValue(20);
    
    var opacityFadeMethod = layer.Effects.addProperty("ADBE Slider Control");
    opacityFadeMethod.name = "Opacity Fade Method";
    opacityFadeMethod.property("Slider").setValue(1); // 0=Time, 1=Distance
    
    // Rotation
    var rotationVariance = layer.Effects.addProperty("ADBE Slider Control");
    rotationVariance.name = "Rotation Variance";
    rotationVariance.property("Slider").setValue(180);
    
    var rotationSpeed = layer.Effects.addProperty("ADBE Slider Control");
    rotationSpeed.name = "Rotation Speed";
    rotationSpeed.property("Slider").setValue(0);
    
    var rotationSpeedVariance = layer.Effects.addProperty("ADBE Slider Control");
    rotationSpeedVariance.name = "Rotation Speed Variance";
    rotationSpeedVariance.property("Slider").setValue(0);
    
    // Motion
    var velocity = layer.Effects.addProperty("ADBE Slider Control");
    velocity.name = "Velocity";
    velocity.property("Slider").setValue(100);
    
    var velocityVariance = layer.Effects.addProperty("ADBE Slider Control");
    velocityVariance.name = "Velocity Variance";
    velocityVariance.property("Slider").setValue(50);
    
    var velocityDirection = layer.Effects.addProperty("ADBE Angle Control");
    velocityDirection.name = "Velocity Direction";
    velocityDirection.property("Angle").setValue(0);
    
    var velocityDirectionVariance = layer.Effects.addProperty("ADBE Slider Control");
    velocityDirectionVariance.name = "Velocity Direction Variance";
    velocityDirectionVariance.property("Slider").setValue(10);
    
    var gravity = layer.Effects.addProperty("ADBE Slider Control");
    gravity.name = "Gravity";
    gravity.property("Slider").setValue(98);
    
    var gravityDirection = layer.Effects.addProperty("ADBE Angle Control");
    gravityDirection.name = "Gravity Direction";
    gravityDirection.property("Angle").setValue(180);
    
    var resistance = layer.Effects.addProperty("ADBE Slider Control");
    resistance.name = "Resistance";
    resistance.property("Slider").setValue(0);
    
    // Effects
    var turbulent = layer.Effects.addProperty("ADBE Slider Control");
    turbulent.name = "Turbulent";
    turbulent.property("Slider").setValue(40);
    
    var turbulentSpeed = layer.Effects.addProperty("ADBE Slider Control");
    turbulentSpeed.name = "Turbulent Speed";
    turbulentSpeed.property("Slider").setValue(1);
    
    // Shape-specific properties
    var rectangleRoundness = layer.Effects.addProperty("ADBE Slider Control");
    rectangleRoundness.name = "Rectangle Roundness";
    rectangleRoundness.property("Slider").setValue(0);
    
    var starPoints = layer.Effects.addProperty("ADBE Slider Control");
    starPoints.name = "Star Points";
    starPoints.property("Slider").setValue(5);
    
    var starInnerRadius = layer.Effects.addProperty("ADBE Slider Control");
    starInnerRadius.name = "Star Inner Radius";
    starInnerRadius.property("Slider").setValue(50);
    
    var starInnerRoundness = layer.Effects.addProperty("ADBE Slider Control");
    starInnerRoundness.name = "Star Inner Roundness";
    starInnerRoundness.property("Slider").setValue(0);
    
    var starOuterRoundness = layer.Effects.addProperty("ADBE Slider Control");
    starOuterRoundness.name = "Star Outer Roundness";
    starOuterRoundness.property("Slider").setValue(0);
    
    // Polygon properties
    var polygonSides = layer.Effects.addProperty("ADBE Slider Control");
    polygonSides.name = "Polygon Sides";
    polygonSides.property("Slider").setValue(6);
    
    var polygonRoundness = layer.Effects.addProperty("ADBE Slider Control");
    polygonRoundness.name = "Polygon Roundness";
    polygonRoundness.property("Slider").setValue(0);
}

// Function to update an existing particle system in real-time
function updateParticleSystem(layerName, settingsJSON) {
    try {
        // Check if a project is open
        if (!app.project) {
            return "Please open a project first.";
        }
        
        var activeComp = app.project.activeItem;
        if (!activeComp || !(activeComp instanceof CompItem)) {
            return "Please select or open a composition.";
        }
        
        // Parse settings
        var settings;
        try {
            settings = JSON.parse(settingsJSON);
        } catch (e) {
            return "Error parsing settings: " + e.toString();
        }
        
        // Find the control layer
        var controlLayer = null;
        for (var i = 1; i <= activeComp.numLayers; i++) {
            if (activeComp.layer(i).name === layerName) {
                controlLayer = activeComp.layer(i);
                break;
            }
        }
        
        if (!controlLayer) {
            return "Control layer not found: " + layerName;
        }
        
        // Begin undo group
        app.beginUndoGroup("Update Particle System");
        
        // Extract instance number from control layer name
        var instanceMatch = layerName.match(/SP-ctrl (\d+)/);
        var instanceNum = instanceMatch ? parseInt(instanceMatch[1]) : 1;
        var particleLayerName = "Shape Particles " + instanceNum;
        
        // Find the particle layer
        var particleLayer = null;
        for (var j = 1; j <= activeComp.numLayers; j++) {
            if (activeComp.layer(j).name === particleLayerName) {
                particleLayer = activeComp.layer(j);
                break;
            }
        }
        
        if (!particleLayer) {
            app.endUndoGroup();
            return "Particle layer not found: " + particleLayerName;
        }
        
        // If we're updating a selected layer reference, check if we need to store the layer name
        if (settings["Selected Layer"] !== undefined) {
            var selectedLayerIndex = parseInt(settings["Selected Layer"]);
            if (!isNaN(selectedLayerIndex) && selectedLayerIndex > 0 && selectedLayerIndex <= activeComp.numLayers) {
                try {
                    var selectedLayer = activeComp.layer(selectedLayerIndex);
                    if (selectedLayer && selectedLayer instanceof ShapeLayer) {
                        // Store the layer name in the control layer comment for better reference
                        controlLayer.comment = "Selected Layer: " + selectedLayer.name;
                    }
                } catch (e) {
                    // If we can't access the layer, just continue without updating the comment
                }
            }
        }
        
        // Get shape types from settings
        var newShapeTypes = [];
        
        // Check for new multi-select format
        if (settings["Shape Types"] && settings["Shape Types"].length > 0) {
            newShapeTypes = settings["Shape Types"];
        }
        // Check for legacy format
        else if (settings["Shape Type"]) {
            newShapeTypes = [settings["Shape Type"]];
        }
        
        // Check if shape types have changed or selected layer has changed
        var shapeTypesChanged = false;
        var selectedLayerChanged = false;
        var currentShapeTypes = [];
        var oldSelectedLayerIndex = "";
        
        try {
            // Determine current shape types from control layer name or by checking particles
            currentShapeTypes = getCurrentShapeTypes(controlLayer, particleLayer);
            
            // Check if shape types have changed
            if (newShapeTypes.length !== currentShapeTypes.length) {
                shapeTypesChanged = true;
            } else {
                // Compare each shape type
                for (var t = 0; t < newShapeTypes.length; t++) {
                    if (currentShapeTypes.indexOf(newShapeTypes[t]) === -1) {
                        shapeTypesChanged = true;
                        break;
                    }
                }
            }
                    
            // If selected-layer is in both old and new shape types, check if the index has changed
            if (newShapeTypes.indexOf("selected-layer") !== -1 && 
                currentShapeTypes.indexOf("selected-layer") !== -1) {
                // Try to get the current selected layer index from control effect
                try {
                    var selectedLayerEffect = controlLayer.effect("Selected Layer");
                    if (selectedLayerEffect) {
                        oldSelectedLayerIndex = selectedLayerEffect.property("Slider").value.toString();
                        
                        // Compare with new selected layer index
                        if (settings["Selected Layer"] && oldSelectedLayerIndex !== settings["Selected Layer"]) {
                            selectedLayerChanged = true;
                        }
                    }
                } catch (e) {
                    // If we can't determine the current selected layer, assume it changed
                    selectedLayerChanged = true;
                }
            }
        } catch (e) {
            // If we can't determine current shape types, assume they changed
            shapeTypesChanged = true;
        }
        
        // Apply settings to control layer
        applyParticleSystemSettings(controlLayer, settings);
        
        // If shape type or selected layer changes, we need to recreate particles
        if (shapeTypesChanged || selectedLayerChanged) {
            // Get total particles from settings since effect control is removed
            var totalParticles = 50; // Default
            
            if (settings["Total Particles"] !== undefined) {
                totalParticles = settings["Total Particles"];
            }
            
            // Remove existing particles
            while (particleLayer.property("Contents").numProperties > 0) {
                particleLayer.property("Contents").property(1).remove();
            }
            
            // Create new particles with the new shape type or selected layer
            createParticles(particleLayer, instanceNum, totalParticles, 1, settings);
        }
        // Check if only the total particles count has changed
        else if (settings["Total Particles"] !== undefined) {
            // Count current particles
            var contents = particleLayer.property("Contents");
            var currentTotal = 0;
            
            for (var i = 1; i <= contents.numProperties; i++) {
                var prop = contents.property(i);
                if (prop.name.indexOf("Particle ") === 0) {
                    currentTotal++;
                }
            }
            
            // If the total particles count has changed, update it
            if (currentTotal !== settings["Total Particles"]) {
                updateTotalParticles(particleLayer, settings["Total Particles"], instanceNum);
            }
        }
        // Just updating parameters, no need to recreate particles
        else {
            // Apply parameters that change appearance in real time
            var activeParticlesEffect = controlLayer.effect("Active Particles");
            if (activeParticlesEffect && settings["Active Particles"] !== undefined) {
                activeParticlesEffect.property("Slider").setValue(settings["Active Particles"]);
            }
            
            // Apply shape-specific settings to existing particles
            updateShapeProperties(particleLayer, settings);
        }
        
        app.endUndoGroup();
        return "success";
    } catch (e) {
        if (app.project) app.endUndoGroup();
        return "Error updating particle system: " + e.toString();
    }
}

// Helper function to get current shape types from layers
function getCurrentShapeTypes(controlLayer, particleLayer) {
    var currentShapeTypes = [];
    
    // Since shape types are no longer in layer name, inspect the particles directly
    var contents = particleLayer.property("Contents");
    var typesFound = {};
    
    if (contents && contents.numProperties > 0) {
        // Check first 5 particles or all if fewer
        var numToCheck = Math.min(5, contents.numProperties);
        
        for (var p = 1; p <= numToCheck; p++) {
            var particle = contents.property(p);
            if (particle) {
                var particleContents = particle.property("Contents");
                
                // Check shape type in this particle
                for (var k = 1; k <= particleContents.numProperties; k++) {
                    var prop = particleContents.property(k);
                    if (prop.matchName === "ADBE Vector Shape - Ellipse") {
                        typesFound.ellipse = true;
                        break;
                    } else if (prop.matchName === "ADBE Vector Shape - Rect") {
                        typesFound.rectangle = true;
                        break;
                    } else if (prop.matchName === "ADBE Vector Shape - Star") {
                        // Fix the bug: Check the type property to distinguish between star and polygon
                        // Type 1 is star, Type 2 is polygon
                        var shapeType = prop.property("ADBE Vector Star Type").value;
                        if (shapeType === 1) {
                            typesFound.star = true;
                        } else if (shapeType === 2) {
                            typesFound.polygon = true;
                        }
                        break;
                    } else if (prop.matchName === "ADBE Vector Shape - Group") {
                        typesFound["selected-layer"] = true;
                        break;
                    }
                }
            }
        }
        
        // Convert found types to array
        for (var type in typesFound) {
            currentShapeTypes.push(type);
        }
    }
    
    // If we still couldn't determine, default to ellipse
    if (currentShapeTypes.length === 0) {
        currentShapeTypes.push("ellipse");
    }
    
    return currentShapeTypes;
}

// Helper function to update shape properties on existing particles
function updateShapeProperties(particleLayer, settings) {
    try {
            var contents = particleLayer.property("Contents");
        if (!contents || contents.numProperties === 0) return;
            
        // Process each particle
            for (var i = 1; i <= contents.numProperties; i++) {
                var particle = contents.property(i);
            if (!particle) continue;
            
                var particleContents = particle.property("Contents");
                
            // Find and update shape properties
                for (var j = 1; j <= particleContents.numProperties; j++) {
                    var shape = particleContents.property(j);
                    
                    // Update rectangle properties
                if (shape.matchName === "ADBE Vector Shape - Rect" && settings["Rectangle Roundness"] !== undefined) {
                            shape.property("ADBE Vector Rect Roundness").setValue(settings["Rectangle Roundness"]);
                    }
                    // Update star properties
                else if (shape.matchName === "ADBE Vector Shape - Star" && 
                         shape.property("ADBE Vector Star Type").value === 1) { // Star
                        if (settings["Star Points"] !== undefined) {
                            shape.property("ADBE Vector Star Points").setValue(settings["Star Points"]);
                        }
                        if (settings["Star Inner Radius"] !== undefined) {
                            // Convert percentage to actual radius
                            var outerRadius = shape.property("ADBE Vector Star Outer Radius").value;
                            var innerRadius = outerRadius * (settings["Star Inner Radius"] / 100);
                            shape.property("ADBE Vector Star Inner Radius").setValue(innerRadius);
                        }
                        if (settings["Star Inner Roundness"] !== undefined) {
                            shape.property("ADBE Vector Star Inner Roundess").setValue(settings["Star Inner Roundness"]);
                        }
                        if (settings["Star Outer Roundness"] !== undefined) {
                            shape.property("ADBE Vector Star Outer Roundess").setValue(settings["Star Outer Roundness"]);
                        }
                    }
                    // Update polygon properties
                else if (shape.matchName === "ADBE Vector Shape - Star" && 
                         shape.property("ADBE Vector Star Type").value === 2) { // Polygon
                        if (settings["Polygon Sides"] !== undefined) {
                            shape.property("ADBE Vector Star Points").setValue(settings["Polygon Sides"]);
                        }
                        if (settings["Polygon Roundness"] !== undefined) {
                            shape.property("ADBE Vector Star Outer Roundess").setValue(settings["Polygon Roundness"]);
                        }
                    }
                }
            }
    } catch (e) {
        alert("Error updating shape properties: " + e.toString());
    }
}

// Function to update the total number of particle groups
function updateTotalParticles(layer, newTotal, instanceNum) {
    try {
        // Get the current number of particles
        var contents = layer.property("Contents");
        var currentTotal = 0;
        
        // Count particle groups (they are named "Particle X")
        for (var i = 1; i <= contents.numProperties; i++) {
            var prop = contents.property(i);
            if (prop.name.indexOf("Particle ") === 0) {
                currentTotal++;
            }
        }
        
        // If more particles needed, use createParticles to add them
        if (newTotal > currentTotal) {
            // Add only the new particles needed, starting from the current count + 1
            createParticles(layer, instanceNum, newTotal - currentTotal, currentTotal + 1);
        }
        // If fewer particles needed, remove extras
        else if (newTotal < currentTotal) {
            // Remove particles from highest index to lowest to avoid reindexing issues
            for (var i = currentTotal; i > newTotal; i--) {
                var particleName = "Particle " + i;
                for (var j = 1; j <= contents.numProperties; j++) {
                    if (contents.property(j).name === particleName) {
                        contents.property(j).remove();
                        break;
                    }
                }
            }
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

// Function to get the currently selected particle system
function getSelectedParticleSystem() {
    // Check if a project is open
    if (!app.project) {
        return "{}";
    }

    var activeComp = app.project.activeItem;
    if (!activeComp || !(activeComp instanceof CompItem)) {
        return "{}";
    }
    
    try {
        // Check if any layers are selected
        if (activeComp.selectedLayers.length > 0) {
            var selectedLayer = activeComp.selectedLayers[0]; // Get first selected layer
            
            // Check if it's a particle system control layer
            if (selectedLayer.name.indexOf("SP-ctrl") === 0) {
                return JSON.stringify({
                    name: selectedLayer.name,
                    index: selectedLayer.index
                });
            }
            
            // If a particle layer is selected, try to find its associated control layer
            if (selectedLayer.name.indexOf("Shape Particles") === 0) {
                // Extract the instance number from the name (assuming format "Shape Particles X")
                var instanceMatch = selectedLayer.name.match(/Shape Particles (\d+)/);
                if (instanceMatch && instanceMatch[1]) {
                    var instanceNum = instanceMatch[1];
                    var controlLayerName = "SP-ctrl " + instanceNum;
                    
                    // Look for the matching control layer
                    for (var i = 1; i <= activeComp.numLayers; i++) {
                        if (activeComp.layer(i).name === controlLayerName) {
                            return JSON.stringify({
                                name: controlLayerName,
                                index: i
                            });
                        }
                    }
                }
            }
        }
    } catch (e) {
        return "{\"error\": \"" + e.toString() + "\"}";
    }
    
    // No particle system selected
    return "{}";
}

// Function to get available layers from the active composition
function getAvailableLayers() {
    try {
        var activeComp = app.project.activeItem;
        if (!activeComp || !(activeComp instanceof CompItem)) {
            return JSON.stringify([]);
        }
        
        var layers = [];
        
        // Loop through all layers in the composition
        for (var i = 1; i <= activeComp.numLayers; i++) {
            var layer = activeComp.layer(i);
            
            // Skip particle system control layers
            if (layer.name.indexOf("SP-ctrl") === 0) {
                continue;
            }
            
            // Only include shape layers
            if (layer instanceof ShapeLayer) {
                // Get dimensions and specific properties
                var hasShapePaths = hasShapePath(layer);
                var bounds = getShapeLayerBounds(layer);
                
                // Add layer information to the array
                layers.push({
                    index: i,
                    name: layer.name,
                    type: "shape",
                    width: bounds.width,
                    height: bounds.height,
                    hasShapePaths: hasShapePaths
                });
            }
        }
        
        return JSON.stringify(layers);
    } catch (e) {
        return JSON.stringify([]);
    }
}

// Helper function to check if a shape layer has shape paths
function hasShapePath(shapeLayer) {
    try {
        var contents = shapeLayer.property("Contents");
        
        // Helper function to search for paths recursively
        function findPath(contents) {
            for (var i = 1; i <= contents.numProperties; i++) {
                var prop = contents.property(i);
                
                // If it's a shape group, check its contents
                if (prop.matchName === "ADBE Vector Group") {
                    var groupContents = prop.property("Contents");
                    // Check for paths directly in this group
                    for (var j = 1; j <= groupContents.numProperties; j++) {
                        var subProp = groupContents.property(j);
                        if (subProp.matchName === "ADBE Vector Shape - Group") {
                            return true;
                        }
                    }
                    
                    // If no path found directly, search deeper in the group
                    if (findPath(groupContents)) {
                        return true;
                    }
                }
                // If it's a path directly, return true
                else if (prop.matchName === "ADBE Vector Shape - Group") {
                    return true;
                }
            }
            return false;
        }
        
        return findPath(contents);
    } catch (e) {
        return false;
    }
}

// Helper function to get approximate bounds of a shape layer
function getShapeLayerBounds(shapeLayer) {
    try {
        // Default size if we can't determine bounds
        var result = {width: 100, height: 100};
        
        // Try to get bounds from transform properties
        var transform = shapeLayer.transform;
        if (transform.property("ADBE Vector Scale")) {
            var scale = transform.property("ADBE Vector Scale").value;
            // Use scale as a rough estimate of size
            result.width = scale[0];
            result.height = scale[1];
        }
        
        return result;
    } catch (e) {
        return {width: 100, height: 100};
    }
}

// Helper function to get layer type as a string - simplified to only care about shape layers
function getLayerTypeString(layer) {
    if (layer instanceof ShapeLayer) return "shape";
    return "other";
}

// Function to copy properties from a solid layer to a particle
function copyPropertiesFromSolidLayer(solidLayer, particleGroup) {
    try {
        var shapeContent = particleGroup.property("Contents");
        
        // Add rectangle shape for solid
        var rect = shapeContent.addProperty("ADBE Vector Shape - Rect");
        rect.name = "Solid Rectangle";
        
        // Get solid dimensions
        var width = solidLayer.width;
        var height = solidLayer.height;
        
        // Set rectangle size based on solid dimensions, but with aspect ratio preserved
        var maxSize = 100; // Maximum size for the particle
        var aspectRatio = width / height;
        
        var rectWidth, rectHeight;
        if (width > height) {
            rectWidth = maxSize;
            rectHeight = maxSize / aspectRatio;
        } else {
            rectHeight = maxSize;
            rectWidth = maxSize * aspectRatio;
        }
        
        rect.property("ADBE Vector Rect Size").setValue([rectWidth, rectHeight]);
        
        // Get solid color
        var solidSource = solidLayer.source.mainSource;
        var solidColor = solidSource.color;
        
        // Add fill with the solid's color
        var fill = shapeContent.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Solid Fill";
        fill.property("ADBE Vector Fill Color").setValue(solidColor);
        
        return true;
    } catch (e) {
        return false;
    }
}

// Function to create a reference to a comp layer
function createCompLayerReference(compLayer, particleGroup) {
    try {
        var shapeContent = particleGroup.property("Contents");
        
        // Add rectangle to define bounds
        var rect = shapeContent.addProperty("ADBE Vector Shape - Rect");
        rect.name = "Comp Reference";
        
        // Get comp dimensions
        var width = compLayer.width;
        var height = compLayer.height;
        
        // Set rectangle size based on comp dimensions, but with aspect ratio preserved
        var maxSize = 100; // Maximum size for the particle
        var aspectRatio = width / height;
        
        var rectWidth, rectHeight;
        if (width > height) {
            rectWidth = maxSize;
            rectHeight = maxSize / aspectRatio;
        } else {
            rectHeight = maxSize;
            rectWidth = maxSize * aspectRatio;
        }
        
        rect.property("ADBE Vector Rect Size").setValue([rectWidth, rectHeight]);
        
        // Add fill with lower opacity to make it semi-transparent
        var fill = shapeContent.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Comp Reference Fill";
        fill.property("ADBE Vector Fill Color").setValue([0.5, 0.5, 0.5, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(50);
        
        // Add stroke to outline the comp
        var stroke = shapeContent.addProperty("ADBE Vector Graphic - Stroke");
        stroke.name = "Comp Reference Stroke";
        stroke.property("ADBE Vector Stroke Color").setValue([1, 1, 1, 1]);
        stroke.property("ADBE Vector Stroke Width").setValue(2);
        
        // Add expression-based reference to the comp 
        var expression = "// Reference to comp layer\n" +
            "var sourceLayer = thisComp.layer(" + compLayer.index + ");\n" +
            "// This is just a reference to the comp's dimensions\n" +
            "value;";
            
        rect.property("ADBE Vector Rect Size").expression = expression;
        
        return true;
    } catch (e) {
        return false;
    }
}

// Function to create an image reference
function createImageReference(imageLayer, particleGroup) {
    try {
        var shapeContent = particleGroup.property("Contents");
        
        // Add rectangle to define bounds
        var rect = shapeContent.addProperty("ADBE Vector Shape - Rect");
        rect.name = "Image Reference";
        
        // Get image dimensions
        var width = imageLayer.width;
        var height = imageLayer.height;
        
        // Set rectangle size based on image dimensions, but with aspect ratio preserved
        var maxSize = 100; // Maximum size for the particle
        var aspectRatio = width / height;
        
        var rectWidth, rectHeight;
        if (width > height) {
            rectWidth = maxSize;
            rectHeight = maxSize / aspectRatio;
        } else {
            rectHeight = maxSize;
            rectWidth = maxSize * aspectRatio;
        }
        
        rect.property("ADBE Vector Rect Size").setValue([rectWidth, rectHeight]);
        
        // Add fill with a placeholder color
        var fill = shapeContent.addProperty("ADBE Vector Graphic - Fill");
        fill.name = "Image Reference Fill";
        fill.property("ADBE Vector Fill Color").setValue([0.8, 0.8, 0.8, 1]);
        
        return true;
    } catch (e) {
        return false;
    }
}