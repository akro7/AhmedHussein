// Particles
(function(){
  const container = document.getElementById('particles');
  if(!container) return;
  for(let i=0;i<30;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random()*4+2;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      animation-duration:${Math.random()*8+6}s;
      animation-delay:${Math.random()*8}s;
      background: ${Math.random()>.5?'#00e5ff':'#00ff88'};
    `;
    container.appendChild(p);
  }
})();
