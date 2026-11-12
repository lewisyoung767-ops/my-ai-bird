import path from 'node:path';
import {Script} from 'node:vm';
import {load} from 'cheerio';
import {SaxesParser} from 'saxes';
import {parseSTL,meshChecks} from './public/model-format.js';

export function reviewArtifact(filename,content,{research=false,sources=[],skill=null}={}){
  const ext=path.extname(filename);
  const checks=[],manual=[];const check=(id,label,pass,advice)=>checks.push({id,label,pass:!!pass,advice:pass?null:advice});
  check('nonempty','Contains a real result',content.trim().length>0,'Create a nonempty result.');
  if(ext==='.svg'){
    let error=null,root=null;const parser=new SaxesParser({xmlns:true});parser.on('error',e=>error=e.message);parser.on('opentag',node=>{root ||= node;});
    try{parser.write(content).close();}catch(e){error=e.message;}
    const $=load(content,{xml:true});const svg=$('svg').first();
    check('svg_xml','Well-formed SVG XML',!error&&root?.local==='svg','Use one complete SVG root and close every tag.');
    check('svg_namespace','SVG namespace present',root?.uri==='http://www.w3.org/2000/svg','Set xmlns="http://www.w3.org/2000/svg" on the SVG root.');
    const box=(svg.attr('viewBox')||'').trim().split(/[ ,]+/).map(Number);
    check('svg_viewbox','Scales with a valid viewBox',box.length===4&&box.every(Number.isFinite)&&box[2]>0&&box[3]>0,'Add a viewBox with positive width and height, such as 0 0 800 600.');
    check('svg_shapes','Contains visible drawing elements',$('path,circle,ellipse,rect,line,polygon,polyline,text').length>0,'Add shapes or text to make the drawing visible.');
    check('svg_title','Has a descriptive accessible title',$('svg > title').text().trim().length>0,'Add a descriptive <title> inside the SVG.');
    check('svg_selfcontained','Drawing has no external resources',!/<(?:script|foreignObject)\b/i.test(content)&&!/(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/)/i.test(content)&&!/(?:@import|url\(\s*["']?\s*https?:)/i.test(content),'Keep SVG standalone: no scripts or externally loaded resources.');
    manual.push('Visual appeal, composition and whether it matches the request need human feedback.');
  }else if(ext==='.html'){
    const $=load(content);const scripts=$('script').toArray();let syntax=true,modules=false;
    for(const element of scripts){const type=($(element).attr('type')||'').toLowerCase();if(type==='module'){modules=true;continue;}if(type&&type!=='text/javascript'&&type!=='application/javascript')continue;try{new Script($(element).text());}catch{syntax=false;}}
    $('*').each((_i,element)=>{for(const [key,value] of Object.entries(element.attribs||{}))if(/^on/i.test(key)){try{new Script('(function(event){'+value+'\n})');}catch{syntax=false;}}});
    const visible=$('body').clone();visible.find('script,style').remove();
    check('html_content','Has page content',visible.text().trim().length>0||$('canvas,svg,img').length>0,'Add visible text, a canvas or drawing.');
    check('html_title','Has a page title',$('title').text().trim().length>0,'Add <title> so the toy has a clear name.');
    check('js_syntax','Classic scripts and event handlers parse',syntax,'Repair JavaScript syntax before adding more features.');
    check('html_selfcontained','No externally loaded dependencies',$('[src],[href]').toArray().every(e=>{const v=$(e).attr('src')||$(e).attr('href')||'';return !/^(https?:|\/\/)/i.test(v);})&&!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(content),'Keep the toy self-contained; external requests are blocked in the gallery.');
    manual.push('Open the toy and test its controls: parsing scripts does not prove that the game works.');if(modules)manual.push('Module-script syntax was not checked.');
  }else if(ext==='.stl'){
    let mesh,report;try{mesh=parseSTL(content);report=meshChecks(mesh);}catch{}
    check('stl_valid','Complete ASCII STL triangles',!!mesh,'Write complete ASCII STL with exactly three vertices per facet.');
    check('stl_faces','No zero-area triangles',!!report?.nondegenerate,'Remove collapsed triangles.');
    check('stl_closed','Every edge is shared by two faces',!!report?.closed,'Close holes and remove duplicate faces.');
    check('stl_winding','Neighbouring faces have consistent winding',!!report?.consistent,'Order adjacent face vertices in opposite directions along shared edges.');
    check('stl_volume','Has positive outward-oriented volume',!!report?.positiveVolume,'Use a closed 3D solid with outward-facing triangles.');
    manual.push('These checks do not prove a model is printable. Check units, scale, wall thickness, self-intersections and supports in a slicer.');
  }else if(ext==='.scad'){
    const code=content.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"(?:\\.|[^"\\])*"/g,'');const stack=[],matching={')':'(',']':'[','}':'{'};let balanced=true;for(const ch of code){if('([{'.includes(ch))stack.push(ch);else if(')]}'.includes(ch)&&stack.pop()!==matching[ch])balanced=false;}
    check('scad_balanced','Balanced delimiters',balanced&&!stack.length,'Balance parentheses, brackets and braces.');
    check('scad_geometry','Contains geometry instructions',/\b(cube|sphere|cylinder|polyhedron|linear_extrude|rotate_extrude)\s*\(/.test(code),'Add geometry to the design.');
    check('scad_selfcontained','No external file dependencies',! /\b(import|include|use|surface)\b/.test(code),'Keep the design self-contained.');
    manual.push('OpenSCAD code is never run by Pip. Render/export it in OpenSCAD and validate the STL in a slicer.');
  }else if(ext==='.json'){
    let value;try{value=JSON.parse(content);}catch{}
    check('json_valid','Valid JSON',value!==undefined,'Fix JSON syntax and quoting.');
    check('json_structure','Has meaningful structured data',value!==null&&typeof value==='object'&&Object.keys(value).length>0,'Use a nonempty object or array for the experiment.');manual.push('The data’s meaning and usefulness need review.');
  }else{
    const lines=content.trim().split(/\r?\n/).filter(l=>l.trim());
    check('text_title','Begins with a concise title',!!lines[0]&&lines[0].length<=120,'Start with a short title.');
    check('text_sections','Has more than one meaningful line',lines.length>=3,'Develop the piece beyond a single line.');
    check('text_not_repeated','Does not mainly repeat identical lines',lines.length===0?false:new Set(lines.map(l=>l.trim().toLowerCase())).size/lines.length>=.7,'Replace repetitive lines with new information or details.');manual.push('Style, originality and whether the piece meets your request need human feedback.');
  }
  if(research){
    const known=new Set(sources.map(s=>s.url).filter(Boolean));const cited=(content.match(/https:\/\/[^\s<>"')\]]+/g)||[]).map(url=>url.replace(/[.,;]+$/,''));
    check('research_sources','Cites a page Pip actually read',cited.some(url=>known.has(url)),'Read a source, then cite its actual URL in the result. Search snippets alone do not count.');
    manual.push('A matching source URL does not verify every factual claim.');
  }
  const passed=checks.filter(c=>c.pass).length;
  return {rubric:'technical-v1:'+ext+(research?':research':''),format:ext,skill,passed,total:checks.length,score:Math.round(passed/checks.length*100),checks,manual};
}
