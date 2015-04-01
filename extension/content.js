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
      if (options.showLabels) injectLabel($link, card, options.colors);
      if (options.showLinks || options.showLabels) $link.text(card.name);
    });
  });
}

function injectLabel($link, card, useColors) {
  var $labelsContainer = $link.siblings('.labels');
  if ($labelsContainer.size() === 0) {
    $labelsContainer = $('<span class="labels" />').insertAfter($link.siblings('.issue-pr-status'));
  }

  card.labels.reverse().forEach(function (label) {
    var bgColor = useColors ? label.color : '#5bb2ef',
        textColor = useColors ? getContrastColor(label.color) : '#fff';

    var label = `
      <a target="mingle" href="${ card.url }" class="label"
        style="background: ${ bgColor }; color: ${ textColor }; white-space: nowrap">
        <span style="background: #666; color: #fff; padding: 3px 5px; margin: 0 2px 0 -4px; border-radius: 2px 0 0 2px; box-shadow: inset 0 -1px 0 rgba(0,0,0,0.12)">${ label.name }</span> ${ label.value }
      </a>`;

    $labelsContainer.prepend(label);
  });
}

function injectLink($link, card) {
  var properties = card.labels.map(function (label) {
    return `<span style="white-space: nowrap; margin-right: 1.5em;">${ label.name }: <strong>${ label.value }</strong></span>`;
  }).join('');

  var link = `
    <a class="issue-meta" target="mingle" href="${ card.url }" style="display:block; text-decoration: none; background: #EEF7FF; color: #4183c4; padding: 5px 8px; border: 1px solid #def; border-radius: 3px">
      <span class="issue-meta-section">
        ${ properties }
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
      card.labels.shift();
      var properties = card.labels.map(function (label) {
        return `<span style="white-space: nowrap; margin-right: 1.5em;">${ label.name }: <strong>${ label.value }</strong></span>`;
      }).join('');

      var header = `
        <div class="flex-table gh-header-meta">
          <div class="flex-table-item">
            <a class="state state-open" target="mingle" href="${ card.url }" style="background: #5bb2ef">
              <span class="octicon octicon-link-external"></span> Mingle ${ card.type } #${ card.number }
            </a>
          </div>
          <div class="flex-table-item flex-table-item-primary">${ properties }</div>
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
