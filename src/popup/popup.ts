const exportBtn = document.getElementById('test');
const settingsLink = document.getElementById('settings-link');

exportBtn!.addEventListener('click', () => {
    console.log('test clicked');
    chrome.runtime.sendMessage({ action: 'test' });
});

settingsLink!.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});
