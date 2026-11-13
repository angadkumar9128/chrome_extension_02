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
      const keys=out.map(norm),n=keys.length;
      if(n<8)break;
      const hashes=keys.map(key=>{let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return h>>>0;});
      const prefix=new Array(n+1).fill(0),powers=new Array(Math.min(64,Math.floor(n/2))+1).fill(1);
      for(let i=0;i<n;i++)prefix[i+1]=(Math.imul(prefix[i],16777619)+hashes[i])>>>0;
      for(let i=1;i<powers.length;i++)powers[i]=Math.imul(powers[i-1],16777619)>>>0;
      const rangeHash=(from,length)=>(prefix[from+length]-Math.imul(prefix[from],powers[length]))>>>0;
      outer:for(let size=powers.length-1;size>=4;size--){
        for(let i=0;i+size*2<=n;i++){
          if(rangeHash(i,size)!==rangeHash(i+size,size))continue;
          let same=true;
          for(let j=0;j<size;j++)if(keys[i+j]!==keys[i+size+j]){same=false;break;}
          if(same){out.splice(i+size,size);changed=true;break outer;}
        }
      }
    }
    return out;
  }
  function mergeRollingText(oldText,newText){
    const a=words(oldText),b=words(newText);
    const finish=value=>collapseRepeatedSequences(value).join(' ');
    if(!a.length)return finish(b);
    if(!b.length)return finish(a);
    const an=a.map(norm),bn=b.map(norm);
    const same=(x,y)=>x.length===y.length&&x.every((v,i)=>v===y[i]);
    const contains=(haystack,needle)=>{
      if(needle.length>haystack.length)return false;
      for(let i=0;i<=haystack.length-needle.length;i++)if(needle.every((v,j)=>v===haystack[i+j]))return true;
      return false;
    };
    if(same(an,bn))return finish(a);
    if(contains(an,bn))return finish(a);
    if(contains(bn,an))return finish(b);
    let overlap=0;
    for(let k=Math.min(an.length,bn.length);k>=1;k--){
      if(an.slice(-k).every((v,i)=>v===bn[i])){overlap=k;break;}
    }
    if(overlap)return finish(a.slice(0,a.length-overlap).concat(b));
    let prefix=0;
    while(prefix<an.length&&prefix<bn.length&&an[prefix]===bn[prefix])prefix++;
    const minLength=Math.min(an.length,bn.length);
    if(prefix>=2&&prefix>=Math.ceil(minLength*.55))return finish(a.slice(0,prefix).concat(b.slice(prefix)));
    return finish(a.concat(b));
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
