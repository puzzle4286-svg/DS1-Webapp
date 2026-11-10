(function(){
const toP=s=>s.replace(/(^|-)([a-z0-9])/g,(_,a,b)=>b.toUpperCase());
class LcIcon extends HTMLElement{
static get observedAttributes(){return['name','size','stroke']}
connectedCallback(){this.render()}
attributeChangedCallback(){if(this.isConnected)this.render()}
render(){const L=window.lucide;if(!L){if(!this._w){this._w=1;setTimeout(()=>{this._w=0;this.render()},80)}return}
const n=this.getAttribute('name')||'';const sz=this.getAttribute('size')||16;
this.style.display='inline-flex';this.style.flex='none';this.style.lineHeight='0';
let node=(L.icons||{})[toP(n)];if(!node){this.replaceChildren();return}
if(node[0]==='svg')node=node[2];
const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');
const at={width:sz,height:sz,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':this.getAttribute('stroke')||1.75,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'};
for(const k in at)svg.setAttribute(k,at[k]);
for(const [t,a] of node){const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e)}
this.replaceChildren(svg)}}
if(!customElements.get('lc-icon'))customElements.define('lc-icon',LcIcon);
})();