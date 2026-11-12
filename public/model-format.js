// A data-only ASCII STL parser shared by the browser and server checks. Never executes code.
export function parseSTL(text){
  if(typeof text!=='string'||text.length>150000||!/^[\t\r\n\x20-\x7e]*$/.test(text))throw new Error('Use an ASCII STL file under 150 KB. Binary STL is not supported.');
  if(!/^\s*solid\b[^\r\n]*[\r\n]/i.test(text)||!/[\r\n]\s*endsolid\b[^\r\n]*\s*$/i.test(text))throw new Error('STL needs solid/endsolid and complete facets.');
  const start=text.indexOf('\n')+1,end=text.toLowerCase().lastIndexOf('endsolid');const body=text.slice(start,end);
  const number='([-+]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][-+]?\\d+)?)';
  const vertex='vertex\\s+'+number+'\\s+'+number+'\\s+'+number;
  const pattern=new RegExp('facet\\s+normal\\s+'+number+'\\s+'+number+'\\s+'+number+'\\s+outer\\s+loop\\s+'+vertex+'\\s+'+vertex+'\\s+'+vertex+'\\s+endloop\\s+endfacet','gi');
  const vertices=[];let last=0;
  for(const match of body.matchAll(pattern)){
    if(body.slice(last,match.index).trim())throw new Error('STL contains incomplete or unrecognised facet data.');last=match.index+match[0].length;
    const values=match.slice(1).map(Number);if(values.some(n=>!Number.isFinite(n)||Math.abs(n)>100000))throw new Error('STL coordinates must be finite and within 100000 units.');
    for(let i=3;i<12;i+=3)vertices.push(values.slice(i,i+3));if(vertices.length>12000)throw new Error('STL has too many facets.');
  }
  if(!vertices.length||body.slice(last).trim())throw new Error('STL needs complete triangles with three vertices each.');
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const vertex of vertices)vertex.forEach((n,i)=>{min[i]=Math.min(min[i],n);max[i]=Math.max(max[i],n);});
  return {vertices,triangles:vertices.length/3,min,max,size:max.map((n,i)=>n-min[i])};
}
export function meshChecks(mesh){
  const edges=new Map();let degenerate=0,volume=0;
  const key=v=>v.map(n=>Number(n.toFixed(6))).join(',');
  for(let i=0;i<mesh.vertices.length;i+=3){const [a,b,c]=mesh.vertices.slice(i,i+3),u=b.map((n,j)=>n-a[j]),v=c.map((n,j)=>n-a[j]);const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(Math.hypot(...cross)<1e-9)degenerate++;
    volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(const [from,to]of [[a,b],[b,c],[c,a]]){const x=key(from),y=key(to),id=x<y?x+'|'+y:y+'|'+x;const edge=edges.get(id)||{count:0,direction:0};edge.count++;edge.direction+=x<y?1:-1;edges.set(id,edge);}
  }
  return {nondegenerate:degenerate===0,closed:[...edges.values()].every(e=>e.count===2),consistent:[...edges.values()].every(e=>e.count===2&&e.direction===0),positiveVolume:volume>1e-9,volume};
}
