import {readCreation} from './workspace.js';
import {reviewArtifact} from './artifact-review.js';
import {emptyLearning,recordAttempt,proposeLesson,giveFeedback,learningSnapshot,validatePractice} from './learning-ledger.js';
export async function createLearning({load,save,creations,demo}){
  const ledger=await load('learning.json',emptyLearning());
  if(ledger.version!==1||!Array.isArray(ledger.attempts)||!Array.isArray(ledger.lessons))throw new Error('Invalid learning.json; back it up and repair it rather than erasing it.');
  return {
    snapshot(){const snapshot=learningSnapshot(ledger);return {...snapshot,skill_names:Object.fromEntries(snapshot.skills.map(s=>[s.skill,s.skill]))};},
    context(){const snapshot=learningSnapshot(ledger);return {goal:ledger.goal,skills:snapshot.skills.slice(-8),lessons:snapshot.lessons.filter(l=>!l.demo).slice(-5),recent_results:ledger.attempts.filter(a=>!a.demo).slice(-3).map(a=>({id:a.id,filename:a.filename,skill:a.skill,score:a.score,failed_checks:a.checks.filter(c=>!c.pass).map(c=>c.advice),feedback:a.feedback,goal:a.goal,comparison:a.comparison})),next_practice:ledger.attempts.filter(a=>!a.demo).at(-1)?.checks.filter(c=>!c.pass).map(c=>c.advice)||[]};},
    async apply(decision,{sources=[]}={}){
      const practice=validatePractice(decision.practice);
      if(practice)ledger.goal={skill:practice.skill,goal:practice.goal,at:new Date().toISOString()};
      const filename=decision.create_or_edit_file?.filename||(decision.task_update?.status==='completed'?decision.task_update.result_file:null);
      let outcome;
      if(filename){const content=await readCreation(creations,filename);const research=decision.task_update?.kind==='research';outcome=recordAttempt(ledger,{filename,content,review:reviewArtifact(filename,content,{research,sources,skill:practice?.skill||null}),practice,demo});}
      const lesson=proposeLesson(ledger,practice);
      if(practice||outcome||lesson)await save('learning.json',ledger);
      return outcome;
    },
    async feedback(payload){giveFeedback(ledger,payload);await save('learning.json',ledger);}
  };
}
