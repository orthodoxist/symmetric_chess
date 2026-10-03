(function(root){
  // Reference-style contours, kept as vectors for consistent rendering on every device.
  const shapes={
    P:'<circle cx="32" cy="16" r="9"/><path d="M25 26h14q2 0 2 2t-2 2H25q-2 0-2-2t2-2zM28 30h8q-2 10 7 19H21q9-9 7-19z"/><path d="M22 46h20" fill="none"/>',
    R:'<path d="M16 7h8v7h5V7h6v7h5V7h8v17H16zM20 24h24v5H20zM24 29h16l2 20H22z"/><path d="M19 20h26M26 32l-1 12" fill="none"/>',
    N:'<path d="M19 49C14 44 21 36 29 29C35 23 34 18 29 17L23 21L17 25L10 24L8 21L12 16L20 10L24 9L23 3L28 8C34 3 43 6 48 12C56 21 55 36 48 45L46 49Z"/><path d="M28 8C39 4 47 12 49 20C52 31 47 42 43 46M32 12C43 14 44 27 35 36L24 47M30 19C37 28 26 33 20 41M18 18L13 21M10 21L13 23M22 12L25 14" fill="none"/><path d="M35 7L40 10M41 9L46 14M46 14L49 20M49 21L51 27M49 29L50 34M47 36L47 41M44 42L43 46" fill="none"/><circle cx="23" cy="15" r="1.7" fill="INK" stroke="none"/><path d="M31 13C39 15 39 25 34 31" fill="none" stroke="LIGHT" stroke-width="1.2"/>',
    B:'<circle cx="32" cy="6" r="3"/><path d="M32 10c-4 3-16 12-16 23 0 7 7 11 16 11s16-4 16-11c0-11-12-20-16-23z"/><path d="M30 24h4v5h5v4h-5v5h-4v-5h-5v-4h5z" fill="LIGHT" stroke-width="1.4"/><path d="M25 44h14l4 5H21z"/>',
    Q:'<path d="M12 20l8 24h24l8-24-13 15 6-22-13 20-13-20 6 22z"/><circle cx="12" cy="18" r="3"/><circle cx="19" cy="10" r="3"/><circle cx="32" cy="6" r="3"/><circle cx="45" cy="10" r="3"/><circle cx="52" cy="18" r="3"/><path d="M32 9v24M22 42h20M22 44h20v5H22z" fill="none"/>',
    K:'<path d="M29 4h6v5h5v5h-5v7h-6v-7h-5V9h5z"/><path d="M32 22c-5-7-13-4-14 2-7-3-9 4-5 8 5 5 8 10 9 14h20c1-4 4-9 9-14 4-4 2-11-5-8-1-6-9-9-14-2z"/><path d="M21 29q5 4 7 14M32 25v18M43 29q-5 4-7 14M22 46h20v3H22z" fill="none"/>'
  };
  const cache=new Map();
  function url(type,color){
    if(!shapes[type]||!['white','black'].includes(color))throw Error('Unknown chess piece');
    const key=type+color;if(cache.has(key))return cache.get(key);
    const white=color==='white',ink='#20282d',light=white?'#fffef0':'#62696e',dark=white?'#d5e5d6':'#30373c';
    const body=shapes[type].replaceAll('INK',ink).replaceAll('LIGHT',light);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs><g fill="url(#body)" stroke="'+ink+'" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">'+body+'<path d="M22 49h20q3 0 3 4H19q0-4 3-4zM19 53h26l5 6H14z"/></g><path d="M18 57h28" stroke="'+light+'" stroke-width="1.3" stroke-linecap="round"/></svg>';
    const result='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);cache.set(key,result);return result;
  }
  const api={url};if(typeof module!=='undefined')module.exports=api;else root.Chess10Pieces=api;
})(globalThis);
