import {normalizePhotoComposition,DEFAULT_PHOTO_LIGHTING} from '../core/photo-composition.js';
const controlsByHost=new WeakMap();
const presets={
  daylight:{label:'Clear daylight',lighting:{intensity:2.5,ambient:.8,elevationDeg:45,shadowSoftness:1.5,shadowOpacity:.28}},
  overcast:{label:'Soft / overcast',lighting:{intensity:.65,ambient:1.3,elevationDeg:55,shadowSoftness:5,shadowOpacity:.13}},
  shade:{label:'Open shade',lighting:{intensity:.25,ambient:1.05,elevationDeg:45,shadowSoftness:6,shadowOpacity:.10}}
};
const fields=[
  ['azimuthDeg','Light direction',0,360,1,'°'],['elevationDeg','Sun height',10,85,1,'°'],
  ['intensity','Sun brightness',0,6,.1,''],['ambient','Ambient fill',.1,3,.05,''],
  ['shadowSoftness','Shadow softness',0,6,.25,''],['shadowOpacity','Ground shadow',0,.65,.01,'']
];
export function syncLightingControls(host,snapshot,callbacks={}){
  if(!host)return;let entry=controlsByHost.get(host);
  if(!entry){
    const root=document.createElement('details');root.className='photo-lighting-controls';
    root.innerHTML='<summary>Match the photo lighting</summary><p>Start with the light in your photograph. These settings change the rentals; the real photo keeps its captured lighting.</p><div class="photo-lighting-presets" role="group" aria-label="Photo lighting starting points">'+Object.entries(presets).map(([key,preset])=>'<button type="button" class="btn-chip" data-photo-light-preset="'+key+'">'+preset.label+'</button>').join('')+'</div><p class="photo-lighting-guide">Match the direction of existing shadows first, then their length and softness. Use brightness and ambient fill to blend the rentals into the photo.</p><div class="photo-lighting-fields">'+fields.map(([key,label,min,max,step])=>'<label>'+label+'<output data-light-output="'+key+'"></output><input aria-label="'+label+'" data-photo-light="'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'"></label>').join('')+'</div><p class="photo-lighting-direction">0° faces the camera; 90° is right; 180° is behind the scene. Manual visual estimates, not recovered sunlight.</p><button type="button" class="btn-chip" data-photo-light-reset>Reset photo lighting</button>';
    host.insertBefore(root,host.querySelector(':scope > strong')?.nextSibling||host.firstChild);entry={root,value:normalizePhotoComposition(),callbacks,editing:false};controlsByHost.set(host,entry);
    function display(){for(const [key,,,,,unit] of fields){const input=root.querySelector('[data-photo-light="'+key+'"]');input.value=entry.value.lighting[key];root.querySelector('[data-light-output="'+key+'"]').textContent=entry.value.lighting[key]+unit;}}
    entry.display=display;
    root.addEventListener('input',e=>{const key=e.target.dataset.photoLight;if(!key)return;entry.editing=true;entry.value=normalizePhotoComposition({...entry.value,lighting:{...entry.value.lighting,[key]:Number(e.target.value)}});display();entry.callbacks.onPreview?.(entry.value);});
    root.addEventListener('change',e=>{if(!e.target.dataset.photoLight)return;entry.editing=false;entry.callbacks.onChange?.(entry.value);});
    root.addEventListener('pointercancel',()=>{entry.editing=false;entry.value=entry.saved;display();entry.callbacks.onPreview?.(entry.value);});
    root.addEventListener('click',e=>{
      const preset=presets[e.target.closest('[data-photo-light-preset]')?.dataset.photoLightPreset],reset=e.target.closest('[data-photo-light-reset]');
      if(!preset&&!reset)return;
      entry.editing=false;entry.value=normalizePhotoComposition({...entry.value,lighting:reset?DEFAULT_PHOTO_LIGHTING:{...entry.value.lighting,...preset.lighting}});
      display();entry.callbacks.onPreview?.(entry.value);entry.callbacks.onChange?.(entry.value);
    });
  }
  entry.callbacks=callbacks;entry.root.hidden=!snapshot?.backgroundPhoto?.url||!!snapshot.photoLayoutModel;
  entry.saved=normalizePhotoComposition(snapshot?.photoComposition);
  if(!entry.editing){entry.value=entry.saved;entry.display();}
}
