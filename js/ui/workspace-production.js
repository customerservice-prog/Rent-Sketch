// Keep workspace panels aligned with real chrome sizes, including access states
// and safe-area insets. This never changes access or rental selection state.
const shell=document.querySelector('.designer-shell');
const drawer=document.getElementById('drawer');
if(shell&&drawer){
  const header=drawer.querySelector('.drawer-header');
  const expand=document.createElement('button');
  expand.type='button';expand.className='drawer-size-toggle';expand.textContent='Expand';
  expand.setAttribute('aria-label','Expand rental panel');expand.setAttribute('aria-expanded','false');
  expand.setAttribute('aria-controls','drawerBody');header?.insertBefore(expand,document.getElementById('drawerClose'));
  expand.addEventListener('click',()=>{
    const expanded=drawer.dataset.expanded!=='true';drawer.dataset.expanded=String(expanded);
    expand.textContent=expanded?'Reduce':'Expand';expand.setAttribute('aria-expanded',String(expanded));
    expand.setAttribute('aria-label',expanded?'Reduce rental panel':'Expand rental panel');
  });
  new MutationObserver(()=>{
    if(drawer.hidden){delete drawer.dataset.expanded;expand.textContent='Expand';expand.setAttribute('aria-expanded','false');expand.setAttribute('aria-label','Expand rental panel');}
  }).observe(drawer,{attributes:true,attributeFilter:['hidden']});
  let frame=0;
  const resize=()=>{
    frame=0;
    const body=shell.querySelector('.designer-body'),rail=shell.querySelector('.tool-rail'),status=shell.querySelector('.status-bar');
    if(!body||!document.body.classList.contains('designer-active'))return;
    const bounds=body.getBoundingClientRect(),railBounds=rail?.getBoundingClientRect(),statusBounds=status?.getBoundingClientRect();
    const mobile=window.matchMedia('(max-width:880px)').matches,landscape=window.matchMedia('(max-height:500px) and (orientation:landscape)').matches;
    const railVisible=rail&&getComputedStyle(rail).display!=='none';
    const values={
      '--workspace-chrome-top':Math.max(0,bounds.top)+'px',
      '--workspace-dock-height':Math.max(0,(statusBounds?.height||0)+(mobile&&!landscape&&railVisible?railBounds.height:0))+'px',
      '--workspace-rail-width':(railVisible?railBounds.width:0)+'px'
    };
    for(const [key,value] of Object.entries(values))if(document.body.style.getPropertyValue(key)!==value)document.body.style.setProperty(key,value);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(resize);};
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  const observeChrome=()=>{for(const node of shell.querySelectorAll('.designer-toolbar,.event-pass-bar,.designer-body,.tool-rail,.status-bar'))observer?.observe(node);schedule();};
  new MutationObserver(observeChrome).observe(shell,{childList:true});
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('resize',schedule,{passive:true});
  observeChrome();
}
