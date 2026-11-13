(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MeetNotebookTranscript=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const words=s=>String(s||'').trim().split(/\\s+/).filter(Boolean);
  const norm=s=>String(s||'').toLocaleLowerCase().normalize('NFKC').replace(/[\\p{P}\\p{S}]/gu,'');
  const tokens=s=>words(s).map(norm);
  const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  const startsWith=(a,b)=>b.length<=a.length&&b.every((v,i)=>a[i]===v);
  function mergeRollingText(oldText,newText){
    const a=words(oldText),b=words(newText);
    if(!a.length)return b.join(' ');
    if(!b.length)return a.join(' ');
    const an=a.map(norm),bn=b.map(norm);
    if(same(an,bn))return b.join(' ');
    // Meet frequently replaces a growing caption with a newer full snapshot.
    // Only treat a true prefix relationship as a snapshot update; arbitrary
    // containment can erase a participant repeating an earlier phrase.
    if(startsWith(bn,an))return b.join(' ');
    if(startsWith(an,bn))return a.join(' ');
    // Handle a rolling window that starts part-way through the previous text.
    // Require at least two matching words: a one-word match is too ambiguous.
    let overlap=0;
    for(let k=Math.min(an.length,bn.length);k>=2;k--){
      let match=true;
      for(let i=0;i<k;i++)if(an[an.length-k+i]!==bn[i]){match=false;break;}
      if(match){overlap=k;break;}
    }
    if(overlap)return a.slice(0,a.length-overlap).concat(b).join(' ');
    // Same-length snapshots with a nearly identical beginning are usually
    // speech-recognition corrections, not a second utterance.
    if(an.length===bn.length&&an.length>=4){
      let prefix=0;
      while(prefix<an.length&&an[prefix]===bn[prefix])prefix++;
      if(prefix>=Math.ceil(an.length*.8))return b.join(' ');
    }
    return a.concat(b).join(' ');
  }
  function buildTurns(entries,configuredName){
    const turns=[];
    for(const e of entries||[]){
      let name=String(e&&e.speaker||'').trim();
      if(/^you$/i.test(name))name=configuredName||'You';
      const text=String(e&&e.text||'').replace(/\\s+/g,' ').trim();
      if(!name||!text)continue;
      const last=turns[turns.length-1];
      if(last&&last.name.toLowerCase()===name.toLowerCase())last.text=mergeRollingText(last.text,text);
      else turns.push({name,text,t:Math.max(0,Number(e.t)||0)});
    }
    return turns;
  }
  function formatPlainText(entries,configuredName){
    const turns=buildTurns(entries,configuredName);
    const clean=value=>String(value||'').replace(/\\r\\n?/g,' ').replace(/[ \\t]+/g,' ').replace(/\\s+/g,' ').trim();
    return turns.map(turn=>clean(turn.name)+' - '+clean(turn.text)).join('\\n\\n')+'\\n';
  }
  return {mergeRollingText,buildTurns,formatPlainText};
});
