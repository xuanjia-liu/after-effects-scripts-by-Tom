(function createShapeUI() {
    var win = new Window("palette", "Shape Creator", undefined);
    win.orientation = "column";

    // Dropdown for shape selection
    var shapeGroup = win.add("group");
    shapeGroup.add("statictext", undefined, "Shape:");
    var shapeDropdown = shapeGroup.add("dropdownlist", undefined, ["Polygon", "Star", "Rectangle", "Ellipse"]);
    shapeDropdown.selection = 0;

    var createButton = win.add("button", undefined, "Create Shape");

    createButton.onClick = function () {
        app.beginUndoGroup("Create Shape");

        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition.");
            return;
        }

        var shapeType = shapeDropdown.selection.text;
        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = shapeType;

        var contents = shapeLayer.property("Contents");
        var shapeGroup = contents.addProperty("ADBE Vector Group");
        
        // Create the shape path
        var shapePath;
        if (shapeType === "Polygon") {
            shapePath = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
            shapePath.property("Type").setValue(2); // Polygon Mode
            shapePath.property("Points").setValue(5);
            shapePath.property("Outer Radius").setValue(100);
            shapePath.property("Outer Roundness").setValue(0);
            shapePath.property("Rotation").setValue(0);
        } else if (shapeType === "Star") {
            shapePath = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Star");
            shapePath.property("Type").setValue(1); // Star Mode
            shapePath.property("Points").setValue(5);
            shapePath.property("Outer Radius").setValue(100);
            shapePath.property("Inner Radius").setValue(50);
            shapePath.property("Outer Roundness").setValue(0);
            shapePath.property("Inner Roundness").setValue(0);
            shapePath.property("Rotation").setValue(0);
        } else if (shapeType === "Rectangle") {
            shapePath = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Rect");
            shapePath.property("Size").setValue([200, 100]);
            shapePath.property("Roundness").setValue(0);
        } else if (shapeType === "Ellipse") {
            shapePath = shapeGroup.property("Contents").addProperty("ADBE Vector Shape - Ellipse");
            shapePath.property("Size").setValue([150, 150]);
        }

        // Add Effect Controls
        var effects = shapeLayer.property("Effects");

        function addSlider(name, defaultValue) {
            var slider = effects.addProperty("ADBE Slider Control");
            slider.name = name;
            slider.property(1).setValue(defaultValue);
            return slider;
        }

        function addAngle(name, defaultValue) {
            var angle = effects.addProperty("ADBE Angle Control");
            angle.name = name;
            angle.property(1).setValue(defaultValue);
            return angle;
        }

        // Add controls based on shape type
        if (shapeType === "Polygon") {
            var sidesEffect = addSlider("Sides", 5);
            var radiusEffect = addSlider("Radius", 100);
            var roundnessEffect = addSlider("Roundness", 0);
            var rotationEffect = addAngle("Rotation", 0);

            shapePath.property("Points").expression = "Math.max(3, effect('Sides')('Slider'))";
            shapePath.property("Outer Radius").expression = "effect('Radius')('Slider')";
            shapePath.property("Outer Roundness").expression = "effect('Roundness')('Slider')";
            shapePath.property("Rotation").expression = "effect('Rotation')('Angle')";
        } else if (shapeType === "Star") {
            var pointsEffect = addSlider("Points", 5);
            var outerRadiusEffect = addSlider("Outer Radius", 100);
            var innerRadiusEffect = addSlider("Inner Radius", 50);
            var outerRoundnessEffect = addSlider("Outer Roundness", 0);
            var innerRoundnessEffect = addSlider("Inner Roundness", 0);
            var rotationEffect = addAngle("Rotation", 0);

            shapePath.property("Points").expression = "Math.max(3, effect('Points')('Slider'))";
            shapePath.property("Outer Radius").expression = "effect('Outer Radius')('Slider')";
            shapePath.property("Inner Radius").expression = "effect('Inner Radius')('Slider')";
            shapePath.property("Outer Roundness").expression = "effect('Outer Roundness')('Slider')";
            shapePath.property("Inner Roundness").expression = "effect('Inner Roundness')('Slider')";
            shapePath.property("Rotation").expression = "effect('Rotation')('Angle')";
        } else if (shapeType === "Rectangle") {
            var widthEffect = addSlider("Width", 200);
            var heightEffect = addSlider("Height", 100);
            var roundnessEffect = addSlider("Roundness", 0);

            shapePath.property("Size").expression = "[effect('Width')('Slider'), effect('Height')('Slider')]";
            shapePath.property("Roundness").expression = "effect('Roundness')('Slider')";
        } else if (shapeType === "Ellipse") {
            var widthEffect = addSlider("Width", 150);
            var heightEffect = addSlider("Height", 150);

            shapePath.property("Size").expression = "[effect('Width')('Slider'), effect('Height')('Slider')]";
        }

        app.endUndoGroup();
    };

    win.center();
    win.show();
})();