/* Standard daily-goal indicator; no separate settings card. */
(()=>{'use strict';if(window.__frGoalsStarted)return;window.__frGoalsStarted=true;
function paint(){if(!window.FRLearning)return;const s=FRLearning.summary(),value=s.day.answered||0;const goal=document.getElementById('dGoal'),fill=document.getElementById('dGoalFill'),smart=document.getElementById('smartGoal');if(goal)goal.textContent=Math.min(20,value)+'/20';if(fill)fill.style.width=Math.min(100,value/20*100)+'%';if(smart)smart.textContent='Daily goal '+Math.min(20,value)+'/20';}
Promise.resolve(window.FRLearning?.ready).then(paint);window.addEventListener('frlearningchange',paint);
})();
