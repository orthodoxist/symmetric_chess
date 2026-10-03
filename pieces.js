(function(root){
  // Original vector silhouettes, independent of system fonts and emoji rendering.
  const shapes={
    P:'<circle cx="32" cy="14" r="8"/><path d="M25 25h14l-3 6c0 8 2 13 7 17H21c5-4 7-9 7-17z"/>',
    R:'<path d="M17 8h7v7h5V8h6v7h5V8h7v15H17zM23 23h18l-2 22 5 4H20l5-4z"/>',
    N:'<path d="M18 48c0-10 5-17 13-24l-12 5-5-7 11-8 5-9 5 7c15 1 18 18 13 36z"/><path d="M25 17l5 2M15 23l5 1" fill="none"/><circle cx="36" cy="19" r="2" fill="STROKE" stroke="none"/>',
    B:'<path d="M32 7c-6 7-13 12-13 20 0 5 6 8 13 8s13-3 13-8c0-8-7-13-13-20zM26 35h12l-2 8 8 6H20l8-6z"/><path d="M36 15l-8 13" fill="none" stroke-width="3"/><circle cx="32" cy="6" r="3"/>',
    Q:'<path d="M17 18l5 8 2-13 8 12 8-12 2 13 5-8-5 21H22zM24 39h16l-2 5 6 5H20l6-5z"/><circle cx="16" cy="15" r="3"/><circle cx="24" cy="10" r="3"/><circle cx="32" cy="8" r="3"/><circle cx="40" cy="10" r="3"/><circle cx="48" cy="15" r="3"/>',
    K:'<path d="M29 4h6v6h6v6h-6v6h-6v-6h-6v-6h6zM19 27c-3-10 9-11 13-3 4-8 16-7 13 3l-5 12H24zM24 39h16l-2 5 6 5H20l6-5z"/>'
  };
  const cache=new Map();
  function url(type,color){
    if(!shapes[type]||!['white','black'].includes(color))throw Error('Unknown chess piece');
    const key=type+color;if(cache.has(key))return cache.get(key);
    const fill=color==='white'?'#fffdf0':'#18242b',stroke=color==='white'?'#24343d':'#d6e0d8';
    const body=shapes[type].replaceAll('STROKE',stroke);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">'+body+'<path d="M20 49h24l4 6H16zM15 55h34v5H15z"/></g></svg>';
    const result='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);cache.set(key,result);return result;
  }
  const api={url};if(typeof module!=='undefined')module.exports=api;else root.Chess10Pieces=api;
})(globalThis);
