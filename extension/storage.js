function storage(storageArea) {
  var store = chrome.storage[storageArea],
      listeners = {};

  function promisify(method) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();

    return new Promise(function (resolve, reject) {
      args.push(function callback(result) {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        resolve(result);
      });
      store[method].apply(store, args);
    });
  }

  chrome.storage.onChanged.addListener(function (changes) {
    Object.keys(listeners).filter(function (key) {
      if (changes[key]) {
        listeners[key].forEach(function (listener) {
          listener(changes[key].newValue, changes[key].oldValue);
        });
      }
    });
  });

  return {
    get: function (key, defaults) {
      return promisify('get', key).then(function (data) {
        return data && data[key] || defaults;
      });
    },
    set: function (key, value) {
      var data = {};
      data[key] = value;
      return promisify('set', data).then(function () {
        return value;
      });
    },
    remove: function (key) {
      return promisify('remove', key);
    },
    update: function (key, changes) {
      return promisify('get', key).then(function (data) {
        var value = data[key] || {};
        for (var prop in changes) {
          value[prop] = changes[prop];
        }
        return promisify('set', value);
      });
    },
    clear: function () {
      return promisify('clear');
    },
    onChanged: function (key, listener) {
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(listener);
    }
  };
}
