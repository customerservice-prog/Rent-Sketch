import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {normalizePresentationCamera,normalizePresentationViews} from '../js/core/presentation-views.js';
import {presentationPlan} from '../js/ui/presentation-plan.js';

const camera={mode:'outside',position:[20,18,28],target:[0,2,0],fov:40};
test('saved views accept bounded camera metadata and strip private data and arbitrary URLs',()=>{
 const valid={id:'view-one',name:' Entrance ',viewMode:'3d',camera:{...camera,image:'https://private.invalid/photo'},customerEmail:'private@example.invalid'};
 const views=normalizePresentationViews([valid,{...valid,id:'photo',viewMode:'photo',camera},{...valid,id:'bad',camera:{...camera,position:[NaN,1,2]}},{...valid,id:'view-one'},{...valid,id:'bad id'},{...valid,id:'plan',viewMode:'plan'}]);
 assert.deepEqual(views,[{id:'view-one',name:'Entrance',viewMode:'3d',camera},{id:'photo',name:'Entrance',viewMode:'photo',camera:null}]);
 assert.equal(normalizePresentationCamera({...camera,position:camera.target}),null);
 assert.equal(normalizePresentationCamera({...camera,target:[100001,0,0]}),null);
 assert.equal(normalizePresentationViews(Array.from({length:10},(_,i)=>({...valid,id:'view-'+i}))).length,6);
 assert.equal(normalizePresentationCamera({...camera,fov:100}).fov,90);
});

test('vector floor plan preserves table shape, dimensions and independent photo-world position',()=>{
 const item={id:'sweetheart',kind:'table',tableId:'sweetheart',shape:'half-round',widthFt:2.5,depthFt:5,modelWidthFt:5,modelDepthFt:2.5,footprintOriented:true,rotationDeg:90,x:5,y:7,seatCount:2,chairId:'crossback'};
 const snapshot={tent:{id:'tent',widthFt:20,lengthFt:40},objects:[item]},before=structuredClone(snapshot);
 const plan=presentationPlan(snapshot,{tables:[{id:'sweetheart',name:'Sweetheart table'}],chairs:[{id:'crossback',seatWidthFt:1.5,seatDepthFt:1.5}]});
 assert.match(plan.svg,/viewBox=/);assert.match(plan.svg,/data-plan-item="sweetheart"/);assert.match(plan.svg,/translate\(6\.25 9\.5\) rotate\(90\)/);assert.match(plan.svg,/M -2\.5 -1\.25 H 2\.5 A 2\.5 2\.5/);assert.equal(plan.widthFt,20);assert.equal(plan.lengthFt,40);assert.deepEqual(snapshot,before);
 assert.deepEqual(plan.labels,[{number:1,label:'Sweetheart table'}]);
 const photo=presentationPlan({...snapshot,backgroundPhoto:{id:'photo'},photoSite:{widthFt:60,lengthFt:70},objects:[{...item,photoPlacement:{x:30,y:35,rotationDeg:25}}]});
 assert.equal(photo.widthFt,60);assert.equal(photo.lengthFt,70);assert.equal(photo.estimated,true);assert.match(photo.svg,/translate\(31\.25 37\.5\) rotate\(25\)/);assert.doesNotMatch(photo.svg,/private\.invalid/);
});

test('ordinary rotated banquet exports the live oriented footprint once, with seats along its long sides',()=>{
 const table={id:'banquet',kind:'table',tableId:'six',shape:'rect',widthFt:2.5,depthFt:6,rotationDeg:90,x:5,y:7,seatCount:6,chairId:'folding'};
 const plan=presentationPlan({tent:{widthFt:20,lengthFt:40},objects:[table]});
 const dom=new JSDOM(plan.svg,{contentType:'image/svg+xml'}),group=dom.window.document.querySelector('[data-plan-item]');
 assert.equal(group.querySelector('g').getAttribute('transform'),'translate(6.25 10) rotate(0)');
 const top=group.querySelector('g').querySelector('rect');assert.equal(top.getAttribute('width'),'2.5');assert.equal(top.getAttribute('height'),'6');
 assert.equal(group.querySelectorAll(':scope > rect').length,6);
 dom.window.close();
});

test('presentation allowlists customer-safe fields and escapes rental text',()=>{
 const dom=new JSDOM('<body></body>',{url:'https://rentsketch.com/designer/?tenant=friendly',runScripts:'outside-only'}),w=dom.window;
 w.eval(fs.readFileSync(new URL('../js/ui/presentation.js',import.meta.url),'utf8'));
 const html=w.RentSketchPresentation.documentHtml({title:'Reception <script>bad()</script>',company:'Friendly & Co',date:'2027-06-01',guests:50,seats:48,cover:null,caption:'estimated',plan:{svg:'<svg></svg>',labels:[{number:1,label:'Table <img src=x>'}],widthFt:20,lengthFt:40},lines:[{label:'Chair <script>bad()</script>',qty:48}],warnings:['Check <gate>'],created:'Jun 1, 2027',customerEmail:'private@example.invalid',crewNotes:'PRIVATE CREW',accessToken:'PRIVATE TOKEN'});
 const host=w.document.createElement('div');host.innerHTML=html;
 assert.equal(host.querySelectorAll('script,img').length,0);assert.match(host.textContent,/Reception <script>bad/);assert.match(host.textContent,/48/);assert.doesNotMatch(html,/private@example|PRIVATE CREW|PRIVATE TOKEN/);assert.equal(host.querySelectorAll('.rs-presentation-page').length,3);
 dom.window.close();
});

test('review separates PNG, presentation and JSON backup actions without changing sharing authorization',async()=>{
 const dom=new JSDOM('<body><div id="shareRow"><button id="btnPrint">Print</button><button id="btnDownload">Download</button><button id="btnShare">Share</button></div></body>',{url:'https://rentsketch.com/designer/?tenant=friendly',runScripts:'outside-only'}),w=dom.window;
 let editable=true,downloads=0,presentations=0,backups=0,access=0,shares=0;
 w.RentSketchEventPass={canEdit:()=>editable,requestAccess:()=>access++};w.FriendlyBridge={getScene:()=>({objects:[]})};w.RentSketchPresentation={download:async()=>downloads++,open:async()=>presentations++};w.RentSketchProjects={share:async()=>shares++};w.URL.createObjectURL=()=>{backups++;return 'blob:backup';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){};
 w.eval(fs.readFileSync(new URL('../js/ui/review-actions.js',import.meta.url),'utf8'));await new Promise(r=>w.document.addEventListener('DOMContentLoaded',r,{once:true}));
 const click=id=>w.document.getElementById(id).click();click('btnDownload');await new Promise(r=>setTimeout(r,0));click('btnPrint');click('btnProjectBackup');click('btnShare');await new Promise(r=>setTimeout(r,0));
 assert.equal(downloads,1);assert.equal(presentations,1);assert.equal(backups,1);assert.equal(shares,1);assert.equal(w.document.getElementById('btnDownload').textContent,'Download image');assert.match(w.document.getElementById('btnProjectBackup').textContent,/\.json/);
 editable=false;click('btnDownload');click('btnPrint');click('btnProjectBackup');assert.equal(access,3);assert.equal(downloads,1);assert.equal(backups,1);
 w.RENTSKETCH_SHARED_READONLY=true;editable=true;click('btnShare');click('btnDownload');click('btnProjectBackup');assert.equal(shares,1);assert.equal(downloads,1);assert.equal(backups,1);w.close();
});
