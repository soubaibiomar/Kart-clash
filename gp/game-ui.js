document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('expand-timing').onclick=event=>{
    const expanded=document.querySelector('.timing').classList.toggle('expanded');event.currentTarget.setAttribute('aria-expanded',String(expanded));event.currentTarget.textContent=expanded?'Top 5':'Full grid';
  };
  setInterval(()=>{
    if(typeof broadcast==='undefined'||!broadcast)return;
    const model=broadcast.selected()?.neuralModel;
    const label=document.getElementById('model-status');
    label.textContent=model?`${broadcast.selected().driver.abbr} · independent 18–36–2 network · generation ${model.metadata.generation}`:'No trained driver model';
  },300);
});
