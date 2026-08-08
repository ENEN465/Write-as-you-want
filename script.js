import { Editor, Mark } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';

// 찾기/바꾸기 마크
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
  parseHTML() {
    return [{ tag: 'span.search-highlight' }, { tag: 'span.search-highlight-active' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});

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

// 기본 상태 구조
let treeData = JSON.parse(localStorage.getItem('my_tree_data')) || [
  { id: 'f-1', name: '기본 폴더', type: 'folder', isOpen: true, children: [
      { id: 'd-1', name: '첫 번째 글', type: 'doc', content: '<p>글을 작성해 보세요.</p>', title: '첫 번째 글', subtitle: '' }
    ] }
];
let activeDocId = localStorage.getItem('my_active_doc_id') || 'd-1';
let docVersions = JSON.parse(localStorage.getItem('my_doc_versions')) || {}; // 버전 히스토리
let countDisplayMode = 'withSpace';

const SEARCH_TX_META = 'searchHighlightTx';
let currentSearchMatches = [];
let currentSearchActiveIndex = -1;
let selectedTargetNode = null; // 컨텍스트 메뉴 타겟

// Tiptap 에디터 초기화
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
  onSelectionUpdate() { updateToolbarState(); },
  onTransaction() { updateToolbarState(); }
});

// 폰트 지정 및 매핑
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
  editor.chain().focus().setFontFamily(fontValue).run();
});

// 글자 색상
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

document.getElementById('btn-bold').onclick = () => { editor.chain().focus().toggleBold().run(); updateToolbarState(); };
document.getElementById('btn-italic').onclick = () => { editor.chain().focus().toggleItalic().run(); updateToolbarState(); };
document.getElementById('btn-strike').onclick = () => { editor.chain().focus().toggleStrike().run(); updateToolbarState(); };

// 정렬 & 구분선 & 이미지
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

// ----------------------------------------------------------------
// [과제 1] 버전 기록 및 복구 (5분 자동 생성 + 복구 전 자동 저장)
// ----------------------------------------------------------------
function createVersionSnapshot(docId, note = '자동 저장') {
  const doc = findNode(treeData, docId);
  if (!doc) return;
  
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
  if (docVersions[docId].length > 20) docVersions[docId].pop(); // 최대 20개 유지
  localStorage.setItem('my_doc_versions', JSON.stringify(docVersions));
}

