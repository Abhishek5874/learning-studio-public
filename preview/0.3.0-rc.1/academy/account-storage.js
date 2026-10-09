'use strict';
(function(root){
 function create(tabStorage,sharedStorage,now=()=>Date.now()){
  const verifier=k=>k.endsWith('-code-verifier');
  return {getItem(k){if(!verifier(k))return tabStorage.getItem(k);try{const record=JSON.parse(sharedStorage.getItem(k));if(!record||record.expires<=now()){sharedStorage.removeItem(k);return null;}return record.value;}catch{sharedStorage.removeItem(k);return null;}},setItem(k,value){if(verifier(k))sharedStorage.setItem(k,JSON.stringify({value,expires:now()+15*60*1000}));else tabStorage.setItem(k,value);},removeItem(k){tabStorage.removeItem(k);if(verifier(k))sharedStorage.removeItem(k);}};
 }
 const api={create};if(typeof module!=='undefined')module.exports=api;else root.AccountStorage=api;
})(typeof window==='undefined'?globalThis:window);
