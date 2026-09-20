/* ==========================================================
   main.js — 진입점
   화면의 요소를 찾아 에디터 코어에 연결합니다.
   이후 단계의 기능은 이 파일에서 editor 인스턴스에 연결합니다.
   ========================================================== */

(function () {
  'use strict';

  var editor = new WAYW.Editor({
    titleEl: document.getElementById('doc-title'),
    bodyEl: document.getElementById('doc-body'),
    workspaceEl: document.getElementById('workspace')
  });

  WAYW.editor = editor;

  // 열자마자 바로 제목부터 입력할 수 있도록 합니다.
  editor.focus('title');
})();
