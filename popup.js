document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.querySelector('.toggle-btn');
  
  // 获取当前状态
  chrome.storage.local.get('isEnabled', ({ isEnabled = false }) => {
    updateButtonState(isEnabled);
  });

  toggleBtn.addEventListener('click', () => {
    // 切换状态
    chrome.storage.local.get('isEnabled', ({ isEnabled = false }) => {
      const newState = !isEnabled;
      chrome.storage.local.set({ isEnabled: newState }, () => {
        updateButtonState(newState);
        notifyContentScript(newState);
      });
    });
  });

  function updateButtonState(isEnabled) {
    toggleBtn.textContent = isEnabled ? '已开启' : '已关闭';
    toggleBtn.classList.toggle('active', isEnabled);
  }

  function notifyContentScript(isEnabled) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'toggleExtension',
        isEnabled: isEnabled
      });
    });
  }
}); 