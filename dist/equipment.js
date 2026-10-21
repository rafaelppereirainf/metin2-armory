// Equipment editors retain older data while presenting slot-specific controls.
function elementKinds(){return {Fogo:{key:'fire',label:'do Fogo'},Gelo:{key:'ice',label:'do Gelo'},Vento:{key:'wind',label:'do Vento'},Terra:{key:'earth',label:'da Terra'},Raios:{key:'lightning',label:'dos Raios'},Trevas:{key:'dark',label:'das Trevas'}};}
function elementConfig(it){if(it?.elemental)return {...it.elemental};const line=String(it?.base||'').split('\n').find(l=>/^Poder\s/i.test(l)),m=line?.match(/Poder\s+(?:do|da|dos|das)\s+(Fogo|Gelo|Vento|Terra|Raios|Relâmpagos|Trevas)\s*:?\s*\+?(\d+(?:[.,]\d+)?)%/i),element=m?Object.keys(elementKinds()).find(k=>normalized(k)===normalized(m[1]))||(normalized(m[1])==='relampagos'?'Raios':''):'';return {element,power:m?m[2].replace(',','.'): '',attack:''};}
function elementalFields(it){const config=elementConfig(it);return `<div class="editor-section full"><h3>Encantamento elemental</h3><p>A percentagem e o ataque adicional são valores independentes. Introduz ambos como aparecem na arma.</p></div>`+selectPairs('weaponElement','Elemento',config.element||'',[['','Sem elemento'],...Object.keys(elementKinds()).map(n=>[n,n])])+field('weaponElementPower','Poder elemental (%)',config.power||'','number')+field('weaponElementAttack','Ataque adicional (entre parênteses)',config.attack||'','number')+hiddenField('elementInitial',JSON.stringify(config))+'<div id="elementalPreview" class="full"></div>';}
function saveElemental(v,it,old){const config={element:v.weaponElement||'',power:v.weaponElementPower||'',attack:v.weaponElementAttack||''};for(const k of ['power','attack'])if(config[k]&&(!Number.isInteger(Number(config[k]))||Number(config[k])<0))throw Error('Os valores elementais devem ser inteiros positivos.');if(config.element&&!elementKinds()[config.element])throw Error('Elemento inválido.');const initial=JSON.parse(v.elementInitial||'{}');if(JSON.stringify(config)===JSON.stringify(initial)&&it.base===(old?.base||''))return;it.elemental=config;it.base=String(it.base||'').split('\n').filter(l=>!/^Poder\s+(do|da|dos|das)\s+(Fogo|Gelo|Vento|Terra|Raios|Relâmpagos|Trevas)\s*:?\s*\+?\d/i.test(l)).join('\n');}
function elementalBase(it){return it.elemental?String(it.base||'').split('\n').filter(l=>!/^Poder\s+(do|da|dos|das)\s+(Fogo|Gelo|Vento|Terra|Raios|Relâmpagos|Trevas)\s*:?\s*\+?\d/i.test(l)).join('\n'):it.base||'';}
function elementalText(it){const e=it.elemental;if(!e?.element||!elementKinds()[e.element])return '';return ['Poder '+elementKinds()[e.element].label+': '+Number(e.power||0)+'%',Number(e.attack)>0?'Valor de Ataque: +'+Number(e.attack):''].filter(Boolean).join('\n');}
function bonusMarkup(text){return String(text||'').split('\n').map(l=>{const n=normalized(l);let e;if(/^poder /i.test(l))e=Object.entries(elementKinds()).find(([name])=>n.includes(normalized(name))||(name==='Raios'&&n.includes('relampagos')))?.[1];return e?`<span class="element-bonus element-${e.key}">${esc(l)}</span>`:esc(l);}).join('\n');}
function updateElementalPreview(){const box=$('#elementalPreview');if(!box||!$('#modal').open)return;const v=Object.fromEntries(new FormData($('#form'))),e=elementKinds()[v.weaponElement];box.innerHTML=e?`<div class="element-bonus element-${e.key}">Poder ${esc(e.label)}: +${esc(v.weaponElementPower||0)}% · Ataque (+${esc(v.weaponElementAttack||0)})</div>`:'';}
function syncAbsorptionMode(){if(!$('#modal').open)return;const mode=$('[name="absorptionMode"]');if(!mode)return;const auto=mode.value==='Automático';const manual=$('#absManualFields'),source=$('#absAutoFields');if(manual)manual.hidden=auto;if(source)source.hidden=!auto;}
function mountEntry(it){return window.MOUNT_CATALOG?.[it?.mountId];}
function mountBonuses(it){return mountEntry(it)?.bonuses||it?.bonuses||'';}
function editMount(options={}){const old=item(options.inventory?options.id:set().items.mount);open('Montada',selectPairs('existing','Usar montada do inventário','',[['','Editar / nova montada'],...data.items.filter(i=>i.slot==='mount'&&ownsInventoryItem(i.id)).map(i=>[i.id,i.name])],true)+selectPairs('mountId','Montada',old?.mountId||'',[['','Escolher montada'],...Object.entries(window.MOUNT_CATALOG).sort((a,b)=>a[1].label.localeCompare(b[1].label,'pt')).map(([id,e])=>[id,e.label])],true)+selectPairs('mounted','Calcular status enquanto montado',old?.mounted?'yes':'no',[['no','Não · a pé'],['yes','Sim · montado']])+`<div class="fixed-preview full" id="mountPreview"></div><p class="hint full">Os bónus entram apenas quando a opção Montado está ativa. Os mínimos de atributos usam o nível do cavalo em Skills e Treino.</p>`+field('notes','Notas',old?.notes||'','textarea'),v=>{if(v.existing){if(!data.items.some(i=>i.id===v.existing&&i.slot==='mount'))throw Error('Montada inválida.');if(options.inventory)addInventoryReference(v.existing,options.position);else equipInventoryItem(v.existing,'mount');return;}const entry=window.MOUNT_CATALOG[v.mountId];if(!entry)throw Error('Escolhe uma montada.');const it={...(old||{id:uid(),slot:'mount'}),name:entry.label,mountId:v.mountId,mounted:v.mounted==='yes',notes:v.notes};if(old)Object.assign(old,it);else data.items.push(it);addInventoryReference(it.id,options.position);if(!options.inventory)set().items.mount=it.id;},old&&options.inventory?()=>deleteInventoryItem(old.id):null);$('#form').dataset.inventoryEditor=String(!!options.inventory);updateMountPreview();}
function updateMountPreview(){const box=$('#mountPreview');if(!box||!$('#modal').open)return;const entry=window.MOUNT_CATALOG[$('[name="mountId"]')?.value];box.innerHTML=entry?`${entry.image?`<img class="game-icon" src="${esc(entry.image)}" alt="">`:''}<strong>${esc(entry.label)}</strong><pre>${bonusMarkup(entry.bonuses)}</pre><a href="${esc(entry.source)}" target="_blank" rel="noopener">Ver montada na wiki ↗</a>`:'Escolhe uma montada para ver os bónus.';}
document.addEventListener('change',e=>{if(e.target.name==='mountId')updateMountPreview();});
// A weapon's absorbed base range participates in the weapon formula; elemental
// enchantment attack and rolled attack bonuses remain flat additions.
function absorbedStatusParts(it){const weapon=[0,0],lines=[];for(const line of String(it.absorbed||'').split('\n')){const m=it.slot==='sash'&&line.match(/^Valor de Ataque\s*:?\s*(\d+)\s*[-–]\s*(\d+)(?:\s*\(\+(\d+)\))?\s*$/i);if(m){weapon[0]+=Number(m[1]);weapon[1]+=Number(m[2]);if(m[3])lines.push('Valor de Ataque: '+m[3]);}else lines.push(line);}return {weapon,text:lines.filter(Boolean).join('\n')};}

