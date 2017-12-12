(function(d, iswebview){
  var uaElement = d.querySelector('.ua');
  var responses = [].slice.call(d.querySelectorAll('h2[class$="-webview"]'));

  // display if we are in a WebView or not
  uaElement.onchange = function(){
    var result = iswebview(String(this.value).trim());
    var method;

    responses.forEach(function(el){
      method = 'setAttribute';

      if (
        (el.className.contains('is-webview') && result)
        || (el.className.contains('is-not-webview') && !result)
      ){
        method = 'removeAttribute';
      }

      el[method]('hidden', '');
    });
  }

  uaElement.value = navigator.userAgent;
  uaElement.onchange();

})(window.document, isWebview);
