import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLearning,recordAttempt,proposeLesson,giveFeedback,learningSnapshot,validatePractice} from '../learning-ledger.js';
const review=score=>({rubric:'technical-v1:.svg:drawing',skill:'drawing',score,checks:[],manual:[],passed:score/20,total:5});
const put=(ledger,content,score,practice=null,demo=false)=>recordAttempt(ledger,{filename:'picture.svg',content,review:review(score),practice,demo}).attempt;
test('only distinct real artifacts count as practice, not plans or duplicate output',()=>{
  const ledger=emptyLearning();assert.equal(learningSnapshot(ledger).skills.length,0);
  put(ledger,'drawing-one',60);recordAttempt(ledger,{filename:'renamed.svg',content:'drawing-one',review:review(60)});put(ledger,'demo-example',100,null,true);
  assert.equal(ledger.attempts.length,2);assert.equal(learningSnapshot(ledger).skills[0].attempts,1);assert.equal(learningSnapshot(ledger).skills[0].trend,null);
});
test('lessons require real reviewed evidence; repeated applications build evidence and regressions flag review',()=>{
  const ledger=emptyLearning();assert.equal(proposeLesson(ledger,{skill:'drawing',lesson:'Use a viewBox',goal:'Scale the drawing',evidence_file:'missing.svg'}),null);
  const baseline=put(ledger,'baseline',40);const lesson=proposeLesson(ledger,{skill:'drawing',lesson:'Use a viewBox',goal:'Scale the drawing',evidence_file:'picture.svg'});assert.equal(lesson.evidence_id,baseline.id);
  put(ledger,'improved-one',80,{technique_id:lesson.id});assert.equal(learningSnapshot(ledger).lessons[0].status,'candidate');
  put(ledger,'improved-two',100,{technique_id:lesson.id});assert.equal(learningSnapshot(ledger).lessons[0].status,'supported');
  put(ledger,'regressed',20,{technique_id:lesson.id});assert.equal(learningSnapshot(ledger).lessons[0].status,'revisit');
});
test('feedback can be corrected without duplicate votes and reaches technique evidence',()=>{
  const ledger=emptyLearning();put(ledger,'baseline',60);const lesson=proposeLesson(ledger,{skill:'drawing',lesson:'Group shapes',goal:'Use clear layers',evidence_file:'picture.svg'});const attempt=put(ledger,'next',60,{technique_id:lesson.id});
  giveFeedback(ledger,{attempt_id:attempt.id,rating:'helpful',note:'The layout is clearer.'});assert.equal(learningSnapshot(ledger).lessons[0].status,'supported');
  giveFeedback(ledger,{attempt_id:attempt.id,rating:'needs_work',note:'I noticed overlapping labels.'});const snapshot=learningSnapshot(ledger);assert.equal(snapshot.lessons[0].status,'revisit');assert.equal(snapshot.skills[0].helpful,0);assert.equal(snapshot.skills[0].needs_work,1);
  assert.throws(()=>giveFeedback(ledger,{attempt_id:'fabricated',rating:'helpful'}));
});
test('technical trends use six real results and lesson baselines survive bounded history',()=>{
  const ledger=emptyLearning();put(ledger,'origin',20);const lesson=proposeLesson(ledger,{skill:'drawing',lesson:'Add a title',goal:'Name the drawing',evidence_file:'picture.svg'});
  for(let i=0;i<155;i++)put(ledger,'version-'+i,i<3?20:80);const attempt=put(ledger,'latest',100,{technique_id:lesson.id});assert.equal(ledger.attempts.length,150);assert.equal(attempt.comparison.change,80);assert.equal(learningSnapshot(ledger).skills[0].trend,7);
});
test('practice schema ignores model-supplied scores and bounds lesson text',()=>{
  const value=validatePractice({skill:'drawing',goal:'Try a clear outline',score:100,lesson:null,technique_id:null,evidence_file:null});assert.equal(value.score,undefined);
  assert.equal(validatePractice({skill:'A skill I invented myself',goal:'Choose my own experiment'}).skill,'A skill I invented myself');assert.throws(()=>validatePractice({skill:'',goal:'Try something'}));assert.throws(()=>validatePractice({skill:'drawing',goal:'a'.repeat(241)}));
});
