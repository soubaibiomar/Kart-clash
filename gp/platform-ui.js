// Shared navigation and compact race controls. Interface only: no simulation timers.
document.addEventListener('DOMContentLoaded',()=>{
  const tabs=[...document.querySelectorAll('[data-camera]')],select=document.getElementById('camera-mode');
  if(select){
    const sync=()=>tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===select.value)));
    tabs.forEach(b=>b.onclick=()=>{select.value=b.dataset.camera;select.dispatchEvent(new Event('change',{bubbles:true}));sync();});select.addEventListener('change',sync);sync();
    document.querySelectorAll('.race-tools,.team-radio').forEach(panel=>panel.addEventListener('toggle',()=>{if(panel.open)document.querySelectorAll('.race-tools,.team-radio').forEach(other=>{if(other!==panel)other.open=false;});}));
  }
});
