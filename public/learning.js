export function installLearning({socket,openCreation}){
  const $=id=>document.getElementById(id);
  socket.on('learning',notebook=>{
    const cards=$('skillCards');cards.replaceChildren();
    if(!notebook.skills.length)cards.textContent='No predefined subjects or skills. Pip can name any focus as it begins to practise.';
    const goal=notebook.goal;$('practiceGoal').textContent=goal?'Pip’s chosen practice: '+goal.goal:'Pip can choose an ability to practise on its next project.';
    for(const skill of notebook.skills){const card=document.createElement('article');card.className='skill-card';const title=document.createElement('h4');title.textContent=notebook.skill_names[skill.skill];const n=document.createElement('strong');n.textContent=skill.attempts;const label=document.createElement('span');label.textContent='distinct AI results reviewed';const checks=document.createElement('p');checks.textContent=skill.latest_score==null?'No real practice yet':'Latest technical checks: '+skill.latest_score+'%';const trend=document.createElement('small');trend.textContent=skill.trend==null?'Trend appears after 6 distinct results':`Recent checks: ${skill.trend>0?'+':''}${skill.trend} points vs previous 3 results`;const feedback=document.createElement('p');feedback.textContent=`Your feedback: ${skill.helpful} helpful / ${skill.needs_work} needs work`;card.append(title,n,label,checks,trend,feedback);cards.append(card);}
    const attempts=$('practiceHistory');attempts.replaceChildren();
    if(!notebook.attempts.length)attempts.textContent='Newly saved results will be checked here. A thought or practice plan alone is not counted.';
    for(const attempt of [...notebook.attempts].reverse().slice(0,8)){
      const row=document.createElement('article');row.className='practice-attempt';const heading=document.createElement('h4');heading.textContent=attempt.filename;const meta=document.createElement('small');meta.textContent=`${attempt.demo?'DEMO EXAMPLE / ':''}checked revision ${attempt.hash.slice(0,8)} / ${new Date(attempt.at).toLocaleString()}`;
      const summary=document.createElement('p');summary.textContent=`Technical checks: ${attempt.passed}/${attempt.total} passed. `+(attempt.goal?'Practice goal: '+attempt.goal:'');
      const details=document.createElement('details');const caption=document.createElement('summary');caption.textContent='Checks and next improvements';details.append(caption);
      for(const check of attempt.checks){const p=document.createElement('p');p.textContent=(check.pass?'Pass: ':'Try next: ')+(check.pass?check.label:check.advice);details.append(p);}
      for(const note of attempt.manual){const p=document.createElement('p');p.className='empty-note';p.textContent=note;details.append(p);}
      const open=document.createElement('button');open.textContent='Open current file';open.onclick=()=>openCreation(attempt.filename);
      const input=document.createElement('input');input.maxLength=500;input.placeholder='What worked, or what should Pip improve?';input.setAttribute('aria-label','Feedback for '+attempt.filename);input.value=attempt.feedback?.note||'';
      const buttons=document.createElement('div');buttons.className='learning-feedback';
      for(const [text,rating]of [['Helpful','helpful'],['Needs work','needs_work']]){const button=document.createElement('button');button.textContent=text;button.setAttribute('aria-pressed',String(attempt.feedback?.rating===rating));button.onclick=()=>socket.timeout(6000).emit('learning:feedback',{attempt_id:attempt.id,rating,note:input.value},(error,result)=>{$('learningStatus').textContent=error||result?.error?result?.error||'Feedback could not be saved. Please retry.':'Feedback saved. Pip will consider it in its next decision.';});buttons.append(button);}
      row.append(heading,meta,summary,details,open,input,buttons);attempts.append(row);
    }
    const lessons=$('learnedTechniques');lessons.replaceChildren();if(!notebook.lessons.length)lessons.textContent='Pip can propose techniques from reviewed work, then test them in later projects.';
    for(const lesson of [...notebook.lessons].reverse().slice(0,10)){const article=document.createElement('article');const label=document.createElement('small');label.textContent=(lesson.demo?'DEMO / ':'')+lesson.status.toUpperCase()+' / '+notebook.skill_names[lesson.skill];const rule=document.createElement('p');rule.textContent=lesson.rule;const evidence=document.createElement('p');evidence.className='empty-note';evidence.textContent=`Evidence: ${lesson.evidence_file||'historical revision'}; ${lesson.improved} improved check results, ${lesson.regressed} regressions; ${lesson.helpful} helpful ratings, ${lesson.needs_work} needs-work ratings.`;article.append(label,rule,evidence);lessons.append(article);}
  });
}
