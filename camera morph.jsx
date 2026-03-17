// == Global Variables ==
var scriptVersion = "1.0";
var scriptName = "Camera Morph Studio";
var mainPanel;
var targetCompDropdown;
var pathLayerDropdown;
var cameraList;
var morphTimeSlider;
var easingDropdown;
var createUpdateButton;
var path;
var selectedCameras = [];
var allCameras = [];
var targetComp;

var morphParameters = {
  position: false,
  rotation: false,
  zoom: false,
};

var checkBoxes = [];

// == Helper Functions ==

function findCamera(name, cameras) {
  for (var i = 0; i < cameras.length; i++) {
    if (cameras[i].name == name) {
      return cameras[i];
    }
  }
  return undefined;
}

function findLayerByName(layerName, layerList) {
  for (var i = 0; i < layerList.length; i++) {
    if (layerList[i].name == layerName) {
      return layerList[i];
    }
  }
  return undefined;
}

// == UI Creation ==
function createUI() {
  if (this instanceof Panel) {
    mainPanel = this;
  } else {
    mainPanel = new Window("palette", scriptName, undefined, { resizeable: true });
  }

  mainPanel.orientation = "column";
  mainPanel.alignChildren = "fill";
  mainPanel.spacing = 10;
  mainPanel.margins = 10;

  // Target Comp Section
  var targetCompGroup = mainPanel.add("group");
  targetCompGroup.orientation = "row";
  targetCompGroup.add("statictext", undefined, "Target Comp:");
  targetCompDropdown = targetCompGroup.add("dropdownlist");

  // Populate target comp dropdown
  var comps = app.project.items;
  for (var i = 1; i <= comps.length; i++) {
    if (comps[i] instanceof CompItem) {
      targetCompDropdown.add("item", comps[i].name);
    }
  }
  targetCompDropdown.onChange = updateComp;

  // Path Section
  var pathGroup = mainPanel.add("group");
  pathGroup.orientation = "row";
  pathGroup.alignChildren = "left";
  pathGroup.add("statictext", undefined, "Path Layer:");

  pathLayerDropdown = pathGroup.add("dropdownlist");

  var pathButtonsGroup = mainPanel.add("group");
  pathButtonsGroup.orientation = "row";
  pathButtonsGroup.alignChildren = "left";

  var createPathButton = pathButtonsGroup.add("button", undefined, "Create Path");
  createPathButton.onClick = createPath;

  var resetPathButton = pathButtonsGroup.add("button", undefined, "Reset Path");
  resetPathButton.onClick = resetPath;

  // Camera Section
  var cameraGroup = mainPanel.add("group");
  cameraGroup.orientation = "column";
  var cameraLabel = cameraGroup.add("statictext", undefined, "Cameras:");
  cameraLabel.alignment = "left";
  cameraList = cameraGroup.add("listbox", undefined, undefined, {
    numberOfColumns: 1,
    showHeaders: false,
    columnTitles: ["Camera Name"],
    preferredSize: [250, 100],
  });

  var cameraButtons = cameraGroup.add("group");
  cameraButtons.orientation = "row";

  var addCameraButton = cameraButtons.add("button", undefined, "Add Camera");
  addCameraButton.onClick = addCamera;
  var removeCameraButton = cameraButtons.add("button", undefined, "Remove Camera");
  removeCameraButton.onClick = removeCamera;

  // Morph Parameters
  var morphGroup = mainPanel.add("group");
  morphGroup.orientation = "column";
  morphGroup.add("statictext", undefined, "Morph Parameters:");

  var positionCheckBox = morphGroup.add("checkbox", undefined, "Position");
  checkBoxes.push(positionCheckBox);
  positionCheckBox.onClick = changeMorphParam;

  var rotationCheckBox = morphGroup.add("checkbox", undefined, "Rotation");
  checkBoxes.push(rotationCheckBox);
  rotationCheckBox.onClick = changeMorphParam;

  var zoomCheckBox = morphGroup.add("checkbox", undefined, "Zoom");
  checkBoxes.push(zoomCheckBox);
  zoomCheckBox.onClick = changeMorphParam;

  // Settings
  var settingsGroup = mainPanel.add("group");
  settingsGroup.orientation = "column";

  var morphTimeGroup = settingsGroup.add("group");
  morphTimeGroup.orientation = "row";
  morphTimeGroup.add("statictext", undefined, "Morph Time (s):");
  morphTimeSlider = morphTimeGroup.add("slider", undefined, 5, 1, 10);
  morphTimeSlider.preferredSize = [100, 20];

  var easingGroup = settingsGroup.add("group");
  easingGroup.orientation = "row";
  easingGroup.add("statictext", undefined, "Easing:");
  easingDropdown = easingGroup.add("dropdownlist", undefined, [
    "Linear",
    "Ease In",
    "Ease Out",
    "Ease In Out",
  ]);

  // Create/Update Button
  createUpdateButton = mainPanel.add("button", undefined, "Create/Update Rig");
  createUpdateButton.onClick = createUpdateRig;

  // Preview & Playback  // -- TODO: Add later
  // mainPanel.add("button", undefined, "Preview");
  // mainPanel.add("button", undefined, "Play");

  // Update the UI
  updateComp();

  // Show the main panel
  mainPanel.show();
}

