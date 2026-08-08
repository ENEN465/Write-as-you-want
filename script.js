import { Editor } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';

// 툴바 버튼 클릭 시 에디터 포커스 유지를 위한 예방 대책
document.querySelectorAll('.toolbar button, .color-swatch').forEach(el => {
  el.addEventListener('mousedown', (e) => e.preventDefault());
});

// 커스텀 구분선 (HR) 확장 기능
const CustomHorizontalRule = HorizontalRule.extend({
  addAttributes() {
    return {
      'data-style': {
        default: 'line',
        parseHTML: element => element.getAttribute('data-style'),
        renderHTML: attributes => { return { 'data-style': attributes['data-style'] }; },
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

// 에디터 초기화
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
  onSelectionUpdate() { updateToolbarState(); }
});

// 글자수 세기 로직
function updateWordCount() {
  const text = editor.getText();
  const totalChar = text.length;
  const noSpaceChar = text.replace(/\s/g, '').length;
  document.getElementById('word-counter').textContent = `공백포함 ${totalChar}자 | 공백제외 ${noSpaceChar}자`;
}

// 툴바 상태 연동
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

// 서식 버튼 클릭 이벤트
document.getElementById('btn-bold').addEventListener('click', () => editor.chain().focus().toggleBold().run());
document.getElementById('btn-italic').addEventListener('click', () => editor.chain().focus().toggleItalic().run());
document.getElementById('btn-strike').addEventListener('click', () => editor.chain().focus().toggleStrike().run());

document.getElementById('btn-align-left').addEventListener('click', () => editor.chain().focus().setTextAlign('left').run());
document.getElementById('btn-align-center').addEventListener('click', () => editor.chain().focus().setTextAlign('center').run());
document.getElementById('btn-align-right').addEventListener('click', () => editor.chain().focus().setTextAlign('right').run());
document.getElementById('btn-align-justify').addEventListener('click', () => editor.chain().focus().setTextAlign('justify').run());

// 폰트 설정 (정상 동작하도록 개선)
document.getElementById('select-font').addEventListener('change', (e) => {
  if (e.target.value) { 
    editor.chain().focus().setFontFamily(e.target.value).run(); 
  }
});

// 본문 / 제목1 / 제목2 / 제목3 선택
document.getElementById('select-heading').addEventListener('change', (e) => {
  const v = e.target.value;
  if (v === 'p') editor.chain().focus().setParagraph().run();
  else editor.chain().focus().toggleHeading({ level: parseInt(v.replace('h','')) }).run();
});

// 구분선 선택
document.getElementById('select-hr').addEventListener('change', (e) => {
  if (e.target.value) {
    editor.chain().focus().insertContent({ type: 'horizontalRule', attrs: { 'data-style': e.target.value } }).run();
    e.target.value = ''; 
  }
});

// 색상 팔레트
const paletteBtn = document.getElementById('btn-color-palette');
const palettePopover = document.getElementById('color-palette-popover');
paletteBtn.addEventListener('click', (e) => { e.stopPropagation(); palettePopover.classList.toggle('show'); });

document.querySelectorAll('.color-swatch').forEach(swatch => {
  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    editor.chain().focus().setColor(swatch.getAttribute('data-color')).run();
    palettePopover.classList.remove('show');
  });
});

// 이미지 업로드
document.getElementById('btn-insert-image').onclick = () => document.getElementById('input-image-file').click();
document.getElementById('input-image-file').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => editor.chain().focus().setImage({ src: event.target.result }).run();
    reader.readAsDataURL(file);
  }
};

// 찾기(Search) 기능 로직
const searchBar = document.getElementById('search-bar');
const inputSearch = document.getElementById('input-search');

document.getElementById('btn-search').addEventListener('click', () => {
  searchBar.style.display = searchBar.style.display === 'none' ? 'flex' : 'none';
  if (searchBar.style.display === 'flex') inputSearch.focus();
});

document.getElementById('btn-search-close').addEventListener('click', () => {
  searchBar.style.display = 'none';
});

document.getElementById('btn-search-next').addEventListener('click', () => {
  const query = inputSearch.value;
  if (query) {
    window.find(query);
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.color-picker-wrapper')) palettePopover.classList.remove('show');
});

// 사이드바 및 로컬스토리지 자동저장
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

// 초기화 실행
renderTree(); loadDoc(activeDocId); lucide.createIcons();
