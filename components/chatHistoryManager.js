(function(){
  const storageKey = 'yola-chat-history';

  function readHistory(){
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function writeHistory(records){
    localStorage.setItem(storageKey, JSON.stringify(records));
  }

  function addEntry(entry){
    const records = readHistory();
    records.push(entry);
    writeHistory(records);
    return records;
  }

  window.chatHistoryManager = {
    getHistory: readHistory,
    saveHistory: writeHistory,
    addEntry,
    clearHistory(){ writeHistory([]); }
  };
})();
