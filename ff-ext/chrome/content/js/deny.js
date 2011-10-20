function init() {
  var entity = decodeURI(
      phinishphish.param(window.location.toString(), 'entity'));
  var domain = decodeURI(
      phinishphish.param(window.location.toString(), 'domain'));

  var elements = document.getElementsByClassName('entity-name');
  for (var i = 0; i < elements.length; ++i) {
    elements[i].innerHTML = entity;
  }
  document.getElementById('search-input').value = entity;

  var link = document.getElementById('correct-link');
  link.innerHTML = domain;
  link.setAttribute('href', 'http://' + domain);
}
init();
