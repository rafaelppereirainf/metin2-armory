(()=>{const key=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+]/g,'');
 for(const [id,e] of Object.entries(window.COSMETIC_LIBRARY)){const old=Object.values(window.ITEM_CATALOG).find(x=>x.slot===e.slot&&key(x.label)===key(e.label));if(old)Object.assign(old,{collections:e.collections,image:e.image||old.image,source:e.source||old.source});else window.ITEM_CATALOG[id]=e;}
 for(const e of window.COMPANION_LIBRARY){const old=window.COMPANION_PETS.find(x=>key(x.name)===key(e.name));if(old)Object.assign(old,{...e,id:old.id,image:old.image||e.image});else window.COMPANION_PETS.push(e);}
 window.COMPANION_PETS.sort((a,b)=>a.name.localeCompare(b.name,'pt'));
 Object.assign(window.EFFECT_LABELS,{itemDouble:'Itens a dobrar',yangDouble:'Yang a dobrar',hpRegen:'Regeneração de VD',castingSpeed:'Rapidez de feitiço',movement:'Rapidez de movimento',stun:'Perda de sentidos',defenseValuePct:'Defesa',magicAttackFlat:'Valor de ataque mágico',precision:'Precisão'});
})();
