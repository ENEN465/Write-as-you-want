import { Editor, Extension } from 'https://esm.sh/@tiptap/core@2.1.13';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit@2.1.13';
import TextStyle from 'https://esm.sh/@tiptap/extension-text-style@2.1.13';
import Color from 'https://esm.sh/@tiptap/extension-color@2.1.13';
import FontFamily from 'https://esm.sh/@tiptap/extension-font-family@2.1.13';
import TextAlign from 'https://esm.sh/@tiptap/extension-text-align@2.1.13';
import Image from 'https://esm.sh/@tiptap/extension-image@2.1.13';
import Table from 'https://esm.sh/@tiptap/extension-table@2.1.13';
import TableRow from 'https://esm.sh/@tiptap/extension-table-row@2.1.13';
import TableCell from 'https://esm.sh/@tiptap/extension-table-cell@2.1.13';
import TableHeader from 'https://esm.sh/@tiptap/extension-table-header@2.1.13';
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.1.13';

// 에디터 클릭 풀림 방지
document.querySelectorAll('.toolbar button, .color-swatch, .table-popover button').forEach(el => {
  el.addEventListener('mousedown', (e) => e.preventDefault());
});

// 글자 크기 커스텀 확장 기능 생성
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize || null,
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
    };
  },
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
      { id: 'd-1', name: '첫 번째 글', type: 'doc', content: '<p>테스트 글입니다.</p>', title: '첫 번째 글', subtitle: '' }
    ] }
];
let activeDocId = localStorage.getItem('my_active_doc_id') || 'd-1';

// 에디터 인스턴스 초기화
const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    StarterKit.configure({ horizontalRule: false }), 
    CustomHorizontalRule,
    TextStyle, Color, FontFamily, FontSize, Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  ],
  content: '',
  onUpdate() { triggerAutoSave(); },
  onSelectionUpdate() { updateToolbarState(); }
});

// 툴바 버튼 활성화 상태 연동
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

// 각 기능 버튼 동작 연결
document.getElementById('btn-bold').addEventListener('click', () => editor.chain().focus().toggleBold().run());
document.getElementById('btn-italic').addEventListener('click', () => editor.chain().focus().toggleItalic().run());
document.getElementById('btn-strike').addEventListener('click', () => editor.chain().focus().toggleStrike().run());

document.getElementById('btn-align-left').addEventListener('click', () => editor.chain().focus().setTextAlign('left').run());
document.getElementById('btn-align-center').addEventListener('click', () => editor.chain().focus().setTextAlign('center').run());
document.getElementById('btn-align-right').addEventListener('click', () => editor.chain().focus().setTextAlign('right').run());
document.getElementById('btn-align-justify').addEventListener('click', () => editor.chain().focus().setTextAlign('justify').run());

// 셀렉트 박스 (글씨체, 글자크기, 제목, 구분선)
document.getElementById('select-font').addEventListener('change', (e) => {
  if (e.target.value) { editor.chain().focus().setFontFamily(e.target.value).run(); e.target.value = ''; }
});

document.getElementById('select-font-size').addEventListener('change', (e) => {
  if (e.target.value) { editor.chain().focus().setFontSize(e.target.value).run(); e.target.value = ''; }
});

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

// 컬러 팔레트 연동
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

// 표 생성 및 관리 연동
const tableBtn = document.getElementById('btn-table-menu');
const tablePopover = document.getElementById('table-popover');
tableBtn.addEventListener('click', (e) => { e.stopPropagation(); tablePopover.classList.toggle('show'); });

const execTable = (fn) => () => { fn(); tablePopover.classList.remove('show'); };
document.getElementById('btn-table-insert').addEventListener('click', execTable(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()));
document.getElementById('btn-table-add-row-before').addEventListener('click', execTable(() => editor.chain().focus().addRowBefore().run()));
document.getElementById('btn-table-add-row-after').addEventListener('click', execTable(() => editor.chain().focus().addRowAfter().run()));
document.getElementById('btn-table-add-col-before').addEventListener('click', execTable(() => editor.chain().focus().addColumnBefore().run()));
document.getElementById('btn-table-add-col-after').addEventListener('click', execTable(() => editor.chain().focus().addColumnAfter().run()));
document.getElementById('btn-table-delete-row').addEventListener('click', execTable(() => editor.chain().focus().deleteRow().run()));
document.getElementById('btn-table-delete-col').addEventListener('click', execTable(() => editor.chain().focus().deleteColumn().run()));
document.getElementById('btn-table-delete').addEventListener('click', execTable(() => editor.chain().focus().deleteTable().run()));

// 이미지 삽입 
document.getElementById('btn-insert-image').onclick = () => document.getElementById('input-image-file').click();
document.getElementById('input-image-file').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => editor.chain().focus().setImage({ src: event.target.result }).run();
    reader.readAsDataURL(file);
  }
};

// 팝업 닫기 이벤트
document.addEventListener('click', (e) => {
  if (!e.target.closest('.color-picker-wrapper')) palettePopover.classList.remove('show');
  if (!e.target.closest('.table-menu-wrapper')) tablePopover.classList.remove('show');
});

// 사이드바 및 저장 로직
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

// 초기 실행
renderTree(); loadDoc(activeDocId); lucide.createIcons();