// == UI Event Handlers ==

function updateComp() {
  if (targetCompDropdown.selection != null) {
    var selectedCompName = targetCompDropdown.selection.text;
    var comps = app.project.items;
    for (var i = 1; i <= comps.length; i++) {
      if (comps[i] instanceof CompItem && comps[i].name == selectedCompName) {
        targetComp = comps[i];
        break;
      }
    }
  }

  if (targetComp != null) {
    updateCameraDropdown();
    updatePathDropdown();
  } else {
    alert("Please select a composition");
  }
}

function updatePathDropdown() {
  pathLayerDropdown.removeAll();
  if (targetComp == null) {
    return;
  }

  var layers = targetComp.layers;
  for (var i = 1; i <= layers.length; i++) {
    if (layers[i].name.toLowerCase().indexOf("path") > -1) {
      pathLayerDropdown.add("item", layers[i].name);
    }
  }

  if (pathLayerDropdown.items.length > 0) {
    pathLayerDropdown.selection = 0;
    path = findLayerByName(pathLayerDropdown.items[0].text, targetComp.layers);
  } else {
    path = null;
  }
}

function updateCameraDropdown() {
  cameraList.removeAll();
  selectedCameras = [];
  if (targetComp == null) {
    return;
  }

  var cameras = [];
  allCameras = [];
  var layers = targetComp.layers;
  for (var i = 1; i <= layers.length; i++) {
    if (layers[i] instanceof CameraLayer) {
      cameras.push(layers[i]);
      allCameras.push(layers[i]);
      cameraList.add("item", layers[i].name);
    }
  }
}

function createPath() {
  if (targetComp == null) {
    alert("Please select a composition");
    return;
  }
  var newLayer = targetComp.layers.addNull();
  newLayer.name = "CameraPath";
  updatePathDropdown();
}

function resetPath() {
  if (path == null) {
    alert("Please select a path layer or create a path layer");
    return;
  }
  path.remove();
  updatePathDropdown();
}

function addCamera() {
  if (targetComp == null) {
    alert("Please select a composition");
    return;
  }
  var cameraName = prompt("Enter camera name", "Camera");
  if (cameraName == null) return;

  var layers = targetComp.layers;
  var cam = findCamera(cameraName, allCameras);
  if (cam) {
    cameraList.add("item", cam.name);
    selectedCameras.push(cam);
  }
}

function removeCamera() {
  var selection = cameraList.selection;
  if (selection == null) {
    alert("Please select a camera");
    return;
  }
  var selIndex = cameraList.selection.index;
  if (selIndex == -1) return;
  var camName = cameraList.items[selIndex].text;
  var cam = findCamera(camName, selectedCameras);
  if (cam != undefined) {
    selectedCameras = selectedCameras.filter(function (item) {
      return item !== cam;
    });

    cameraList.remove(selIndex);
  }
}

function changeMorphParam() {
  morphParameters.position = checkBoxes[0].value;
  morphParameters.rotation = checkBoxes[1].value;
  morphParameters.zoom = checkBoxes[2].value;
}

