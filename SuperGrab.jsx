// Select Same Properties - After Effects Script
// This script allows users to:
// - Click to select same properties on selected layer(s)
// - Press 'S' twice to reveal them
// - Hold Alt/Opt to only select same properties with same value
// - Hold Shift to select all same properties in composition
// - Hold Cmd/Ctrl to select same properties on layers with the same parent

(function() {
  var activeComp; // Define activeComp in the global scope of the function
  // Main function
  function selectSameProperties() {
      activeComp = app.project.activeItem;
      
      // Check if an active composition exists
      if (!(activeComp && activeComp instanceof CompItem)) {
          alert("Please select a composition.");
          return;
      }
      
      // Check if there are selected properties
      if (activeComp.selectedProperties.length === 0) {
          alert("Please select at least one property.");
          return;
      }
      
      // Get keyboard modifiers
      var keyState = ScriptUI.environment.keyboardState;
      var isAltHeld = keyState.altKey;   // Same property + same value
      var isShiftHeld = keyState.shiftKey; // All same properties in comp
      var isCtrlHeld = keyState.ctrlKey || keyState.metaKey; // Same parent
      
      // Store selected properties to compare against
      var selectedProps = [];
      var selectedValues = [];
      var selectedParents = [];
      
      // Collect information about selected properties
      for (var i = 0; i < activeComp.selectedProperties.length; i++) {
          var prop = activeComp.selectedProperties[i];
          selectedProps.push(getPropertyInfo(prop));
          
          // Store property value if Alt is held
          if (isAltHeld) {
              selectedValues.push(getPropertyValue(prop));
          }
          
          // Store parent layer if Ctrl/Cmd is held
          if (isCtrlHeld) {
              var parentLayer = getParentLayer(prop);
              if (parentLayer) {
                  selectedParents.push(parentLayer);
              }
          }
      }
      
      // Deselect all properties
      for (var i = 0; i < activeComp.selectedProperties.length; i++) {
          try {
              activeComp.selectedProperties[i].selected = false;
          } catch (e) {
              // Skip if we can't deselect a property
              continue;
          }
      }
      
      // Define the layers to search through
      var layersToSearch = [];
      
      if (isShiftHeld) {
          // If Shift is held, search through all layers in the comp
          for (var i = 1; i <= activeComp.numLayers; i++) {
              layersToSearch.push(activeComp.layer(i));
          }
      } else if (isCtrlHeld) {
          // If Ctrl/Cmd is held, search through layers with the same parent
          for (var i = 1; i <= activeComp.numLayers; i++) {
              var layer = activeComp.layer(i);
              var parentIndex = layer.parent ? layer.parent.index : null;
              
              // Check if this layer has a parent that matches one of our selected layers' parents
              if (selectedParents.indexOf(parentIndex) !== -1) {
                  layersToSearch.push(layer);
              }
          }
          
          // Also include the originally selected layers
          for (var i = 0; i < activeComp.selectedLayers.length; i++) {
              if (layersToSearch.indexOf(activeComp.selectedLayers[i]) === -1) {
                  layersToSearch.push(activeComp.selectedLayers[i]);
              }
          }
      } else {
          // Default: only search through selected layers
          for (var i = 0; i < activeComp.selectedLayers.length; i++) {
              layersToSearch.push(activeComp.selectedLayers[i]);
          }
      }
      
      // Find and select matching properties
      var selectedCount = 0;
      
      for (var i = 0; i < layersToSearch.length; i++) {
          var layer = layersToSearch[i];
          selectedCount += selectMatchingProperties(layer, selectedProps, selectedValues, isAltHeld);
      }
      
      // Press 'S' twice to reveal selected properties
      if (selectedCount > 0) {
          // Simulate 'S' key press twice
          app.executeCommand(app.findMenuCommandId("Reveal Selected Properties"));
          app.executeCommand(app.findMenuCommandId("Reveal Selected Properties"));
      }
      
      if (selectedCount > 0) {
          alert("Selected " + selectedCount + " properties.");
      } else {
          alert("No matching properties found or properties are hidden.");
      }
  }
  
  // Helper function to get property information
  function getPropertyInfo(prop) {
      return {
          matchName: prop.matchName,
          propertyIndex: getPropertyIndex(prop),
          propertyDepth: getPropertyDepth(prop)
      };
  }
  
  // Helper function to get property value
  function getPropertyValue(prop) {
      try {
          if (prop.propertyValueType === PropertyValueType.NO_VALUE) {
              return null;
          } else if (prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL ||
                    prop.propertyValueType === PropertyValueType.ThreeD ||
                    prop.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
                    prop.propertyValueType === PropertyValueType.TwoD) {
              return prop.value.toString();
          } else {
              return prop.value;
          }
      } catch (e) {
          return null;
      }
  }
  
  // Helper function to get property index path
  function getPropertyIndex(prop) {
      var indices = [];
      var currentProp = prop;
      
      while (currentProp && currentProp.parentProperty) {
          indices.unshift(currentProp.propertyIndex);
          currentProp = currentProp.parentProperty;
      }
      
      return indices;
  }
  
  // Helper function to get property depth
  function getPropertyDepth(prop) {
      var depth = 0;
      var currentProp = prop;
      
      while (currentProp && currentProp.parentProperty) {
          depth++;
          currentProp = currentProp.parentProperty;
      }
      
      return depth;
  }
  
  // Helper function to get parent layer
  function getParentLayer(prop) {
      // Navigate up to find the layer this property belongs to
      var currentProp = prop;
      while (currentProp && currentProp.parentProperty) {
          currentProp = currentProp.parentProperty;
      }
      
      // Now find the layer in the composition
      for (var i = 1; i <= activeComp.numLayers; i++) {
          if (activeComp.layer(i) === currentProp) {
              var layer = activeComp.layer(i);
              
              // Return the parent of this layer, or null if no parent
              return layer.parent ? layer.parent.index : null;
          }
      }
      
      return null;
  }
  
  // Function to select matching properties
  function selectMatchingProperties(layer, selectedProps, selectedValues, checkValue) {
      var count = 0;
      
      function traverseProperties(prop) {
          if (!prop) return 0;
          
          var localCount = 0;
          
          for (var i = 0; i < selectedProps.length; i++) {
              var selectedProp = selectedProps[i];
              
              if (prop.matchName === selectedProp.matchName) {
                  var shouldSelect = true;
                  
                  // If Alt is held, check if values match
                  if (checkValue) {
                      var propValue = getPropertyValue(prop);
                      shouldSelect = (propValue !== null && propValue.toString() === selectedValues[i].toString());
                  }
                  
                  if (shouldSelect) {
                      try {
                          // Check if property is selectable
                          prop.selected = true;
                          localCount++;
                      } catch (e) {
                          // Skip hidden properties that can't be selected
                          // This handles the "property or parent property is hidden" error
                          continue;
                      }
                  }
              }
          }
          
          // Traverse property groups
          if (prop.propertyType === PropertyType.INDEXED_GROUP || 
              prop.propertyType === PropertyType.NAMED_GROUP) {
              for (var j = 1; j <= prop.numProperties; j++) {
                  localCount += traverseProperties(prop.property(j));
              }
          }
          
          return localCount;
      }
      
      // Start traversing from the layer
      count += traverseProperties(layer);
      
      return count;
  }
  
  // Run the main function
  selectSameProperties();
})();