#target "aftereffects";

(function() {
  var scriptName = "Dynamic Universal Renamer";
  var scriptVersion = "3.2";
  var scriptAuthor = "Jiaxuan Liu - Enhanced Version";
  
  // No settings system needed
  
  var win = new Window("palette", scriptName + " v" + scriptVersion, undefined, {resizeable: true});
  win.orientation = "row";
  win.alignChildren = ["fill", "fill"];
  win.spacing = 8;
  win.margins = [10, 4, 10, 10];
  win.onResizing = win.onResize = function() {
    this.layout.resize();
  };
  
  // Left column - Preview panel
  var leftColumn = win.add("group");
  leftColumn.orientation = "column";
  leftColumn.alignChildren = ["fill", "top"];
  leftColumn.spacing = 4;
  leftColumn.alignment = ["left", "fill"];
  leftColumn.preferredSize.width = 160;
  leftColumn.minimumSize = [160, -1];
  leftColumn.maximumSize = [160, 10000];
  
  var previewPanel = leftColumn.add("panel", undefined, "Preview");
  previewPanel.orientation = "column";
  previewPanel.alignChildren = ["fill", "top"];
  previewPanel.spacing = 3;
  previewPanel.margins = [8, 10, 8, 8];
  previewPanel.alignment = ["left", "fill"];
  previewPanel.preferredSize.width = 160;
  previewPanel.minimumSize = [160, -1];
  previewPanel.maximumSize = [160, 10000];
  
  // Right column - Main controls
  var rightColumn = win.add("group");
  rightColumn.orientation = "column";
  rightColumn.alignChildren = ["fill", "top"];
  rightColumn.spacing = 3;
  rightColumn.alignment = ["fill", "top"];

  // Quick Rename operations (Row 1)
  var specialPanel = rightColumn.add("panel", undefined, "Quick Layer Rename");
  specialPanel.orientation = "row";
  specialPanel.alignChildren = ["left", "center"];
  specialPanel.margins = [8, 12, 8, 8];
  specialPanel.spacing = 5;
  specialPanel.alignment = ["fill", "top"];
  
  var fromSourceTextBtn = specialPanel.add("button", undefined, "Text");
  fromSourceTextBtn.preferredSize.width = 48;
  fromSourceTextBtn.preferredSize.height = 22;
  
  var fromFontNameBtn = specialPanel.add("button", undefined, "Font");
  fromFontNameBtn.preferredSize.width = 48;
  fromFontNameBtn.preferredSize.height = 22;
  
  var renameWithEffectBtn = specialPanel.add("button", undefined, "Effect");
  renameWithEffectBtn.preferredSize.width = 48;
  renameWithEffectBtn.preferredSize.height = 22;
  
  var renameWithTypeBtn = specialPanel.add("button", undefined, "Type");
  renameWithTypeBtn.preferredSize.width = 48;
  renameWithTypeBtn.preferredSize.height = 22;
  
  var updateMarkerBtn = specialPanel.add("button", undefined, "Marker");
  updateMarkerBtn.preferredSize.width = 48;
  updateMarkerBtn.preferredSize.height = 22;

  
  // Main controls group (Rows 2-6)
  var mainControlsGroup = rightColumn.add("panel", undefined, "Rename");
  mainControlsGroup.orientation = "column";
  mainControlsGroup.alignChildren = ["fill", "top"];
  mainControlsGroup.spacing = 5;
  mainControlsGroup.alignment = ["fill", "top"];
  mainControlsGroup.margins = [8, 8, 8, 8];
  
  // Target and Template row (Row 2)
  var targetGroup = mainControlsGroup.add("group");
  targetGroup.orientation = "row";
  targetGroup.alignChildren = ["left", "center"];
  targetGroup.spacing = 8;
  
  // Target dropdown
  var targetDropdownLabel = targetGroup.add("statictext", undefined, "Target:");
  targetDropdownLabel.preferredSize.width = 36;
  
  // Auto-detect checkbox
  var autoDetectCheck = targetGroup.add("checkbox", undefined, "Auto");
  autoDetectCheck.value = true;
  autoDetectCheck.preferredSize.width = 50;
  
  var targetDropdown = targetGroup.add("dropdownlist", undefined, [
    "All (Recursive)", 
    "Layers", 
    "Project Items", 
    "Effects", 
    "Text Content", 
    "Markers", 
    "Expressions", 
    "Selected Properties",
    "Shape Properties",
    "Masks",
    "Puppet Pins",
    "Source Comp"
  ]);
  targetDropdown.selection = 0;
  targetDropdown.preferredSize.width = 112;
  targetDropdown.preferredSize.height = 24;
  targetDropdown.enabled = !autoDetectCheck.value;
  
  // Template dropdown
  var templateDropdown = targetGroup.add("dropdownlist");
  templateDropdown.preferredSize.width = 96;
  templateDropdown.preferredSize.height = 24;
  
  // Match field row (Row 3)
  var findGroup = mainControlsGroup.add("group");
  findGroup.orientation = "row";
  findGroup.alignChildren = ["fill", "center"];
  findGroup.spacing = 10;
  
  // Match field
  var findText = findGroup.add("edittext", undefined, "");
  findText.alignment = ["fill", "center"];
  findText.preferredSize.width = 120;
  findText.preferredSize.height = 24;
  findText.text = "";
  findText.helpTip = "Enter text to match (optional)";
  
  findText.graphics.font = ScriptUI.newFont(findText.graphics.font.name, findText.graphics.font.style, findText.graphics.font.size);
  findText.justify = "center";
  
  findText.onActivate = function() {
    if (this.text == "Match (optional)") {
      this.text = "";
    }
    // Refresh preview when field is focused to reflect any selection changes
    updatePreview();
  };
  
  findText.onDeactivate = function() {
    if (this.text == "") {
      this.text = "Match (optional)";
    }
  };
  
  findText.text = "Match (optional)";

  // Match options
  // Make Match options (checkboxes) into a group
  var matchOptionsGroup = findGroup.add("group");
  matchOptionsGroup.orientation = "row";
  matchOptionsGroup.alignChildren = ["left", "center"];
  matchOptionsGroup.spacing = 4;
  matchOptionsGroup.preferredSize.width = 120;
  matchOptionsGroup.preferredSize.height = 24;
  matchOptionsGroup.alignment = ["right", "center"];
  
  var matchCaseCheck = matchOptionsGroup.add("checkbox", undefined, "Match Case");
  matchCaseCheck.value = true; // default behavior was case-sensitiv
  var wholeWordCheck = matchOptionsGroup.add("checkbox", undefined, "Whole Word");
  wholeWordCheck.value = false;
  matchCaseCheck.onClick = function() { updatePreview(); };
  wholeWordCheck.onClick = function() { updatePreview(); };
  
  // Template options
  var templateOptions = {
    layers: ["[T] - Layer Type", "[F] - Frames", "[Sec] - Seconds", "[Sh] - Shy", "[P] - Parent"],
    text: ["[Font] - Font Name", "[Size] - Font Size", "[Color] - Font Color"],
    effects: ["[ET] - Effect Type", "[En] - Enabled State"],
    markers: ["[Time] - Marker Time", "[Dur] - Duration"],
    properties: ["[Path] - Property Path", "[Val] - Property Value"],
    project: ["[Res] - Comp Resolution", "[LenS] - Length in Seconds", "[LenF] - Length in Frames", "[AR] - Aspect Ratio", "[FR] - Frame Rate", "[Date] - Current Date"]
  };
  
  function updateTemplateDropdown() {
    templateDropdown.removeAll();
    
    templateDropdown.add("item", "- Template -");
    
    var selectedTarget = targetDropdown.selection.text;
    var hasTemplates = false;
    
    switch (selectedTarget) {
      case "All (Recursive)":
      case "Layers":
        for (var i = 0; i < templateOptions.layers.length; i++) {
          templateDropdown.add("item", templateOptions.layers[i]);
        }
        hasTemplates = templateOptions.layers.length > 0;
        break;
      case "Text Content":
        for (var i = 0; i < templateOptions.text.length; i++) {
          templateDropdown.add("item", templateOptions.text[i]);
        }
        hasTemplates = templateOptions.text.length > 0;
        break;
      case "Effects":
        for (var i = 0; i < templateOptions.effects.length; i++) {
          templateDropdown.add("item", templateOptions.effects[i]);
        }
        hasTemplates = templateOptions.effects.length > 0;
        break;
      case "Markers":
        for (var i = 0; i < templateOptions.markers.length; i++) {
          templateDropdown.add("item", templateOptions.markers[i]);
        }
        hasTemplates = templateOptions.markers.length > 0;
        break;
      case "Selected Properties":
      case "Masks":
      case "Puppet Pins":
      case "Shape Properties":
        for (var i = 0; i < templateOptions.properties.length; i++) {
          templateDropdown.add("item", templateOptions.properties[i]);
        }
        hasTemplates = templateOptions.properties.length > 0;
        break;
      case "Project Items":
      case "Source Comp":
        for (var i = 0; i < templateOptions.project.length; i++) {
          templateDropdown.add("item", templateOptions.project[i]);
        }
        hasTemplates = templateOptions.project.length > 0;
        break;
    }
    
    if (templateDropdown.items.length > 0) {
      templateDropdown.selection = 0;
      templateDropdown.enabled = true;
    } else {
      templateDropdown.enabled = false;
    }
    
    templateDropdown.hasTemplates = hasTemplates;
    
    win.layout.layout(true);
  }
  
  updateTemplateDropdown();
  
  // No preset management 
  
  // Rename field row (Row 4)
  var renameGroup = mainControlsGroup.add("group");
  renameGroup.orientation = "row";
  renameGroup.alignChildren = ["fill", "center"];
  renameGroup.spacing = 4;
  
  var renameText = renameGroup.add("edittext", undefined, "");
  renameText.alignment = ["fill", "center"];
  renameText.preferredSize.height = 24;
  renameText.text = "";
  renameText.helpTip = "Enter new name";
  
  // Slightly larger font for better vertical centering in taller field
  renameText.graphics.font = ScriptUI.newFont(renameText.graphics.font.name, renameText.graphics.font.style, 14);
  renameText.justify = "center";
  
  renameText.onActivate = function() {
    if (this.text == "Rename to") {
      this.text = "";
    }
    // Refresh preview when field is focused to reflect any selection changes
    updatePreview();
  };
  
  renameText.onDeactivate = function() {
    if (this.text == "") {
      this.text = "Rename to";
    }
  };
  
  // No preview group - we'll move it to the status bar
  
  renameText.text = "Rename to";
  
  // Number options group (Row 5)
  var numberGroup = mainControlsGroup.add("group");
  numberGroup.orientation = "row";
  numberGroup.alignChildren = ["left", "center"];
  numberGroup.spacing = 4;
  
  var currentNameBtn = numberGroup.add("button", undefined, "Current Name");
  currentNameBtn.preferredSize.width = 88;
  currentNameBtn.preferredSize.height = 22;
  
  var numberAscBtn = numberGroup.add("button", undefined, "Num↑");
  numberAscBtn.preferredSize.width = 50;
  numberAscBtn.preferredSize.height = 22;
  
  var numberDescBtn = numberGroup.add("button", undefined, "Num↓");
  numberDescBtn.preferredSize.width = 50;
  numberDescBtn.preferredSize.height = 22;
  
  var startNumberGroup = numberGroup.add("group");
  startNumberGroup.orientation = "row";
  startNumberGroup.alignChildren = ["right", "center"];
  startNumberGroup.preferredSize.width = 120;
  startNumberGroup.preferredSize.height = 24;
  startNumberGroup.alignment = ["fill", "center"];
  startNumberGroup.spacing = 4;
  
  var startNumberLabel = startNumberGroup.add("statictext", undefined, "Num Start:");
  startNumberLabel.preferredSize.width = 56;
  var startNumber = startNumberGroup.add("edittext", undefined, "1");
  startNumber.characters = 4;
  startNumber.preferredSize.height = 22;
  
  var globalShapeNumberingCheck = numberGroup.add("checkbox", undefined, "Global Seq");
  globalShapeNumberingCheck.value = false;
  globalShapeNumberingCheck.helpTip = "Shape properties: number across all, not per group";
   
  // Button row (Row 6) - Close and Apply buttons at the bottom
  var buttonGroup = rightColumn.add("group");
  buttonGroup.orientation = "row";
  buttonGroup.alignChildren = ["fill", "center"];
  buttonGroup.alignment = ["right", "top"];
  buttonGroup.margins = [0, 8, 0, 0];
  buttonGroup.spacing = 8;
  
  var closeBtn = buttonGroup.add("button", undefined, "Close");
  closeBtn.preferredSize.width = 96;
  closeBtn.preferredSize.height = 28;
  
  var renameBtn = buttonGroup.add("button", undefined, "Apply", {name: "ok"});
  renameBtn.preferredSize.width = 96;
  renameBtn.preferredSize.height = 28; 
  
  
  
  // Preview items storage for dynamic updates
  var previewItems = [];
  
  // Template dropdown handler
  templateDropdown.onChange = function() {
    if (this.selection && this.selection.index > 0) {
      var selectedText = this.selection.text;
      var match = selectedText.match(/\[(.*?)\]/);
      if (match) {
        var template = "[" + match[1] + "]";
        
        // Clear placeholder text if present
        if (renameText.text === "Rename to") {
          renameText.text = "";
        }
        
        // Make rename field active
        renameText.active = true;
        
        // Insert at current cursor position or at end if no selection
        try {
          var startPos = (renameText.textSelection && renameText.textSelection[0] !== undefined) ? 
                          renameText.textSelection[0] : renameText.text.length;
          var endPos = (renameText.textSelection && renameText.textSelection[1] !== undefined) ? 
                        renameText.textSelection[1] : renameText.text.length;
          
          // Insert the template
          var textBefore = renameText.text.substring(0, startPos);
          var textAfter = renameText.text.substring(endPos);
          renameText.text = textBefore + template + textAfter;
          
          // Position cursor after inserted template
          var newPos = startPos + template.length;
          renameText.textSelection = [newPos, newPos];
        } catch (e) {
          // Fallback: just append to the end
          renameText.text += template;
        }
        
        // Update preview
        updatePreview();
      }
      
      // Reset dropdown selection
      this.selection = 0;
    }
  };
  
  targetDropdown.onChange = function() {
    updateTemplateDropdown();
    updatePreview();
  };
  
  // Helper Functions
  function detectActivePanel() {
    try {
      if (!app.project) return null;
      
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length > 0) {
        
        if (app.activeViewer && 
            app.activeViewer.type === ViewerType.VIEWER_EFFECT && 
            app.activeViewer.active) {
          return "effects";
        }
        
        if (typeof effectsPaletteActive !== "undefined" && effectsPaletteActive === true) {
          return "effects";
        }
        
        var focusedEffects = focusedEffectsPanel();
        if (focusedEffects) {
          return "effects";
        }
      }
      
      var projectActive = app.project.selection.length > 0;
      var timelineActive = app.project.activeItem instanceof CompItem && 
                          app.project.activeItem.selectedLayers.length > 0;
      
      if (projectActive && timelineActive) {
        if (lastEffectsSelectionTime > lastProjectSelectionTime && 
            lastEffectsSelectionTime > lastTimelineSelectionTime) {
          return "effects";
        }
        
        if (lastProjectSelectionTime > lastTimelineSelectionTime) {
          return "project";
        } else {
          return "timeline";
        }
      }
      
      if (projectActive) return "project";
      if (timelineActive) return "timeline";
      if (app.project.activeItem instanceof CompItem) return "timeline";
      
      return null;
    } catch (e) {
      return null;
    }
  }
  
  function focusedEffectsPanel() {
    try {
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length === 1) {
        
        var layer = app.project.activeItem.selectedLayers[0];
        
        if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
          var effectsSelected = false;
          var now = new Date().getTime();
          
          for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
            var effect = layer.property("Effects").property(i);
            
            try {
              if (effect.selected) {
                effectsSelected = true;
                break;
              }
            } catch (e) {}
            
            try {
              if (effect.modified) {
                effectsSelected = true;
                break;
              }
            } catch (e) {}
          }
          
          if (effectsSelected) return true;
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }
  
  function updateTargetBasedOnContext() {
    if (!autoDetectCheck.value) return;
    
    var activePanel = detectActivePanel();
    var currentTarget = targetDropdown.selection ? targetDropdown.selection.text : null;
    var shouldUpdate = false;
    var targetIndex = 0;
    
    if (activePanel === "timeline" && currentTarget !== "Layers") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Layers") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === "effects" && currentTarget !== "Effects") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Effects") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === "expressions" && currentTarget !== "Expressions") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Expressions") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === "project" && currentTarget !== "Project Items") {
      for (var i = 0; i < targetDropdown.items.length; i++) {
        if (targetDropdown.items[i].text === "Project Items") {
          targetIndex = i;
          shouldUpdate = true;
          break;
        }
      }
    } else if (activePanel === null && currentTarget !== "All (Recursive)") {
      targetIndex = 0;
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      targetDropdown.selection = targetIndex;
      updateTemplateDropdown();
      updatePreview();
      win.update();
    }
  }
  
  function checkCompAndSelection() {
    if (!(app.project.activeItem instanceof CompItem)) {
      showError("Composition Required", "Please open a composition.");
      return false;
    }
    
    if (app.project.activeItem.selectedLayers.length === 0) {
      showError("Selection Required", "Please select at least one layer.");
      return false;
    }
    
    return true;
  }
  
  // Tracking variables
  var lastCheckTime = 0;
  var checkInterval = 250; // ms
  var lastSelectionState = "";
  var lastEffectsState = "";
  var lastExpressionState = "";
  var lastProjectSelectionState = "";
  var lastTimelineSelectionState = "";
  var lastProjectSelectionTime = 0;
  var lastTimelineSelectionTime = 0;
  var lastEffectsSelectionTime = 0;
  
  function checkForSelectionChanges() {
    try {
      var now = new Date().getTime();
      
      // Only perform intensive checks when needed
      if (now - lastCheckTime > checkInterval) {
        lastCheckTime = now;
        
        var currentState = "";
        
        var currentProjectState = "";
        if (app.project && app.project.selection.length > 0) {
          currentProjectState = "project|items:" + app.project.selection.length;
          for (var i = 0; i < Math.min(app.project.selection.length, 5); i++) {
            currentProjectState += "|" + app.project.selection[i].id;
          }
        }
        
        if (currentProjectState !== lastProjectSelectionState) {
          lastProjectSelectionState = currentProjectState;
          if (currentProjectState) {
            lastProjectSelectionTime = now;
          }
        }
        
        var currentTimelineState = "";
        if (app.project && app.project.activeItem instanceof CompItem) {
          var comp = app.project.activeItem;
          var layers = comp.selectedLayers;
          
          currentTimelineState = "comp:" + comp.id + "|layers:" + layers.length;
          for (var i = 0; i < Math.min(layers.length, 5); i++) {
            currentTimelineState += "|" + layers[i].index;
          }
        }
        
        if (currentTimelineState !== lastTimelineSelectionState) {
          lastTimelineSelectionState = currentTimelineState;
          if (currentTimelineState) {
            lastTimelineSelectionTime = now;
          }
        }
        
        currentState = currentProjectState + "||" + currentTimelineState;
        
        if (currentState !== lastSelectionState) {
          lastSelectionState = currentState;
          
          if (autoDetectCheck.value) {
            updateTargetBasedOnContext();
          }
          
          // Update the preview when selection changes
          updatePreview();
        }
        
        if (app.project && app.project.activeItem instanceof CompItem && 
            app.project.activeItem.selectedLayers.length === 1) {
          var layer = app.project.activeItem.selectedLayers[0];
          var currentEffectsState = "";
          
          if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
            for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
              var effect = layer.property("Effects").property(i);
              currentEffectsState += effect.name + ":";
              
              try {
                var isActive = false;
                for (var p = 1; p <= effect.numProperties; p++) {
                  if (effect.property(p).selected) {
                    isActive = true;
                    break;
                  }
                }
                currentEffectsState += (isActive ? "1" : "0") + ",";
              } catch (e) {
                currentEffectsState += "u,";
              }
            }
          }
          
          if (currentEffectsState !== lastEffectsState) {
            lastEffectsState = currentEffectsState;
            lastEffectsSelectionTime = now;
            
            if (autoDetectCheck.value && focusedEffectsPanel()) {
              var currentTarget = targetDropdown.selection ? targetDropdown.selection.text : null;
              if (currentTarget !== "Effects") {
                for (var i = 0; i < targetDropdown.items.length; i++) {
                  if (targetDropdown.items[i].text === "Effects") {
                    targetDropdown.selection = i;
                    updateTemplateDropdown();
                    updatePreview();
                    win.update();
                    break;
                  }
                }
              }
            }
          }
        } else {
          lastEffectsState = "";
        }
        
        var currentExpressionState = "";
        if (app.project && app.project.activeItem instanceof CompItem) {
          var hasSelectedExpressions = checkForSelectedExpressions();
          currentExpressionState = hasSelectedExpressions ? "selected" : "";
          
          if (currentExpressionState !== lastExpressionState) {
            lastExpressionState = currentExpressionState;
            
            if (autoDetectCheck.value && hasSelectedExpressions) {
              var currentTarget = targetDropdown.selection ? targetDropdown.selection.text : null;
              if (currentTarget !== "Expressions") {
                for (var i = 0; i < targetDropdown.items.length; i++) {
                  if (targetDropdown.items[i].text === "Expressions") {
                    targetDropdown.selection = i;
                    updateTemplateDropdown();
                    updatePreview();
                    win.update();
                    break;
                  }
                }
              }
            }
          }
        } else {
          lastExpressionState = "";
        }
      }
    } catch (e) {
      // Silently ignore errors during change detection
    }
    
    app.scheduleTask(checkForSelectionChanges, 200, false);
  }
  
  function checkForSelectedExpressions() {
    try {
      if (app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        
        for (var i = 0; i < selectedLayers.length; i++) {
          var hasExpressions = checkLayerForSelectedExpressions(selectedLayers[i]);
          if (hasExpressions) {
            return true;
          }
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  function checkLayerForSelectedExpressions(layer) {
    try {
      function checkPropertyForExpression(prop) {
        if (!prop) return false;
        
        if (prop.propertyType === PropertyType.PROPERTY) {
          if (prop.selected && prop.expression && prop.expression !== "") {
            return true;
          }
        }
        else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                 prop.propertyType === PropertyType.NAMED_GROUP) {
          for (var i = 1; i <= prop.numProperties; i++) {
            if (checkPropertyForExpression(prop.property(i))) {
              return true;
            }
          }
        }
        return false;
      }
      
      return checkPropertyForExpression(layer);
    } catch (e) {
      return false;
    }
  }
  
  function checkProjectSelection() {
    if (app.project && app.project.selection && app.project.selection.length > 0) {
      return true;
    }
    
    showError("Selection Required", "Please select at least one item in the Project panel.");
    return false;
  }
  
  function updateStatus(message) {
    // Don't update any status text, just show errors if needed
    if (message.indexOf("Error:") === 0) {
      showError("Rename Error", message.substring(7));
    }
  }
  
  function showError(title, message, details) {
    var errorMsg = title + "\n\n" + message;
    if (details) errorMsg += "\n\nDetails: " + details;
    alert(errorMsg);
  }

  // Truncate preview line text to fit a single row and append "..." in the middle
  function truncatePreviewText(text, graphics, availableWidth) {
    try {
      if (!text || !graphics) return "";
      if (graphics.measureString(text)[0] <= availableWidth) {
        return text;
      }
      
      var ellipsis = "...";
      var ellipsisWidth = graphics.measureString(ellipsis)[0];
      var targetWidth = availableWidth - ellipsisWidth;
      var start = "";
      var end = "";

      // Find start text that fits in about half the available space
      for (var i = 1; i < text.length; i++) {
        var tempStart = text.substring(0, i);
        if (graphics.measureString(tempStart)[0] > targetWidth / 2) {
          break;
        }
        start = tempStart;
      }

      // Find end text that fits in about half the available space
      for (var i = text.length - 1; i > 0; i--) {
        var tempEnd = text.substring(i);
        if (graphics.measureString(tempEnd)[0] > targetWidth / 2) {
          break;
        }
        end = tempEnd;
      }
      
      // Ensure the combined text with ellipsis fits, trimming if necessary
      var result = start + ellipsis + end;
      while (graphics.measureString(result)[0] > availableWidth && start.length > 0) {
        start = start.slice(0, -1);
        result = start + ellipsis + end;
      }

      return result;

    } catch (e) {
      // Fallback for safety if measureString fails
      var limit = 24; 
      if (text.length <= limit) return text;
      var half = Math.floor((limit - 3) / 2);
      return text.substring(0, half) + "..." + text.substring(text.length - half);
    }
  }

  function buildRegexFromUI(pattern) {
    try {
      if (!pattern || pattern === "") return null;
      var src = pattern;
      // Wrap with word boundaries if Whole Word
      if (wholeWordCheck && wholeWordCheck.value) {
        // Avoid double boundary if user already provided \b
        if (src.indexOf("\\b") === -1) {
          src = "\\b" + src + "\\b";
        }
      }
      var flags = matchCaseCheck && matchCaseCheck.value ? "g" : "gi";
      return new RegExp(src, flags);
    } catch (e) {
      return null;
    }
  }

  // Helper function to collect selected properties with expressions from a layer
  function collectSelectedPropertiesWithExpressions(layer) {
    var result = [];
    
    function checkProperty(prop) {
      if (!prop) return;
      
      try {
        if (prop.propertyType === PropertyType.PROPERTY) {
          if (prop.canSetExpression && prop.expression && prop.expression !== "") {
            try {
              if (prop.selected) {
                result.push(prop);
              }
            } catch (e) {}
          }
        }
        else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                prop.propertyType === PropertyType.NAMED_GROUP) {
          for (var i = 1; i <= prop.numProperties; i++) {
            checkProperty(prop.property(i));
          }
        }
      } catch (e) {
        // Skip properties that cause errors
      }
    }
    
    try {
      checkProperty(layer);
    } catch (e) {}
    return result;
  }
  
  function canRenameProperty(prop) {
    try {
      if (!prop || prop.name === undefined) return false;
      var original = prop.name;
      prop.name = original; // no-op set; will throw if disallowed
      return true;
    } catch (e) {
      return false;
    }
  }
  
  function updatePreview() {
    try {
      // Clear existing preview items
      for (var i = previewItems.length - 1; i >= 0; i--) {
        previewPanel.remove(previewItems[i]);
      }
      previewItems = [];
      
      var selectedTarget = targetDropdown.selection ? targetDropdown.selection.text : "Layers";
      var pattern = findText.text === "Match (optional)" ? "" : findText.text;
      var template = renameText.text === "Rename to" ? "" : renameText.text;
      var activePanel = detectActivePanel();
      
      // Show selection count header
      var selectionCount = 0;
      if (app.project.activeItem instanceof CompItem && app.project.activeItem.selectedLayers.length > 0) {
        selectionCount = app.project.activeItem.selectedLayers.length;
      } else if (app.project && app.project.selection && app.project.selection.length > 0) {
        selectionCount = app.project.selection.length;
      }
      previewPanel.text = "Preview (" + selectionCount + ")";
      
      // If no pattern or template, show current names
      var showCurrentNames = (pattern.length === 0 && template.length === 0);
      var availableWidth = 148; // Conservative width for preview text inside the 160px panel
      
      // Handle layer selections
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length > 0 &&
          (selectedTarget === "Layers" || selectedTarget === "All (Recursive)")) {
        
        var selectedLayers = app.project.activeItem.selectedLayers;
        var previewNames = [];
        
        // Determine which layers to show in preview
        var layersToPreview = [];
        if (selectedLayers.length <= 10) {
          // Show all if 10 or fewer
          for (var i = 0; i < selectedLayers.length; i++) {
            layersToPreview.push({layer: selectedLayers[i], index: i});
          }
        } else {
          // Show first 10
          for (var i = 0; i < 10; i++) {
            layersToPreview.push({layer: selectedLayers[i], index: i});
          }
        }
        
        for (var i = 0; i < layersToPreview.length; i++) {
          var layerData = layersToPreview[i];
          var layer = layerData.layer;
          var index = layerData.index;
          var oldName = layer.name;
          var previewName = "";
          
          // If no pattern or template, just show current name
          if (showCurrentNames) {
            previewName = oldName;
          }
          // Check if template contains codes
          else if (/\[([#A-Za-z0-9↑↓]+)\]/g.test(template)) {
            previewName = processNameTemplate(template, oldName, index, selectedLayers.length);
          } else {
            // Simple find and replace
            if (pattern && pattern.length > 0) {
              try {
                var regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                if (template === "") {
                  previewName = oldName.replace(regex, "");
                } else {
                  previewName = oldName.replace(regex, template);
                }
              } catch (e) {
                if (template === "") {
                  previewName = oldName.split(pattern).join("");
                } else {
                  previewName = oldName.split(pattern).join(template);
                }
              }
            } else {
              previewName = template;
            }
          }
          
          previewNames.push(previewName);
        }
        
        for (var i = 0; i < previewNames.length; i++) {
          var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
          var itemText = previewPanel.add("statictext", undefined, truncatedName);
          itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
          previewItems.push(itemText);
        }
        if (selectedLayers.length > 10) {
          var ellipsisText = previewPanel.add("statictext", undefined, "...");
          ellipsisText.graphics.font = ScriptUI.newFont(ellipsisText.graphics.font.name, ellipsisText.graphics.font.style, 10);
          previewItems.push(ellipsisText);
        }
        previewPanel.layout.layout(true);
        return;
      }
      
      // Handle project panel selections
      if (app.project && app.project.selection && app.project.selection.length > 0 &&
          (selectedTarget === "Project Items" || activePanel === "project")) {
        
        var selectedItems = app.project.selection;
        var previewNames = [];
        
        // Determine which items to show in preview
        var itemsToPreview = [];
        if (selectedItems.length <= 10) {
          // Show all if 10 or fewer
          for (var i = 0; i < selectedItems.length; i++) {
            itemsToPreview.push({item: selectedItems[i], index: i});
          }
        } else {
          // Show first 10
          for (var i = 0; i < 10; i++) {
            itemsToPreview.push({item: selectedItems[i], index: i});
          }
        }
        
        for (var i = 0; i < itemsToPreview.length; i++) {
          var itemData = itemsToPreview[i];
          var item = itemData.item;
          var index = itemData.index;
          var oldName = item.name;
          var previewName = "";
          
          // If no pattern or template, just show current name
          if (showCurrentNames) {
            previewName = oldName;
          }
          // Process template codes for project items
          else if (/\[([#A-Za-z0-9↑↓]+)\]/g.test(template)) {
            previewName = replacePaddedNumberTokens(template, index, selectedItems.length, parseInt(startNumber.text) || 1);
            
            // [N] - Current name
            if (previewName.indexOf("[N]") !== -1) {
              previewName = previewName.replace(/\[N\]/g, oldName);
            }
            
            // [#↑] - Ascending number
            if (previewName.indexOf("[#↑]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + index);
              previewName = previewName.replace(/\[#↑\]/g, formattedNumber);
            }
            
            // [#↓] - Descending number
            if (previewName.indexOf("[#↓]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + (selectedItems.length - index - 1));
              previewName = previewName.replace(/\[#↓\]/g, formattedNumber);
            }
            
            // Comp-specific templates
            if (item instanceof CompItem) {
              if (previewName.indexOf("[Res]") !== -1) {
                var resolution = item.width + "x" + item.height;
                previewName = previewName.replace(/\[Res\]/g, resolution);
              }
              
              if (previewName.indexOf("[LenS]") !== -1) {
                var lengthSec = item.duration.toFixed(2) + "s";
                previewName = previewName.replace(/\[LenS\]/g, lengthSec);
              }
              
              if (previewName.indexOf("[LenF]") !== -1) {
                var lengthFrames = Math.round(item.duration * item.frameRate) + "f";
                previewName = previewName.replace(/\[LenF\]/g, lengthFrames);
              }
              
              if (previewName.indexOf("[AR]") !== -1) {
                var aspectRatio = calculateAspectRatio(item.width, item.height);
                previewName = previewName.replace(/\[AR\]/g, aspectRatio);
              }
              
              if (previewName.indexOf("[FR]") !== -1) {
                var frameRate = item.frameRate.toFixed(2) + " fps";
                previewName = previewName.replace(/\[FR\]/g, frameRate);
              }
            }
            
            // [Date] - Current Date
            if (previewName.indexOf("[Date]") !== -1) {
              var currentDate = formatDate(new Date());
              previewName = previewName.replace(/\[Date\]/g, currentDate);
            }
          } else {
            // Simple find and replace
            if (pattern && pattern.length > 0) {
            try {
              var regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                if (template === "") {
                  previewName = oldName.replace(regex, "");
                } else {
                  previewName = oldName.replace(regex, template);
                }
              } catch (e) {
                if (template === "") {
                  previewName = oldName.split(pattern).join("");
                } else {
                  previewName = oldName.split(pattern).join(template);
                }
              }
            } else {
              previewName = replacePaddedNumberTokens(template, index, selectedItems.length, parseInt(startNumber.text) || 1);
            }
          }
          
          previewNames.push(previewName);
        }
        
        for (var i = 0; i < previewNames.length; i++) {
          var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
          var itemText = previewPanel.add("statictext", undefined, truncatedName);
          itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
          previewItems.push(itemText);
        }
        if (selectedItems.length > 10) {
          var ellipsisText = previewPanel.add("statictext", undefined, "...");
          ellipsisText.graphics.font = ScriptUI.newFont(ellipsisText.graphics.font.name, ellipsisText.graphics.font.style, 10);
          previewItems.push(ellipsisText);
        }
        previewPanel.layout.layout(true);
        return;
      }
      
      // Handle effects selections
      if (selectedTarget === "Effects" || activePanel === "effects") {
        if (app.project.activeItem instanceof CompItem && 
            app.project.activeItem.selectedLayers.length > 0) {
          
          var layer = app.project.activeItem.selectedLayers[0];
          if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
            var effectsGroup = layer.property("Effects");
            
            // Collect selected effects or all effects if none selected
            var selectedEffects = [];
            for (var i = 1; i <= effectsGroup.numProperties; i++) {
              var effect = effectsGroup.property(i);
              try {
                if (effect.selected) {
                  selectedEffects.push({effect: effect, index: i - 1});
                }
              } catch (e) {}
            }
            
            // If no effects are specifically selected, use all effects
            if (selectedEffects.length === 0) {
              for (var i = 1; i <= effectsGroup.numProperties; i++) {
                selectedEffects.push({effect: effectsGroup.property(i), index: i - 1});
              }
            }
            
            var previewNames = [];
            var effectsToPreview = [];
            
            if (selectedEffects.length <= 10) {
              // Show all if 10 or fewer
              effectsToPreview = selectedEffects;
            } else {
              // Show first 10
              for (var i = 0; i < 10; i++) {
                effectsToPreview.push(selectedEffects[i]);
              }
            }
            
            for (var i = 0; i < effectsToPreview.length; i++) {
              var effectData = effectsToPreview[i];
              var effect = effectData.effect;
              var index = effectData.index;
              var oldName = effect.name;
              var previewName = "";
              
              // If no pattern or template, just show current name
              if (showCurrentNames) {
                previewName = oldName;
              }
              // Process template codes for effects
              else if (/\[([#A-Za-z0-9↑↓]+)\]/g.test(template)) {
                previewName = replacePaddedNumberTokens(template, index, selectedEffects.length, parseInt(startNumber.text) || 1);
                
                // [N] - Current name
                if (previewName.indexOf("[N]") !== -1) {
                  previewName = previewName.replace(/\[N\]/g, oldName);
                }
                
                // [#↑] - Ascending number
                if (previewName.indexOf("[#↑]") !== -1) {
                  var startVal = parseInt(startNumber.text) || 1;
                  var formattedNumber = formatNumber(startVal + index);
                  previewName = previewName.replace(/\[#↑\]/g, formattedNumber);
                }
                
                // [#↓] - Descending number
                if (previewName.indexOf("[#↓]") !== -1) {
                  var startVal = parseInt(startNumber.text) || 1;
                  var formattedNumber = formatNumber(startVal + (selectedEffects.length - index - 1));
                  previewName = previewName.replace(/\[#↓\]/g, formattedNumber);
                }
                
                // [ET] - Effect Type
                if (previewName.indexOf("[ET]") !== -1) {
                  var effectType = effect.matchName.split("_")[1] || effect.matchName;
                  previewName = previewName.replace(/\[ET\]/g, effectType);
                }
                
                // [En] - Enabled State
                if (previewName.indexOf("[En]") !== -1) {
                  var enabledState = effect.enabled ? "On" : "Off";
                  previewName = previewName.replace(/\[En\]/g, enabledState);
                }
              } else {
                // Simple find and replace
                if (pattern && pattern.length > 0) {
                  try {
                    var regex = new RegExp(pattern, 'g');
                    if (template === "") {
                      previewName = oldName.replace(regex, "");
                    } else {
                      previewName = oldName.replace(regex, template);
                    }
                  } catch (e) {
                    if (template === "") {
                      previewName = oldName.split(pattern).join("");
                    } else {
                      previewName = oldName.split(pattern).join(template);
                    }
                  }
                } else {
                  previewName = replacePaddedNumberTokens(template, index, selectedEffects.length, parseInt(startNumber.text) || 1);
                }
              }
              
              previewNames.push(previewName);
            }
            
            for (var i = 0; i < previewNames.length; i++) {
              var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
              var itemText = previewPanel.add("statictext", undefined, truncatedName);
              itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
              previewItems.push(itemText);
            }
            if (selectedEffects.length > 10) {
              var ellipsisText = previewPanel.add("statictext", undefined, "...");
              ellipsisText.graphics.font = ScriptUI.newFont(ellipsisText.graphics.font.name, ellipsisText.graphics.font.style, 10);
              previewItems.push(ellipsisText);
            }
            previewPanel.layout.layout(true);
            return;
          }
        }
        
        var msgText = previewPanel.add("statictext", undefined, "No effects found\nto preview");
        msgText.graphics.font = ScriptUI.newFont(msgText.graphics.font.name, msgText.graphics.font.style, 9);
        previewItems.push(msgText);
        previewPanel.layout.layout(true);
        return;
      }
      
      // Handle Text Content selections
      if (selectedTarget === "Text Content" && app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        var textLayers = [];
        for (var i = 0; i < selectedLayers.length; i++) {
          if (selectedLayers[i] instanceof TextLayer) {
            textLayers.push(selectedLayers[i]);
          }
        }

        if (textLayers.length > 0) {
          var previewNames = [];
          var layersToPreview = textLayers.length > 10 ? textLayers.slice(0, 10) : textLayers;

          for (var i = 0; i < layersToPreview.length; i++) {
            var layer = layersToPreview[i];
            var textProp = layer.property("Source Text");
            if (!textProp) continue;

            var oldText = textProp.value.text;
            var newText = "";

            if (showCurrentNames) {
              newText = oldText;
            } else if (pattern && pattern.length > 0) {
              try {
                var regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                newText = oldText.replace(regex, template);
              } catch (e) {
                newText = oldText.split(pattern).join(template);
              }
            } else {
              newText = template;
            }
            previewNames.push(newText);
          }

          for (var i = 0; i < previewNames.length; i++) {
            var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
            var itemText = previewPanel.add("statictext", undefined, truncatedName);
            itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
            previewItems.push(itemText);
          }
          if (textLayers.length > 10) {
            var ellipsisText = previewPanel.add("statictext", undefined, "...");
            previewItems.push(ellipsisText);
          }
          previewPanel.layout.layout(true);
          return;
        }
      }
      
      // Handle Markers selections
      if (selectedTarget === "Markers" && app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        var markers = [];
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          if (layer.marker && layer.marker.numKeys > 0) {
            for (var j = 1; j <= layer.marker.numKeys; j++) {
              var markerValue = layer.marker.keyValue(j);
              if (markerValue.comment) {
                markers.push({layer: layer, comment: markerValue.comment, index: j});
              }
            }
          }
        }

        if (markers.length > 0) {
          var previewNames = [];
          var markersToPreview = markers.length > 10 ? markers.slice(0, 10) : markers;

          for (var i = 0; i < markersToPreview.length; i++) {
            var markerInfo = markersToPreview[i];
            var oldComment = markerInfo.comment;
            var newComment = "";

            if (showCurrentNames) {
              newComment = oldComment;
            } else if (pattern && pattern.length > 0) {
              try {
                var regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                newComment = oldComment.replace(regex, template);
              } catch (e) {
                newComment = oldComment.split(pattern).join(template);
              }
            } else {
              newComment = template;
            }
            previewNames.push(newComment);
          }

          for (var i = 0; i < previewNames.length; i++) {
            var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
            var itemText = previewPanel.add("statictext", undefined, truncatedName);
            itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
            previewItems.push(itemText);
          }
          if (markers.length > 10) {
            var ellipsisText = previewPanel.add("statictext", undefined, "...");
            previewItems.push(ellipsisText);
          }
          previewPanel.layout.layout(true);
          return;
        }
      }
      
      // Handle Expressions selections
      if (selectedTarget === "Expressions" && app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        var expressions = [];
        for (var i = 0; i < selectedLayers.length; i++) {
          var props = [];
          try {
            props = collectSelectedPropertiesWithExpressions(selectedLayers[i]) || [];
          } catch (e) {
            props = [];
          }
          for (var j = 0; j < props.length; j++) {
            expressions.push({layer: selectedLayers[i], prop: props[j]});
          }
        }

        if (expressions.length > 0) {
          var previewNames = [];
          var expressionsToPreview = expressions.length > 10 ? expressions.slice(0, 10) : expressions;

          for (var i = 0; i < expressionsToPreview.length; i++) {
            try {
              var exprInfo = expressionsToPreview[i];
              var oldExpr = "";
              try { oldExpr = String(exprInfo.prop.expression); } catch (e) { oldExpr = ""; }
              var newExpr = "";

              if (showCurrentNames) {
                newExpr = oldExpr;
              } else if (pattern && pattern.length > 0) {
                try {
                  var regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                  newExpr = oldExpr.replace(regex, template);
                } catch (e) {
                  newExpr = oldExpr.split(pattern).join(template);
                }
              } else {
                newExpr = template;
              }
              previewNames.push(newExpr.replace(/\r?\n|\r/g, " "));
            } catch (innerErr) {
              // skip this item on error
            }
          }

          for (var i = 0; i < previewNames.length; i++) {
            var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
            var itemText = previewPanel.add("statictext", undefined, truncatedName);
            itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
            previewItems.push(itemText);
          }
          if (expressions.length > 10) {
            var ellipsisText = previewPanel.add("statictext", undefined, "...");
            previewItems.push(ellipsisText);
          }
          previewPanel.layout.layout(true);
          return;
        }
      }
      
      // Handle Selected Properties selections
      if (selectedTarget === "Selected Properties" && app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        
        function collectSelectedProperties(layer) {
          var result = [];
          
          function checkProperty(prop) {
            if (!prop) return;
            
            try {
              if (prop.selected && prop.name !== undefined) {
                result.push(prop);
              }
            } catch (e) {}
            
            if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                prop.propertyType === PropertyType.NAMED_GROUP) {
              for (var i = 1; i <= prop.numProperties; i++) {
                checkProperty(prop.property(i));
              }
            }
          }
          
          checkProperty(layer);
          
          if (layer instanceof ShapeLayer && layer.property("Contents")) {
            checkProperty(layer.property("Contents"));
          }
          
          return result;
        }
        
        var selectedProperties = [];
        for (var i = 0; i < selectedLayers.length; i++) {
          var props = collectSelectedProperties(selectedLayers[i]);
          selectedProperties = selectedProperties.concat(props);
        }
        
        // Filter to renameable properties for preview
        var renameableProperties = [];
        for (var i = 0; i < selectedProperties.length; i++) {
          if (canRenameProperty(selectedProperties[i])) {
            renameableProperties.push(selectedProperties[i]);
          }
        }
        
        if (renameableProperties.length > 0) {
          var previewNames = [];
          var maxPreview = 10;
          
          for (var i = 0; i < renameableProperties.length && i < maxPreview; i++) {
            var prop = renameableProperties[i];
            var oldName = prop.name || "";
            var newName = template;
            
            if (showCurrentNames) {
              newName = oldName;
            } else {
              if (template === "[N]") {
                newName = oldName;
              } else if (template.indexOf("[N]") !== -1) {
                newName = template.replace(/\[N\]/g, oldName);
              }
              
              if (template.indexOf("[#↑]") !== -1) {
                var startValAsc = parseInt(startNumber.text) || 1;
                var formattedNumberAsc = formatNumber(startValAsc + i);
                newName = newName.replace(/\[#↑\]/g, formattedNumberAsc);
              }
              
              if (template.indexOf("[#↓]") !== -1) {
                var startValDesc = parseInt(startNumber.text) || 1;
                var formattedNumberDesc = formatNumber(startValDesc + (renameableProperties.length - i - 1));
                newName = newName.replace(/\[#↓\]/g, formattedNumberDesc);
              }
              
              if (template.indexOf("[Path]") !== -1) {
                var path = "";
                try {
                  var current = prop;
                  var pathParts = [];
                  while (current && current.name) {
                    pathParts.unshift(current.name);
                    current = current.parentProperty;
                  }
                  path = pathParts.join("/");
                } catch (e) {
                  path = "Unknown";
                }
                newName = newName.replace(/\[Path\]/g, path);
              }
              
              if (template.indexOf("[Val]") !== -1 && prop.propertyType === PropertyType.PROPERTY) {
                var valueStr = "N/A";
                try {
                  if (prop.value !== undefined) {
                    if (prop.value.length) {
                      valueStr = "[" + prop.value.join(", ") + "]";
                    } else {
                      valueStr = prop.value.toString();
                    }
                  }
                } catch (e) {
                  valueStr = "Error";
                }
                newName = newName.replace(/\[Val\]/g, valueStr);
              }
              
              var findProvided = pattern && pattern.length > 0 && pattern !== "Match (optional)";
              if (findProvided) {
                try {
                  var regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                  if (template === newName) {
                    newName = oldName.replace(regex, template);
                  } else {
                    var matches = oldName.match(regex);
                    if (matches && matches.length > 0) {
                      newName = newName.replace(pattern, matches[0]);
                    }
                  }
                } catch (e) {
                  if (template === newName) {
                    newName = oldName.split(pattern).join(template);
                  }
                }
              }
            }
            
            previewNames.push(newName);
          }
          
          for (var i = 0; i < previewNames.length; i++) {
            var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
            var itemText = previewPanel.add("statictext", undefined, truncatedName);
            itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
            previewItems.push(itemText);
          }
          if (renameableProperties.length > maxPreview) {
            var ellipsisText = previewPanel.add("statictext", undefined, "...");
            previewItems.push(ellipsisText);
          }
          previewPanel.layout.layout(true);
          return;
        }
      }
      
      // Handle Shape Properties selections
      if (selectedTarget === "Shape Properties" && app.project.activeItem instanceof CompItem) {
        var selectedLayers = app.project.activeItem.selectedLayers;
        var shapeLayers = [];
        for (var i = 0; i < selectedLayers.length; i++) {
          if (selectedLayers[i] instanceof ShapeLayer && selectedLayers[i].property("Contents")) {
            shapeLayers.push(selectedLayers[i]);
          }
        }
        
        if (shapeLayers.length > 0) {
          var findProvided = pattern && pattern.length > 0 && pattern !== "Match (optional)";
          var hasAscToken = template.indexOf("[#↑]") !== -1;
          var hasDescToken = template.indexOf("[#↓]") !== -1;
          var useGlobalSeq = (typeof globalShapeNumberingCheck !== "undefined") && globalShapeNumberingCheck.value === true;
          var shouldGlobalNumber = useGlobalSeq && (hasAscToken || hasDescToken) && !showCurrentNames;
          var startValGlobal = parseInt(startNumber.text) || 1;
          var globalTotal = 0;
          var globalIndex = 0;
          var maxPreview = 10;
          var hitPreviewLimit = false;
          
          function buildMatchResult(name) {
            var hasMatch = false;
            var matches = null;
            var regex = null;
            
            if (findProvided) {
              try {
                regex = buildRegexFromUI(pattern) || new RegExp(pattern, 'g');
                matches = name.match(regex);
                hasMatch = matches && matches.length > 0;
              } catch (e) {
                try {
                  regex = new RegExp(pattern, 'g');
                  matches = name.match(regex);
                  hasMatch = matches && matches.length > 0;
                } catch (err) {
                  hasMatch = false;
                }
              }
            }
            
            return {
              hasMatch: hasMatch,
              matches: matches,
              regex: regex
            };
          }
          
          function countNumberedProps(group) {
            for (var g = 1; g <= group.numProperties; g++) {
              var prop = group.property(g);
              var isRenameable = canRenameProperty(prop);
              var matchInfo = buildMatchResult(prop.name);
              var shouldNumber = isRenameable && ((!findProvided) || matchInfo.hasMatch);
              
              if (shouldNumber) {
                globalTotal++;
              }
              
              if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                  prop.propertyType === PropertyType.NAMED_GROUP) {
                countNumberedProps(prop);
              }
            }
          }
          
          if (shouldGlobalNumber) {
            for (var i = 0; i < shapeLayers.length; i++) {
              var layerForCount = shapeLayers[i];
              countNumberedProps(layerForCount.property("Contents"));
            }
          }
          
          var previewNames = [];
          
          function processShapeGroup(group) {
            var localIndex = 0; // counts renameable props within this group for local numbering
            for (var g = 1; g <= group.numProperties; g++) {
              if (previewNames.length >= maxPreview) {
                hitPreviewLimit = true;
                return;
              }
              
              var prop = group.property(g);
              var oldName = prop.name || "";
              var isRenameable = canRenameProperty(prop);
              
              if (!isRenameable) {
                // Still traverse children even if this property cannot be renamed
                if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                    prop.propertyType === PropertyType.NAMED_GROUP) {
                  processShapeGroup(prop);
                }
                continue;
              }
              
              if (showCurrentNames) {
                previewNames.push(oldName);
              } else {
                var newName = template;
                var matchInfo = buildMatchResult(oldName);
                var shouldNumber = (!findProvided) || matchInfo.hasMatch;
                
                if (template === "[N]") {
                  newName = oldName;
                } else if (template.indexOf("[N]") !== -1) {
                  newName = template.replace(/\[N\]/g, oldName);
                }
                
                if (shouldGlobalNumber && shouldNumber) {
                  if (hasAscToken) {
                    var formattedUp = formatNumber(startValGlobal + globalIndex);
                    newName = newName.replace(/\[#↑\]/g, formattedUp);
                  }
                  if (hasDescToken) {
                    var formattedDown = formatNumber(startValGlobal + (globalTotal - globalIndex - 1));
                    newName = newName.replace(/\[#↓\]/g, formattedDown);
                  }
                  globalIndex++;
                } else {
                  if (hasAscToken) {
                    var startVal = parseInt(startNumber.text) || 1;
                    var formattedNumber = formatNumber(startVal + localIndex);
                    newName = newName.replace(/\[#↑\]/g, formattedNumber);
                  }
                  if (hasDescToken) {
                    var startValDesc = parseInt(startNumber.text) || 1;
                    var formattedNumberDesc = formatNumber(startValDesc + (group.numProperties - g));
                    newName = newName.replace(/\[#↓\]/g, formattedNumberDesc);
                  }
                }
                
                localIndex++;
                
                if (findProvided) {
                  if (matchInfo.hasMatch) {
                    try {
                      var regexToUse = matchInfo.regex || new RegExp(pattern, 'g');
                      if (template === newName) {
                        newName = oldName.replace(regexToUse, template);
                      } else if (matchInfo.matches && matchInfo.matches[0]) {
                        newName = newName.replace(pattern, matchInfo.matches[0]);
                      }
                    } catch (e) {
                      if (template === newName) {
                        newName = oldName.split(pattern).join(template);
                      }
                    }
                  } else {
                    newName = oldName;
                  }
                }
                
                previewNames.push(newName);
              }
              
              if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                  prop.propertyType === PropertyType.NAMED_GROUP) {
                processShapeGroup(prop);
              }
            }
          }
          
          for (var s = 0; s < shapeLayers.length; s++) {
            if (previewNames.length >= maxPreview) {
              hitPreviewLimit = true;
              break;
            }
            processShapeGroup(shapeLayers[s].property("Contents"));
          }
          
          for (var i = 0; i < previewNames.length; i++) {
            var truncatedName = truncatePreviewText(previewNames[i], previewPanel.graphics, availableWidth);
            var itemText = previewPanel.add("statictext", undefined, truncatedName);
            itemText.graphics.font = ScriptUI.newFont(itemText.graphics.font.name, itemText.graphics.font.style, 10);
            previewItems.push(itemText);
          }
          if (hitPreviewLimit) {
            var ellipsisText = previewPanel.add("statictext", undefined, "...");
            previewItems.push(ellipsisText);
          }
          previewPanel.layout.layout(true);
          return;
        }
      }
      
      // Default fallback
      var msgText;
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length > 0) {
        msgText = previewPanel.add("statictext", undefined, "Preview not available\nfor " + selectedTarget);
      } else if (app.project && app.project.selection && app.project.selection.length > 0) {
        msgText = previewPanel.add("statictext", undefined, "Project items selected");
      } else {
        msgText = previewPanel.add("statictext", undefined, "Select items to\nsee preview");
      }
      msgText.graphics.font = ScriptUI.newFont(msgText.graphics.font.name, msgText.graphics.font.style, 9);
      previewItems.push(msgText);
      previewPanel.layout.layout(true);
      
    } catch (e) {
      var errorText = previewPanel.add("statictext", undefined, "Error:\n" + e.toString().substring(0, 50));
      errorText.graphics.font = ScriptUI.newFont(errorText.graphics.font.name, errorText.graphics.font.style, 9);
      previewItems.push(errorText);
      previewPanel.layout.layout(true);
    }
  }
  
  function formatNumber(num, padding) {
    padding = padding || 0;
    var result = num.toString();
    while (result.length < padding) {
      result = "0" + result;
    }
    return result;
  }
  
  // Replace padded number tokens in a template string.
  // Supports tokens like [#↑], [##↑], [###↑] and [#↓], [##↓], [###↓]
  function replacePaddedNumberTokens(input, index, totalCount, startVal) {
    try {
      var result = input;
      var startValueLocal = (startVal !== undefined && startVal !== null) ? startVal : (parseInt(startNumber.text) || 1);
      
      // Ascending padded tokens
      result = result.replace(/\[(#+)↑\]/g, function(match, hashes) {
        var num = startValueLocal + index;
        return formatNumber(num, hashes.length);
      });
      
      // Descending padded tokens
      result = result.replace(/\[(#+)↓\]/g, function(match, hashes) {
        var num = startValueLocal + (totalCount - index - 1);
        return formatNumber(num, hashes.length);
      });
      
      // Default tokens without explicit padding
      result = result.replace(/\[#↑\]/g, function() {
        var num = startValueLocal + index;
        return formatNumber(num);
      });
      result = result.replace(/\[#↓\]/g, function() {
        var num = startValueLocal + (totalCount - index - 1);
        return formatNumber(num);
      });
      
      return result;
    } catch (e) {
      return input;
    }
  }
  
  function highlightRenamedItems(items) {
    if (!items || items.length === 0) return;
    
    // Store current selection
    var currentSelection = [];
    try {
      if (app.project.activeItem instanceof CompItem) {
        var layers = app.project.activeItem.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
          currentSelection.push(layers[i]);
        }
      }
    } catch (e) {}
    
    // Flash renamed items briefly
    try {
      // Select only renamed items
      for (var i = 0; i < currentSelection.length; i++) {
        currentSelection[i].selected = false;
      }
      
      for (var i = 0; i < items.length; i++) {
        items[i].selected = true;
      }
      
      // Restore original selection after a delay
      app.scheduleTask(function() {
        try {
          for (var i = 0; i < items.length; i++) {
            items[i].selected = false;
          }
          
          for (var i = 0; i < currentSelection.length; i++) {
            currentSelection[i].selected = true;
          }
        } catch (e) {}
      }, 300, false);
    } catch (e) {}
  }

  // Button Event Handlers
  closeBtn.onClick = function() {
    win.close();
  };
  
  currentNameBtn.onClick = function() {
    insertAtCursor(renameText, "[N]");
  };
  
  numberAscBtn.onClick = function() {
    insertAtCursor(renameText, "[#↑]");
  };
  
  numberDescBtn.onClick = function() {
    insertAtCursor(renameText, "[#↓]");
  };
  
  function insertAtCursor(textField, textToInsert) {
    // Clear placeholder text if present
    if (textField.text === "Rename to" || textField.text === "Match (optional)") {
      textField.text = "";
      textField.active = true;
      
      // Insert at beginning of empty field
      textField.text = textToInsert;
      // Position cursor after inserted text
      textField.textSelection = [textToInsert.length, textToInsert.length];
      
      // Update preview after insertion
      updatePreview();
      return;
    }
    
    // Ensure text field is active
    textField.active = true;
    
    try {
      // Get cursor position or selection range
      var startPos = (textField.textSelection && textField.textSelection[0] !== undefined) ? 
                      textField.textSelection[0] : textField.text.length;
      var endPos = (textField.textSelection && textField.textSelection[1] !== undefined) ? 
                    textField.textSelection[1] : textField.text.length;
      
      // Insert text at cursor position
      var textBefore = textField.text.substring(0, startPos);
      var textAfter = textField.text.substring(endPos);
      
      // Update text with insertion
      textField.text = textBefore + textToInsert + textAfter;
      
      // Position cursor after inserted text
      var newPosition = startPos + textToInsert.length;
      textField.textSelection = [newPosition, newPosition];
    } catch (e) {
      // Fallback: just append to the end if anything goes wrong
      textField.text += textToInsert;
    }
    
    // Update preview after insertion
    updatePreview();
  }
  
  fromSourceTextBtn.onClick = function() {
    renameLayersSpecial("Source Text");
  };
  
  fromFontNameBtn.onClick = function() {
    renameLayersSpecial("Font Name");
  };
  
  renameWithEffectBtn.onClick = function() {
    renameLayersSpecial("First Effect");
  };
  
  renameWithTypeBtn.onClick = function() {
    renameLayersSpecial("Layer Type");
  };
  
  updateMarkerBtn.onClick = function() {
    renameSelectedLayersFromFirstMarker();
  };
  
  // No preset functions
  
  
  renameBtn.onClick = function() {
    var pattern = findText.text === "Match (optional)" ? "" : findText.text;
    var replacement = renameText.text === "Rename to" ? "" : renameText.text;
    
    // If find has text but rename is empty, we'll continue and delete matched text
    if (pattern.length === 0 && replacement.length === 0) {
      showError("Input Required", "Please enter either a pattern to match or a name to replace with.");
      return;
    }
    
    var selectedTarget = targetDropdown.selection.text;
    
    // Special case for [#↑] or [#↓] alone
    if (replacement === "[#↑]") {
      renameLayersSequential(true);
      updatePreview();
      return;
    } else if (replacement === "[#↓]") {
      renameLayersSequential(false);
      updatePreview();
      return;
    }
    
    var hasTemplateCodes = /\[[#A-Za-z0-9↑↓]+\]/g.test(replacement);
    
    if (selectedTarget === "Layers" && detectActivePanel() === "timeline") {
      if (hasTemplateCodes) {
        renameLayersWithTemplate(pattern, replacement);
      } else {
        renameLayersFindReplace(pattern, replacement);
      }
    } else if (selectedTarget === "Project Items" && detectActivePanel() === "project") {
      renameProjectItems(pattern, replacement);
    } else if (selectedTarget === "Effects" && detectActivePanel() === "effects") {
      renameEffects(pattern, replacement);
    } else if (selectedTarget === "Expressions" && detectActivePanel() === "expressions") {
      updateExpressions(pattern, replacement);
    } else {
      switch (selectedTarget) {
        case "Layers":
          if (hasTemplateCodes) {
            renameLayersWithTemplate(pattern, replacement);
          } else {
            renameLayersFindReplace(pattern, replacement);
          }
          break;
        case "Project Items":
          renameProjectItems(pattern, replacement);
          break;
        case "Effects":
          renameEffects(pattern, replacement);
          break;
        case "Text Content":
          updateTextContent(pattern, replacement);
          break;
        case "Markers":
          updateMarkers(pattern, replacement);
          break;
        case "Expressions":
          updateExpressions(pattern, replacement);
          break;
        case "Selected Properties":
          renameProperties(pattern, replacement);
          break;
        case "Shape Properties":
          renameShapeProperties(pattern, replacement);
          break;
        case "Masks":
          renameMasks(pattern, replacement);
          break;
        case "Puppet Pins":
          renamePuppetPins(pattern, replacement);
          break;
        case "Source Comp":
          renameSourceComp(pattern, replacement);
          break;
        case "All (Recursive)":
          renameAll(pattern, replacement);
          break;
      }
    }
    
    updatePreview();
  };
  
  // Rename Functions
  function renameLayersFindReplace(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Find and Replace Rename");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var oldName = selectedLayers[i].name;
        var newName;
        
        // Apply find/replace if specified
        if (find && find.length > 0) {
          try {
            var regex = buildRegexFromUI(find) || new RegExp(find, 'g');
            newName = oldName.replace(regex, replace);
          } catch (e) {
            // If regex fails, do a plain string replacement
            newName = oldName.split(find).join(replace);
          }
        } else {
          // No find pattern, use replace text directly
          newName = replace;
        }
        
        // Process template codes after find/replace
        if (newName === "[N]") {
          newName = oldName;
        } else if (newName.indexOf("[N]") !== -1) {
          newName = newName.replace(/\[N\]/g, oldName);
        }
        
        if (oldName !== newName) {
          selectedLayers[i].name = newName;
          renamedLayers.push(selectedLayers[i]);
          count++;
        }
      }
      
      // Highlight renamed layers if any
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      updateStatus("Renamed " + count + " layer(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function processNameTemplate(template, currentName, index, totalLayers) {
    var result = template;
    var startValue = parseInt(startNumber.text) || 1;
    var comp = app.project.activeItem;
    var layer = null;
    
    if (comp && comp.selectedLayers.length > index) {
      layer = comp.selectedLayers[index];
    }
    
    while (result.indexOf("[N]") !== -1) {
      result = result.replace("[N]", currentName);
    }
    
    // Replace any padded/default number tokens
    result = replacePaddedNumberTokens(result, index, totalLayers, startValue);
    
    while (result.indexOf("[T]") !== -1 && layer) {
      var layerType = getLayerType(layer);
      result = result.replace("[T]", layerType);
    }
    
    while (result.indexOf("[F]") !== -1 && layer && comp) {
      var frameRate = comp.frameRate;
      var durationInFrames = Math.round((layer.outPoint - layer.inPoint) * frameRate);
      result = result.replace("[F]", durationInFrames + "f");
    }
    
    while (result.indexOf("[Sec]") !== -1 && layer) {
      var durationInSeconds = layer.outPoint - layer.inPoint;
      result = result.replace("[Sec]", durationInSeconds.toFixed(2) + "s");
    }
    
    while (result.indexOf("[Sh]") !== -1 && layer) {
      var shyText = layer.shy ? "-Shy" : "";
      result = result.replace("[Sh]", shyText);
    }
    
    while (result.indexOf("[P]") !== -1 && layer) {
      var parentText = layer.parent ? "-" + layer.parent.name : "";
      result = result.replace("[P]", parentText);
    }
    
    if (layer instanceof TextLayer) {
      while (result.indexOf("[Font]") !== -1) {
        try {
          var fontName = layer.property("Source Text").value.font;
          result = result.replace("[Font]", fontName);
        } catch (e) {
          result = result.replace("[Font]", "Unknown");
        }
      }
      
      while (result.indexOf("[Size]") !== -1) {
        try {
          var fontSize = layer.property("Source Text").value.fontSize;
          result = result.replace("[Size]", fontSize + "px");
        } catch (e) {
          result = result.replace("[Size]", "Unknown");
        }
      }
      
      while (result.indexOf("[Color]") !== -1) {
        try {
          var color = layer.property("Source Text").value.fillColor;
          var hex = rgbToHex(Math.round(color[0] * 255), Math.round(color[1] * 255), Math.round(color[2] * 255));
          result = result.replace("[Color]", hex);
        } catch (e) {
          result = result.replace("[Color]", "Unknown");
        }
      }
    }
    
    return result;
  }
  
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  function getLayerType(layer) {
    if (layer instanceof TextLayer) {
      return "Text";
    } else if (layer instanceof ShapeLayer) {
      return "Shape";
    } else if (layer instanceof LightLayer) {
      return "Light";
    } else if (layer instanceof CameraLayer) {
      return "Camera";
    } else if (layer instanceof AVLayer) {
      if (layer.source instanceof CompItem) {
        return "Comp";
      } else if (layer.source instanceof FootageItem) {
        if (layer.source.mainSource instanceof SolidSource) {
          return "Solid";
        } else if (layer.source.mainSource instanceof FileSource) {
          return layer.source.mainSource.file.name.split('.').pop().toUpperCase();
        } else {
          return "Footage";
        }
      } else {
        return "AVLayer";
      }
    } else {
      return "Layer";
    }
  }
  
  function renameLayersWithTemplate(find, template) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Template Rename");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var renamedLayers = [];
      
      var hasKnownTemplates = /\[N\]|\[#↑\]|\[#↓\]|\[T\]|\[F\]|\[Sec\]|\[Sh\]|\[P\]|\[Font\]|\[Size\]|\[Color\]|\[ET\]|\[En\]|\[Time\]|\[Dur\]|\[Path\]|\[Val\]/g.test(template);
      
      if (!hasKnownTemplates && templateDropdown.hasTemplates) {
        hasKnownTemplates = true;
      }
      
      // Ensure padded tokens are left intact here; processNameTemplate handles them per-index
      for (var i = 0; i < selectedLayers.length; i++) {
        var oldName = selectedLayers[i].name;
        var newName = template;
        
        if (hasKnownTemplates) {
          newName = processNameTemplate(template, oldName, i, selectedLayers.length);
        } else {
          if (template.indexOf("[") >= 0 && template.indexOf("]") >= 0) {
            newName = processNameTemplate(template, oldName, i, selectedLayers.length);
          }
        }
        
        if (find && find.length > 0) {
          try {
            var regex = new RegExp(find, 'g');
            var matchedPart = oldName.match(regex);
            if (matchedPart) {
              for (var j = 0; j < matchedPart.length; j++) {
                newName = newName.replace(find, matchedPart[j]);
              }
            }
          } catch (e) {
            // If regex fails, just continue
          }
        }
        
        if (oldName !== newName) {
          selectedLayers[i].name = newName;
          renamedLayers.push(selectedLayers[i]);
          count++;
        }
      }
      
      // Highlight renamed layers if any
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      updateStatus("Renamed " + count + " layer(s) with template");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameLayersSequential(ascending) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup('Sequential Rename Layers');
      var curComp = app.project.activeItem;
      
      var basename = renameText.text;
      if (basename === "[#↑]" || basename === "[#↓]") {
        basename = "";
      }
      
      var startFrom = parseInt(startNumber.text) || 1;
      var count = 0;
      var selectedLayers = curComp.selectedLayers;
      var layersInSelectionOrder = [];
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        layersInSelectionOrder.push(selectedLayers[i]);
      }
      
      if (!ascending) {
        layersInSelectionOrder.reverse();
      }
      
      for (var i = 0; i < layersInSelectionOrder.length; i++) {
        var currLayer = layersInSelectionOrder[i];
        var formattedNumber = formatNumber(startFrom + i);
        
        var name = (basename ? basename + ' ' : '') + formattedNumber;
        
        try {
          var sourceUsageCount = 0;
          for (var j = 1; j <= curComp.numLayers; j++) {
            if (curComp.layer(j).source === currLayer.source) {
              sourceUsageCount++;
            }
          }
          
          if (sourceUsageCount === 1) {
            currLayer.source.name = name;
          }
        } catch (error) {
          // Skip source renaming if no source
        }
        
        currLayer.name = name;
        renamedLayers.push(currLayer);
        count++;
      }
      
      // Highlight renamed layers if any
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      updateStatus("Renamed " + count + " layer(s) sequentially");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameLayersSpecial(mode) {
    if (!checkCompAndSelection()) return;
    
    try {
      var undoName = "Rename Layers - " + mode;
      app.beginUndoGroup(undoName);
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var comp = app.project.activeItem;
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        var newName = "";
        
        if (mode === "Source Text" && layer instanceof TextLayer) {
          var textProp = layer.property("Source Text");
          if (textProp) {
            var sourceText = textProp.value.toString();
            newName = sourceText.length > 30 ? sourceText.substring(0, 30) + "..." : sourceText;
          }
        } else if (mode === "Font Name" && layer instanceof TextLayer) {
          try {
            newName = layer.property("Source Text").value.font;
          } catch (e) {
            newName = layer.name + " (Font Error)";
          }
        } else if (mode === "First Effect") {
          if (layer.property("Effects") && 
              layer.property("Effects").numProperties > 0) {
            newName = layer.property("Effects").property(1).name;
          }
        } else if (mode === "Layer Type") {
          // Determine the basic layer type first
          var basicType = "";
          if (layer instanceof TextLayer) {
            basicType = "Text";
          } else if (layer instanceof ShapeLayer) {
            basicType = "Shape";
            
            // Get shape group name(s)
            if (layer.property("Contents")) {
              var contents = layer.property("Contents");
              var numGroups = contents.numProperties;
              
              if (numGroups > 0) {
                // Get the first shape group's name
                var firstGroup = contents.property(1);
                var groupName = firstGroup.name;
                
                // Remove space and number at the end if they exist (e.g., "Ellipse 1" → "Ellipse")
                groupName = groupName.replace(/\s+\d+$/, "");
                
                // Replace "Ellipse" with "Circle"
                if (groupName === "Ellipse") {
                  groupName = "Circle";
                }
                
                if (numGroups === 1) {
                  // If only one shape group, use its cleaned name
                  basicType = groupName;
                } else {
                  // If multiple groups, show first name + count
                  basicType = groupName + "+" + (numGroups-1);
                }
              }
            }
          } else if (layer instanceof LightLayer) {
            basicType = "Light";
          } else if (layer instanceof CameraLayer) {
            basicType = "Camera";
          } else if (layer instanceof AVLayer) {
            if (layer.source instanceof CompItem) {
              basicType = "Comp";
            } else if (layer.source instanceof FootageItem) {
              if (layer.source.mainSource instanceof SolidSource) {
                basicType = "Solid";
              } else if (layer.source.mainSource instanceof FileSource) {
                basicType = layer.source.mainSource.file.name.split('.').pop().toUpperCase();
              } else {
                basicType = "Footage";
              }
            } else {
              basicType = "AVLayer";
            }
          } else {
            basicType = "Layer";
          }
          
          // Check if it's an adjustment layer
          if (layer.adjustmentLayer) {
            newName = basicType + "-Adjustment";
          } 
          // Check if it's used as a track matte
          else if (isTrackMatte(layer, comp)) {
            newName = basicType + "-Matte";
          } 
          // Use the basic type if no special conditions
          else {
            newName = basicType;
          }
        } else if (mode === "Length Frames") {
          var frameRate = comp.frameRate;
          var durationInFrames = Math.round((layer.outPoint - layer.inPoint) * frameRate);
          newName = layer.name + " [" + durationInFrames + "f]";
        } else if (mode === "Length Time") {
          var durationInSeconds = layer.outPoint - layer.inPoint;
          newName = layer.name + " [" + durationInSeconds.toFixed(2) + "s]";
        } else if (mode === "Shy") {
          newName = layer.name + (layer.shy ? " -Shy" : "");
        } else if (mode === "Parent") {
          if (layer.parent) {
            newName = layer.name + " -" + layer.parent.name;
          } else {
            newName = layer.name;
          }
        }
        
        if (newName && newName !== layer.name) {
          layer.name = newName;
          renamedLayers.push(layer);
          count++;
        }
      }
      
      // Highlight renamed layers if any
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      }
      
      // Only show error if no layers were compatible, not if already correctly named
      if (count === 0 && selectedLayers.length > 0) {
        var hasCompatibleLayers = false;
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          if (mode === "Source Text" && layer instanceof TextLayer) hasCompatibleLayers = true;
          if (mode === "Font Name" && layer instanceof TextLayer) hasCompatibleLayers = true;
          if (mode === "First Effect" && layer.property("Effects") && layer.property("Effects").numProperties > 0) hasCompatibleLayers = true;
          if (mode === "Layer Type") hasCompatibleLayers = true;
        }
        if (!hasCompatibleLayers) {
          showError("No Layers Renamed", "The selected layers aren't compatible with the " + mode + " option");
        } else {
          updateStatus("Renamed " + count + " layer(s) using " + mode);
        }
      } else {
        updateStatus("Renamed " + count + " layer(s) using " + mode);
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  // Helper function to check if a layer is used as a track matte
  function isTrackMatte(layer, comp) {
    // In After Effects, we can check if any layer references this one as a track matte
    try {
      for (var i = 1; i <= comp.numLayers; i++) {
        var currentLayer = comp.layer(i);
        
        // Skip checking the layer itself
        if (currentLayer.index === layer.index) {
          continue;
        }
        
        // Check if this layer is using our target layer as a track matte
        try {
          // This is the most direct way to check for track matte relationship
          if (currentLayer.trackMatteLayer !== null && 
              currentLayer.trackMatteLayer.index === layer.index) {
            return true;
          }
        } catch (e) {
          // Some versions of AE might not support trackMatteLayer directly
          
          // Try the traditional way - look at track matte type for adjacent layers
          if (currentLayer.trackMatteType > 0) { // 0=none, 1+=some type of matte
            // Check if this is the layer directly below our target
            if (layer.index === currentLayer.index - 1) {
              return true;
            }
          }
        }
      }
    } catch (e) {
      // If anything goes wrong, default to false
    }
    
    return false;
  }
  
  function renameProjectItems(find, replace) {
    if (!checkProjectSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Project Items");
      var selectedItems = app.project.selection;
      var count = 0;
      var renamedItems = [];
      
      for (var i = 0; i < selectedItems.length; i++) {
        var item = selectedItems[i];
        var oldName = item.name;
        var newName;
        
        // Apply find/replace if specified
        if (find && find.length > 0) {
          try {
            var regex = buildRegexFromUI(find) || new RegExp(find, 'g');
            newName = oldName.replace(regex, replace);
          } catch (e) {
            // If regex fails, do a plain string replacement
            newName = oldName.split(find).join(replace);
          }
        } else {
          // No find pattern, use replace text directly
          newName = replace;
        }
        
        // Process templates after find/replace
        // [N] - Current name
        if (newName === "[N]") {
          newName = oldName;
        } else if (newName.indexOf("[N]") !== -1) {
          newName = newName.replace(/\[N\]/g, oldName);
        }
        
        // Padded/default number tokens
        newName = replacePaddedNumberTokens(newName, i, selectedItems.length, parseInt(startNumber.text) || 1);
        
        // Comp-specific templates
        if (item instanceof CompItem) {
          if (newName.indexOf("[Res]") !== -1) {
            var resolution = item.width + "x" + item.height;
            newName = newName.replace(/\[Res\]/g, resolution);
          }
          
          if (newName.indexOf("[LenS]") !== -1) {
            var lengthSec = item.duration.toFixed(2) + "s";
            newName = newName.replace(/\[LenS\]/g, lengthSec);
          }
          
          if (newName.indexOf("[LenF]") !== -1) {
            var lengthFrames = Math.round(item.duration * item.frameRate) + "f";
            newName = newName.replace(/\[LenF\]/g, lengthFrames);
          }
          
          if (newName.indexOf("[AR]") !== -1) {
            var aspectRatio = calculateAspectRatio(item.width, item.height);
            newName = newName.replace(/\[AR\]/g, aspectRatio);
          }
          
          if (newName.indexOf("[FR]") !== -1) {
            var frameRate = item.frameRate.toFixed(2) + " fps";
            newName = newName.replace(/\[FR\]/g, frameRate);
          }
        }
        
        // [Date] - Current Date
        if (newName.indexOf("[Date]") !== -1) {
          var currentDate = formatDate(new Date());
          newName = newName.replace(/\[Date\]/g, currentDate);
        }
        
        if (oldName !== newName) {
          item.name = newName;
          renamedItems.push(item);
          count++;
        }
      }
      
      updateStatus("Renamed " + count + " project item(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function calculateAspectRatio(width, height) {
    function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    }
    
    var divisor = gcd(width, height);
    return (width / divisor) + ":" + (height / divisor);
  }
  
  function formatDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    
    return year + "-" + month + "-" + day;
  }
  
  function renameEffects(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Effects");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      
      function collectSelectedEffects(layer) {
        var result = [];
        
        if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
          var effectsGroup = layer.property("Effects");
          
          for (var i = 1; i <= effectsGroup.numProperties; i++) {
            var effect = effectsGroup.property(i);
            
            try {
              if (effect.selected) {
                result.push(effect);
                continue;
              }
            } catch (e) {}
            
            var hasSelectedProperty = false;
            try {
              for (var p = 1; p <= effect.numProperties; p++) {
                if (effect.property(p).selected) {
                  result.push(effect);
                  hasSelectedProperty = true;
                  break;
                }
              }
            } catch (e) {}
          }
        }
        
        return result;
      }
      
      var selectedEffects = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        var effects = collectSelectedEffects(selectedLayers[i]);
        selectedEffects = selectedEffects.concat(effects);
      }
      
      if (selectedEffects.length === 0 && detectActivePanel() === "effects" && selectedLayers.length > 0) {
        var layer = selectedLayers[0];
        if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
          for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
            selectedEffects.push(layer.property("Effects").property(i));
          }
        }
      }
      
      if (selectedEffects.length > 0) {
        for (var i = 0; i < selectedEffects.length; i++) {
          var effect = selectedEffects[i];
          var oldName = effect.name;
          var newName;
          
          // Apply find/replace if specified
          if (find && find.length > 0 && find !== "Match (optional)") {
            try {
              var regex = new RegExp(find, 'g');
              newName = oldName.replace(regex, replace);
            } catch (e) {
              // If regex fails, do a plain string replacement
              newName = oldName.split(find).join(replace);
            }
          } else {
            // No find pattern, use replace text directly
            newName = replace;
          }
          
          // Process templates after find/replace
          if (newName === "[N]") {
            newName = oldName;
          } else if (newName.indexOf("[N]") !== -1) {
            newName = newName.replace(/\[N\]/g, oldName);
          }
          
          // Padded/default number tokens for effects
          newName = replacePaddedNumberTokens(newName, i, selectedEffects.length, parseInt(startNumber.text) || 1);
          
          if (newName.indexOf("[ET]") !== -1) {
            var effectType = effect.matchName.split("_")[1] || effect.matchName;
            newName = newName.replace(/\[ET\]/g, effectType);
          }
          
          if (newName.indexOf("[En]") !== -1) {
            var enabledState = effect.enabled ? "On" : "Off";
            newName = newName.replace(/\[En\]/g, enabledState);
          }
          
          if (newName === "Rename to") {
            newName = oldName;
          }
          
          if (oldName !== newName) {
            try {
              effect.name = newName;
              count++;
            } catch (err) {
              showError("Effect Rename Error", "Error renaming effect '" + oldName + "'", err.toString());
            }
          }
        }
        
        updateStatus("Renamed " + count + " selected effect(s)");
        if (count === 0) {
          showError("No Effects Renamed", "No effects were renamed. Check your search/replace text.");
        }
      } else {
        updateStatus("No selected effects found.");
        showError("No Effects Selected", "No selected effects found. Please select effects in the Effect Controls panel.");
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function getSelectedEffects() {
    try {
      if (app.project.activeItem instanceof CompItem && 
          app.project.activeItem.selectedLayers.length === 1) {
          
        var layer = app.project.activeItem.selectedLayers[0];
        
        if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
          var allEffects = [];
          
          for (var i = 1; i <= layer.property("Effects").numProperties; i++) {
            allEffects.push(layer.property("Effects").property(i));
          }
          
          return allEffects;
        }
      }
      
      return null;
    } catch (e) {
      return null;
    }
  }
  
  function isEffectInList(effect, effectsList) {
    if (!effectsList) return true;
    
    for (var i = 0; i < effectsList.length; i++) {
      if (effectsList[i] === effect) {
        return true;
      }
    }
    
    return false;
  }
  
  function updateTextContent(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Update Text Content");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var updatedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        if (layer instanceof TextLayer) {
          var textProp = layer.property("Source Text");
          if (textProp) {
            var textDocument = textProp.value;
            var oldText = textDocument.text;
            var newText;
            
            // Apply find/replace if specified
            if (find && find.length > 0) {
              try {
                var regex = new RegExp(find, 'g');
                newText = oldText.replace(regex, replace);
              } catch (e) {
                // If regex fails, do a plain string replacement
                newText = oldText.split(find).join(replace);
              }
            } else {
              // No find pattern, use replace text directly
              newText = replace;
            }
            
            // Process templates after find/replace
            if (newText === "[N]") {
              newText = oldText;
            } else if (newText.indexOf("[N]") !== -1) {
              newText = newText.replace(/\[N\]/g, oldText);
            }
            
            if (newText.indexOf("[#↑]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + i);
              newText = newText.replace(/\[#↑\]/g, formattedNumber);
            }
            
            if (newText.indexOf("[#↓]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + (selectedLayers.length - i - 1));
              newText = newText.replace(/\[#↓\]/g, formattedNumber);
            }
            
            if (newText.indexOf("[Font]") !== -1) {
              try {
                var fontName = textDocument.font;
                newText = newText.replace(/\[Font\]/g, fontName);
              } catch (e) {
                newText = newText.replace(/\[Font\]/g, "Unknown");
              }
            }
            
            if (newText.indexOf("[Size]") !== -1) {
              try {
                var fontSize = textDocument.fontSize;
                newText = newText.replace(/\[Size\]/g, fontSize + "px");
              } catch (e) {
                newText = newText.replace(/\[Size\]/g, "Unknown");
              }
            }
            
            if (oldText !== newText) {
              textDocument.text = newText;
              textProp.setValue(textDocument);
              updatedLayers.push(layer);
              count++;
            }
          }
        }
      }
      
      // Highlight updated layers if any
      if (updatedLayers.length > 0) {
        highlightRenamedItems(updatedLayers);
      }
      
      updateStatus("Updated " + count + " text layer content(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameSelectedLayersFromFirstMarker() {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Layers From Marker");
      var comp = app.project.activeItem;
      var selectedLayers = comp.selectedLayers;
      var count = 0;
      var renamedLayers = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        try {
          if (layer.marker && layer.marker.numKeys > 0) {
            var firstMarker = layer.marker.keyValue(1);
            var comment = (firstMarker && firstMarker.comment) ? firstMarker.comment : "";
            if (comment !== "" && comment !== undefined && comment !== null) {
              if (layer.name !== comment) {
                layer.name = comment;
                renamedLayers.push(layer);
                count++;
              }
            }
          }
        } catch (e) {
          // Skip layers that cause errors
        }
      }
      
      if (renamedLayers.length > 0) {
        highlightRenamedItems(renamedLayers);
      } else {
        // Check if layers have markers at all
        var hasMarkersWithComments = false;
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          try {
            if (layer.marker && layer.marker.numKeys > 0) {
              var firstMarker = layer.marker.keyValue(1);
              var comment = (firstMarker && firstMarker.comment) ? firstMarker.comment : "";
              if (comment !== "" && comment !== undefined && comment !== null) {
                hasMarkersWithComments = true;
                break;
              }
            }
          } catch (e) {}
        }
        
        // Only show error if no markers found, not if already correctly named
        if (!hasMarkersWithComments) {
          showError("No Markers Found", "No marker comments found on selected layers.");
        }
      }
      
      updateStatus("Renamed " + count + " layer(s) from marker");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function updateMarkers(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Update Markers");
      var comp = app.project.activeItem;
      var selectedLayers = comp.selectedLayers;
      var count = 0;
      
      function processMarker(markerProperty, markerIndex, objIndex, totalObjs) {
        var marker = markerProperty.keyValue(markerIndex);
        var oldComment = marker.comment;
        var newComment = replace;
        
        if (replace === "[N]") {
          newComment = oldComment;
        } else if (replace.indexOf("[N]") !== -1) {
          newComment = replace.replace(/\[N\]/g, oldComment);
        }
        
        if (replace.indexOf("[#↑]") !== -1) {
          var startVal = parseInt(startNumber.text) || 1;
          var formattedNumber = formatNumber(startVal + objIndex);
          newComment = newComment.replace(/\[#↑\]/g, formattedNumber);
        }
        
        if (replace.indexOf("[#↓]") !== -1) {
          var startVal = parseInt(startNumber.text) || 1;
          var formattedNumber = formatNumber(startVal + (totalObjs - objIndex - 1));
          newComment = newComment.replace(/\[#↓\]/g, formattedNumber);
        }
        
        if (replace.indexOf("[Time]") !== -1) {
          var markerTime = markerProperty.keyTime(markerIndex);
          var timeStr = formatTime(markerTime, comp.frameRate);
          newComment = newComment.replace(/\[Time\]/g, timeStr);
        }
        
        if (replace.indexOf("[Dur]") !== -1) {
          var duration = marker.duration || 0;
          var durationStr = formatTime(duration, comp.frameRate);
          newComment = newComment.replace(/\[Dur\]/g, durationStr);
        }
        
        if (find && find.length > 0) {
          try {
            var regex = new RegExp(find, 'g');
            if (replace === newComment) {
              newComment = oldComment.replace(regex, replace);
            } else {
              var matches = oldComment.match(regex);
              if (matches && matches.length > 0) {
                newComment = newComment.replace(find, matches[0]);
              }
            }
          } catch (e) {
            if (replace === newComment) {
              newComment = oldComment.split(find).join(replace);
            }
          }
        }
        
        if (oldComment !== newComment) {
          marker.comment = newComment;
          markerProperty.setValueAtKey(markerIndex, marker);
          return true;
        }
        return false;
      }
      
      function formatTime(seconds, frameRate) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        var s = Math.floor(seconds % 60);
        var f = Math.floor((seconds % 1) * frameRate);
        
        if (h < 10) h = "0" + h;
        if (m < 10) m = "0" + m;
        if (s < 10) s = "0" + s;
        if (f < 10) f = "0" + f;
        
        return h + ":" + m + ":" + s + ":" + f;
      }
      
      if (comp.markerProperty) {
        for (var i = 1; i <= comp.markerProperty.numKeys; i++) {
          if (processMarker(comp.markerProperty, i, i-1, comp.markerProperty.numKeys)) {
            count++;
          }
        }
      }
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        if (layer.marker && layer.marker.numKeys > 0) {
          for (var j = 1; j <= layer.marker.numKeys; j++) {
            if (processMarker(layer.marker, j, j-1, layer.marker.numKeys)) {
              count++;
            }
          }
        }
      }
      
      updateStatus("Updated " + count + " marker(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function updateExpressions(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Update Expressions");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      
      function collectSelectedPropertiesWithExpressions(layer) {
        var result = [];
        
        function checkProperty(prop) {
          if (!prop) return;
          
          if (prop.propertyType === PropertyType.PROPERTY) {
            if (prop.selected && prop.canSetExpression && prop.expression && prop.expression !== "") {
              result.push(prop);
            }
          }
          else if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                  prop.propertyType === PropertyType.NAMED_GROUP) {
            for (var i = 1; i <= prop.numProperties; i++) {
              checkProperty(prop.property(i));
            }
          }
        }
        
        checkProperty(layer);
        return result;
      }
      
      var selectedPropertiesWithExpressions = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        var props = collectSelectedPropertiesWithExpressions(selectedLayers[i]);
        selectedPropertiesWithExpressions = selectedPropertiesWithExpressions.concat(props);
      }
      
      if (selectedPropertiesWithExpressions.length > 0) {
        for (var i = 0; i < selectedPropertiesWithExpressions.length; i++) {
          var prop = selectedPropertiesWithExpressions[i];
          var oldExpr = prop.expression;
          var newExpr = replace;
          var wasEnabled = prop.expressionEnabled;
          
          if (replace === "[N]") {
            newExpr = oldExpr;
          } else if (replace.indexOf("[N]") !== -1) {
            newExpr = replace.replace(/\[N\]/g, oldExpr);
          }
          
          if (replace.indexOf("[#↑]") !== -1) {
            var startVal = parseInt(startNumber.text) || 1;
            var formattedNumber = formatNumber(startVal + i);
            newExpr = newExpr.replace(/\[#↑\]/g, formattedNumber);
          }
          
          if (replace.indexOf("[#↓]") !== -1) {
            var startVal = parseInt(startNumber.text) || 1;
            var formattedNumber = formatNumber(startVal + (selectedPropertiesWithExpressions.length - i - 1));
            newExpr = newExpr.replace(/\[#↓\]/g, formattedNumber);
          }
          
          if (find && find.length > 0 && find !== "Match (optional)") {
            try {
              var regex = buildRegexFromUI(find) || new RegExp(find, 'g');
              if (replace === newExpr) {
                newExpr = oldExpr.replace(regex, replace);
              } else {
                var matches = oldExpr.match(regex);
                if (matches && matches.length > 0) {
                  newExpr = newExpr.replace(find, matches[0]);
                }
              }
            } catch (e) {
              if (replace === newExpr) {
                newExpr = oldExpr.split(find).join(replace);
              }
            }
          }
          
          if (oldExpr !== newExpr) {
            prop.expression = newExpr;
            prop.expressionEnabled = wasEnabled;
            count++;
          }
        }
        
        updateStatus("Updated " + count + " selected property expression(s)");
        if (count === 0) {
          showError("No Expressions Updated", "No expressions were updated. Check your search/replace text or ensure selected properties have expressions.");
        }
      } else {
        updateStatus("No selected properties with expressions found.");
        showError("No Expressions Found", "No selected properties with expressions found. Please select properties in the Timeline panel first.");
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameProperties(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Properties");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      
      function collectSelectedProperties(layer) {
        var result = [];
        
        function checkProperty(prop) {
          if (!prop) return;
          
          try {
            if (prop.selected && prop.name !== undefined) {
              result.push(prop);
            }
          } catch (e) {
            // Skip properties that can't be checked
          }
          
          if (prop.propertyType === PropertyType.INDEXED_GROUP || 
              prop.propertyType === PropertyType.NAMED_GROUP) {
            for (var i = 1; i <= prop.numProperties; i++) {
              checkProperty(prop.property(i));
            }
          }
        }
        
        checkProperty(layer);
        
        if (layer instanceof ShapeLayer && layer.property("Contents")) {
          checkProperty(layer.property("Contents"));
        }
        
        return result;
      }
      
      var selectedProperties = [];
      for (var i = 0; i < selectedLayers.length; i++) {
        var props = collectSelectedProperties(selectedLayers[i]);
        selectedProperties = selectedProperties.concat(props);
      }
      
      if (selectedProperties.length > 0) {
        for (var i = 0; i < selectedProperties.length; i++) {
          var prop = selectedProperties[i];
          
          try {
            var oldName = prop.name;
            var newName = replace;
            
            if (replace === "[N]") {
              newName = oldName;
            } else if (replace.indexOf("[N]") !== -1) {
              newName = replace.replace(/\[N\]/g, oldName);
            }
            
            if (replace.indexOf("[#↑]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + i);
              newName = newName.replace(/\[#↑\]/g, formattedNumber);
            }
            
            if (replace.indexOf("[#↓]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + (selectedProperties.length - i - 1));
              newName = newName.replace(/\[#↓\]/g, formattedNumber);
            }
            
            if (replace.indexOf("[Path]") !== -1) {
              var path = "";
              try {
                var current = prop;
                var pathParts = [];
                while (current && current.name) {
                  pathParts.unshift(current.name);
                  current = current.parentProperty;
                }
                path = pathParts.join("/");
              } catch (e) {
                path = "Unknown";
              }
              newName = newName.replace(/\[Path\]/g, path);
            }
            
            if (replace.indexOf("[Val]") !== -1 && prop.propertyType === PropertyType.PROPERTY) {
              var valueStr = "N/A";
              try {
                if (prop.value !== undefined) {
                  if (prop.value.length) {
                    valueStr = "[" + prop.value.join(", ") + "]";
                  } else {
                    valueStr = prop.value.toString();
                  }
                }
              } catch (e) {
                valueStr = "Error";
              }
              newName = newName.replace(/\[Val\]/g, valueStr);
            }
            
            if (find && find.length > 0 && find !== "Match (optional)") {
              try {
                var regex = buildRegexFromUI(find) || new RegExp(find, 'g');
                if (replace === newName) {
                  newName = oldName.replace(regex, replace);
                } else {
                  var matches = oldName.match(regex);
                  if (matches && matches.length > 0) {
                    newName = newName.replace(find, matches[0]);
                  }
                }
              } catch (e) {
                if (replace === newName) {
                  newName = oldName.split(find).join(replace);
                }
              }
            }
            
            if (oldName !== newName) {
              try {
                prop.name = newName;
                count++;
              } catch (err) {
                // Skip properties that can't be renamed
              }
            }
          } catch (e) {
            // Skip properties that caused errors
          }
        }
        
        updateStatus("Renamed " + count + " selected propert(ies)");
        if (count === 0) {
          showError("No Properties Renamed", "No properties were renamed. Make sure the selected properties allow renaming and check your search/replace text.");
        }
      } else {
        updateStatus("No selected properties found.");
        showError("No Properties Selected", "No selected properties found. Please select properties in the Timeline panel first.");
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameMasks(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Masks");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      
      function collectSelectedMasks(layer) {
        var result = [];
        
        if (layer.mask && layer.mask.numProperties > 0) {
          for (var j = 1; j <= layer.mask.numProperties; j++) {
            var mask = layer.mask.property(j);
            try {
              if (mask.selected) {
                result.push(mask);
              }
            } catch (e) {
              // If we can't check selection, skip
            }
          }
        }
        
        return result;
      }
      
      var selectedMasks = [];
      var hasSelectedMasks = false;
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var masks = collectSelectedMasks(selectedLayers[i]);
        if (masks.length > 0) {
          selectedMasks = selectedMasks.concat(masks);
          hasSelectedMasks = true;
        }
      }
      
      if (hasSelectedMasks) {
        for (var i = 0; i < selectedMasks.length; i++) {
          var mask = selectedMasks[i];
          var oldName = mask.name;
          var newName = replace;
          
          if (replace === "[N]") {
            newName = oldName;
          } else if (replace.indexOf("[N]") !== -1) {
            newName = replace.replace(/\[N\]/g, oldName);
          }
          
          if (replace.indexOf("[#↑]") !== -1) {
            var startVal = parseInt(startNumber.text) || 1;
            var formattedNumber = formatNumber(startVal + i);
            newName = newName.replace(/\[#↑\]/g, formattedNumber);
          }
          
          if (replace.indexOf("[#↓]") !== -1) {
            var startVal = parseInt(startNumber.text) || 1;
            var formattedNumber = formatNumber(startVal + (selectedMasks.length - i - 1));
            newName = newName.replace(/\[#↓\]/g, formattedNumber);
          }
          
          if (find && find.length > 0) {
            try {
              var regex = new RegExp(find, 'g');
              if (replace === newName) {
                newName = oldName.replace(regex, replace);
              } else {
                var matches = oldName.match(regex);
                if (matches && matches.length > 0) {
                  newName = newName.replace(find, matches[0]);
                }
              }
            } catch (e) {
              if (replace === newName) {
                newName = oldName.split(find).join(replace);
              }
            }
          }
          
          if (oldName !== newName) {
            mask.name = newName;
            count++;
          }
        }
      } else {
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          
          if (layer.mask && layer.mask.numProperties > 0) {
            for (var j = 1; j <= layer.mask.numProperties; j++) {
              var mask = layer.mask.property(j);
              var oldName = mask.name;
              var newName = replace;
              
              if (replace === "[N]") {
                newName = oldName;
              } else if (replace.indexOf("[N]") !== -1) {
                newName = replace.replace(/\[N\]/g, oldName);
              }
              
              if (replace.indexOf("[#↑]") !== -1) {
                var startVal = parseInt(startNumber.text) || 1;
                var formattedNumber = formatNumber(startVal + j - 1);
                newName = newName.replace(/\[#↑\]/g, formattedNumber);
              }
              
              if (replace.indexOf("[#↓]") !== -1) {
                var startVal = parseInt(startNumber.text) || 1;
                var formattedNumber = formatNumber(startVal + (layer.mask.numProperties - j));
                newName = newName.replace(/\[#↓\]/g, formattedNumber);
              }
              
              if (find && find.length > 0) {
                try {
                  var regex = new RegExp(find, 'g');
                  if (replace === newName) {
                    newName = oldName.replace(regex, replace);
                  } else {
                    var matches = oldName.match(regex);
                    if (matches && matches.length > 0) {
                      newName = newName.replace(find, matches[0]);
                    }
                  }
                } catch (e) {
                  if (replace === newName) {
                    newName = oldName.split(find).join(replace);
                  }
                }
              }
              
              if (oldName !== newName) {
                mask.name = newName;
                count++;
              }
            }
          }
        }
      }
      
      updateStatus("Renamed " + count + " mask(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renamePuppetPins(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Puppet Pins");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        function findAndRenamePuppetPins(prop, depth) {
          if (!prop) return 0;
          
          var localCount = 0;
          
          if (prop.matchName === "ADBE FreePin3 PosPin Atom" || 
              prop.name.indexOf("Puppet Pin") === 0) {
            
            var oldName = prop.name;
            var newName = replace;
            
            if (replace === "[N]") {
              newName = oldName;
            } else if (replace.indexOf("[N]") !== -1) {
              newName = replace.replace(/\[N\]/g, oldName);
            }
            
            if (replace.indexOf("[#↑]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + localCount);
              newName = newName.replace(/\[#↑\]/g, formattedNumber);
            }
            
            if (replace.indexOf("[#↓]") !== -1) {
              var startVal = parseInt(startNumber.text) || 1;
              var formattedNumber = formatNumber(startVal + localCount);
              newName = newName.replace(/\[#↓\]/g, formattedNumber);
            }
            
            if (find && find.length > 0) {
              try {
                var regex = new RegExp(find, 'g');
                if (replace === newName) {
                  newName = oldName.replace(regex, replace);
                } else {
                  var matches = oldName.match(regex);
                  if (matches && matches.length > 0) {
                    newName = newName.replace(find, matches[0]);
                  }
                }
              } catch (e) {
                if (replace === newName) {
                  newName = oldName.split(find).join(replace);
                }
              }
            }
            
            if (oldName !== newName) {
              try {
                prop.name = newName;
                localCount++;
                count++;
              } catch (e) {
                // Pin couldn't be renamed
              }
            }
          }
          
          if (prop.numProperties) {
            for (var j = 1; j <= prop.numProperties; j++) {
              try {
                localCount += findAndRenamePuppetPins(prop.property(j), depth + 1);
              } catch (e) {
                // Skip if we can't access this property
              }
            }
          }
          
          return localCount;
        }
        
        if (layer.property("Effects")) {
          for (var e = 1; e <= layer.property("Effects").numProperties; e++) {
            var effect = layer.property("Effects").property(e);
            
            if (effect.matchName === "ADBE FreePin3 ARAP Group" || 
                effect.matchName === "ADBE FreePin3 IK Group" || 
                effect.name.indexOf("Puppet") !== -1) {
              
              findAndRenamePuppetPins(effect, 0);
            }
          }
        }
        
        if (count === 0) {
          findAndRenamePuppetPins(layer, 0);
        }
      }
      
      updateStatus("Renamed " + count + " puppet pin(s)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameShapeProperties(find, replace) {
    if (!checkCompAndSelection()) return;
    
    try {
      app.beginUndoGroup("Rename Shape Properties");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var findProvided = find && find.length > 0 && find !== "Match (optional)";
      var hasAscToken = replace.indexOf("[#↑]") !== -1;
      var hasDescToken = replace.indexOf("[#↓]") !== -1;
      var useGlobalSeq = (typeof globalShapeNumberingCheck !== "undefined") && globalShapeNumberingCheck.value === true;
      var shouldGlobalNumber = useGlobalSeq && (hasAscToken || hasDescToken);
      var startValGlobal = parseInt(startNumber.text) || 1;
      var globalTotal = 0;
      var globalIndex = 0;
      
      function buildMatchResult(name) {
        var hasMatch = false;
        var matches = null;
        var regex = null;
        
        if (findProvided) {
          try {
            regex = (typeof buildRegexFromUI === "function" ? buildRegexFromUI(find) : null) || new RegExp(find, 'g');
            matches = name.match(regex);
            hasMatch = matches && matches.length > 0;
          } catch (e) {
            try {
              regex = new RegExp(find, 'g');
              matches = name.match(regex);
              hasMatch = matches && matches.length > 0;
            } catch (err) {
              hasMatch = false;
            }
          }
        }
        
        return {
          hasMatch: hasMatch,
          matches: matches,
          regex: regex
        };
      }
      
      function countNumberedProps(group) {
        for (var g = 1; g <= group.numProperties; g++) {
          var prop = group.property(g);
          var matchInfo = buildMatchResult(prop.name);
          var shouldNumber = (!findProvided) || matchInfo.hasMatch;
          
          if (shouldNumber) {
            globalTotal++;
          }
          
          if (prop.propertyType === PropertyType.INDEXED_GROUP || 
              prop.propertyType === PropertyType.NAMED_GROUP) {
            countNumberedProps(prop);
          }
        }
      }
      
      // Pre-count properties when global numbering is enabled so descending values are accurate
      if (shouldGlobalNumber) {
        for (var i = 0; i < selectedLayers.length; i++) {
          var layerForCount = selectedLayers[i];
          if (layerForCount instanceof ShapeLayer && layerForCount.property("Contents")) {
            countNumberedProps(layerForCount.property("Contents"));
          }
        }
      }
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        if (layer instanceof ShapeLayer) {
          var contents = layer.property("Contents");
          
          function processShapeGroup(group, groupIndex, totalGroups) {
            var groupCount = 0;
            
            for (var g = 1; g <= group.numProperties; g++) {
              var prop = group.property(g);
              var oldName = prop.name;
              var newName = replace;
              var matchInfo = buildMatchResult(oldName);
              var shouldNumber = (!findProvided) || matchInfo.hasMatch;
              
              if (replace === "[N]") {
                newName = oldName;
              } else if (replace.indexOf("[N]") !== -1) {
                newName = replace.replace(/\[N\]/g, oldName);
              }
              
              if (shouldGlobalNumber && shouldNumber) {
                if (hasAscToken) {
                  var formattedUp = formatNumber(startValGlobal + globalIndex);
                  newName = newName.replace(/\[#↑\]/g, formattedUp);
                }
                
                if (hasDescToken) {
                  var formattedDown = formatNumber(startValGlobal + (globalTotal - globalIndex - 1));
                  newName = newName.replace(/\[#↓\]/g, formattedDown);
                }
                
                globalIndex++;
              } else {
                if (hasAscToken) {
                  var startVal = parseInt(startNumber.text) || 1;
                  var formattedNumber = formatNumber(startVal + g - 1);
                  newName = newName.replace(/\[#↑\]/g, formattedNumber);
                }
                
                if (hasDescToken) {
                  var startValDesc = parseInt(startNumber.text) || 1;
                  var formattedNumberDesc = formatNumber(startValDesc + (group.numProperties - g));
                  newName = newName.replace(/\[#↓\]/g, formattedNumberDesc);
                }
              }
              
              if (findProvided) {
                if (matchInfo.hasMatch) {
                  try {
                    var regexToUse = matchInfo.regex || new RegExp(find, 'g');
                    if (replace === newName) {
                      newName = oldName.replace(regexToUse, replace);
                    } else if (matchInfo.matches && matchInfo.matches[0]) {
                      newName = newName.replace(find, matchInfo.matches[0]);
                    }
                  } catch (e) {
                    if (replace === newName) {
                      newName = oldName.split(find).join(replace);
                    }
                  }
                } else {
                  // No match: keep original name so this property is skipped
                  newName = oldName;
                }
              }
              
              if (oldName !== newName) {
                try {
                  prop.name = newName;
                  groupCount++;
                } catch (e) {
                  // Property cannot be renamed
                }
              }
              
              if (prop.propertyType === PropertyType.INDEXED_GROUP || 
                  prop.propertyType === PropertyType.NAMED_GROUP) {
                groupCount += processShapeGroup(prop, g-1, group.numProperties);
              }
            }
            
            return groupCount;
          }
          
          count += processShapeGroup(contents, 0, 1);
        }
      }
      
      updateStatus("Renamed " + count + " shape propert(ies)");
    } catch (e) {
      updateStatus("Error: " + e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  function renameSourceComp(find, replace, returnCount) {
    if (!checkCompAndSelection()) return 0;
    
    try {
      if (!returnCount) app.beginUndoGroup("Rename Comp Sources");
      var selectedLayers = app.project.activeItem.selectedLayers;
      var count = 0;
      var renamedComps = [];
      
      for (var i = 0; i < selectedLayers.length; i++) {
        var layer = selectedLayers[i];
        
        if (layer instanceof AVLayer && layer.source instanceof CompItem) {
          var precomp = layer.source;
          var oldName = precomp.name;
          var newName = replace;
          
          if (replace === "[N]") {
            newName = oldName;
          } else if (replace.indexOf("[N]") !== -1) {
            newName = replace.replace(/\[N\]/g, oldName);
          }
          
          if (replace.indexOf("[#↑]") !== -1) {
            var startVal = parseInt(startNumber.text) || 1;
            var formattedNumber = formatNumber(startVal + i);
            newName = newName.replace(/\[#↑\]/g, formattedNumber);
          }
          
          if (replace.indexOf("[#↓]") !== -1) {
            var startVal = parseInt(startNumber.text) || 1;
            var formattedNumber = formatNumber(startVal + (selectedLayers.length - i - 1));
            newName = newName.replace(/\[#↓\]/g, formattedNumber);
          }
          
          // Add support for comp resolution and length templates
          if (precomp instanceof CompItem) {
            if (newName.indexOf("[Res]") !== -1) {
              var resolution = precomp.width + "x" + precomp.height;
              newName = newName.replace(/\[Res\]/g, resolution);
            }
            
            if (newName.indexOf("[LenS]") !== -1) {
              var lengthSec = precomp.duration.toFixed(2) + "s";
              newName = newName.replace(/\[LenS\]/g, lengthSec);
            }
            
            if (newName.indexOf("[LenF]") !== -1) {
              var lengthFrames = Math.round(precomp.duration * precomp.frameRate) + "f";
              newName = newName.replace(/\[LenF\]/g, lengthFrames);
            }
            
            if (newName.indexOf("[FR]") !== -1) {
              var frameRate = precomp.frameRate.toFixed(2) + "fps";
              newName = newName.replace(/\[FR\]/g, frameRate);
            }
          }
          
          if (find && find.length > 0) {
            try {
              var regex = new RegExp(find, 'g');
              if (replace === newName) {
                newName = oldName.replace(regex, replace);
              } else {
                var matches = oldName.match(regex);
                if (matches && matches.length > 0) {
                  newName = newName.replace(find, matches[0]);
                }
              }
            } catch (e) {
              if (replace === newName) {
                newName = oldName.split(find).join(replace);
              }
            }
          }
          
          if (oldName !== newName) {
            if (!returnCount) precomp.name = newName;
            renamedComps.push(precomp);
            count++;
          }
        }
      }
      
      if (!returnCount) {
        updateStatus("Renamed " + count + " comp source(s)");
        if (renamedComps.length > 0) {
          highlightRenamedItems(renamedComps);
        }
      }
      
      return count;
    } catch (e) {
      if (!returnCount) updateStatus("Error: " + e.toString());
      return 0;
    } finally {
      if (!returnCount) app.endUndoGroup();
    }
  }
  
  function renameAll(find, replace) {
    try {
      app.beginUndoGroup("Rename All");
      
      var totalCount = 0;
      var results = {};
      var modifiedItems = [];
      
      if (checkCompAndSelection()) {
        // Apply to all timeline items first
        var layers = app.project.activeItem.selectedLayers;
        var hasTemplateCodes = /\[([A-Za-z0-9↑↓]+)\]/g.test(replace);
        
        // For each selected layer, apply appropriate renames
        for (var i = 0; i < layers.length; i++) {
          var layer = layers[i];
          var oldName = layer.name;
          var newName;
          
          // Process layer name
          if (hasTemplateCodes) {
            newName = processNameTemplate(replace, oldName, i, layers.length);
          } else if (find && find.length > 0) {
            try {
              var regex = new RegExp(find, 'g');
              newName = oldName.replace(regex, replace);
            } catch (e) {
              newName = oldName.split(find).join(replace);
            }
          } else {
            newName = replace;
          }
          
          if (oldName !== newName) {
            layer.name = newName;
            modifiedItems.push(layer);
            totalCount++;
            if (!results.layers) results.layers = 0;
            results.layers++;
          }
          
          // Process text content if it's a text layer
          if (layer instanceof TextLayer) {
            var textProp = layer.property("Source Text");
            if (textProp) {
              var textDoc = textProp.value;
              var oldText = textDoc.text;
              var newText;
              
              if (find && find.length > 0) {
                try {
                  var regex = new RegExp(find, 'g');
                  newText = oldText.replace(regex, replace);
                } catch (e) {
                  newText = oldText.split(find).join(replace);
                }
              } else {
                newText = replace;
              }
              
              if (oldText !== newText) {
                textDoc.text = newText;
                textProp.setValue(textDoc);
                if (!results.text) results.text = 0;
                results.text++;
                totalCount++;
              }
            }
          }
          
          // Process effects
          if (layer.property("Effects") && layer.property("Effects").numProperties > 0) {
            for (var e = 1; e <= layer.property("Effects").numProperties; e++) {
              var effect = layer.property("Effects").property(e);
              var oldEffectName = effect.name;
              var newEffectName;
              
              if (find && find.length > 0) {
                try {
                  var regex = new RegExp(find, 'g');
                  newEffectName = oldEffectName.replace(regex, replace);
                } catch (e) {
                  newEffectName = oldEffectName.split(find).join(replace);
                }
              } else {
                newEffectName = replace;
              }
              
              if (oldEffectName !== newEffectName) {
                effect.name = newEffectName;
                if (!results.effects) results.effects = 0;
                results.effects++;
                totalCount++;
              }
            }
          }
        }
        
        // Process comp markers
        var comp = app.project.activeItem;
        if (comp.markerProperty && comp.markerProperty.numKeys > 0) {
          for (var i = 1; i <= comp.markerProperty.numKeys; i++) {
            var marker = comp.markerProperty.keyValue(i);
            var oldComment = marker.comment;
            var newComment;
            
            if (find && find.length > 0) {
              try {
                var regex = new RegExp(find, 'g');
                newComment = oldComment.replace(regex, replace);
              } catch (e) {
                newComment = oldComment.split(find).join(replace);
              }
            } else {
              newComment = replace;
            }
            
            if (oldComment !== newComment) {
              marker.comment = newComment;
              comp.markerProperty.setValueAtKey(i, marker);
              if (!results.markers) results.markers = 0;
              results.markers++;
              totalCount++;
            }
          }
        }
        
        // Call specialized functions for other types
        var expressionCount = updateExpressions(find, replace, true);
        if (expressionCount) {
          results.expressions = expressionCount;
          totalCount += expressionCount;
        }
        
        var propCount = renameProperties(find, replace, true);
        if (propCount) {
          results.properties = propCount;
          totalCount += propCount;
        }
        
        var maskCount = renameMasks(find, replace, true);
        if (maskCount) {
          results.masks = maskCount;
          totalCount += maskCount;
        }
        
        var pinCount = renamePuppetPins(find, replace, true);
        if (pinCount) {
          results.pins = pinCount;
          totalCount += pinCount;
        }
        
        var compCount = renameSourceComp(find, replace, true);
        if (compCount) {
          results.comps = compCount;
          totalCount += compCount;
        }
      }
      
      // Process project items
      if (app.project.selection.length > 0) {
        var projectItems = app.project.selection;
        for (var i = 0; i < projectItems.length; i++) {
          var item = projectItems[i];
          var oldName = item.name;
          var newName;
          
          if (find && find.length > 0) {
            try {
              var regex = new RegExp(find, 'g');
              newName = oldName.replace(regex, replace);
            } catch (e) {
              newName = oldName.split(find).join(replace);
            }
          } else {
            newName = replace;
          }
          
          // Process comp-specific templates
          if (item instanceof CompItem) {
            if (newName.indexOf("[Res]") !== -1) {
              var resolution = item.width + "x" + item.height;
              newName = newName.replace(/\[Res\]/g, resolution);
            }
            
            if (newName.indexOf("[LenS]") !== -1) {
              var lengthSec = item.duration.toFixed(2) + "s";
              newName = newName.replace(/\[LenS\]/g, lengthSec);
            }
            
            if (newName.indexOf("[LenF]") !== -1) {
              var lengthFrames = Math.round(item.duration * item.frameRate) + "f";
              newName = newName.replace(/\[LenF\]/g, lengthFrames);
            }
            
            if (newName.indexOf("[AR]") !== -1) {
              var aspectRatio = calculateAspectRatio(item.width, item.height);
              newName = newName.replace(/\[AR\]/g, aspectRatio);
            }
            
            if (newName.indexOf("[FR]") !== -1) {
              var frameRate = item.frameRate.toFixed(2) + " fps";
              newName = newName.replace(/\[FR\]/g, frameRate);
            }
          }
          
          if (oldName !== newName) {
            item.name = newName;
            modifiedItems.push(item);
            if (!results.items) results.items = 0;
            results.items++;
            totalCount++;
          }
        }
      }
      
      // Build detailed status message
      var statusMsg = "Renamed " + totalCount + " item(s): ";
      var details = [];
      
      if (results.layers) details.push(results.layers + " layer(s)");
      if (results.effects) details.push(results.effects + " effect(s)");
      if (results.text) details.push(results.text + " text content(s)");
      if (results.markers) details.push(results.markers + " marker(s)");
      if (results.expressions) details.push(results.expressions + " expression(s)");
      if (results.properties) details.push(results.properties + " property(s)");
      if (results.masks) details.push(results.masks + " mask(s)");
      if (results.pins) details.push(results.pins + " pin(s)");
      if (results.comps) details.push(results.comps + " comp source(s)");
      if (results.items) details.push(results.items + " project item(s)");
      
      statusMsg += details.join(", ");
      updateStatus(statusMsg);
      
      // Show a summary dialog for large operations
      if (totalCount > 10) {
        alert("Renamed " + totalCount + " items across " + Object.keys(results).length + " different types.\n" +
              "See the script panel for details.");
      }
      
      // Highlight renamed items if appropriate
      if (modifiedItems.length > 0 && modifiedItems.length <= 10) {
        highlightRenamedItems(modifiedItems);
      }
    } catch (e) {
      updateStatus("Error: " + e.toString());
      showError("Rename Error", "An error occurred during renaming.", e.toString());
    } finally {
      app.endUndoGroup();
    }
  }
  
  // Add keyboard shortcuts
  function registerKeyboardShortcuts() {
    // Add keyboard shortcuts (Cmd/Ctrl+Enter to apply)
    win.addEventListener("keydown", function(e) {
      // If Cmd/Ctrl+Enter is pressed
      if ((e.metaKey || e.ctrlKey) && e.keyCode == 13) {
        renameBtn.notify("onClick");
        e.preventDefault();
        return false;
      }
    });
    
    // Tab order adjustment
    findText.addEventListener("keydown", function(e) {
      if (e.keyCode == 9 && !e.shiftKey) { // Tab key without Shift
        renameText.active = true;
        e.preventDefault();
        return false;
      }
    });
    
    renameText.addEventListener("keydown", function(e) {
      if (e.keyCode == 9 && e.shiftKey) { // Shift+Tab
        findText.active = true;
        e.preventDefault();
        return false;
      } else if (e.keyCode == 13) { // Enter key
        renameBtn.notify("onClick");
        e.preventDefault();
        return false;
      }
    });
  }
  
  // No help menu function
  
  // No case conversion buttons
  
  // Set up preview updates when text changes
  renameText.onChanging = function() {
    updatePreview();
  };
  
  findText.onChanging = function() {
    updatePreview();
  };
  
  startNumber.onChanging = function() {
    updatePreview();
  };
  
  // Register keyboard shortcuts
  registerKeyboardShortcuts();
  
  // Initialize the UI
  updatePreview();
  
  function checkSelection() {
    if (app.project && app.project.activeItem instanceof CompItem) {
      var layers = app.project.activeItem.selectedLayers;
      win.text = scriptName + " v" + scriptVersion + " (" + layers.length + " layers)";
    } else {
      win.text = scriptName + " v" + scriptVersion;
    }
    
    checkForSelectionChanges();
  }
  
  // Start periodic checking
  app.scheduleTask(checkForSelectionChanges, 200, false);
  
  // Set default button
  win.defaultElement = renameBtn;
  
  // Initialize context detection
  updateTargetBasedOnContext();
  
  // Activation handler
  win.onActivate = function() {
    if (autoDetectCheck.value) {
      updateTargetBasedOnContext();
    }
    // Refresh preview when window is activated to reflect any selection changes
    updatePreview();
  };
  
  // Auto-detect checkbox handler
  autoDetectCheck.onClick = function() {
    targetDropdown.enabled = !this.value;
    
    if (this.value) {
      updateTargetBasedOnContext();
    }
    // Refresh preview when toggling auto-detect to reflect any selection changes
    updatePreview();
  };
  
  // Show the window
  win.center();
  win.show();
})();