var storage = (function (storageArea) {

  var store = chrome.storage[storageArea];

  function executePromise(method, param) {
    return new Promise(function (resolve, reject) {
      store[method](param, function (result) {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        resolve(result);
      });
    });
  }

  return {
    set: function (key, value) {
      var data = {};
      data[key] = value;
      return executePromise('set', data).then(function () {
        return value;
      });
    },
    get: function (key, defaults) {
      return executePromise('get', key).then(function (data) {
        return data && data[key] || defaults;
      });
    },
    remove: function (key) {
      return executePromise('remove', key);
    },
    clear: function () {
      return new Promise(function (resolve, reject) {
        store.clear(function () {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          resolve();
        });
      });
    },
    upsert: function (key, changes) {
      return executePromise('get', key).then(function (data) {
        data[key] = $.extend({}, data[key], changes);
        return executePromise('set', data);
      });
    }
  };

}('local'));
