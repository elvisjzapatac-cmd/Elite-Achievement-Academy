/* Elite Achievement Academy · Fase 4
 * Autenticación Supabase + progreso académico con permisos por perfil.
 * Requiere supabase-config.js y supabase-fase4.sql configurados.
 */
(() => {
  const cfg = window.EAA_SUPABASE_CONFIG || {};
  const ready = window.supabase && cfg.url && cfg.anonKey && !String(cfg.url).includes('YOUR_PROJECT') && !String(cfg.anonKey).includes('YOUR_SUPABASE');
  const db = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  let user = null, profile = null, rows = [], mode = 'register', answers = [], savedQuiz = false, recoveryMode = (window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('type') === 'recovery');
  const $ = id => document.getElementById(id);
  const es = () => document.documentElement.lang !== 'en';
  const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy = () => es() ? {
    title:'Crea tu perfil o inicia sesión',register:'Crear cuenta',login:'Iniciar sesión',name:'Nombre completo',email:'Correo electrónico',password:'Contraseña',grade:'Nivel académico',create:'Crear mi cuenta',enter:'Entrar',switchLogin:'¿Ya tienes cuenta? Inicia sesión',switchRegister:'¿No tienes cuenta? Regístrate',logout:'Cerrar sesión',welcome:'¡Bienvenido/a!',student:'Estudiante',teacher:'Profesor/a',admin:'Administrador/a',notConfigured:'Para activar cuentas reales, configura Supabase siguiendo LEEME-FASE4.txt.',note:'Las cuentas nuevas empiezan como estudiantes. El administrador asigna los perfiles docentes.',missing:'Completa todos los campos.',badEmail:'Escribe un correo válido.',weak:'La contraseña debe tener al menos 8 caracteres.',checkMail:'Cuenta creada. Revisa tu correo para confirmarla.',forgot:'¿Olvidaste tu contraseña?',sendReset:'Enviar enlace para restablecer contraseña',resetSent:'Si el correo está registrado, recibirás un enlace para restablecer la contraseña. Revisa también spam.',newPassword:'Nueva contraseña',savePassword:'Guardar nueva contraseña',passwordUpdated:'Contraseña actualizada correctamente.',changePassword:'Cambiar contraseña',resetTitle:'Recuperar contraseña',backLogin:'Volver a iniciar sesión',confirm:'Confirma tu correo antes de iniciar sesión.',profileError:'No se encontró el perfil. Comprueba que ejecutaste el SQL de Fase 4.',working:'Procesando…',statusIn:'Inicia sesión para consultar tu progreso.',statusStudent:'Tus resultados están guardados en la base de datos de tu cuenta.',statusTeacher:'Solo se muestran resultados de estudiantes vinculados por el administrador.',points:'Puntos acumulados',questions:'Preguntas respondidas',accuracy:'Precisión',achievements:'Mis logros',firstAchievement:'Primer paso',firstAchievementDesc:'Completaste tu primera actividad.',threeAchievement:'Constancia',threeAchievementDesc:'Completaste 3 actividades.',subjectsAchievement:'Explorador académico',subjectsAchievementDesc:'Practicaste 3 materias distintas.',perfectAchievement:'¡Excelente!',perfectAchievementDesc:'Lograste un resultado perfecto.',lockedAchievement:'Sigue practicando para desbloquear este logro.',recent:'Actividad reciente',subject:'Materia',activity:'Actividad',result:'Resultado',date:'Fecha',studentName:'Estudiante',gradeLabel:'Nivel',studentProgress:'Mi progreso académico',teacherProgress:'Progreso de mis estudiantes',refresh:'Actualizar',noResults:'Completa una práctica para ver aquí tus resultados.',noStudents:'Aún no hay estudiantes vinculados o resultados disponibles. El administrador debe vincularlos en Supabase.',saveError:'No se pudo guardar el resultado. Verifica la configuración de Supabase.',loadError:'No se pudo cargar el progreso. Comprueba el SQL y las políticas RLS.',linked:'Resultados de estudiantes vinculados',perPoints:'puntos',records:'registros',signInLink:'Inicia sesión en <a href="#account">tu cuenta</a> para guardar y consultar resultados.'
  } : {
    title:'Create your profile or sign in',register:'Create account',login:'Sign in',name:'Full name',email:'Email address',password:'Password',grade:'Academic level',create:'Create my account',enter:'Sign in',switchLogin:'Already have an account? Sign in',switchRegister:'No account yet? Register',logout:'Sign out',welcome:'Welcome!',student:'Student',teacher:'Teacher',admin:'Administrator',notConfigured:'To activate real accounts, configure Supabase using LEEME-FASE4.txt.',note:'New accounts start as students. An administrator assigns teacher profiles.',missing:'Please complete all fields.',badEmail:'Enter a valid email address.',weak:'Password must be at least 8 characters.',checkMail:'Account created. Check your email to confirm it.',forgot:'Forgot your password?',sendReset:'Send password reset link',resetSent:'If the email is registered, you will receive a password reset link. Check spam too.',newPassword:'New password',savePassword:'Save new password',passwordUpdated:'Password updated successfully.',changePassword:'Change password',resetTitle:'Reset password',backLogin:'Back to sign in',confirm:'Confirm your email before signing in.',profileError:'Profile not found. Make sure you ran the Phase 4 SQL.',working:'Working…',statusIn:'Sign in to view your progress.',statusStudent:'Your results are saved in your account database.',statusTeacher:'Only results for students linked by an administrator are shown.',points:'Total points',questions:'Questions answered',accuracy:'Accuracy',achievements:'My achievements',firstAchievement:'First step',firstAchievementDesc:'You completed your first activity.',threeAchievement:'Consistency',threeAchievementDesc:'You completed 3 activities.',subjectsAchievement:'Academic explorer',subjectsAchievementDesc:'You practiced 3 different subjects.',perfectAchievement:'Excellent!',perfectAchievementDesc:'You earned a perfect result.',lockedAchievement:'Keep practicing to unlock this achievement.',recent:'Recent activity',subject:'Subject',activity:'Activity',result:'Result',date:'Date',studentName:'Student',gradeLabel:'Grade',studentProgress:'My academic progress',teacherProgress:'My students’ progress',refresh:'Refresh',noResults:'Complete a quiz to see your results here.',noStudents:'No linked students or results yet. An administrator must link them in Supabase.',saveError:'Could not save this result. Check the Supabase setup.',loadError:'Could not load progress. Check SQL and RLS policies.',linked:'Linked students’ results',perPoints:'points',records:'records',signInLink:'Sign in to <a href="#account">your account</a> to save and view results.'
  };
  const subjects = () => es() ? {math:'Matemáticas',english:'Inglés',science:'Ciencias',reading:'Lectura',social:'Estudios sociales',geography:'Geografía',technology:'Tecnología',art:'Arte y creatividad',mixed:'General'} : {math:'Mathematics',english:'English',science:'Science',reading:'Reading',social:'Social Studies',geography:'Geography',technology:'Technology',art:'Art & Creativity',mixed:'General'};
  function renderAccount(message='') {
    const area=$('accountArea'); if(!area)return; const t=copy();
    document.querySelectorAll('[data-account-i18n="eyebrow"]').forEach(e=>e.textContent=t.welcome);
    document.querySelectorAll('[data-account-i18n="title"]').forEach(e=>e.textContent=t.title);
    if(!db){area.innerHTML=`<p class="account-message" role="status">${safe(t.notConfigured)}</p><p class="account-small-note">${safe(t.note)}</p>`;renderDashboard();return;}
    if(recoveryMode && !user){
      area.innerHTML=`<div class="account-tabs"><button type="button" class="active">${safe(t.resetTitle)}</button></div><p class="account-message" role="status">${safe(es()?'El enlace llegó, pero no se pudo validar la sesión de recuperación. Solicita un enlace nuevo y ábrelo desde el mismo navegador.':'The link opened, but the recovery session could not be validated. Request a new link and open it in the same browser.')}</p><button class="button button-small" type="button" id="phase4RecoveryBack">${safe(t.backLogin)}</button>`;
      $('phase4RecoveryBack').addEventListener('click',()=>{recoveryMode=false;window.history.replaceState({},document.title,window.location.pathname+window.location.search);mode='login';renderAccount();});
      return;
    }
    if(recoveryMode && user){
      area.innerHTML=`<div class="account-tabs"><button type="button" class="active">${safe(t.resetTitle)}</button></div><form id="phase4PasswordForm" class="account-form"><label>${safe(t.newPassword)}<input name="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="100" required></label><button class="button" type="submit">${safe(t.savePassword)}</button></form><p class="account-message" id="phase4AccountMessage" role="status">${safe(message)}</p>`;
      $('phase4PasswordForm').addEventListener('submit',async ev=>{ev.preventDefault();const form=ev.currentTarget,btn=form.querySelector('button[type="submit"]'),out=$('phase4AccountMessage'),password=String(new FormData(form).get('newPassword')||'');if(password.length<8){out.textContent=t.weak;return;}btn.disabled=true;out.textContent=t.working;try{const {error}=await db.auth.updateUser({password});if(error)throw error;recoveryMode=false;try{window.history.replaceState({},document.title,window.location.pathname+window.location.search);}catch(_){}await loadProfile();renderAccount(t.passwordUpdated);}catch(err){out.textContent=err?.message||t.profileError;}finally{if(document.body.contains(btn))btn.disabled=false;}});
      return;
    }
    if(user && !profile){
      area.innerHTML=`<div class="account-profile"><div class="account-avatar">✓</div><div class="account-profile-copy"><h4>${safe(es()?'Sesión iniciada':'Signed in')}</h4><p>${safe(user.email||'')}</p></div><span class="account-session-badge">${safe(es()?'SESIÓN ACTIVA':'ACTIVE SESSION')}</span></div><p class="account-message" role="status">${safe(es()?'Tu inicio de sesión funcionó, pero no se pudo cargar tu perfil académico. Puede faltar el registro en la tabla profiles o una política de acceso.':'Sign-in succeeded, but your academic profile could not be loaded. The profiles row or access policy may be missing.')}</p><button class="button button-small" type="button" id="phase4Logout">${safe(t.logout)}</button>`;
      $('phase4Logout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error){renderAccount(error.message);return;}user=null;profile=null;rows=[];recoveryMode=false;renderAccount();renderDashboard();});
      renderDashboard();return;
    }
    if(user && profile){
      const name=profile.full_name||user.email||t.welcome, role=t[profile.role]||t.student;
      area.innerHTML=`<div class="account-profile"><div class="account-avatar">${safe(name.trim().charAt(0).toUpperCase())}</div><div class="account-profile-copy"><h4>${safe(t.welcome)} ${safe(name)}</h4><p>${safe(es()?'Sesión iniciada correctamente':'You are signed in')}</p></div><span class="account-session-badge">${safe(es()?'SESIÓN ACTIVA':'ACTIVE SESSION')}</span></div><dl class="account-details"><div><dt>${safe(t.email||'Email')}</dt><dd>${safe(user.email||'')}</dd></div><div><dt>${safe(es()?'Perfil':'Role')}</dt><dd>${safe(role)}</dd></div><div><dt>${safe(t.gradeLabel)}</dt><dd>${safe(profile.grade||'—')}</dd></div></dl><form id="phase4PasswordForm" class="account-form account-password-form"><h4>${safe(t.changePassword)}</h4><label>${safe(t.newPassword)}<input name="newPassword" type="password" autocomplete="new-password" minlength="8" maxlength="100" required></label><button class="button button-small" type="submit">${safe(t.savePassword)}</button></form><button class="button button-small" type="button" id="phase4Logout">${safe(t.logout)}</button>${message?`<p class="account-message" role="status">${safe(message)}</p>`:''}`;
      $('phase4PasswordForm').addEventListener('submit',async ev=>{ev.preventDefault();const form=ev.currentTarget,btn=form.querySelector('button[type="submit"]'),out=$('phase4AccountMessage');btn.disabled=true;try{const password=String(new FormData(form).get('newPassword')||'');if(password.length<8)throw new Error(t.weak);const {error}=await db.auth.updateUser({password});if(error)throw error;form.reset();let msg=area.querySelector('.account-message');if(!msg){msg=document.createElement('p');msg.className='account-message';msg.setAttribute('role','status');area.appendChild(msg);}msg.textContent=t.passwordUpdated;}catch(err){let msg=area.querySelector('.account-message');if(!msg){msg=document.createElement('p');msg.className='account-message';msg.setAttribute('role','status');area.appendChild(msg);}msg.textContent=err?.message||t.profileError;}finally{btn.disabled=false;}});
      $('phase4Logout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error){renderAccount(error.message);return;}user=null;profile=null;rows=[];recoveryMode=false;renderAccount();renderDashboard();});
      renderDashboard(); return;
    }
    const registering=mode==='register', recovering=mode==='recovery';
    const gradeOptions=Array.from($('gradeSelect')?.options||[]).map(o=>`<option value="${safe(o.textContent)}">${safe(o.textContent)}</option>`).join('');
    area.innerHTML=`<div class="account-tabs"><button type="button" class="${registering?'active':''}" data-p4-mode="register">${safe(t.register)}</button><button type="button" class="${!registering&&!recovering?'active':''}" data-p4-mode="login">${safe(t.login)}</button></div>${recovering?`<h4>${safe(t.resetTitle)}</h4>`:''}<form id="phase4AccountForm" class="account-form" novalidate>${registering?`<label>${safe(t.name)}<input name="name" autocomplete="name" maxlength="70" required></label>`:''}<label>${safe(t.email||'Email')}<input name="email" type="email" autocomplete="email" maxlength="160" required></label>${!recovering?`<label>${safe(t.password)}<input name="password" type="password" autocomplete="${registering?'new-password':'current-password'}" minlength="8" maxlength="100" required></label>`:''}${registering?`<label>${safe(t.grade)}<select name="grade">${gradeOptions}</select></label>`:''}<button class="button" type="submit">${safe(recovering?t.sendReset:registering?t.create:t.enter)}</button></form>${!recovering&&!registering?`<p class="account-switch"><button type="button" id="phase4Forgot">${safe(t.forgot)}</button></p>`:''}<p class="account-switch"><button type="button" data-p4-mode="${registering?'login':'register'}">${safe(registering?t.switchLogin:t.switchRegister)}</button>${recovering?` <button type="button" data-p4-mode="login">${safe(t.backLogin)}</button>`:''}</p><p class="account-message" id="phase4AccountMessage" role="status">${safe(message)}</p><p class="account-small-note">${safe(t.note)}</p>`;
    area.querySelectorAll('[data-p4-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.p4Mode;renderAccount();}));
    $('phase4Forgot')?.addEventListener('click',()=>{mode='recovery';renderAccount();});
    $('phase4AccountForm').addEventListener('submit',async ev=>{
      ev.preventDefault(); const form=ev.currentTarget,d=new FormData(form),name=String(d.get('name')||'').trim(),email=String(d.get('email')||'').trim().toLowerCase(),password=String(d.get('password')||''),grade=String(d.get('grade')||'');const out=$('phase4AccountMessage'),show=m=>{if(out)out.textContent=m;};
      if(!email||(registering&&!password)||(registering&&(!name||!grade))||(!recovering&&!registering&&!password)){show(t.missing);return;}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){show(t.badEmail);return;}if(registering&&password.length<8){show(t.weak);return;}
      const btn=form.querySelector('button[type="submit"]');btn.disabled=true;show(t.working);
      try{
        if(recovering){const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:'https://elvisjzapatac-cmd.github.io/Elite-Achievement-Academy/'});if(error)throw error;show(t.resetSent);}
        else if(registering){const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name,grade},emailRedirectTo:'https://elvisjzapatac-cmd.github.io/Elite-Achievement-Academy/'}});if(error)throw error;if(data.session){user=data.user;await loadProfile();renderAccount(t.checkMail);}else show(t.checkMail);}
        else {const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;await loadProfile();if(!profile){show(t.profileError);return;}renderAccount();await loadProgress();}
      }catch(err){show(err?.message||t.profileError);}finally{if(document.body.contains(btn))btn.disabled=false;}
    });
    renderDashboard();
  }
  async function loadProfile(){profile=null;if(!db||!user){syncRoleSelector();return;}const {data,error}=await db.from('profiles').select('id,full_name,role,grade').eq('id',user.id).maybeSingle();if(!error)profile=data;syncRoleSelector();}
  function syncRoleSelector(){const select=$('roleSelect');if(!select)return;if(user&&profile&&['student','teacher','admin'].includes(profile.role)){select.value=profile.role;select.disabled=true;}else select.disabled=false;}
  async function loadProgress(){
    if(!db||!user||!profile){rows=[];renderDashboard();return;}
    const {data,error}=await db.from('progress_records').select('id,student_id,subject,activity,score,total,points,created_at').order('created_at',{ascending:false}).limit(200);
    if(error){rows=[];renderDashboard(copy().loadError);return;}rows=data||[];
    if(profile.role==='teacher'||profile.role==='admin'){
      const ids=[...new Set(rows.map(r=>r.student_id))];if(ids.length){const {data:people}=await db.from('profiles').select('id,full_name,grade').in('id',ids);const map=new Map((people||[]).map(p=>[p.id,p]));rows=rows.map(r=>({...r,student:map.get(r.student_id)}));}
    }
    renderDashboard();
  }
  function renderDashboard(message=''){
    const status=$('progressStatus'),metrics=$('progressMetrics'),achievements=$('progressAchievements'),bySubject=$('progressSubjects'),table=$('progressTableWrap');if(!status||!metrics||!bySubject||!table)return;const t=copy(),isEs=es();
    if($('progressEyebrow'))$('progressEyebrow').textContent=isEs?'FASE 4 · SEGUIMIENTO ACADÉMICO':'PHASE 4 · ACADEMIC TRACKING';
    if($('progressDashboardTitle'))$('progressDashboardTitle').textContent=profile?.role==='teacher'?t.teacherProgress:t.studentProgress;
    if($('progressDashboardDesc'))$('progressDashboardDesc').textContent=isEs?'Resultados sincronizados con tu cuenta y protegidos por permisos de perfil.':'Results synced to your account and protected by role-based permissions.';
    if($('refreshProgress'))$('refreshProgress').textContent=t.refresh;metrics.innerHTML='';if(achievements)achievements.innerHTML='';bySubject.innerHTML='';table.innerHTML='';
    if(!db){status.textContent=t.notConfigured;return;}if(!user||!profile){status.innerHTML=message||t.signInLink;return;}if(message){status.textContent=message;return;}
    const points=rows.reduce((n,r)=>n+Number(r.points||0),0),correct=rows.reduce((n,r)=>n+Number(r.score||0),0),total=rows.reduce((n,r)=>n+Number(r.total||0),0);
    status.textContent=profile.role==='teacher'||profile.role==='admin'?t.statusTeacher:t.statusStudent;
    metrics.innerHTML=[[t.points,String(points)],[t.questions,String(total)],[t.accuracy,`${total?Math.round(correct/total*100):0}%`]].map(([label,value])=>`<article class="progress-metric"><span>${safe(label)}</span><strong>${safe(value)}</strong></article>`).join('');
    if(achievements && profile.role==='student'){const distinctSubjects=new Set(rows.map(r=>r.subject).filter(Boolean)).size;const perfect=rows.some(r=>Number(r.total)>0&&Number(r.score)===Number(r.total));const cards=[{icon:'🌱',title:t.firstAchievement,desc:t.firstAchievementDesc,earned:rows.length>=1},{icon:'⭐',title:t.threeAchievement,desc:t.threeAchievementDesc,earned:rows.length>=3},{icon:'📚',title:t.subjectsAchievement,desc:t.subjectsAchievementDesc,earned:distinctSubjects>=3},{icon:'🏆',title:t.perfectAchievement,desc:t.perfectAchievementDesc,earned:perfect}];achievements.innerHTML=`<h4>${safe(t.achievements)}</h4><div class="achievement-grid">${cards.map(a=>`<article class="achievement-card ${a.earned?'earned':'locked'}"><span class="achievement-icon" aria-hidden="true">${a.icon}</span><div><strong>${safe(a.title)}</strong><p>${safe(a.earned?a.desc:t.lockedAchievement)}</p></div><span class="achievement-state">${a.earned?'✓':'🔒'}</span></article>`).join('')}</div>`;}
    const grouped={};rows.forEach(r=>{const k=r.subject||'mixed';grouped[k]??={count:0,score:0,total:0,points:0};grouped[k].count++;grouped[k].score+=Number(r.score||0);grouped[k].total+=Number(r.total||0);grouped[k].points+=Number(r.points||0);});const labels=subjects();
    bySubject.innerHTML=Object.entries(grouped).length?Object.entries(grouped).map(([k,v])=>{const pct=v.total?Math.round(v.score/v.total*100):0;return `<article class="progress-subject"><div><strong>${safe(labels[k]||k)}</strong><span>${pct}%</span></div><div class="progress-track"><span style="width:${pct}%"></span></div><small>${v.points} ${safe(t.perPoints)} · ${v.count} ${safe(t.records)}</small></article>`;}).join(''):`<p class="progress-empty">${safe(t.noResults)}</p>`;
    if(profile.role==='teacher'||profile.role==='admin'){
      const linked=rows.filter(r=>r.student_id!==user.id);
      table.innerHTML=`<h4>${safe(t.linked)}</h4>`+(linked.length?`<div class="progress-table-scroll"><table><thead><tr><th>${safe(t.studentName)}</th><th>${safe(t.gradeLabel)}</th><th>${safe(t.subject)}</th><th>${safe(t.result)}</th><th>${safe(t.date)}</th></tr></thead><tbody>${linked.map(r=>`<tr><td>${safe(r.student?.full_name||t.student)}</td><td>${safe(r.student?.grade||'—')}</td><td>${safe(labels[r.subject]||r.subject)}</td><td>${Number(r.score||0)}/${Number(r.total||0)} · ${Number(r.points||0)} pts</td><td>${new Date(r.created_at).toLocaleDateString(isEs?'es-DO':'en-US')}</td></tr>`).join('')}</tbody></table></div>`:`<p class="progress-empty">${safe(t.noStudents)}</p>`);
    }else{
      table.innerHTML=`<h4>${safe(t.recent)}</h4>`+(rows.length?`<div class="progress-table-scroll"><table><thead><tr><th>${safe(t.subject)}</th><th>${safe(t.activity)}</th><th>${safe(t.result)}</th><th>${safe(t.points)}</th><th>${safe(t.date)}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(labels[r.subject]||r.subject)}</td><td>${safe(r.activity)}</td><td>${Number(r.score||0)}/${Number(r.total||0)}</td><td>${Number(r.points||0)}</td><td>${new Date(r.created_at).toLocaleDateString(isEs?'es-DO':'en-US')}</td></tr>`).join('')}</tbody></table></div>`:`<p class="progress-empty">${safe(t.noResults)}</p>`);
    }
  }
  async function saveQuiz(){
    if(savedQuiz || !db || !user || !profile || profile.role!=='student')return;
    const result=answers.filter(Boolean);if(!result.length)return;
    savedQuiz=true;
    for(const a of result){const {error}=await db.rpc('record_quiz_answer',{question_number:a.question,selected_option:a.selectedOption});if(error){savedQuiz=false;const st=$('progressStatus');if(st)st.textContent=copy().saveError;return;}}await loadProgress();
  }
  // Capture each answer by its original question number, even in subject-specific quizzes.
  if(typeof selectAnswer==='function'){
    const original=selectAnswer;selectAnswer=function(i){const q=activeQuestions[currentQuestion];const originalNumber=questions.indexOf(q)+1;answers[currentQuestion]={subject:q?.subject||'mixed',correct:q?.correct===i,selectedOption:i,question:originalNumber};return original(i);};
  }
  $('nextQuestion')?.addEventListener('click',()=>{if(currentQuestion===activeQuestions.length-1&&chosenAnswer!==null)saveQuiz();});
  $('restartQuiz')?.addEventListener('click',()=>{answers=[];savedQuiz=false;});
  document.querySelectorAll('[data-choose]').forEach(el=>el.addEventListener('click',()=>{answers=[];savedQuiz=false;}));
  // Phase 5: save completed worksheets to the signed-in student's Supabase progress.
  window.addEventListener('eaa:worksheet-completed', async (event) => {
    const dialog = $('activityDialog');
    const detail = event.detail || {};
    const status = $('progressStatus');
    if (!dialog || dialog.dataset.worksheetSaved === 'true' || dialog.dataset.worksheetSaving === 'true') return;
    if (!db || !user || !profile || profile.role !== 'student') {
      if (status) status.textContent = es() ? 'Inicia sesión como estudiante para guardar esta ficha en tu progreso.' : 'Sign in as a student to save this worksheet to your progress.';
      return;
    }
    dialog.dataset.worksheetSaving = 'true';
    try {
      const { error } = await db.from('progress_records').insert({
        student_id: user.id,
        subject: ['math','english','reading'].includes(detail.subject) ? detail.subject : 'mixed',
        activity: `Ficha educativa · ${String(detail.title || 'Actividad').slice(0, 100)}`,
        score: Math.max(0, Math.min(Number(detail.score) || 0, Number(detail.total) || 1)),
        total: Math.max(1, Number(detail.total) || 1),
        points: Math.max(0, Number(detail.score) || 0) * 10
      });
      if (error) throw error;
      dialog.dataset.worksheetSaved = 'true';
      if (status) status.textContent = es() ? '¡Ficha guardada en tu progreso académico!' : 'Worksheet saved to your academic progress!';
      await loadProgress();
    } catch (error) {
      if (status) status.textContent = copy().saveError;
      console.error('No se pudo guardar la ficha educativa:', error);
    } finally {
      dialog.dataset.worksheetSaving = 'false';
    }
  });
  $('refreshProgress')?.addEventListener('click',loadProgress);
  // Override the prototype's local-only account UI before the page is interactive.
  renderAccountArea=renderAccount;
  syncRoleSelector();
  if(db){db.auth.getSession().then(async({data})=>{user=data.session?.user||null;await loadProfile();renderAccount();await loadProgress();if(typeof renderPortal==='function')renderPortal();});db.auth.onAuthStateChange((event,session)=>{Promise.resolve().then(async()=>{if(event==='PASSWORD_RECOVERY'){recoveryMode=true;mode='login';}user=session?.user||null;await loadProfile();renderAccount();await loadProgress();if(typeof renderPortal==='function')renderPortal();});});}
  renderAccount();renderDashboard();
})();
