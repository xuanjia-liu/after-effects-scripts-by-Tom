(function (thisApp) {

  /* ---------------------------------------------------- 
      settings
  ---------------------------------------------------- */

  var comp = app.project.activeItem;
  var deletedEffects = [];


  /* ---------------------------------------------------- 
      UI
  ---------------------------------------------------- */

  function createUI(obj) {
      var DeleteEffectsUI = (obj instanceof Panel) ? obj : new Window("palette", undefined); 
      if ( !(obj instanceof Panel) ) DeleteEffectsUI.text = "DeleteEffects"; 
      DeleteEffectsUI.orientation = "column"; 
      DeleteEffectsUI.alignChildren = ["center","top"]; 
      DeleteEffectsUI.spacing = 10; 
      DeleteEffectsUI.margins = 16;

      DeleteEffectsUI.setEffectsButton = DeleteEffectsUI.add("button {text: 'SetDeleteEffects'}", undefined, undefined, {name: "setEffectsButton"}); 

      DeleteEffectsUI.unSetEffectsButton = DeleteEffectsUI.add("button {text: 'UnsetDeleteEffects'}", undefined, undefined, {name: "unSetEffectsButton"}); 

      DeleteEffectsUI.DeleteButton = DeleteEffectsUI.add("button { text: 'Delete'}", undefined, undefined, {name: "DeleteButton"}); 

      return DeleteEffectsUI

  }

  var mainUI = createUI(thisApp);

  if (mainUI instanceof Window) {
      mainUI.center();
      mainUI.show();
  } else if (mainUI instanceof Panel) {
      mainUI.layout.layout(true);
  }

  /* ---------------------------------------------------- 
      functions
  ---------------------------------------------------- */

  // 選択したレイヤーの配列を返す
  function getSelectedLayerArr() {
      var arr = undefined;

      if(comp.selectedLayers.length == 0) {
          alert('Not selected Layers!');
      } else {
      arr = comp.selectedLayers
      }

      return arr;
  }

  // 削除するエフェクトをセット
  function setEffects() {
      var selectedLayerArr = getSelectedLayerArr();

      if(!selectedLayerArr) return;

      var effectsArr = selectedLayerArr[0].selectedProperties;
      var isSelectedEffects = false;

      for(var i = 0; i < effectsArr.length; i++) {
          // effectsかどうか
          if(effectsArr[i].isEffect) {
              isSelectedEffects = true;
              deletedEffects.push(effectsArr[i].name)
          } else {
              alert('not effects!\n' + effectsArr[i].name);
          }
      }

      if (!isSelectedEffects) return;

      // セットしているエフェクトをアラート表示
      var effecsText = '';

      for(var i = 0; i < deletedEffects.length; i++) {
          effecsText = effecsText + deletedEffects[i] + ',';
      }

      alert('Set effects!\n' + effecsText);
  }

  // セットしていたエフェクトを削除
  function unSetEffects() {
      deletedEffects = [];
      alert('Unset effects!');
  }

  // 選択したレイヤーのエフェクトを一括削除
  function DeleteEffects() {
      var selectedArr = getSelectedLayerArr();
      var isRemoveEffects = false;

      if(!selectedArr) return;


      app.beginUndoGroup('Delete Effects');

      for(var i = 0; i < selectedArr.length; i++) {
          for(var p = 0; p < deletedEffects.length; p++) {
              var effectsObj = selectedArr[i].property("Effects").property(deletedEffects[p]);
              if(effectsObj) {
                  effectsObj.remove();
                  isRemoveEffects = true;
              }
          }
      }

      app.endUndoGroup();

      // 1つでも削除できたレイヤーがあればセットエフェクトを空にする
      if(isRemoveEffects) deletedEffects = [];
  }

  /* ---------------------------------------------------- 
      add eventListener
  ---------------------------------------------------- */

  mainUI.setEffectsButton.onClick = function() { setEffects(); }
  mainUI.unSetEffectsButton.onClick = function() { unSetEffects(); }
  mainUI.DeleteButton.onClick = function() { DeleteEffects(); }

})(this);