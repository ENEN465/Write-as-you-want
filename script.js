import { Editor, Mark } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';

// 찾기 하이라이트 Mark
const SearchHighlightMark = Mark.create({
  name: 'searchHighlight',
  addAttributes() {
    return {
      active: {
        default: false,
        parseHTML: element => element.classList.contains('search-highlight-active'),
        renderHTML: attributes => ({ class: attributes.active ? 'search-highlight-active' : 'search-highlight' }),
      },
    };
  },
  parseHTML() { return [{ tag: 'span.search-highlight' }, { tag: 'span.search-highlight-active' }]; },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; },
});

// 구분선 Extensions
const CustomHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      'data-style': {
        default: 'line',
        parseHTML: element => element.getAttribute('data-style'),
        renderHTML: attributes => {
          return { 'data-style': attributes['data-style'] || 'line' };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['hr', HTMLAttributes];
  }
});

document.querySelectorAll('.toolbar button').forEach(el => {
  el.addEventListener('mousedown', (e) => e.preventDefault());
});

let treeData = JSON.parse(localStorage.getItem('my_tree_data')) || [
  { id: 'f-1', name: '기본 폴더', type: 'folder', isOpen: true, children: [
      { id: 'd-1', name: '첫 번째 글', type: 'doc', content: '<p>마루부리 폰트로 작성을 시작합니다.</p>', title: '첫 번째 글', subtitle: '' }
    ] }
];
let activeDocId = localStorage.getItem('my_active_doc_id') || 'd-1';
let docVersions = JSON.parse(localStorage.getItem('my_doc_versions')) || {};
let countDisplayMode = 'withSpace';
let selectedTargetNode = null;

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
  onUpdate() {
    updateToolbarState();
    triggerAutoSave();
    updateWordCount();
  },
  onSelectionUpdate() { updateToolbarState(); },
  onTransaction() { updateToolbarState(); }
});

// 폰트 매핑 (기본값 마루부리)
const selectFontEl = document.getElementById('select-font');
const fontMap = {
  'MaruBuri': "'MaruBuri', serif",
  'BookkMyungjo': "'BookkMyungjo', serif",
  'Pretendard': "'Pretendard', sans-serif",
  'Nanum Myeongjo': "'Nanum Myeongjo', serif",
  'Noto Serif KR': "'Noto Serif KR', serif",
  'Nanum Barun Gothic': "'NanumBarunGothic', sans-serif"
};

selectFontEl.addEventListener('change', (e) => {
  const fontValue = fontMap[e.target.value] || e.target.value;
  document.documentElement.style.setProperty('--editor-content-font', fontValue);
  editor.chain().focus().setFontFamily(fontValue).run();
});

// 색상 변경
const colorInput = document.getElementById('input-font-color');
colorInput.addEventListener('input', (e) => {
  editor.chain().focus().setColor(e.target.value).run();
  updateToolbarState();
});

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

document.getElementById('btn-bold').onclick = () => editor.chain().focus().toggleBold().run();
document.getElementById('btn-italic').onclick = () => editor.chain().focus().toggleItalic().run();
document.getElementById('btn-strike').onclick = () => editor.chain().focus().toggleStrike().run();

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
  const selectedStyle = e.target.value;
  if (selectedStyle) {
    editor.chain().focus().insertContent({
      type: 'horizontalRule',
      attrs: { 'data-style': selectedStyle }
    }).run();
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

// 플로팅 팝오버
const wordCountBtn = document.getElementById('btn-word-count-toggle');
const wordCountPopover = document.getElementById('word-count-popover');

wordCountBtn.onclick = (e) => {
  e.stopPropagation();
  const isHidden = wordCountPopover.style.display === 'none' || wordCountPopover.style.display === '';
  
  if (isHidden) {
    const rect = wordCountBtn.getBoundingClientRect();
    wordCountPopover.style.top = `${rect.bottom + 6}px`;
    wordCountPopover.style.left = `${rect.right - 240}px`;
    wordCountPopover.style.display = 'block';
  } else {
    wordCountPopover.style.display = 'none';
  }
};

document.addEventListener('click', (e) => {
  if (!wordCountPopover.contains(e.target) && !wordCountBtn.contains(e.target)) {
    wordCountPopover.style.display = 'none';
  }
});

window.addEventListener('scroll', () => {
  wordCountPopover.style.display = 'none';
}, true);

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
  if (countDisplayMode === 'withSpace') labelEl.textContent = `${withSpace} 자`;
  else if (countDisplayMode === 'noSpace') labelEl.textContent = `${noSpace} 자`;
  else if (countDisplayMode === 'noSpaceSpecial') labelEl.textContent = `${noSpaceSpecial} 자`;
  else if (countDisplayMode === 'words') labelEl.textContent = `${words} 단어`;
}

