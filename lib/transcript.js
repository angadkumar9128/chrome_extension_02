(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MeetNotebookTranscript=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean);
  const norm=s=>String(s||'').toLocaleLowerCase().normalize('NFKC').replace(/[\p{P}\p{S}]/gu,'');
  const tokens=s=>words(s).map(norm);
  function collapseRepeatedSequences(input){
    const out=input.slice();
    let changed=true;
    while(changed){
      changed=false;
      for(let size=Math.floor(out.length/2);size>=4;size--){
        let found=false;
        for(let i=0;i+size*2<=out.length;i++){
          let same=true;
          for(let j=0;j<size;j++)if(out[i+j]!==out[i+size+j]){same=false;break;}
          if(same){out.splice(i+size,size);changed=true;found=true;break;}
        }
        if(found)break;
      }
    }
    return out;
  }
  function mergeRollingText(oldText,newText){
    const a=words(oldText),b=words(newText);
    if(!a.length)return collapseRepeatedSequences(b.map((_,i)=>i)).map(i=>b[i]).join(' ');
    if(!b.length)return a.join(' ');
    const an=tokens(oldText),bn=tokens(newText);
    const clean=s=>collapseRepeatedSequences(tokens(s));
    const same=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);
    const contains=(haystack,needle)=>{
      if(needle.length>haystack.length)return false;
      for(let i=0;i<=haystack.length-needle.length;i++)if(needle.every((v,j)=>v===haystack[i+j]))return true;
      return false;
    };
    if(same(an,bn))return a.join(' ');
    if(contains(an,bn))return a.join(' ');
    if(contains(bn,an))return b.join(' ');
    let overlap=0;
    for(let k=Math.min(an.length,bn.length);k>=1;k--){
      if(an.slice(-k).every((v,i)=>v===bn[i])){overlap=k;break;}
    }
    if(overlap){
      const merged=a.concat(b.slice(overlap));
      const normalized=clean(merged.join(' '));
      return normalized.join(' ')===tokens(merged.join(' ')).join(' ') ? merged.join(' ') : merged.join(' ');
    }
    let prefix=0;
    while(prefix<an.length&&prefix<bn.length&&an[prefix]===bn[prefix])prefix++;
    const minLength=Math.min(an.length,bn.length);
    if(prefix>=2&&prefix>=Math.ceil(minLength*.55))return a.slice(0,prefix).concat(b.slice(prefix)).join(' ');
    const combined=a.concat(b);
    const normalized=clean(combined.join(' '));
    if(normalized.length<tokens(combined.join(' ')).length)return combined.join(' ');
    return combined.join(' ');
  }
  function buildTurns(entries,configuredName){
    const turns=[];
    for(const e of entries||[]){
      let name=String(e&&e.speaker||'').trim();
      if(/^you$/i.test(name))name=configuredName||'You';
      const text=String(e&&e.text||'').replace(/\s+/g,' ').trim();
      if(!name||!text)continue;
      const last=turns[turns.length-1];
      if(last&&last.name.toLowerCase()===name.toLowerCase())last.text=mergeRollingText(last.text,text);
      else turns.push({name,text,t:Math.max(0,Number(e.t)||0)});
    }
    return turns;
  }
  function formatPlainText(entries,configuredName){
    const turns=buildTurns(entries,configuredName);
    const clean=value=>String(value||'').replace(/\r\n?/g,' ').replace(/[ \t]+/g,' ').replace(/\s+/g,' ').trim();
    return turns.map(turn=>clean(turn.name)+' - '+clean(turn.text)).join('\n\n')+'\n';
  }
  return {mergeRollingText,buildTurns,formatPlainText};
});