function sungTalismanKind(it){
 if(it?.slot!=='talisman')return '';
 const name=normalized(catalogue()[it.catalogId]?.label||it.name);
 const match=name.match(/talisma da vontade (int|frc|vit|res)/);
 return match?.[1]||(/talisma misterioso/.test(name)?'any':'');
}
function sungTalismanRanges(upgrade){
 const n=Number(String(upgrade||'+0').replace('+',''));
 const sung=[[1,2],[1,3],[3,4],[5,6],[7,8],[9,10],[11,13],[14,16],[17,19],[21,24]];
 const power=[[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[15,17]];
 return sung[n]?{sung:sung[n],power:power[n]}:null;
}
function normalizeSungTalisman(it){
 const kind=sungEquipmentKind(it);if(!kind)return;
 // Only migrate explicit full-line values in notes, never prose or guessed maxima.
 if(!it.sungMa){const line=String(it.notes||'').split('\n').map(l=>l.trim()).find(l=>/^(?:\d+\s+Vontade de Sung Ma|Vontade de Sung Ma)/i.test(l));
  const m=line?.match(/^(?:(\d+)\s+)?Vontade de Sung Ma\s*\((FRÇ|FRC|VIT|INT|RES)\)\s*(?::?\s*\+?(\d+))?$/i);
  if(m&&(m[1]||m[3])){const attribute=normalized(m[2]);if(kind==='any'||kind===attribute)it.sungMa={attribute,value:Number(m[1]||m[3])};}
 }
 if(it.slot==='talisman'&&!it.elemental){const m=String(it.notes||'').split('\n').map(l=>l.trim()).map(l=>l.match(/^Poder\s+(?:do|da|dos|das)\s+(Fogo|Gelo|Vento|Terra|Raios|Relâmpagos|Trevas)\s*:?\s*\+?(\d+)\s*%$/i)).find(Boolean);
  if(m){const element=Object.keys(elementKinds()).find(e=>normalized(e)===normalized(m[1]))||(normalized(m[1])==='relampagos'?'Raios':'');if(element)it.elemental={element,power:Number(m[2]),attack:''};}
 }
}
function sungTalismanText(it){
 const kind=sungEquipmentKind(it),s=it?.sungMa;if(!kind||!s)return '';
 if(s.value===''||s.value===undefined||s.value===null)return '';const attribute=String(s.attribute||'').toLowerCase(),value=Number(s.value);
 if(!['frc','vit','int','res'].includes(attribute)||kind!=='any'&&kind!==attribute||!Number.isInteger(value)||value<0)return '';
 return 'Vontade de Sung Ma ('+(attribute==='frc'?'FRÇ':attribute.toUpperCase())+'): +'+value;
}
function sungTalismanFields(it){
 const kind=sungTalismanKind(it);if(!kind)return '<p class="hint full">O poder dos talismãs elementais normais é obtido da tabela de melhoramento.</p>';
 const e=elementConfig(it),s=it.sungMa||{},range=sungTalismanRanges(it.upgrade),fixed=kind==='any'?'':kind;
 return `<div class="editor-section full"><h3>Atributos adicionais · talismã Sung Ma</h3><p>Introduz os valores do teu item. Variam mesmo entre talismãs com o mesmo melhoramento e não ocupam os cinco bónus normais.</p></div>`
 +selectPairs('sungMaAttribute','Vontade de Sung Ma',fixed||s.attribute||'',[['','Por preencher'],...['frc','vit','int','res'].filter(k=>!fixed||k===fixed).map(k=>[k,k==='frc'?'FRÇ':k.toUpperCase()])])
 +field('sungMaValue','Valor Sung Ma'+(range&&kind!=='any'?' · '+range.sung.join('–'):''),s.value??'','number')
 +selectPairs('talismanElement','Elemento',e.element||'',[['','Por preencher'],...Object.keys(elementKinds()).map(k=>[k,k])])
 +field('talismanPower','Poder elemental (%)'+(range&&kind!=='any'?' · '+range.power.join('–'):''),e.power??'','number')
 +'<p class="hint full">O poder elemental entra no dano PvM. Sung Ma é separado de INT/VIT/FRÇ/DES normais; as penalizações de dano de Yohara ainda não são simuladas.</p>';
}
function syncTalismanFields(){
 const box=$('#talismanFields');if(!box)return;
 const v=Object.fromEntries(new FormData($('#form'))),it={slot:'talisman',catalogId:v.catalogId,name:v.name,upgrade:v.upgrade,sungMa:{attribute:v.sungMaAttribute,value:v.sungMaValue},elemental:{element:v.talismanElement,power:v.talismanPower}};
 box.innerHTML=sungTalismanFields(it);
}
function saveSungTalisman(v,it,old){
 const kind=sungTalismanKind(it);if(!kind){if(sungTalismanKind(old)){delete it.sungMa;delete it.elemental;}return;}
 const attribute=v.sungMaAttribute||'',value=v.sungMaValue??'',element=v.talismanElement||'',power=v.talismanPower??'',range=sungTalismanRanges(it.upgrade);
 if(attribute&&(!['frc','vit','int','res'].includes(attribute)||kind!=='any'&&attribute!==kind))throw Error('A vontade Sung Ma não corresponde a este talismã.');
 for(const [n,label,bounds]of [[value,'Sung Ma',range?.sung],[power,'Poder elemental',range?.power]])if(n!==''&&(!Number.isInteger(Number(n))||Number(n)<0||Number(n)>200||kind!=='any'&&bounds&&(Number(n)<bounds[0]||Number(n)>bounds[1])))throw Error(label+' inválido para este melhoramento'+(bounds?' ('+bounds.join('–')+')':'.'));
 if(element&&!elementKinds()[element])throw Error('Elemento inválido.');
 if(power!==''&&!element)throw Error('Seleciona o elemento do talismã.');
 it.sungMa={attribute:kind==='any'?attribute:kind,value:value===''?'':Number(value)};
 it.elemental={element,power:power===''?'':Number(power),attack:''};
}

// Additional glove attributes are variable rolls, independent of the five normal bonuses.
function sungGloveKind(it){
 if(it?.slot!=='gloves')return '';
 const n=normalized(catalogue()[it.catalogId]?.label||it.name);
 return n.match(/luvas serpente \(?\s*(frc|vit|int|res)\s*\)?/)?.[1]||({'luvas do poder':'frc','luvas da armadura':'vit','luvas da rapidez':'res','luvas da protecao':'int'}[n])||'';
}
function sungEquipmentKind(it){return sungTalismanKind(it)||sungGloveKind(it);}
function sungGloveRange(it){
 const n=Number(String(it.upgrade||'+0').replace('+','')),serpent=normalized(catalogue()[it.catalogId]?.label||it.name).includes('serpente');
 if(serpent){const text=catalogue()[it.catalogId]?.upgrades?.[n]||'',m=text.match(/Vontade de Sung Ma[^:]*:\s*(\d+)\s*~\s*(\d+)/);if(m)return [+m[1],+m[2]];}return (serpent?[[6,9],[10,13],[14,19],[19,25],[24,31],[30,38],[36,44],[42,50],[49,58],[69,78]]:[[3,7],[5,11],[9,17],[14,22],[19,28],[24,34],[29,40],[34,46],[39,52],[58,63]])[n];
}
function sungGloveFields(it){
 const kind=sungGloveKind(it);if(!kind)return '<p class="hint full">Seleciona uma luva do catálogo para indicar o seu atributo Sung Ma.</p>';
 const bounds=sungGloveRange(it),value=it.sungMa?.attribute===kind?it.sungMa.value:'';
 return `<div class="editor-section full"><h3>Atributo adicional · luva</h3><p>Este valor varia entre luvas do mesmo melhoramento e não ocupa um bónus normal.</p></div>`+hiddenField('sungMaAttribute',kind)+field('sungMaValue','Vontade de Sung Ma ('+(kind==='frc'?'FRÇ':kind.toUpperCase())+')'+(bounds?' · '+bounds.join('–'):''),value??'','number')+'<p class="hint full">Sung Ma é separado dos atributos normais. As penalizações de Yohara ainda não são simuladas.</p>';
}
function syncGloveFields(){
 const box=$('#gloveFields');if(!box)return;const v=Object.fromEntries(new FormData($('#form')));box.innerHTML=sungGloveFields({slot:'gloves',catalogId:v.catalogId,name:v.name,upgrade:v.upgrade,sungMa:{attribute:v.sungMaAttribute,value:v.sungMaValue}});
}
function saveSungGlove(v,it){
 const kind=sungGloveKind(it);if(!kind){delete it.sungMa;return;}
 const value=v.sungMaValue??'',bounds=sungGloveRange(it);
 if(value!==''&&(!Number.isInteger(Number(value))||!bounds||Number(value)!==0&&(Number(value)<bounds[0]||Number(value)>bounds[1])))throw Error('Valor Sung Ma inválido para esta luva'+(bounds?' ('+bounds.join('–')+')':'.'));
 it.sungMa={attribute:kind,value:value===''?'':Number(value)};
}

// Variable inherent attributes are stored separately from the five normal rolls.
function yoharaKind(it){const n=normalized(catalogue()[it?.catalogId]?.label||it?.name);if(/jadite/.test(n)&&['earrings','necklace','bracelet'].includes(it?.slot))return 'jadite';if(/serpente/.test(n)&&['weapon','armor','helmet','gloves'].includes(it?.slot))return 'serpent';if(/luar/.test(n)&&['weapon','shoes'].includes(it?.slot))return 'lunar';if(n.includes('condenacao')&&it?.slot==='shield')return 'shield';if(n.includes('titanio')&&it?.slot==='belt')return 'belt';return '';}
function yoharaSchema(it){const kind=yoharaKind(it);if(!kind)return [];if(kind==='jadite'){const n=normalized(catalogue()[it.catalogId]?.label||it.name),attribute=n.includes('fumo')?'FRÇ':n.includes('sol')?'INT':n.includes('negra')?'VIT':'RES',u=Number(String(it.upgrade||'+0').replace('+','')),precision=[[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,10],[9,11],[10,14]][u],sung=[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14],[15,17],[18,20],[21,24]][u];return [{key:'precision',label:'Precisão',bounds:precision},{key:'sung',label:'Vontade de Sung Ma ('+attribute+')',bounds:sung}];}
 const out=it.slot==='weapon'?[{key:'attack',label:'Valor de Ataque',range:true},{key:'magicAttack',label:'Valor de Ataque Mágico',range:true}]:[{key:'defense',label:'Defesa'}];if(it.slot==='helmet')out.push({key:'meleeMagic',label:'Ataque Mágico/Corpo-a-Corpo',unit:'%'});if(it.slot==='shoes')out.push({key:'monster',label:'Forte contra Monstros',unit:'%'});return out;}
