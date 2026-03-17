(function (aGbl) {
    //UIを作る。
    function mCreateUI(aObj) {
        var mPorW = (aObj instanceof Panel) ? aObj : new Window("palette", "AlignAp", undefined);
        mPorW.preferredSize = [200, 200];
        mPorW.margins = [5, 5, 5, 5];
        mPorW.spacing = 10;

        mPorW.mGpAlg = mPorW.add("group { orientation : 'Column', alignment :  [ 'fill','top' ] , margins : [5, 5, 5, 5],spacing : 5}");


        mPorW.mGpAlg0 = mPorW.mGpAlg.add("Group { alignment :  [ 'left','top' ], margins:[0,0,0,0] , spacing:0 }");
        mPorW.mGpAlg0.add("statictext { preferredSize : [-1,20]  , text : 'Align : ', alignment :  [ 'left','top' ]}");
        mPorW.mGpAlg0.add("radiobutton { preferredSize : [-1,20]  , text : 'Comp' ,alignment :  [ 'left','top' ] ,properties:{name:'mRbAlgCmp'} }");
        mPorW.mGpAlg0.add("radiobutton { preferredSize : [-1,20]  , text : 'Selection' ,alignment :  [ 'left','top' ] ,properties:{name:'mRbAlgSR'} }");
        mPorW.mGpAlg0.mRbAlgSR.value = true;

        mPorW.mGpAlg1 = mPorW.mGpAlg.add("Group { alignment :  [ 'left','top' ], margins:[0,0,0,0] , spacing:0 }");
        mPorW.mGpAlg1.add("button { preferredSize : [20,20]  , text : '<' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtAlgL'} }");
        mPorW.mGpAlg1.add("button { preferredSize : [20,20]  , text : '|' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtAlgMidTB'} }");
        mPorW.mGpAlg1.add("button { preferredSize : [20,20]  , text : '>' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtAlgR'} }");
        mPorW.mGpAlg1.add("staticText { preferredSize : [20,20]  , text : '' ,alignment :  [ 'left','top' ] ,properties:{name:'mStAlgBr'} }");
        mPorW.mGpAlg1.add("button { preferredSize : [20,20]  , text : '^' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtAlgT'} }");
        mPorW.mGpAlg1.add("button { preferredSize : [20,20]  , text : '-' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtAlgMidLR'} }");
        mPorW.mGpAlg1.add("button { preferredSize : [20,20]  , text : 'v' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtAlgB'} }");

        mPorW.mGpAlg2 = mPorW.mGpAlg.add("Group { alignment :  [ 'left','top' ], margins:[0,0,0,0] , spacing:0 }");
        mPorW.mGpAlg2.add("statictext { preferredSize : [-1,20]  , text : 'Place : ', alignment :  [ 'left','top' ]}");

        mPorW.mGpAlg3 = mPorW.mGpAlg.add("Group { alignment :  [ 'left','top' ], margins:[0,0,0,0] , spacing:0 }");
        mPorW.mGpAlg3.add("button { preferredSize : [20,20]  , text : '=' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtPlcY'} }");
        mPorW.mGpAlg3.add("button { preferredSize : [20,20]  , text : '||' ,alignment :  [ 'left','top' ] ,properties:{name:'mBtPlcX'} }");

        return mPorW;
    }
    //とりあえずUIを表示させる。
    var mPnl = mCreateUI(aGbl);
    if (mPnl instanceof Window) {
        mPnl.center();
        mPnl.show();
    } else if (mPnl instanceof Panel) {
        mPnl.layout.layout(true);
    }
    //----------------------------------------------------------------------------------------------------------------------
    //ボタンのオンクリックを追加。
    mPnl.mGpAlg1.mBtAlgL.onClick = function () { mAlignPt(true, 0, mPnl.mGpAlg0.mRbAlgCmp.value); }
    mPnl.mGpAlg1.mBtAlgMidTB.onClick = function () { mAlignPt(true, 1, mPnl.mGpAlg0.mRbAlgCmp.value); }
    mPnl.mGpAlg1.mBtAlgR.onClick = function () { mAlignPt(true, 2, mPnl.mGpAlg0.mRbAlgCmp.value); }

    mPnl.mGpAlg1.mBtAlgT.onClick = function () { mAlignPt(false, 0, mPnl.mGpAlg0.mRbAlgCmp.value); }
    mPnl.mGpAlg1.mBtAlgMidLR.onClick = function () { mAlignPt(false, 1, mPnl.mGpAlg0.mRbAlgCmp.value); }
    mPnl.mGpAlg1.mBtAlgB.onClick = function () { mAlignPt(false, 2, mPnl.mGpAlg0.mRbAlgCmp.value); }

    mPnl.mGpAlg3.mBtPlcX.onClick = function () { mPlacePt(true); }
    mPnl.mGpAlg3.mBtPlcY.onClick = function () { mPlacePt(false); }

    //----------------------------------------------------------------------------------------------------------------------
    //----------------------------------------------------------------------------------------------------------------------
    //使用関数。
    function mAlignPt(aIsX, aMinCtMax, aIsCmp) {
        app.beginUndoGroup("AlgAp");

        var mIsX = aIsX;
        var mMinCtMax = aMinCtMax;
        var mIsCmp = aIsCmp;

        var mAi = app.project.activeItem;
        var mSls = mAi.selectedLayers;

        if (aIsCmp) {
            var mCmpW = mAi.width;
            var mCmpH = mAi.height;
            var mMinX = 0;
            var mMaxX = mCmpW;
            var mMinY = 0;
            var mMaxY = mCmpH;
            var mCtrX = (mMaxX + mMinX) / 2;
            var mCtrY = (mMaxY + mMinY) / 2;
        } else {
            //まずは全選択レイヤーの位置から、それらを囲む四隅と中央を出す。
            //親子レイヤーにはとりあえず非対応とする。
            var mPts = [];
            for (var i = 0; i < mSls.length; i++) {
                var mSl = mSls[i];
                var mPt = mSl.position.value;
                mPts.push(mPt);
            }
            mPts.sort(function (a, b) { return a[0] - b[0]; });
            var mMinX = mPts[0][0];
            var mMaxX = mPts[mPts.length - 1][0];
            mPts.sort(function (a, b) { return a[1] - b[1]; });
            var mMinY = mPts[0][1];
            var mMaxY = mPts[mPts.length - 1][1];
            var mCtrX = (mMaxX + mMinX) / 2;
            var mCtrY = (mMaxY + mMinY) / 2;
        }

        //押したボタンに応じて適用値を分岐させる。
        if (mIsX) {
            if (mMinCtMax === 0) { var mRstVal = mMinX; }
            if (mMinCtMax === 1) { var mRstVal = mCtrX; }
            if (mMinCtMax === 2) { var mRstVal = mMaxX; }
        } else {
            if (mMinCtMax === 0) { var mRstVal = mMinY; }
            if (mMinCtMax === 1) { var mRstVal = mCtrY; }
            if (mMinCtMax === 2) { var mRstVal = mMaxY; }
        }

        //全選択レイヤーの位置を上書きする。
        if (mIsX) {
            for (var i = 0; i < mSls.length; i++) {
                var mSl = mSls[i];
                var mPosProp = mSl.position;
                var mRstPt3D = [mRstVal, mPosProp.value[1], mPosProp.value[2]];
                mAplyPt(mSl, mRstPt3D, mAi.Time);
            }
        } else {
            for (var i = 0; i < mSls.length; i++) {
                var mSl = mSls[i];
                var mPosProp = mSl.position;
                var mRstPt3D = [mPosProp.value[0], mRstVal, mPosProp.value[2]];
                mAplyPt(mSl, mRstPt3D, mAi.Time);
            }
        }

        app.activeViewer.setActive();
        app.endUndoGroup();
    }

    //----------------------------------------------------------------------------------------------------------------------
    function mPlacePt(aIsX) {
        app.beginUndoGroup("PlcAp");

        var mIsX = aIsX;

        var mAi = app.project.activeItem;
        var mSls = mAi.selectedLayers;

        //選択数１以下だと、後の距離計算でゼロによる除算エラーが出るのでリターンする。
        if (mSls.length <= 1) { return; }

        if (mIsX) {
            //レイヤーを昇順ソートし、ついでにMinとMaxを出す。
            mSls.sort(function (a, b) { return a.position.value[0] - b.position.value[0]; });
            var mMinVal = mSls[0].position.value[0];
            var mMaxVal = mSls[mSls.length - 1].position.value[0];
            //順に足していく値を出す。
            var mStdLgt = (mMaxVal - mMinVal) / (mSls.length - 1);
            //値を適用する。
            for (var i = 0; i < mSls.length; i++) {
                var mSl = mSls[i];
                var mPosProp = mSl.position;
                var mRstPt3D = [mMinVal + (mStdLgt * i), mPosProp.value[1], mPosProp.value[2]];
                mAplyPt(mSl, mRstPt3D, mAi.Time);
            }
        } else {
            //レイヤーを昇順ソートし、ついでにMinとMaxを出す。
            mSls.sort(function (a, b) { return a.position.value[1] - b.position.value[1]; });
            var mMinVal = mSls[0].position.value[1];
            var mMaxVal = mSls[mSls.length - 1].position.value[1];
            //順に足していく値を出す。
            var mStdLgt = (mMaxVal - mMinVal) / (mSls.length - 1);
            //値を適用する。
            for (var i = 0; i < mSls.length; i++) {
                var mSl = mSls[i];
                var mPosProp = mSl.position;
                var mRstPt3D = [mSl.position.value[0], mMinVal + (mStdLgt * i), mPosProp.value[2]];
                mAplyPt(mSl, mRstPt3D, mAi.Time);
            }
        }
        app.activeViewer.setActive();
        app.endUndoGroup();

    }
    //----------------------------------------------------------------------------------------------------------------------
    //位置適用の汎用関数。
    //aTimeは省略可能ではない。
    //3次元値を入れることに注意。
    //次元分割していなければ、３Dスイッチがオフでも3次元値を入れられるので問題ない（2次元でないとエラーが出るのはシェイプの位置）。
    //次元分割していた場合のzPosは、２Dだとhiddenで、値を入れるとエラーが出るので、３Dスイッチを確認してから適用する。
    //キー有りならキーを打ち、無しならば値だけ変える。
    //エクスプレッションがある場合はいったん外して値適用してから戻す。
    function mAplyPt(aLyr, aVal3D, aTime) {
        var mLyr = aLyr;
        var mPosProp = mLyr.position;
        var mVal3D = aVal3D;
        var mTime = aTime;

        //エクスプレッションの考慮。そもそもの計算する新値はエクスプレッション後の値。
        //新値（Exp後）が旧値（Exp後）と変わらない場合は新値をExp前valueに適用しない。
        //違う場合は新値をExp前valueに適用して移動させる。
        //移動なしの場合、Expを外すと元値が変わっていないのでズレる。
        //移動ありの場合、Expがかかっているので動かず整列しないが、Expを外すと整列している。
        //ただし、wiggleの場合は
        //移動なしの場合、Expを外すと元値が変わっていないのでズレるのは一緒だが、
        //移動ありの場合、半端にそろって整列しない。が、Expを外すと整列している。
        if (mPosProp.value.toString() === mVal3D.toString()) { return; }

        //次元分割していた場合。
        //各posを指定するにはtransformが必要。
        //次元分割していればposと各posの値は同じ。
        //次元分割していなければ、各posは実は指定はできるがデフォルト値となっており、posのほうを採用する必要がある。
        var mHasExp = false;
        if (mPosProp.dimensionsSeparated) {
            var mPrtTfm = mPosProp.propertyGroup(1);
            var mXposProp = mPrtTfm.xPosition;
            if (mXposProp.numKeys === 0) { mXposProp.setValue(mVal3D[0]); }
            else { mXposProp.setValueAtTime(mAi.time, mVal3D[0]); }

            var mYposProp = mPrtTfm.yPosition;
            if (mYposProp.numKeys === 0) { mYposProp.setValue(mVal3D[1]); }
            else { mYposProp.setValueAtTime(mAi.time, mVal3D[1]); }

            if (mLyr.threeDLayer) {
                var mZposProp = mPrtTfm.zPosition;
                if (mZposProp.numKeys === 0) { mZposProp.setValue(mVal3D[2]); }
                else { mZposProp.setValueAtTime(mAi.time, mVal3D[2]); }
            }
            //次元分割していない場合。
        } else {
            if (mPosProp.numKeys === 0) { mPosProp.setValue(mVal3D); }
            else { mPosProp.setValueAtTime(mAi.time, mVal3D); }
            if (mHasExp) { mPosProp.expressionEnabled = true; }
        }
    }
    //----------------------------------------------------------------------------------------------------------------------
})(this);