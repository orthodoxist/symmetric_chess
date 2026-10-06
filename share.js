(function(root){
  // Render only the explicit result fields: chat messages and invite links never enter the image.
  async function capture(data){
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=950;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
    const colors={bg:'#10171d',panel:'#19232c',border:'#344650',text:'#e5e9ee',muted:'#a7b5bd'};
    const text=(value,x,y,size=18,color=colors.text,bold=false,maxWidth)=>{ctx.font=(bold?'600 ':'')+size+'px system-ui, sans-serif';ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(value,x,y,maxWidth);};
    const box=(x,y,w,h,fill=colors.panel,r=10)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.strokeStyle=colors.border;ctx.lineWidth=1;ctx.stroke();};
    const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});
    const sources=[...new Set([...data.squares.map(s=>s.src),...data.captured.flat().map(s=>s.src)].filter(Boolean))];
    const images=new Map(await Promise.all(sources.map(async src=>[src,await load(src)])));
    ctx.fillStyle=colors.bg;ctx.fillRect(0,0,1600,950);
    text(data.title,32,22,25,colors.text,true);text(data.status,32,65,20,colors.text,true,790);
    text(data.kings,48,99,17,colors.muted,true,770);
    const bx=54,by=137,size=76;
    box(bx-7,by-7,774,774,'#26363a',6);
    for(let i=0;i<100;i++){
      const x=bx+(i%10)*size,y=by+Math.floor(i/10)*size,s=data.squares[i];
      ctx.fillStyle=s.background;ctx.fillRect(x,y,size,size);
      if(s.src)ctx.drawImage(images.get(s.src),x+size*.09,y+size*.05,size*.82,size*.9);
    }
    for(let i=0;i<10;i++){text(String(data.flipped?i+1:10-i),(data.flipped?i===9:i===0)?22:29,by+i*size+27,15,colors.muted);text(String.fromCharCode(97+(data.flipped?9-i:i)),bx+i*size+32,by+770,15,colors.muted);}
    box(844,99,724,808);box(863,117,686,38,'#426b5e',6);text(data.labels.overview,1148,126,17,colors.text,true);
    const lx=864,rx=1212;ctx.strokeStyle=colors.border;ctx.beginPath();ctx.moveTo(1194,174);ctx.lineTo(1194,888);ctx.stroke();
    text(data.summary,lx,177,18,colors.text,true,310);text(data.labels.remaining,lx,218,18,colors.text,true);
    for(let i=0;i<2;i++){const x=lx+i*162;box(x,252,151,81,'#111a22',7);text(data.labels.sides[i],x+12,264,15,colors.muted);text(data.times[i],x+12,289,27,colors.text,true);}
    text(data.labels.elapsed,lx,353,16,colors.muted);text(data.elapsed,lx+209,353,18,colors.text,true);
    text(data.labels.score,lx,410,18,colors.text,true);
    for(let i=0;i<2;i++){box(lx,445+i*60,313,49,'#111a22',7);text(data.labels.sides[i],lx+12,460+i*60,16,colors.muted);text(data.scores[i],lx+198,457+i*60,24,colors.text,true);}
    text(data.labels.captured,lx,590,18,colors.text,true);
    for(let i=0;i<2;i++){
      const y=628+i*116;text(data.labels.sides[i],lx,y,15,colors.muted);
      if(!data.captured[i].length)text('—',lx,y+30,18,colors.muted);
      data.captured[i].forEach((piece,n)=>ctx.drawImage(images.get(piece.src),lx+(n%10)*31,y+26+Math.floor(n/10)*36,28,33));
    }
    text(data.labels.history,rx,177,18,colors.text,true);
    const visible=data.history.slice(-27),offset=data.history.length-visible.length;
    if(offset)text('…',rx,208,16,colors.muted);
    visible.forEach((entry,i)=>text((offset+i+1)+'. '+entry,rx,234+i*24,14,colors.text,false,326));
    text('orthodoxist.github.io/symmetric_chess',864,876,13,colors.muted);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG export failed')),'image/png'));
  }
  function save(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  root.Chess10Share={capture,save};
})(globalThis);