// 5분 주기 자동 스냅샷 생성
setInterval(() => {
  if (activeDocId) createVersionSnapshot(activeDocId, '5분 주기 자동 스냅샷');
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
    listEl.innerHTML = '<li class="history-item">기록된 버전이 없습니다.</li>';
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
      if (confirm("해당 버전으로 복원하시겠습니까? (현재 상태는 '복구 직전 스냅샷'으로 자동 저장됩니다)")) {
        // 복구 직전 현재 상태 하나 더 안전 저장
        createVersionSnapshot(activeDocId, '복구 직전 상태');

        // 복원 수행
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

// ----------------------------------------------------------------
// [과제 2] 반응형 모바일 UI & GitHub 연동 (Gist API)
// ----------------------------------------------------------------
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

// GitHub 연동 모달
const githubModal = document.getElementById('github-modal');
document.getElementById('btn-github-sync').onclick = () => {
  document.getElementById('gh-token-input').value = localStorage.getItem('gh_token') || '';
  document.getElementById('gh-gist-id-input').value = localStorage.getItem('gh_gist_id') || '';
  githubModal.style.display = 'flex';
};
document.getElementById('btn-close-github').onclick = () => githubModal.style.display = 'none';

document.getElementById('btn-save-gh-config').onclick = () => {
  localStorage.setItem('gh_token', document.getElementById('gh-token-input').value.trim());
  localStorage.setItem('gh_gist_id', document.getElementById('gh-gist-id-input').value.trim());
  alert('설정이 저장되었습니다.');
};

document.getElementById('btn-sync-github').onclick = async () => {
  const token = localStorage.getItem('gh_token');
  let gistId = localStorage.getItem('gh_gist_id');

  if (!token) return alert('GitHub Personal Access Token을 먼저 입력해 주세요.');

  const status = document.getElementById('save-status');
  status.textContent = '클라우드 동기화 중...';

  try {
    const payload = {
      description: 'Write As You Want - Backup',
      public: false,
      files: { 'editor_data.json': { content: JSON.stringify(treeData, null, 2) } }
    };

    let url = 'https://api.github.com/gists';
    let method = 'POST';

    if (gistId) {
      url += `/${gistId}`;
      method = 'PATCH';
    }

    const res = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('동기화 실패');

    const data = await res.json();
    if (!gistId) {
      localStorage.setItem('gh_gist_id', data.id);
      document.getElementById('gh-gist-id-input').value = data.id;
    }

    status.textContent = '동기화 완료';
    alert('GitHub 클라우드 동기화 성공!');
    githubModal.style.display = 'none';
  } catch (err) {
    alert('GitHub 동기화 중 오류가 발생했습니다. 토큰 권한을 확인하세요.');
    status.textContent = '동기화 실패';
  }
};

// ----------------------------------------------------------------
// [과제 3] 사이드바 점 세 개 (⋮) 메뉴 (수정, 복사, 이동, 삭제)
// ----------------------------------------------------------------
const contextMenu = document.getElementById('context-menu');

document.addEventListener('click', () => contextMenu.style.display = 'none');

function showContextMenu(e, node, parentFolder) {
  e.stopPropagation();
  selectedTargetNode = { node, parentFolder };
  contextMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 170)}px`;
  contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 150)}px`;
  contextMenu.style.display = 'block';
  lucide.createIcons();
}

// 이름 수정
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

// 복사
document.getElementById('menu-copy').onclick = () => {
  if (!selectedTargetNode) return;
  const { node, parentFolder } = selectedTargetNode;
  
  if (node.type === 'doc') {
    const copyDoc = { ...node, id: 'd-' + Date.now(), name: node.name + ' (복사본)' };
    parentFolder.children.push(copyDoc);
  } else {
    const copyFolder = JSON.parse(JSON.stringify(node));
    copyFolder.id = 'f-' + Date.now();
    copyFolder.name += ' (복사본)';
    treeData.push(copyFolder);
  }
  triggerAutoSave();
  renderTree();
};

// 삭제
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

// 모바일용 폴더 이동 메뉴
document.getElementById('menu-move').onclick = () => {
  if (!selectedTargetNode || selectedTargetNode.node.type !== 'doc') return alert('문서만 이동할 수 있습니다.');
  
  const folders = treeData.filter(f => f.type === 'folder');
  const folderNames = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
  const choice = prompt(`이동할 폴더 번호를 선택해 주세요:\n${folderNames}`);
  
  const index = parseInt(choice) - 1;
  if (!isNaN(index) && folders[index]) {
    moveDocToFolder(selectedTargetNode.node.id, folders[index].id);
  }
};

function moveDocToFolder(docId, targetFolderId) {
  let targetDoc = null;
  // 기존 폴더에서 제거
  treeData.forEach(folder => {
    if (folder.children) {
      const idx = folder.children.findIndex(d => d.id === docId);
      if (idx !== -1) targetDoc = folder.children.splice(idx, 1)[0];
    }
  });

  // 타겟 폴더로 이동
  const targetFolder = treeData.find(f => f.id === targetFolderId);
  if (targetDoc && targetFolder) {
    targetFolder.children.push(targetDoc);
    triggerAutoSave();
    renderTree();
  }
}

// ----------------------------------------------------------------
// [과제 4] 사이드바 드래그 앤 드롭 (Drag & Drop)
// ----------------------------------------------------------------
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
  folderEl.ondragover = (e) => {
    e.preventDefault();
    folderEl.classList.add('drag-over');
  };
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

// ----------------------------------------------------------------
// 저장 및 트랜잭션 로직
// ----------------------------------------------------------------
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
    const newDoc = { id: 'd-' + Date.now(), name, type: 'doc', content: '<p>새로운 문서입니다.</p>', title: name, subtitle: '' };
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
    
    // 폴더 드롭 존 설정
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
        
        itemDiv.onclick = (e) => { 
          e.stopPropagation(); 
          loadDoc(doc.id); 
          if(window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            sidebarOverlay.classList.remove('active');
          }
        };
        
        itemDiv.querySelector('.btn-more-options').onclick = (e) => showContextMenu(e, doc, folder);
        
        // 파일 드래그 설정
        setupDragAndDrop(itemDiv, doc.id);
        folderDiv.appendChild(itemDiv);
      });
    }
    container.appendChild(folderDiv);
  });
  
  lucide.createIcons();
}

// 기타 글자 수 계산 로직
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

// 찾기 및 바꾸기
const btnSearch = document.getElementById('btn-search');
const searchPopover = document.getElementById('search-popover-box');
const inputSearch = document.getElementById('input-search');
const inputReplace = document.getElementById('input-replace');
const searchCountBadge = document.getElementById('search-count-badge');

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
}

btnSearch.onclick = (e) => {
  e.preventDefault();
  if (searchPopover.style.display === 'none' || searchPopover.style.display === '') {
    searchPopover.style.display = 'flex';
    inputSearch.focus();
    setSearchTerm(inputSearch.value);
  } else {
    searchPopover.style.display = 'none';
  }
};

document.getElementById('btn-search-close').onclick = () => searchPopover.style.display = 'none';
inputSearch.oninput = () => setSearchTerm(inputSearch.value);

renderTree(); 
loadDoc(activeDocId);
