document.addEventListener('DOMContentLoaded',()=>{
  const requested=PlatformState.requested(location.search);if(requested!==null)PlatformState.select(requested);
  const update=()=>{const id=PlatformState.selected();for(const link of document.querySelectorAll('[data-workflow]')){link.href=`${{garage:'garage.html',training:'training.html',race:'apex-lab.html'}[link.dataset.workflow]}?driver=${id}`;if(link.dataset.workflow==='training'&&link.closest('.workflow-links'))link.textContent=`Entraîner ${GP.names[id]}`;}};
  window.addEventListener('apexselection',update);window.addEventListener('storage',update);update();
});
