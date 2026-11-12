import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewArtifact} from '../artifact-review.js';
test('SVG review detects malformed drawings and measures concrete repairs',()=>{
  const broken=reviewArtifact('drawing.svg','<svg><circle></svg>');assert.equal(broken.checks.find(c=>c.id==='svg_xml').pass,false);assert.ok(broken.score<100);
  const fixed=reviewArtifact('drawing.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>A sun</title><circle cx="50" cy="50" r="30"/></svg>');assert.equal(fixed.score,100);assert.ok(fixed.manual.some(t=>t.includes('human feedback')));
});
test('HTML scripts are parsed but never executed; syntax does not imply working gameplay',()=>{
  globalThis.pipReviewExecuted=false;
  const good=reviewArtifact('toy.html','<title>Colour toy</title><button onclick="this.textContent=\'Hello\'">Try</button><script>globalThis.pipReviewExecuted=true;</script>');assert.equal(globalThis.pipReviewExecuted,false);assert.equal(good.checks.find(c=>c.id==='js_syntax').pass,true);assert.ok(good.manual.some(t=>t.includes('does not prove')));
  const bad=reviewArtifact('toy.html','<button>Go</button><script>function broken( {</script>');assert.equal(bad.checks.find(c=>c.id==='js_syntax').pass,false);
});
test('research checks require a cited page that was read, not merely a search hit',()=>{
  const content='A note about light\n\nLight is interesting.\nSource: https://example.com/light';
  assert.equal(reviewArtifact('note.txt',content,{research:true,sources:[]}).checks.find(c=>c.id==='research_sources').pass,false);
  assert.equal(reviewArtifact('note.txt',content,{research:true,sources:[{url:'https://example.com/light'}]}).checks.find(c=>c.id==='research_sources').pass,true);
});
test('JSON mistakes and repetitive writing produce useful feedback',()=>{
  assert.equal(reviewArtifact('experiment.json','{bad}').checks.find(c=>c.id==='json_valid').pass,false);
  assert.equal(reviewArtifact('story.txt','One line\nOne line\nOne line\nOne line').checks.find(c=>c.id==='text_not_repeated').pass,false);
});
