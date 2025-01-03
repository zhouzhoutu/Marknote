let isExtensionEnabled = false;

// 在文件开头添加使用介绍的常量
const USAGE_GUIDE = `
使用说明：
1. 选中文本以显示浮窗
2. 点击导出可导出为文本
3. 点击复制可复制为markdown
`;

// 初始化时检查扩展状态
chrome.storage.local.get('isEnabled', ({ isEnabled = false }) => {
  isExtensionEnabled = isEnabled;
  if (isEnabled) {
    initializeExtension();
  }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleExtension') {
    isExtensionEnabled = request.isEnabled;
    if (isExtensionEnabled) {
      initializeExtension();
    } else {
      cleanup();
    }
  }
});

function cleanup() {
  document.querySelectorAll('.highlight-text').forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    }
  });
  
  const panel = document.querySelector('.reader-side-panel');
  if (panel) {
    panel.remove();
  }

  // 移除所有事件监听器
  if (window._marknoteMouseupHandler) {
    document.removeEventListener('mouseup', window._marknoteMouseupHandler);
    window._marknoteMouseupHandler = null;
  }
  if (window._marknotePanelMouseupHandler) {
    document.removeEventListener('mouseup', window._marknotePanelMouseupHandler);
    window._marknotePanelMouseupHandler = null;
  }
}

function initializeExtension() {
  let sidePanel = null;
  let addedContents = new Map();

  // 创建并插入浮动面板
  function createSidePanel() {
    // 如果已经存在面板，直接返回
    const existingPanel = document.querySelector('.reader-side-panel');
    if (existingPanel) {
      return existingPanel;
    }
    
    const panel = document.createElement('div');
    panel.className = 'reader-side-panel';
    panel.style.cssText = `
      background-color: white;
      color: black;
      border: 1px solid #ccc;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-size: 14px;
    `;
    
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.style.cursor = 'move';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => panel.remove();
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'page-title';
    titleDiv.textContent = document.title;
    
    const content = document.createElement('div');
    content.className = 'panel-content';
    content.style.cssText = `
      background-color: white;
      color: black;
    `;
    
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'welcome-message';
    welcomeMsg.textContent = '欢迎使用马克记(marknote)，马克记会在当前网页生成一个浮窗来记录这些内容，你可以在阅读完毕后选择保存或复制这些内容。';
    content.appendChild(welcomeMsg);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'action-btn';
    saveBtn.textContent = '保存文件';
    saveBtn.onclick = saveToFile;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.textContent = '复制内容';
    copyBtn.onclick = copyToClipboard;
    
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(copyBtn);
    header.appendChild(closeBtn);
    header.appendChild(titleDiv);
    panel.appendChild(header);
    panel.appendChild(content);
    panel.appendChild(buttonContainer);
    
    document.body.appendChild(panel);
    makeDraggable(panel, header);
    
    // 修改高亮文本的样式
    const highlightStyle = document.createElement('style');
    highlightStyle.textContent = `
      .highlight-item {
        background-color: white;
        color: black;
        padding: 8px;
        margin: 4px 0;
        border-bottom: 1px solid #eee;
        font-size: 14px;
      }
      .highlight-text-content {
        color: black;
      }
      .welcome-message {
        color: black;
        font-size: 13px;
      }
      .highlight-text {
        color: black !important;
        background-color: #ffeb3b;
        padding: 2px;
      }
      .page-title {
        font-size: 15px;
        font-weight: bold;
      }
      .action-btn {
        font-size: 13px;
      }
    `;
    document.head.appendChild(highlightStyle);
    
    return panel;
  }

  // 生成Markdown内容
  function generateMarkdownContent() {
    const title = document.title;
    const url = window.location.href;
    const date = formatDate(new Date());
    const content = [];
    
    content.push(`# [${title}](${url}) - ${date}\n`);
    
    const highlights = document.querySelectorAll('.highlight-item');
    highlights.forEach(item => {
      content.push(`  > ${item.textContent}`);
    });
    
    return content.join('\n');
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  function saveToFile() {
    const content = generateMarkdownContent();
    const title = document.title;
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    const filename = `${title}-${date}.md`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    const content = generateMarkdownContent();
    try {
      await navigator.clipboard.writeText(content);
      alert('内容已复制到剪贴板！');
    } catch (err) {
      console.error('复制失败:', err);
      alert('复制失败，请重试');
    }
  }

  function makeDraggable(panel, header) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      panel.style.top = (panel.offsetTop - pos2) + "px";
      panel.style.left = (panel.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function addHighlight(text) {
    if (addedContents.has(text)) {
      return;
    }
    
    // 获取或创建面板
    let panel = document.querySelector('.reader-side-panel');
    if (!panel) {
      panel = createSidePanel();
    }
    
    const content = panel.querySelector('.panel-content');
    
    const welcomeMsg = content.querySelector('.welcome-message');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }
    
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'highlight-text';
    range.surroundContents(span);
    
    const highlightItem = document.createElement('div');
    highlightItem.className = 'highlight-item';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'highlight-text-content';
    textDiv.textContent = text;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = () => removeHighlight(text, span, highlightItem);
    
    highlightItem.appendChild(textDiv);
    highlightItem.appendChild(deleteBtn);
    content.appendChild(highlightItem);
    
    addedContents.set(text, {
      span: span,
      item: highlightItem
    });
    
    span.addEventListener('click', (e) => {
      e.preventDefault();
      removeHighlight(text, span, highlightItem);
    });
  }

  function removeHighlight(text, span, item) {
    const parent = span.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize();
    }
    
    if (item) {
      item.remove();
    }
    
    addedContents.delete(text);
    
    const panel = document.querySelector('.reader-side-panel');
    if (panel && addedContents.size === 0) {
      const content = panel.querySelector('.panel-content');
      const welcomeMsg = document.createElement('div');
      welcomeMsg.className = 'welcome-message';
      welcomeMsg.textContent = '欢迎使用马克记(marknote)，马克记会在当前网页生成一个浮窗来记录这些内容，你可以在阅读完毕后选择保存或复制这些内容。';
      content.appendChild(welcomeMsg);
    }
  }

  // 将事件处理函数存储在全局变量中，以便后续能够移除
  if (!window._marknoteMouseupHandler) {
    window._marknoteMouseupHandler = function() {
      if (!isExtensionEnabled) return;
      
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
        addHighlight(selectedText);
      }
    };
    document.addEventListener('mouseup', window._marknoteMouseupHandler);
  }

  if (!window._marknotePanelMouseupHandler) {
    window._marknotePanelMouseupHandler = function(e) {
      const selectedText = window.getSelection().toString();
      if (selectedText || e.target.closest('#floating-window')) {
        updateFloatingWindow(selectedText);
      } else {
        const floatingWindow = document.getElementById('floating-window');
        if (floatingWindow) {
          floatingWindow.style.display = 'none';
        }
      }
    };
    document.addEventListener('mouseup', window._marknotePanelMouseupHandler);
  }

  function updateFloatingWindow(selectedText) {
    const floatingWindow = document.getElementById('floating-window');
    const textArea = floatingWindow.querySelector('.selected-text');
    
    if (!selectedText || selectedText.trim() === '') {
        // 当没有选中文本时显示使用说明
        textArea.value = USAGE_GUIDE;
        floatingWindow.style.display = 'block';
    } else {
        // 有选中文本时显示选中的内容
        textArea.value = selectedText;
        floatingWindow.style.display = 'block';
    }
    
    // 现有代码...
  }
} 