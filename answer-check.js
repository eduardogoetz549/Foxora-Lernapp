window.FRAnswers={check:(value,answer,accepted=[])=>{const norm=s=>String(s).normalize('NFC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');return [answer,...accepted].some(a=>norm(value)===norm(a));}};

FRAnswers.normalize=v=>String(v??'').normalize('NFC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
