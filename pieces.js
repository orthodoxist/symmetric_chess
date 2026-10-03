(function(root){
  // Rounded, original SVG pieces with the same silhouette for both sides.
  const shapes={
    P:'<circle cx="32" cy="16" r="8.5"/><path d="M24 27h16l-4 7c0 7 3 12 7 16H21c4-4 7-9 7-16z"/><path d="M24 27h16" fill="none"/>',
    R:'<path d="M17 9h7v7h5V9h6v7h5V9h7v17H17zM23 26h18l-2 19 5 5H20l5-5z"/><path d="M19 22h26M25 43h14" fill="none"/>',
    N:'<path d="M20 50c-1-9 4-17 12-23l-10 6-8-6 3-6 10-8 4-7 5 7c13 2 17 15 12 37z"/><path d="M36 17c7 6 10 13 8 23M17 25l5 1M25 17l4 2" fill="none"/><circle cx="34" cy="22" r="2.2" fill="INK" stroke="none"/>',
    B:'<circle cx="32" cy="8" r="3.2"/><path d="M32 12c-7 6-13 12-13 20 0 6 6 10 13 10s13-4 13-10c0-8-6-14-13-20zM27 42h10l-1 4 8 4H20l8-4z"/><path d="M32 24v11M27 29.5h10" fill="none" stroke-width="2.6"/>',
    Q:'<path d="M16 19l9 9-1-14 8 12 8-12-1 14 9-9-7 24H23zM24 43h16l-2 3 6 4H20l6-4z"/><circle cx="16" cy="16" r="3.2"/><circle cx="24" cy="11" r="3.2"/><circle cx="32" cy="9" r="3.2"/><circle cx="40" cy="11" r="3.2"/><circle cx="48" cy="16" r="3.2"/><path d="M24 38h16" fill="none"/>',
    K:'<path d="M29 5h6v6h6v6h-6v7h-6v-7h-6v-6h6zM18 28c-3-8 8-12 14-4 6-8 17-4 14 4l-6 15H24zM24 43h16l-2 3 6 4H20l6-4z"/><path d="M32 27v12M25 39h14" fill="none"/>'
  };
  const cache=new Map();
  function url(type,color){
    if(!shapes[type]||!['white','black'].includes(color))throw Error('Unknown chess piece');
    const key=type+color;if(cache.has(key))return cache.get(key);
    const white=color==='white',ink='#20282d',light=white?'#fffef0':'#62696e',dark=white?'#d5e5d6':'#30373c';
    const body=shapes[type].replaceAll('INK',ink);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient></defs><g fill="url(#body)" stroke="'+ink+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">'+body+'<path d="M21 50h22l5 6H16zM16 56h32v4H16z"/></g><path d="M19 57h26" stroke="'+light+'" stroke-width="1.4" stroke-linecap="round"/></svg>';
    const result='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);cache.set(key,result);return result;
  }
  const api={url};if(typeof module!=='undefined')module.exports=api;else root.Chess10Pieces=api;
})(globalThis);
