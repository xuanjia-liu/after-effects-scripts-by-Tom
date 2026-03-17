/*
================================================================================
Preset Studio for After Effects
================================================================================
Version: 1.0
Author: Takayu
Description: 
  - アニメーションプリセット( *.ffx )の管理・適用ツール
  - コンポジションテンプレート機能
  - カテゴリ分類、お気に入り、サムネイル表示対応
  - ScriptUI パネル／フローティングダイアログ両対応

Requirements: After Effects CS6 以降
================================================================================
*/
(function (thisObj) {
    // --------------------------------------------------
    // 定数 & 設定
    // --------------------------------------------------
    var SCRIPT_NAME = "SaveAnimation";
    var VERSION     = "0.1";
    var SETTINGS_FN = "SaveAnimation_Settings.json";

    // Guard flag: true while refreshList() is rebuilding UI to avoid recursive events
    var isRefreshing = false;

    // デフォルト保存先 (ユーザーの書類フォルダ)
    var DEFAULT_DIR = Folder.myDocuments.fsName + "/AE_SaveAnimation";

    // ------------------------------------------------------------------
    // JSON polyfill for older ExtendScript engines (e.g. CS6)
    // ------------------------------------------------------------------
    if (typeof JSON !== "object") JSON = {};
    if (typeof JSON.parse !== "function") {
        JSON.parse = function (s) { try { return eval("(" + s + ")"); } catch (e) { throw new Error("JSON.parse failed: " + e); } };
    }
    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function (o) {
            var t = typeof o;
            if (o === null) return "null";
            if (t === "number" || t === "boolean") return o.toString();
            if (t === "string")  return '"' + o.replace(/\\/g,"\\\\").replace(/"/g,'\\"') + '"';
            if (o instanceof Array) { var a=[]; for(var i=0;i<o.length;i++) a.push(JSON.stringify(o[i])); return "["+a.join(",")+"]"; }
            if (t === "object")  { var p=[]; for(var k in o) if(o.hasOwnProperty(k)) p.push(JSON.stringify(k)+":"+JSON.stringify(o[k])); return "{"+p.join(",")+"}"; }
            return '"undefined"';
        };
    }

    // ------------------------------------------------------------------
    // Object.keys polyfill for older ExtendScript (CS6 etc.)
    // ------------------------------------------------------------------
    if (typeof Object.keys !== "function") {
        Object.keys = function (obj) {
            var arr = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) arr.push(key);
            }
            return arr;
        };
    }

    // --------------------------------------------------
    // 設定保存 / 読み込み
    // --------------------------------------------------
    var settingsFile = new File(Folder.userData.fsName + "/" + SETTINGS_FN);
    var userSettings = { presetFolder: DEFAULT_DIR, categoryList: ["Motion","Transition","Text"] };

    function loadSettings() {
        try {
            if (settingsFile.exists) {
                settingsFile.open("r");
                userSettings = JSON.parse(settingsFile.read());
                settingsFile.close();
            }
        } catch (e) {
            alert("設定読み込みエラー: " + e.toString());
            userSettings = { presetFolder: DEFAULT_DIR, categoryList: ["Motion","Transition","Text"] };
        }
    }
    function saveSettings() {
        try {
            settingsFile.open("w");
            settingsFile.write(JSON.stringify(userSettings));
            settingsFile.close();
        } catch (e) {
            alert("設定保存エラー: " + e.toString());
        }
    }
    loadSettings();
    if (!userSettings.categoryList) userSettings.categoryList = [];

    // --------------------------------------------------
    // パネル / ウィンドウ生成
    // --------------------------------------------------
    var panel = (thisObj instanceof Panel)
        ? thisObj
        : new Window("palette", SCRIPT_NAME + " v" + VERSION, undefined, { resizeable: true });
    if (!panel) { alert("パネルの作成に失敗しました"); return; }

    // --------------------------------------------------
    // UI レイアウト
    // --------------------------------------------------
    panel.orientation   = "column";
    panel.alignChildren = ["fill", "top"];
    panel.margins       = 6;

    // フォルダ選択
    var folderGrp = panel.add("group");
    folderGrp.orientation = "row";
    folderGrp.add("statictext", undefined, "Folder:");
    var folderPathTxt = folderGrp.add("edittext", undefined, userSettings.presetFolder);
    folderPathTxt.characters = 25;
    var changeFolderBtn = folderGrp.add("button", undefined, "Change...");

    // ソート行 (Sort + Category dropdown + 設定)
    var sortGrp = panel.add("group");
    sortGrp.orientation   = "row";
    sortGrp.alignChildren = ["left", "center"];

    sortGrp.add("statictext", undefined, "Sort:");
    var filterCatDrop = sortGrp.add("dropdownlist", undefined, []);
    filterCatDrop.preferredSize.width = 95;
    filterCatDrop.add("item", "All");
    for (var i = 0; i < userSettings.categoryList.length; i++) {
        filterCatDrop.add("item", userSettings.categoryList[i]);
    }
    filterCatDrop.selection = 0;

    var settingsBtn = sortGrp.add("button", undefined, "Category");

    // リスト（左） ＋ サムネ & コメント（右）
    var listGrp = panel.add("group");
    listGrp.orientation = "row";
    listGrp.alignChildren = ["fill", "top"];

    // 左側プリセットリスト
    var listBox = listGrp.add("listbox", undefined, [], { multiselect: false });
    listBox.preferredSize = [130, 220];

    // 右側縦スタック
    var rightCol = listGrp.add("group");
    rightCol.orientation = "column";
    rightCol.alignChildren = ["fill", "top"];

    // ★ Favorite行（シンプル版）
    var favGrp = rightCol.add("group");
    favGrp.orientation = "row";
    favGrp.alignChildren = ["left", "center"];
    favGrp.spacing = 3;
    var favLabel = favGrp.add("statictext", undefined, "★");
    var favCheckbox = favGrp.add("checkbox", undefined, "");
    var renameBtn = favGrp.add("button", undefined, "Rename");
    favCheckbox.enabled = false;
    renameBtn.enabled = false;
    renameBtn.preferredSize.width = 60;

    // サムネイルパネル
    var thumbPanel = rightCol.add("panel");
    thumbPanel.preferredSize = [80, 80];
    thumbPanel.visible = false;
    thumbPanel.margins = 0;

    // コメント欄（サムネ下）
    var commentGrp = rightCol.add("group");
    commentGrp.orientation = "column";
    commentGrp.alignChildren = ["fill", "top"];
    commentGrp.margins = [0, 4, 0, 0];

    // Category dropdown
    var catGrp = commentGrp.add("group");
    catGrp.orientation = "row";
    catGrp.alignChildren = ["left", "center"];
    var categoryEdit = catGrp.add("dropdownlist", undefined, userSettings.categoryList);
    categoryEdit.preferredSize.width = 130;
    categoryEdit.enabled = false;
    var commentEdit = commentGrp.add("edittext", undefined, "", { multiline: true });
    commentEdit.preferredSize = [80, 60];
    commentEdit.enabled = false;

    // ボタン群1: メイン機能
    var btnGrp = panel.add("group");
    btnGrp.orientation = "row";
    btnGrp.spacing = 4;
    var saveBtn    = btnGrp.add("button", undefined, "Save (.ffx)");
    var applyBtn   = btnGrp.add("button", undefined, "Apply");
    var deleteBtn  = btnGrp.add("button", undefined, "Delete");
    var refreshBtn = btnGrp.add("button", undefined, "Refresh");
    
    // ボタン群2: 情報・サポート
    var infoBtnGrp = panel.add("group");
    infoBtnGrp.orientation = "row";
    infoBtnGrp.spacing = 4;
    var aboutBtn = infoBtnGrp.add("button", undefined, "About");
    
    var btnW = 80;
    saveBtn.preferredSize.width   = btnW;
    applyBtn.preferredSize.width  = btnW;
    deleteBtn.preferredSize.width = btnW;
    refreshBtn.preferredSize.width = btnW;
    aboutBtn.preferredSize.width = btnW;

    // --------------------------------------------------
    // ヘルパ
    // --------------------------------------------------
    function ensureFolder(path) { var f = new Folder(path); if (!f.exists) f.create(); return f; }

    // --- Rebuild category dropdown after settings change ---
    function updateCategoryDropdown() {
        if (!categoryEdit) return;
        var selText = (categoryEdit.selection) ? categoryEdit.selection.text : null;

        categoryEdit.removeAll();
        for (var i = 0; i < userSettings.categoryList.length; i++) {
            categoryEdit.add("item", userSettings.categoryList[i]);
        }

        if (selText) {
            for (var j = 0; j < categoryEdit.items.length; j++) {
                if (categoryEdit.items[j].text === selText) {
                    categoryEdit.selection = j;
                    break;
                }
            }
        }

        // also rebuild filter dropdown
        if (filterCatDrop) {
            var prevSel = (filterCatDrop.selection) ? filterCatDrop.selection.text : "All";
            filterCatDrop.removeAll();
            filterCatDrop.add("item", "All");
            for (var ii = 0; ii < userSettings.categoryList.length; ii++) {
                filterCatDrop.add("item", userSettings.categoryList[ii]);
            }
            for (var jj = 0; jj < filterCatDrop.items.length; jj++) {
                if (filterCatDrop.items[jj].text === prevSel) {
                    filterCatDrop.selection = jj;
                    break;
                }
            }
        }
    }

    // --- side-car JSON helpers -----------------------------------------
    function getMetaFile(ffxFile) { return new File(ffxFile.fsName.replace(/\.ffx$/i, ".json")); }
    function getPreviewFile(ffxFile) { return new File(ffxFile.fsName.replace(/\.ffx$/i, ".png")); }

    function loadMeta(ffxFile) {
        var obj = { comment:"", category:"", favorite:false };
        try {
            var meta = getMetaFile(ffxFile);
            if (meta.exists) {
                meta.open("r");
                var d = JSON.parse(meta.read()); meta.close();
                if (d) {
                    if (typeof d.comment === "string") obj.comment = d.comment;
                    if (typeof d.category === "string") obj.category = d.category;
                    if (typeof d.favorite === "boolean") obj.favorite = d.favorite;
                }
            }
        } catch (_) {}
        return obj;
    }
    function saveMeta(ffxFile, meta) {
        if (typeof meta.comment !== "string") meta.comment = "";
        if (typeof meta.category !== "string") meta.category = "";
        if (typeof meta.favorite !== "boolean") meta.favorite = false;
        try {
            var metaF = getMetaFile(ffxFile);
            metaF.open("w"); metaF.write(JSON.stringify(meta)); metaF.close();
        } catch (e) { alert("メタ保存エラー: "+e); }
    }

    // --- thumbnail helper ----------------------------------------------
    function showThumbnail(pngFile) {
        if (!pngFile || !pngFile.exists) {
            thumbPanel.visible = false;
            thumbPanel.onDraw  = undefined;
            return;
        }
        var img = ScriptUI.newImage(pngFile);
        thumbPanel.onDraw = function () {
            var g = this.graphics;
            g.drawImage(img, 0, 0, this.size[0], this.size[1]); // fit
        };
        thumbPanel.visible = true;
        thumbPanel.invalidate();
    }

    // --------------------------------------------------
    // リスト更新
    // --------------------------------------------------
    function refreshList() {
        if (isRefreshing) return;
        isRefreshing = true;

        var filterCat = (filterCatDrop && filterCatDrop.selection) ? filterCatDrop.selection.text : "All";

        // 前回の選択を記憶（ファイル名ベース）
        var prevSelection = (listBox.selection && listBox.selection.fileObj) 
            ? listBox.selection.fileObj.name : null;

        listBox.removeAll();
        var dir = ensureFolder(userSettings.presetFolder);
        var files = dir.getFiles("*.ffx");

        var listData = [];
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            var meta = loadMeta(f);
            
            // フィルタリング
            if (filterCat !== "All" && meta.category !== filterCat) continue;

            var baseLabel = (typeof f.displayName === "string" && f.displayName.length)
                            ? f.displayName : f.name;
            baseLabel = baseLabel.replace(/\.ffx$/i, "");
            var label = (meta.favorite ? "★ " : "") + baseLabel;

            listData.push({
                label: label,
                file : f,
                meta : meta
            });
        }
        
        // ソート：favorite優先 → アルファベット順
        listData.sort(function(a,b){
            if (a.meta.favorite && !b.meta.favorite) return -1;
            if (!a.meta.favorite && b.meta.favorite) return 1;
            return a.label.toLowerCase() > b.label.toLowerCase() ? 1 : -1;
        });
        
        for (var j=0; j<listData.length; j++){
            var d = listData[j];
            var item = listBox.add("item", d.label);
            item.fileObj = d.file;
            item.comment = d.meta.comment;
            item._meta   = d.meta;
            item.helpTip = d.meta.comment;
            
            // 選択復元
            if (prevSelection && d.file.name === prevSelection) {
                listBox.selection = item;
            }
        }
        
        thumbPanel.visible = false;
        isRefreshing = false;
    }
    refreshList();

    // --------------------------------------------------
    // イベントハンドラ
    // --------------------------------------------------
    changeFolderBtn.onClick = function () {
        var sel = Folder.selectDialog("プリセット保存フォルダを選択", userSettings.presetFolder);
        if (sel) {
            userSettings.presetFolder = sel.fsName;
            ensureFolder(userSettings.presetFolder);
            folderPathTxt.text = sel.fsName;
            saveSettings();
            refreshList();
        }
    };

    refreshBtn.onClick = refreshList;
    filterCatDrop.onChange = refreshList;

    // Category Settings Dialog
    settingsBtn.onClick = function () {
        var dlg = new Window("dialog", "Category Settings");
        dlg.orientation   = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins       = 10;

        var mainGrp = dlg.add("group");
        mainGrp.orientation   = "row";
        mainGrp.alignChildren = ["fill", "top"];

        var catList = mainGrp.add("listbox", undefined, userSettings.categoryList, { multiselect:false });
        catList.preferredSize = [140, 150];

        var ctrlGrp = mainGrp.add("group");
        ctrlGrp.orientation = "column";
        ctrlGrp.alignChildren = ["fill","top"];

        var addBtn    = ctrlGrp.add("button", undefined, "Add");
        var renBtn    = ctrlGrp.add("button", undefined, "Rename");
        var delBtn    = ctrlGrp.add("button", undefined, "Delete");
        var upBtn     = ctrlGrp.add("button", undefined, "↑");
        var downBtn   = ctrlGrp.add("button", undefined, "↓");

        addBtn.onClick = function () {
            var n = prompt("新しいカテゴリ名", "");
            if (n) catList.add("item", n);
        };
        renBtn.onClick = function () {
            if (catList.selection) {
                var n = prompt("名前変更", catList.selection.text);
                if (n) catList.selection.text = n;
            }
        };
        delBtn.onClick = function () {
            if (catList.selection) catList.remove(catList.selection);
        };
        upBtn.onClick = function () {
            if (!catList.selection || catList.selection.index === 0) return;
            var idx = catList.selection.index;
            var txt = catList.selection.text;
            catList.remove(catList.selection);
            var it  = catList.add("item", txt, idx-1);
            catList.selection = it;
        };
        downBtn.onClick = function () {
            if (!catList.selection || catList.selection.index === catList.items.length-1) return;
            var idx = catList.selection.index;
            var txt = catList.selection.text;
            catList.remove(catList.selection);
            var it  = catList.add("item", txt, idx+1);
            catList.selection = it;
        };

        var okGrp = dlg.add("group");
        okGrp.alignment = "center";
        var okBtn  = okGrp.add("button", undefined, "OK");
        var canBtn = okGrp.add("button", undefined, "Cancel");

        okBtn.onClick = function () {
            var arr = [];
            for (var i=0; i<catList.items.length; i++) arr.push(catList.items[i].text);
            userSettings.categoryList = arr;
            saveSettings();
            updateCategoryDropdown();
            dlg.close();
            refreshList();
        };
        canBtn.onClick = function () { dlg.close(); };

        dlg.center();
        dlg.show();
    };

    // ★★★ シンプル版ベースのlistBox.onChange ★★★
    listBox.onChange = function () {
        if (listBox.selection) {
            var f = listBox.selection.fileObj;
            var m = loadMeta(f);
            
            // UI更新（シンプル）
            commentEdit.text = m.comment;
            commentEdit.enabled = true;
            
            // カテゴリ設定
            var idx = -1;
            for (var k = 0; k < categoryEdit.items.length; k++) {
                if (categoryEdit.items[k].text === m.category) { 
                    idx = k; 
                    break; 
                }
            }
            categoryEdit.selection = (idx >= 0) ? idx : null;
            categoryEdit.enabled = true;
            
            // ★重要：シンプルにチェックボックス設定（イベントハンドラなし）
            favCheckbox.value = m.favorite;
            favCheckbox.enabled = true;
            
            // リネームボタンを有効化
            renameBtn.enabled = true;
            
            // ★重要：サムネイル強制クリア後に表示（動作するコードと同じ方式）
            thumbPanel.visible = false;      // force clear previous thumb
            thumbPanel.onDraw  = undefined;  // clear cached draw handler
            showThumbnail(getPreviewFile(f));
        } else {
            commentEdit.text = "";
            commentEdit.enabled = false;
            categoryEdit.selection = null;
            categoryEdit.enabled = false;
            favCheckbox.value = false;
            favCheckbox.enabled = false;
            renameBtn.enabled = false;
            thumbPanel.visible = false;
        }
    };

    // ★★★ シンプル版ベースのfavCheckbox.onClick ★★★
    favCheckbox.onClick = function () {
        if (listBox.selection) {
            var f = listBox.selection.fileObj;
            var meta = loadMeta(f);
            meta.favorite = favCheckbox.value;
            saveMeta(f, meta);
            listBox.selection._meta = meta;
            refreshList(); // リスト更新（ソート反映）
        }
    };

    commentEdit.onChanging = function () {
        if (listBox.selection) {
            var f = listBox.selection.fileObj;
            var meta = loadMeta(f);
            meta.comment = commentEdit.text;
            saveMeta(f, meta);
            listBox.selection.comment = meta.comment;
            listBox.selection.helpTip = meta.comment;
        }
    };

    // Category dropdown change
    categoryEdit.onChange = function () {
        if (listBox.selection && categoryEdit.selection) {
            var f = listBox.selection.fileObj;
            var meta = loadMeta(f);
            meta.category = categoryEdit.selection.text;
            saveMeta(f, meta);
            listBox.selection._meta = meta;
            refreshList();
        }
    };

    // ★★★ Rename Button ★★★
    renameBtn.onClick = function () {
        if (!listBox.selection) return;
        
        var ffx = listBox.selection.fileObj;
        var currentName = ffx.name.replace(/\.ffx$/i, "");
        
        // プロンプトで新しい名前を取得
        var newName = prompt("新しいファイル名を入力してください:", currentName);
        if (!newName || newName === currentName) return;
        
        // 無効な文字を除去
        newName = newName.replace(/[\/\\:\*\?"<>\|]/g, "");
        if (!newName) {
            alert("有効なファイル名を入力してください");
            return;
        }
        
        var dir = ffx.parent;
        var newFfx = new File(dir.fsName + "/" + newName + ".ffx");
        
        // 同名ファイルの存在チェック
        if (newFfx.exists) {
            alert("同名のファイルが既に存在します: " + newName + ".ffx");
            return;
        }
        
        // 関連ファイルの取得
        var oldPng  = getPreviewFile(ffx);
        var oldJson = getMetaFile(ffx);
        
        // メインファイルのリネーム
        if (!ffx.rename(newName + ".ffx")) {
            alert("リネーム失敗: " + ffx.error);
            return;
        }
        
        // 関連ファイルのリネーム
        if (oldPng.exists) {
            if (!oldPng.rename(newName + ".png")) {
                alert("サムネイル画像のリネームに失敗しました");
            }
        }
        if (oldJson.exists) {
            if (!oldJson.rename(newName + ".json")) {
                alert("メタデータファイルのリネームに失敗しました");
            }
        }
        
        // リスト更新と選択復元
        refreshList();
        
        // リネーム後のファイルを再選択
        for (var i = 0; i < listBox.items.length; i++) {
            if (listBox.items[i].fileObj.name === (newName + ".ffx")) {
                listBox.selection = listBox.items[i];
                break;
            }
        }
    };

    // ★★★ About Button ★★★
    aboutBtn.onClick = function() {
        var aboutText = SCRIPT_NAME + " v" + VERSION + "\n\n" +
                       "After Effects用プリセット管理ツール\n\n" +
                       "機能:\n" +
                       "• FFXアニメーションプリセット管理\n" +
                       "• カテゴリ分類・お気に入り機能\n" +
                       "• サムネイル表示・コメント管理\n" +
                       "• ファイルリネーム機能\n\n" +
                       "サポート・最新版:\n" +
                       "https://gameanimation.info/\n\n" +
                       "対応バージョン: After Effects CS6以降";
        
        alert(aboutText);
    };

    listBox.onDragStart = function(){
        if (this.selection) return [this.selection];
    };
    listBox.onDragOver = function(){
        return true;
    };
    listBox.onDrop = function(sel, idx){
        if (!sel || sel.length===0) return;
        var src = sel[0];
        var destIdx = idx;
        this.remove(src);
        var newItem = this.add("item", src.text);
        newItem.fileObj = src.fileObj;
        newItem._meta   = src._meta;
        this.items[destIdx].insert(newItem);
        this.selection = newItem;
    };

    // --- Save (.ffx) ----------------------------------------------------
    saveBtn.onClick = function () {
        try {
            var comp = app.project.activeItem;
            if (!comp) throw "アクティブなコンポジションがありません";
            if (comp.selectedLayers.length === 0 &&
                comp.selectedProperties.length === 0) {
                throw "レイヤーまたはプロパティを選択してください";
            }

            Folder.current = new Folder(userSettings.presetFolder);

            function saveThumbPng(ffxFileObj) {
                try {
                    var pngPath = ffxFileObj.fsName.replace(/\.ffx$/i, ".png");
                    var pngFile = new File(pngPath);
                    if (typeof comp.saveFrameToPng === "function") {
                        comp.saveFrameToPng(comp.time, pngFile);
                    } else if (typeof comp.saveFrameToFile === "function") {
                        comp.saveFrameToFile(comp.time, pngFile, "PNG");
                    } else {
                        throw "Neither saveFrameToPng nor saveFrameToFile is available.";
                    }
                } catch (e) {
                    alert("PNG 保存失敗: " + e.toString());
                }
            }

            var cmdNames = [
                "Save Animation Preset...",
                "Save Animation Preset\u2026",
                "アニメーションプリセットを保存...",
                "アニメーションプリセットを保存\u2026"
            ];
            var cmdId = 0;
            for (var i=0;i<cmdNames.length && cmdId===0;i++){
                cmdId = app.findMenuCommandId(cmdNames[i]);
            }
            if (cmdId===0) cmdId = 3075;
            if (cmdId===0) cmdId = 3773;

            if (cmdId===0) throw "Save Animation Preset コマンドが見つかりません";

            var beforeNames = {};
            var preFiles = Folder.current.getFiles("*.ffx");
            for (var bi = 0; bi < preFiles.length; bi++) beforeNames[preFiles[bi].fsName] = true;

            app.executeCommand(cmdId);

            var newestFfx = null;
            var waitMs = 0;
            while (waitMs < 3000 && !newestFfx) {
                $.sleep(200);
                waitMs += 200;
                var nowFiles = Folder.current.getFiles("*.ffx");
                for (var ni = 0; ni < nowFiles.length; ni++) {
                    if (!beforeNames[nowFiles[ni].fsName]) {
                        newestFfx = nowFiles[ni];
                        break;
                    }
                }
            }

            if (!newestFfx) {
                newestFfx = File.openDialog("保存した .ffx を選択してください", "*.ffx", false);
                if (!newestFfx) throw "保存した .ffx を検出できませんでした";
            }
            var savedName = undefined;
            if (newestFfx) {
                saveThumbPng(newestFfx);
                savedName = newestFfx.name;
            }

            refreshList();
            if (savedName) {
                for (var ii = 0; ii < listBox.items.length; ii++){
                    if (listBox.items[ii].fileObj.name === savedName){
                        listBox.selection = listBox.items[ii];
                        break;
                    }
                }
            }
            return;
        } catch(e){
            alert("保存エラー: "+e);
        }
    };

    // --- Apply ----------------------------------------------------------
    applyBtn.onClick = function () {
        try {
            if (!listBox.selection) throw "プリセットを選択してください";
            var presetFile = listBox.selection.fileObj;
            if (!presetFile.exists) throw "プリセットファイルが見つかりません";

            var comp = app.project.activeItem;
            if (!comp) throw "アクティブなコンポジションがありません";
            if (comp.selectedLayers.length===0) throw "レイヤーを選択してください";

            app.beginUndoGroup("Apply FFX Preset");
            for (var i=0;i<comp.selectedLayers.length;i++){
                comp.selectedLayers[i].applyPreset(presetFile);
            }
            app.endUndoGroup();
        } catch(e){
            alert("適用エラー: "+e);
        }
    };

    // --- Delete ---
    deleteBtn.onClick = function () {
        if (!listBox.selection) { alert("削除するプリセットを選択してください"); return; }
        var ffx = listBox.selection.fileObj;
        if (!ffx.exists) { alert("ファイルが既にありません"); return; }
        if (confirm("選択したプリセットを削除しますか？\n"+ffx.fsName)) {
            ffx.remove();
            var meta = getMetaFile(ffx); if (meta.exists) meta.remove();
            var png  = getPreviewFile(ffx); if (png.exists) png.remove();
            refreshList();
        }
    };

    // --------------------------------------------------
    // レイアウト & 表示
    // --------------------------------------------------
    panel.layout.layout(true);
    if (!(thisObj instanceof Panel)) { panel.center(); panel.show(); }

})(this);