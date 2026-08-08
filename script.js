import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';
import { Extension } from 'https://esm.sh/@tiptap/core@2.1.13';
import { Plugin, PluginKey } from 'https://esm.sh/@tiptap/pm@2.1.13/state';
import { Decoration, DecorationSet } from 'https://esm.sh/@tiptap/pm@2.1.13/view';

// 찾기/바꾸기 하이라이트용 ProseMirror 플러그인
// (DOM을 직접 조작하지 않고 에디터 상태(state)를 통해 하이라이트를 관리하여
//  ProseMirror의 자체 렌더링과 충돌하지 않도록 함)
const searchHighlightKey = new PluginKey('searchHighlight');

const SearchHighlight = Extension.create({
  name: 'searchHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init() {
            return { term: '', matches: [], activeIndex: -1, decorations: DecorationSet.empty };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(searchHighlightKey);
            let { term, matches, activeIndex } = prev;

            if (meta && meta.term !== undefined) term = meta.term;
            if (meta && meta.activeIndex !== undefined) activeIndex = meta.activeIndex;

            if ((meta && meta.term !== undefined) || tr.docChanged) {
              matches = [];
              if (term) {
                tr.doc.descendants((node, pos) => {
                  if (!node.isText) return;
                  const text = node.text;
                  let idx = 0;
                  while (true) {
                    const found = text.indexOf(term, idx);
                    if (found === -1) break;
                    matches.push({ from: pos + found, to: pos + found + term.length });
                    idx = found + term.length;
                  }
                });
              }
              if (activeIndex >= matches.length) {
                activeIndex = matches.length ? 0 : -1;
              }
            }

            const decorations = DecorationSet.create(
              tr.doc,
              matches.map((m, i) => Decoration.inline(m.from, m.to, {
                class: i === activeIndex ? 'search-highlight-active' : 'search-highlight'
              }))
            );

            return { term, matches, activeIndex, decorations };
          }
        },
        props: {
          decorations(state) {
            return this.getState(state).decorations;
          }
        }
      })
    ];
  }
});

// 버튼 클릭 시 커서 풀림 방지
document.querySelectorAll('.toolbar button').forEach(el => {
  el.addEventListener('mousedown', (e) => e.preventDefault());
});

const CustomHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      'data-style': {
        default: 'line',
        parseHTML: element => element.getAttribute('data-style'),
        renderHTML: attributes => ({ 'data-style': attributes['data-style'] }),
      },
    };
  },
});

let treeData = JSON.parse(localStorage.getItem('my_tree_data')) || [
  { id: 'f-1', name: '기본 폴더', type: 'folder', isOpen: true, children: [
      { id: 'd-1', name: '첫 번째 글', type: 'doc', content: '<p>글을 작성해 보세요.</p>', title: '첫 번째 글', subtitle: '' }
    ] }
];
let activeDocId = localStorage.getItem('my_active_doc_id') || 'd-1';
let countDisplayMode = 'withSpace';

// Tiptap 에디터 생성
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({ horizontalRule: false }), 
    CustomHorizontalRule,
    TextStyle, 
    Color, 
    FontFamily, 
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    SearchHighlight,
  ],
  content: '',
  onUpdate() { 
    triggerAutoSave(); 
    updateWordCount();
    updateToolbarState();
  },
  onSelectionUpdate() { 
    updateToolbarState(); 
  },
  onTransaction() {
    updateToolbarState();
  }
});

// 폰트 설정 (전역 body가 아닌, 에디터 전용 CSS 변수만 변경)
const selectFontEl = document.getElementById('select-font');
selectFontEl.addEventListener('change', (e) => {
  document.documentElement.style.setProperty('--editor-content-font', e.target.value);
});

// 글자 색상
const colorInput = document.getElementById('input-font-color');
colorInput.addEventListener('input', (e) => {
  editor.chain().focus().setColor(e.target.value).run();
  updateToolbarState();
});

