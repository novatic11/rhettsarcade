// The URL chooses a world before any simulation or storage module loads.
export const REAL_SOLAR=new URLSearchParams(globalThis.location?.search||'').get('universe')==='solar';
export const HOME_BODY=REAL_SOLAR?'earth':'cinder',HOME_MOON=REAL_SOLAR?'moon':'luma',HOME_STAR=REAL_SOLAR?'sun':'helios',HOME_SYSTEM=REAL_SOLAR?'solar':'helios';
export function universeURL(solar,href=globalThis.location?.href){const url=new URL(href);if(solar)url.searchParams.set('universe','solar');else url.searchParams.delete('universe');url.hash='';return url.href;}
export function localNames(text){return REAL_SOLAR?String(text).replaceAll('Cinder','Earth').replaceAll('Luma','the Moon').replaceAll('Helios','Solar'):text;}
