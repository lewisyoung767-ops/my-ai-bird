import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createLearning} from '../learning.js';
test('learning reviews actual files, survives restart and gives user feedback to the next decision',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'pip-learning-'));let stored;
  const options={creations:root,demo:false,load:async(_name,fallback)=>stored?structuredClone(stored):fallback,save:async(_name,value)=>stored=structuredClone(value)};
  try{
    const notebook=await createLearning(options);await notebook.apply({practice:{skill:'drawing',goal:'Practise composition'}});assert.equal(notebook.snapshot().attempts.length,0);
    await fs.writeFile(path.join(root,'sun.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><circle r="20"/></svg>');
    await notebook.apply({create_or_edit_file:{filename:'sun.svg'},practice:{skill:'drawing',goal:'Improve scaling',lesson:'Use a viewBox to scale the drawing.',evidence_file:'sun.svg'}});
    const attempt=notebook.snapshot().attempts[0];assert.ok(attempt.checks.some(c=>!c.pass));await notebook.feedback({attempt_id:attempt.id,rating:'needs_work',note:'The drawing needs a title and more space.'});
    const restarted=await createLearning(options);assert.equal(restarted.context().recent_results[0].feedback.note,'The drawing needs a title and more space.');assert.equal(restarted.snapshot().lessons.length,1);
    await assert.rejects(restarted.apply({create_or_edit_file:{filename:'../server.js'}}));
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
