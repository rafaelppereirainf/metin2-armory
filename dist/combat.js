// Golpes físicos PvM a pé e montado, fórmulas da wiki FR. Nunca usa o ataque do painel como dano.
const COMBAT_SOURCES={damage:'https://fr-wiki.metin2.gameforge.com/index.php/D%C3%A9g%C3%A2ts',attack:"https://fr-wiki.metin2.gameforge.com/index.php/Valeur_d%27attaque",weapon:"https://fr-wiki.metin2.gameforge.com/index.php/Valeur_d%27attaque_(armes)",pierce:'https://fr-wiki.metin2.gameforge.com/index.php/Coup_per%C3%A7ant_(effet)',element:"https://fr-wiki.metin2.gameforge.com/index.php/Syst%C3%A8me_d%27%C3%A9l%C3%A9ments"};
function combatRange(it){const a=statusAccumulator();parseStatusText(fixedAttributes(it).text,a,'Arma',[],[]);return [a.attack,a.attackMax];}
const COMBAT_WEAPONS={fist:'Punhos',sword:'Espada',twoHand:'Duas mãos',dagger:'Adagas',bell:'Sino',fan:'Leque',arrow:'Arco',claw:'Garras'};
function combatWeaponKind(c,s){
 const chosen=s.combatTarget?.weaponKind;if(COMBAT_WEAPONS[chosen])return chosen;
 const it=item(s.items.weapon);if(!it)return 'fist';const name=normalized(it.name);
 if(/arco/.test(name))return 'arrow';if(/adaga|punhal|faca/.test(name))return 'dagger';if(/sino/.test(name))return 'bell';if(/leque/.test(name))return 'fan';if(/garra/.test(name))return 'claw';if(/glaive|partisan|alabarda|duas maos|lamina/.test(name)&&c.class==='Guerreiro')return 'twoHand';return 'sword';
}
function combatMountState(c,s){
 const choice=s.combatMount??'__set',original=item(s.items.mount);
 if(choice==='foot')return {mount:null,label:'A pé'};
 if(choice==='__set')return {mount:original?.mounted?original:null,label:original?.mounted?original.name:'A pé'};
 const entry=window.MOUNT_CATALOG[choice];return entry?{mount:{id:'combat-mount',slot:'mount',mountId:choice,name:entry.label,mounted:true},label:entry.label}:{mount:null,label:'Montada desconhecida',error:'A montada selecionada não existe no catálogo.'};
}
function resolvedCombatTarget(c,s){
 const target={...s.combatTarget},preset=window.COMBAT_TARGETS.find(e=>e.id===target.preset);
 if(!preset){for(const key of ['preset','source','notes','dataSource','mountAllowed','elementPowers','elementResists'])delete target[key];}
 if(preset&&!target.weaponResistManual)target.weaponResist=preset.weaponResists[combatWeaponKind(c,s)];
 if(preset&&!target.elementResistManual)target.elementResist=preset.elementResists[target.element]||0;
 if(preset){target.elementPowers=preset.elementPowers;target.elementResists={...preset.elementResists,[target.element]:Number(target.elementResist)};target.mountAllowed=preset.mountAllowed;target.source=preset.source;target.notes=preset.notes;}
 return target;
}
function combatInputs(c,s){
 const riding=combatMountState(c,s),horseLevel=s.combatHorseLevel??c.progress?.horse;
 c={...c,progress:{...c.progress,horse:horseLevel}};
 const calc=calculateStatus(c,s,{mountOverride:riding.mount}),issues=[],notes=[],t={...calc.totals},it=item(s.items.weapon),a=calc.attributes;
 if(calc.totals.attack!==calc.totals.attackMax)issues.push('Ataque fixo com intervalo: decomposição ainda não suportada.');
 if(!a)issues.push('Configura os atributos base da personagem.');
 if(!it)issues.push('Equipa uma arma para simular.');
 const id=it?.catalogId|| (it?catalogueId(it):''),entry=catalogue()[id];
 let zero=[0,0],current=[0,0],upgrade=0;
 if(it){
  if(it.fixedMode==='Manual'||!entry?.upgrades?.['0'])issues.push('A arma precisa de uma tabela automática com os valores em +0.');
  else{zero=combatRange({...it,upgrade:'+0',fixedManual:''});current=combatRange({...it,fixedManual:''});const d0=current[0]-zero[0],d1=current[1]-zero[1];upgrade=d0;if(!zero[0]||d0!==d1||d0<0)issues.push('Esta arma tem uma progressão especial ainda não modelada.');}
  const name=normalized(it.name);if(/batalha|tritao|dragao (?:negro|escuro)|cianite|kyanite|sem alma|demonia|presa fantasma|leao|ave celeste|passaro celestial|trovao/.test(name))issues.push('Esta arma está entre as exceções à fórmula comum; cálculo ainda não validado.');
  if(it.fixedManual?.trim())issues.push('Atributos fixos manuais da arma: confirma a sua decomposição antes de simular.');
  if(it.slot==='weapon'&&/arco/.test(name))issues.push('Ataques de arco ainda não modelados.');
 }
 if(riding.error)issues.push(riding.error);if(riding.mount&&(!Number.isInteger(Number(horseLevel))||Number(horseLevel)<1||Number(horseLevel)>40))issues.push('Seleciona um nível de cavalo entre 1 e 40 para calcular o combate montado.');
 const sash=item(s.items.sash),sashRange=sash?absorbedStatusParts(effectiveAbsorption(sash)).weapon:[0,0];
 if(sashRange.some(n=>!Number.isFinite(n)||n<0))issues.push('Confirma o ataque absorvido pela faixa.');
 if(!['Guerreiro','Sura','Ninja','Xamã'].includes(c.class))issues.push('Fórmula física desta classe ainda não verificada.');
 let stat=0;if(a)stat=c.class==='Ninja'?Math.floor((a.str+7*a.dex)/4):c.class==='Xamã'?Math.floor((5*a.int+a.dex)/3):2*a.str;
 let horseAttack=0;if(riding.mount&&a){stat=Math.max(stat,2*a.str);const divisor=c.class==='Sura'&&/arm|weapon/.test(normalized(c.doctrine||''))?60:30;horseAttack=Math.floor((stat+2*Number(c.level))*Number(horseLevel)/divisor);}
 if(s.statusEffects?.petActive){for(const line of String(c.pet?.skills||'').split('\n')){const m=line.match(/^Enfurecido\s+(\d+)\s*$/);if(!m)continue;const value=petSkillEffect(c.pet,'Enfurecido',m[1]).value;if(value===null)issues.push('Confirma o valor de Enfurecido do pet.');else t.meleeMagic+=value;}}
 // Biólogo 80: ataque percentual de combate; não altera a referência do painel.
 if(c.bio.completed?.includes(80))t.damageAttackPct+=10;
 if(t.attackPct){t.damageAttackPct+=t.attackPct;notes.push('Ataque % adicional interpretado como bónus de combate; confirma a origem.');}
 if(t.meleeMagic>100)notes.push('Corpo a corpo/mágico limitado a 100% na fórmula.');
 if(calc.unknown.length)notes.push('Existem dados a confirmar no painel de status; revê as fontes antes de comparar investimentos.');
 const conditional=calc.unknown.filter(x=>/quando|durante|condicion|total|disfarce/i.test(x));notes.push(...conditional);
 return {issues:[...new Set(issues)],notes:[...new Set(notes)],records:calc.records,zero,sashRange,upgrade,stat,attack:t.attack,attackMax:t.attackMax,totals:t,level:+c.level,dex:a?.dex||0,horseAttack,mounted:!!riding.mount,mountLabel:riding.label};
}
function physicalPvmModel(input,target,extra={}){
 const required=['dex','defense','weaponResist','averageResist','critResist','pierceResist','elementResist'];
 if(required.some(k=>target[k]===''||target[k]===undefined||!Number.isFinite(Number(target[k]))))return {error:'Preenche a DES, defesa e resistências do alvo (usa 0 quando confirmado).'};
 if(input.mounted&&target.mountAllowed===false)return {error:'Montadas não são permitidas nesta masmorra. Escolhe A pé no laboratório.'};
 if(input.issues?.length)return {error:input.issues.join(' ')};
 if(target.yohara)return {error:'Sung Ma, precisão e penalizações de Yohara ainda não modelados; este perfil não produz uma estimativa.'};
 if(required.some(k=>!Number.isInteger(Number(target[k]))||Number(target[k])<(k==='elementResist'?-100:0)||Number(target[k])>(['dex','defense'].includes(k)?100000:100)))return {error:'Os valores do alvo ultrapassam os limites permitidos.'};
 const t={...input.totals};for(const [k,v] of Object.entries(extra))t[k]=(t[k]||0)+v;
 const k1=Math.min(90,Math.floor((2*input.dex+input.level)/3)),k2=Math.min(90,Math.floor((2*Number(target.dex)+input.level)/3));
 const factor=(k1+210)/300-(2*k2+5)/(k2+95)*.3;
 const defense=Number(target.defense),crit=Math.max(0,Math.min(100,t.crit-Number(target.critResist)))/100,pierce=Math.max(0,Math.min(100,t.pierce-Number(target.pierceResist)))/100;
 const element=target.element||'',power=element?t['power'+element[0].toUpperCase()+element.slice(1)]||0:0;
 const elemental=elements.map(([key,label])=>{const p=t['power'+key[0].toUpperCase()+key.slice(1)]||0,resist=key===element?Number(target.elementResist):Number(target.elementResists?.[key]||0),native=target.elementPowers?Number(target.elementPowers[key]||0):key===element&&resist!==0;return {key,label,power:p,factor:p>0?Math.max(0,native?(p-resist)/200:p/2000):0};});const elementFactor=elemental.reduce((sum,e)=>sum+e.factor,0);
 const offense=1+(Math.min(100,t.meleeMagic)+t.damageAttackPct)/100;
 const type=target.type==='metin'?1+t.metin/100:1,race=target.race?t[target.race]||0:0;
 const average=1+(t.average+(target.type==='boss'?(t.bossDamage||0):0))/100;
 const ranges=[input.zero,input.sashRange],lo=ranges[0][0]+ranges[1][0],hi=ranges[0][1]+ranges[1][1];
 if(hi-lo>2000)return {error:'Intervalo de ataque demasiado amplo para esta versão.'};
 const outcomes=[{name:'Normal',crit:false,pierce:false,p:(1-crit)*(1-pierce)},{name:'Crítico',crit:true,pierce:false,p:crit*(1-pierce)},{name:'Furado',crit:false,pierce:true,p:(1-crit)*pierce},{name:'Crítico + furado',crit:true,pierce:true,p:crit*pierce}];
 const primary=2*(input.level+input.upgrade),n0=ranges[0][1]-ranges[0][0]+1,n1=ranges[1][1]-ranges[1][0]+1;
 if(n0<=0||n1<=0)return {error:'Intervalos de ataque inválidos.'};
 let expected=0;let minimumDamage=false;
 for(const o of outcomes){o.min=Infinity;o.max=-Infinity;o.mean=0;}
 for(let sum=lo;sum<=hi;sum++){
  const count=Math.max(0,Math.min(ranges[0][1],sum-ranges[1][0])-Math.max(ranges[0][0],sum-ranges[1][1])+1),weight=count/(n0*n1);
  let base=Math.floor(primary+factor*(2*sum+input.stat+input.attack+(extra.attack||0)+(input.horseAttack||0)));
  // Attack gains are secondary; extra.attack is already in t only, input.attack deliberately unchanged.
  let intermediate=Math.floor(base*offense);for(const m of [type,1+race/100,1+t.monster/100])intermediate=Math.floor(intermediate*m);intermediate+=elemental.reduce((sum,e)=>sum+Math.floor(intermediate*e.factor),0);
  let after=intermediate-defense;const floors=after<=2?[1,2,3,4,5]:[after];if(after<=2)minimumDamage=true;
  for(const o of outcomes){let localMean=0;for(const f of floors){let d=Math.floor(f*(1-Number(target.weaponResist)/100));if(o.crit)d*=2;if(o.pierce)d+=Math.min(defense,Math.max(0,intermediate))+Math.floor(Math.max(0,intermediate)*Math.max(0,t.pierce-100)/200);d=Math.floor(d*average);d=Math.floor(d*(1-Number(target.averageResist)/100));d=Math.max(0,d);o.min=Math.min(o.min,d);o.max=Math.max(o.max,d);localMean+=d/floors.length;}o.mean+=weight*localMean;}
 }
 for(const o of outcomes)expected+=o.p*o.mean;
 return {expected,outcomes,factor,power,elementFactor,elemental,crit,pierce,primary,secondary:[2*lo+input.stat+input.attack+(input.horseAttack||0),2*hi+input.stat+input.attackMax+(input.horseAttack||0)],minimumDamage};
}
function renderCombat(){
 const host=$('#combat');if(!host)return;const s=set(),target=resolvedCombatTarget(char(),s),input=combatInputs(char(),s),fmt=n=>Number(n).toLocaleString('pt-PT',{maximumFractionDigits:1});
 const configField=(key,label,type='number',options=null)=>`<label>${label}${options?`<select data-combat-field="${key}">${options.map(([v,n])=>`<option value="${v}" ${String(target[key]||'')===String(v)?'selected':''}>${n}</option>`).join('')}</select>`:`<input data-combat-field="${key}" type="${type}" value="${esc(target[key]??'')}" ${type==='number'?`min="${key==='elementResist'?-100:0}" max="${['dex','defense'].includes(key)?100000:100}" step="1"`:''}>`}</label>`;
 const model=physicalPvmModel(input,target);const companion=window.COMPANION_PETS.find(e=>e.id===s.statusEffects?.companionPet);const withoutCompanion=companion&&s.statusEffects?.companionPetActive?physicalPvmModel(combatInputs(char(),{...s,statusEffects:{...s.statusEffects,companionPetActive:false}}),target):null;
 const mount=combatMountState(char(),s),mountEntry=mount.mount?window.MOUNT_CATALOG[mount.mount.mountId]:null;
 const presets=window.COMBAT_TARGETS,mounts=Object.entries(window.MOUNT_CATALOG).sort((a,b)=>{const featured=['special-33','special-2'];return (featured.indexOf(a[0])>=0?featured.indexOf(a[0])-100:0)-(featured.indexOf(b[0])>=0?featured.indexOf(b[0])-100:0)||a[1].label.localeCompare(b[1].label,'pt');});
 host.innerHTML=`<p class="hint">Estimativa de dano por golpe físico, a pé ou montado. Seleciona um perfil da wiki ou configura um alvo personalizado. Escolhas guardadas por set${readonly?' · simulação temporária nesta vista':''}.</p><div class="combat-switches">${[['petActive','Pet e habilidades'],['alchemyActive','Alquimia']].map(([key,label])=>`<label><input type="checkbox" data-status-effect="${key}" ${s.statusEffects?.[key]?'checked':''}>${label}</label>`).join('')}${Object.entries(calculateStatus().skillEffects).map(([name,e])=>`<label><input type="checkbox" data-skill-active="${esc(name)}" ${s.statusEffects?.skillActive?.[name]?'checked':''} ${!e.k?'disabled':''}>${esc(name)}</label>`).join('')}</div><div class="combat-quick"><label>Alvo pré-definido<select data-combat-preset><option value="">Personalizado</option>${presets.map(e=>`<option value="${e.id}" ${target.preset===e.id?'selected':''}>${esc(e.label)}${target.preset===e.id&&target.modified?' · ajustado':''}</option>`).join('')}</select></label><label>Montada ${mountEntry?.image?`<img class="mount-select-icon" src="${esc(mountEntry.image)}" alt="">`:""}<select data-combat-mount><option value="__set" ${(s.combatMount??'__set')==='__set'?'selected':''}>Usar montada do set (se ativa)</option><option value="foot" ${s.combatMount==='foot'?'selected':''}>A pé · sem montada</option>${mounts.map(([id,e])=>`<option value="${id}" ${s.combatMount===id?'selected':''}>${esc(e.label)}</option>`).join('')}</select></label><label>Nível do cavalo para simular<select data-combat-horse><option value="">Usar Skills e Treino (${esc(char().progress?.horse||'por definir')})</option>${Array.from({length:40},(_,i)=>`<option value="${i+1}" ${Number(s.combatHorseLevel)===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label></div>${mountEntry?`<div class="combat-mount-preview">${mountEntry.image?`<img src="${esc(mountEntry.image)}" alt="">`:''}<div><strong>${esc(mount.label)}</strong><pre>${esc(mountEntry.bonuses)}</pre><a href="${esc(mountEntry.source)}" target="_blank" rel="noopener">Fonte da montada ↗</a></div></div>`:''}${target.preset?`<p class="hint combat-preset-note">${esc(target.notes)} <a href="${esc(target.source)}" target="_blank" rel="noopener">Alvo na wiki ↗</a> · <a href="${esc(presets.find(e=>e.id===target.preset)?.dataSource||COMBAT_SOURCES.damage)}" target="_blank" rel="noopener">Dados do simulador FR ↗</a></p>`:''}<details class="combat-config"
${model.error?'open':''}><summary>Configurar alvo e resistências</summary><div class="combat-fields">
${configField('name','Nome do alvo','text')}
${configField('type','Tipo','select',[['monster','Monstro'],['boss','Boss'],['metin','Pedra Metin']])}
${configField('race','Bónus eficaz','select',[['','Nenhum'],['demons','Demónios'],['undead','Mortos-vivos'],['animals','Animais'],['orcs','Orcs'],['esoteric','Esotéricos'],['insects','Insetos'],['desert','Deserto'],['human','Semi-humanos'],['zodiac','Monstros do Zodíaco']])}
${configField('dex','DES do alvo')}
${configField('defense','Defesa do alvo')}
${configField('weaponKind','Tipo da tua arma','select',[['','Automático · '+COMBAT_WEAPONS[combatWeaponKind(char(),s)]],...Object.entries(COMBAT_WEAPONS)])}
${configField('weaponResist','Resistência à tua arma (%)')}
${configField('averageResist','Resistência a dano médio (%)')}
${configField('critResist','Resistência a críticos (%)')}
${configField('pierceResist','Resistência a furos (%)')}
${configField('element','Elemento a analisar','select',[['','Sem elemento'],...elements.map(([k,n])=>[k,n])])}
${configField('elementResist','Resistência do alvo a este elemento (%)')}</div><label class="combat-yohara"><input type="checkbox" data-combat-field="yohara" ${target.yohara?'checked':''}> Conteúdo de Yohara (Sung Ma ainda não modelado)</label></details>
${model.error?`<p class="combat-empty">${esc(model.error)}</p>`:`<div class="combat-result"><span>Dano médio por golpe · ${esc(target.name||'alvo personalizado')}</span><strong>${fmt(model.expected)}</strong><small>${input.mounted?'Montado · '+esc(input.mountLabel):'A pé'} · Inclui críticos e furos; não é DPS.</small></div>${withoutCompanion&&!withoutCompanion.error?`<p class="companion-gain">Cria ${esc(companion.name)}: <strong>+${fmt(model.expected-withoutCompanion.expected)} dano médio por golpe (+${fmt((model.expected/withoutCompanion.expected-1)*100)}%)</strong> face ao mesmo cenário sem cria.</p>`:''}<div class="combat-outcomes">
${model.outcomes.map(o=>`<div><small>${o.name} · ${fmt(o.p*100)}%</small><strong>${fmt(o.min)}–${fmt(o.max)}</strong></div>`).join('')}</div><h3>O que teria mais impacto?</h3><p class="hint">Ganho isolado com este alvo e este set. Não altera os teus itens e não compara custos em won.</p><div class="combat-investments">
${[['attack',50,'+50 ataque fixo'],['average',10,'+10 pontos de dano médio'],['monster',10,'+10 pontos contra monstros'],['crit',10,'+10 pontos de críticos'],['pierce',10,'+10 pontos de furos'],...(target.element?[['power'+target.element[0].toUpperCase()+target.element.slice(1),10,'+10 poder '+elements.find(e=>e[0]===target.element)?.[1]]]:[]),...(target.type==='metin'?[['metin',10,'+10 pontos contra Metins']]:[]),...(target.race==='zodiac'?[['zodiac',10,'+10 pontos contra Zodíaco']]:[])].map(([key,value,label])=>{const next=physicalPvmModel(input,target,{[key]:value}),gain=next.expected-model.expected;return {label,gain,pct:model.expected?gain/model.expected*100:0};}).sort((a,b)=>b.gain-a.gain).map(e=>`<div><span>${esc(e.label)}</span><strong>+${fmt(e.gain)} <small>(${fmt(e.pct)}%)</small></strong></div>`).join('')}</div>`}<details class="combat-sources"><summary>Fontes incluídas neste cenário</summary><p>${esc(input.mountLabel)} · ${esc(target.name||'Alvo personalizado')} · Crit ${fmt(input.totals.crit)}% · Furos ${fmt(input.totals.pierce)}% · Rapidez de ataque ${fmt(input.totals.attackSpeed)}%</p><table><thead><tr><th>Origem</th><th>Bónus</th><th>Valor</th></tr></thead><tbody>${input.records.map(r=>`<tr><td>${esc(r.source)}</td><td>${esc(r.label)}</td><td>${esc(r.value)}</td></tr>`).join('')}</tbody></table></details><details class="combat-method"><summary>Modelo, fontes e limites</summary><p>Separação da arma em +0 e melhoramento, atributos, ataque fixo, bónus percentuais, tipo de alvo, monstros, dano de ataque contra bosses, elemento, defesa, resistência à arma, críticos, furos (incluindo acima de 100%), dano médio e resistência a dano médio. A distribuição considera separadamente a arma e a faixa. Montado: aplica os bónus da montada, os mínimos de atributos do cavalo e o ataque adicional pelo nível do cavalo (divisor 60 para Sura Armas; 30 nas outras classes).</p><p>Primeira versão: não calcula habilidades ofensivas, PvP, transformação, Sung Ma, DPS, efeitos condicionais, conjuntos sem tabela confirmada ou modificadores próprios de bosses. Soma os seis poderes elementais; o elemento selecionado serve para comparar melhorias. Perfis personalizados usam resistência zero nos elementos não configurados. Arredondamentos e interações requerem validação com golpes observados no jogo. Rapidez de ataque altera a frequência, não o dano de um golpe.</p>
${input.notes.length?`<ul>${input.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}
${!model.error?`<p>Fator de ataque: ${fmt(model.factor)} · Ataque principal: ${fmt(model.primary)} · Ataque secundário: ${model.secondary.map(fmt).join('–')} · Ataque do cavalo: ${fmt(input.horseAttack||0)}${model.minimumDamage?' · Aplica-se o piso aleatório de dano 1–5.':''}</p>`:''}<p>${Object.entries(COMBAT_SOURCES).map(([key,url])=>`<a href="${url}" target="_blank" rel="noopener">${({damage:'Fórmula e ordem',attack:'Ataque',weapon:'Arma',pierce:'Furos',element:'Elementos'})[key]}</a>`).join(' · ')}</p></details>`;
 if(!char().sets.length)host.querySelectorAll('input,select').forEach(e=>e.disabled=true);
}
document.addEventListener('change',e=>{
 const element=e.target,s=set();if(!char().sets.length)return;
 if(element.matches('[data-combat-preset]')){
  const preset=window.COMBAT_TARGETS.find(t=>t.id===element.value);
  s.combatTarget=preset?{...structuredClone(preset),preset:preset.id,weaponKind:s.combatTarget?.weaponKind||'',weaponResistManual:false,elementResistManual:false}:{};save();return;
 }
 if(element.matches('[data-combat-mount]')){if(!['foot','__set',...Object.keys(window.MOUNT_CATALOG)].includes(element.value))return;s.combatMount=element.value;save();return;}
 if(element.matches('[data-combat-horse]')){if(element.value==='')delete s.combatHorseLevel;else if(Number.isInteger(Number(element.value))&&+element.value>=1&&+element.value<=40)s.combatHorseLevel=+element.value;else return;save();return;}
 const key=element.dataset?.combatField;if(!key)return;
 const allowed=['name','type','race','dex','defense','weaponKind','weaponResist','averageResist','critResist','pierceResist','element','elementResist','yohara'];if(!allowed.includes(key))return;
 if(element.type==='number'&&!element.checkValidity()){toast('Introduz um valor dentro dos limites indicados.');renderCombat();return;}
 s.combatTarget={...s.combatTarget,[key]:key==='yohara'?element.checked:element.value};
 if(key==='weaponResist')s.combatTarget.weaponResistManual=true;
 if(key==='weaponKind')s.combatTarget.weaponResistManual=false;
 if(key==='elementResist')s.combatTarget.elementResistManual=true;
 if(key==='element')s.combatTarget.elementResistManual=false;
 if(s.combatTarget.preset)s.combatTarget.modified=true;
 save();
});
