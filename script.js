import { Editor, Mark } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';

// 찾기/바꾸기 하이라이트용 마크
const SearchHighlightMark = Mark.create({
  name: 'searchHighlight',
  addAttributes() {
    return {
      active: {
        default: false,
        parseHTML: element => element.classList.contains('search-highlight-active'),
        renderHTML: attributes => ({
          class: attributes.active ? 'search-highlight-active' : 'search-highlight'
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span.search-highlight' }, { tag: 'span.search-highlight-active' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

// 버튼 클릭 시 포커스 해제 방지
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

const SEARCH_TX_META = 'searchHighlightTx';
let currentSearchMatches = [];
let currentSearchActiveIndex = -1;

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
    SearchHighlightMark,
  ],
  content: '',
  onUpdate({ transaction }) {
    updateToolbarState();
    if (transaction.getMeta(SEARCH_TX_META)) return;
    triggerAutoSave();
    updateWordCount();
  },
  onSelectionUpdate() { 
    updateToolbarState(); 
  },
  onTransaction() {
    updateToolbarState();
  }
});

// 폰트 변경 처리
const selectFontEl = document.getElementById('select-font');
const fontMap = {
  'MaruBuri': "'MaruBuri', serif",
  'Pretendard': "'Pretendard', sans-serif",
  'RIDIBatang': "'RIDIBatang', serif",
  'Nanum Myeongjo': "'Nanum Myeongjo', serif",
  'Noto Serif KR': "'Noto Serif KR', serif",
  'Nanum Barun Gothic': "'NanumBarunGothic', sans-serif"
};

selectFontEl.addEventListener('change', (e) => {
  const fontValue = fontMap[e.target.value] || e.target.value;
  document.documentElement.style.setProperty('--editor-content-font', fontValue);
});

// 글자 색상
const colorInput = document.getElementById('input-font-color');
colorInput.addEventListener('input', (e) => {
  editor.chain().focus().setColor(e.target.value).run();
  updateToolbarState();
});

// 툴바 상태 update
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
  wordCountPopover.style.display = (wordCountPopover.style.display === 'none' || wordCountPopover.style.display === '') ? 'block' : 'none';
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

// 찾기 및 바꾸기 로직
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

function findSearchMatches(doc, term) {
  const matches = [];
  if (!term) return matches;
  doc.descendants((node, pos) => {
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
  return matches;
}

function updateSearchBadge() {
  searchCountBadge.textContent = currentSearchMatches.length
    ? `${currentSearchActiveIndex + 1} / ${currentSearchMatches.length}`
    : '0 / 0';
}

function scrollToActiveMatch() {
  const match = currentSearchMatches[currentSearchActiveIndex];
  if (!match) return;
  const domInfo = editor.view.domAtPos(match.from);
  const el = domInfo.node.nodeType === 3 ? domInfo.node.parentElement : domInfo.node;
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function repaintSearchMarks(activeIndex) {
  const { state, view } = editor;
  const markType = state.schema.marks.searchHighlight;
  let tr = state.tr.removeMark(0, state.doc.content.size, markType);
  currentSearchMatches.forEach((m, i) => {
    tr = tr.addMark(m.from, m.to, markType.create({ active: i === activeIndex }));
  });
  tr.setMeta(SEARCH_TX_META, true);
  tr.setMeta('addToHistory', false);
  view.dispatch(tr);
}

function setSearchTerm(term) {
  currentSearchMatches = findSearchMatches(editor.state.doc, term);
  currentSearchActiveIndex = currentSearchMatches.length ? 0 : -1;
  repaintSearchMarks(currentSearchActiveIndex);
  updateSearchBadge();
  if (currentSearchActiveIndex !== -1) scrollToActiveMatch();
}

function setActiveIndex(index) {
  currentSearchActiveIndex = index;
  repaintSearchMarks(currentSearchActiveIndex);
  updateSearchBadge();
  scrollToActiveMatch();
}

function clearSearchHighlights() {
  const { state, view } = editor;
  const markType = state.schema.marks.searchHighlight;
  const tr = state.tr
    .removeMark(0, state.doc.content.size, markType)
    .setMeta(SEARCH_TX_META, true)
    .setMeta('addToHistory', false);
  view.dispatch(tr);
  currentSearchMatches = [];
  currentSearchActiveIndex = -1;
  searchCountBadge.textContent = '0 / 0';
}

btnSearch.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (searchPopover.style.display === 'none' || searchPopover.style.display === '') {
    searchPopover.style.display = 'flex';
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
  replaceRow.style.display = (replaceRow.style.display === 'none' || replaceRow.style.display === '') ? 'flex' : 'none';
};

inputSearch.oninput = () => setSearchTerm(inputSearch.value);

btnSearchNext.onclick = () => {
  if (currentSearchMatches.length === 0) return;
  setActiveIndex((currentSearchActiveIndex + 1) % currentSearchMatches.length);
};

btnSearchPrev.onclick = () => {
  if (currentSearchMatches.length === 0) return;
  setActiveIndex((currentSearchActiveIndex - 1 + currentSearchMatches.length) % currentSearchMatches.length);
};

// 선택 단어 변경
btnReplaceOne.onclick = () => {
  if (currentSearchMatches.length === 0 || currentSearchActiveIndex === -1) return;
  const match = currentSearchMatches[currentSearchActiveIndex];
  
  // 하이라이트 제거 후 텍스트 입력
  clearSearchHighlights();
  const tr = editor.state.tr.insertText(inputReplace.value, match.from, match.to);
  editor.view.dispatch(tr);

  setSearchTerm(inputSearch.value);
};

// 전체 일괄 바꾸기 (뒤쪽 인덱스부터 치환하여 Offset 유지)
btnReplaceAll.onclick = () => {
  if (currentSearchMatches.length === 0) return;
  
  const searchWord = inputSearch.value;
  const replaceWord = inputReplace.value;
  if (!searchWord) return;

  clearSearchHighlights();

  let tr = editor.state.tr;
  const matches = [...currentSearchMatches].sort((a, b) => b.from - a.from);
  
  matches.forEach(m => {
    tr = tr.insertText(replaceWord, m.from, m.to);
  });
  
  editor.view.dispatch(tr);
  setSearchTerm(searchWord);
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
  currentSearchMatches = [];
  currentSearchActiveIndex = -1;
  if (typeof searchCountBadge !== 'undefined') searchCountBadge.textContent = '0 / 0';
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
