var store = storage('local');

function mingleAPI(path, method) {
  return store.get('options').then(function (options) {
    var settings = {
      url: `${ options.host }/api/v2${ path }`,
      dataType: 'xml',
      method: method || 'GET'
    };
    if (options.username && options.password) {
      settings.headers = {
        'Authorization': 'Basic ' + btoa(options.username + ':' + options.password)
      };
    }
    return Promise.resolve($.ajax(settings));
  });
}

function getMingleCardInfo(card) {
  return store.get('options').then(function (options) {
    return mingleAPI(`/projects/${ card.project }/cards/${ card.number }.xml`).then(function (xml) {
      var $xml = $(xml);

      $.extend(card, {
        name: $xml.find('card > name').text(),
        type: $xml.find('card > card_type name').text(),
        url: `${ options.host }/projects/${ card.project }/cards/${ card.number }`,
        labels: []
      });

      return Promise.all([
        addCardLabel(card),
        addCardTransitions(card),
        addPropertyLabels(card, $xml, options)
      ])
      .then(function () {
        return card;
      });
    });
  });
}

function addCardTransitions(card) {
  // TODO: support user input for transitions
  return mingleAPI(`/projects/${ card.project }/cards/${ card.number }/transitions.xml`).then(function (xml) {
    var $xml = $(xml);
    card.transitions = $xml
      .find(`transitions > transition`)
      .map(function () {
        var $node = $(this);
        return {
          id: $node.children('id').text(),
          name: $node.children('name').text()
        };
      })
      .get();
  });
}

function getPropertyValue($xml, name) {
  var $value = $xml
    .find('card > properties > property name')
    .filter(function () { return $(this).text() === name; })
    .parent()
    .find('value');

  if ($value.find('name').size()) {
    return $value.find('name');
  } else {
    return $value;
  }
}

function getCardColors(card) {
  var key = card.project + '_typeColorMap';

  return store.get(key).then(function (colors) {
    if (colors) return colors;

    return mingleAPI(`/projects/${ card.project }/card_types.xml`).then(function (xml) {
      var $xml = $(xml);
      var colors = $xml
        .find(`card_types > card_type`)
        .map(function () {
          var $node = $(this);
          return {
            name: $node.children('name').text(),
            color: $node.children('color').text() || '#5bb2ef'
          };
        })
        .get()
        .reduce(function (colors, type) {
          colors[type.name] = type.color;
          return colors;
        }, {});

      return store.set(key, colors);
    });
  });
}

function getCardPropertyColors(card) {
  var key = card.project + '_propertyColorMap';

  return store.get(key).then(function (colors) {
    if (colors) return colors;

    var colors = {};

    return mingleAPI(`/projects/${ card.project }/property_definitions.xml`).then(function (xml) {
      $(xml)
        .find('property_definitions > property_definition name').get()
        .forEach(function (node) {
          var $prop = $(node);
          var name = $prop.text();
          var values = $prop.parent().find('property_value_details > property_value').get();
          colors[name] = {};

          values.forEach(function (node) {
            var $node = $(node);
            var value = $node.children('value').text();
            var color = $node.children('color').text();
            colors[name][value] = color || '#5bb2ef';
          });
        });

      return store.set(key, colors);
    });
  });
}

function addCardLabel(card) {
  return getCardColors(card).then(function (colors) {
    var label = {
      name: 'Mingle',
      value: card.type + ' #' + card.number,
      color: colors[card.type]
    };
    card.labels.push(label);
  });
}

function addPropertyLabel(card, $xml, colors, property) {
  if (!property) return;
  var value = getPropertyValue($xml, property).text();
  var label = {
    name: property,
    value: value,
    color: colors[property][value]
  };
  card.labels.push(label);
}

function addPropertyLabels(card, $xml, options) {
  var properties = options.properties.split(',');
  return getCardPropertyColors(card).then(function (colors) {
    properties.forEach(function (property) {
      addPropertyLabel(card, $xml, colors, $.trim(property));
    });
  });
}

function executeTransition(params) {
  return mingleAPI(`/projects/${ params.project }/transition_executions/${ params.id }.xml?transition_execution[card]=${ params.card }`, 'POST');
}

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  if (request.card) {
    getMingleCardInfo(request.card).then(callback);
    return true; // make sure we wait for asynchronously executed callback
  }
  if (request.transition) {
    executeTransition(request.transition).then(callback);
    return true; // make sure we wait for asynchronously executed callback
  }
});