function createUpdateRig() {
  if (targetComp == null) {
    alert("Please select a composition");
    return;
  }

  if (path == null) {
    alert("Please select a path layer or create a path layer");
    return;
  }

  if (selectedCameras.length < 2) {
    alert("Please select at least 2 cameras");
    return;
  }

  var morphTime = morphTimeSlider.value;
  var easingType = easingDropdown.selection.text;
  var comp = app.project.activeItem;
  var morphLayer = targetComp.layers.addNull();
  morphLayer.name = "CameraMorph_Rig";

  var camRig = targetComp.layers.addCamera();
  camRig.name = "Main Camera";
  camRig.parent = morphLayer;

  // --- Expression Generation ---

  // 1. Time Normalization and Easing
  var exp_str = "morph_time = " + morphTime + ";\n";
  exp_str += "t = time / morph_time;\n";
  exp_str += "t = Math.max(0, Math.min(1, t));\n"; // Clamp to 0-1

  if (easingType == "Ease In") {
    exp_str += "t = t * t;\n";
  } else if (easingType == "Ease Out") {
    exp_str += "t = 1 - (1 - t) * (1 - t);\n";
  } else if (easingType == "Ease In Out") {
    exp_str += "t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;\n";
  }

  // 2. Get path position
  exp_str += "p = thisComp.layer(\"" + path.name + "\").transform.position;\n";
  exp_str += "pos = valueAtTime(time);\n";

  // 3. Linear Interpolation Helper Function
  function linearInterpolate(prop) {
    var interpolated_str = "linear(t, 0, 1";
    for (var i = 0; i < selectedCameras.length; i++) {
      interpolated_str +=
        ", thisComp.layer(\"" + selectedCameras[i].name + "\").transform." + prop;
    }
    interpolated_str += ")";
    return interpolated_str;
  }

  // 4. Morph Position
  var pos_x_interpolation = linearInterpolate("position[0]");
  var pos_y_interpolation = linearInterpolate("position[1]");
  var pos_z_interpolation = linearInterpolate("position[2]");

  exp_str += "pos[0] = " + pos_x_interpolation + "[0];\n";
  exp_str += "pos[1] = " + pos_y_interpolation + "[1];\n";
  exp_str += "pos[2] = " + pos_z_interpolation + "[2];\n";

  exp_str += "p + pos;";

  // Apply expression to the position of the null
  morphLayer.transform.position.expression = exp_str;

  // Apply position to the main camera
  if (morphParameters.position) {
    camRig.transform.position.expression =
      "p = thisComp.layer(\"" + morphLayer.name + "\").transform.position; p;";
  }

  // Morph Rotation
  if (morphParameters.rotation) {
    var exp_rotation_str = "morph_time = " + morphTime + ";\n";
    exp_rotation_str += "t = time / morph_time;\n";
    exp_rotation_str += "t = Math.max(0, Math.min(1, t));\n";

    if (easingType == "Ease In") {
      exp_rotation_str += "t = t * t;\n";
    } else if (easingType == "Ease Out") {
      exp_rotation_str += "t = 1 - (1 - t) * (1 - t);\n";
    } else if (easingType == "Ease In Out") {
      exp_rotation_str +=
        "t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;\n";
    }

    var rotation_interpolation = linearInterpolate("rotation");
    exp_rotation_str += "rotate = " + rotation_interpolation + ";\n";
    exp_rotation_str += "rotate;";
    camRig.transform.rotation.expression = exp_rotation_str;
  }

  // Morph Zoom
  if (morphParameters.zoom) {
    var exp_zoom_str = "morph_time = " + morphTime + ";\n";
    exp_zoom_str += "t = time / morph_time;\n";
    exp_zoom_str += "t = Math.max(0, Math.min(1, t));\n";

    if (easingType == "Ease In") {
      exp_zoom_str += "t = t * t;\n";
    } else if (easingType == "Ease Out") {
      exp_zoom_str += "t = 1 - (1 - t) * (1 - t);\n";
    } else if (easingType == "Ease In Out") {
      exp_zoom_str +=
        "t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;\n";
    }

    function linearInterpolateZoom() {
      var interpolated_str = "linear(t, 0, 1";
      for (var i = 0; i < selectedCameras.length; i++) {
        interpolated_str +=
          ", thisComp.layer(\"" +
          selectedCameras[i].name +
          "\").cameraOption.zoom";
      }
      interpolated_str += ")";
      return interpolated_str;
    }

    var zoom_interpolation = linearInterpolateZoom();
    exp_zoom_str += "zoom = " + zoom_interpolation + ";\n";
    exp_zoom_str += "zoom;";
    camRig.cameraOption.zoom.expression = exp_zoom_str;
  }
  alert("Rig Created Successfully");
}

// == Main Script Execution ==
createUI();