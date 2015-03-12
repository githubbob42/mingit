function mingleAPI(path) {
  return storage.get('options').then(function (options) {
    var settings = {
      url: `${ options.host }/api/v2${ path }`,
      dataType: 'xml',
      headers: {
        'Authorization': 'Basic ' + btoa(options.username + ':' + options.password)
      }
    };
    return Promise.resolve($.ajax(settings));
  });
}

function getMingleCardInfo(card) {
  return storage.get('options').then(function (options) {
    return mingleAPI(`/projects/${ card.project }/cards/${ card.number }.xml`).then(function (xml) {
      var $xml = $(xml);

      var propertyValue = $xml
        .find('card > properties > property name')
        .filter(function () { return $(this).text() === options.property; })
        .parent()
        .find('value')
        .text();

      $.extend(card, {
        name: $xml.find('card > name').text(),
        type: $xml.find('card > card_type name').text(),
        propertyValue: propertyValue,
        url: `${ options.host }/projects/${ card.project }/cards/${ card.number }`
      });

      if (options.color === 'mingle') return card;
      
      return Promise.all([
        setCardColor(card),
        setCardPropertyColor(card, options)
      ])
      .then(function () {
        return card;
      });
    });
  });
}

function setCardColor(card) {
  var key = card.project + '_typeColors';

  return storage.get(key).then(function (colors) {
    if (colors) return colors;

    return mingleAPI(`/projects/${ card.project }/card_types.xml`).then(function (xml) {
      var $xml = $(xml);
      var colors = $xml
        .find(`card_types > card_type`)
        .map(function () {
          var $node = $(this);
          return {
            name: $node.children('name').text(),
            color: $node.children('color').text() || '#cccccc'
          };
        })
        .get()
        .reduce(function (colors, type) {
          colors[type.name] = type.color;
          return colors;
        }, {});

      return storage.set(key, colors);
    });
  })
  .then(function (colors) {
    card.color = colors[card.type];
  });
}

function setCardPropertyColor(card, options) {
  var key = card.project + '_propertyColors';

  return storage.get(key).then(function (colors) {
    if (colors) return colors;

    return mingleAPI(`/projects/${ card.project }/property_definitions.xml`).then(function (xml) {
      var $xml = $(xml);
      var colors = $xml
        .find(`property_definitions > property_definition name`)
        .filter(function () { return $(this).text() === options.property; })
        .parent()
        .find('property_value_details > property_value')
        .map(function () {
          var $node = $(this);
          return {
            value: $node.children('value').text(),
            color: $node.children('color').text() || '#cccccc'
          };
        })
        .get()
        .reduce(function (colors, type) {
          colors[type.value] = type.color;
          return colors;
        }, {});

      return storage.set(key, colors);
    });
  })
  .then(function (colors) {
    card.propertyColor = colors[card.propertyValue];
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, callback) {
  if (request.mingle) {
    getMingleCardInfo(request.mingle).then(callback);
    return true; // make sure we wait for asynchronously executed callback
  }
});
