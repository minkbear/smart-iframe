(function(){
    var params = window.location.search.substring(1).split('&');
    var qParams = [];
    var urlParams = {};
    
    for(var i = 0; i < params.length; i++){
        if(params[i]){
            var pair = params[i].split('=');
            var key = decodeURIComponent(pair[0]);
            var value = pair[1] ? decodeURIComponent(pair[1]) : '';
            if(key){
                urlParams[key] = value;
                qParams.push(key + '=' + encodeURIComponent(value));
            }
        }
    }
    
    console.log('All URL Parameters:', urlParams);

    var container = document.getElementById('iframe-container');

    // baseSrc override: data-base-src on container, then global var, then default (backward compatible)
    var baseSrc = (container && container.getAttribute('data-base-src'))
        || window.SMART_IFRAME_BASE_SRC
        || 'https://app.ofonline.net/careers/';

    var sep = baseSrc.indexOf('?') === -1 ? '?' : '&';
    if(qParams.length > 0){
        baseSrc += sep + qParams.join('&');
    } else {
        baseSrc += sep + 'redirect=https://www.outsourcingfactory.co.th/%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%AA%E0%B8%A1%E0%B8%B1%E0%B8%84%E0%B8%A3%E0%B8%87%E0%B8%B2%E0%B8%99/thank-you.html';
    }
    
    console.log('Final iframe URL:', baseSrc);
    
    var div = document.createElement('div');
    div.className = 'smartIframe';
    div.setAttribute('data-src', baseSrc);
    div.setAttribute('data-allow-resize', 'true');
    div.setAttribute('data-allow-redirect', 'true');
    div.setAttribute('data-allow-events', 'true');
    div.setAttribute('data-cross-origin', 'true');
    div.setAttribute('data-debug-mode', 'false');
    div.setAttribute('data-initial-height', '3000');
    
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@febc6ee/dist/smart-iframe-v2.min.js';
    div.appendChild(script);
    
    if(container) {
        container.appendChild(div);
    }
})();