(function(root){
  // Broad reference-style silhouettes with transparent cutouts and rounded bases.
  const shapes={
    P:'<path d="M32 12c-5.5 0-9 3.7-9 8.5 0 4 2.5 6.5 5 8l-6 4v3h6c-1 6-4 10-9 13-4 2-6 5-6 10h38c0-5-2-8-6-10-5-3-8-7-9-13h6v-3l-6-4c2.5-1.5 5-4 5-8C41 15.7 37.5 12 32 12z"/><path d="M35 15c4 7 0 12-3 14l5 7c0 8 4 12 10 15l2 5h-7c0-6-4-8-7-12-3-4-4-8-4-12 7-5 7-10 4-17z" fill="SHADE" stroke="none"/>',
    R:'<path d="M19 26h26l3 24H16z"/><path d="M38 26h7l3 24h-8z" fill="SHADE" stroke="none"/><path d="M16 25c-2-4-2-9-3-15l7-1 2 7h6l1-8h8l1 8h6l2-7 7 1c-1 6-1 11-3 15-8-2-22-2-30 0z"/><path d="M12 52c2-4 7-5 20-5s18 1 20 5v9H12z"/>',
    N:'<path d="M17 49c0-5 5-8 10-12 5-4 7-8 7-11-4 4-7 6-11 6l-4 5-8-3c-2-1-3-2-2-4l7-13 5-5 3-8c1-2 3-1 5 3l2 2c12 1 22 10 22 24 0 7-2 12-3 16z"/><path d="M38 13c11 9 13 24 7 36H28c7-7 12-14 12-23 0-5-1-9-2-13z" fill="SHADE" stroke="none"/><path d="M22 19q2-6 6-4-1 4-6 4" fill="INK" stroke="none"/><path d="M16 33l3-2" fill="none"/><path d="M11 53c2-4 8-5 21-5s19 1 21 5v8H11z"/>',
    B:'<path fill-rule="evenodd" d="M31 49c-11 0-16-7-16-17 0-9 6-18 13-24-5-6 0-10 4-10 4 0 7 3 5 6-7 11-9 19-9 29h6c0-9 1-15 5-22 8 7 11 14 11 22 0 10-6 16-19 16z" transform="translate(0 5)"/><path d="M39 18c8 16 5 26-3 32h9c9-9 8-20-6-32z" fill="SHADE" stroke="none"/><path d="M11 53c2-4 8-5 21-5s19 1 21 5v8H11z"/>',
    Q:'<path d="M17 48L8 25c-7-4-3-12 3-10 5 1 5 6 2 9l10 8-2-17c-7-6-2-15 5-12 5 2 5 7 1 11l5 19 5-19c-4-4-4-9 1-11 7-3 12 6 5 12l-2 17 10-8c-3-3-3-8 2-9 6-2 10 6 3 10l-9 23z"/><path d="M43 34l10-8-8 23h-8z" fill="SHADE" stroke="none"/><path d="M11 53c2-4 8-5 21-5s19 1 21 5v8H11z"/>',
    K:'<path fill-rule="evenodd" d="M27 2h10v5h5v7h-5v4c9-5 22-2 23 10 1 8-8 14-15 21H19C12 42 3 36 4 28c1-12 14-15 23-10v-4h-5V7h5zM26 29c-7-6-14-3-10 3l10 8zM38 29v11l10-8c4-6-3-9-10-3z"/><path d="M48 19c10 5 8 13 3 18l-12 12h6c9-8 17-14 13-24-2-4-6-5-10-6z" fill="SHADE" stroke="none"/><path d="M11 53c2-4 8-5 21-5s19 1 21 5v8H11z"/>'
  };
  const cache=new Map();
  function url(type,color){
    if(!shapes[type]||!['white','black'].includes(color))throw Error('Unknown chess piece');
    const key=type+color;if(cache.has(key))return cache.get(key);
    const white=color==='white',ink='#303034',fill=white?'#fffef0':'#55595d',shade=white?'#d5d8d5':'#42464a';
    const body=shapes[type].replaceAll('INK',ink).replaceAll('SHADE',shade);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="'+fill+'" stroke="'+ink+'" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">'+body+'</g></svg>';
    const result='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);cache.set(key,result);return result;
  }
  const api={url};if(typeof module!=='undefined')module.exports=api;else root.Chess10Pieces=api;
})(globalThis);
