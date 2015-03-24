var store = storage('local');

function parseMingleInfo(text) {
  if (!text) return;

  var matches = $.trim(text).match(/\[(.+)\/#(.+)\]/);
  if (!matches || matches.length !== 3) return;

  return {
    project: matches[1],
    number: matches[2]
  };
}

function updateList(options) {
  $('.issue-title-link').each(function (i, link) {
    var $link = $(link);
    var mingle = parseMingleInfo($link.text());
    if (!mingle) return;

    chrome.runtime.sendMessage({ mingle: mingle }, function (card) {
      if (options.showLinks) injectLink($link, card);
      if (options.showLabels) injectLabel($link, card, options.color);
      if (options.showLinks || options.showLabels) $link.text(card.name);
    });
  });
}

function injectLabel($link, card, color) {
  var bgColor = card[color] || '#5bb2ef',
      textColor = card[color] && getContrastColor(card[color]) || '#fff';
  
  var label = `
    <a target="mingle" href="${ card.url }" class="label"
      style="background: ${ bgColor }; color: ${ textColor }; white-space: nowrap">
      Mingle ${ card.type } #${ card.number } - ${ card.propertyValue }
    </a>`;

  var $labelsContainer = $link.siblings('.labels');
  if ($labelsContainer.size() === 0) {
    $labelsContainer = $('<span class="labels" />').insertAfter($link.siblings('.issue-pr-status'));
  }
  $labelsContainer.prepend(label);
}

function injectLink($link, card) {
  var link = `
    <div class="issue-meta">
      <span class="issue-meta-section">
        <a target="mingle" href="${ card.url }">
          <strong>
            ${ card.propertyValue }
          </strong>
          - Mingle ${ card.type } #${ card.number }
        </a>
      </span>
    </div>`;

  $link.parent().append(link);
}

function updateDetails() {
  $('.js-issue-title').each(function (i, title) {
    var $title = $(title);
    var mingle = parseMingleInfo($title.text());
    if (!mingle) return;

    chrome.runtime.sendMessage({ mingle: mingle }, function (card) {
      var header = `
        <div class="flex-table gh-header-meta">
          <div class="flex-table-item">
            <a class="state state-open" target="mingle" href="${ card.url }" style="background: #5bb2ef">
              <span class="octicon octicon-link-external"></span> Mingle ${ card.type } #${ card.number }
            </a>
          </div>
          <div class="flex-table-item flex-table-item-primary">${ card.propertyValue }</div>
        </div>`;

      $('.gh-header-edit').after(header);
      $title.text(card.name);
    });

    $('.discussion-item-labeled, .discussion-item-unlabeled').remove();
  });
}

function getContrastColor(hexcolor) {
  if (!hexcolor) return '#5bb2ef';

  hexcolor = hexcolor.replace('#','');
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#333' : '#fff';
}

function injectMingle() {
  store.get('options').then(function (options) {
    if (!options) return;
    if (!options.showLinks && !options.showLabels) return;
    if (!window.location.href.match(new RegExp(options.repo, 'i'))) return;
    updateList(options);
    updateDetails();
  });
}

injectMingle();

// re-inject when page transition is detected
new MutationObserver(injectMingle).observe(document.getElementById('js-repo-pjax-container'), { childList: true });
