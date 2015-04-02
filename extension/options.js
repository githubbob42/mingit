var store = storage('local');

function save_options() {
  var options = {
    repo: document.getElementById('repo').value,
    host: document.getElementById('host').value,
    properties: document.getElementById('properties').value,
    colors: document.getElementById('colors').checked,
    showLinks: document.getElementById('links').checked,
    showLabels: document.getElementById('labels').checked
  };

  store.set('options', options).then(function () {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restore_options() {
  var defaults = {
    repo: '',
    host: '',
    properties: '',
    colors: false,
    showLinks: true,
    showLabels: false
  };

  store.get('options', defaults).then(function (options) {
    document.getElementById('repo').value = options.repo;
    document.getElementById('host').value = options.host;
    document.getElementById('properties').value = options.properties;
    document.getElementById('colors').checked = options.colors;
    document.getElementById('links').checked = options.showLinks;
    document.getElementById('labels').checked = options.showLabels;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);