// 툴바 상태
function updateToolbarState() {
  document.getElementById('btn-bold').classList.toggle('is-active', editor.isActive('bold'));
  document.getElementById('btn-italic').classList.toggle('is-active', editor.isActive('italic'));
  document.getElementById('btn-strike').classList.toggle('is-active', editor.isActive('strike'));

  const headingSelect = document.getElementById('select-heading');
  if (editor.isActive('heading', { level: 1 })) headingSelect.value = 'h1';
  else if (editor.isActive('heading', { level: 2 })) headingSelect.value = 'h2';
  else if (editor.isActive('heading', { level: 3 })) headingSelect.value = 'h3';
  else headingSelect.value = 'p';
}

document.getElementById('btn-bold').onclick = () => { editor.chain().focus().toggleBold().run(); updateToolbarState(); };
document.getElementById('btn-italic').onclick = () => { editor.chain().focus().toggleItalic().run(); updateToolbarState(); };
document.getElementById('btn-strike').onclick = () => { editor.chain().focus().toggleStrike().run(); updateToolbarState(); };

// 글자 수 팝오버
const wordCountBtn = document.getElementById('btn-word-count-toggle');
const wordCountPopover = document.getElementById('word-count-popover');

wordCountBtn.onclick = (e) => {
  e.stopPropagation();
  if (wordCountPopover.style.display === 'none' || wordCountPopover.style.display === '') {
    wordCountPopover.style.display = 'block';
  } else {
    wordCountPopover.style.display = 'none';
  }
};

document.querySelectorAll('.word-count-option').forEach(opt => {
  opt.onclick = (e) => {
    e.stopPropagation();
    document.querySelectorAll('.word-count-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    countDisplayMode = opt.getAttribute('data-mode');
    wordCountPopover.style.display = 'none';
    updateWordCount();
  };
});

function updateWordCount() {
  const text = editor.getText();
  const withSpace = text.length;
  const noSpace = text.replace(/\s/g, '').length;
  const noSpaceSpecial = text.replace(/[^a-zA-O0-9가-힣]/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  document.getElementById('cnt-with-space').textContent = `${withSpace}자`;
  document.getElementById('cnt-no-space').textContent = `${noSpace}자`;
  document.getElementById('cnt-no-spec').textContent = `${noSpaceSpecial}자`;
  document.getElementById('cnt-words').textContent = `${words} 단어`;

  const labelEl = document.getElementById('word-count-label');
  if (countDisplayMode === 'withSpace') labelEl.textContent = `${withSpace}자`;
  else if (countDisplayMode === 'noSpace') labelEl.textContent = `${noSpace}자`;
  else if (countDisplayMode === 'noSpaceSpecial') labelEl.textContent = `${noSpaceSpecial}자`;
  else if (countDisplayMode === 'words') labelEl.textContent = `${words} 단어`;
}

// 정렬
document.getElementById('btn-align-left').onclick = () => editor.chain().focus().setTextAlign('left').run();
document.getElementById('btn-align-center').onclick = () => editor.chain().focus().setTextAlign('center').run();
document.getElementById('btn-align-right').onclick = () => editor.chain().focus().setTextAlign('right').run();
document.getElementById('btn-align-justify').onclick = () => editor.chain().focus().setTextAlign('justify').run();

document.getElementById('select-heading').onchange = (e) => {
  const v = e.target.value;
  if (v === 'p') editor.chain().focus().setParagraph().run();
  else editor.chain().focus().toggleHeading({ level: parseInt(v.replace('h','')) }).run();
};

document.getElementById('select-hr').onchange = (e) => {
  if (e.target.value) {
    editor.chain().focus().insertContent({ type: 'horizontalRule', attrs: { 'data-style': e.target.value } }).run();
    e.target.value = '';
  }
};

document.getElementById('btn-insert-image').onclick = () => document.getElementById('input-image-file').click();
document.getElementById('input-image-file').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => editor.chain().focus().setImage({ src: event.target.result }).run();
    reader.readAsDataURL(file);
  }
};

