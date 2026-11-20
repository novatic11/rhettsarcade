function showSecret(show){if(show)window.arcadeHub?.show(null);if(show)window.arcadeShowJunkyard?.(false);$('#library').classList.toggle('secret-mode',show);$('#secret-games').hidden=!show;$('.breadcrumb b').textContent=show?'ADMIN TAB':'LIBRARY';$('#library-nav').classList.toggle('nav-active',!show&&filter!=='Favorites');$('#favorites-nav').classList.toggle('nav-active',!show&&filter==='Favorites');}
window.arcadeShowSecret=showSecret;
$('#secret-entry').onclick=()=>{history.pushState({},'','?workshop=1');showSecret(true);window.scrollTo(0,0);};
for(const link of document.querySelectorAll('.sidebar-saves,.profile-mark,.skip-link'))link.addEventListener('click',()=>{showSecret(false);window.arcadeShowJunkyard?.(false);window.arcadeHub?.show(null);history.replaceState({},'','./');});
