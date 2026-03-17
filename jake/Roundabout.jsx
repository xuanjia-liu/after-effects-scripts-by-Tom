/*
╦═╗╔═╗╦ ╦╔╗╔╔╦╗╔═╗╔╗ ╔═╗╦ ╦╔╦╗
╠╦╝║ ║║ ║║║║ ║║╠═╣╠╩╗║ ║║ ║ ║
╩╚═╚═╝╚═╝╝╚╝═╩╝╩ ╩╚═╝╚═╝╚═╝ ╩

Roundabout v1.0.0
Distributes selected layers in a circular pattern around a controller null.

Author:   Jake Bartlett (Jake In Motion LLC)
Website:  https://jakeinmotion.com/roundabout
License:  Free for personal/commercial use. No redistribution.
          https://jakeinmotion.com/license
*/

(function(thisObj) {

    //========================
    // CONFIGURATION
    //========================

    var CONFIG = {
        name: "Roundabout",
        version: "v1.0.2",
        author: "Jake in Motion",
        year: 2025,
        controllerName: "Roundabout Controller",
        effectName: "Roundabout",
        effectMatchName: "Pseudo/JIM Roundabout",
        effect3DName: "Roundabout 3D",
        effect3DMatchName: "Pseudo/JIM Roundabout 3D",
        urls: {
            website: "https://jakeinmotion.com/roundabout",
            codeRunner: "https://jakeinmotion.com/code-runner",
            kbar: "https://aescripts.com/kbar"
        }
    };

    //========================
    // EMBEDDED FFX DATA
    //========================

    // Paste FFX binary here (main effect)
    var FFX_DATA = "RIFX\x00\x00\x17TFaFXhead\x00\x00\x00\x10\x00\x00\x00\x03\x00\x00\x00D\x00\x00\x00\x01\x01\x00\x00\x00LIST\x00\x00\x170bescbeso\x00\x00\x008\x00\x00\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00]\xa8\x00\x1d\xf8R\x00\x00\x00\x00\x00d\x00d\x00d\x00d?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xffLIST\x00\x00\x00\xactdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x02LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE Effect Parade\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdsn\x00\x00\x00\x0bRoundabout\x00\x00LIST\x00\x00\x00dtdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x01LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE End of path sentinel\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x15\xb0sspcfnam\x00\x00\x000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\b\xdeparTparn\x00\x00\x00\x04\x00\x00\x00\x0btdmn\x00\x00\x00(Pseudo/JIM Roundabout-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xff\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nInfluence\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00B\xc8\x00\x00\x00\x00\x00\x00B\xc8\x00\x00B\xc8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRadius\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc7\xc3P\x00G\xc3P\x00\x00\x00\x00\x00Dz\x00\x00CH\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0003\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Arc\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01h\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0004\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Start Angle\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0005\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04Orient to Center\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pdnm\x00\x00\x00\x01\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0006\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\r\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0007\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0008\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRandom Offset\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\xc4z\x00\x00Dz\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0009\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Random Rotation\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0010\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRandom Seed\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\x00\x00\x00\x00Dz\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\f\x86tdgptdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0bRoundabout\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x03tdsn\x00\x00\x00\x01\x00\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x02X?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\xc0\xc0\xc0\xff\xc0\xc0\xc0\x00\x00\x00\x00\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(Pseudo/JIM Roundabout-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\nInfluence\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@Y\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x07Radius\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@i\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0003\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd0tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x04Arc\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@v\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0004\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd8tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\fStart Angle\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0005\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdetdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x11Orient to Center\x00\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0006\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xcetdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x01\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0007\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xe4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0bRoundabout\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(Pseudo/JIM Roundabout-0008\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xfatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0eRandom Offset\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\xc0\x8f@\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0009\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdctdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x10Random Rotation\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout-0010\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf8tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\fRandom Seed\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(ADBE Group End\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00{\"controlName\":\"Roundabout\",\"matchname\":\"Pseudo/JIM Roundabout\",\"controlArray\":[{\"name\":\"Influence\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":1129236235,\"hold\":false,\"default\":100,\"sliderMax\":100,\"sliderMin\":0,\"validMax\":100,\"validMin\":0,\"precision\":1,\"percent\":true,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Radius\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":2656080722,\"hold\":false,\"default\":200,\"sliderMax\":1000,\"sliderMin\":0,\"validMax\":100000,\"validMin\":-100000,\"precision\":1,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Arc\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":360,\"keyframes\":true,\"id\":9664937389,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Start Angle\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":7112632524,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Orient to Center\",\"type\":\"checkbox\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"default\":false,\"keyframes\":true,\"id\":5541893801,\"hold\":true,\"label\":\"\",\"error\":[\n\n]},{\"name\":\"\",\"type\":\"label\",\"canHaveKeyframes\":false,\"canBeInvisible\":false,\"invisible\":false,\"keyframes\":false,\"id\":6244832345,\"hold\":false,\"dim\":false,\"error\":[\n\n]},{\"name\":\"EndGroup\",\"type\":\"endLabel\",\"canBeInvisible\":false,\"canHaveKeyframes\":false,\"keyframes\":false,\"hold\":false,\"id\":5366089574,\"labelId\":0,\"error\":[\n\n]},{\"name\":\"Random Offset\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":3861401487,\"hold\":false,\"default\":0,\"sliderMax\":1000,\"sliderMin\":-1000,\"validMax\":10000,\"validMin\":-10000,\"precision\":1,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Random Rotation\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":5744242156,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Random Seed\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":7390251823,\"hold\":false,\"default\":0,\"sliderMax\":1000,\"sliderMin\":0,\"validMax\":10000,\"validMin\":-10000,\"precision\":0,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]}],\"version\":3}";

    // Paste FFX binary here (3D controls effect)
    var FFX_DATA_3D = "RIFX\x00\x00&\x9eFaFXhead\x00\x00\x00\x10\x00\x00\x00\x03\x00\x00\x00D\x00\x00\x00\x01\x01\x00\x00\x00LIST\x00\x00&zbescbeso\x00\x00\x008\x00\x00\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00]\xa8\x00\x1d\xf8R\x00\x00\x00\x00\x00d\x00d\x00d\x00d?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xffLIST\x00\x00\x00\xactdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x02LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE Effect Parade\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdsn\x00\x00\x00\x0eRoundabout 3D\x00LIST\x00\x00\x00dtdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x01LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE End of path sentinel\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00$\xf8sspcfnam\x00\x00\x000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x0f>parTparn\x00\x00\x00\x04\x00\x00\x00\x13tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xff\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\rControls\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nInfluence\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00B\xc8\x00\x00\x00\x00\x00\x00B\xc8\x00\x00B\xc8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0003\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRadius\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc7\xc3P\x00G\xc3P\x00\x00\x00\x00\x00Dz\x00\x00CH\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0004\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Arc\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01h\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0005\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Start Angle\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0006\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Tilt X\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0007\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Tilt Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0008\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04Orient to Center\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pdnm\x00\x00\x00\x01\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0009\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0010\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\rRandomize\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0011\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRandom Offset X\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\xc4z\x00\x00Dz\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0012\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRandom Offset Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\xc4z\x00\x00Dz\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0013\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRandom Offset Z\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\xc4z\x00\x00Dz\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0014\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Random Rotation X\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0015\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Random Rotation Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0016\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x03Random Rotation Z\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0017\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nRandom Seed\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc6\x1c@\x00F\x1c@\x00\x00\x00\x00\x00Dz\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0018\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x15ntdgptdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0eRoundabout 3D\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x03tdsn\x00\x00\x00\x01\x00\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x02X?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\xc0\xc0\xc0\xff\xc0\xc0\xc0\x00\x00\x00\x00\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\tControls\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\nInfluence\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@Y\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0003\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x07Radius\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@i\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0004\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd0tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x04Arc\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@v\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0005\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd8tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\fStart Angle\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0006\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x07Tilt X\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0007\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x07Tilt Y\x00\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0008\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdetdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x11Orient to Center\x00\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0009\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xe6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0eRoundabout 3D\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0010\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\nRandomize\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0011\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xfctdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x10Random Offset X\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\xc0\x8f@\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0012\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xfctdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x10Random Offset Y\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\xc0\x8f@\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0013\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xfctdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x10Random Offset Z\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\xc0\x8f@\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0014\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdetdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x12Random Rotation X\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0015\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdetdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x12Random Rotation Y\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0016\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdetdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x12Random Rotation Z\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0017\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf8tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\fRandom Seed\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@\x8f@\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Roundabout 3D-0018\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xe6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x0eRoundabout 3D\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(ADBE Group End\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00{\"controlName\":\"Roundabout 3D\",\"matchname\":\"Pseudo/JIM Roundabout 3D\",\"controlArray\":[{\"name\":\"Controls\",\"type\":\"group\",\"canHaveKeyframes\":false,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":false,\"id\":5320996153,\"hold\":false,\"children\":[\n\n],\"open\":true,\"error\":[\n\n]},{\"name\":\"Influence\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":1129236235,\"hold\":false,\"default\":100,\"sliderMax\":100,\"sliderMin\":0,\"validMax\":100,\"validMin\":0,\"precision\":1,\"percent\":true,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Radius\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":2656080722,\"hold\":false,\"default\":200,\"sliderMax\":1000,\"sliderMin\":0,\"validMax\":100000,\"validMin\":-100000,\"precision\":1,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Arc\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":360,\"keyframes\":true,\"id\":9664937389,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Start Angle\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":7112632524,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Tilt X\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":2981137149,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Tilt Y\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":4247832001,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Orient to Center\",\"type\":\"checkbox\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"default\":false,\"keyframes\":true,\"id\":5541893801,\"hold\":true,\"label\":\"\",\"error\":[\n\n]},{\"name\":\"EndGroup 3\",\"type\":\"endgroup\",\"canBeInvisible\":false,\"canHaveKeyframes\":false,\"keyframes\":false,\"hold\":false,\"id\":1705985082,\"groupId\":0,\"error\":[\n\n]},{\"name\":\"Randomize\",\"type\":\"group\",\"canHaveKeyframes\":false,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":false,\"id\":4786332397,\"hold\":false,\"children\":[\n\n],\"open\":true,\"error\":[\n\n]},{\"name\":\"Random Offset X\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":3861401487,\"hold\":false,\"default\":0,\"sliderMax\":1000,\"sliderMin\":-1000,\"validMax\":10000,\"validMin\":-10000,\"precision\":1,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Random Offset Y\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":3384699577,\"hold\":false,\"default\":0,\"sliderMax\":1000,\"sliderMin\":-1000,\"validMax\":10000,\"validMin\":-10000,\"precision\":1,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Random Offset Z\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":4410150544,\"hold\":false,\"default\":0,\"sliderMax\":1000,\"sliderMin\":-1000,\"validMax\":10000,\"validMin\":-10000,\"precision\":1,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"Random Rotation X\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":5744242156,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Random Rotation Y\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":1091204903,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Random Rotation Z\",\"type\":\"angle\",\"canHaveKeyframes\":true,\"canBeInvisible\":false,\"default\":0,\"keyframes\":true,\"id\":9874013012,\"hold\":false,\"open\":true,\"error\":[\n\n]},{\"name\":\"Random Seed\",\"type\":\"slider\",\"canHaveKeyframes\":true,\"canBeInvisible\":true,\"invisible\":false,\"keyframes\":true,\"id\":7390251823,\"hold\":false,\"default\":0,\"sliderMax\":1000,\"sliderMin\":0,\"validMax\":10000,\"validMin\":-10000,\"precision\":0,\"percent\":false,\"pixel\":false,\"open\":true,\"errors\":[\n\n],\"error\":[\n\n]},{\"name\":\"EndGroup 1\",\"type\":\"endgroup\",\"canBeInvisible\":false,\"canHaveKeyframes\":false,\"keyframes\":false,\"hold\":false,\"id\":7911529412,\"groupId\":0,\"error\":[\n\n]}],\"version\":3}";


    //========================
    // CONTENT
    //========================

    var CONTENT = {
        buttons: {
            apply: "Create Roundabout Rig",
            getCodeRunner: "Get Code Runner",
            getKbar: "Get Kbar",
            learnMore: "Learn More",
            ok: "OK"
        },
        errors: {
            noComp: "No Composition\n\nPlease open a composition first.",
            noSelection: "No Selection\n\nPlease select at least two layers to distribute,\nor select a Roundabout Controller and layers to add.",
            applyFailed: "Error creating Roundabout rig:\n\n"
        },
        help: {
            title: "How to Use ",
            instructions: [
                "• Select the layers you want to distribute radially",
                "• Click the button to generate the rig",
                "",
                "To add layers to an existing rig:",
                "• Select the Roundabout Controller and new layers",
                "• Click the button again",
                "",
                "To remove layers from a rig:",
                "• Select the layer(s) to remove (not the controller)",
                "• Click the button - they'll be released",
                "",
                "Controller controls:",
                "• Influence: 0% = free positioning, 100% = radial rig",
                "• Radius: Distance from center",
                "• Arc: Degrees of arc to fill (360 = full circle)",
                "• Start Angle: Rotation offset for the distribution",
                "• Orient to Center: Rotate layers to face outward",
                "• Random Offset: Add randomness to layer positions",
                "• Random Rotation: Add randomness to layer rotations",
                "• Random Seed: Change the random pattern",
                "",
                "Works great with tools like Kbar and Code Runner."
            ]
        }
    };

    //========================
    // UTILITY FUNCTIONS
    //========================

    // Custom alert dialog
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
        buttonRow.margins = 4;
        buttonRow.spacing = 8;

        var okButton = buttonRow.add("button", undefined, "OK", { name: "ok" });
        function handleOK() { alertWindow.close(1); }
        okButton.onClick = handleOK;

        alertWindow.layout.layout(true);
        alertWindow.show();
    }

    // Check if a layer is a Roundabout Controller
    function isRadialController(layer) {
        if (!layer.nullLayer) return false;

        // Check if name starts with controller name (handles "Roundabout Controller", "Roundabout Controller 2", etc.)
        if (layer.name.indexOf(CONFIG.controllerName) !== 0) return false;

        // Check for the Roundabout pseudo effect
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) return false;

        // Look for the Roundabout effect (2D or 3D) by name or matchName
        for (var i = 1; i <= effects.numProperties; i++) {
            var effect = effects.property(i);
            if (effect.matchName === CONFIG.effectMatchName || effect.name === CONFIG.effectName ||
                effect.matchName === CONFIG.effect3DMatchName || effect.name === CONFIG.effect3DName) {
                return true;
            }
        }

        return false;
    }

    // Check if a Roundabout controller has the 3D effect
    function isController3D(layer) {
        if (!isRadialController(layer)) return false;

        var effects = layer.property("ADBE Effect Parade");
        if (!effects) return false;

        for (var i = 1; i <= effects.numProperties; i++) {
            var effect = effects.property(i);
            if (effect.matchName === CONFIG.effect3DMatchName || effect.name === CONFIG.effect3DName) {
                return true;
            }
        }

        return false;
    }

    // Find existing Radial Controller in selection
    function findControllerInSelection(layers) {
        for (var i = 0; i < layers.length; i++) {
            if (isRadialController(layers[i])) {
                return layers[i];
            }
        }
        return null;
    }

    // Get all layers parented to a controller (for counting total)
    function getChildLayers(comp, controller) {
        var children = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.parent === controller && layer !== controller) {
                children.push(layer);
            }
        }
        return children;
    }

    // Check if a layer is part of a radial rig (parented to a Radial Controller)
    function isPartOfRadialRig(layer) {
        if (!layer.parent) return false;
        return isRadialController(layer.parent);
    }

    // Find the controller that a layer belongs to
    function findControllerForLayer(layer) {
        if (!layer.parent) return null;
        if (isRadialController(layer.parent)) {
            return layer.parent;
        }
        return null;
    }

    //========================
    // FFX APPLICATION
    //========================

    // Get the FFX file path in userData folder
    function getFFXFilePath() {
        var ffxFolder = Folder.userData.fullName + "/JakeInMotion/Roundabout";
        var folder = new Folder(ffxFolder);
        if (!folder.exists) {
            folder.create();
        }
        return ffxFolder + "/Roundabout.ffx";
    }

    // Write FFX file to userData and apply to layer
    function applyRoundaboutEffect(layer) {
        var ffxFile = new File(getFFXFilePath());

        // Only write the file if it doesn't exist
        if (!ffxFile.exists) {
            ffxFile.encoding = "BINARY";
            ffxFile.open("w");
            ffxFile.write(FFX_DATA);
            ffxFile.close();
        }

        // Apply the effect
        layer.applyPreset(ffxFile);
    }

    // Get the 3D FFX file path in userData folder
    function getFFX3DFilePath() {
        var ffxFolder = Folder.userData.fullName + "/JakeInMotion/Roundabout";
        var folder = new Folder(ffxFolder);
        if (!folder.exists) {
            folder.create();
        }
        return ffxFolder + "/Roundabout 3D.ffx";
    }

    // Write 3D FFX file to userData and apply to layer
    function applyRoundabout3DEffect(layer) {
        // Skip if no 3D effect data is defined
        if (!FFX_DATA_3D || FFX_DATA_3D === "") {
            return;
        }

        var ffxFile = new File(getFFX3DFilePath());

        // Only write the file if it doesn't exist
        if (!ffxFile.exists) {
            ffxFile.encoding = "BINARY";
            ffxFile.open("w");
            ffxFile.write(FFX_DATA_3D);
            ffxFile.close();
        }

        // Apply the effect
        layer.applyPreset(ffxFile);
    }

    // Generate a unique controller name
    function getUniqueControllerName(comp) {
        var baseName = CONFIG.controllerName;
        var existingNames = {};

        // Collect all existing controller names
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.nullLayer && layer.name.indexOf(baseName) === 0) {
                existingNames[layer.name] = true;
            }
        }

        // If base name doesn't exist, use it
        if (!existingNames[baseName]) {
            return baseName;
        }

        // Find the next available number
        var num = 2;
        while (existingNames[baseName + " " + num]) {
            num++;
        }

        return baseName + " " + num;
    }

    // Create the radial controller null
    // centerPos: optional [x, y] position, defaults to comp center
    // make3D: optional boolean, if true the null will be a 3D layer
    function createController(comp, centerPos, make3D) {
        var controller = comp.layers.addNull();
        controller.name = getUniqueControllerName(comp);
        controller.label = 11; // Orange label

        // Make 3D if requested (before setting position)
        if (make3D) {
            controller.threeDLayer = true;
        }

        // Position at specified center or comp center
        var transform = controller.property("ADBE Transform Group");
        var position = transform.property("ADBE Position");
        if (centerPos) {
            position.setValue([centerPos[0], centerPos[1], 0]);
        } else {
            position.setValue([comp.width / 2, comp.height / 2, 0]);
        }

        // Apply the appropriate effect based on 2D/3D
        if (make3D) {
            applyRoundabout3DEffect(controller);
        } else {
            applyRoundaboutEffect(controller);
        }

        return controller;
    }

    // Set position value, handling separated dimensions
    function setPositionValue(transform, x, y, z) {
        var position = transform.property("ADBE Position");
        if (position.dimensionsSeparated) {
            var posX = transform.property("ADBE Position_0");
            var posY = transform.property("ADBE Position_1");
            posX.setValue(x);
            posY.setValue(y);
            if (z !== undefined) {
                var posZ = transform.property("ADBE Position_2");
                if (posZ) posZ.setValue(z);
            }
        } else {
            if (z !== undefined) {
                position.setValue([x, y, z]);
            } else {
                position.setValue([x, y]);
            }
        }
    }

    // Convert a position expression for use with separated dimensions
    // Takes the full position expression and extracts just one axis
    function buildSeparatedAxisExpression(fullExpr, axis, is3D) {
        // Build value reconstruction for separated dimensions
        var valueReconstruct = "";
        valueReconstruct += "var _baseX = thisProperty.propertyGroup(1)(\"X Position\").value;\n";
        valueReconstruct += "var _baseY = thisProperty.propertyGroup(1)(\"Y Position\").value;\n";
        if (is3D) {
            valueReconstruct += "var _baseZ = thisProperty.propertyGroup(1)(\"Z Position\").value;\n";
            valueReconstruct += "var _fullValue = [_baseX, _baseY, _baseZ];\n";
        } else {
            valueReconstruct += "var _fullValue = [_baseX, _baseY];\n";
        }

        // Replace 'value' with '_fullValue' in the expression
        // Use word boundary matching to avoid replacing 'value' inside other words
        var modifiedExpr = fullExpr.replace(/\bvalue\b/g, "_fullValue");

        // Find the last line (the output) and extract the axis component
        var lastSemicolon = modifiedExpr.lastIndexOf(";");
        var beforeLast = modifiedExpr.substring(0, lastSemicolon);
        var lastStatement = modifiedExpr.substring(lastSemicolon + 1).trim();

        // If there's content after the last semicolon, that's the return value
        if (lastStatement) {
            modifiedExpr = beforeLast + ";\n(" + lastStatement + ")[" + axis + "]";
        } else {
            // Find the last non-empty line
            var lines = beforeLast.split("\n");
            var lastLine = "";
            for (var i = lines.length - 1; i >= 0; i--) {
                if (lines[i].trim()) {
                    lastLine = lines[i];
                    lines[i] = "(" + lines[i].replace(/;$/, "") + ")[" + axis + "]";
                    break;
                }
            }
            modifiedExpr = lines.join("\n");
        }

        return valueReconstruct + modifiedExpr;
    }

    // Set position expression, handling separated dimensions
    function setPositionExpression(transform, expression, is3D) {
        var position = transform.property("ADBE Position");
        if (position.dimensionsSeparated) {
            var posX = transform.property("ADBE Position_0");
            var posY = transform.property("ADBE Position_1");
            posX.expression = buildSeparatedAxisExpression(expression, 0, is3D);
            posY.expression = buildSeparatedAxisExpression(expression, 1, is3D);
            if (is3D) {
                var posZ = transform.property("ADBE Position_2");
                if (posZ) posZ.expression = buildSeparatedAxisExpression(expression, 2, is3D);
            }
        } else {
            position.expression = expression;
        }
    }

    // Clear position expression, handling separated dimensions
    function clearPositionExpression(transform, is3D) {
        var position = transform.property("ADBE Position");
        if (position.dimensionsSeparated) {
            var posX = transform.property("ADBE Position_0");
            var posY = transform.property("ADBE Position_1");
            posX.expression = "";
            posY.expression = "";
            if (is3D) {
                var posZ = transform.property("ADBE Position_2");
                if (posZ) posZ.expression = "";
            }
        } else {
            position.expression = "";
        }
    }

    // Calculate average center of layers' anchor points in comp space
    function getAverageLayerCenter(layers) {
        if (!layers || layers.length === 0) return null;

        var totalX = 0;
        var totalY = 0;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var transform = layer.property("ADBE Transform Group");
            var anchorPoint = transform.property("ADBE Anchor Point");
            var ap = anchorPoint.value;
            var ap2D = [ap[0], ap[1]];

            // Get anchor point position in comp space
            var compPos = layer.sourcePointToComp(ap2D);
            totalX += compPos[0];
            totalY += compPos[1];
        }

        return [totalX / layers.length, totalY / layers.length];
    }

    //========================
    // EXPRESSION BUILDERS
    //========================

    // Build position expression for radial distribution
    // Uses 'value' (the property's keyframeable value) as the 0% influence base
    function buildPositionExpression(layerSeed, is3D) {
        var e = CONFIG.effectName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var radius = fx(\"Radius\");\n";
        expr += "var arc = fx(\"Arc\");\n";
        expr += "var startAngle = fx(\"Start Angle\");\n";
        expr += "var randomOffset = fx(\"Random Offset\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var siblings = [];\n";
        expr += "for (var i = 1; i <= thisComp.numLayers; i++) {\n";
        expr += "    var lyr = thisComp.layer(i);\n";
        expr += "    if (lyr.hasParent && lyr.parent.index == ctrl.index && lyr.index != ctrl.index) {\n";
        expr += "        siblings.push(lyr.index);\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "siblings.sort(function(a, b) { return a - b; });\n";
        expr += "\n";
        expr += "var totalLayers = siblings.length;\n";
        expr += "var myIndex = 0;\n";
        expr += "for (var j = 0; j < siblings.length; j++) {\n";
        expr += "    if (siblings[j] == thisLayer.index) {\n";
        expr += "        myIndex = j;\n";
        expr += "        break;\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "\n";
        expr += "var blend = Math.max(0, Math.min(1, (arc - 270) / 90));\n";
        expr += "var angleStep = (totalLayers > 1) ? arc / (totalLayers - 1 + blend) : 0;\n";
        expr += "var angle = degreesToRadians(startAngle + (myIndex * angleStep));\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed, true);\n";
        expr += "var randOffset = (random() - 0.5) * 2 * randomOffset;\n";
        expr += "var finalRadius = radius + randOffset;\n";
        expr += "\n";
        expr += "var radialX = Math.cos(angle) * finalRadius;\n";
        expr += "var radialY = Math.sin(angle) * finalRadius;\n";
        expr += "\n";
        expr += "if (thisLayer.threeDLayer) {\n";
        expr += "    seedRandom(randomSeed + layerSeed + 100, true);\n";
        expr += "    var randZ = (random() - 0.5) * 2 * randomOffset;\n";
        expr += "    var radialPos = [radialX, radialY, randZ];\n";
        expr += "} else {\n";
        expr += "    var radialPos = [radialX, radialY];\n";
        expr += "}\n";
        expr += "linear(influence, 0, 1, value, radialPos);";

        return expr;
    }

    // Build rotation expression for orient to center
    // Uses 'value' (the property's keyframeable value) as the 0% influence base
    function buildRotationExpression(layerSeed) {
        var e = CONFIG.effectName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var arc = fx(\"Arc\");\n";
        expr += "var startAngle = fx(\"Start Angle\");\n";
        expr += "var orient = fx(\"Orient to Center\");\n";
        expr += "var randomRotation = fx(\"Random Rotation\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var siblings = [];\n";
        expr += "for (var i = 1; i <= thisComp.numLayers; i++) {\n";
        expr += "    var lyr = thisComp.layer(i);\n";
        expr += "    if (lyr.hasParent && lyr.parent.index == ctrl.index && lyr.index != ctrl.index) {\n";
        expr += "        siblings.push(lyr.index);\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "siblings.sort(function(a, b) { return a - b; });\n";
        expr += "\n";
        expr += "var totalLayers = siblings.length;\n";
        expr += "var myIndex = 0;\n";
        expr += "for (var j = 0; j < siblings.length; j++) {\n";
        expr += "    if (siblings[j] == thisLayer.index) {\n";
        expr += "        myIndex = j;\n";
        expr += "        break;\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "\n";
        expr += "var blend = Math.max(0, Math.min(1, (arc - 270) / 90));\n";
        expr += "var angleStep = (totalLayers > 1) ? arc / (totalLayers - 1 + blend) : 0;\n";
        expr += "var radialAngle = startAngle + (myIndex * angleStep) + 90;\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed, true);\n";
        expr += "var randRot = (random() - 0.5) * 2 * randomRotation;\n";
        expr += "\n";
        expr += "var targetRot = (orient == 1) ? radialAngle + randRot + value : value + randRot;\n";
        expr += "linear(influence, 0, 1, value, targetRot);";

        return expr;
    }

    // Build X rotation expression for 3D layers (random rotation only)
    // Uses 'value' (the property's keyframeable value) as the 0% influence base
    function buildXRotationExpression(layerSeed) {
        var e = CONFIG.effectName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var randomRotation = fx(\"Random Rotation\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed + 200, true);\n";
        expr += "var randRot = (random() - 0.5) * 2 * randomRotation;\n";
        expr += "\n";
        expr += "linear(influence, 0, 1, value, value + randRot);";

        return expr;
    }

    // Build Y rotation expression for 3D layers (random rotation only)
    // Uses 'value' (the property's keyframeable value) as the 0% influence base
    function buildYRotationExpression(layerSeed) {
        var e = CONFIG.effectName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var randomRotation = fx(\"Random Rotation\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed + 300, true);\n";
        expr += "var randRot = (random() - 0.5) * 2 * randomRotation;\n";
        expr += "\n";
        expr += "linear(influence, 0, 1, value, value + randRot);";

        return expr;
    }

    //========================
    // 3D EXPRESSION BUILDERS
    //========================

    // Build 3D position expression with Tilt X/Y support
    function build3DPositionExpression(layerSeed) {
        var e = CONFIG.effect3DName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var radius = fx(\"Radius\");\n";
        expr += "var arc = fx(\"Arc\");\n";
        expr += "var startAngle = fx(\"Start Angle\");\n";
        expr += "var tiltX = degreesToRadians(fx(\"Tilt X\"));\n";
        expr += "var tiltY = degreesToRadians(fx(\"Tilt Y\"));\n";
        expr += "var randomOffsetX = fx(\"Random Offset X\");\n";
        expr += "var randomOffsetY = fx(\"Random Offset Y\");\n";
        expr += "var randomOffsetZ = fx(\"Random Offset Z\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var siblings = [];\n";
        expr += "for (var i = 1; i <= thisComp.numLayers; i++) {\n";
        expr += "    var lyr = thisComp.layer(i);\n";
        expr += "    if (lyr.hasParent && lyr.parent.index == ctrl.index && lyr.index != ctrl.index) {\n";
        expr += "        siblings.push(lyr.index);\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "siblings.sort(function(a, b) { return a - b; });\n";
        expr += "\n";
        expr += "var totalLayers = siblings.length;\n";
        expr += "var myIndex = 0;\n";
        expr += "for (var j = 0; j < siblings.length; j++) {\n";
        expr += "    if (siblings[j] == thisLayer.index) {\n";
        expr += "        myIndex = j;\n";
        expr += "        break;\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "\n";
        expr += "var blend = Math.max(0, Math.min(1, (arc - 270) / 90));\n";
        expr += "var angleStep = (totalLayers > 1) ? arc / (totalLayers - 1 + blend) : 0;\n";
        expr += "var angle = degreesToRadians(startAngle + (myIndex * angleStep));\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "\n";
        expr += "// Calculate base position on the circle (in XY plane)\n";
        expr += "var baseX = Math.cos(angle) * radius;\n";
        expr += "var baseY = Math.sin(angle) * radius;\n";
        expr += "var baseZ = 0;\n";
        expr += "\n";
        expr += "// Apply Tilt X (rotation around X axis - tilts forward/back)\n";
        expr += "var y1 = baseY * Math.cos(tiltX) - baseZ * Math.sin(tiltX);\n";
        expr += "var z1 = baseY * Math.sin(tiltX) + baseZ * Math.cos(tiltX);\n";
        expr += "var x1 = baseX;\n";
        expr += "\n";
        expr += "// Apply Tilt Y (rotation around Y axis - tilts left/right)\n";
        expr += "var x2 = x1 * Math.cos(tiltY) + z1 * Math.sin(tiltY);\n";
        expr += "var z2 = -x1 * Math.sin(tiltY) + z1 * Math.cos(tiltY);\n";
        expr += "var y2 = y1;\n";
        expr += "\n";
        expr += "// Add per-axis random offsets\n";
        expr += "seedRandom(randomSeed + layerSeed, true);\n";
        expr += "var randX = (random() - 0.5) * 2 * randomOffsetX;\n";
        expr += "seedRandom(randomSeed + layerSeed + 100, true);\n";
        expr += "var randY = (random() - 0.5) * 2 * randomOffsetY;\n";
        expr += "seedRandom(randomSeed + layerSeed + 200, true);\n";
        expr += "var randZ = (random() - 0.5) * 2 * randomOffsetZ;\n";
        expr += "\n";
        expr += "var radialPos = [x2 + randX, y2 + randY, z2 + randZ];\n";
        expr += "linear(influence, 0, 1, value, radialPos);";

        return expr;
    }

    // Build 3D X rotation expression (Orient to Center rotates to face the null)
    function build3DXRotationExpression(layerSeed) {
        var e = CONFIG.effect3DName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var tiltX = fx(\"Tilt X\");\n";
        expr += "var orient = fx(\"Orient to Center\");\n";
        expr += "var randomRotationX = fx(\"Random Rotation X\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed + 300, true);\n";
        expr += "var randRot = (random() - 0.5) * 2 * randomRotationX;\n";
        expr += "\n";
        expr += "// Orient to Center: rotate to face the null (compensate for tilt)\n";
        expr += "var orientRot = (orient == 1) ? tiltX : 0;\n";
        expr += "var targetRot = value + orientRot + randRot;\n";
        expr += "linear(influence, 0, 1, value, targetRot);";

        return expr;
    }

    // Build 3D Y rotation expression (Orient to Center rotates to face the null)
    function build3DYRotationExpression(layerSeed) {
        var e = CONFIG.effect3DName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var tiltY = fx(\"Tilt Y\");\n";
        expr += "var orient = fx(\"Orient to Center\");\n";
        expr += "var randomRotationY = fx(\"Random Rotation Y\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed + 400, true);\n";
        expr += "var randRot = (random() - 0.5) * 2 * randomRotationY;\n";
        expr += "\n";
        expr += "// Orient to Center: rotate to face the null (compensate for tilt)\n";
        expr += "var orientRot = (orient == 1) ? tiltY : 0;\n";
        expr += "var targetRot = value + orientRot + randRot;\n";
        expr += "linear(influence, 0, 1, value, targetRot);";

        return expr;
    }

    // Build 3D Z rotation expression (includes Orient to Center)
    function build3DZRotationExpression(layerSeed) {
        var e = CONFIG.effect3DName;
        var expr = "";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var fx = ctrl.effect(\"" + e + "\");\n";
        expr += "var influence = fx(\"Influence\") / 100;\n";
        expr += "var arc = fx(\"Arc\");\n";
        expr += "var startAngle = fx(\"Start Angle\");\n";
        expr += "var orient = fx(\"Orient to Center\");\n";
        expr += "var randomRotationZ = fx(\"Random Rotation Z\");\n";
        expr += "var randomSeed = fx(\"Random Seed\");\n";
        expr += "\n";
        expr += "var siblings = [];\n";
        expr += "for (var i = 1; i <= thisComp.numLayers; i++) {\n";
        expr += "    var lyr = thisComp.layer(i);\n";
        expr += "    if (lyr.hasParent && lyr.parent.index == ctrl.index && lyr.index != ctrl.index) {\n";
        expr += "        siblings.push(lyr.index);\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "siblings.sort(function(a, b) { return a - b; });\n";
        expr += "\n";
        expr += "var totalLayers = siblings.length;\n";
        expr += "var myIndex = 0;\n";
        expr += "for (var j = 0; j < siblings.length; j++) {\n";
        expr += "    if (siblings[j] == thisLayer.index) {\n";
        expr += "        myIndex = j;\n";
        expr += "        break;\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "\n";
        expr += "var blend = Math.max(0, Math.min(1, (arc - 270) / 90));\n";
        expr += "var angleStep = (totalLayers > 1) ? arc / (totalLayers - 1 + blend) : 0;\n";
        expr += "var radialAngle = startAngle + (myIndex * angleStep) + 90;\n";
        expr += "\n";
        expr += "var layerSeed = " + layerSeed + ";\n";
        expr += "seedRandom(randomSeed + layerSeed + 500, true);\n";
        expr += "var randRot = (random() - 0.5) * 2 * randomRotationZ;\n";
        expr += "\n";
        expr += "var targetRot = (orient == 1) ? radialAngle + randRot + value : value + randRot;\n";
        expr += "linear(influence, 0, 1, value, targetRot);";

        return expr;
    }

    //========================
    // VALIDATION
    //========================

    var ValidationManager = {
        validateEnvironment: function() {
            var activeComp = app.project.activeItem;

            if (!activeComp || !(activeComp instanceof CompItem)) {
                return {
                    success: false,
                    message: CONTENT.errors.noComp
                };
            }

            var selectedLayers = activeComp.selectedLayers;
            if (!selectedLayers || selectedLayers.length === 0) {
                return {
                    success: false,
                    message: CONTENT.errors.noSelection
                };
            }

            // Check if we need at least 2 layers (for creating new rig)
            // Single layer is OK if it's already in a rig (for removal)
            if (selectedLayers.length === 1) {
                var singleLayer = selectedLayers[0];
                if (!isPartOfRadialRig(singleLayer) && !isRadialController(singleLayer)) {
                    return {
                        success: false,
                        message: CONTENT.errors.noSelection
                    };
                }
            }

            return {
                success: true,
                layers: selectedLayers,
                comp: activeComp
            };
        }
    };

    //========================
    // CORE FUNCTIONALITY
    //========================

    var RadialEngine = {
        // Remove layers from a radial rig
        removeFromRig: function(comp, layers) {
            var removedCount = 0;

            // PHASE 1: Collect visual positions for all layers BEFORE changing anything
            var layerData = [];
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                if (isPartOfRadialRig(layer)) {
                    var transform = layer.property("ADBE Transform Group");
                    var anchorPoint = transform.property("ADBE Anchor Point");
                    var rotation = transform.property("ADBE Rotate Z");

                    // Get the visual position in comp space using sourcePointToComp
                    // Note: scripting API only takes point (2D), evaluates at current time
                    var ap = anchorPoint.value;
                    var ap2D = [ap[0], ap[1]]; // sourcePointToComp needs 2D point
                    var compPos = layer.sourcePointToComp(ap2D);

                    // Calculate world rotation by walking up parent chain
                    var worldRot = 0;
                    var current = layer;
                    while (current) {
                        var currentRot = current.property("ADBE Transform Group").property("ADBE Rotate Z");
                        try {
                            worldRot += currentRot.valueAtTime(comp.time, false);
                        } catch (e) {
                            worldRot += currentRot.value;
                        }
                        current = current.parent;
                    }

                    layerData.push({
                        layer: layer,
                        compPos: compPos,
                        worldRot: worldRot,
                        is3D: compPos.length > 2
                    });
                }
            }

            // PHASE 2: Remove expressions and parenting
            for (var j = 0; j < layerData.length; j++) {
                var data = layerData[j];
                var layerTransform = data.layer.property("ADBE Transform Group");
                var layerRotation = layerTransform.property("ADBE Rotate Z");

                // Remove expressions (handles separated dimensions)
                clearPositionExpression(layerTransform, data.layer.threeDLayer);
                layerRotation.expression = "";

                // Remove X and Y rotation expressions for 3D layers
                if (data.layer.threeDLayer) {
                    var layerRotationX = layerTransform.property("ADBE Rotate X");
                    var layerRotationY = layerTransform.property("ADBE Rotate Y");
                    layerRotationX.expression = "";
                    layerRotationY.expression = "";
                }

                // Unparent
                data.layer.parent = null;
            }

            // PHASE 3: Set the visual positions
            for (var k = 0; k < layerData.length; k++) {
                var posData = layerData[k];
                var posTransform = posData.layer.property("ADBE Transform Group");
                var posRotation = posTransform.property("ADBE Rotate Z");

                // Set position to maintain visual location (handles separated dimensions)
                if (posData.is3D) {
                    setPositionValue(posTransform, posData.compPos[0], posData.compPos[1], posData.compPos[2]);
                } else {
                    setPositionValue(posTransform, posData.compPos[0], posData.compPos[1]);
                }

                // Set rotation to maintain visual rotation
                posRotation.setValue(posData.worldRot);

                removedCount++;
            }

            return removedCount;
        },

        createRig: function(comp, layers) {
            // Check if selection includes an existing controller
            var existingController = findControllerInSelection(layers);

            // Filter out controller from layers to process
            var layersToProcess = [];
            var layersAlreadyInRig = [];

            for (var i = 0; i < layers.length; i++) {
                if (isRadialController(layers[i])) {
                    // Skip controllers
                    continue;
                } else if (isPartOfRadialRig(layers[i])) {
                    // Layer is already in a rig
                    layersAlreadyInRig.push(layers[i]);
                } else {
                    // New layer to add
                    layersToProcess.push(layers[i]);
                }
            }

            // If ALL selected layers are already in a rig (and no controller selected),
            // remove them from the rig instead
            if (layersToProcess.length === 0 && layersAlreadyInRig.length > 0 && !existingController) {
                return this.removeFromRig(comp, layersAlreadyInRig);
            }

            // If layers are already in a rig AND a different controller is selected,
            // transfer them to the new rig
            if (layersAlreadyInRig.length > 0 && existingController) {
                // Check if any layers belong to a different rig than the selected controller
                var layersToTransfer = [];
                for (var t = 0; t < layersAlreadyInRig.length; t++) {
                    var rigLayer = layersAlreadyInRig[t];
                    if (rigLayer.parent !== existingController) {
                        layersToTransfer.push(rigLayer);
                    }
                }

                // Transfer layers from other rigs to this one
                if (layersToTransfer.length > 0) {
                    // First remove from old rig (preserves visual position)
                    this.removeFromRig(comp, layersToTransfer);
                    // Add them to layers to process for the new rig
                    for (var u = 0; u < layersToTransfer.length; u++) {
                        layersToProcess.push(layersToTransfer[u]);
                    }
                }
            }

            if (layersToProcess.length === 0 && existingController) {
                throw new Error("No new layers to add to rig.");
            }

            if (layersToProcess.length === 0) {
                throw new Error("No layers to add to rig (only controller selected).");
            }

            var controller;
            var indexOffset = 0;

            if (existingController) {
                // Use existing controller
                controller = existingController;
            } else {
                // Calculate average center of selected layers
                var centerPos = getAverageLayerCenter(layersToProcess);

                // Check if all layers are 3D
                var allLayers3D = true;
                for (var a = 0; a < layersToProcess.length; a++) {
                    if (!layersToProcess[a].threeDLayer) {
                        allLayers3D = false;
                        break;
                    }
                }

                // Collect layer indices BEFORE creating controller
                var layerIndices = [];
                for (var j = 0; j < layersToProcess.length; j++) {
                    layerIndices.push(layersToProcess[j].index);
                }

                // Create the controller null at the average center
                // This shifts all other layer indices by 1
                controller = createController(comp, centerPos, allLayers3D);
                indexOffset = 1;

                // Update layersToProcess to use adjusted indices
                layersToProcess = [];
                for (var k = 0; k < layerIndices.length; k++) {
                    layersToProcess.push(comp.layer(layerIndices[k] + indexOffset));
                }
            }

            // Sort layers by index (lower index = closer to controller = first in distribution)
            layersToProcess.sort(function(a, b) {
                return a.index - b.index;
            });

            // Get controller position for calculating relative positions
            var ctrlTransform = controller.property("ADBE Transform Group");
            var ctrlPosition = ctrlTransform.property("ADBE Position");
            var ctrlRotation = ctrlTransform.property("ADBE Rotate Z");
            var ctrlPos = ctrlPosition.value;
            var ctrlRot = ctrlRotation.value;
            var ctrlRadians = -ctrlRot * Math.PI / 180;  // Negative to reverse the rotation
            var ctrlCos = Math.cos(ctrlRadians);
            var ctrlSin = Math.sin(ctrlRadians);

            // PHASE 1: Collect data and parent all layers first
            var layerData = [];
            for (var m = 0; m < layersToProcess.length; m++) {
                var layer = layersToProcess[m];

                // Generate a unique seed for this layer's random offset
                var layerSeed = m * 1000 + Math.round(Math.random() * 999);

                // Get the layer's current world position and rotation BEFORE parenting
                var transform = layer.property("ADBE Transform Group");
                var position = transform.property("ADBE Position");
                var rotation = transform.property("ADBE Rotate Z");
                var worldPos = position.value;
                var worldRot = rotation.value;

                // Calculate position relative to controller (accounting for controller's rotation)
                var relX = worldPos[0] - ctrlPos[0];
                var relY = worldPos[1] - ctrlPos[1];
                var baseX = relX * ctrlCos - relY * ctrlSin;
                var baseY = relX * ctrlSin + relY * ctrlCos;
                var is3D = layer.threeDLayer;

                // Calculate rotation relative to controller
                var baseRot = worldRot - ctrlRot;

                // Store data for phase 2
                layerData.push({
                    layer: layer,
                    layerSeed: layerSeed,
                    baseX: baseX,
                    baseY: baseY,
                    baseRot: baseRot,
                    is3D: is3D
                });

                // Parent to controller
                layer.parent = controller;

                // Set position to relative position (handles separated dimensions)
                if (is3D) {
                    setPositionValue(transform, baseX, baseY, 0);
                } else {
                    setPositionValue(transform, baseX, baseY);
                }

                // Set rotation to relative rotation (this becomes 'value' in expressions)
                rotation.setValue(baseRot);
            }

            // PHASE 2: Apply expressions after all layers are parented
            // Check if this is a 3D rig (controller has the 3D effect)
            var is3DRig = isController3D(controller);

            for (var p = 0; p < layerData.length; p++) {
                var data = layerData[p];
                var layerTransform = data.layer.property("ADBE Transform Group");
                var layerRotationZ = layerTransform.property("ADBE Rotate Z");

                if (is3DRig) {
                    // Apply 3D expressions (with Tilt X/Y and per-axis random offsets/rotations)
                    var posExpr3D = build3DPositionExpression(data.layerSeed);
                    setPositionExpression(layerTransform, posExpr3D, data.is3D);

                    var layerRotationX = layerTransform.property("ADBE Rotate X");
                    var layerRotationY = layerTransform.property("ADBE Rotate Y");

                    var rotXExpr3D = build3DXRotationExpression(data.layerSeed);
                    var rotYExpr3D = build3DYRotationExpression(data.layerSeed);
                    var rotZExpr3D = build3DZRotationExpression(data.layerSeed);

                    layerRotationX.expression = rotXExpr3D;
                    layerRotationY.expression = rotYExpr3D;
                    layerRotationZ.expression = rotZExpr3D;
                } else {
                    // Apply 2D expressions (handles separated dimensions)
                    var posExpr = buildPositionExpression(data.layerSeed, data.is3D);
                    setPositionExpression(layerTransform, posExpr, data.is3D);

                    var rotZExpr = buildRotationExpression(data.layerSeed);
                    layerRotationZ.expression = rotZExpr;

                    // Apply X and Y rotation expressions for 3D layers (uses 2D effect's random rotation)
                    if (data.is3D) {
                        var layerRotX = layerTransform.property("ADBE Rotate X");
                        var layerRotY = layerTransform.property("ADBE Rotate Y");

                        var rotXExpr = buildXRotationExpression(data.layerSeed);
                        var rotYExpr = buildYRotationExpression(data.layerSeed);

                        layerRotX.expression = rotXExpr;
                        layerRotY.expression = rotYExpr;
                    }
                }
            }

            // Select the controller
            for (var n = 1; n <= comp.numLayers; n++) {
                comp.layer(n).selected = false;
            }
            controller.selected = true;

            return layersToProcess.length;
        }
    };

    //========================
    // EVENT HANDLERS
    //========================

    function applyButtonHandler() {
        var validation = ValidationManager.validateEnvironment();
        if (!validation.success) {
            showAlert(CONFIG.name, validation.message);
            return;
        }

        app.beginUndoGroup(CONFIG.name);
        try {
            RadialEngine.createRig(validation.comp, validation.layers);
        } catch (error) {
            showAlert(CONFIG.name, CONTENT.errors.applyFailed + error.message);
        } finally {
            app.endUndoGroup();
        }
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

        var titleText = helpDialog.add("statictext", undefined, "How to Use " + CONFIG.name);
        titleText.alignment = ["center", "top"];

        // Create a Rig panel
        var createPanel = helpDialog.add("panel", undefined, "Create a Rig");
        createPanel.orientation = "column";
        createPanel.alignChildren = ["fill", "top"];
        createPanel.spacing = 4;
        createPanel.margins = 12;

        createPanel.add("statictext", undefined, "Select the layers you want to distribute radially.");
        createPanel.add("statictext", undefined, "Click the button to generate the rig.");

        // Modify Rig panel
        var modifyPanel = helpDialog.add("panel", undefined, "Modify Rig");
        modifyPanel.orientation = "column";
        modifyPanel.alignChildren = ["fill", "top"];
        modifyPanel.spacing = 4;
        modifyPanel.margins = 12;

        modifyPanel.add("statictext", undefined, "Add layers: Select controller + new layers, click button.");
        modifyPanel.add("statictext", undefined, "Remove layers: Select rigged layers (not controller), click button.");

        // Controller Controls panel
        var controlsPanel = helpDialog.add("panel", undefined, "Controller Controls");
        controlsPanel.orientation = "column";
        controlsPanel.alignChildren = ["fill", "top"];
        controlsPanel.spacing = 4;
        controlsPanel.margins = 12;

        controlsPanel.add("statictext", undefined, "Influence: 0% = free positioning, 100% = radial rig.");
        controlsPanel.add("statictext", undefined, "Radius, Arc, Start Angle: Shape the distribution.");
        controlsPanel.add("statictext", undefined, "Orient to Center: Rotate layers to face outward.");
        controlsPanel.add("statictext", undefined, "Random Offset/Rotation/Seed: Add variation.");

        var toolsText = helpDialog.add("statictext", undefined, "Works great with tools like KBar and Code Runner.");
        toolsText.alignment = ["center", "top"];

        // Button row (4px padding for focus highlight)
        var buttonGroup = helpDialog.add("group");
        buttonGroup.orientation = "row";
        buttonGroup.alignment = ["center", "top"];
        buttonGroup.alignChildren = ["center", "center"];
        buttonGroup.spacing = 8;
        buttonGroup.margins = [4, 8, 4, 4];

        var codeRunnerBtn = buttonGroup.add("button", undefined, CONTENT.buttons.getCodeRunner);
        var kbarBtn = buttonGroup.add("button", undefined, CONTENT.buttons.getKbar);
        var learnMoreBtn = buttonGroup.add("button", undefined, CONTENT.buttons.learnMore);
        var okBtn = buttonGroup.add("button", undefined, CONTENT.buttons.ok);

        function handleCodeRunnerClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.codeRunner);
                } else {
                    system.callSystem("open " + CONFIG.urls.codeRunner);
                }
            } catch (error) {
                showAlert(CONFIG.name, "Cannot open URL automatically. Please visit:\n" + CONFIG.urls.codeRunner);
            }
        }

        function handleKbarClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.kbar);
                } else {
                    system.callSystem("open " + CONFIG.urls.kbar);
                }
            } catch (error) {
                showAlert(CONFIG.name, "Cannot open URL automatically. Please visit:\n" + CONFIG.urls.kbar);
            }
        }

        function handleLearnMoreClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.website);
                } else {
                    system.callSystem("open " + CONFIG.urls.website);
                }
            } catch (error) {
                showAlert(CONFIG.name, "Cannot open URL automatically. Please visit:\n" + CONFIG.urls.website);
            }
        }

        function handleHelpOkClick() {
            helpDialog.close();
        }

        codeRunnerBtn.onClick = handleCodeRunnerClick;
        kbarBtn.onClick = handleKbarClick;
        learnMoreBtn.onClick = handleLearnMoreClick;
        okBtn.onClick = handleHelpOkClick;

        helpDialog.show();
    }

    //========================
    // ICON BUTTON SYSTEM
    //========================

    // Generate corner arc points (approximates curve with straight segments)
    function generateCornerArc(cx, cy, r, startAngle, numPoints) {
        var points = [];
        var angleStep = (Math.PI / 2) / (numPoints - 1);

        for (var i = 0; i < numPoints; i++) {
            var angle = startAngle + i * angleStep;
            points.push([
                cx + Math.cos(angle) * r,
                cy + Math.sin(angle) * r
            ]);
        }

        return points;
    }

    // Generate radial icon coordinates (8 rounded squares in a circle)
    // Returns array of path segments, each segment is array of [x,y] points
    function generateRadialIconData(size) {
        var segments = [];
        var cx = size / 2;
        var cy = size / 2;
        var radius = size * 0.35;
        var squareSize = size * 0.2;
        var r = squareSize * 0.3; // corner radius
        var numSquares = 8;
        var cornerPoints = 4; // points per corner for smoothness

        for (var i = 0; i < numSquares; i++) {
            var angle = (i / numSquares) * Math.PI * 2 - Math.PI / 2;
            var sqCenterX = cx + Math.cos(angle) * radius;
            var sqCenterY = cy + Math.sin(angle) * radius;
            var x = sqCenterX - squareSize / 2;
            var y = sqCenterY - squareSize / 2;
            var w = squareSize;
            var h = squareSize;

            var segment = [];

            // Top edge (left to right)
            segment.push([x + r, y]);
            segment.push([x + w - r, y]);

            // Top-right corner (arc from top to right)
            var tr = generateCornerArc(x + w - r, y + r, r, -Math.PI / 2, cornerPoints);
            for (var j = 0; j < tr.length; j++) { segment.push(tr[j]); }

            // Right edge (top to bottom)
            segment.push([x + w, y + h - r]);

            // Bottom-right corner (arc from right to bottom)
            var br = generateCornerArc(x + w - r, y + h - r, r, 0, cornerPoints);
            for (var k = 0; k < br.length; k++) { segment.push(br[k]); }

            // Bottom edge (right to left)
            segment.push([x + r, y + h]);

            // Bottom-left corner (arc from bottom to left)
            var bl = generateCornerArc(x + r, y + h - r, r, Math.PI / 2, cornerPoints);
            for (var m = 0; m < bl.length; m++) { segment.push(bl[m]); }

            // Left edge (bottom to top)
            segment.push([x, y + r]);

            // Top-left corner (arc from left to top)
            var tl = generateCornerArc(x + r, y + r, r, Math.PI, cornerPoints);
            for (var n = 0; n < tl.length; n++) { segment.push(tl[n]); }

            segments.push(segment);
        }

        return segments;
    }

    // Scale icon coordinates to fit desired size
    function scaleIconCoordinates(iconData, baseSize, targetSize) {
        var scale = targetSize / baseSize;
        var scaled = [];

        for (var i = 0; i < iconData.length; i++) {
            var segment = iconData[i];
            var scaledSegment = [];

            for (var j = 0; j < segment.length; j++) {
                scaledSegment.push([
                    segment[j][0] * scale,
                    segment[j][1] * scale
                ]);
            }
            scaled.push(scaledSegment);
        }

        return scaled;
    }

    // Brand colors for hover state - alternating orange and blue
    var BRAND_ORANGE = [0.93, 0.34, 0.19, 1];  // #ee5730
    var BRAND_BLUE = [0.16, 0.56, 0.95, 1];    // #2890f2
    var HOVER_COLORS = [
        BRAND_ORANGE, BRAND_BLUE, BRAND_ORANGE, BRAND_BLUE,
        BRAND_ORANGE, BRAND_BLUE, BRAND_ORANGE, BRAND_BLUE
    ];

    // Custom onDraw handler for icon button
    function drawRadialIconButton() {
        var g = this.graphics;
        var w = this.size[0];
        var h = this.size[1];

        // Draw OS button background
        g.drawOSControl();

        // Draw button background
        g.rectPath(0, 0, w, h);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, this.bgColor));

        // Draw border
        g.strokePath(g.newPen(g.PenType.SOLID_COLOR, this.strokeColor, 1));

        // Center the fixed-size icon in the button
        var iconX = (w - this.iconSize) / 2;
        var iconY = (h - this.iconSize) / 2;

        // Use pre-scaled coordinates
        var coords = this.iconCoords;

        // Draw each rounded square with its own color
        for (var i = 0; i < coords.length; i++) {
            var segment = coords[i];
            g.newPath();
            g.moveTo(segment[0][0] + iconX, segment[0][1] + iconY);

            for (var j = 1; j < segment.length; j++) {
                g.lineTo(segment[j][0] + iconX, segment[j][1] + iconY);
            }

            // Use brand colors on hover, gray on idle
            var squareColor = this.isHovered ? HOVER_COLORS[i % HOVER_COLORS.length] : this.iconColor;
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, squareColor));
        }
    }

    // Mouse handlers for icon button
    function handleIconButtonMouseOver() {
        this.isHovered = true;
        this.bgColor = this.bgHoverColor;
        this.strokeColor = this.strokeHoverColor;
        this.iconColor = this.iconHoverColor;
        this.notify("onDraw");
    }

    function handleIconButtonMouseOut() {
        this.isHovered = false;
        this.bgColor = this.bgDefaultColor;
        this.strokeColor = this.strokeDefaultColor;
        this.iconColor = this.iconDefaultColor;
        this.notify("onDraw");
    }

    // Create the radial icon button
    function createRadialIconButton(parent, config) {
        var btn = parent.add("button", undefined, "");

        if (config.buttonSize) {
            btn.preferredSize = [config.buttonSize[0], config.buttonSize[1]];
        }

        if (config.helpTip) {
            btn.helpTip = config.helpTip;
        }

        // Generate icon data and pre-scale to fixed size
        var baseSize = 100; // Base size for coordinate generation
        var iconSize = config.iconSize || 24;
        var baseIconData = generateRadialIconData(baseSize);

        // Pre-scale coordinates to fixed icon size
        btn.iconCoords = scaleIconCoordinates(baseIconData, baseSize, iconSize);
        btn.iconSize = iconSize;

        // Colors
        btn.iconDefaultColor = [0.77, 0.77, 0.77, 1];
        btn.iconHoverColor = [0.9, 0.9, 0.9, 1];
        btn.bgDefaultColor = [0.05, 0.05, 0.05, 0.15];
        btn.bgHoverColor = [1, 1, 1, 0.05];
        btn.strokeDefaultColor = [0, 0, 0, 0];
        btn.strokeHoverColor = [1, 1, 1, 0.1];

        // Set initial state
        btn.isHovered = false;
        btn.iconColor = btn.iconDefaultColor;
        btn.bgColor = btn.bgDefaultColor;
        btn.strokeColor = btn.strokeDefaultColor;

        // Assign handlers
        btn.onDraw = drawRadialIconButton;
        btn.addEventListener("mouseover", handleIconButtonMouseOver);
        btn.addEventListener("mouseout", handleIconButtonMouseOut);

        if (config.onClick) {
            btn.onClick = config.onClick;
        }

        return btn;
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

        // Custom radial icon button
        var iconButton = createRadialIconButton(buttonRow, {
            buttonSize: [BUTTON_HEIGHT, BUTTON_HEIGHT],
            iconSize: 24,
            helpTip: "Create rig from selected layers\nAdd to rig: select controller + layers\nRemove from rig: select rigged layers only",
            onClick: applyButtonHandler
        });
        iconButton.alignment = ["fill", "center"];

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
        applyButtonHandler();
    }

})(this);
