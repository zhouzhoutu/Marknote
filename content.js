let sidePanel = null;
let addedContents = new Map();

// 创建并插入浮动面板
function createSidePanel() {
  const panel = document.createElement('div');
  panel.className = 'reader-side-panel';
  
  // 创建面板头部
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.style.cursor = 'move';
  
  // 关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => panel.remove();
  
  // 添加页面标题
  const titleDiv = document.createElement('div');
  titleDiv.className = 'page-title';
  titleDiv.textContent = document.title;
  
  // 内容区域
  const content = document.createElement('div');
  content.className = 'panel-content';
  
  // 添加欢迎信息
  const welcomeMsg = document.createElement('div');
  welcomeMsg.className = 'welcome-message';
  welcomeMsg.textContent = '欢迎使用马克记(marknote)，马克记会在当前网页生成一个浮窗来记录这些内容，你可以在阅读完毕后选择保存或复制这些内容。';
  content.appendChild(welcomeMsg);
  
  // 按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';
  
  // 保存按钮
  const saveBtn = document.createElement('button');
  saveBtn.className = 'action-btn';
  saveBtn.textContent = '保存文件';
  saveBtn.onclick = saveToFile;
  
  // 复制按钮
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-btn';
  copyBtn.textContent = '复制内容';
  copyBtn.onclick = copyToClipboard;
  
  // 组装面板
  buttonContainer.appendChild(saveBtn);
  buttonContainer.appendChild(copyBtn);
  header.appendChild(closeBtn);
  header.appendChild(titleDiv);
  panel.appendChild(header);
  panel.appendChild(content);
  panel.appendChild(buttonContainer);
  
  document.body.appendChild(panel);
  makeDraggable(panel, header);
  
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

// 添加日期格式化函数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// 保存为文件
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

// 复制到剪贴板
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

// 添加拖动功能
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

// 添加新的标注内容到面板
function addHighlight(text) {
  if (addedContents.has(text)) {
    return;
  }
  
  let panel = document.querySelector('.reader-side-panel');
  if (!panel) {
    panel = createSidePanel();
  }
  
  const content = panel.querySelector('.panel-content');
  
  // 如果是第一个高亮内容，清除欢迎信息
  const welcomeMsg = content.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  // 创建高亮元素
  const selection = window.getSelection();
  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.className = 'highlight-text';
  range.surroundContents(span);
  
  // 创建浮窗中的项目
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
  
  // 存储高亮文本和对应的 DOM 元素
  addedContents.set(text, {
    span: span,
    item: highlightItem
  });
  
  // 为高亮文本添加点击事件
  span.addEventListener('click', (e) => {
    e.preventDefault();
    removeHighlight(text, span, highlightItem);
  });
}

// 添加移除高亮的函数
function removeHighlight(text, span, item) {
  // 移除页面中的高亮
  const parent = span.parentNode;
  if (parent) {
    parent.replaceChild(document.createTextNode(span.textContent), span);
    parent.normalize(); // 合并相邻的文本节点
  }
  
  // 移除浮窗中的内容
  if (item) {
    item.remove();
  }
  
  // 从 Map 中删除
  addedContents.delete(text);
  
  // 如果没有高亮内容了，显示欢迎信息
  const panel = document.querySelector('.reader-side-panel');
  if (panel && addedContents.size === 0) {
    const content = panel.querySelector('.panel-content');
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'welcome-message';
    welcomeMsg.textContent = '欢迎使用马克记(marknote)，马克记会在当前网页生成一个浮窗来记录这些内容，你可以在阅读完毕后选择保存或复制这些内容。';
    content.appendChild(welcomeMsg);
  }
}

// 监听文本选择
document.addEventListener('mouseup', function() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0) {
    addHighlight(selectedText);
  }
}); 