function yoharaRollGroups(it){if(!yoharaKind(it)||yoharaKind(it)==='jadite'||it.slot==='gloves')return [];const sung=['Vontade de Sung Ma (FRÇ)','Vontade de Sung Ma (VIT)','Vontade de Sung Ma (RES)','Vontade de Sung Ma (INT)'];if(it.slot==='belt')return [['Máx. VD','Máx. MN','Probabilidade de Yang a Dobrar','Probabilidade de EXP Bónus','Forte contra Monstros',...['Guerreiro','Sura','Ninja','Xamã','Lycan'].map(c=>'Resistência a '+c)]];if(it.slot==='shield')return [['Resistência a Dano Médio','Resistência contra Dano de Habilidades','Probabilidade de bloquear ataques físicos','Probabilidade de reflectir ataques físicos','Probabilidade de evitar Flechas',...['Espadas','Duas Mãos','Punhais','Flechas','Campainhas','Leques','Garras'].map(c=>'Defesa contra '+c)]];if(it.slot==='shoes')return [[...['Fogo','Vento','Relâmpagos','Gelo','Terra','Trevas'].map(e=>'Resistência '+e),'Precisão','Resistência contra Dano de Habilidades','Probabilidade de EXP Bónus','Máx. Resistência','Rapidez de Movimento','Rapidez de Feitiço','Resistência a Envenenamento']];if(it.slot==='armor')return [['Resistência a Ataque de Sangramento','Resistência a Envenenamento','Probabilidade de restaurar VD','Resistência contra Dano de Habilidades','Resistência a Queda','Máx. VD','Resistência a Dano Médio'],sung,['Rapidez de Movimento','Forte contra Monstros','Resistência a Magias','Danos serão absorvidos pela VD','Danos serão absorvidos pelo MN','Resistência a ataques de monstros']];if(it.slot==='weapon')return [['Dano Médio',...(yoharaKind(it)==='lunar'?['Forte contra Dragões']:[]),'Forte contra Animais','Forte contra Orcs','Forte contra Esotéricos','Forte contra Mortos-Vivos','Forte contra Demónios','Forte contra Semi-Humanos'],['Rapidez de Ataque',...(yoharaKind(it)==='lunar'?['Forte contra Monstros da Sombra Lunar']:[]),'Forte contra Insetos','Forte contra Monstros do Zodíaco','Forte contra Monstros',...sung],['Forte contra Metins','Dano de Habilidade','Forte contra Monstros do Deserto','Rapidez de Feitiço','Precisão','Probabilidade de roubar MN','Probabilidade de perda de sentidos','Probabilidade de abrandamento','Probabilidade de bónus de EXP']];return [[...sung,'Precisão','Resistência a Magias','Resistência a ataques de monstros','Probabilidade de bloquear ataques físicos','Probabilidade de evitar Flechas']];}
function yoharaPercent(label){return !/Sung Ma|Precisão|Máx. VD|Máx. MN|Máx. Resistência/.test(label);}
function yoharaRead(v,it,validate=false){const schema=yoharaSchema(it);if(!schema.length)return null;const out={catalogId:it.catalogId,values:{},rolls:[]};const number=(value,label,bounds)=>{if(value===''||value===undefined)return '';const n=Number(value);if(validate&&(!Number.isInteger(n)||n<0||n>100000||bounds&&n!==0&&(n<bounds[0]||n>bounds[1])))throw Error(label+' inválido'+(bounds?' · valores '+bounds.join('–')+' (ou 0 se ausente)':''));return n;};for(const f of schema){const value=number(v['yohara_'+f.key],f.label,f.bounds),max=f.range?number(v['yohara_'+f.key+'_max'],f.label):undefined;if(validate&&f.range&&((value==='')!==(max==='')||value!==''&&max<value))throw Error('Preenche os dois extremos do ataque, por ordem crescente.');out.values[f.key]={value,...(f.range?{max}:{})};}yoharaRollGroups(it).forEach((group,i)=>{const label=v['yoharaRoll'+i]||'',value=number(v['yoharaRollValue'+i],label);if(validate&&label&&!group.includes(label))throw Error('Bónus adicional incompatível com este grupo.');if(validate&&label&&value==='')throw Error('Indica o valor do bónus adicional.');out.rolls[i]={label,value};});return out;}
function yoharaFields(it){const schema=yoharaSchema(it);if(!schema.length)return '';const saved=it.yohara?.catalogId===it.catalogId?it.yohara:{},values=saved.values||{};return '<div class="editor-section full"><h3>Atributos variáveis · Yohara</h3><p>Copia os valores do item. São independentes dos cinco bónus normais e do 6.º/7.º. Em branco significa por confirmar; 0 significa ausente. Alterar o melhoramento não escolhe automaticamente novos valores.</p></div>'+schema.map(f=>field('yohara_'+f.key,f.label+(f.range?' · mínimo':'')+(f.bounds?' · '+f.bounds.join('–'):''),values[f.key]?.value??'','number')+(f.range?field('yohara_'+f.key+'_max',f.label+' · máximo',values[f.key]?.max??'','number'):'')).join('')+yoharaRollGroups(it).map((group,i)=>selectPairs('yoharaRoll'+i,'Bónus adicional · grupo '+(i+1),saved.rolls?.[i]?.label||'',[['','Ausente / por preencher'],...group.map(label=>[label,label])])+field('yoharaRollValue'+i,'Valor'+(saved.rolls?.[i]?.label&&yoharaPercent(saved.rolls[i].label)?' (%)':''),saved.rolls?.[i]?.value??'','number')).join('')+(yoharaKind(it)!=='jadite'?'<p class="hint full">Valores transcritos do jogo: as variantes deste equipamento não têm aqui validação de valores por versão. As penalizações de Yohara não são simuladas.</p>':'');}
function syncYoharaFields(reset=false){const box=$('#yoharaFields');if(!box)return;const v=Object.fromEntries(new FormData($('#form'))),it={slot:$('#form').dataset.slot||modalSlot(),catalogId:v.catalogId,name:v.name,upgrade:v.upgrade};if(!reset)it.yohara=yoharaRead(v,it);box.innerHTML=yoharaFields(it);}
function yoharaText(it){if(!yoharaKind(it))return '';const schema=yoharaSchema(it),saved=it.yohara?.catalogId===it.catalogId?it.yohara:null;return schema.map(f=>{const v=saved?.values?.[f.key];return v&&v.value!==''&&v.value!==undefined?f.label+': '+(f.range?v.value+'–'+v.max:'+'+v.value)+(f.unit||''):f.label+': por confirmar';}).concat((saved?.rolls||[]).filter(r=>r?.label&&r.value!=='').map(r=>r.label+': +'+r.value+(yoharaPercent(r.label)?'%':''))).join('\n');}
