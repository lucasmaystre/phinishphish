function init() {
  var query = decodeURI(
      phinishphish.param(window.location.toString(), 'query'));

  var elements = document.getElementsByClassName('query-string');
  for (var i = 0; i < elements.length; ++i) {
    elements[i].innerHTML = query;
  }
  document.getElementById('search-input').value = query;
}
init();