// 찾기 및 바꾸기 인라인 제어 로직
const btnSearch = document.getElementById('btn-search');
const searchPopover = document.getElementById('search-popover-box');
const inputSearch = document.getElementById('input-search');
const inputReplace = document.getElementById('input-replace');
const searchCountBadge = document.getElementById('search-count-badge');
const btnSearchPrev = document.getElementById('btn-search-prev');
const btnSearchNext = document.getElementById('btn-search-next');
const btnToggleReplace = document.getElementById('btn-toggle-replace');
const replaceRow = document.getElementById('replace-bottom-row');
const btnReplaceOne = document.getElementById('btn-replace-one');
const btnReplaceAll = document.getElementById('btn-replace-all');
const btnSearchClose = document.getElementById('btn-search-close');

function getSearchState() {
  return searchHighlightKey.getState(editor.state);
}

function updateSearchBadge() {
  const { matches, activeIndex } = getSearchState();
  searchCountBadge.textContent = matches.length ? `${activeIndex + 1} / ${matches.length}` : '0 / 0';
}

function scrollToActiveMatch() {
  const { matches, activeIndex } = getSearchState();
  if (activeIndex < 0 || !matches[activeIndex]) return;
  const domInfo = editor.view.domAtPos(matches[activeIndex].from);
  const el = domInfo.node.nodeType === 3 ? domInfo.node.parentElement : domInfo.node;
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// 검색어를 반영해 전체 일치 항목을 하이라이트 (첫 번째 일치 항목을 활성화)
function setSearchTerm(term) {
  const tr = editor.state.tr.setMeta(searchHighlightKey, { term, activeIndex: 0 });
  editor.view.dispatch(tr);
  updateSearchBadge();
  scrollToActiveMatch();
}

// 활성(주황색) 하이라이트 위치만 변경
function setActiveIndex(index) {
  const tr = editor.state.tr.setMeta(searchHighlightKey, { activeIndex: index });
  editor.view.dispatch(tr);
  updateSearchBadge();
  scrollToActiveMatch();
}

function clearSearchHighlights() {
  const tr = editor.state.tr.setMeta(searchHighlightKey, { term: '', activeIndex: -1 });
  editor.view.dispatch(tr);
  searchCountBadge.textContent = '0 / 0';
}

btnSearch.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (searchPopover.style.display === 'none' || searchPopover.style.display === '') {
    searchPopover.style.display = 'block';
    inputSearch.focus();
    setSearchTerm(inputSearch.value);
  } else {
    searchPopover.style.display = 'none';
    clearSearchHighlights();
  }
};

btnSearchClose.onclick = (e) => {
  e.preventDefault();
  searchPopover.style.display = 'none';
  clearSearchHighlights();
};

btnToggleReplace.onclick = (e) => {
  e.preventDefault();
  if (replaceRow.style.display === 'none' || replaceRow.style.display === '') {
    replaceRow.style.display = 'flex';
  } else {
    replaceRow.style.display = 'none';
  }
};

inputSearch.oninput = () => setSearchTerm(inputSearch.value);

btnSearchNext.onclick = () => {
  const { matches, activeIndex } = getSearchState();
  if (matches.length === 0) return;
  setActiveIndex((activeIndex + 1) % matches.length);
};

btnSearchPrev.onclick = () => {
  const { matches, activeIndex } = getSearchState();
  if (matches.length === 0) return;
  setActiveIndex((activeIndex - 1 + matches.length) % matches.length);
};

// 현재 활성 항목 하나만 바꾸기
btnReplaceOne.onclick = () => {
  const { matches, activeIndex } = getSearchState();
  if (matches.length === 0 || activeIndex === -1) return;
  const match = matches[activeIndex];
  const tr = editor.state.tr.insertText(inputReplace.value, match.from, match.to);
  editor.view.dispatch(tr);
  updateSearchBadge();
  scrollToActiveMatch();
};

