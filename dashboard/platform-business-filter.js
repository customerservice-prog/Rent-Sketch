(function(){
'use strict';
var session=window.RentSketchDashboardSession;
if(!session||typeof session.json!=='function')return;

var hidden=new Set([
  'generic',
  'claude-qa-redteam-tenant',
  'claude-qa-trial-banner-test',
  'claude-qa-trial-regression',
  'claude-qa-ui-test-rentals',
  'claude-qa-test-rentals',
  'sample-event-rentals'
]);

function visible(row){return row&&row.slug&&!hidden.has(String(row.slug).toLowerCase());}
function visibleAlert(row){return !row||!row.slug||!hidden.has(String(row.slug).toLowerCase());}

var original=session.json.bind(session);
session.json=async function(path,options){
  var data=await original(path,options);
  if(!data||typeof data!=='object')return data;

  if(path.indexOf('/api/admin/tenants')===0&&Array.isArray(data.tenants)){
    data=Object.assign({},data,{tenants:data.tenants.filter(visible)});
  }
  if(path.indexOf('/api/admin/onboarding')===0&&Array.isArray(data.accounts)){
    data=Object.assign({},data,{accounts:data.accounts.filter(visible)});
  }
  if(path.indexOf('/api/admin/alerts')===0&&Array.isArray(data.alerts)){
    data=Object.assign({},data,{alerts:data.alerts.filter(visibleAlert)});
  }
  if(path.indexOf('/api/admin/subscriptions')===0&&Array.isArray(data.subscriptions)){
    data=Object.assign({},data,{subscriptions:data.subscriptions.filter(visible)});
  }
  return data;
};
})();