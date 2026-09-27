// Adjust resolution only after sustained render-submission pressure. Browser display
// refresh cadence is deliberately not used: a 30Hz display is not a slow GPU.
export function createRenderQuality({maxRatio=2,minRatio=.85}={}) {
  let ratio=Math.max(minRatio,maxRatio),samples=0,total=0,fastWindows=0;
  return {get ratio(){return ratio;},sample(renderMs){
    if(!Number.isFinite(renderMs)||renderMs<0)return null;
    total+=Math.min(renderMs,250);samples++;
    if(samples<90)return null;
    const average=total/samples;total=0;samples=0;let next=ratio;
    if(average>24){next=Math.max(minRatio,ratio-.2);fastWindows=0;}
    else if(average<9){if(++fastWindows>=4){next=Math.min(maxRatio,ratio+.1);fastWindows=0;}}
    else fastWindows=0;
    if(Math.abs(next-ratio)<.001)return null;ratio=next;return ratio;
  }};
}
