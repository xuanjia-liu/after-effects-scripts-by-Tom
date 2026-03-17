function GG_ExpMane(thisObj) {
  function initializeFolder(folderName) {
    var folderPath = Folder.myDocuments.fsName + '/ExpMane/' + folderName;
    var expfold = new Folder(folderPath);
    var expfile;
    var explen;

    if (!expfold.exists) {
      expfold.create();
    } else {
      expfile = expfold.getFiles('*.txt');
      explen = expfile.length;
    }

    return { expfold: expfold, expfile: expfile, explen: explen };
  }

  var result_1 = initializeFolder('default');
  var expfold_1 = result_1.expfold;
  var expfile_1 = result_1.expfile;
  var explen_1 = result_1.explen;

  var result_2 = initializeFolder('text');
  var expfold_2 = result_2.expfold;
  var expfile_2 = result_2.expfile;
  var explen_2 = result_2.explen;

  var result_3 = initializeFolder('Wiggle&loop');
  var expfold_3 = result_3.expfold;
  var expfile_3 = result_3.expfile;
  var explen_3 = result_3.explen;

  var result_4 = initializeFolder('in&out');
  var expfold_4 = result_4.expfold;
  var expfile_4 = result_4.expfile;
  var explen_4 = result_4.explen;


  var comp;
  var complay;
  var complayva;
  var selay;
  var seleng;
  var selayindex;

  var selayloop = 0;
  var proloop = 0;

  var text = 'Expression';

  var rowcode = '#g8%r&6s=v0!';
  var rowt = '#';

  function BuildUI(thisObj) {
    var ObjSM = 16;
    var mainWin =
      thisObj instanceof Panel
        ? thisObj
        : new Window('palette', 'EX Manager(modified)', undefined, {
            resizeable: true,
            dockable: true,
          });
    mainWin.orientation = 'column';

    mainWin.spacing = ObjSM;
    mainWin.margins = 0;

    var mainGrp = mainWin.add('group');
    mainGrp.spacing = ObjSM* 0.4;
    mainGrp.margins = ObjSM* 0.5;
    mainGrp.orientation = 'row';
    mainGrp.alignment = ['fill', 'fill'];

    // Left Side (Event Handling UI)
    var leftGrp = mainGrp.add('group');
    leftGrp.orientation = 'column';
    leftGrp.spacing = ObjSM * 0.5;
    leftGrp.margins = 0;
    leftGrp.alignChildren = ['fill', 'top'];
    leftGrp.alignment = ['left', 'fill'];

    // Tabs group margins [left,top,right,bottom]; 
    var tabGroup = leftGrp.add('tabbedpanel');
    tabGroup.spacing = 0;
    tabGroup.margins = 0;
    tabGroup.alignChildren = ['fill', 'fill'];
    tabGroup.alignment = ['left', 'fill'];
    tabGroup.preferredSize.width = 240;

    // Tab1
    var tab1 = tabGroup.add('tab');
    tab1.text = 'Def';

    var PresetList1 = tab1.add('listbox');
    PresetList1.alignment = ['fill', 'fill'];
    PresetList1.preferredSize.width = 240;

    // buttons under the PresetList1
    var bottomBtnsGrp1 = tab1.add('group');
    bottomBtnsGrp1.spacing = ObjSM * 0.5;
    bottomBtnsGrp1.margins = 0;
    bottomBtnsGrp1.orientation = 'row';
    bottomBtnsGrp1.alignment = ['fill', 'bottom'];
    bottomBtnsGrp1.preferredSize.height = 40;

    var openFileBtn1 = bottomBtnsGrp1.add('button', undefined, 'Open Folder');
    openFileBtn1.alignment = ['fill', 'fill'];

    var refreshBtn1 = bottomBtnsGrp1.add('button', undefined, 'Refresh');
    refreshBtn1.alignment = ['right', 'fill'];
    refreshBtn1.preferredSize.width = 48;

    var Eaddbtn1 = bottomBtnsGrp1.add('button', undefined, '+');
    Eaddbtn1.alignment = ['right', 'fill'];
    Eaddbtn1.preferredSize.width = 24;
    Eaddbtn1.preferredSize.height = 20;

    var Edelbtn1 = bottomBtnsGrp1.add('button', undefined, '-');
    Edelbtn1.alignment = ['right', 'fill'];
    Edelbtn1.preferredSize.width = 24;
    Edelbtn1.preferredSize.height = 20;
    Edelbtn1.enabled = false; // Initially disable the button


    // Tab2
    var tab2 = tabGroup.add('tab');
    tab2.text = 'Text';

    var PresetList2 = tab2.add('listbox');
    PresetList2.alignment = ['fill', 'fill'];
    PresetList2.preferredSize.width = 240;

    // buttons under the PresetList2
    var bottomBtnsGrp2 = tab2.add('group');
    bottomBtnsGrp2.spacing = ObjSM * 0.5;
    bottomBtnsGrp2.margins = 0;
    bottomBtnsGrp2.orientation = 'row';
    bottomBtnsGrp2.alignment = ['fill', 'bottom'];
    bottomBtnsGrp2.preferredSize.height = 40;

    var openFileBtn2 = bottomBtnsGrp2.add('button', undefined, 'Open Folder');
    openFileBtn2.alignment = ['fill', 'fill'];

    var refreshBtn2 = bottomBtnsGrp2.add('button', undefined, 'Refresh');
    refreshBtn2.alignment = ['right', 'fill'];
    refreshBtn2.preferredSize.width = 48;

    var Eaddbtn2 = bottomBtnsGrp2.add('button', undefined, '+');
    Eaddbtn2.alignment = ['right', 'fill'];
    Eaddbtn2.preferredSize.width = 24;
    Eaddbtn2.preferredSize.height = 20;

    var Edelbtn2 = bottomBtnsGrp2.add('button', undefined, '-');
    Edelbtn2.alignment = ['right', 'fill'];
    Edelbtn2.preferredSize.width = 24;
    Edelbtn2.preferredSize.height = 20;
    Edelbtn2.enabled = false; // Initially disable the button


    // Tab3
    var tab3 = tabGroup.add('tab');
    tab3.text = 'Wig&loop';

    var PresetList3 = tab3.add('listbox');
    PresetList3.alignment = ['fill', 'fill'];
    PresetList3.preferredSize.width = 240;

    // buttons under the PresetList3
    var bottomBtnsGrp3 = tab3.add('group');
    bottomBtnsGrp3.spacing = ObjSM * 0.5;
    bottomBtnsGrp3.margins = 0;
    bottomBtnsGrp3.orientation = 'row';
    bottomBtnsGrp3.alignment = ['fill', 'bottom'];
    bottomBtnsGrp3.preferredSize.height = 40;

    var openFileBtn3 = bottomBtnsGrp3.add('button', undefined, 'Open Folder');
    openFileBtn3.alignment = ['fill', 'fill'];

    var refreshBtn3 = bottomBtnsGrp3.add('button', undefined, 'Refresh');
    refreshBtn3.alignment = ['right', 'fill'];
    refreshBtn3.preferredSize.width = 48;

    var Eaddbtn3 = bottomBtnsGrp3.add('button', undefined, '+');
    Eaddbtn3.alignment = ['right', 'fill'];
    Eaddbtn3.preferredSize.width = 24;
    Eaddbtn3.preferredSize.height = 20;

    var Edelbtn3 = bottomBtnsGrp3.add('button', undefined, '-');
    Edelbtn3.alignment = ['right', 'fill'];
    Edelbtn3.preferredSize.width = 24;
    Edelbtn3.preferredSize.height = 20;
    Edelbtn3.enabled = false; // Initially disable the button    



    // Tab4
    var tab4 = tabGroup.add('tab');
    tab4.text = 'In&Out';

    var PresetList4 = tab4.add('listbox');
    PresetList4.alignment = ['fill', 'fill'];
    PresetList4.preferredSize.width = 240;

    // buttons under the PresetList4
    var bottomBtnsGrp4 = tab4.add('group');
    bottomBtnsGrp4.spacing = ObjSM * 0.5;
    bottomBtnsGrp4.margins = 0;
    bottomBtnsGrp4.orientation = 'row';
    bottomBtnsGrp4.alignment = ['fill', 'bottom'];
    bottomBtnsGrp4.preferredSize.height = 40;

    var openFileBtn4 = bottomBtnsGrp4.add('button', undefined, 'Open Folder');
    openFileBtn4.alignment = ['fill', 'fill'];

    var refreshBtn4 = bottomBtnsGrp4.add('button', undefined, 'Refresh');
    refreshBtn4.alignment = ['right', 'fill'];
    refreshBtn4.preferredSize.width = 48;

    var Eaddbtn4 = bottomBtnsGrp4.add('button', undefined, '+');
    Eaddbtn4.alignment = ['right', 'fill'];
    Eaddbtn4.preferredSize.width = 24;
    Eaddbtn4.preferredSize.height = 20;

    var Edelbtn4 = bottomBtnsGrp4.add('button', undefined, '-');
    Edelbtn4.alignment = ['right', 'fill'];
    Edelbtn4.preferredSize.width = 24;
    Edelbtn4.preferredSize.height = 20;
    Edelbtn4.enabled = false; // Initially disable the button    





    // btn functions
    function addItemsToPresetList(PresetList, expfiles) {
      for (var i = 0; i < expfiles.length; i++) {
        PresetList.add('item', decodeURIComponent(expfiles[i].name.replace('.txt', '')));
      }
    }

    addItemsToPresetList(PresetList1, expfile_1);
    addItemsToPresetList(PresetList2, expfile_2);
    addItemsToPresetList(PresetList3, expfile_3);
    addItemsToPresetList(PresetList4, expfile_4);


    function handleFileActions(fileBtn, fold, fileList, expfile, explen) {
      fileBtn.onClick = function () {
        fold.execute();
      };

      fileList.onClick = function () {
        expfile = fold.getFiles('*.txt');
        explen = expfile.length;

        fileList.removeAll();
        for (var i = 0; i < explen; i++) {
          fileList.add('item', decodeURIComponent(expfile[i].name.replace('.txt', '')));
        }
      };
    }

    // Apply the function to each file button and list
    handleFileActions(openFileBtn1, expfold_1, PresetList1, expfile_1, explen_1);
    handleFileActions(openFileBtn2, expfold_2, PresetList2, expfile_2, explen_2);
    handleFileActions(openFileBtn3, expfold_3, PresetList3, expfile_3, explen_3);
    handleFileActions(openFileBtn4, expfold_4, PresetList4, expfile_4, explen_4);


    function handlePresetActions(addBtn, delBtn, expfold, PresetList, expfile, explen) {
      addBtn.onClick = function () {
        var presetName = Ename.text;
        import React, { useState } from 'react';

        const PresetActions = ({ expfold, presetName, text, PresetList, expfile, explen }) => {
          const handlePresetActions = () => {
            const presetFile = new File(`${expfold.fsName}/${presetName}.txt`);

            if (!presetFile.exists || confirm('Do you want to overwrite the preset?')) {
              for (let i = 0; i < explen; i++) {
                PresetList.remove(0);
              }

              if (presetFile.exists) {
                presetFile.remove();
              }

              presetFile.open('w');
              presetFile.write(
                text
                  .replace(new RegExp(rowt + rowt + 'n', 'g'), rowcode)
                  .replace(new RegExp(rowt + 'n', 'g'), '\n')
                  .replace(new RegExp(rowcode, 'g'), rowt + 'n')
              );
              presetFile.close();

              expfile = expfold.getFiles('*.txt');
              explen = expfile.length;

              for (let i = 0; i < explen; i++) {
                PresetList.add('item', decodeURIComponent(expfile[i].name.replace('.txt', '')));
              }
            }
          };

          const handleDelete = () => {
            const selectedIndex = PresetList.selection.index;

            if (selectedIndex >= 0) {
              const selectedFile = expfile[selectedIndex];
              PresetList.remove(selectedIndex);
              selectedFile.remove();

              expfile = expfold.getFiles('*.txt');
              explen = expfile.length;
            }
          };

          return (
            <>
              <button onClick={handlePresetActions}>Add Preset</button>
              <button onClick={handleDelete}>Delete Preset</button>
            </>
          );
        };

        const ExpressionHandling = () => {
          const [presetName, setPresetName] = useState('PresetName');
          const [expression, setExpression] = useState('Expression');

          const handlePresetList = () => {
            // handle preset list logic here
          };

          const handleGetExpression = () => {
            // handle get expression logic here
          };

          const handleExpressionChange = (e) => {
            setExpression(e.target.value);
          };

          const handlePresetNameChange = (e) => {
            setPresetName(e.target.value);
          };

          return (
            <div>
              <div>
                <label>Preset Name:</label>
                <input type="text" value={presetName} onChange={handlePresetNameChange} />
              </div>
              <div>
                <label>Expression:</label>
                <textarea value={expression} onChange={handleExpressionChange} />
              </div>
              <button onClick={handleGetExpression}>Get Expression</button>
              <button onClick={handlePresetList}>Apply Preset</button>
            </div>
          );
        };

        const ExtraTools = () => {
          const handleDeleteExpressions = () => {
            // handle delete expressions logic here
          };

          const handleToggleEnabled = () => {
            // handle toggle enabled logic here
          };

          const handleBakeExpressions = () => {
            // handle bake expressions logic here
          };

          return (
            <div>
              <button onClick={handleDeleteExpressions}>Delete Expressions</button>
              <button onClick={handleToggleEnabled}>Toggle Enabled</button>
              <button onClick={handleBakeExpressions}>Bake</button>
            </div>
          );
        };

        const App = () => {
          return (
            <div>
              <PresetActions />
              <ExpressionHandling />
              <ExtraTools />
            </div>
          );
        };

        export default App;
