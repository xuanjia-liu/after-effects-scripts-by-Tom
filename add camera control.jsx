(function() {
    // Utility function to get unique names for camera system components
    function getUniqueCameraNames(layers, baseName, controllerType, controllerText) {
        var cameraName = baseName;
        var controllerName = baseName;
        var targetName = "camTarget1";

        // Create naming based on prefix/suffix choice
        if (controllerType === "prefix") {
            controllerName = controllerText + "_" + baseName;
            targetName = controllerText + "_camTarget1";
        } else if (controllerType === "suffix") {
            controllerName = baseName + "_" + controllerText;
            targetName = "camTarget1_" + controllerText;
        }

        var num = 1;
        var baseNameWithoutNumber = baseName.replace(/\d+$/, "");

        // Keep incrementing number until finding unique names
        while (true) {
            var cameraExists = false;
            var controllerExists = false;
            var targetExists = false;

            // Check all layers for name conflicts
            for (var i = 1; i <= layers.length; i++) {
                var layer = layers[i];
                if (!layer) continue;
                
                if (layer.name === cameraName) {
                    cameraExists = true;
                }
                if (layer.name === controllerName) {
                    controllerExists = true;
                }
                if (layer.name === targetName) {
                    targetExists = true;
                }
            }

            if (!cameraExists && !controllerExists && !targetExists) {
                break;
            } else {
                num++;
                cameraName = baseNameWithoutNumber + num;
                
                if (controllerType === "prefix") {
                    controllerName = controllerText + "_" + baseNameWithoutNumber + num;
                    targetName = controllerText + "_camTarget" + num;
                } else if (controllerType === "suffix") {
                    controllerName = baseNameWithoutNumber + num + "_" + controllerText;
                    targetName = "camTarget" + num + "_" + controllerText;
                }
            }
        }
        
        return {
            camera: cameraName,
            controller: controllerName,
            target: targetName
        };
    }

    // Add focus distance expression to connect camera to target null
    // and make camera point at the target
    function addFocusDistanceExpression(comp, cameraLayer, targetName, controllerLayer) {
        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return null;
        }

        var myCam = cameraLayer;
        if (!myCam) {
            if (comp.activeCamera instanceof CameraLayer) {
                myCam = comp.activeCamera;
            } else {
                myCam = comp.layers.addCamera("Target Camera", [comp.width / 2, comp.height / 2]);
            }
        }

        // Create and properly name the null object
        var myNull = comp.layers.addNull();
        myNull.name = targetName; // This is the key change - setting the name explicitly
        myNull.threeDLayer = true;
        
        // IMPORTANT CHANGE: Parent the target to the controller
        if (controllerLayer) {
            myNull.parent = controllerLayer;
            
            // Position the target in front of the camera system
            myNull.transform.position.setValue([0, 0, 1000]); // Position the target in front of the controller
        }
        
        try {
            // Add expression to link camera focus to null object
            if (myCam.cameraOption.focusDistance.canSetExpression) {
                myCam.cameraOption.focusDistance.expression = 
                    "target = thisComp.layer(\"" + targetName + "\");\n" +
                    "v1 = target.toWorld(target.anchorPoint) - toWorld([0,0,0]);\n" +
                    "v2 = toWorldVec([0,0,1]);\n" +
                    "length(v1);";
            }
                
            // Make camera point at target
            myCam.autoOrient = AutoOrientType.NO_AUTO_ORIENT; // Disable auto-orient first
            
            // Point camera at target with expression - FIXED VERSION
            if (myCam.transform.orientation.canSetExpression) {
                myCam.transform.orientation.expression = 
                    "target = thisComp.layer(\"" + targetName + "\");\n" +
                    "// Convert world coordinates to local space relative to parent\n" +
                    "if (hasParent) {\n" +
                    "    // Get target position in world space\n" +
                    "    targetWorld = target.toWorld(target.anchorPoint);\n" +
                    "    // Convert target world position to camera's parent space\n" +
                    "    targetLocal = parent.fromWorld(targetWorld);\n" +
                    "    // Look at target from local coordinates\n" +
                    "    lookAt(position, targetLocal);\n" +
                    "} else {\n" +
                    "    lookAt(toWorld([0,0,0]), target.toWorld(target.anchorPoint));\n" +
                    "}";
            }
        } catch(e) {
            alert("Warning: Could not set all camera expressions. " + e.toString());
        }
            
        return {
            camera: myCam,
            target: myNull
        };
    }

    // Function to apply DOF settings to camera
    function applyDOFSettings(camera, enabled, aperture, blurLevel) {
        if (!(camera instanceof CameraLayer)) return;
        
        try {
            // Check if these properties exist and can be set
            if (camera.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field") && 
                camera.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").canSetValue) {
                camera.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").setValue(enabled);
            }
            
            if (camera.property("ADBE Camera Options Group").property("ADBE Camera Focus Distance") && 
                camera.property("ADBE Camera Options Group").property("ADBE Camera Focus Distance").canSetValue) {
                camera.property("ADBE Camera Options Group").property("ADBE Camera Aperture").setValue(aperture);
            }
            
            if (camera.property("ADBE Camera Options Group").property("ADBE Camera Blur Level") && 
                camera.property("ADBE Camera Options Group").property("ADBE Camera Blur Level").canSetValue) {
                camera.property("ADBE Camera Options Group").property("ADBE Camera Blur Level").setValue(blurLevel);
            }
        } catch(e) {
            alert("Warning: Could not set all DOF properties. " + e.toString());
        }
    }

    // Function to update DOF settings on selected cameras
    function updateSelectedCamerasDOF(enabled, aperture, blurLevel) {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) return;
        
        var layers = comp.selectedLayers;
        var cameraLayers = [];
        
        for (var i = 0; i < layers.length; i++) {
            if (layers[i] instanceof CameraLayer) {
                cameraLayers.push(layers[i]);
            }
        }
        
        app.beginUndoGroup("Update DOF Settings");
        for (var i = 0; i < cameraLayers.length; i++) {
            var camera = cameraLayers[i];
            try {
                var cameraOptions = camera.property("ADBE Camera Options Group");
                
                if (enabled !== null && cameraOptions.property("ADBE Camera Depth of Field").canSetValue) {
                    cameraOptions.property("ADBE Camera Depth of Field").setValue(enabled);
                }
                
                if (aperture !== null && cameraOptions.property("ADBE Camera Aperture").canSetValue) {
                    cameraOptions.property("ADBE Camera Aperture").setValue(aperture);
                }
                
                if (blurLevel !== null && cameraOptions.property("ADBE Camera Blur Level").canSetValue) {
                    cameraOptions.property("ADBE Camera Blur Level").setValue(blurLevel);
                }
            } catch(e) {
                // Silently continue with next camera
            }
        }
        app.endUndoGroup();
    }

    // Function to expose camera settings to controller null
    function exposeCameraSettingsToController(camera, controller) {
        if (!(camera instanceof CameraLayer) || !controller) return;
        
        try {
            // Add Effect Controls to the controller null
            var effectsProperty = controller.property("Effects");
            
            // Add DOF controls
            var dofControl = effectsProperty.addProperty("ADBE Checkbox Control");
            dofControl.name = "DOF Enabled";
            
            try {
                var dofValue = camera.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").value;
                dofControl.property("Checkbox").setValue(dofValue);
                
                if (camera.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").canSetExpression) {
                    camera.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").expression = 
                        "thisComp.layer(\"" + controller.name + "\").effect(\"DOF Enabled\")(\"Checkbox\")";
                }
            } catch(e) {
                // Continue with other properties
            }
            
            var apertureControl = effectsProperty.addProperty("ADBE Slider Control");
            apertureControl.name = "Aperture";
            apertureControl.property("Slider").setValue(200);
            
            try {
                var apertureValue = camera.property("ADBE Camera Options Group").property("ADBE Camera Aperture").value;
                // Use default value of 200 instead of camera's current value
                // apertureControl.property("Slider").setValue(apertureValue);
                
                if (camera.property("ADBE Camera Options Group").property("ADBE Camera Aperture").canSetExpression) {
                    camera.property("ADBE Camera Options Group").property("ADBE Camera Aperture").expression = 
                        "thisComp.layer(\"" + controller.name + "\").effect(\"Aperture\")(\"Slider\")";
                }
            } catch(e) {
                // Continue with other properties
            }
            
            var blurControl = effectsProperty.addProperty("ADBE Slider Control");
            blurControl.name = "Blur Level";
            blurControl.property("Slider").setValue(200);
            
            try {
                var blurValue = camera.property("ADBE Camera Options Group").property("ADBE Camera Blur Level").value;
                // Use default value of 200 instead of camera's current value
                // blurControl.property("Slider").setValue(blurValue);
                
                if (camera.property("ADBE Camera Options Group").property("ADBE Camera Blur Level").canSetExpression) {
                    camera.property("ADBE Camera Options Group").property("ADBE Camera Blur Level").expression = 
                        "thisComp.layer(\"" + controller.name + "\").effect(\"Blur Level\")(\"Slider\")";
                }
            } catch(e) {
                // Continue with other properties
            }
            
            // Add camera position/zoom controls
            var focalLengthControl = effectsProperty.addProperty("ADBE Slider Control");
            focalLengthControl.name = "Focal Length";
            
            try {
                var zoomValue = camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value;
                focalLengthControl.property("Slider").setValue(zoomValue);
                
                if (camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").canSetExpression) {
                    camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").expression = 
                        "thisComp.layer(\"" + controller.name + "\").effect(\"Focal Length\")(\"Slider\")";
                }
            } catch(e) {
                // Continue silently
            }
            
            // Add Camera Distance slider control
            var camDistanceControl = effectsProperty.addProperty("ADBE Slider Control");
            camDistanceControl.name = "Camera Distance";
            
            try {
                // Get current Z position value (as a negative number in camera space)
                var camDistValue = Math.abs(camera.transform.position.value[2]);
                camDistanceControl.property("Slider").setValue(camDistValue);
                
                if (camera.transform.position.canSetExpression) {
                    camera.transform.position.expression = 
                        "// Keep X and Y position values, change only Z based on Camera Distance\n" +
                        "x = transform.position[0];\n" +
                        "y = transform.position[1];\n" +
                        "z = -thisComp.layer(\"" + controller.name + "\").effect(\"Camera Distance\")(\"Slider\");\n" +
                        "[x, y, z];";
                }
            } catch(e) {
                // Continue silently
            }
            
            // Add Dolly Zoom checkbox
            var dollyZoomControl = effectsProperty.addProperty("ADBE Checkbox Control");
            dollyZoomControl.name = "Dolly Zoom Effect";
            dollyZoomControl.property("Checkbox").setValue(false);
            
            // Add expressions to link focal length and camera distance for dolly zoom effect
            try {
                if (camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").canSetExpression) {
                    // Simple expression to link focal length to controller slider
                    camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").expression = 
                        "thisComp.layer(\"" + controller.name + "\").effect(\"Focal Length\")(\"Slider\");";
                }
                
                // Instead of adding expression to the slider, add dolly zoom effect to camera position
                // This approach avoids issues with expression references
                if (camera.transform.position.canSetExpression) {
                    var initialFocal = camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom").value;
                    var initialDist = Math.abs(camera.transform.position.value[2]);
                    
                    camera.transform.position.expression = 
                        "// Dolly zoom effect on camera position\n" +
                        "ctrl = thisComp.layer(\"" + controller.name + "\");\n" +
                        "dollyZoom = ctrl.effect(\"Dolly Zoom Effect\")(\"Checkbox\");\n" +
                        "focalLength = ctrl.effect(\"Focal Length\")(\"Slider\");\n" +
                        "camDist = ctrl.effect(\"Camera Distance\")(\"Slider\");\n" +
                        "\n" +
                        "// Get X and Y position\n" +
                        "x = transform.position[0];\n" +
                        "y = transform.position[1];\n" +
                        "\n" +
                        "// Initial reference values\n" +
                        "initialFocal = " + initialFocal + ";\n" +
                        "initialDist = " + initialDist + ";\n" +
                        "\n" +
                        "// Calculate Z position\n" +
                        "if (dollyZoom == 1) {\n" +
                        "    // Apply the inverse relationship - as focal length increases, distance increases\n" +
                        "    z = -camDist * (focalLength / initialFocal);\n" +
                        "} else {\n" +
                        "    // Use direct distance when dolly zoom is off\n" +
                        "    z = -camDist;\n" +
                        "}\n" +
                        "\n" +
                        "[x, y, z];";
                }
            } catch(e) {
                alert("Warning: Could not set dolly zoom expressions. " + e.toString());
            }
        } catch(e) {
            alert("Warning: Could not expose all camera settings. " + e.toString());
        }
    }

    // Function to add camera rig (camera + controller)
    function addCameraRig(comp, cameraName, controllerName, camDistance) {
        if (!(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return null;
        }
        
        var layers = comp.layers;
        var centerPoint = [comp.width / 2, comp.height / 2];
        
        var cameraLayer = layers.addCamera(cameraName, centerPoint);
        var cameraControllerLayer = layers.addNull();
        
        cameraLayer.parent = cameraControllerLayer;
        
        var position = [0, 0, -camDistance];
        cameraLayer.transform.position.setValue(position);
        
        cameraControllerLayer.name = controllerName;
        cameraControllerLayer.source.name = controllerName;
        cameraControllerLayer.threeDLayer = true;
        
        return {
            camera: cameraLayer,
            controller: cameraControllerLayer
        };
    }

    // Check if alt key is pressed to show UI
    if (ScriptUI.environment.keyboardState.altKey) {
        var comp = app.project.activeItem;
        
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }
        
        var layers = comp.layers;
        
        // Create the UI
        function buildUI() {
            var win = new Window('dialog', "Camera Rig Setup", undefined, {
                resizeable: true
            });
            win.orientation = 'column';
            win.alignChildren = ['fill', 'top'];
            win.margins = 16;
            win.spacing = 10;

            // Camera name section
            var nameGroup = win.add('group');
            nameGroup.orientation = 'row';
            nameGroup.alignChildren = ['left', 'center'];
            nameGroup.spacing = 10;
            
            nameGroup.add('statictext', undefined, 'Camera Name:');
            var camNameInput = nameGroup.add('edittext', undefined, 'Cam1');
            camNameInput.minimumSize.width = 150;
            
            // Camera distance section
            var distanceGroup = win.add('group');
            distanceGroup.orientation = 'row';
            distanceGroup.alignChildren = ['left', 'center'];
            distanceGroup.spacing = 10;
            
            distanceGroup.add('statictext', undefined, 'Camera Distance:');
            var camDistInput = distanceGroup.add('edittext', undefined, '1000');
            camDistInput.minimumSize.width = 80;
            
            var camDistSlider = distanceGroup.add('slider', undefined, 1000, 0, 5000);
            camDistSlider.preferredSize.width = 150;
            
            // Synchronize slider and text field
            camDistInput.onChange = function() {
                var value = parseInt(camDistInput.text);
                if (!isNaN(value)) {
                    camDistSlider.value = value;
                }
            };
            
            camDistSlider.onChanging = function() {
                camDistInput.text = Math.round(camDistSlider.value);
            };
            
            // Controller naming section
            var controllerGroup = win.add('group');
            controllerGroup.orientation = 'row';
            controllerGroup.alignChildren = ['left', 'center'];
            controllerGroup.spacing = 10;
            
            controllerGroup.add('statictext', undefined, 'Controller:');
            
            var radioGroup = controllerGroup.add('group');
            radioGroup.orientation = 'row';
            radioGroup.spacing = 5;
            
            var prefixRadio = radioGroup.add('radiobutton', undefined, 'Prefix');
            var suffixRadio = radioGroup.add('radiobutton', undefined, 'Suffix');
            prefixRadio.value = true;
            
            var controllerText = controllerGroup.add('edittext', undefined, 'ctrl');
            controllerText.minimumSize.width = 80;
            
            // Target checkbox
            var targetGroup = win.add('group');
            targetGroup.orientation = 'row';
            targetGroup.alignChildren = ['left', 'center'];
            
            var addTargetCheckbox = targetGroup.add('checkbox', undefined, 'Add Camera Target');
            addTargetCheckbox.value = true; // Default to true
            
            // Target distance section
            var targetDistGroup = win.add('group');
            targetDistGroup.orientation = 'row';
            targetDistGroup.alignChildren = ['left', 'center'];
            targetDistGroup.spacing = 10;
            
            targetDistGroup.add('statictext', undefined, 'Target Distance:');
            var targetDistInput = targetDistGroup.add('edittext', undefined, '1000');
            targetDistInput.minimumSize.width = 80;
            
            var targetDistSlider = targetDistGroup.add('slider', undefined, 1000, 0, 5000);
            targetDistSlider.preferredSize.width = 150;
            
            // Synchronize target distance slider and text field
            targetDistInput.onChange = function() {
                var value = parseInt(targetDistInput.text);
                if (!isNaN(value)) {
                    targetDistSlider.value = value;
                }
            };
            
            targetDistSlider.onChanging = function() {
                targetDistInput.text = Math.round(targetDistSlider.value);
            };
            
            // DOF settings panel
            var dofPanel = win.add('panel', undefined, 'Depth of Field Settings');
            dofPanel.orientation = 'column';
            dofPanel.alignChildren = ['fill', 'top'];
            dofPanel.margins = 16;
            dofPanel.spacing = 8;
            
            // DOF Enable checkbox
            var dofEnableGroup = dofPanel.add('group');
            dofEnableGroup.orientation = 'row';
            
            var dofEnabledCheckbox = dofEnableGroup.add('checkbox', undefined, 'Enable Depth of Field');
            dofEnabledCheckbox.value = false;
            
            // Aperture controls
            var apertureGroup = dofPanel.add('group');
            apertureGroup.orientation = 'row';
            apertureGroup.alignChildren = ['left', 'center'];
            apertureGroup.spacing = 10;
            
            apertureGroup.add('statictext', undefined, 'Aperture:');
            var apertureInput = apertureGroup.add('edittext', undefined, '200');
            apertureInput.minimumSize.width = 80;
            
            var apertureSlider = apertureGroup.add('slider', undefined, 200, 0, 2000);
            apertureSlider.preferredSize.width = 150;
            
            // Synchronize aperture controls
            apertureInput.onChange = function() {
                var value = parseInt(apertureInput.text);
                if (!isNaN(value)) {
                    apertureSlider.value = value;
                    updateSelectedCamerasDOF(null, value, null);
                }
            };
            
            apertureSlider.onChanging = function() {
                apertureInput.text = Math.round(apertureSlider.value);
            };
            
            apertureSlider.onChange = function() {
                updateSelectedCamerasDOF(null, Math.round(apertureSlider.value), null);
            };
            
            // Blur level controls
            var blurGroup = dofPanel.add('group');
            blurGroup.orientation = 'row';
            blurGroup.alignChildren = ['left', 'center'];
            blurGroup.spacing = 10;
            
            blurGroup.add('statictext', undefined, 'Blur Level:');
            var blurInput = blurGroup.add('edittext', undefined, '200');
            blurInput.minimumSize.width = 80;
            
            var blurSlider = blurGroup.add('slider', undefined, 200, 0, 1000);
            blurSlider.preferredSize.width = 150;
            
            // Synchronize blur controls
            blurInput.onChange = function() {
                var value = parseInt(blurInput.text);
                if (!isNaN(value)) {
                    blurSlider.value = value;
                    updateSelectedCamerasDOF(null, null, value);
                }
            };
            
            blurSlider.onChanging = function() {
                blurInput.text = Math.round(blurSlider.value);
            };
            
            blurSlider.onChange = function() {
                updateSelectedCamerasDOF(null, null, Math.round(blurSlider.value));
            };
            
            // DOF checkbox event
            dofEnabledCheckbox.onClick = function() {
                updateSelectedCamerasDOF(dofEnabledCheckbox.value, null, null);
            };
            
            // Dolly Zoom checkbox
            var dollyZoomGroup = win.add('group');
            dollyZoomGroup.orientation = 'row';
            dollyZoomGroup.alignChildren = ['left', 'center'];
            
            var dollyZoomCheckbox = dollyZoomGroup.add('checkbox', undefined, 'Enable Dolly Zoom Effect');
            dollyZoomCheckbox.value = false;
            
            // Focal length controls
            var focalLengthGroup = win.add('group');
            focalLengthGroup.orientation = 'row';
            focalLengthGroup.alignChildren = ['left', 'center'];
            focalLengthGroup.spacing = 10;
            
            focalLengthGroup.add('statictext', undefined, 'Focal Length:');
            var focalLengthInput = focalLengthGroup.add('edittext', undefined, '1000');
            focalLengthInput.minimumSize.width = 80;
            
            var focalLengthSlider = focalLengthGroup.add('slider', undefined, 1000, 50, 5000);
            focalLengthSlider.preferredSize.width = 150;
            
            // Synchronize focal length controls
            focalLengthInput.onChange = function() {
                var value = parseInt(focalLengthInput.text);
                if (!isNaN(value)) {
                    focalLengthSlider.value = value;
                }
            };
            
            focalLengthSlider.onChanging = function() {
                focalLengthInput.text = Math.round(focalLengthSlider.value);
            };
            
            // Expose settings checkbox
            var exposeGroup = win.add('group');
            exposeGroup.orientation = 'row';
            exposeGroup.alignChildren = ['left', 'center'];
            
            var exposeCheckbox = exposeGroup.add('checkbox', undefined, 'Expose Camera Settings to Controller');
            exposeCheckbox.value = true; // Default to true
            
            // Buttons row
            var buttonGroup = win.add('group');
            buttonGroup.orientation = 'row';
            buttonGroup.alignChildren = ['center', 'center'];
            buttonGroup.margins.top = 10;
            
            var createButton = buttonGroup.add('button', undefined, 'Create Camera Rig', {name: 'ok'});
            var cancelButton = buttonGroup.add('button', undefined, 'Cancel', {name: 'cancel'});
            
            // Create button click handler
            createButton.onClick = function() {
                app.beginUndoGroup("Enhanced Camera Rig Creation");
                
                try {
                    var controllerType = prefixRadio.value ? "prefix" : "suffix";
                    var uniqueNames = getUniqueCameraNames(
                        layers, 
                        camNameInput.text, 
                        controllerType, 
                        controllerText.text
                    );
                    
                    var camDistance = Math.round(parseFloat(camDistInput.text));
                    if (isNaN(camDistance) || camDistance <= 0) {
                        alert("Please enter a valid camera distance.");
                        app.endUndoGroup();
                        return;
                    }
                    
                    var rigData = addCameraRig(
                        comp, 
                        uniqueNames.camera, 
                        uniqueNames.controller, 
                        camDistance
                    );
                    
                    if (!rigData) {
                        app.endUndoGroup();
                        return;
                    }
                    
                    // Apply DOF settings with updated default values
                    applyDOFSettings(
                        rigData.camera, 
                        dofEnabledCheckbox.value,
                        parseInt(apertureInput.text) || 200,
                        parseInt(blurInput.text) || 200
                    );
                    
                    // Expose settings to controller if requested
                    if (exposeCheckbox.value) {
                        exposeCameraSettingsToController(rigData.camera, rigData.controller);
                        
                        // Update Focal Length to match the UI value
                        var effectsProperty = rigData.controller.property("Effects");
                        var focalLengthEffect = effectsProperty.property("Focal Length");
                        if (focalLengthEffect) {
                            var focalLengthValue = parseInt(focalLengthInput.text) || 1000;
                            focalLengthEffect.property("Slider").setValue(focalLengthValue);
                        }
                        
                        // Set dolly zoom checkbox value
                        var dollyZoomEffect = effectsProperty.property("Dolly Zoom Effect");
                        if (dollyZoomEffect) {
                            dollyZoomEffect.property("Checkbox").setValue(dollyZoomCheckbox.value);
                        }
                    }
                    
                    // Add focus target if requested
                    var dofTarget = null;
                    if (addTargetCheckbox.value) {
                        // Pass controller layer to addFocusDistanceExpression 
                        // to parent the target to it
                        var targetDistance = parseInt(targetDistInput.text) || 1000;
                        var dofResult = addFocusDistanceExpression(
                            comp, 
                            rigData.camera, 
                            uniqueNames.target, 
                            rigData.controller
                        );
                        
                        if (dofResult) {
                            dofTarget = dofResult.target;
                            // Set target distance
                            dofTarget.transform.position.setValue([0, 0, targetDistance]);
                        }
                    }
                    
                    // Select new layers
                    if (rigData.camera) rigData.camera.selected = true;
                    if (rigData.controller) rigData.controller.selected = true;
                    if (dofTarget) dofTarget.selected = true;
                    
                    app.endUndoGroup();
                    win.close();
                } catch (err) {
                    alert("Error: " + err.message);
                    app.endUndoGroup();
                }
            };
            
            // Cancel button handler
            cancelButton.onClick = function() {
                win.close();
            };
            
            win.layout.layout(true);
            win.center();
            return win;
        }
        
        var dialog = buildUI();
        dialog.show();
    } else {
        // Simple mode - just create a basic rig with default settings
        app.beginUndoGroup("Add Camera Rig and Target");
        
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            app.endUndoGroup();
            return;
        }
        
        var layers = comp.layers;
        
        try {
            var uniqueNames = getUniqueCameraNames(layers, "Cam1", "prefix", "ctrl");
            
            var centerPoint = [comp.width / 2, comp.height / 2];
            var cameraLayer = layers.addCamera(uniqueNames.camera, centerPoint);
            var cameraControllerLayer = layers.addNull();
            
            cameraLayer.parent = cameraControllerLayer;
            
            // Calculate a good starting distance based on comp size
            var camDistance = comp.width / 0.72;
            var position = [0, 0, -camDistance];
            cameraLayer.transform.position.setValue(position);
            
            cameraControllerLayer.name = uniqueNames.controller;
            cameraControllerLayer.source.name = uniqueNames.controller;
            cameraControllerLayer.threeDLayer = true;
            
            // Apply DOF settings with updated default values
            applyDOFSettings(cameraLayer, true, 200, 200);
            
            // Expose camera settings to controller
            exposeCameraSettingsToController(cameraLayer, cameraControllerLayer);
            
            // Set default focal length to 1000
            var effectsProperty = cameraControllerLayer.property("Effects");
            var focalLengthEffect = effectsProperty.property("Focal Length");
            if (focalLengthEffect) {
                focalLengthEffect.property("Slider").setValue(1000);
            }
            
            // Add DOF target and expression
            var dofResult = addFocusDistanceExpression(comp, cameraLayer, uniqueNames.target, cameraControllerLayer);
            
            // Select the created items
            cameraLayer.selected = true;
            cameraControllerLayer.selected = true;
            if (dofResult && dofResult.target) {
                dofResult.target.selected = true;
            }
            
        } catch (err) {
            alert("Error: " + err.message);
        }
        
        app.endUndoGroup();
    }
})();