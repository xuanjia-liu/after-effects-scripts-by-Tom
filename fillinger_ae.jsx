/* 
  Fillinger for After Effects
  
  Based on the original Illustrator Fillinger script by A Jongware Script
  Modified and enhanced for After Effects by AI Assistant
  
  Fills a mask or shape layer with copies of selected layers
  with random sizing, positioning, and rotation while avoiding overlaps.
*/

(function() {
    
    // Check if we have a project and composition
    if (!app.project || !app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
        alert("Please open a composition first.");
        return;
    }
    
    var comp = app.project.activeItem;
    var scriptName = 'Fillinger AE';
    
    // Utility functions
    function getSelectedLayers() {
        var layers = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).selected) {
                layers.push(comp.layer(i));
            }
        }
        return layers;
    }
    
    function getMaskPath(layer, maskIndex) {
        try {
            var mask = layer.Masks.mask(maskIndex || 1);
            if (mask && mask.maskPath.value) {
                return mask.maskPath.value;
            }
        } catch (e) {}
        return null;
    }
    
    function getShapePath(layer) {
        try {
            // Recursively search for the 'ADBE Vector Shape' property
            function findPath(group) {
                for (var i = 1; i <= group.numProperties; i++) {
                    var prop = group.property(i);
                    if (prop.matchName === "ADBE Vector Shape") {
                        return prop.value;
                    }
                    if (prop.numProperties > 0) {
                        var found = findPath(prop);
                        if (found) return found;
                    }
                }
                return null;
            }
            var contents = layer.property("ADBE Root Vectors Group");
            if (contents) {
                return findPath(contents);
            }
        } catch (e) {}
        return null;
    }
    
    function pointInPath(point, path) {
        var vertices = path.vertices;
        var x = point[0], y = point[1];
        var inside = false;
        
        for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            var xi = vertices[i][0], yi = vertices[i][1];
            var xj = vertices[j][0], yj = vertices[j][1];
            
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }
    
    function getPathBounds(path) {
        var vertices = path.vertices;
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (var i = 0; i < vertices.length; i++) {
            var v = vertices[i];
            if (v[0] < minX) minX = v[0];
            if (v[0] > maxX) maxX = v[0];
            if (v[1] < minY) minY = v[1];
            if (v[1] > maxY) maxY = v[1];
        }
        
        return [minX, minY, maxX, maxY];
    }
    
    function distance(p1, p2) {
        var dx = p1[0] - p2[0];
        var dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Create UI
    function createUI() {
        var win = new Window('dialog', scriptName);
        win.orientation = 'column';
        win.alignChildren = ['fill', 'fill'];
        win.spacing = 10;
        win.margins = 15;
        
        // Source selection
        var sourceGroup = win.add('panel', undefined, 'Source Settings');
        sourceGroup.orientation = 'column';
        sourceGroup.alignChildren = ['fill', 'top'];
        sourceGroup.spacing = 8;
        
        var sourceSelGroup = sourceGroup.add('group');
        sourceSelGroup.add('statictext', undefined, 'Fill Target:');
        var targetDropdown = sourceSelGroup.add('dropdownlist');
        targetDropdown.preferredSize.width = 200;
        
        var sourceItemsGroup = sourceGroup.add('group');
        sourceItemsGroup.add('statictext', undefined, 'Fill Objects:');
        var itemsList = sourceItemsGroup.add('listbox', undefined, [], {multiselect: true});
        itemsList.preferredSize.height = 80;
        itemsList.preferredSize.width = 200;
        
        var refreshBtn = sourceItemsGroup.add('button', undefined, 'Refresh');
        refreshBtn.preferredSize.width = 60;
        
        // Fill settings
        var fillGroup = win.add('panel', undefined, 'Fill Settings');
        fillGroup.orientation = 'column';
        fillGroup.alignChildren = ['fill', 'top'];
        
        var sizeGroup = fillGroup.add('group');
        sizeGroup.add('statictext', undefined, 'Size Range (%):');
        sizeGroup.add('statictext', undefined, 'Min:');
        var minSize = sizeGroup.add('edittext', undefined, '20');
        minSize.preferredSize.width = 50;
        sizeGroup.add('statictext', undefined, 'Max:');
        var maxSize = sizeGroup.add('edittext', undefined, '80');
        maxSize.preferredSize.width = 50;
        
        var spacingGroup = fillGroup.add('group');
        spacingGroup.add('statictext', undefined, 'Min Distance:');
        var minDistance = spacingGroup.add('edittext', undefined, '10');
        minDistance.preferredSize.width = 60;
        spacingGroup.add('statictext', undefined, 'pixels');
        
        var attemptsGroup = fillGroup.add('group');
        attemptsGroup.add('statictext', undefined, 'Max Attempts:');
        var maxAttempts = attemptsGroup.add('edittext', undefined, '1000');
        maxAttempts.preferredSize.width = 60;
        
        // Rotation settings
        var rotateGroup = win.add('panel', undefined, 'Rotation Settings');
        rotateGroup.orientation = 'column';
        
        var rotateRadioGroup = rotateGroup.add('group');
        var noRotate = rotateRadioGroup.add('radiobutton', undefined, 'No Rotation');
        var randomRotate = rotateRadioGroup.add('radiobutton', undefined, 'Random');
        var fixedRotate = rotateRadioGroup.add('radiobutton', undefined, 'Fixed Angle:');
        var rotateValue = rotateRadioGroup.add('edittext', undefined, '0');
        rotateValue.preferredSize.width = 50;
        rotateValue.enabled = false;
        
        randomRotate.value = true;
        
        // Animation settings
        var animGroup = win.add('panel', undefined, 'Animation Settings');
        animGroup.orientation = 'column';
        
        var animateCheck = animGroup.add('checkbox', undefined, 'Animate entrance');
        var animDurationGroup = animGroup.add('group');
        animDurationGroup.add('statictext', undefined, 'Duration (sec):');
        var animDuration = animDurationGroup.add('edittext', undefined, '2');
        animDuration.preferredSize.width = 50;
        animDurationGroup.enabled = false;
        
        var animOffsetGroup = animGroup.add('group');
        animOffsetGroup.add('statictext', undefined, 'Stagger (sec):');
        var animOffset = animOffsetGroup.add('edittext', undefined, '0.1');
        animOffset.preferredSize.width = 50;
        animOffsetGroup.enabled = false;
        
        // Options
        var optionsGroup = win.add('panel', undefined, 'Options');
        optionsGroup.orientation = 'column';
        
        var precompCheck = optionsGroup.add('checkbox', undefined, 'Create precomp for results');
        var threeDCheck = optionsGroup.add('checkbox', undefined, 'Use 3D positioning (random Z)');
        var randomOrderCheck = optionsGroup.add('checkbox', undefined, 'Random layer order');
        
        // Progress bar
        var progressBar = win.add('progressbar');
        progressBar.preferredSize.width = 300;
        progressBar.preferredSize.height = 8;
        
        // Buttons
        var buttonGroup = win.add('group');
        buttonGroup.alignment = 'center';
        var cancelBtn = buttonGroup.add('button', undefined, 'Cancel');
        var okBtn = buttonGroup.add('button', undefined, 'Fill It!');
        okBtn.preferredSize.width = 80;
        
        // Event handlers
        function populateLayers() {
            targetDropdown.removeAll();
            itemsList.removeAll();
            
            var maskLayers = [];
            var allLayers = [];
            
            for (var i = 1; i <= comp.numLayers; i++) {
                var layer = comp.layer(i);
                allLayers.push(layer);
                
                // Check for masks or shape layers
                if ((layer.Masks && layer.Masks.numProperties > 0) || 
                    (layer instanceof ShapeLayer)) {
                    maskLayers.push(layer);
                }
            }
            
            // Populate target dropdown (layers with masks or shapes)
            for (var i = 0; i < maskLayers.length; i++) {
                var item = targetDropdown.add('item', maskLayers[i].name);
                item.layer = maskLayers[i];
            }
            
            // Populate items list (all layers)
            for (var i = 0; i < allLayers.length; i++) {
                var item = itemsList.add('item', allLayers[i].name);
                item.layer = allLayers[i];
                
                // Pre-select currently selected layers
                if (allLayers[i].selected) {
                    item.selected = true;
                }
            }
            
            if (targetDropdown.items.length > 0) {
                targetDropdown.selection = 0;
            }
        }
        
        refreshBtn.onClick = populateLayers;
        
        noRotate.onClick = function() { rotateValue.enabled = false; };
        randomRotate.onClick = function() { rotateValue.enabled = false; };
        fixedRotate.onClick = function() { rotateValue.enabled = true; };
        
        animateCheck.onClick = function() {
            animDurationGroup.enabled = this.value;
            animOffsetGroup.enabled = this.value;
        };
        
        cancelBtn.onClick = function() {
            win.close();
        };
        
        okBtn.onClick = function() {
            executeScript();
        };
        
        function executeScript() {
            // Validate inputs
            if (!targetDropdown.selection) {
                alert('Please select a target layer with mask or shape.');
                return;
            }
            
            var selectedItems = [];
            for (var i = 0; i < itemsList.items.length; i++) {
                if (itemsList.items[i].selected) {
                    selectedItems.push(itemsList.items[i].layer);
                }
            }
            
            if (selectedItems.length === 0) {
                alert('Please select at least one layer to fill with.');
                return;
            }
            
            var targetLayer = targetDropdown.selection.layer;
            
            // Get settings
            var settings = {
                minSize: Math.max(1, parseFloat(minSize.text) || 20),
                maxSize: Math.max(1, parseFloat(maxSize.text) || 80),
                minDistance: Math.max(0, parseFloat(minDistance.text) || 10),
                maxAttempts: Math.max(10, parseInt(maxAttempts.text) || 1000),
                rotationType: noRotate.value ? 'none' : (randomRotate.value ? 'random' : 'fixed'),
                rotateValue: parseFloat(rotateValue.text) || 0,
                animate: animateCheck.value,
                animDuration: Math.max(0.1, parseFloat(animDuration.text) || 2),
                animOffset: Math.max(0, parseFloat(animOffset.text) || 0.1),
                precomp: precompCheck.value,
                use3D: threeDCheck.value,
                randomOrder: randomOrderCheck.value
            };
            
            win.enabled = false;
            progressBar.value = 0;
            
            try {
                fillLayers(targetLayer, selectedItems, settings, progressBar);
                win.close();
            } catch (e) {
                alert('Error: ' + e.toString());
                win.enabled = true;
            }
        }
        
        // Initialize
        populateLayers();
        
        return win;
    }
    
    // Main fill function
    function fillLayers(targetLayer, sourceLayers, settings, progressBar) {
        app.beginUndoGroup(scriptName);
        
        try {
            // Get the path from target layer
            var targetPath = getMaskPath(targetLayer) || getShapePath(targetLayer);
            if (!targetPath) {
                throw new Error('Target layer must have a mask or be a shape layer.');
            }
            
            var bounds = getPathBounds(targetPath);
            var width = bounds[2] - bounds[0];
            var height = bounds[3] - bounds[1];
            
            var placedItems = [];
            var attempts = 0;
            var maxItems = Math.floor(settings.maxAttempts / 10); // Reasonable limit
            
            progressBar.maxvalue = maxItems;
            
            while (placedItems.length < maxItems && attempts < settings.maxAttempts) {
                attempts++;
                
                // Generate random position
                var x = bounds[0] + Math.random() * width;
                var y = bounds[1] + Math.random() * height;
                var point = [x, y];
                
                // Check if point is inside path
                if (!pointInPath(point, targetPath)) {
                    continue;
                }
                
                // Generate random size
                var sizePercent = settings.minSize + Math.random() * (settings.maxSize - settings.minSize);
                var size = (sizePercent / 100) * Math.min(width, height) * 0.1; // Scale appropriately
                
                // Check distance from other items
                var tooClose = false;
                for (var i = 0; i < placedItems.length; i++) {
                    var dist = distance(point, placedItems[i].position);
                    if (dist < (size + placedItems[i].size + settings.minDistance)) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (tooClose) {
                    continue;
                }
                
                // Choose source layer
                var sourceLayer = sourceLayers[Math.floor(Math.random() * sourceLayers.length)];
                
                // Duplicate the layer
                var newLayer = sourceLayer.duplicate();
                
                // Position and scale
                newLayer.position.setValue([x, y]);
                newLayer.scale.setValue([sizePercent, sizePercent]);
                
                // 3D positioning
                if (settings.use3D && newLayer.threeDLayer) {
                    var z = (Math.random() - 0.5) * 200; // Random Z between -100 and 100
                    newLayer.position.setValue([x, y, z]);
                }
                
                // Rotation
                if (settings.rotationType === 'random') {
                    newLayer.rotation.setValue(Math.random() * 360);
                } else if (settings.rotationType === 'fixed') {
                    newLayer.rotation.setValue(settings.rotateValue);
                }
                
                // Animation
                if (settings.animate) {
                    var startTime = placedItems.length * settings.animOffset;
                    var endTime = startTime + settings.animDuration;
                    
                    // Animate opacity
                    newLayer.opacity.setValueAtTime(startTime, 0);
                    newLayer.opacity.setValueAtTime(endTime, 100);
                    
                    // Animate scale (scale up from 0)
                    newLayer.scale.setValueAtTime(startTime, [0, 0]);
                    newLayer.scale.setValueAtTime(endTime, [sizePercent, sizePercent]);
                }
                
                placedItems.push({
                    layer: newLayer,
                    position: point,
                    size: size
                });
                
                progressBar.value = placedItems.length;
                
                // Update UI occasionally
                if (placedItems.length % 10 === 0) {
                    app.project.activeItem.time = app.project.activeItem.time; // Force refresh
                }
            }
            
            // Random layer order
            if (settings.randomOrder) {
                for (var i = 0; i < placedItems.length; i++) {
                    var randomIndex = Math.floor(Math.random() * comp.numLayers) + 1;
                    placedItems[i].layer.moveToIndex(randomIndex);
                }
            }
            
            // Create precomp if requested
            if (settings.precomp && placedItems.length > 0) {
                var layersToPrecomp = [];
                for (var i = 0; i < placedItems.length; i++) {
                    layersToPrecomp.push(placedItems[i].layer);
                }
                
                // Select the layers
                for (var i = 1; i <= comp.numLayers; i++) {
                    comp.layer(i).selected = false;
                }
                for (var i = 0; i < layersToPrecomp.length; i++) {
                    layersToPrecomp[i].selected = true;
                }
                
                // Create precomp
                app.executeCommand(app.findMenuCommandId("Pre-compose..."));
            }
            
            alert('Successfully placed ' + placedItems.length + ' items after ' + attempts + ' attempts.');
            
        } finally {
            app.endUndoGroup();
        }
    }
    
    // Show UI
    var win = createUI();
    win.center();
    win.show();
    
})();