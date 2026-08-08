import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';

// 툴바 버튼 클릭 시 에디터 포커스 유지를 위한 대책
document.querySelectorAll('.toolbar button, .color-swatch').forEach(el => {
  el.addEventListener('mousedown', (e) => e.preventDefault());
});

// 구분선 확장
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

// 에디터 생성
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({ horizontalRule: false }), 
    CustomHorizontalRule,
    TextStyle, Color, FontFamily, Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ],
  content: '',
  onUpdate() { 
    triggerAutoSave(); 
    updateWordCount();
  },
  onSelectionUpdate() { 
    updateToolbarState(); 
  }
});

// 1. 문서 전체 폰트 일괄 변경
document.getElementById('select-font').addEventListener('change', (e) => {
  const selectedFont = e.target.value;
  const editorEl = document.querySelector('.ProseMirror');
  if (editorEl) {
    editorEl.style.fontFamily = selectedFont;
  }
});

// 2 & 3. 서식 버튼 클릭 시 즉시 툴바 상태 동기화 및 색상 적용 Fix
function executeFormat(command) {
  command();
  updateToolbarState();
}

document.getElementById('btn-bold').addEventListener('click', () => executeFormat(() => editor.chain().focus().toggleBold().run()));
document.getElementById('btn-italic').addEventListener('click', () => executeFormat(() => editor.chain().focus().toggleItalic().run()));
document.getElementById('btn-strike').addEventListener('click', () => executeFormat(() => editor.chain().focus().toggleStrike().run()));

// 색상 변경
const paletteBtn = document.getElementById('btn-color-palette');
const palettePopover = document.getElementById('color-palette-popover');
paletteBtn.addEventListener('click', (e) => { e.stopPropagation(); palettePopover.classList.toggle('show'); });

document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    const hexColor = swatch.getAttribute('data-color');
    editor.chain().focus().setColor(hexColor).run();
    palettePopover.classList.remove('show');
    updateToolbarState();
  });
});

// 툴바 버튼 활성화 상태 표시
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

// 4. 단어 찾기, 노란색 하이라이트 및 일괄 바꾸기
const searchBar = document.getElementById('search-replace-bar');
const inputSearch = document.getElementById('input-search');
const inputReplace = document.getElementById('input-replace');

document.getElementById('btn-search').addEventListener('click', () => {
  const isHidden = searchBar.style.display === 'none';
  searchBar.style.display = isHidden ? 'flex' : 'none';
  if (isHidden) inputSearch.focus();
  else clearHighlights();
});

document.getElementById('btn-search-close').addEventListener('click', () => {
  searchBar.style.display = 'none';
  clearHighlights();
});

function clearHighlights() {
  const editorEl = document.querySelector('.ProseMirror');
  if (!editorEl) return;
  const highlights = editorEl.querySelectorAll('mark.search-result');
  highlights.forEach(h => {
    const parent = h.parentNode;
    parent.replaceChild(document.createTextNode(h.textContent), h);
    parent.normalize();
  });
}

function applyHighlights() {
  clearHighlights();
  const query = inputSearch.value;
  if (!query) return;

  const editorEl = document.querySelector('.ProseMirror');
  const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT, null, false);
  const nodesToReplace = [];

  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes(query)) {
      nodesToReplace.push(node);
    }
  }

  nodesToReplace.forEach(textNode => {
    const parts = textNode.nodeValue.split(query);
    const fragment = document.createDocumentFragment();
    parts.forEach((part, index) => {
      fragment.appendChild(document.createTextNode(part));
      if (index < parts.length - 1) {
        const mark = document.createElement('mark');
        mark.className = 'search-result';
        mark.textContent = query;
        fragment.appendChild(mark);
      }
    });
    textNode.parentNode.replaceChild(fragment, textNode);
  });
}

inputSearch.addEventListener('input', applyHighlights);

document.getElementById('btn-search-next').addEventListener('click', () => {
  const query = inputSearch.value;
  if (query) window.find(query, false, false, true);
});

document.getElementById('btn-search-prev').addEventListener('click', () => {
  const query = inputSearch.value;
  if (query) window.find(query, false, true, true);
});

// 일괄 바꾸기
document.getElementById('btn-replace-all').addEventListener('click', () => {
  const query = inputSearch.value;
  const replaceStr = inputReplace.value;
  if (!query) return;

  let currentContent = editor.getHTML();
  const regex = new RegExp(query, 'g');
  const newContent = currentContent.replace(regex, replaceStr);
  editor.commands.setContent(newContent);
  clearHighlights();
});

// 5. 노벨라 스타일 글자수 세기 로직
const wordCountBtn = document.getElementById('btn-word-count-toggle');
const wordCountPopover = document.getElementById('word-count-popover');

wordCountBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  wordCountPopover.classList.toggle('show');
});

document.querySelectorAll('.word-count-option').forEach(opt => {
  opt.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.word-count-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    countDisplayMode = opt.getAttribute('data-mode');
    wordCountPopover.classList.remove('show');
    updateWordCount();
  });
});

function updateWordCount() {
  const text = editor.getText();
  const withSpace = text.length;
  const noSpace = text.replace(/\s/g, '').length;
  const noSpaceSpecial = text.replace(/[\s\wㄱ-ㅎㅏ-ㅣ가-힣]/g, '').length ? text.replace(/[^a-zA-O0-9가-힣]/g, '').length : noSpace;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  document.getElementById('cnt-with-space').textContent = `${withSpace}자`;
  document.getElementById('cnt-no-space').textContent = `${noSpace}자`;
  document.getElementById('cnt-no-spec').textContent = `${noSpaceSpecial}자`;
  document.getElementById('cnt-words').textContent = `${words} 단어`;

  const labelEl = document.getElementById('word-count-label');
  if (countDisplayMode === 'withSpace') labelEl.textContent = `${withSpace} 자`;
  else if (countDisplayMode === 'noSpace') labelEl.textContent = `${noSpace} 자`;
  else if (countDisplayMode === 'noSpaceSpecial') labelEl.textContent = `${noSpaceSpecial} 자`;
  else if (countDisplayMode === 'words') labelEl.textContent = `${words} 단어`;
}

// 기타 제어
document.getElementById('btn-align-left').onclick = () => editor.chain().focus().setTextAlign('left').run();
document.getElementById('btn-align-center').onclick = () => editor.chain().focus().setTextAlign('center').run();
document.getElementById('btn-align-right').onclick = () => editor.chain().focus().setTextAlign('right').run();
document.getElementById('btn-align-justify').onclick = () => editor.chain().focus().setTextAlign('justify').run();

document.getElementById('select-heading').addEventListener('change', (e) => {
  const v = e.target.value;
  if (v === 'p') editor.chain().focus().setParagraph().run();
  else editor.chain().focus().toggleHeading({ level: parseInt(v.replace('h','')) }).run();
});

document.getElementById('select-hr').addEventListener('change', (e) => {
  if (e.target.value) {
    editor.chain().focus().insertContent({ type: 'horizontalRule', attrs: { 'data-style': e.target.value } }).run();
    e.target.value = '';
  }
});

document.getElementById('btn-insert-image').onclick = () => document.getElementById('input-image-file').click();
document.getElementById('input-image-file').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => editor.chain().focus().setImage({ src: event.target.result }).run();
    reader.readAsDataURL(file);
  }
};

document.addEventListener('click', () => {
  palettePopover.classList.remove('show');
  wordCountPopover.classList.remove('show');
});

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

renderTree(); loadDoc(activeDocId); lucide.createIcons();