// 히스토리 버전 관리
function createVersionSnapshot(docId, note = '자동 저장') {
  if (!docId) return;
  if (!docVersions[docId]) docVersions[docId] = [];
  
  const snapshot = {
    id: 'v-' + Date.now(),
    timestamp: new Date().toLocaleString('ko-KR'),
    title: document.getElementById('title-input').value,
    subtitle: document.getElementById('subtitle-input').value,
    content: editor.getHTML(),
    note: note
  };

  docVersions[docId].unshift(snapshot);
  if (docVersions[docId].length > 20) docVersions[docId].pop();
  localStorage.setItem('my_doc_versions', JSON.stringify(docVersions));
}

setInterval(() => {
  if (activeDocId) createVersionSnapshot(activeDocId, '5분 주기 자동 백업');
}, 5 * 60 * 1000);

const historyModal = document.getElementById('history-modal');
document.getElementById('btn-history').onclick = () => {
  renderHistoryList();
  historyModal.style.display = 'flex';
};
document.getElementById('btn-close-history').onclick = () => historyModal.style.display = 'none';

function renderHistoryList() {
  const listEl = document.getElementById('history-list');
  listEl.innerHTML = '';
  const versions = docVersions[activeDocId] || [];

  if (versions.length === 0) {
    listEl.innerHTML = '<li class="history-item"><span style="font-size:13px; color:#888;">저장된 히스토리가 없습니다.</span></li>';
    return;
  }

  versions.forEach(ver => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div>
        <span class="history-time">${ver.timestamp}</span>
        <span class="history-tag">${ver.note}</span>
      </div>
      <button class="action-btn-sm highlight-btn btn-restore">복원</button>
    `;

    li.querySelector('.btn-restore').onclick = () => {
      if (confirm("이 버전으로 복원하시겠습니까?")) {
        createVersionSnapshot(activeDocId, '복원 직전 백업');
        document.getElementById('title-input').value = ver.title || '';
        document.getElementById('subtitle-input').value = ver.subtitle || '';
        editor.commands.setContent(ver.content || '');
        triggerAutoSave();
        historyModal.style.display = 'none';
      }
    };
    listEl.appendChild(li);
  });
}

// 트리 및 사이드바 제어
const contextMenu = document.getElementById('context-menu');
document.addEventListener('click', () => contextMenu.style.display = 'none');

function showContextMenu(e, node, parentFolder) {
  e.stopPropagation();
  selectedTargetNode = { node, parentFolder };
  contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 160)}px`;
  contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 120)}px`;
  contextMenu.style.display = 'block';
}

document.getElementById('menu-rename').onclick = () => {
  if (!selectedTargetNode) return;
  const newName = prompt("새 이름을 입력하세요:", selectedTargetNode.node.name);
  if (newName) {
    selectedTargetNode.node.name = newName;
    if (selectedTargetNode.node.type === 'doc') selectedTargetNode.node.title = newName;
    triggerAutoSave();
    renderTree();
  }
};

document.getElementById('menu-copy').onclick = () => {
  if (!selectedTargetNode) return;
  const { node, parentFolder } = selectedTargetNode;
  if (node.type === 'doc') {
    parentFolder.children.push({ ...node, id: 'd-' + Date.now(), name: node.name + ' (복사본)' });
  } else {
    const copyFolder = JSON.parse(JSON.stringify(node));
    copyFolder.id = 'f-' + Date.now();
    copyFolder.name += ' (복사본)';
    treeData.push(copyFolder);
  }
  triggerAutoSave();
  renderTree();
};

document.getElementById('menu-delete').onclick = () => {
  if (!selectedTargetNode) return;
  if (confirm(`'${selectedTargetNode.node.name}' 항목을 삭제하시겠습니까?`)) {
    const { node, parentFolder } = selectedTargetNode;
    if (parentFolder) {
      parentFolder.children = parentFolder.children.filter(child => child.id !== node.id);
    } else {
      treeData = treeData.filter(f => f.id !== node.id);
    }
    triggerAutoSave();
    renderTree();
  }
};

// 드래그 앤 드롭
let draggedDocId = null;
function setupDragAndDrop(itemEl, docId) {
  itemEl.draggable = true;
  itemEl.ondragstart = (e) => {
    draggedDocId = docId;
    itemEl.classList.add('dragging');
    e.dataTransfer.setData('text/plain', docId);
  };
  itemEl.ondragend = () => itemEl.classList.remove('dragging');
}

function setupFolderDropZone(folderEl, folderId) {
  folderEl.ondragover = (e) => { e.preventDefault(); folderEl.classList.add('drag-over'); };
  folderEl.ondragleave = () => folderEl.classList.remove('drag-over');
  folderEl.ondrop = (e) => {
    e.preventDefault();
    folderEl.classList.remove('drag-over');
    if (draggedDocId) {
      moveDocToFolder(draggedDocId, folderId);
      draggedDocId = null;
    }
  };
}

function moveDocToFolder(docId, targetFolderId) {
  let targetDoc = null;
  treeData.forEach(folder => {
    if (folder.children) {
      const idx = folder.children.findIndex(d => d.id === docId);
      if (idx !== -1) targetDoc = folder.children.splice(idx, 1)[0];
    }
  });

  const targetFolder = treeData.find(f => f.id === targetFolderId);
  if (targetDoc && targetFolder) {
    targetFolder.children.push(targetDoc);
    triggerAutoSave();
    renderTree();
  }
}

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
  status.textContent = '저장 중...';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const doc = findNode(treeData, activeDocId);
    if (doc) {
      doc.title = document.getElementById('title-input').value;
      doc.subtitle = document.getElementById('subtitle-input').value;
      doc.name = doc.title || '제목 없음';
      doc.content = editor.getHTML();
      localStorage.setItem('my_tree_data', JSON.stringify(treeData));
      status.textContent = '저장됨';
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
    const newDoc = { id: 'd-' + Date.now(), name, type: 'doc', content: '<p>새 문서 내용</p>', title: name, subtitle: '' };
    treeData[0].children.push(newDoc); renderTree(); loadDoc(newDoc.id); triggerAutoSave();
  }
};

function renderTree() {
  const container = document.getElementById('file-tree');
  container.innerHTML = '';
  
  treeData.forEach(folder => {
    const folderDiv = document.createElement('div'); 
    folderDiv.className = 'tree-folder';
    
    const titleDiv = document.createElement('div'); 
    titleDiv.className = 'tree-folder-title';
    titleDiv.innerHTML = `
      <span class="folder-label">${folder.isOpen ? '▼' : '▶'} 📁 ${folder.name}</span>
      <button class="btn-more-options" title="더보기"><i data-lucide="more-vertical"></i></button>
    `;
    
    titleDiv.onclick = () => { folder.isOpen = !folder.isOpen; renderTree(); };
    titleDiv.querySelector('.btn-more-options').onclick = (e) => showContextMenu(e, folder, null);
    
    setupFolderDropZone(titleDiv, folder.id);
    folderDiv.appendChild(titleDiv);

    if (folder.isOpen && folder.children) {
      folder.children.forEach(doc => {
        const itemDiv = document.createElement('div'); 
        itemDiv.className = `tree-item ${doc.id === activeDocId ? 'active' : ''}`;
        itemDiv.innerHTML = `
          <span class="item-name">📄 ${doc.name || '제목 없음'}</span>
          <button class="btn-more-options" title="더보기"><i data-lucide="more-vertical"></i></button>
        `;
        
        itemDiv.onclick = (e) => { e.stopPropagation(); loadDoc(doc.id); };
        itemDiv.querySelector('.btn-more-options').onclick = (e) => showContextMenu(e, doc, folder);
        
        setupDragAndDrop(itemDiv, doc.id);
        folderDiv.appendChild(itemDiv);
      });
    }
    container.appendChild(folderDiv);
  });
  
  if (window.lucide) window.lucide.createIcons();
}

// 사이드바 토글
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
document.getElementById('btn-toggle-sidebar').onclick = () => {
  sidebar.classList.toggle('collapsed');
  if (window.innerWidth <= 768) {
    sidebarOverlay.classList.toggle('active', !sidebar.classList.contains('collapsed'));
  }
};
sidebarOverlay.onclick = () => {
  sidebar.classList.add('collapsed');
  sidebarOverlay.classList.remove('active');
};

// 검색
const btnSearch = document.getElementById('btn-search');
const searchPopover = document.getElementById('search-popover-box');

btnSearch.onclick = (e) => {
  e.preventDefault();
  searchPopover.style.display = (searchPopover.style.display === 'none' || searchPopover.style.display === '') ? 'flex' : 'none';
};
document.getElementById('btn-search-close').onclick = () => searchPopover.style.display = 'none';

// 초기화
renderTree(); 
loadDoc(activeDocId);
