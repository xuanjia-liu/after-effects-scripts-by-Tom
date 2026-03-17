/*
╔═╗╦═╗╦╔╦╗  ╦  ╔═╗╔═╗╦╔═
║ ╦╠╦╝║ ║║  ║  ║ ║║  ╠╩╗
╚═╝╩╚═╩═╩╝  ╩═╝╚═╝╚═╝╩ ╩

Grid Lock v1.0.0
Figma-style auto-layout for After Effects layers.

Author:   Jake Bartlett (Jake In Motion LLC)
Website:  https://jakeinmotion.com/grid-lock
License:  Free for personal/commercial use. No redistribution.
          https://jakeinmotion.com/license
*/

(function(thisObj) {

    //========================
    // CONFIGURATION
    //========================

    var CONFIG = {
        name: "Grid Lock",
        version: "v1.0.0",
        author: "Jake In Motion",
        year: 2025,
        controllerName: "Grid Lock Container",
        effectName: "Grid Lock",
        effectMatchName: "Pseudo/JIM Grid Lock",
        urls: {
            website: "https://jakeinmotion.com/gridlock",
            codeRunner: "https://jakeinmotion.com/code-runner",
            kbar: "https://aescripts.com/kbar/"
        }
    };

    //========================
    // EMBEDDED FFX DATA
    //========================

    // Paste escaped FFX string here (generated via /convert-ffx)
    var FFX_DATA = "RIFX\x00\x00\x12\fFaFXhead\x00\x00\x00\x10\x00\x00\x00\x03\x00\x00\x00D\x00\x00\x00\x01\x01\x00\x00\x00LIST\x00\x00\x11\xe8bescbeso\x00\x00\x008\x00\x00\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00]\xa8\x00\x1d\xf8R\x00\x00\x00\x00\x00d\x00d\x00d\x00d?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xffLIST\x00\x00\x00\xactdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x02LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE Effect Parade\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdsn\x00\x00\x00\nGrid Lock\x00LIST\x00\x00\x00dtdsptdot\x00\x00\x00\x04\xff\xff\xff\xfftdpl\x00\x00\x00\x04\x00\x00\x00\x01LIST\x00\x00\x00@tdsitdix\x00\x00\x00\x04\xff\xff\xff\xfftdmn\x00\x00\x00(ADBE End of path sentinel\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x10jsspcfnam\x00\x00\x000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x07\x04parTparn\x00\x00\x00\x04\x00\x00\x00\btdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x0e\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\xff\xff\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07Direction\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x01\x00\x03\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pdnm\x00\x00\x00\x19Horizontal|Vertical|Wrap\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07Align\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x01\x00\x03\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pdnm\x00\x00\x00,Start|Center|End|Space Between|Space Evenly\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0003\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x07Cross Align\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x02\x00\x03\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pdnm\x00\x00\x00,Start|Center|End|Space Between|Space Evenly\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0004\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nGap\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc4z\x00\x00Dz\x00\x00\xc2\xc8\x00\x00B\xc8\x00\x00A \x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0005\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nPadding\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xc4z\x00\x00Dz\x00\x00\xc2\xc8\x00\x00B\xc8\x00\x00A \x00\x00\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0006\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04Reverse\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pdnm\x00\x00\x00\x01\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0007\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00pard\x00\x00\x00\x94\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\nInfluence\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00B\xc8\x00\x00\x00\x00\x00\x00B\xc8\x00\x00B\xc8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\t\x1atdgptdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\nGrid Lock\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0000\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xdatdbstdsb\x00\x00\x00\x04\x00\x00\x00\x03tdsn\x00\x00\x00\x01\x00\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x00\x00\x00\x02X?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\xc0\xc0\xc0\xff\xc0\xc0\xc0\x00\x00\x00\x00\x80\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdpi\x00\x00\x00\x04\x00\x00\x00\x0etdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0001\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\nDirection\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0002\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd2tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x06Align\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0003\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd8tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\fCross Align\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0004\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf0tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\x04Gap\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@$\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\xc0Y\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@Y\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0005\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\bPadding\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@$\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\xc0Y\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@Y\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0006\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xd4tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\bReverse\x00tdb4\x00\x00\x00|\xdb\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\x04\x00\x00]\xa8?\x1a6\xe2\xeb\x1cC-?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00?\xf0\x00\x00\x00\x00\x00\x00\x00\x00\x00\x04\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(Pseudo/JIM Grid Lock-0007\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00LIST\x00\x00\x00\xf6tdbstdsb\x00\x00\x00\x04\x00\x00\x00\x01tdsn\x00\x00\x00\nInfluence\x00tdb4\x00\x00\x00|\xbd\x99\x00\x01\x00\x01\x00\x00\x00\x01\x00\xff\x00\x00]\xa8\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00cdat\x00\x00\x00(@Y\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00tdum\x00\x00\x00\b\x00\x00\x00\x00\x00\x00\x00\x00tduM\x00\x00\x00\b@Y\x00\x00\x00\x00\x00\x00tdmn\x00\x00\x00(ADBE Group End\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00{\n\"controlName\": \"Grid Lock\",\n\"matchname\": \"Pseudo/JIM Grid Lock\",\n\"controlArray\": [\n{\n\"name\": \"Direction\",\n\"type\": \"popup\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": false,\n\"id\": 6902264430,\n\"hold\": false,\n\"default\": 1,\n\"content\": \"Horizontal|Vertical|Wrap\",\n\"error\": []\n},\n{\n\"name\": \"Align\",\n\"type\": \"popup\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": false,\n\"id\": 1585858353,\n\"hold\": false,\n\"default\": 1,\n\"content\": \"Start|Center|End|Space Between|Space Evenly\",\n\"error\": []\n},\n{\n\"name\": \"Cross Align\",\n\"type\": \"popup\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": false,\n\"id\": 2526469408,\n\"hold\": false,\n\"default\": 2,\n\"content\": \"Start|Center|End|Space Between|Space Evenly\",\n\"error\": []\n},\n{\n\"name\": \"Gap\",\n\"type\": \"slider\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": true,\n\"id\": 6870648088,\n\"hold\": false,\n\"default\": 10,\n\"sliderMax\": 100,\n\"sliderMin\": -100,\n\"validMax\": 1000,\n\"validMin\": -1000,\n\"precision\": 2,\n\"percent\": false,\n\"pixel\": false,\n\"open\": true,\n\"errors\": [],\n\"error\": []\n},\n{\n\"name\": \"Padding\",\n\"type\": \"slider\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": true,\n\"id\": 5167210796,\n\"hold\": false,\n\"default\": 10,\n\"sliderMax\": 100,\n\"sliderMin\": -100,\n\"validMax\": 1000,\n\"validMin\": -1000,\n\"precision\": 2,\n\"percent\": false,\n\"pixel\": false,\n\"open\": true,\n\"errors\": [],\n\"error\": []\n},\n{\n\"name\": \"Reverse\",\n\"type\": \"checkbox\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"default\": false,\n\"keyframes\": true,\n\"id\": 1313561870,\n\"hold\": true,\n\"label\": \"\",\n\"error\": []\n},\n{\n\"name\": \"Influence\",\n\"type\": \"slider\",\n\"canHaveKeyframes\": true,\n\"canBeInvisible\": true,\n\"invisible\": false,\n\"keyframes\": true,\n\"id\": 8958186684,\n\"hold\": false,\n\"default\": 100,\n\"sliderMax\": 100,\n\"sliderMin\": 0,\n\"validMax\": 100,\n\"validMin\": 0,\n\"precision\": 1,\n\"percent\": true,\n\"pixel\": false,\n\"open\": true,\n\"errors\": [],\n\"error\": []\n}\n],\n\"version\": 3\n}";

    //========================
    // FFX UTILITIES
    //========================

    function getFFXFilePath() {
        var ffxFolder = Folder.userData.fullName + "/JakeInMotion/GridLock";
        var folder = new Folder(ffxFolder);
        if (!folder.exists) {
            folder.create();
        }
        return ffxFolder + "/GridLock.ffx";
    }

    function applyPseudoEffect(layer) {
        var ffxFile = new File(getFFXFilePath());

        // Only write file if it doesn't exist (caching)
        if (!ffxFile.exists) {
            ffxFile.encoding = "BINARY";
            ffxFile.open("w");
            ffxFile.write(FFX_DATA);
            ffxFile.close();
        }

        layer.applyPreset(ffxFile);
    }

    function hasPseudoEffect(layer) {
        var effects = layer.property("ADBE Effect Parade");
        if (!effects) return false;

        for (var i = 1; i <= effects.numProperties; i++) {
            if (effects.property(i).matchName === CONFIG.effectMatchName) {
                return true;
            }
        }
        return false;
    }

    //========================
    // CONTROL VALUES
    //========================

    // Direction: 1=Horizontal, 2=Vertical, 3=Wrap
    // Align: 1=Start, 2=Center, 3=End, 4=Space Between, 5=Space Evenly
    // Cross Align: 1=Start, 2=Center, 3=End, 4=Space Between, 5=Space Evenly
    // Note: Cross Align Space Between/Evenly only affects Wrap mode (distributes rows)
    // Influence: 0-100% blend between original position and grid position

    var DEFAULTS = {
        direction: 1,
        align: 1,
        crossAlign: 2,
        gap: 10,
        padding: 10,
        reverse: 0,
        influence: 100
    };

    //========================
    // ICON DATA
    //========================

    // Grid Lock icon: grid layout with lock
    var ICON_GRID_LOCK = [
        // Right lock part
        [[0.841, 0.309], [0.832, 0.188], [0.807, 0.152], [0.771, 0.127], [0.726, 0.118],
         [0.726, 0.187], [0.744, 0.190], [0.759, 0.200], [0.769, 0.215], [0.772, 0.299],
         [0.726, 0.299], [0.726, 0.355], [0.756, 0.367], [0.772, 0.396], [0.772, 0.408],
         [0.772, 0.408], [0.764, 0.430], [0.746, 0.445], [0.762, 0.520], [0.760, 0.524],
         [0.756, 0.527], [0.726, 0.528], [0.726, 0.581], [0.833, 0.575], [0.858, 0.558],
         [0.876, 0.532], [0.879, 0.357], [0.857, 0.321], [0.841, 0.309]],
        // Top rect
        [[0.174, 0.339], [0.466, 0.336], [0.484, 0.325], [0.495, 0.308], [0.495, 0.253],
         [0.484, 0.235], [0.466, 0.224], [0.152, 0.224], [0.134, 0.235], [0.122, 0.253],
         [0.122, 0.308], [0.134, 0.325], [0.152, 0.336], [0.174, 0.339]],
        // Middle rect
        [[0.164, 0.582], [0.472, 0.578], [0.487, 0.566], [0.496, 0.548], [0.496, 0.452],
         [0.487, 0.434], [0.472, 0.422], [0.152, 0.422], [0.138, 0.434], [0.127, 0.452],
         [0.127, 0.548], [0.138, 0.566], [0.152, 0.578], [0.164, 0.582]],
        // Bottom-left square
        [[0.273, 0.661], [0.138, 0.664], [0.127, 0.670], [0.121, 0.681], [0.121, 0.828],
         [0.127, 0.838], [0.138, 0.845], [0.285, 0.845], [0.295, 0.838], [0.302, 0.828],
         [0.302, 0.681], [0.295, 0.670], [0.285, 0.664], [0.273, 0.661]],
        // Bottom-right rect
        [[0.829, 0.661], [0.405, 0.665], [0.388, 0.677], [0.377, 0.694], [0.377, 0.815],
         [0.388, 0.832], [0.405, 0.844], [0.849, 0.844], [0.866, 0.832], [0.878, 0.815],
         [0.878, 0.694], [0.866, 0.677], [0.849, 0.665], [0.829, 0.661]],
        // Left lock part
        [[0.649, 0.581], [0.726, 0.581], [0.726, 0.528], [0.695, 0.527], [0.691, 0.524],
         [0.689, 0.520], [0.705, 0.445], [0.688, 0.430], [0.679, 0.408], [0.679, 0.408],
         [0.679, 0.396], [0.695, 0.367], [0.726, 0.355], [0.726, 0.355], [0.726, 0.299],
         [0.679, 0.299], [0.683, 0.215], [0.693, 0.200], [0.708, 0.190], [0.726, 0.187],
         [0.726, 0.118], [0.681, 0.127], [0.644, 0.152], [0.620, 0.188], [0.610, 0.309],
         [0.581, 0.338], [0.576, 0.532], [0.593, 0.558], [0.618, 0.575], [0.649, 0.581]]
    ];

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

    // Brand colors for hover state
    var BRAND_ORANGE = [0.93, 0.34, 0.19, 1];  // #ee5730
    var BRAND_BLUE = [0.16, 0.56, 0.95, 1];    // #2890f2

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

        // Segment indices: 0=right lock, 1=top rect, 2=middle rect, 3=bottom-left, 4=bottom-right, 5=left lock
        var gridIndices = [1, 2, 3, 4];  // The grid rectangles

        for (var i = 0; i < coords.length; i++) {
            var segment = coords[i];

            // On hover: lock is orange, grid alternates orange/blue
            var segmentColor;
            if (this.isHovered) {
                if (i === 0 || i === 5) {
                    segmentColor = BRAND_ORANGE;  // Lock parts are orange
                } else {
                    // Alternate colors for grid rectangles
                    var gridIndex = 0;
                    for (var k = 0; k < gridIndices.length; k++) {
                        if (gridIndices[k] === i) {
                            gridIndex = k;
                            break;
                        }
                    }
                    segmentColor = (gridIndex % 2 === 0) ? BRAND_ORANGE : BRAND_BLUE;
                }
            } else {
                segmentColor = this.currentColor;
            }

            var iconBrush = g.newBrush(g.BrushType.SOLID_COLOR, segmentColor);

            g.newPath();
            g.moveTo(segment[0][0] + iconX, segment[0][1] + iconY);

            for (var j = 1; j < segment.length; j++) {
                g.lineTo(segment[j][0] + iconX, segment[j][1] + iconY);
            }

            g.fillPath(iconBrush);
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

    // Helper: Get all children of a layer
    function getChildren(parentLayer) {
        var comp = parentLayer.containingComp;
        var children = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.parent === parentLayer) {
                children.push(layer);
            }
        }
        return children;
    }

    // Remove Grid Lock from multiple layers at once (prevents layout shifts)
    // Also deletes empty containers after unparenting
    function batchRemoveGridLock(layers) {
        if (!layers || layers.length === 0) return;

        var captureData = [];
        var affectedContainers = [];

        // PASS 1: Capture all World Positions and track containers
        for (var i = 0; i < layers.length; i++) {
            var container = layers[i].parent;

            // Track unique containers
            if (container && isGridLockContainer(container)) {
                var alreadyTracked = false;
                for (var c = 0; c < affectedContainers.length; c++) {
                    if (affectedContainers[c] === container) {
                        alreadyTracked = true;
                        break;
                    }
                }
                if (!alreadyTracked) {
                    affectedContainers.push(container);
                }
            }

            captureData.push({
                layer: layers[i],
                worldPos: calculateWorldPosition(layers[i])
            });
        }

        // PASS 2: Unparent and apply the captured positions
        for (var j = 0; j < captureData.length; j++) {
            var item = captureData[j];
            var lyr = item.layer;

            // Clear expression first
            lyr.property("ADBE Transform Group").property("ADBE Position").expression = "";

            // Unparent
            lyr.parent = null;

            // Apply World Position
            if (lyr.threeDLayer) {
                lyr.property("ADBE Transform Group").property("ADBE Position").setValue(item.worldPos);
            } else {
                lyr.property("ADBE Transform Group").property("ADBE Position").setValue([item.worldPos[0], item.worldPos[1]]);
            }
        }

        // PASS 3: Delete empty containers
        for (var k = 0; k < affectedContainers.length; k++) {
            var container = affectedContainers[k];
            var remainingChildren = getChildren(container);
            if (remainingChildren.length === 0) {
                container.remove();
            }
        }
    }

    // Helper: Calculate World Position using a temporary expression
    // (Essential for unparenting without visual jumping)
    function calculateWorldPosition(layer) {
        // For 2D layers, sourcePointToComp is native, fast, and accurate
        if (!layer.threeDLayer) {
            var ap = layer.property("ADBE Transform Group").property("ADBE Anchor Point").value;
            // Explicitly cast to 2 elements [x, y] to prevent "does not have 2 elements" error
            return layer.sourcePointToComp([ap[0], ap[1]]);
        }

        // For 3D layers, use a temporary expression to access the .toWorld() method
        var result = [0, 0, 0];
        var tempEffect = layer.effects.addProperty("ADBE Slider Control");
        var slider = tempEffect.property("ADBE Slider Control-0001");

        try {
            // Calculate X, Y, Z separately
            slider.expression = "thisLayer.toWorld(thisLayer.anchorPoint)[0];";
            result[0] = slider.value;

            slider.expression = "thisLayer.toWorld(thisLayer.anchorPoint)[1];";
            result[1] = slider.value;

            slider.expression = "thisLayer.toWorld(thisLayer.anchorPoint)[2];";
            result[2] = slider.value;
        } catch (e) {
            // Fallback to local position if expression fails
            result = layer.property("ADBE Transform Group").property("ADBE Position").value;
        } finally {
            // Clean up the temp effect immediately
            tempEffect.remove();
        }

        return result;
    }

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

    //========================
    // GRID LOCK DETECTION
    //========================

    // Check if a layer is a Grid Lock Container
    function isGridLockContainer(layer) {
        // Must be a shape layer
        if (!(layer instanceof ShapeLayer)) return false;

        // Check if name starts with controller name
        if (layer.name.indexOf(CONFIG.controllerName) !== 0) return false;

        // Check for Grid Lock pseudo effect
        return hasPseudoEffect(layer);
    }

    // Find Grid Lock container in selection
    function findContainerInSelection(layers) {
        for (var i = 0; i < layers.length; i++) {
            if (isGridLockContainer(layers[i])) {
                return layers[i];
            }
        }
        return null;
    }

    // Check if a layer is part of a Grid Lock rig
    function isPartOfGridLock(layer) {
        if (!layer.parent) return false;
        return isGridLockContainer(layer.parent);
    }

    // Get all layers parented to a container
    function getChildLayers(comp, container) {
        var children = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.parent === container && layer !== container) {
                children.push(layer);
            }
        }
        return children;
    }

    //========================
    // EXPRESSION BUILDERS
    //========================

    // Build the position expression for Grid Lock child layers
    function buildPositionExpression() {
        var expr = "";

        // Get container info - use rectangle size * group scale
        expr += "// Grid Lock Position Expression\n";
        expr += "var ctrl = thisLayer.parent;\n";
        expr += "var group = ctrl.content(\"Rectangle 1\");\n";
        expr += "var rectPath = group.content(\"Rectangle Path 1\");\n";
        expr += "var baseSize = rectPath.size;\n";
        expr += "var groupScale = group.transform.scale;\n";
        expr += "var containerW = baseSize[0] * groupScale[0] / 100;\n";
        expr += "var containerH = baseSize[1] * groupScale[1] / 100;\n";
        expr += "\n";

        // Get controls from pseudo effect - dropdowns return 1-indexed values
        expr += "// Controls\n";
        expr += "var fx = ctrl.effect(\"Grid Lock\");\n";
        expr += "var direction = fx(\"Direction\").value;\n";
        expr += "var align = fx(\"Align\").value;\n";
        expr += "var crossAlign = fx(\"Cross Align\").value;\n";
        expr += "var gap = fx(\"Gap\").value;\n";
        expr += "var padding = fx(\"Padding\").value;\n";
        expr += "var reverseOrder = fx(\"Reverse\").value;\n";
        expr += "var influence = fx(\"Influence\").value / 100;\n";
        expr += "\n";
        expr += "// Early exit if influence is 0\n";
        expr += "if (influence === 0) { value; } else {\n";
        expr += "\n";

        // Helper function to get transformed bounds (accounting for scale and rotation)
        expr += "// Helper: Get axis-aligned bounding box after layer transforms\n";
        expr += "function getTransformedBounds(lyr) {\n";
        expr += "    // Single sourceRect call with extents for performance\n";
        expr += "    var b = lyr.sourceRectAtTime(time, true);\n";
        expr += "    if (b.width === 0) return { left: 0, top: 0, width: 0, height: 0 };\n";
        expr += "    \n";
        expr += "    var s = lyr.transform.scale.value;\n";
        expr += "    var r = lyr.transform.rotation.value;\n";
        expr += "    var ap = lyr.transform.anchorPoint.value;\n";
        expr += "    var sx = s[0] / 100;\n";
        expr += "    var sy = s[1] / 100;\n";
        expr += "    \n";
        expr += "    // Short-circuit for unrotated/unscaled layers (most common case)\n";
        expr += "    if (r === 0 && sx === 1 && sy === 1) {\n";
        expr += "        return { left: b.left - ap[0], top: b.top - ap[1], width: b.width, height: b.height };\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    // Corner points relative to anchor point\n";
        expr += "    var corners = [\n";
        expr += "        [b.left - ap[0], b.top - ap[1]],\n";
        expr += "        [b.left + b.width - ap[0], b.top - ap[1]],\n";
        expr += "        [b.left + b.width - ap[0], b.top + b.height - ap[1]],\n";
        expr += "        [b.left - ap[0], b.top + b.height - ap[1]]\n";
        expr += "    ];\n";
        expr += "    \n";
        expr += "    // Pre-calculate trig\n";
        expr += "    var rad = degreesToRadians(r);\n";
        expr += "    var cos = Math.cos(rad);\n";
        expr += "    var sin = Math.sin(rad);\n";
        expr += "    \n";
        expr += "    // Transform corners and track min/max directly\n";
        expr += "    var minX = Infinity, maxX = -Infinity;\n";
        expr += "    var minY = Infinity, maxY = -Infinity;\n";
        expr += "    for (var c = 0; c < 4; c++) {\n";
        expr += "        var scaledX = corners[c][0] * sx;\n";
        expr += "        var scaledY = corners[c][1] * sy;\n";
        expr += "        var rotX = scaledX * cos - scaledY * sin;\n";
        expr += "        var rotY = scaledX * sin + scaledY * cos;\n";
        expr += "        if (rotX < minX) minX = rotX;\n";
        expr += "        if (rotX > maxX) maxX = rotX;\n";
        expr += "        if (rotY < minY) minY = rotY;\n";
        expr += "        if (rotY > maxY) maxY = rotY;\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };\n";
        expr += "}\n";
        expr += "\n";

        // Get siblings
        expr += "// Get all sibling layers\n";
        expr += "var siblings = [];\n";
        expr += "for (var i = 1; i <= thisComp.numLayers; i++) {\n";
        expr += "    var lyr = thisComp.layer(i);\n";
        expr += "    if (lyr.hasParent && lyr.parent.index == ctrl.index && lyr.index != ctrl.index) {\n";
        expr += "        siblings.push(lyr);\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "\n";

        // Sort by index (higher index = lower in stack = first in layout)
        expr += "// Sort by stack order (bottom to top = first to last in layout)\n";
        expr += "siblings.sort(function(a, b) { return b.index - a.index; });\n";
        expr += "if (reverseOrder) { siblings.reverse(); }\n";
        expr += "\n";

        // Find my position
        expr += "// Find my position in sorted list\n";
        expr += "var myPos = 0;\n";
        expr += "for (var j = 0; j < siblings.length; j++) {\n";
        expr += "    if (siblings[j].index == thisLayer.index) {\n";
        expr += "        myPos = j;\n";
        expr += "        break;\n";
        expr += "    }\n";
        expr += "}\n";
        expr += "\n";

        // Get transformed bounds for all layers
        expr += "// Get transformed bounds for all layers\n";
        expr += "var allBounds = [];\n";
        expr += "for (var k = 0; k < siblings.length; k++) {\n";
        expr += "    allBounds.push(getTransformedBounds(siblings[k]));\n";
        expr += "}\n";
        expr += "\n";

        // My bounds
        expr += "var myBounds = allBounds[myPos];\n";
        expr += "\n";

        // Layout calculations
        expr += "// Layout calculations\n";
        expr += "var result = [0, 0];\n";
        expr += "\n";

        // Horizontal layout
        expr += "if (direction == 1) {\n";
        expr += "    // HORIZONTAL\n";
        expr += "    var totalWidth = 0;\n";
        expr += "    var maxHeight = 0;\n";
        expr += "    for (var m = 0; m < allBounds.length; m++) {\n";
        expr += "        totalWidth += allBounds[m].width;\n";
        expr += "        if (allBounds[m].height > maxHeight) maxHeight = allBounds[m].height;\n";
        expr += "    }\n";
        expr += "    totalWidth += (allBounds.length - 1) * gap;\n";
        expr += "    var availWidth = containerW - (2 * padding);\n";
        expr += "    \n";
        expr += "    // Calculate X start position based on alignment\n";
        expr += "    var startX;\n";
        expr += "    var actualGap = gap;\n";
        expr += "    if (align == 1) {\n";
        expr += "        startX = -containerW / 2 + padding;\n";
        expr += "    } else if (align == 2) {\n";
        expr += "        startX = -totalWidth / 2;\n";
        expr += "    } else if (align == 3) {\n";
        expr += "        startX = containerW / 2 - padding - totalWidth;\n";
        expr += "    } else if (align == 4) {\n";
        expr += "        startX = -containerW / 2 + padding;\n";
        expr += "        if (allBounds.length > 1) {\n";
        expr += "            var contentWidth = totalWidth - (allBounds.length - 1) * gap;\n";
        expr += "            actualGap = (availWidth - contentWidth) / (allBounds.length - 1);\n";
        expr += "        }\n";
        expr += "    } else if (align == 5) {\n";
        expr += "        var contentWidth = totalWidth - (allBounds.length - 1) * gap;\n";
        expr += "        actualGap = (availWidth - contentWidth) / (allBounds.length + 1);\n";
        expr += "        startX = -containerW / 2 + padding + actualGap;\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    // Calculate X for this layer\n";
        expr += "    var xPos = startX;\n";
        expr += "    for (var n = 0; n < myPos; n++) {\n";
        expr += "        xPos += allBounds[n].width + actualGap;\n";
        expr += "    }\n";
        expr += "    xPos = xPos - myBounds.left;\n";
        expr += "    \n";
        expr += "    // Calculate Y based on cross alignment (4/5 fall back to Center)\n";
        expr += "    var yPos;\n";
        expr += "    if (crossAlign == 1) {\n";
        expr += "        yPos = -containerH / 2 + padding - myBounds.top;\n";
        expr += "    } else if (crossAlign == 2 || crossAlign == 4 || crossAlign == 5) {\n";
        expr += "        yPos = -(myBounds.top + myBounds.height / 2);\n";
        expr += "    } else if (crossAlign == 3) {\n";
        expr += "        yPos = containerH / 2 - padding - myBounds.top - myBounds.height;\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    result = [xPos, yPos];\n";
        expr += "\n";

        // Vertical layout
        expr += "} else if (direction == 2) {\n";
        expr += "    // VERTICAL\n";
        expr += "    var totalHeight = 0;\n";
        expr += "    var maxWidth = 0;\n";
        expr += "    for (var m = 0; m < allBounds.length; m++) {\n";
        expr += "        totalHeight += allBounds[m].height;\n";
        expr += "        if (allBounds[m].width > maxWidth) maxWidth = allBounds[m].width;\n";
        expr += "    }\n";
        expr += "    totalHeight += (allBounds.length - 1) * gap;\n";
        expr += "    var availHeight = containerH - (2 * padding);\n";
        expr += "    \n";
        expr += "    // Calculate Y start position based on alignment\n";
        expr += "    var startY;\n";
        expr += "    var actualGap = gap;\n";
        expr += "    if (align == 1) {\n";
        expr += "        startY = -containerH / 2 + padding;\n";
        expr += "    } else if (align == 2) {\n";
        expr += "        startY = -totalHeight / 2;\n";
        expr += "    } else if (align == 3) {\n";
        expr += "        startY = containerH / 2 - padding - totalHeight;\n";
        expr += "    } else if (align == 4) {\n";
        expr += "        startY = -containerH / 2 + padding;\n";
        expr += "        if (allBounds.length > 1) {\n";
        expr += "            var contentHeight = totalHeight - (allBounds.length - 1) * gap;\n";
        expr += "            actualGap = (availHeight - contentHeight) / (allBounds.length - 1);\n";
        expr += "        }\n";
        expr += "    } else if (align == 5) {\n";
        expr += "        var contentHeight = totalHeight - (allBounds.length - 1) * gap;\n";
        expr += "        actualGap = (availHeight - contentHeight) / (allBounds.length + 1);\n";
        expr += "        startY = -containerH / 2 + padding + actualGap;\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    // Calculate Y for this layer\n";
        expr += "    var yPos = startY;\n";
        expr += "    for (var n = 0; n < myPos; n++) {\n";
        expr += "        yPos += allBounds[n].height + actualGap;\n";
        expr += "    }\n";
        expr += "    yPos = yPos - myBounds.top;\n";
        expr += "    \n";
        expr += "    // Calculate X based on cross alignment (4/5 fall back to Center)\n";
        expr += "    var xPos;\n";
        expr += "    if (crossAlign == 1) {\n";
        expr += "        xPos = -containerW / 2 + padding - myBounds.left;\n";
        expr += "    } else if (crossAlign == 2 || crossAlign == 4 || crossAlign == 5) {\n";
        expr += "        xPos = -(myBounds.left + myBounds.width / 2);\n";
        expr += "    } else if (crossAlign == 3) {\n";
        expr += "        xPos = containerW / 2 - padding - myBounds.left - myBounds.width;\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    result = [xPos, yPos];\n";
        expr += "\n";

        // Wrap layout
        expr += "} else if (direction == 3) {\n";
        expr += "    // WRAP\n";
        expr += "    var availWidth = containerW - (2 * padding);\n";
        expr += "    \n";
        expr += "    // Build rows by fitting layers\n";
        expr += "    var rows = [];\n";
        expr += "    var currentRow = [];\n";
        expr += "    var currentRowWidth = 0;\n";
        expr += "    \n";
        expr += "    for (var r = 0; r < allBounds.length; r++) {\n";
        expr += "        var itemWidth = allBounds[r].width;\n";
        expr += "        var neededWidth = currentRow.length > 0 ? itemWidth + gap : itemWidth;\n";
        expr += "        \n";
        expr += "        if (currentRowWidth + neededWidth > availWidth && currentRow.length > 0) {\n";
        expr += "            rows.push(currentRow);\n";
        expr += "            currentRow = [r];\n";
        expr += "            currentRowWidth = itemWidth;\n";
        expr += "        } else {\n";
        expr += "            currentRow.push(r);\n";
        expr += "            currentRowWidth += neededWidth;\n";
        expr += "        }\n";
        expr += "    }\n";
        expr += "    if (currentRow.length > 0) rows.push(currentRow);\n";
        expr += "    \n";
        expr += "    // Find which row I'm in and my position within it\n";
        expr += "    var myRow = 0;\n";
        expr += "    var myPosInRow = 0;\n";
        expr += "    for (var ri = 0; ri < rows.length; ri++) {\n";
        expr += "        for (var rj = 0; rj < rows[ri].length; rj++) {\n";
        expr += "            if (rows[ri][rj] == myPos) {\n";
        expr += "                myRow = ri;\n";
        expr += "                myPosInRow = rj;\n";
        expr += "                break;\n";
        expr += "            }\n";
        expr += "        }\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    // Calculate row heights\n";
        expr += "    var rowHeights = [];\n";
        expr += "    for (var rh = 0; rh < rows.length; rh++) {\n";
        expr += "        var maxH = 0;\n";
        expr += "        for (var rhi = 0; rhi < rows[rh].length; rhi++) {\n";
        expr += "            var idx = rows[rh][rhi];\n";
        expr += "            if (allBounds[idx].height > maxH) maxH = allBounds[idx].height;\n";
        expr += "        }\n";
        expr += "        rowHeights.push(maxH);\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    // Calculate total row heights for distribution\n";
        expr += "    var totalRowsHeight = 0;\n";
        expr += "    for (var th = 0; th < rowHeights.length; th++) {\n";
        expr += "        totalRowsHeight += rowHeights[th];\n";
        expr += "    }\n";
        expr += "    var availHeight = containerH - (2 * padding);\n";
        expr += "    \n";
        expr += "    // Calculate Y position based on cross alignment\n";
        expr += "    var yPos;\n";
        expr += "    var rowGap = gap;\n";
        expr += "    if (crossAlign == 4) {\n";
        expr += "        // Space Between rows\n";
        expr += "        if (rows.length > 1) {\n";
        expr += "            rowGap = (availHeight - totalRowsHeight) / (rows.length - 1);\n";
        expr += "        }\n";
        expr += "        yPos = -containerH / 2 + padding;\n";
        expr += "        for (var ry = 0; ry < myRow; ry++) {\n";
        expr += "            yPos += rowHeights[ry] + rowGap;\n";
        expr += "        }\n";
        expr += "        // Center align within row for distribution modes\n";
        expr += "        yPos = yPos + (rowHeights[myRow] / 2) - (myBounds.top + myBounds.height / 2);\n";
        expr += "    } else if (crossAlign == 5) {\n";
        expr += "        // Space Evenly rows\n";
        expr += "        rowGap = (availHeight - totalRowsHeight) / (rows.length + 1);\n";
        expr += "        yPos = -containerH / 2 + padding + rowGap;\n";
        expr += "        for (var ry = 0; ry < myRow; ry++) {\n";
        expr += "            yPos += rowHeights[ry] + rowGap;\n";
        expr += "        }\n";
        expr += "        // Center align within row for distribution modes\n";
        expr += "        yPos = yPos + (rowHeights[myRow] / 2) - (myBounds.top + myBounds.height / 2);\n";
        expr += "    } else {\n";
        expr += "        // Start/Center/End - use fixed gap\n";
        expr += "        yPos = -containerH / 2 + padding;\n";
        expr += "        for (var ry = 0; ry < myRow; ry++) {\n";
        expr += "            yPos += rowHeights[ry] + gap;\n";
        expr += "        }\n";
        expr += "        // Cross align within row\n";
        expr += "        if (crossAlign == 1) {\n";
        expr += "            yPos = yPos - myBounds.top;\n";
        expr += "        } else if (crossAlign == 2) {\n";
        expr += "            yPos = yPos + (rowHeights[myRow] / 2) - (myBounds.top + myBounds.height / 2);\n";
        expr += "        } else if (crossAlign == 3) {\n";
        expr += "            yPos = yPos + rowHeights[myRow] - myBounds.top - myBounds.height;\n";
        expr += "        }\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    // Calculate X position within row\n";
        expr += "    var thisRow = rows[myRow];\n";
        expr += "    var rowTotalWidth = 0;\n";
        expr += "    for (var rx = 0; rx < thisRow.length; rx++) {\n";
        expr += "        rowTotalWidth += allBounds[thisRow[rx]].width;\n";
        expr += "    }\n";
        expr += "    rowTotalWidth += (thisRow.length - 1) * gap;\n";
        expr += "    \n";
        expr += "    var startX;\n";
        expr += "    var actualGap = gap;\n";
        expr += "    if (align == 1) {\n";
        expr += "        startX = -containerW / 2 + padding;\n";
        expr += "    } else if (align == 2) {\n";
        expr += "        startX = -rowTotalWidth / 2;\n";
        expr += "    } else if (align == 3) {\n";
        expr += "        startX = containerW / 2 - padding - rowTotalWidth;\n";
        expr += "    } else if (align == 4) {\n";
        expr += "        startX = -containerW / 2 + padding;\n";
        expr += "        if (thisRow.length > 1) {\n";
        expr += "            var rowContentWidth = rowTotalWidth - (thisRow.length - 1) * gap;\n";
        expr += "            actualGap = (availWidth - rowContentWidth) / (thisRow.length - 1);\n";
        expr += "        }\n";
        expr += "    } else if (align == 5) {\n";
        expr += "        var rowContentWidth = rowTotalWidth - (thisRow.length - 1) * gap;\n";
        expr += "        actualGap = (availWidth - rowContentWidth) / (thisRow.length + 1);\n";
        expr += "        startX = -containerW / 2 + padding + actualGap;\n";
        expr += "    }\n";
        expr += "    \n";
        expr += "    var xPos = startX;\n";
        expr += "    for (var xn = 0; xn < myPosInRow; xn++) {\n";
        expr += "        xPos += allBounds[thisRow[xn]].width + actualGap;\n";
        expr += "    }\n";
        expr += "    xPos = xPos - myBounds.left;\n";
        expr += "    \n";
        expr += "    result = [xPos, yPos];\n";
        expr += "}\n";
        expr += "\n";

        // Return result with influence blending (handling 3D layers)
        expr += "// Apply influence and handle 3D layers\n";
        expr += "if (thisLayer.threeDLayer) {\n";
        expr += "    [linear(influence, 0, 1, value[0], result[0]), linear(influence, 0, 1, value[1], result[1]), value[2]];\n";
        expr += "} else {\n";
        expr += "    [linear(influence, 0, 1, value[0], result[0]), linear(influence, 0, 1, value[1], result[1])];\n";
        expr += "}\n";
        expr += "}\n"; // Close the influence !== 0 else block

        return expr;
    }

    //========================
    // CONTAINER CREATION
    //========================

    // Generate unique container name
    function getUniqueContainerName(comp) {
        var baseName = CONFIG.controllerName;
        var existingNames = {};

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (layer.name.indexOf(baseName) === 0) {
                existingNames[layer.name] = true;
            }
        }

        if (!existingNames[baseName]) {
            return baseName;
        }

        var num = 2;
        while (existingNames[baseName + " " + num]) {
            num++;
        }

        return baseName + " " + num;
    }

    // Calculate average center of layers
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

            var compPos = layer.sourcePointToComp(ap2D);
            totalX += compPos[0];
            totalY += compPos[1];
        }

        return [totalX / layers.length, totalY / layers.length];
    }

    // Calculate bounding box of all layers
    function getLayersBoundingBox(layers, comp) {
        if (!layers || layers.length === 0) return null;

        var minX = Infinity, minY = Infinity;
        var maxX = -Infinity, maxY = -Infinity;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            var bounds = layer.sourceRectAtTime(comp.time, false);
            var ap = layer.property("ADBE Transform Group").property("ADBE Anchor Point").value;

            // Get corners in layer space
            var corners = [
                [bounds.left, bounds.top],
                [bounds.left + bounds.width, bounds.top],
                [bounds.left + bounds.width, bounds.top + bounds.height],
                [bounds.left, bounds.top + bounds.height]
            ];

            // Convert to comp space
            for (var c = 0; c < corners.length; c++) {
                var compPt = layer.sourcePointToComp(corners[c]);
                if (compPt[0] < minX) minX = compPt[0];
                if (compPt[0] > maxX) maxX = compPt[0];
                if (compPt[1] < minY) minY = compPt[1];
                if (compPt[1] > maxY) maxY = compPt[1];
            }
        }

        return {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }

    // Create the Grid Lock container
    function createContainer(comp, layers) {
        // Calculate bounding box of selected layers
        var bbox = getLayersBoundingBox(layers, comp);

        // Create shape layer
        var container = comp.layers.addShape();
        container.name = getUniqueContainerName(comp);
        container.label = 9; // Green label

        // Position at center of bounding box
        var transform = container.property("ADBE Transform Group");
        var position = transform.property("ADBE Position");
        position.setValue([bbox.centerX, bbox.centerY, 0]);

        // Add rectangle group
        var contents = container.property("ADBE Root Vectors Group");
        var group = contents.addProperty("ADBE Vector Group");
        group.name = "Rectangle 1";
        var groupContents = group.property("ADBE Vectors Group");

        // Add rectangle path and set size
        var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
        rect.name = "Rectangle Path 1";
        var paddedWidth = bbox.width + (DEFAULTS.padding * 2);
        var paddedHeight = bbox.height + (DEFAULTS.padding * 2);
        rect.property("ADBE Vector Rect Size").setValue([paddedWidth, paddedHeight]);

        // Add transparent fill (0% opacity) so sourceRectAtTime can measure bounds
        var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Opacity").setValue(0);

        // Lock group position so user can't accidentally drag it when scaling
        var groupTransform = group.property("ADBE Vector Transform Group");
        groupTransform.property("ADBE Vector Position").expression = "[0,0];";

        // Apply pseudo effect
        applyPseudoEffect(container);

        return container;
    }

    // Apply expressions to layer
    function applyGridLockExpression(layer) {
        var transform = layer.property("ADBE Transform Group");
        var position = transform.property("ADBE Position");

        position.expression = buildPositionExpression();
    }

    // Remove Grid Lock from layer (bakes World position and unparents)
    function removeGridLock(layer) {
        var transform = layer.property("ADBE Transform Group");
        var position = transform.property("ADBE Position");

        // 1. Calculate the precise World Position (Comp Space)
        var worldPos = calculateWorldPosition(layer);

        // 2. Remove the expression so it doesn't break during unparenting
        position.expression = "";

        // 3. Unparent the layer (switches coordinate system from Parent to World)
        layer.parent = null;

        // 4. Apply the World Position we calculated in step 1
        if (layer.threeDLayer) {
            position.setValue(worldPos);
        } else {
            position.setValue([worldPos[0], worldPos[1]]);
        }
    }

    //========================
    // MAIN LOGIC
    //========================

    function executeGridLock(altKeyPressed) {
        var comp = app.project.activeItem;

        // Validate comp
        if (!comp || !(comp instanceof CompItem)) {
            showAlert("No Composition", "Please open a composition first.");
            return;
        }

        var selectedLayers = comp.selectedLayers;

        // Validate selection
        if (!selectedLayers || selectedLayers.length === 0) {
            showAlert("No Selection", "Please select layers to arrange.");
            return;
        }

        app.beginUndoGroup(CONFIG.name);

        try {
            // Check for container in selection
            var container = findContainerInSelection(selectedLayers);

            // Get non-container layers
            var targetLayers = [];
            for (var i = 0; i < selectedLayers.length; i++) {
                if (!isGridLockContainer(selectedLayers[i])) {
                    targetLayers.push(selectedLayers[i]);
                }
            }

            if (container) {
                // Check if this container is nested in a parent Grid Lock
                if (altKeyPressed && isPartOfGridLock(container)) {
                    // Alt+click on nested container: remove from parent grid
                    batchRemoveGridLock([container]);
                } else if (targetLayers.length === 0) {
                    showAlert("No Layers to Add", "Select layers along with the container to add them to the rig.");
                } else {
                    // STEP 1: Batch remove Grid Lock from any layers that are already in OTHER rigs
                    var layersToClean = [];
                    for (var j = 0; j < targetLayers.length; j++) {
                        // Only clean if it's in a rig AND not already in THIS rig
                        if (isPartOfGridLock(targetLayers[j]) && targetLayers[j].parent !== container) {
                            layersToClean.push(targetLayers[j]);
                        }
                    }
                    batchRemoveGridLock(layersToClean);

                    // STEP 2: Parent to the new container
                    for (var k = 0; k < targetLayers.length; k++) {
                        var layer = targetLayers[k];

                        // Skip if already in this rig
                        if (layer.parent === container) continue;

                        // Parent to container and apply expression
                        layer.parent = container;
                        applyGridLockExpression(layer);
                    }
                }
            } else {
                // No container selected

                // Check if any selected layers are part of a Grid Lock
                var riggedLayers = [];
                var unriggedLayers = [];

                for (var m = 0; m < targetLayers.length; m++) {
                    if (isPartOfGridLock(targetLayers[m])) {
                        riggedLayers.push(targetLayers[m]);
                    } else {
                        unriggedLayers.push(targetLayers[m]);
                    }
                }

                if (riggedLayers.length > 0 && unriggedLayers.length === 0) {
                    // Only rigged layers selected
                    if (altKeyPressed) {
                        // Alt+click: Remove from rig (BATCH OPERATION)
                        batchRemoveGridLock(riggedLayers);
                    } else {
                        // Normal click: Create nested Grid Lock
                        if (riggedLayers.length < 2) {
                            showAlert("Need More Layers", "Please select at least 2 layers to create a nested Grid Lock.");
                        } else {
                            // Get the parent container of the first layer
                            var parentContainer = riggedLayers[0].parent;

                            // Verify all selected layers share the same parent
                            var sameParent = true;
                            for (var p = 1; p < riggedLayers.length; p++) {
                                if (riggedLayers[p].parent !== parentContainer) {
                                    sameParent = false;
                                    break;
                                }
                            }

                            if (!sameParent) {
                                showAlert("Different Parents", "All selected layers must belong to the same Grid Lock container to create a nested rig.");
                            } else {
                                // Create nested container
                                var nestedContainer = createContainer(comp, riggedLayers);

                                // Parent the nested container to the parent Grid Lock
                                nestedContainer.parent = parentContainer;

                                // Apply Grid Lock expression to the nested container
                                applyGridLockExpression(nestedContainer);

                                // Reparent the selected layers to the nested container
                                for (var q = 0; q < riggedLayers.length; q++) {
                                    riggedLayers[q].parent = nestedContainer;
                                    // Re-apply expression (parent reference changed)
                                    applyGridLockExpression(riggedLayers[q]);
                                }
                            }
                        }
                    }
                } else if (unriggedLayers.length > 0) {
                    // Create new rig (include any rigged layers after removing them)
                    var layersToAdd = unriggedLayers.slice(); // Copy array

                    if (riggedLayers.length > 0) {
                        // Remove rigged layers from their current rigs first (BATCH OPERATION)
                        batchRemoveGridLock(riggedLayers);

                        // Add them to the list of layers to process
                        for (var n = 0; n < riggedLayers.length; n++) {
                            layersToAdd.push(riggedLayers[n]);
                        }
                    }

                    if (layersToAdd.length < 2) {
                        showAlert("Need More Layers", "Please select at least 2 layers to create a Grid Lock rig.");
                    } else {
                        // Create container
                        var newContainer = createContainer(comp, layersToAdd);

                        // Parent layers and apply expressions
                        for (var r = 0; r < layersToAdd.length; r++) {
                            layersToAdd[r].parent = newContainer;
                            applyGridLockExpression(layersToAdd[r]);
                        }
                    }
                }
            }

        } catch (e) {
            showAlert("Error", "An error occurred:\n\n" + e.toString());
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

        // Create New Rig section
        var createPanel = helpDialog.add("panel", undefined, "Create a New Grid Lock");
        createPanel.orientation = "column";
        createPanel.alignChildren = ["fill", "top"];
        createPanel.spacing = 4;
        createPanel.margins = 12;

        createPanel.add("statictext", undefined, "Select 2 or more layers and click the button.");
        createPanel.add("statictext", undefined, "A container bounds your layers and links them to the grid.");

        // Customize section
        var customizePanel = helpDialog.add("panel", undefined, "Customize Layout");
        customizePanel.orientation = "column";
        customizePanel.alignChildren = ["fill", "top"];
        customizePanel.spacing = 4;
        customizePanel.margins = 12;

        customizePanel.add("statictext", undefined, "Adjust Rows, Columns, and Gutter in the container's effect controls.");
        customizePanel.add("statictext", undefined, "Double-click the container in the Comp Viewer to resize it.");

        // Add/Remove section
        var modifyPanel = helpDialog.add("panel", undefined, "Modify Rig");
        modifyPanel.orientation = "column";
        modifyPanel.alignChildren = ["fill", "top"];
        modifyPanel.spacing = 4;
        modifyPanel.margins = 12;

        modifyPanel.add("statictext", undefined, "Add layers: Select the container + new layers and click the button.");
        modifyPanel.add("statictext", undefined, "Unlink layers: Select rigged layer(s) and Alt/Option + click.");
        modifyPanel.add("statictext", undefined, "Unlinked layers stay in place.");
        modifyPanel.add("statictext", undefined, "Empty containers are automatically deleted after unlinking.");

        // Nested section
        var nestedPanel = helpDialog.add("panel", undefined, "Create Nested Grid Lock");
        nestedPanel.orientation = "column";
        nestedPanel.alignChildren = ["fill", "top"];
        nestedPanel.spacing = 4;
        nestedPanel.margins = 12;

        nestedPanel.add("statictext", undefined, "Select 2+ layers already in the same rig and click the button.");
        nestedPanel.add("statictext", undefined, "A nested container is created that subdivides the parent grid.");

        // Integration note
        var noteText = helpDialog.add("statictext", undefined, "Works great with tools like KBar and Code Runner.");
        noteText.alignment = ["center", "top"];

        // Button row with all buttons (4px padding for focus highlight)
        var buttonRow = helpDialog.add("group");
        buttonRow.orientation = "row";
        buttonRow.alignment = ["center", "top"];
        buttonRow.alignChildren = ["center", "center"];
        buttonRow.spacing = 8;
        buttonRow.margins = [4, 8, 4, 4];

        var codeRunnerBtn = buttonRow.add("button", undefined, "Get Code Runner");
        var kbarBtn = buttonRow.add("button", undefined, "Get KBar");
        var learnMoreBtn = buttonRow.add("button", undefined, "Learn More");
        var okBtn = buttonRow.add("button", undefined, "OK", { name: "ok" });

        function handleCodeRunnerClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.codeRunner);
                } else {
                    system.callSystem("open " + CONFIG.urls.codeRunner);
                }
            } catch (e) {}
        }

        function handleKbarClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.kbar);
                } else {
                    system.callSystem("open " + CONFIG.urls.kbar);
                }
            } catch (e) {}
        }

        function handleLearnMoreClick() {
            try {
                if ($.os.indexOf("Windows") !== -1) {
                    system.callSystem("cmd /c start " + CONFIG.urls.website);
                } else {
                    system.callSystem("open " + CONFIG.urls.website);
                }
            } catch (e) {}
        }

        function handleOK() {
            helpDialog.close();
        }

        codeRunnerBtn.onClick = handleCodeRunnerClick;
        kbarBtn.onClick = handleKbarClick;
        learnMoreBtn.onClick = handleLearnMoreClick;
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
        function onApplyClick() {
            // Check for Alt/Option key (works on both Mac and Windows)
            var altKeyPressed = ScriptUI.environment.keyboardState.altKey;
            executeGridLock(altKeyPressed);
        }

        var applyBtn = createIconButton(buttonRow, {
            iconData: ICON_GRID_LOCK,
            iconSize: 24,
            buttonSize: [BUTTON_HEIGHT, BUTTON_HEIGHT],
            defaultColor: "#c4c4c4",
            hoverColor: "#4CAF50",
            helpTip: "Grid Lock - Figma-style auto-layout\n\n" +
                     "Select layers: Create new rig\n" +
                     "Select container + layers: Add to rig\n" +
                     "Select rigged layers: Create nested rig\n" +
                     "Alt/Option + click: Remove from rig\n\n" +
                     "Resize: Double-click container, drag handles",
            onClick: onApplyClick
        });
        applyBtn.alignment = ["fill", "center"];

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
    // INITIALIZATION
    //========================

    var mainUIWindow = buildUI(thisObj);

    if (mainUIWindow instanceof Window) {
        mainUIWindow.center();
        mainUIWindow.show();
    }

})(this);
