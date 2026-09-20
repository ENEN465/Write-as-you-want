/* ==========================================================
   editor.js — 에디터 코어 (0단계)

   담당 범위
   - 제목(textarea) + 본문(contenteditable) 입력 처리
   - 본문이 비었을 때의 상태 유지 (항상 <p> 단락 1개 이상)
   - 붙여넣기는 서식 없이 텍스트로만 (외부 스타일 유입 방지)
   - 한글 조합(IME) 중에는 DOM을 건드리지 않음
   - 이후 단계가 연결할 최소한의 공개 API: on / off / getData / setData / focus

   서식·글자 수·저장 등은 이후 단계에서 별도 파일로 추가합니다.
   ========================================================== */

(function (global) {
  'use strict';

  var WAYW = (global.WAYW = global.WAYW || {});

  var EMPTY_BODY_HTML = '<p><br></p>';

  function Editor(options) {
    this.titleEl = options.titleEl;
    this.bodyEl = options.bodyEl;
    this.workspaceEl = options.workspaceEl || null;

    this._listeners = {};
    this._composing = false;
    this._muted = false;

    this._init();
  }

  /* ---------- 초기화 ---------- */

  Editor.prototype._init = function () {
    var self = this;

    // Enter 시 <div>가 아닌 <p>로 단락을 나눕니다.
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch (err) {
      /* 지원하지 않는 브라우저는 기본 동작을 따릅니다. */
    }

    // 제목
    this.titleEl.addEventListener('input', function () {
      self._resizeTitle();
      self._emit('change', { source: 'title' });
    });
    this.titleEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        if (e.isComposing || e.keyCode === 229) return; // 한글 조합 중 Enter는 그대로 둡니다.
        e.preventDefault();
        self.focus('body-start');
      }
    });
    this.titleEl.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = self._getClipboardText(e).replace(/\s*\n\s*/g, ' ');
      if (!text) return;
      var t = self.titleEl;
      t.setRangeText(text, t.selectionStart, t.selectionEnd, 'end');
      t.dispatchEvent(new Event('input', { bubbles: true }));
    });
    window.addEventListener('resize', function () {
      self._resizeTitle();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        self._resizeTitle();
      });
    }

    // 본문
    this.bodyEl.addEventListener('compositionstart', function () {
      self._composing = true;
    });
    this.bodyEl.addEventListener('compositionend', function () {
      self._composing = false;
      self._normalizeBody();
      self._syncEmptyState();
    });
    this.bodyEl.addEventListener('input', function () {
      if (!self._composing) self._normalizeBody();
      self._syncEmptyState();
      self._emit('change', { source: 'body' });
    });
    this.bodyEl.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = self._getClipboardText(e);
      if (text) self._insertPlainText(text);
    });

    // 페이지의 빈 곳을 누르면 본문 끝에 커서를 둡니다.
    if (this.workspaceEl) {
      this.workspaceEl.addEventListener('mousedown', function (e) {
        var t = e.target;
        if (t === self.titleEl || self.bodyEl.contains(t)) return;
        e.preventDefault();
        self.focus('body-end');
      });
    }

    this._resizeTitle();
    this._syncEmptyState();
  };

  /* ---------- 공개 API ---------- */

  // 이벤트: 'change' — { source: 'title' | 'body' | 'data' }
  Editor.prototype.on = function (name, fn) {
    (this._listeners[name] = this._listeners[name] || []).push(fn);
  };

  Editor.prototype.off = function (name, fn) {
    var list = this._listeners[name];
    if (!list) return;
    this._listeners[name] = list.filter(function (f) {
      return f !== fn;
    });
  };

  Editor.prototype.getData = function () {
    return {
      title: this.titleEl.value,
      html: this.bodyEl.innerHTML,
      text: this._getBodyText()
    };
  };

  Editor.prototype.setData = function (data) {
    data = data || {};
    this.titleEl.value = data.title || '';
    this.bodyEl.innerHTML = data.html ? data.html : EMPTY_BODY_HTML;
    this._normalizeBody();
    this._resizeTitle();
    this._syncEmptyState();
    this._emit('change', { source: 'data' });
  };

  // where: 'title' | 'body-start' | 'body-end'
  Editor.prototype.focus = function (where) {
    if (where === 'title') {
      this.titleEl.focus();
      return;
    }
    this.bodyEl.focus();
    this._placeCaret(where === 'body-start');
  };

  /* ---------- 내부 동작 ---------- */

  Editor.prototype._emit = function (name, payload) {
    if (this._muted) return;
    var list = this._listeners[name] || [];
    for (var i = 0; i < list.length; i++) list[i](payload);
  };

  Editor.prototype._getBodyText = function () {
    var paragraphs = this.bodyEl.children;
    var lines = [];
    for (var i = 0; i < paragraphs.length; i++) {
      lines.push(paragraphs[i].textContent);
    }
    return lines.join('\n');
  };

  Editor.prototype._resizeTitle = function () {
    var t = this.titleEl;
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 'px';
  };

  // 본문이 완전히 비면 브라우저가 <p>를 지워 버리는 경우가 있어 다시 채웁니다.
  Editor.prototype._normalizeBody = function () {
    var body = this.bodyEl;
    var hasBlock = body.querySelector('p, div') !== null;
    if (!hasBlock && body.textContent === '') {
      body.innerHTML = EMPTY_BODY_HTML;
      this._placeCaret(true);
    }
  };

  Editor.prototype._syncEmptyState = function () {
    var empty = this.bodyEl.children.length <= 1 && this.bodyEl.textContent === '';
    this.bodyEl.classList.toggle('is-empty', empty);
  };

  Editor.prototype._placeCaret = function (atStart) {
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(this.bodyEl);
    range.collapse(atStart);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  Editor.prototype._getClipboardText = function (e) {
    var data = e.clipboardData || window.clipboardData;
    var text = data ? data.getData('text/plain') : '';
    return text.replace(/\r\n?/g, '\n');
  };

  // 서식 없이 텍스트만 삽입합니다. 실행 취소(Ctrl+Z) 기록은 유지됩니다.
  Editor.prototype._insertPlainText = function (text) {
    var lines = text.split('\n');
    this._muted = true;
    for (var i = 0; i < lines.length; i++) {
      if (i > 0) document.execCommand('insertParagraph');
      if (lines[i]) document.execCommand('insertText', false, lines[i]);
    }
    this._muted = false;
    this._syncEmptyState();
    this._emit('change', { source: 'body' });
  };

  WAYW.Editor = Editor;
})(window);
