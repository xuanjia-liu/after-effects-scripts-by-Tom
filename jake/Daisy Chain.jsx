/*
╔╦╗╔═╗╦╔═╗╦ ╦  ╔═╗╦ ╦╔═╗╦╔╗╔
 ║║╠═╣║╚═╗╚╦╝  ║  ╠═╣╠═╣║║║║
═╩╝╩ ╩╩╚═╝ ╩   ╚═╝╩ ╩╩ ╩╩╝╚╝

Daisy Chain v1.0.0
Creates FK parent chains from layers, path points, or puppet pins.

- Layers: Parents selected layers in selection order
- Path Points: Creates null chain controlling path vertices
- Puppet Pins: Creates null chain controlling pin positions

Author:   Jake Bartlett (Jake In Motion LLC)
Website:  https://jakeinmotion.com/daisy-chain
License:  Free for personal/commercial use. No redistribution.
          https://jakeinmotion.com/license
*/

(function(thisObj) {

    //========================
    // CONFIGURATION
    //========================

    var CONFIG = {
        name: "Daisy Chain",
        version: "v1.0.0",
        author: "Jake In Motion",
        year: 2025,
        urls: {
            website: "https://jakeinmotion.com/daisy-chain",
            codeRunner: "https://jakeinmotion.com/code-runner",
            kbar: "https://aescripts.com/kbar"
        }
    };

    //========================
    // ICON DATA
    //========================

    var ICON_DAISY_CHAIN = [
        // Upper-right chain link
        [
            [0.5099, 0.2838], [0.5719, 0.2219], [0.6201, 0.1899], [0.6750, 0.1792],
            [0.7299, 0.1899], [0.7781, 0.2219], [0.7781, 0.2219], [0.8101, 0.2701],
            [0.8208, 0.3250], [0.8101, 0.3799], [0.7781, 0.4281], [0.6544, 0.5518],
            [0.6062, 0.5839], [0.5513, 0.5945], [0.4964, 0.5839], [0.4482, 0.5518],
            [0.4482, 0.5518]
        ],
        // Lower-left chain link
        [
            [0.4901, 0.7162], [0.4281, 0.7781], [0.3799, 0.8101], [0.3250, 0.8208],
            [0.2701, 0.8101], [0.2219, 0.7781], [0.2219, 0.7781], [0.1899, 0.7299],
            [0.1792, 0.6750], [0.1899, 0.6201], [0.2219, 0.5719], [0.3456, 0.4482],
            [0.3938, 0.4161], [0.4487, 0.4055], [0.5036, 0.4161], [0.5518, 0.4482],
            [0.5518, 0.4482]
        ]
    ];

    //========================
    // PSEUDO EFFECT DATA
    //========================

    // Daisy Chain Path pseudo effect (Tangent Scale, Angle Offset)
    var FFX_PATH_TANGENT = "RIFX\x00\x00\b:FaFXhead\x00\x00\x00\x10\x00\x00\x00\x03\x00\x00\x00D\x00\x00\x00\x01\x01\x00\x00\x00LIST\x00\x00\b\x16bescbeso\x00\x00\x008\x00\x00\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00]\xa8\x00\x1d\xf8R\x00\x00\x00\x00\x00d\x00d\x00d\x00d?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xffLIST\x00\x00\x00\xactdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x02LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE Effect Parade\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdsn\x00\x00\x00\x11Daisy Chain Path\x00\x00LIST\x00\x00\x00dtdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x01LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE End of path sentinel\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x06\x90sspcfnam\x00\x00\x000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x02tparTparn\x00\x00\x00\x04\x00\x00\x00\x03tdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xff\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nTangent Scale\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\x00\x00\x00\x00CH\x00\x00B\xc8\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nAngle Offset\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00B\xc8\x00\x00\x00\x00\x00\x00B\xc8\x00\x00B\xc8\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x03\xd0tdgptdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x11Daisy Chain Path\x00\x00tdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x03tdsn\x00\x00\x00\x01\x00\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x02X?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\xc0\xc0\xc0\xff\xc0\xc0\xc0\x00\x00\x00\x00\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xfatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0eTangent Scale\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@i\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM DaisyChainPath-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xfatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\rAngle Offset\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@Y\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(ADBE Group End\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00{\n\"controlName\": \"Daisy Chain Path\",\n\"matchname\": \"Pseudo/JIM DaisyChainPath\",\n\"controlArray\": [\n{\n\"name\": \"Tangent Scale\",\n\"type\": \"slider\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": true,\n\"id\": 7492978966,\n\"hold\": false,\n\"default\": 100,\n\"sliderMax\": 200,\n\"sliderMin\": 0,\n\"validMax\": 10000,\n\"validMin\": -10000,\n\"precision\": 2,\n\"percent\": false,\n\"pixel\": false,\n\"open\": true,\n\"errors\": [],\n\"error\": []\n},\n{\n\"name\": \"Angle Offset\",\n\"type\": \"slider\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": true,\n\"id\": 8714328840,\n\"hold\": false,\n\"default\": 100,\n\"sliderMax\": 100,\n\"sliderMin\": 0,\n\"validMax\": 100,\n\"validMin\": 0,\n\"precision\": 2,\n\"percent\": false,\n\"pixel\": false,\n\"open\": true,\n\"errors\": [],\n\"error\": []\n}\n],\n\"version\": 3\n}";

    function getFFXFolder() {
        var ffxFolder = Folder.userData.fullName + "/JakeInMotion/DaisyChain";
        var folder = new Folder(ffxFolder);
        if (!folder.exists) {
            folder.create();
        }
        return ffxFolder;
    }

    function applyPathTangentEffect(layer) {
        var ffxFile = new File(getFFXFolder() + "/DaisyChainPath.ffx");

        // Only write file if it doesn't exist (caching)
        if (!ffxFile.exists) {
            ffxFile.encoding = "BINARY";
            ffxFile.open("w");
            ffxFile.write(FFX_PATH_TANGENT);
            ffxFile.close();
        }

        // applyPreset requires the layer to be selected
        layer.selected = true;
        layer.applyPreset(ffxFile);
        layer.selected = false;
    }

    function openURL(url) {
        try {
            if ($.os.indexOf("Windows") !== -1) {
                system.callSystem('cmd /c start "" "' + url + '"');
            } else {
                system.callSystem("open " + url);
            }
        } catch (e) {}
    }

    //========================
    // COLOR UTILITIES
    //========================

    function hexToRGBA(hexString, alpha) {
        var hex = hexString.replace("#", "");
        var finalAlpha = (alpha !== undefined) ? alpha : 1;

        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        var r = parseInt(hex.slice(0, 2), 16) / 255;
        var g = parseInt(hex.slice(2, 4), 16) / 255;
        var b = parseInt(hex.slice(4, 6), 16) / 255;

        return [r, g, b, finalAlpha];
    }

    //========================
    // ICON UTILITIES
    //========================

    function scaleIconCoordinates(iconData, scaleFactor) {
        var scaledData = [];

        for (var i = 0; i < iconData.length; i++) {
            var segment = iconData[i];
            var scaledSegment = [];

            for (var j = 0; j < segment.length; j++) {
                var point = segment[j];
                var scaledPoint = [
                    point[0] * scaleFactor,
                    point[1] * scaleFactor
                ];
                scaledSegment.push(scaledPoint);
            }

            scaledData.push(scaledSegment);
        }

        return scaledData;
    }

    // Brand colors for hover state (orange and blue)
    var CHAIN_HOVER_COLORS = [
        [0.93, 0.34, 0.19, 1],  // #ee5730 - Orange
        [0.16, 0.56, 0.95, 1]   // #2890f2 - Blue
    ];

    function drawIconButton() {
        var g = this.graphics;
        var w = this.size[0];
        var h = this.size[1];

        g.drawOSControl();

        g.rectPath(0, 0, w, h);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, this.bgColor));
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, this.strokeColor, 1));

        var iconX = (w - this.iconSize) / 2;
        var iconY = (h - this.iconSize) / 2;

        var coords = this.iconCoords;

        for (var i = 0; i < coords.length; i++) {
            var segment = coords[i];

            // Use brand colors on hover, default gray otherwise
            var segmentColor = this.isHovered ? CHAIN_HOVER_COLORS[i % CHAIN_HOVER_COLORS.length] : this.currentColor;
            var iconPen = g.newPen(g.PenType.SOLID_COLOR, segmentColor, 2);

            g.newPath();
            g.moveTo(segment[0][0] + iconX, segment[0][1] + iconY);

            for (var j = 1; j < segment.length; j++) {
                g.lineTo(segment[j][0] + iconX, segment[j][1] + iconY);
            }

            g.strokePath(iconPen);
        }
    }

    function handleButtonMouseOver() {
        this.isHovered = true;
        this.currentColor = this.hoverColor;
        this.bgColor = this.bgHoverColor;
        this.strokeColor = this.strokeHoverColor;
        this.notify("onDraw");
    }

    function handleButtonMouseOut() {
        this.isHovered = false;
        this.currentColor = this.defaultColor;
        this.bgColor = this.bgDefaultColor;
        this.strokeColor = this.strokeDefaultColor;
        this.notify("onDraw");
    }

    function createIconButton(parent, config) {
        var btn = parent.add("button", undefined, "");

        if (config.buttonSize) {
            btn.preferredSize = [config.buttonSize[0], config.buttonSize[1]];
        }

        btn.iconCoords = scaleIconCoordinates(config.iconData, config.iconSize || 24);
        btn.iconSize = config.iconSize || 24;
        btn.currentColor = hexToRGBA(config.defaultColor || "#c4c4c4", 1);
        btn.defaultColor = hexToRGBA(config.defaultColor || "#c4c4c4", 1);
        btn.hoverColor = hexToRGBA(config.hoverColor || config.defaultColor, 1);

        btn.bgColor = config.bgColor || [0.05, 0.05, 0.05, 0.15];
        btn.bgHoverColor = config.bgHoverColor || [1, 1, 1, 0.05];
        btn.bgDefaultColor = btn.bgColor;

        btn.strokeColor = config.strokeColor || [0, 0, 0, 0];
        btn.strokeHoverColor = config.strokeHoverColor || [1, 1, 1, 0.1];
        btn.strokeDefaultColor = btn.strokeColor;

        btn.isHovered = false;

        btn.onDraw = drawIconButton;

        btn.addEventListener("mouseover", handleButtonMouseOver);
        btn.addEventListener("mouseout", handleButtonMouseOut);

        if (config.onClick) {
            btn.onClick = config.onClick;
        }

        if (config.helpTip) {
            btn.helpTip = config.helpTip;
        }

        return btn;
    }

    //========================
    // UTILITY FUNCTIONS
    //========================

    function showAlert(title, message) {
        var alertWindow = new Window("dialog", title);
        alertWindow.orientation = "column";
        alertWindow.alignChildren = ["fill", "top"];
        alertWindow.spacing = 10;
        alertWindow.margins = 16;

        alertWindow.add("statictext", undefined, message, { multiline: true });

        var buttonRow = alertWindow.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignment = ["right", "top"];
        buttonRow.alignChildren = ["right", "center"];
        buttonRow.spacing = 8;
        buttonRow.margins = 4;

        var okButton = buttonRow.add("button", undefined, "OK", { name: "ok" });

        function handleOK() {
            alertWindow.close(1);
        }
        okButton.onClick = handleOK;

        alertWindow.layout.layout(true);
        alertWindow.show();
    }

    //========================
    // SELECTION DETECTION
    //========================

    // Find all selected path properties on a layer
    function findSelectedPaths(layer) {
        var paths = [];
        function searchProperty(prop) {
            if (prop.matchName === "ADBE Vector Shape - Group" && prop.selected) {
                paths.push(prop);
            }
            if (prop.numProperties !== undefined) {
                for (var i = 1; i <= prop.numProperties; i++) {
                    searchProperty(prop.property(i));
                }
            }
        }
        searchProperty(layer);
        return paths;
    }

    // Find all paths on a layer
    function findAllPaths(layer) {
        var paths = [];
        function searchForPaths(prop) {
            if (prop.matchName === "ADBE Vector Shape - Group") {
                paths.push(prop);
            }
            if (prop.numProperties !== undefined) {
                for (var i = 1; i <= prop.numProperties; i++) {
                    searchForPaths(prop.property(i));
                }
            }
        }
        searchForPaths(layer);
        return paths;
    }

    // Find selected puppet pins on a layer (in selection order, stores path info)
    function findSelectedPuppetPins(layer) {
        var pins = [];
        var selectedProps = layer.selectedProperties;

        for (var i = 0; i < selectedProps.length; i++) {
            var prop = selectedProps[i];

            // Check if this is a puppet pin position property
            if (prop.matchName !== "ADBE FreePin3 PosPin Position") continue;

            // Navigate up the hierarchy to get indices
            var pinAtom = prop.parentProperty;
            var posPins = pinAtom.parentProperty;
            var meshAtom = posPins.parentProperty;
            var meshGroup = meshAtom.parentProperty;
            var arapGroup = meshGroup.parentProperty;
            var effect = arapGroup.parentProperty;

            pins.push({
                name: pinAtom.name,
                effectIndex: effect.propertyIndex,
                meshIndex: meshAtom.propertyIndex,
                pinIndex: pinAtom.propertyIndex,
                position: prop.value
            });
        }
        return pins;
    }

    // Find all puppet pins on a layer (when none specifically selected)
    function findAllPuppetPins(layer) {
        var pins = [];
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) return pins;

        for (var e = 1; e <= effects.numProperties; e++) {
            var effect = effects.property(e);
            if (effect.matchName !== "ADBE FreePin3") continue;

            var arapGroup = effect.property("ADBE FreePin3 ARAP Group");
            if (!arapGroup) continue;

            var meshGroup = arapGroup.property("ADBE FreePin3 Mesh Group");
            if (!meshGroup || meshGroup.numProperties === 0) continue;

            for (var m = 1; m <= meshGroup.numProperties; m++) {
                var meshAtom = meshGroup.property(m);
                var posPins = meshAtom.property("ADBE FreePin3 PosPins");
                if (!posPins) continue;

                for (var p = 1; p <= posPins.numProperties; p++) {
                    var pinAtom = posPins.property(p);
                    var positionProp = pinAtom.property("ADBE FreePin3 PosPin Position");
                    if (positionProp) {
                        // Store path info instead of property reference
                        pins.push({
                            name: pinAtom.name,
                            effectIndex: e,
                            meshIndex: m,
                            pinIndex: p,
                            position: positionProp.value
                        });
                    }
                }
            }
        }
        return pins;
    }

    // Re-fetch a puppet pin property using stored path info
    function getPuppetPinProperty(layer, pinInfo) {
        var effects = layer.property("ADBE Effect Parade");
        var effect = effects.property(pinInfo.effectIndex);
        var arapGroup = effect.property("ADBE FreePin3 ARAP Group");
        var meshGroup = arapGroup.property("ADBE FreePin3 Mesh Group");
        var meshAtom = meshGroup.property(pinInfo.meshIndex);
        var posPins = meshAtom.property("ADBE FreePin3 PosPins");
        var pinAtom = posPins.property(pinInfo.pinIndex);
        return pinAtom.property("ADBE FreePin3 PosPin Position");
    }

    // Show order confirmation dialog for puppet pins
    function showPinOrderDialog(pins) {
        // Default to reversed order (root-to-tip FK chain)
        pins.reverse();

        var dialog = new Window("dialog", CONFIG.name + " - Pin Order");
        dialog.orientation = "column";
        dialog.alignChildren = ["fill", "top"];
        dialog.spacing = 12;
        dialog.margins = 16;

        var infoText = dialog.add("statictext", undefined, "First pin = root, last pin = end of chain");
        infoText.alignment = ["center", "top"];

        // List showing pin order
        var listBox = dialog.add("listbox", undefined, [], {
            numberOfColumns: 1,
            showHeaders: false
        });
        listBox.preferredSize = [250, 150];

        // Populate list
        function updateList() {
            listBox.removeAll();
            for (var i = 0; i < pins.length; i++) {
                var prefix = (i === 0) ? "[Root] " : "[" + (i + 1) + "] ";
                listBox.add("item", prefix + pins[i].name);
            }
        }
        updateList();

        // Buttons
        var buttonRow = dialog.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignment = ["center", "top"];
        buttonRow.alignChildren = ["center", "center"];
        buttonRow.spacing = 10;
        buttonRow.margins = 0;

        var reverseBtn = buttonRow.add("button", undefined, "Reverse Order");
        reverseBtn.preferredSize = [100, 26];

        var okBtn = buttonRow.add("button", undefined, "OK", { name: "ok" });
        okBtn.preferredSize = [80, 26];

        var cancelBtn = buttonRow.add("button", undefined, "Cancel", { name: "cancel" });
        cancelBtn.preferredSize = [80, 26];

        function handleReverse() {
            pins.reverse();
            updateList();
        }
        reverseBtn.onClick = handleReverse;

        dialog.layout.layout(true);
        dialog.center();

        if (dialog.show() === 1) {
            return pins; // Return potentially reversed array
        }
        return null; // Cancelled
    }

    // Detect what type of selection we have
    function detectSelectionType(comp) {
        if (!comp || !(comp instanceof CompItem)) {
            return { type: "none", error: "No Composition\n\nPlease open a composition first." };
        }

        var selectedLayers = comp.selectedLayers;
        if (selectedLayers.length === 0) {
            return { type: "none", error: "No Selection\n\nSelect layers, a path, or puppet pins." };
        }

        // Check for selected properties on first layer
        var layer = selectedLayers[0];

        // Check for selected puppet pins first
        var selectedPins = findSelectedPuppetPins(layer);
        if (selectedPins.length >= 2) {
            return { type: "puppetPins", layer: layer, pins: selectedPins };
        }

        // Check for selected paths (can be multiple)
        var selectedPaths = findSelectedPaths(layer);
        if (selectedPaths.length > 0) {
            return { type: "paths", layer: layer, pathGroups: selectedPaths };
        }

        // If single layer, check for all paths or all puppet pins
        if (selectedLayers.length === 1) {
            // Try all paths on the layer
            var allPaths = findAllPaths(layer);
            if (allPaths.length > 0) {
                return { type: "paths", layer: layer, pathGroups: allPaths };
            }

            // Try all puppet pins
            var allPins = findAllPuppetPins(layer);
            if (allPins.length >= 2) {
                return { type: "puppetPins", layer: layer, pins: allPins };
            }

            return { type: "none", error: "Not Enough Items\n\nSelect at least 2 layers, a path with 2+ points, or 2+ puppet pins." };
        }

        // Multiple layers selected - chain them
        if (selectedLayers.length >= 2) {
            return { type: "layers", layers: selectedLayers };
        }

        return { type: "none", error: "Not Enough Items\n\nSelect at least 2 layers to chain." };
    }

    //========================
    // LAYER CHAINING
    //========================

    function chainLayers(layers) {
        // First, unparent all selected layers to avoid circular parent errors
        for (var i = 0; i < layers.length; i++) {
            layers[i].parent = null;
        }

        // Then chain them in selection order
        for (var j = 1; j < layers.length; j++) {
            layers[j].parent = layers[j - 1];
        }
    }

    //========================
    // PATH TO FK CHAIN
    //========================

    function chainPathPoints(layer, pathGroup) {
        var comp = app.project.activeItem;
        var selectedPath;

        try {
            selectedPath = pathGroup.property("ADBE Vector Shape");
        } catch (e) {
            showAlert(CONFIG.name, "Invalid Path\n\nCould not find path property.");
            return;
        }

        var pathValue = selectedPath.value;
        if (!pathValue || !pathValue.vertices || pathValue.vertices.length < 2) {
            showAlert(CONFIG.name, "Invalid Path\n\nPath must have at least 2 points.");
            return;
        }

        var points = pathValue.vertices;
        var inTangents = pathValue.inTangents;
        var outTangents = pathValue.outTangents;
        var pathName = pathGroup.name;

        // Clear any existing expression
        if (selectedPath.expression) {
            selectedPath.expression = "";
        }

        var nullNames = [];
        var nullLayers = [];
        var hasTangents = [];

        // Create nulls for each point
        for (var i = 0; i < points.length; i++) {
            var nullLayer = comp.layers.addNull();
            var nullName = layer.name + " - " + pathName + " - Point " + (i + 1);
            nullLayer.name = nullName;
            nullNames.push(nullName);
            nullLayers.push(nullLayer);

            // Check if this point has tangents
            var inTang = inTangents[i];
            var outTang = outTangents[i];
            var pointHasTangents = !(inTang[0] === 0 && inTang[1] === 0 && outTang[0] === 0 && outTang[1] === 0);
            hasTangents.push(pointHasTangents);

            // Transform point to comp space
            var pointPos = points[i];
            var layerPos = layer.transform.position.value;
            var layerAnchor = layer.transform.anchorPoint.value;
            var layerScale = layer.transform.scale.value;
            var layerRotation = layer.transform.rotation.value;

            var scaledX = pointPos[0] * (layerScale[0] / 100);
            var scaledY = pointPos[1] * (layerScale[1] / 100);

            var rotRad = layerRotation * Math.PI / 180;
            var rotatedX = scaledX * Math.cos(rotRad) - scaledY * Math.sin(rotRad);
            var rotatedY = scaledX * Math.sin(rotRad) + scaledY * Math.cos(rotRad);

            var compX = layerPos[0] + rotatedX - (layerAnchor[0] * (layerScale[0] / 100));
            var compY = layerPos[1] + rotatedY - (layerAnchor[1] * (layerScale[1] / 100));

            nullLayer.transform.position.setValue([compX, compY]);
            nullLayer.transform.rotation.setValue(0);

            var nullSize = 50;
            nullLayer.transform.anchorPoint.setValue([nullSize, nullSize]);
        }

        // Chain nulls in FK hierarchy
        if (nullLayers.length > 1) {
            for (var j = 1; j < nullLayers.length; j++) {
                nullLayers[j].parent = nullLayers[j - 1];
            }
        }

        // Move nulls above source layer
        for (var k = nullLayers.length - 1; k >= 0; k--) {
            nullLayers[k].moveBefore(layer);
        }

        // Add tangent control pseudo effect to nulls with tangents
        for (var m = 0; m < nullLayers.length; m++) {
            if (hasTangents[m]) {
                applyPathTangentEffect(nullLayers[m]);
            }
        }

        // Add layer controls to source layer
        var effects = layer.property("ADBE Effect Parade");
        for (var n = 0; n < nullLayers.length; n++) {
            var layerControl = effects.addProperty("ADBE Layer Control");
            layerControl.name = nullNames[n];
            layerControl.property("ADBE Layer Control-0001").setValue(nullLayers[n].index);
        }

        // Build and apply expression
        var expr = buildPathExpression(nullNames, hasTangents);
        selectedPath.expression = expr;
    }

    function buildPathExpression(nullNames, hasTangents) {
        var expr = '';

        expr += 'var nullLayerNames = [';
        for (var i = 0; i < nullNames.length; i++) {
            expr += '"' + nullNames[i] + '"';
            if (i < nullNames.length - 1) expr += ',';
        }
        expr += '];\n';
        expr += 'var origPath = thisProperty;\n';
        expr += 'var origPoints = origPath.points();\n';
        expr += 'var origInTang = origPath.inTangents();\n';
        expr += 'var origOutTang = origPath.outTangents();\n';
        expr += 'var getNullLayers = [];\n\n';

        expr += 'function toShapeGroup(inputXY, shapeGroup) {\n';
        expr += '\tconst transformedXY = inputXY - shapeGroup.transform.position;\n';
        expr += '\tconst scaledX = transformedXY[0] / (shapeGroup.transform.scale[0] / 100);\n';
        expr += '\tconst scaledY = transformedXY[1] / (shapeGroup.transform.scale[1] / 100);\n';
        expr += '\tconst angleRadians = -degreesToRadians(shapeGroup.transform.rotation);\n';
        expr += '\tconst rotatedX = scaledX * Math.cos(angleRadians) - scaledY * Math.sin(angleRadians);\n';
        expr += '\tconst rotatedY = scaledX * Math.sin(angleRadians) + scaledY * Math.cos(angleRadians);\n';
        expr += '\tconst newPosXY = [rotatedX, rotatedY] + shapeGroup.transform.anchorPoint;\n';
        expr += '\treturn newPosXY;\n';
        expr += '}\n\n';

        expr += 'function transformTangent(tangent, localRotation, worldRotation, nullScale, orientationPercent, tangentScale) {\n';
        expr += '\tvar userScaledTangent = [\n';
        expr += '\t\ttangent[0] * (tangentScale / 100),\n';
        expr += '\t\ttangent[1] * (tangentScale / 100)\n';
        expr += '\t];\n\n';
        expr += '\tvar scaledTangent = [\n';
        expr += '\t\tuserScaledTangent[0] * (nullScale[0] / 100),\n';
        expr += '\t\tuserScaledTangent[1] * (nullScale[1] / 100)\n';
        expr += '\t];\n\n';
        expr += '\tvar perpendicularFactor = linear(orientationPercent, 0, 100, 1, 0);\n';
        expr += '\tvar orientationOffset = -localRotation * perpendicularFactor;\n';
        expr += '\tvar finalRotation = worldRotation + orientationOffset;\n';
        expr += '\tvar angleRadians = degreesToRadians(finalRotation);\n';
        expr += '\tvar rotatedX = scaledTangent[0] * Math.cos(angleRadians) - scaledTangent[1] * Math.sin(angleRadians);\n';
        expr += '\tvar rotatedY = scaledTangent[0] * Math.sin(angleRadians) + scaledTangent[1] * Math.cos(angleRadians);\n\n';
        expr += '\treturn [rotatedX, rotatedY];\n';
        expr += '}\n\n';

        expr += 'function getWorldRotation(layer) {\n';
        expr += '\tvar worldRot = layer.rotation.value;\n';
        expr += '\tvar currentLayer = layer;\n\n';
        expr += '\twhile (currentLayer.hasParent) {\n';
        expr += '\t\tcurrentLayer = currentLayer.parent;\n';
        expr += '\t\tworldRot += currentLayer.rotation.value;\n';
        expr += '\t}\n\n';
        expr += '\treturn worldRot;\n';
        expr += '}\n\n';

        expr += 'for (var i = 0, il = nullLayerNames.length; i < il; i++) {\n';
        expr += '\ttry {\n';
        expr += '\t\tgetNullLayers.push(effect(nullLayerNames[i])("ADBE Layer Control-0001"));\n';
        expr += '\t} catch (err) {\n';
        expr += '\t\tgetNullLayers.push(null);\n';
        expr += '\t}\n';
        expr += '}\n\n';

        expr += 'for (var i = 0, il = getNullLayers.length; i < il; i++) {\n';
        expr += '\tif (getNullLayers[i] != null && getNullLayers[i].index != thisLayer.index) {\n';
        expr += '\t\tlet targetValue = fromCompToSurface(getNullLayers[i].toComp(getNullLayers[i].anchorPoint));\n';
        expr += '\t\tlet containerGroup = thisProperty.propertyGroup(3);\n';
        expr += '\t\tlet limit = 40;\n';
        expr += '\t\tconst transformGroups = [];\n\n';
        expr += '\t\twhile (--limit && !(containerGroup instanceof Layer)) {\n';
        expr += '\t\t\tif (containerGroup.transform && containerGroup.transform.position) {\n';
        expr += '\t\t\t\ttransformGroups.unshift(containerGroup);\n';
        expr += '\t\t\t}\n';
        expr += '\t\t\tcontainerGroup = containerGroup.propertyGroup(1);\n';
        expr += '\t\t}\n\n';
        expr += '\t\ttransformGroups.forEach(g => targetValue = toShapeGroup(targetValue, g));\n';
        expr += '\t\torigPoints[i] = targetValue;\n\n';
        expr += '\t\ttry {\n';
        expr += '\t\t\tvar tangentScale = getNullLayers[i].effect("Daisy Chain Path")("Tangent Scale");\n';
        expr += '\t\t\tvar tangentOrientation = getNullLayers[i].effect("Daisy Chain Path")("Angle Offset");\n';
        expr += '\t\t\tvar localRotation = getNullLayers[i].rotation.value;\n';
        expr += '\t\t\tvar worldRotation = getWorldRotation(getNullLayers[i]);\n';
        expr += '\t\t\tvar nullScale = getNullLayers[i].scale.value;\n\n';
        expr += '\t\t\torigInTang[i] = transformTangent(origInTang[i], localRotation, worldRotation, nullScale, tangentOrientation, tangentScale);\n';
        expr += '\t\t\torigOutTang[i] = transformTangent(origOutTang[i], localRotation, worldRotation, nullScale, tangentOrientation, tangentScale);\n';
        expr += '\t\t} catch(e) {}\n';
        expr += '\t}\n';
        expr += '}\n\n';
        expr += 'createPath(origPoints, origInTang, origOutTang, origPath.isClosed());';

        return expr;
    }

    //========================
    // PUPPET PIN TO FK CHAIN
    //========================

    function chainPuppetPins(layer, pins) {
        var comp = app.project.activeItem;

        // Build unique names with duplicate handling
        var nameCount = {};
        var nullNames = [];

        for (var i = 0; i < pins.length; i++) {
            var baseName = layer.name + " - " + pins[i].name;

            if (nameCount[baseName] === undefined) {
                nameCount[baseName] = 0;
            }
            nameCount[baseName]++;
        }

        // Reset counts for second pass
        var nameIndex = {};
        for (var j = 0; j < pins.length; j++) {
            var base = layer.name + " - " + pins[j].name;

            if (nameCount[base] > 1) {
                if (nameIndex[base] === undefined) {
                    nameIndex[base] = 1;
                }
                nullNames.push(base + " " + nameIndex[base]);
                nameIndex[base]++;
            } else {
                nullNames.push(base);
            }
        }

        var nullLayers = [];

        // Create nulls for each pin
        for (var k = 0; k < pins.length; k++) {
            var nullLayer = comp.layers.addNull();
            nullLayer.name = nullNames[k];
            nullLayers.push(nullLayer);

            // Get pin position from stored value (not stale reference)
            var pinPos = pins[k].position;

            // Transform from layer space to comp space
            var layerPos = layer.transform.position.value;
            var layerAnchor = layer.transform.anchorPoint.value;
            var layerScale = layer.transform.scale.value;
            var layerRotation = layer.transform.rotation.value;

            var offsetX = pinPos[0] - layerAnchor[0];
            var offsetY = pinPos[1] - layerAnchor[1];

            var scaledX = offsetX * (layerScale[0] / 100);
            var scaledY = offsetY * (layerScale[1] / 100);

            var rotRad = layerRotation * Math.PI / 180;
            var rotatedX = scaledX * Math.cos(rotRad) - scaledY * Math.sin(rotRad);
            var rotatedY = scaledX * Math.sin(rotRad) + scaledY * Math.cos(rotRad);

            var compX = layerPos[0] + rotatedX;
            var compY = layerPos[1] + rotatedY;

            nullLayer.transform.position.setValue([compX, compY]);

            var nullSize = 50;
            nullLayer.transform.anchorPoint.setValue([nullSize, nullSize]);
        }

        // Chain nulls in FK hierarchy
        if (nullLayers.length > 1) {
            for (var m = 1; m < nullLayers.length; m++) {
                nullLayers[m].parent = nullLayers[m - 1];
            }
        }

        // Move nulls above source layer
        for (var n = nullLayers.length - 1; n >= 0; n--) {
            nullLayers[n].moveBefore(layer);
        }

        // Add layer controls to source layer
        var effects = layer.property("ADBE Effect Parade");
        for (var p = 0; p < nullLayers.length; p++) {
            var layerControl = effects.addProperty("ADBE Layer Control");
            layerControl.name = nullNames[p];
            layerControl.property("ADBE Layer Control-0001").setValue(nullLayers[p].index);
        }

        // Apply expressions to each puppet pin (re-fetch properties to avoid stale references)
        for (var q = 0; q < pins.length; q++) {
            var expr = buildPuppetExpression(nullNames[q]);
            var pinProperty = getPuppetPinProperty(layer, pins[q]);
            pinProperty.expression = expr;
        }
    }

    function buildPuppetExpression(nullName) {
        var expr = '';
        expr += 'var ctrl = effect("' + nullName + '")("ADBE Layer Control-0001");\n';
        expr += 'if (ctrl.index !== thisLayer.index) {\n';
        expr += '\tvar nullPos = ctrl.toComp(ctrl.anchorPoint);\n';
        expr += '\tfromComp(nullPos);\n';
        expr += '} else {\n';
        expr += '\tvalue;\n';
        expr += '}';
        return expr;
    }

    //========================
    // MAIN ENTRY POINT
    //========================

    function daisyChain() {
        var comp = app.project.activeItem;
        var selection = detectSelectionType(comp);

        if (selection.type === "none") {
            showAlert(CONFIG.name, selection.error);
            return;
        }

        app.beginUndoGroup(CONFIG.name);

        try {
            switch (selection.type) {
                case "layers":
                    chainLayers(selection.layers);
                    break;
                case "paths":
                    // Process each path
                    for (var i = 0; i < selection.pathGroups.length; i++) {
                        chainPathPoints(selection.layer, selection.pathGroups[i]);
                    }
                    break;
                case "puppetPins":
                    // Show order dialog for puppet pins
                    var orderedPins = showPinOrderDialog(selection.pins);
                    if (orderedPins === null) {
                        app.endUndoGroup();
                        return; // User cancelled
                    }
                    chainPuppetPins(selection.layer, orderedPins);
                    break;
            }
        } catch (e) {
            showAlert(CONFIG.name, "Error\n\n" + e.toString());
        }

        app.endUndoGroup();
    }

    //========================
    // HELP SYSTEM
    //========================

    function helpButtonHandler() {
        var helpDialog = new Window("dialog", "Help - " + CONFIG.name);
        helpDialog.orientation = "column";
        helpDialog.alignChildren = ["fill", "top"];
        helpDialog.spacing = 10;
        helpDialog.margins = 20;

        var titleText = helpDialog.add("statictext", undefined,
            "How to use " + CONFIG.name);
        titleText.alignment = ["center", "top"];

        // Layers section
        var layersPanel = helpDialog.add("panel", undefined, "Layers");
        layersPanel.orientation = "column";
        layersPanel.alignChildren = ["fill", "top"];
        layersPanel.spacing = 4;
        layersPanel.margins = 12;

        layersPanel.add("statictext", undefined, "Select 2+ layers to parent them in a chain.");
        layersPanel.add("statictext", undefined, "First selected = root, rest chain to previous.");

        // Path section
        var pathPanel = helpDialog.add("panel", undefined, "Path Points");
        pathPanel.orientation = "column";
        pathPanel.alignChildren = ["fill", "top"];
        pathPanel.spacing = 4;
        pathPanel.margins = 12;

        pathPanel.add("statictext", undefined, "Select a path (or layer with single path).");
        pathPanel.add("statictext", undefined, "Creates FK null chain controlling each vertex.");

        // Puppet section
        var puppetPanel = helpDialog.add("panel", undefined, "Puppet Pins");
        puppetPanel.orientation = "column";
        puppetPanel.alignChildren = ["fill", "top"];
        puppetPanel.spacing = 4;
        puppetPanel.margins = 12;

        puppetPanel.add("statictext", undefined, "Select 2+ puppet pin positions.");
        puppetPanel.add("statictext", undefined, "Creates FK null chain controlling each pin.");

        var toolsText = helpDialog.add("statictext", undefined, "Works great with tools like KBar and Code Runner.");
        toolsText.alignment = ["center", "top"];

        // Button row (4px padding for focus highlight)
        var buttonRow = helpDialog.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignment = ["center", "top"];
        buttonRow.alignChildren = ["center", "center"];
        buttonRow.spacing = 8;
        buttonRow.margins = [4, 8, 4, 4];

        var codeRunnerBtn = buttonRow.add("button", undefined, "Code Runner");
        var kbarBtn = buttonRow.add("button", undefined, "KBar");
        var learnMoreBtn = buttonRow.add("button", undefined, "Learn More");
        var okBtn = buttonRow.add("button", undefined, "OK", { name: "ok" });

        function handleCodeRunner() {
            openURL(CONFIG.urls.codeRunner);
        }
        function handleKBar() {
            openURL(CONFIG.urls.kbar);
        }
        function handleLearnMore() {
            openURL(CONFIG.urls.website);
        }
        function handleOK() {
            helpDialog.close();
        }

        codeRunnerBtn.onClick = handleCodeRunner;
        kbarBtn.onClick = handleKBar;
        learnMoreBtn.onClick = handleLearnMore;
        okBtn.onClick = handleOK;

        helpDialog.show();
    }

    //========================
    // UI CONSTRUCTION
    //========================

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", CONFIG.name, undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 4;
        win.margins = 4;

        // Button constants
        var BUTTON_HEIGHT = 34;

        // Button container
        var buttonRow = win.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignChildren = ["fill", "center"];
        buttonRow.spacing = 0;
        buttonRow.margins = 0;
        buttonRow.alignment = ["fill", "top"];

        // Create icon button
        var chainBtn = createIconButton(buttonRow, {
            iconData: ICON_DAISY_CHAIN,
            iconSize: 24,
            buttonSize: [BUTTON_HEIGHT, BUTTON_HEIGHT],
            defaultColor: "#c4c4c4",
            hoverColor: "#FF5722",
            helpTip: "Daisy Chain - Create FK parent chains\n\n" +
                     "Layers: Parent in selection order\n" +
                     "Path: Create null chain for vertices\n" +
                     "Puppet Pins: Create null chain for pins",
            onClick: daisyChain
        });
        chainBtn.alignment = ["fill", "center"];

        // Footer
        var footer = win.add("group");
        footer.orientation = "row";
        footer.alignment = ["fill", "bottom"];
        footer.alignChildren = ["left", "bottom"];
        footer.spacing = 5;
        footer.margins = 4;

        var branding = footer.add("group");
        branding.orientation = "column";
        branding.alignChildren = ["left", "bottom"];
        branding.spacing = 2;
        branding.margins = 0;

        var titleText = branding.add("statictext", undefined,
            CONFIG.name + " - " + CONFIG.version);

        var currentYear = new Date().getFullYear();
        var copyrightYear = currentYear > CONFIG.year ?
            CONFIG.year + "-" + currentYear : String(CONFIG.year);
        var copyrightText = branding.add("statictext", undefined,
            "\u00A9" + copyrightYear + " " + CONFIG.author);

        var spacer = footer.add("group");
        spacer.alignment = ["fill", "center"];

        var helpBtn = footer.add("button", undefined, "?");
        helpBtn.alignment = ["right", "bottom"];
        helpBtn.preferredSize = [25, 25];
        helpBtn.minimumSize = [25, 25];
        helpBtn.maximumSize = [25, 25];
        helpBtn.onClick = helpButtonHandler;

        // Resize handler
        function handleResize() {
            if (win.layout) {
                win.layout.resize();
            }
        }
        win.onResizing = handleResize;
        win.onResize = handleResize;

        win.layout.layout(true);

        return win;
    }

    //========================
    // CONTEXT DETECTION
    //========================

    function detectExecutionContext() {
        // Context 1: Dockable panel (Window menu)
        if (thisObj instanceof Panel) {
            return "panel";
        }

        // Context 2: KBar
        if (typeof kbar !== "undefined" && kbar.button) {
            return "kbar";
        }

        // Context 3 & 4: File > Scripts menu or Code Runner
        return "standalone";
    }

    //========================
    // INITIALIZATION
    //========================

    var context = detectExecutionContext();

    if (context === "panel") {
        // Dockable panel - build full UI
        var mainUIWindow = buildUI(thisObj);

        if (mainUIWindow instanceof Window) {
            mainUIWindow.center();
            mainUIWindow.show();
        }
    } else {
        // All other contexts - execute immediately
        daisyChain();
    }

})(this);
