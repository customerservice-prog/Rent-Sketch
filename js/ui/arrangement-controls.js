// Touch and keyboard friendly multi-rental arranging. Authorization and the
// atomic undo transaction remain in FriendlyBridge.applyArrangement.
const rail=document.getElementById('toolRail');
if(rail){
  const openButton=document.createElement('button');openButton.type='button';openButton.className='rail-btn';openButton.dataset.arrangeOpen='';
  openButton.innerHTML='<span class="rail-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 4v16M8 7h11v4H8zm0 8h7v4H8z"/></svg></span><span>Arrange</span>';
  openButton.setAttribute('aria-label','Arrange multiple rentals');rail.appendChild(openButton);
  const dialog=document.createElement('dialog');dialog.className='arrange-dialog';dialog.setAttribute('aria-labelledby','arrangeTitle');
  dialog.innerHTML='<form method="dialog" class="arrange-heading"><div><span>YOUR LAYOUT</span><h2 id="arrangeTitle">Arrange rentals</h2></div><button type="submit" aria-label="Close arrangement tools">×</button></form><div class="arrange-body"><p class="arrange-intro">Select rentals to align, space, move together, or repeat in a row.</p><div class="arrange-selection-tools"><strong data-arrange-count>0 selected</strong><button type="button" data-arrange-all>Select all</button><button type="button" data-arrange-none>Clear</button></div><div class="arrange-items" role="group" aria-label="Rentals to arrange"></div><label class="arrange-action-label">Action<select data-arrange-action><option value="align">Align rentals</option><option value="distribute">Equal spacing</option><option value="move">Move together</option><option value="duplicate">Duplicate in a row</option></select></label><div data-arrange-options="align"><label>Align to<select data-arrange-edge><option value="left">Left edge</option><option value="center-x">Horizontal center</option><option value="right">Right edge</option><option value="top">Top edge</option><option value="center-y">Vertical center</option><option value="bottom">Bottom edge</option></select></label><p>Uses the outside edges of the selected group. Select at least two rentals.</p></div><div data-arrange-options="distribute" hidden><label>Space along<select data-arrange-spacing-axis><option value="x">Horizontal · left to right</option><option value="y">Vertical · top to bottom</option></select></label><p>Equal gaps between footprints, keeping the outer edges in place. Select at least three rentals.</p></div><div data-arrange-options="move" hidden><div class="arrange-fields"><label>Horizontal move (ft)<input type="number" step="0.5" value="0" data-arrange-dx></label><label>Vertical move (ft)<input type="number" step="0.5" value="0" data-arrange-dy></label></div><p>Positive values move right or down in the unturned plan. Negative values move left or up.</p></div><div data-arrange-options="duplicate" hidden><label>Row direction<select data-arrange-copy-axis><option value="x">Horizontal · toward the right</option><option value="y">Vertical · toward the bottom</option></select></label><div class="arrange-fields"><label>Additional copies<input type="number" min="1" max="20" step="1" value="1" data-arrange-copies></label><label>Gap between groups (ft)<input type="number" min="0" step="0.5" value="2" data-arrange-gap></label></div><p>Repeats the entire selected group, including its chairs and styling. Added rentals change your estimate.</p></div><p class="arrange-note">Gaps use rental footprints. Check chair space, access paths, and operating clearances separately. A successful arrangement does not confirm installation fit.</p><p class="arrange-feedback" data-arrange-feedback role="status" aria-live="polite"></p></div><footer class="arrange-footer"><span>One action · one Undo</span><button type="button" class="btn-primary" data-arrange-apply>Apply arrangement</button></footer>';
  document.body.appendChild(dialog);
  let chosen=new Set();
  const bridge=()=>window.FriendlyBridge;
  const feedback=(message,error=false)=>{const node=dialog.querySelector('[data-arrange-feedback]');node.textContent=message;node.classList.toggle('is-error',error);};
  function itemName(item){
    const b=bridge(),sources=[...(b?.TABLES||[]),...(b?.CHAIRS||[]),...(b?.INFLATABLES||[]),...(b?.EQUIPMENT||[]),...(b?.ACCESSORIES||[])];
    const definition=sources.find(p=>[item.tableId,item.chairId,item.inflatableId,item.equipmentId,item.accessoryId].includes(p.id));
    return item.name||definition?.name||({table:'Table',chair:'Chair',dance:'Dance floor section',inflatable:'Inflatable',equipment:'Equipment',accessory:'Accessory'})[item.kind]||'Rental';
  }
  function count(){const amount=chosen.size;dialog.querySelector('[data-arrange-count]').textContent=amount+' selected';dialog.querySelector('[data-arrange-apply]').disabled=!amount;}
  function renderItems(){
    const items=bridge()?.getScene?.()?.objects||[],available=new Set(items.map(item=>item.id));chosen=new Set([...chosen].filter(id=>available.has(id)));
    const list=dialog.querySelector('.arrange-items');list.replaceChildren();
    if(!items.length){const empty=document.createElement('p');empty.textContent='Add rentals to your layout to use these tools.';list.appendChild(empty);}
    const floor=items.filter(item=>item.kind==='dance');if(floor.some(item=>chosen.has(item.id)))for(const item of floor)chosen.add(item.id);let renderedFloor=false;
    items.forEach((item,index)=>{
      if(item.kind==='dance'&&renderedFloor)return;if(item.kind==='dance')renderedFloor=true;
      const ids=item.kind==='dance'?floor.map(tile=>tile.id):[item.id],label=document.createElement('label'),checkbox=document.createElement('input'),copy=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');
      checkbox.type='checkbox';checkbox.checked=ids.every(id=>chosen.has(id));checkbox.indeterminate=!checkbox.checked&&ids.some(id=>chosen.has(id));
      checkbox.dataset.arrangeIds=JSON.stringify(ids);
      name.textContent=item.kind==='dance'?'Dance floor · '+floor.length+' sections':itemName(item)+' · '+(index+1);
      detail.textContent=item.kind==='dance'?'All floor sections move together':(item.widthFt+' × '+(item.depthFt??item.lengthFt)+' ft footprint');
      copy.append(name,detail);label.append(checkbox,copy);list.appendChild(label);
    });count();
  }
  openButton.addEventListener('click',()=>{
    if(!bridge()?.getScene||typeof bridge()?.applyArrangement!=='function')return;
    bridge().closeDrawer?.();chosen=new Set(bridge().state?.selectedId?[bridge().state.selectedId]:[]);renderItems();feedback('');dialog.showModal();
  });
  dialog.addEventListener('change',event=>{
    const target=event.target;
    if(target.matches('[data-arrange-ids]')){for(const id of JSON.parse(target.dataset.arrangeIds))target.checked?chosen.add(id):chosen.delete(id);count();}
    if(target.matches('[data-arrange-action]')){dialog.querySelectorAll('[data-arrange-options]').forEach(node=>node.hidden=node.dataset.arrangeOptions!==target.value);feedback('');}
  });
  dialog.querySelector('[data-arrange-all]').addEventListener('click',()=>{chosen=new Set((bridge()?.getScene?.()?.objects||[]).map(item=>item.id));renderItems();});
  dialog.querySelector('[data-arrange-none]').addEventListener('click',()=>{chosen.clear();renderItems();});
  dialog.querySelector('[data-arrange-apply]').addEventListener('click',async()=>{
    const button=dialog.querySelector('[data-arrange-apply]');if(button.disabled)return;
    const value=selector=>dialog.querySelector(selector).value;
    const request={ids:[...chosen],action:value('[data-arrange-action]')};
    if(request.action==='align')request.edge=value('[data-arrange-edge]');
    if(request.action==='distribute')request.axis=value('[data-arrange-spacing-axis]');
    if(request.action==='move'){request.dx=Number(value('[data-arrange-dx]'));request.dy=Number(value('[data-arrange-dy]'));}
    if(request.action==='duplicate'){
      request.axis=value('[data-arrange-copy-axis]');request.copies=Number(value('[data-arrange-copies]'));request.gapFt=Number(value('[data-arrange-gap]'));
      if(!Number.isInteger(request.copies)||request.copies<1||request.copies>20){feedback('Choose 1 to 20 additional copies.',true);return;}
      if((bridge()?.getScene?.()?.objects?.length||0)+request.copies*request.ids.length>5000){feedback('Duplicate fewer rentals. A layout can contain up to 5,000 rentals.',true);return;}
      request.newIds=Array.from({length:request.copies*request.ids.length},()=>crypto.randomUUID());
    }
    button.disabled=true;
    try{
      const result=await bridge().applyArrangement(request);
      if(result===false||result?.ok===false)throw new Error(result?.error||'This layout cannot be edited right now.');
      if(result?.selectedIds)chosen=new Set(result.selectedIds);
      renderItems();feedback(request.action==='duplicate'?'Copies added. Your rental estimate has been updated.':'Arrangement applied. Undo restores the whole action.');
    }catch(error){feedback(error.message||'The arrangement could not be applied.',true);}
    finally{count();}
  });
}