// 검색된 항목 전체 일괄 바꾸기
btnReplaceAll.onclick = () => {
  const { matches } = getSearchState();
  if (matches.length === 0) return;
  let tr = editor.state.tr;
  // 뒤쪽 일치 항목부터 순서대로 치환해야 앞쪽 위치가 밀리지 않음
  [...matches].sort((a, b) => b.from - a.from).forEach(m => {
    tr = tr.insertText(inputReplace.value, m.from, m.to);
  });
  editor.view.dispatch(tr);
  updateSearchBadge();
};

// 사이드바 및 저장
document.getElementById('btn-toggle-sidebar').onclick = () => document.getElementById('sidebar').classList.toggle('collapsed');

function findNode(nodes, id) {
  for (let node of nodes) {
    if (node.id === id) return node;
    if (node.children) { let res = findNode(node.children, id); if (res) return res; }
  } return null;
}

function loadDoc(docId) {
  const doc = findNode(treeData, docId); if (!doc) return;
  activeDocId = docId; localStorage.setItem('my_active_doc_id', docId);
  document.getElementById('title-input').value = doc.title || doc.name || '';
  document.getElementById('subtitle-input').value = doc.subtitle || '';
  editor.commands.setContent(doc.content || '');
  updateWordCount();
  renderTree();
}

let saveTimer = null;
function triggerAutoSave() {
  const status = document.getElementById('save-status');
  status.textContent = '저장 중...'; status.className = 'save-status saving';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const doc = findNode(treeData, activeDocId);
    if (doc) {
      doc.title = document.getElementById('title-input').value;
      doc.subtitle = document.getElementById('subtitle-input').value;
      doc.name = doc.title || '제목 없음';
      doc.content = editor.getHTML();
      localStorage.setItem('my_tree_data', JSON.stringify(treeData));
      status.textContent = '저장됨'; status.className = 'save-status synced';
      renderTree();
    }
  }, 800);
}

document.getElementById('title-input').oninput = triggerAutoSave;
document.getElementById('subtitle-input').oninput = triggerAutoSave;

document.getElementById('btn-add-folder').onclick = () => {
  const name = prompt("새 폴더 이름을 입력하세요:");
  if(name) { treeData.push({ id: 'f-' + Date.now(), name, type: 'folder', isOpen: true, children: [] }); renderTree(); triggerAutoSave(); }
};
document.getElementById('btn-add-doc').onclick = () => {
  const name = prompt("새 문서 이름을 입력하세요:");
  if(name) {
    if(treeData.length === 0) treeData.push({ id: 'f-1', name: '기본 폴더', type: 'folder', isOpen: true, children: [] });
    const newDoc = { id: 'd-' + Date.now(), name, type: 'doc', content: '<p>새로운 문서입니다.</p>', title: name, subtitle: '' };
    treeData[0].children.push(newDoc); renderTree(); loadDoc(newDoc.id); triggerAutoSave();
  }
};

function renderTree() {
  const container = document.getElementById('file-tree');
  container.innerHTML = '';
  treeData.forEach(folder => {
    const folderDiv = document.createElement('div'); folderDiv.className = 'tree-folder';
    const titleDiv = document.createElement('div'); titleDiv.className = 'tree-folder-title';
    titleDiv.innerHTML = `<span class="folder-label">${folder.isOpen ? '▼' : '▶'} 📁 ${folder.name}</span>`;
    titleDiv.onclick = () => { folder.isOpen = !folder.isOpen; renderTree(); };
    folderDiv.appendChild(titleDiv);
    if (folder.isOpen && folder.children) {
      folder.children.forEach(doc => {
        const itemDiv = document.createElement('div'); itemDiv.className = `tree-item ${doc.id === activeDocId ? 'active' : ''}`;
        itemDiv.innerHTML = `📄 ${doc.name || '제목 없음'}`;
        itemDiv.onclick = (e) => { e.stopPropagation(); loadDoc(doc.id); };
        folderDiv.appendChild(itemDiv);
      });
    }
    container.appendChild(folderDiv);
  });
}

renderTree(); 
loadDoc(activeDocId); 
lucide.createIcons();
