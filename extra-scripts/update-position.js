(function(){
    var p=new URLSearchParams(window.location.search).get('position');
    if(p){
        var check=setInterval(function(){
            var el=document.querySelector('.smartIframe');
            if(el){
                clearInterval(check);
                var src=el.getAttribute('data-src');
                if(src){
                    var url=new URL(src);
                    url.searchParams.set('p',p);
                    el.setAttribute('data-src',url.toString());
                    console.log('Position updated:',p);
                }
            }
        },200);
    }
})();