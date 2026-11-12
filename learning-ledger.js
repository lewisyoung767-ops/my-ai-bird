import {randomUUID,createHash} from 'node:crypto';
export const contentHash=content=>createHash('sha256').update(content).digest('hex');
export const emptyLearning=()=>({version:1,attempts:[],lessons:[],goal:null});
export function validatePractice(value){
  if(value==null)return null;
  if(typeof value.skill!=='string'||!value.skill.trim()||value.skill.length>80||/[\x00-\x1f]/.test(value.skill)||typeof value.goal!=='string'||!value.goal.trim()||value.goal.length>240)throw new Error('Name a skill freely (up to 80 characters) and a practice goal (up to 240).');
  for(const [key,max]of [['technique_id',80],['lesson',400],['evidence_file',90]])if(value[key]!=null&&(typeof value[key]!=='string'||value[key].length>max))throw new Error('Invalid practice '+key);
  return {skill:value.skill.trim(),goal:value.goal.trim(),technique_id:value.technique_id||null,lesson:value.lesson||null,evidence_file:value.evidence_file||null};
}
export function recordAttempt(ledger,{filename,content,review,practice,demo=false}){
  const hash=contentHash(content);const existing=ledger.attempts.find(a=>a.hash===hash);
  if(existing)return {attempt:existing,duplicate:true};
  const lesson=ledger.lessons.find(l=>l.id===practice?.technique_id&&l.skill===review.skill);
  const baseline=lesson&&(ledger.attempts.find(a=>a.id===lesson.evidence_id)||lesson.baseline);
  const comparison=baseline&&!baseline.demo&&!demo&&baseline.rubric===review.rubric?{baseline_id:baseline.id,change:review.score-baseline.score}:null;
  const attempt={id:randomUUID(),filename,hash,at:new Date().toISOString(),...review,demo,goal:practice?.goal||null,technique_id:lesson?.id||null,comparison,feedback:null};
  ledger.attempts.push(attempt);ledger.attempts=ledger.attempts.slice(-150);return {attempt,duplicate:false};
}
export function proposeLesson(ledger,practice){
  if(!practice?.lesson)return null;
  const evidence=[...ledger.attempts].reverse().find(a=>a.filename===practice.evidence_file&&a.skill===practice.skill);
  if(!evidence)return null;
  const normalized=practice.lesson.trim().toLowerCase();const existing=ledger.lessons.find(l=>l.skill===practice.skill&&l.rule.toLowerCase()===normalized);
  if(existing)return existing;
  const lesson={id:randomUUID(),skill:practice.skill,rule:practice.lesson.trim(),evidence_id:evidence.id,baseline:{id:evidence.id,filename:evidence.filename,hash:evidence.hash,score:evidence.score,rubric:evidence.rubric,demo:evidence.demo},next_practice:practice.goal,at:new Date().toISOString(),demo:evidence.demo};ledger.lessons.push(lesson);ledger.lessons=ledger.lessons.slice(-60);return lesson;
}
export function giveFeedback(ledger,payload){
  if(!payload||!['helpful','needs_work'].includes(payload.rating)||typeof(payload.note||'')!=='string'||(payload.note||'').length>500)throw new Error('Choose Helpful or Needs work, with a note up to 500 characters.');
  const attempt=ledger.attempts.find(a=>a.id===payload.attempt_id);if(!attempt)throw new Error('That checked revision is no longer in the notebook.');
  attempt.feedback={rating:payload.rating,note:(payload.note||'').trim(),at:new Date().toISOString()};return attempt;
}
export function learningSnapshot(ledger){
  const lessons=ledger.lessons.map(lesson=>{
    const applied=ledger.attempts.filter(a=>a.technique_id===lesson.id&&!a.demo);const evidence=ledger.attempts.find(a=>a.id===lesson.evidence_id);
    const improved=applied.filter(a=>a.comparison?.change>0).length,regressed=applied.filter(a=>a.comparison?.change<0).length;
    const helpful=applied.filter(a=>a.feedback?.rating==='helpful').length,needs_work=applied.filter(a=>a.feedback?.rating==='needs_work').length;
    return {...lesson,evidence_file:evidence?.filename||lesson.baseline?.filename||null,improved,regressed,helpful,needs_work,status:needs_work||regressed?'revisit':helpful||improved>=2?'supported':'candidate'};
  });
  const summary=[...new Set(ledger.attempts.map(a=>a.skill).filter(Boolean))].map(skill=>{
    const attempts=ledger.attempts.filter(a=>a.skill===skill&&!a.demo);const last=attempts.at(-1);const comparable=attempts.filter(a=>a.rubric===last?.rubric);const mean=list=>list.reduce((n,a)=>n+a.score,0)/list.length;
    return {skill,attempts:attempts.length,latest_score:last?.score??null,trend:comparable.length>=6?Math.round(mean(comparable.slice(-3))-mean(comparable.slice(-6,-3))):null,helpful:attempts.filter(a=>a.feedback?.rating==='helpful').length,needs_work:attempts.filter(a=>a.feedback?.rating==='needs_work').length};
  });
  return {goal:ledger.goal,skills:summary,lessons,attempts:ledger.attempts};
}
