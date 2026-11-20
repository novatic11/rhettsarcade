function showJunkyard(show){
 if(show){window.arcadeShowSecret?.(false);window.arcadeHub?.show(null);}
 $('#library').classList.toggle('junkyard-mode',show);$('#junkyard').hidden=!show;
 $('#junkyard-nav').classList.toggle('nav-active',show);$('#junkyard-nav').setAttribute('aria-current',show?'page':'false');
 if(show){$('.breadcrumb b').textContent='ARCHIVES';$('#library-nav').classList.remove('nav-active');$('#favorites-nav').classList.remove('nav-active');renderJunkyard();}
 else if(!$('#library').classList.contains('secret-mode'))$('.breadcrumb b').textContent='LIBRARY';
}
function renderJunkyard(){const grid=$('#junkyard-grid');grid.replaceChildren();
 const matches=junkyardGames.filter(game=>(game.title+' '+game.genre+' '+game.description).toLowerCase().includes(query));
 for(const game of window.arcadeSortGames?.(matches)||matches){const card=element('article','game-card junkyard-card'),art=element('a','card-art launch');art.href='?play='+encodeURIComponent(game.id);art.setAttribute('aria-label','Play '+game.title);const image=element('img');image.src=game.cover;image.alt='';image.loading='lazy';image.width=640;image.height=400;art.append(image);const body=element('div','card-body');body.append(element('div','card-meta',game.genre.toUpperCase()),element('h3','',game.title),element('p','card-description',game.description));const bottom=element('div','card-bottom'),play=element('a','play-link launch','Play ↗');play.href=art.href;play.setAttribute('aria-label','Play '+game.title);bottom.append(element('span','control-label',game.controls),detailButton(game),play);body.append(bottom);card.append(art,favoriteButton(game),body);grid.append(card);}
 if(!matches.length)grid.append(element('p','empty','No games match. Try another search.'));
}
window.arcadeShowJunkyard=showJunkyard;window.arcadeRenderJunkyard=renderJunkyard;
$('#junkyard-nav').addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0)return;event.preventDefault();history.pushState({},'','?junkyard=1');stopGame();showJunkyard(true);window.scrollTo(0,0);});
