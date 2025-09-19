(function(){
    var params = window.location.search.substring(1).split('&');
    var pos = null;
    
    for(var i=0; i<params.length; i++){
        var pair = params[i].split('=');
        if(decodeURIComponent(pair[0]) === 'p'){
            pos = decodeURIComponent(pair[1]);
            break;
        }
    }
    
    if(pos){
        var c = 0;
        var interval = setInterval(function(){
            c++;
            var el = document.querySelector('.smartIframe');
            
            if(el){
                clearInterval(interval);
                var src = el.getAttribute('data-src');
                
                if(src){
                    var newSrc = src.replace(/(p=)[^&]*/, 'p=' + encodeURIComponent(pos));
                    el.setAttribute('data-src', newSrc);
                    console.log('P updated to:', pos);
                }
            }
            
            if(c > 25) clearInterval(interval);
        }, 200);
    }
})();