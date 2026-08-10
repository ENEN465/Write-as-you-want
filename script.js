// ==========================================
// Write as you want - Main Application Logic
// ==========================================

// Global State / Constants
const AUTO_SAVE_DELAY = 5 * 60 * 1000; // 5분 (300,000 ms)로 변경
let autoSaveTimer = null;
let currentDocId = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnAddFolder = document.getElementById('btn-add-folder');
const btnAddDoc = document.getElementById('btn-add-doc');
const fileTree = document.getElementById('file-tree');
const trashTree = document.getElementById('trash-tree');
const btnEmptyTrash = document.getElementById('btn-empty-trash');

const editorArea = document.getElementById('editor-area');
const selectFont = document.getElementById('select-font');
const selectHeading = document.getElementById('select-heading');
const btnBold = document.getElementById('btn-bold');
const btnItalic = document.getElementById('btn-italic');
const btnSearch = document.getElementById('btn-search');
const btnHistory = document.getElementById('btn-history');

// ------------------------------------------
// Initialization
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initEventListeners();
  loadDocumentTree();
});

function initLucideIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// ------------------------------------------
// Event Listeners
// ------------------------------------------
function initEventListeners() {
  // Sidebar Toggle
  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', toggleSidebar);
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
  }

  // Add Folder / Doc
  if (btnAddFolder) btnAddFolder.addEventListener('click', createFolder);
  if (btnAddDoc) btnAddDoc.addEventListener('click', createDocument);
  if (btnEmptyTrash) btnEmptyTrash.addEventListener('click', emptyTrash);

  // Editor Formatting
  if (btnBold) {
    btnBold.addEventListener('click', () => formatDoc('bold'));
  }
  if (btnItalic) {
    btnItalic.addEventListener('click', () => formatDoc('italic'));
  }
  if (selectFont) {
    selectFont.addEventListener('change', (e) => setFont(e.target.value));
  }
  if (selectHeading) {
    selectHeading.addEventListener('change', (e) => setHeading(e.target.value));
  }

  // Editor Input & Auto Save
  if (editorArea) {
    editorArea.addEventListener('input', handleEditorInput);
    
    // Ctrl+S 수동 저장 지원
    editorArea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentDocument();
      }
    });
  }

  // [리스크 방지 연계] 5분 주기로 변경됨에 따라 이탈 시 미저장 데이터 손실 방지
  window.addEventListener('beforeunload', (e) => {
    if (autoSaveTimer) {
      saveCurrentDocument(); // 탭 닫기 전 즉시 저장
    }
  });
}

// ------------------------------------------
// Sidebar UI Logic
// ------------------------------------------
function toggleSidebar() {
  if (sidebar) sidebar.classList.toggle('active');
  if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
}

// ------------------------------------------
// Editor Formatting Functions
// ------------------------------------------
function formatDoc(cmd, value = null) {
  document.execCommand(cmd, false, value);
  if (editorArea) editorArea.focus();
}

function setFont(fontName) {
  formatDoc('fontName', fontName);
}

function setHeading(tag) {
  formatDoc('formatBlock', `<${tag}>`);
}

// ------------------------------------------
// Auto Save Logic (5분 주기)
// ------------------------------------------
function handleEditorInput() {
  // 입력이 발생할 때마다 기존 5분 타이머를 유지하거나 재설정
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    saveCurrentDocument();
  }, AUTO_SAVE_DELAY);
}

function saveCurrentDocument() {
  if (!editorArea) return;
  
  const content = editorArea.innerHTML;
  
  // 저장 수행 (예: LocalStorage 또는 API 저장)
  if (currentDocId) {
    localStorage.setItem(`doc_${currentDocId}`, content);
  } else {
    localStorage.setItem('temp_doc', content);
  }

  // 타이머 초기화
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  
  console.log('[AutoSave] 문서가 성공적으로 저장되었습니다. (5분 주기 또는 조건부 저장)');
}

// ------------------------------------------
// Document / Folder Actions (Placeholders)
// ------------------------------------------
function loadDocumentTree() {
  // 문서 목록 로드 로직
}

function createFolder() {
  // 폴더 생성 로직
}

function createDocument() {
  // 문서 생성 로직
}

function emptyTrash() {
  // 휴지통 비우기 로직
}
