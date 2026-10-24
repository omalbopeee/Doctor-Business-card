import { profile } from './profile-config.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#info-dialog');
const tabs = ['profile', 'clinics', 'forum'];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const button = (text, action, style = 'dark', glyph = '') => `<button type="button" class="button button-${style}" data-action="${action}">${glyph ? icon(glyph) : ''}${text}</button>`;
const initials = name => name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
const storageKey = 'tapx-care-community-v1';
const seedThreads = [
  { id: 'follow-up-visits', category: 'Practice', title: 'Organising routine follow-up visits', excerpt: 'Ideas for reminders and clinic workflows.', author: 'Dr. R. Silva', initials: 'RS', time: '2h', body: 'How do you keep routine follow-up visits organised? I’m interested in ideas for appointment reminders and a clearer clinic workflow.', replies: [
    { author: 'Dr. A. Perera', initials: 'AP', body: 'A shared schedule and a short appointment reminder help our clinic team stay organised.', time: '1h' },
    { author: 'Dr. R. Silva', initials: 'RS', body: 'Thank you. Useful ideas to discuss with our team.', time: '1h' }
  ] },
  { id: 'professional-learning', category: 'Learning', title: 'Making time for professional learning', excerpt: 'Sharing ways to keep learning organised.', author: 'Dr. A. Perera', initials: 'AP', time: '5h', body: 'How do you make room for professional learning during a busy clinic week? Share a general organisational habit or a useful way to keep a learning schedule.', replies: [
    { author: 'Dr. R. Silva', initials: 'RS', body: 'A regular calendar slot and a shared reading list help our team keep track of learning sessions.', time: '3h' }
  ] },
  { id: 'new-doctors', category: 'Career', title: 'Supporting new doctors', excerpt: 'A thoughtful start to working with the clinic team.', author: 'Dr. N. Fernando', initials: 'NF', time: '1d', body: 'What helped you settle into a new clinic team? Share a general onboarding or mentoring idea that could support new colleagues.', replies: [] }
];
let community;
try { community = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { community = null; }
if (!community || !Array.isArray(community.threads) || !community.replies || typeof community.replies !== 'object') community = { threads: [], replies: {} };
community.threads = community.threads.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.body === 'string' && ['Practice', 'Learning', 'Career'].includes(t.category));
const state = { tab: 0, route: 'profile', filter: 'All', search: '', meeting: 'In person', selectedThread: null, request: null, appointmentDraft: null, discussionDraft: null, replyDraft: null };
let toastTimer;
let drag = null;
let suppressClickUntil = 0;
let lastFocus = null;


function allThreads() {
  return [...community.threads, ...seedThreads].map(t => ({ ...t, replies: [...(t.replies || []), ...(Array.isArray(community.replies[t.id]) ? community.replies[t.id] : [])] }));
}
function saveCommunity() {
  try { localStorage.setItem(storageKey, JSON.stringify(community)); return true; }
  catch { toast('Saved for this visit. Browser storage is unavailable.'); return false; }
}
function toast(message) {
  const el = document.querySelector('#toast');
  clearTimeout(toastTimer); el.textContent = message; el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3400);
}
function showDialog(title, message, actions = '') {
  lastFocus = document.activeElement;
  dialog.innerHTML = `<h2>${esc(title)}</h2><p>${esc(message)}</p>${actions}${button('Done', 'close-dialog', 'light')}`;
  dialog.showModal();
}
dialog.addEventListener('close', () => lastFocus?.focus?.({ preventScroll: true }));
dialog.addEventListener('click', event => {
  if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }
});
function header(title, back = 'profile', end = '') {
  return `<header class="topbar">${back ? `<button class="round-button" type="button" data-action="back" data-target="${back}" aria-label="Go back">${icon('back')}</button>` : '<span aria-hidden="true"></span>'}<div class="topbar-title">${title}</div><div class="topbar-end">${end}</div></header>`;
}
function profileView() {
  return `${header('Doctor profile', null, '<button class="round-button" data-action="profile-options" aria-label="Profile options">'+icon('more')+'</button>')}
    <section class="card profile-hero" aria-labelledby="profile-name"><div class="avatar">${esc(profile.initials)}</div><h1 id="profile-name" tabindex="-1">${esc(profile.name)}</h1><p class="profile-title">${esc(profile.title)}</p><p class="location">${icon('pin')}${esc(profile.location)}</p><p class="availability">${esc(profile.availability)}</p></section>
    <div class="profile-save">${button('Save contact','save-contact','dark','save')}</div>
    <div class="contact-grid" aria-label="Contact the clinic">${[['phone','Call clinic','call'],['whatsapp','WhatsApp','whatsapp'],['mail','Email','email'],['globe','Website','website']].map(([glyph,label,action])=>'<button class="contact-action '+action+'" data-action="contact" data-channel="'+action+'">'+icon(glyph)+'<span>'+label+'</span></button>').join('')}</div>
    <button class="card appointment-card" data-action="appointment"><span class="icon-tile teal">${icon('calendar')}</span><span><span class="row-heading">Request an appointment</span><span class="row-subtitle" style="display:block">Choose your clinic and preferred date</span></span>${icon('back','row-chevron')}</button>
    <button class="card visit-preview" data-action="clinics"><span class="eyebrow">Your next visit</span><span class="visit-row"><span>Clinic locations &amp; consulting times</span>${icon('back','row-chevron')}</span></button>`;
}
function clinicsView() {
  return `${header('Clinics','profile')}<h1 class="page-heading" tabindex="-1">Clinics &amp; availability</h1><section class="card group-card" aria-label="Clinic availability"><div class="list-row"><span class="icon-tile">${icon('stethoscope')}</span><div><h2 class="row-heading">General consultations</h2><p class="row-subtitle">Routine appointments with your doctor</p></div></div>${profile.clinics.map(clinic=>'<div class="list-row"><span class="icon-tile">'+icon('clinic')+'</span><div><h2 class="row-heading">'+esc(clinic.name)+'</h2><p class="row-subtitle">'+esc(clinic.address)+'</p></div></div>').join('')}<div class="list-row"><span class="icon-tile">${icon('clock')}</span><div><h2 class="row-heading">Consulting times</h2><p class="row-subtitle">${esc(profile.consultingTimes)}</p></div></div></section>
    <h2 class="eyebrow section-label">Clinic contact</h2><div class="card group-card contact-list"><div class="list-row">${icon('pin')}<div><h3 class="row-heading">Clinic address</h3><p class="row-subtitle">${esc(profile.address)}</p></div></div><a class="list-row" href="#" data-action="contact" data-channel="email">${icon('mail')}<div><h3 class="row-heading">Email the clinic</h3><p class="row-subtitle">${esc(profile.email)}</p></div></a><div class="list-row">${icon('calendar')}<div><h3 class="row-heading">Appointment options</h3><p class="row-subtitle">In person or by video call</p></div></div></div>
    <div class="languages"><h2>Languages</h2><p>${profile.languages.map(esc).join(' / ')}</p></div><div class="clinic-cta">${button('Request an appointment','appointment','dark','calendar')}</div>`;
}
function forumCards() {
  const query = state.search.trim().toLocaleLowerCase();
  const threads = allThreads().filter(t => (state.filter === 'All' || t.category === state.filter) && `${t.title} ${t.excerpt || ''} ${t.body} ${t.author}`.toLocaleLowerCase().includes(query));
  if (!threads.length) return `<div class="card empty-state"><h2>No discussions found</h2><p>Try another search or start a conversation.</p></div>`;
  return threads.map(t=>`<button class="card discussion-card" data-action="thread" data-id="${esc(t.id)}"><span class="discussion-meta"><span class="category-pill ${t.category.toLowerCase()}">${esc(t.category)}</span><span>${esc(t.time || 'Now')}</span></span><h2>${esc(t.title)}</h2><p>${esc(t.excerpt || t.body.slice(0, 90))}</p><span class="discussion-footer"><span class="small-avatar">${esc(t.initials || initials(t.author))}</span><span>${esc(t.author)}</span><span class="reply-count">${icon('forum')}${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}</span></span></button>`).join('');
}
function forumView() {
  return `${header('Community','profile',`<button class="member-badge" data-action="members">${icon('lock')}Doctors</button>`)}<h1 class="page-heading forum-heading" tabindex="-1">Doctors’ Forum</h1><label class="search-field">${icon('search')}<input type="search" id="forum-search" placeholder="Search discussions" aria-label="Search discussions" value="${esc(state.search)}" autocomplete="off"></label><div class="segments forum-filters" aria-label="Discussion categories">${['All','Practice','Learning','Career'].map(c=>`<button class="${state.filter === c ? 'active' : ''}" data-action="filter" data-filter="${c}" aria-pressed="${state.filter === c}">${c}</button>`).join('')}</div><div class="discussion-list" id="discussion-list" aria-live="polite">${forumCards()}</div><div class="forum-new">${button('New discussion','new-discussion','teal','plus')}</div><p class="local-note">Community preview · Your posts stay on this device.</p>`;
}
function renderMain() {
  app.innerHTML = `<div class="main-shell"><div class="tab-viewport"><div class="tab-track" style="--tab:${state.tab}">${[profileView(),clinicsView(),forumView()].map((html,i)=>`<main class="tab-panel" data-panel="${i}" ${i !== state.tab ? 'inert' : ''}>${html}</main>`).join('')}</div></div><nav class="tabbar" aria-label="Main navigation" style="--tab:${state.tab}">${[['user','Profile'],['stethoscope','Clinics'],['forum','Forum']].map(([glyph,label],i)=>`<button class="tab-button" data-action="tab" data-tab="${i}" ${state.tab === i ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></button>`).join('')}</nav></div>`;
}
function setTab(index, focus = true) {
  state.tab = index; state.route = tabs[index];
  const track = document.querySelector('.tab-track');
  if (!track) renderMain();
  else {
    track.style.setProperty('--tab',index);
    track.style.removeProperty('transform');
    track.classList.remove('is-dragging');
    document.querySelector('.tabbar').style.setProperty('--tab',index);
    document.querySelectorAll('.tab-panel').forEach((el,i)=>{ el.inert = i !== index; });
    document.querySelectorAll('.tab-button').forEach((el,i)=>{ if (i === index) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current'); });
  }
  document.title = `${['Doctor profile','Clinics','Doctors’ Forum'][index]} · ${profile.name}`;
  if (focus) document.querySelector(`[data-panel="${index}"] h1`)?.focus({ preventScroll: true });
}
function rememberDraft() {
  const appointment = document.querySelector('#appointment-form');
  if (appointment) state.appointmentDraft = Object.fromEntries(new FormData(appointment));
  const discussion = document.querySelector('#discussion-form');
  if (discussion) state.discussionDraft = Object.fromEntries(new FormData(discussion));
  const reply = document.querySelector('#reply-form');
  if (reply) state.replyDraft = { id: state.selectedThread, body: new FormData(reply).get('body') };
}
function restoreDraft(formId, draft) {
  if (!draft) return;
  const form = document.querySelector(formId);
  for (const [name, value] of Object.entries(draft)) { const field = form?.elements.namedItem(name); if (field && field.type !== 'file') field.value = value; }
}
function detail(content) {
  document.querySelector('.detail-screen')?.remove();
  document.querySelector('.main-shell').inert = true;
  const screen = document.createElement('main'); screen.className = 'detail-screen'; screen.innerHTML = content; app.append(screen);
  screen.querySelector('h1')?.setAttribute('tabindex','-1');
  screen.querySelector('h1')?.focus({ preventScroll: true });
}
function closeDetail() {
  const screen = document.querySelector('.detail-screen');
  if (screen) {
    const base = document.querySelector('.main-shell');
    screen.inert = true;
    if (!reducedMotion.matches) {
      const animation = screen.animate([{ opacity: 1, transform:'translateX(0)' },{ opacity:0,transform:'translateX(35px)' }],{duration:250,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
      animation.finished.then(()=>screen.remove()).catch(()=>screen.remove());
    } else screen.remove();
    base.inert = false;
  }
}
function navigate(route, replace = false) {
  const hash = '#' + route;
  if (location.hash === hash) renderRoute();
  else if (replace) { history.replaceState(null,'',hash); renderRoute(); }
  else location.hash = hash;
}
function renderRoute() {
  rememberDraft();
  let route;
  try { route = decodeURIComponent(location.hash.slice(1) || 'profile'); }
  catch { navigate('profile',true); return; }
  state.route = route;
  if (route === 'welcome') { navigate('profile', true); return; }
  if (tabs.includes(route)) {
    if (!document.querySelector('.main-shell')) { state.tab = tabs.indexOf(route); renderMain(); }
    closeDetail(); setTab(tabs.indexOf(route)); return;
  }
  if (!document.querySelector('.main-shell')) renderMain();
  if (route === 'appointment') renderAppointment();
  else if (route === 'request-ready' && state.request) renderConfirmation();
  else if (route === 'new-discussion') renderDiscussionForm();
  else if (route.startsWith('discussion/')) renderThread(route.slice(11));
  else if (route.startsWith('reply/')) renderReplyForm(route.slice(6));
  else navigate('profile',true);
}
function renderAppointment() {
  const today=new Date(); const localDate=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  detail(`${header('Appointment',tabs[state.tab])}<h1 class="detail-heading">Request an<br>appointment</h1><p class="detail-subtitle">Choose a clinic and tell us how to reach you.</p><form id="appointment-form"><div class="card form-group"><label class="field"><span>Patient name</span><input name="name" placeholder="Full name" autocomplete="name" required maxlength="100"></label><label class="field"><span>Phone</span><input name="phone" type="tel" placeholder="Your phone number" autocomplete="tel" required maxlength="40"></label><label class="field"><span>Email</span><input name="email" type="email" placeholder="you@example.com" autocomplete="email" required maxlength="200"></label><label class="field"><span>Clinic</span><select name="clinic" required><option value="" disabled selected>Choose a clinic</option>${profile.clinics.map(clinic=>'<option value="'+esc(clinic.id)+'">'+esc(clinic.name)+'</option>').join('')}</select></label><label class="field"><span>Preferred date</span><input name="date" type="date" aria-label="Preferred date" min="${localDate}" required></label></div><h2 class="eyebrow meeting-label">Appointment type</h2><div class="segments meeting-options" aria-label="Appointment type">${['In person','Video call'].map(meeting=>'<button type="button" data-action="meeting" data-meeting="'+meeting+'" class="'+(state.meeting===meeting?'active':'')+'" aria-pressed="'+(state.meeting===meeting)+'">'+meeting+'</button>').join('')}</div><label class="card summary-field"><span>Visit reason <em>(optional)</em></span><textarea name="summary" placeholder="A short note for the clinic" maxlength="3000"></textarea></label><label class="attachment" data-empty-label="Add a referral (optional)">${icon('clip')}<span>Add a referral (optional)</span><input type="file" name="document" aria-label="Add a referral" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"></label><button class="button button-teal" type="submit">Review appointment request</button><p class="form-footnote">Your clinic will confirm the appointment time after receiving your request.</p></form>`);
  restoreDraft('#appointment-form',state.appointmentDraft); document.title='Appointment · '+profile.name;
}
function requestText() {
  const r=state.request;
  return `Appointment request for ${profile.name}\n\nPatient name: ${r.name}\nPhone: ${r.phone}\nEmail: ${r.email}\nClinic: ${r.clinic}\nPreferred date: ${r.date}\nAppointment: ${r.meeting}\n\nVisit reason:\n${r.summary || 'No note provided.'}\n${r.filename ? '\nReferral to attach separately: '+r.filename+'\n' : ''}\nThe appointment time is subject to confirmation by the clinic.`;
}
function renderConfirmation() {
  const r=state.request;
  const formatted=new Date(r.date+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  detail(`${header('Appointment','appointment')}<section class="success-content"><div class="success-symbol">${icon('check')}</div><h1>Request ready</h1><p class="success-intro">Your appointment request is prepared.<br>Nothing has been sent yet.</p><div class="card summary-list"><div class="summary-row"><span>Doctor</span><strong>${esc(profile.name)}</strong></div><div class="summary-row"><span>Clinic</span><strong>${esc(r.clinic)}</strong></div><div class="summary-row"><span>Appointment</span><strong>${esc(r.meeting)}</strong></div><div class="summary-row"><span>Preferred date</span><strong>${esc(formatted)}</strong></div><div class="summary-row"><span>Time</span><strong>Awaiting confirmation</strong></div></div><div class="success-actions">${!profile.isDemo && validEmail(profile.email) ? button('Open email to send','email-request','teal','mail') : ''}${button('Download request','download-request','dark','download')}${button('Back to profile','profile','light')}${button('View clinic details','clinics','light')}</div><p class="form-footnote">${profile.isDemo ? 'Profile preview. Real clinic details are needed to send appointment requests.' : 'Send your request to the clinic to confirm a suitable time.'}${r.filename ? ' Attach your referral separately when sending.' : ''}</p></section>`);
  document.title='Request ready · '+profile.name;
}
function renderThread(id) {
  const t = allThreads().find(x=>x.id===id);
  if (!t) { navigate('forum',true); return; }
  state.selectedThread = id;
  detail(`${header('Discussion','forum',`<button class="round-button" data-action="share-thread" aria-label="Share discussion">${icon('more')}</button>`)}<article class="card thread-post"><span class="category-pill ${t.category.toLowerCase()}">${esc(t.category)}</span><h1>${esc(t.title)}</h1><div class="author-row"><span class="small-avatar">${esc(t.initials || initials(t.author))}</span><div><p class="author-name">${esc(t.author)}</p><p class="author-date">${esc(t.time || 'Now')}${t.local ? ' · On this device' : ' · Example discussion'}</p></div></div><p class="thread-body">${esc(t.body)}</p>${t.filename ? `<p class="local-note">Reference noted: ${esc(t.filename)} (file stays on your device)</p>` : ''}</article><h2 class="replies-heading">${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}</h2>${t.replies.map(r=>`<article class="card reply-card"><div class="author-row"><span class="small-avatar">${esc(r.initials || 'Y')}</span><span class="author-name">${esc(r.author)}</span><span class="author-date">${esc(r.time || 'Now')}</span></div><p>${esc(r.body)}</p>${r.filename ? `<p class="local-note">Reference noted: ${esc(r.filename)}</p>` : ''}</article>`).join('')}<button class="card thread-compose" data-action="reply" data-id="${esc(id)}"><span>Write a reply…</span><span class="send-icon">${icon('arrow')}</span></button><p class="local-note">Community preview · Replies stay on this device.</p>`);
  document.title = `${t.title} · Doctors’ Forum`;
}
function renderDiscussionForm() {
  detail(`${header('New discussion','forum')}<form class="compose-form" id="discussion-form"><h1 class="detail-heading">Share with colleagues</h1><p class="detail-subtitle">For the medical community.</p><label class="card compose-category"><span>Category</span><select name="category" aria-label="Category"><option>Practice</option><option>Learning</option><option>Career</option></select></label><input name="title" class="compose-title" placeholder="Discussion title" aria-label="Discussion title" required maxlength="140"><textarea name="body" class="compose-body" placeholder="Share a professional question, a learning resource or a clinic workflow idea." aria-label="Discussion content" required maxlength="6000"></textarea><label class="attachment">${icon('clip')}<span>Add a reference or resource</span><input type="file" name="reference" aria-label="Add a reference or resource" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"></label><p class="compose-guidance">Keep patient names and identifying details out of community discussions.<br>Posts in this preview stay on your device.</p><button class="button button-teal compose-submit" type="submit">Post discussion</button></form>`);
  restoreDraft('#discussion-form',state.discussionDraft); document.title = 'New discussion · Doctors’ Forum';
}
function renderReplyForm(id) {
  const t = allThreads().find(x=>x.id===id);
  if (!t) { navigate('forum',true); return; }
  state.selectedThread = id;
  detail(`${header('Write a reply',`discussion/${esc(id)}`)}<form class="compose-form" id="reply-form"><h1 class="detail-heading">Join the discussion</h1><div class="card reply-context"><p class="eyebrow">Replying to</p><h2>${esc(t.title)}</h2></div><textarea name="body" class="compose-body" placeholder="Write your reply…" aria-label="Your reply" required maxlength="6000"></textarea><label class="attachment">${icon('clip')}<span>Add a useful reference</span><input type="file" name="reference" aria-label="Add a useful reference" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"></label><p class="compose-guidance">Keep patient information confidential when discussing professional topics.<br>Replies in this preview stay on your device.</p><button type="submit" class="button button-teal compose-submit">Post reply</button></form>`);
  if (state.replyDraft?.id === id) restoreDraft('#reply-form', { body: state.replyDraft.body });
  document.title = 'Write a reply · Doctors’ Forum';
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function safeWebsite(value) { try { const url = new URL(value); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
function contact(channel) {
  const phone = (channel === 'whatsapp' ? profile.whatsapp : profile.phone).replace(/[^\d+]/g,'');
  if (channel === 'call' && phone) location.href = `tel:${phone}`;
  else if (channel === 'whatsapp' && phone) window.open(`https://wa.me/${phone.replace(/\D/g,'')}`,'_blank','noopener,noreferrer');
  else if (channel === 'email' && !profile.isDemo && validEmail(profile.email)) location.href = `mailto:${profile.email}`;
  else if (channel === 'website' && safeWebsite(profile.website)) window.open(safeWebsite(profile.website),'_blank','noopener,noreferrer');
  else showDialog(`${{call:'Call',whatsapp:'WhatsApp',email:'Email',website:'Website'}[channel]} details`, 'This contact option is not available in the sample profile. The clinic’s contact details will appear here once the profile is personalised.');
}
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content],{type}));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function saveContact() {
  const vesc = value => String(value).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const lines = ['BEGIN:VCARD','VERSION:3.0',`FN:${vesc(profile.name)}`,`N:${vesc(profile.name)};;;;`,`TITLE:${vesc(profile.title)}`,`ADR;TYPE=WORK:;;${vesc(profile.address)};;;;`];
  if (profile.phone) lines.push(`TEL;TYPE=WORK,VOICE:${vesc(profile.phone)}`);
  if (profile.email && !profile.isDemo) lines.push(`EMAIL;TYPE=WORK:${vesc(profile.email)}`);
  if (safeWebsite(profile.website)) lines.push(`URL:${safeWebsite(profile.website)}`);
  if (profile.isDemo) lines.push('NOTE:Sample doctor profile from the TAPX Care design. Replace details before use.');
  lines.push('END:VCARD');
  download(lines.join('\r\n')+'\r\n',`${profile.name.replace(/[^a-z0-9]+/gi,'-')}.vcf`,'text/vcard;charset=utf-8');
  toast('Contact card downloaded. Open it to add to contacts.');
}
async function shareProfile(thread = false) {
  if (dialog.open) dialog.close();
  const url = new URL(location.href); if (!thread) url.hash = 'profile';
  try {
    if (navigator.share) await navigator.share({ title: thread ? document.title : `${profile.name} · Care`, url: url.href });
    else if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(url.href); toast('Link copied.'); }
    else showDialog('Share this profile',url.href);
  } catch (error) { if (error.name !== 'AbortError') showDialog('Share this profile',url.href); }
}
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]'); if (!target) return;
  event.preventDefault();
  if (performance.now() < suppressClickUntil) return;
  const action = target.dataset.action;
  if (action === 'back') navigate(target.dataset.target);
  else if (action === 'tab') navigate(tabs[Number(target.dataset.tab)]);
  else if (['profile','clinics','forum','appointment','new-discussion'].includes(action)) navigate(action);
  else if (action === 'thread' || action === 'reply') navigate(`${action === 'thread' ? 'discussion' : 'reply'}/${target.dataset.id}`);
  else if (action === 'save-contact') saveContact();
  else if (action === 'contact') contact(target.dataset.channel);

  else if (action === 'members') showDialog('A space for the medical community','Explore the example discussions and join the conversation. In this preview, your new posts and replies are saved only in this browser and are visible on this device.');
  else if (action === 'profile-options') showDialog(profile.name,'Save this introduction or share a link to the profile.',`${button('Share profile','share','dark','share')}${button('Save contact','save-contact','light','save')}`);
  else if (action === 'close-dialog') dialog.close();
  else if (action === 'share') shareProfile();
  else if (action === 'share-thread') shareProfile(true);
  else if (action === 'filter') {
    state.filter = target.dataset.filter;
    document.querySelectorAll('.forum-filters button').forEach(el=>{ const active=el.dataset.filter===state.filter; el.classList.toggle('active',active); el.setAttribute('aria-pressed',active); });
    document.querySelector('#discussion-list').innerHTML = forumCards();
  } else if (action === 'meeting') {
    state.meeting = target.dataset.meeting;
    document.querySelectorAll('.meeting-options button').forEach(el=>{ const active=el.dataset.meeting===state.meeting; el.classList.toggle('active',active); el.setAttribute('aria-pressed',active); });
  } else if (action === 'download-request') { download(requestText(),'appointment-request.txt','text/plain;charset=utf-8'); toast('Request downloaded. Send it to your clinic to confirm a time.'); }
  else if (action === 'email-request' && !profile.isDemo && validEmail(profile.email)) location.href = `mailto:${profile.email}?subject=${encodeURIComponent('Appointment request — '+state.request.clinic)}&body=${encodeURIComponent(requestText())}`;
});
document.addEventListener('input', event => {
  if (event.target.id === 'forum-search') { state.search=event.target.value; document.querySelector('#discussion-list').innerHTML=forumCards(); }
  if (event.target.matches('textarea[required], input[required]')) event.target.setCustomValidity('');
});
document.addEventListener('change', event => {
  if (event.target.type !== 'file') return;
  const input = event.target; const file = input.files[0];
  if (file && file.size > 10*1024*1024) { input.value=''; toast('Choose a document smaller than 10 MB.'); return; }
  const label = input.closest('.attachment').querySelector('span');
  label.textContent = file ? file.name : (input.closest('.attachment').dataset.emptyLabel || 'Add a reference or resource');
  if (file) toast('Document selected. Files stay on your device.');
});
document.addEventListener('submit', event => {
  const form = event.target; event.preventDefault();
  if (!['appointment-form','discussion-form','reply-form'].includes(form.id)) return;
  for (const field of form.querySelectorAll('input[required]:not([type="date"]):not([type="email"]), textarea[required]')) { field.setCustomValidity(field.value.trim() ? '' : 'Please add a few words.'); }
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  if (form.id === 'appointment-form') {
    const file=data.get('document');
    state.request={name:data.get('name').trim(),email:data.get('email').trim(),phone:data.get('phone').trim(),clinic:profile.clinics.find(clinic=>clinic.id===data.get('clinic'))?.name || data.get('clinic'),date:data.get('date'),meeting:state.meeting,summary:data.get('summary').trim(),filename:file?.name || ''};
    navigate('request-ready');
  } else if (form.id === 'discussion-form') {
    const id=crypto.randomUUID();
    community.threads.unshift({id,category:data.get('category'),title:data.get('title').trim(),body:data.get('body').trim(),author:'You',initials:'Y',time:'Now',local:true,filename:data.get('reference')?.name || '',replies:[]});
    saveCommunity(); state.discussionDraft=null; form.reset(); refreshForum(); navigate(`discussion/${id}`); toast('Discussion posted on this device.');
  } else {
    const id=state.selectedThread;
    if (!Array.isArray(community.replies[id])) community.replies[id]=[];
    community.replies[id].push({author:'You',initials:'Y',body:data.get('body').trim(),time:'Now',filename:data.get('reference')?.name || ''});
    saveCommunity(); state.replyDraft=null; form.reset(); refreshForum(); navigate(`discussion/${id}`); toast('Reply posted on this device.');
  }
});
function refreshForum() {
  const panel=document.querySelector('[data-panel="2"]');
  if (panel) panel.innerHTML=forumView();
}

// Native vertical scrolling remains with the browser. Only deliberate horizontal
// gestures on non-interactive surfaces drive the tab track, one frame at a time.
app.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !tabs.includes(state.route) || event.target.closest('button,a,input,textarea,select,label')) return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,start:performance.now(),locked:false,width:app.clientWidth};
}, { passive:true });
app.addEventListener('pointermove', event => {
  if (!drag || drag.id!==event.pointerId) return;
  const dx=event.clientX-drag.x; const dy=event.clientY-drag.y;
  if (!drag.locked) {
    if (Math.abs(dy)>12 && Math.abs(dy)>Math.abs(dx)) { drag=null; return; }
    if (Math.abs(dx)<12 || Math.abs(dx)<Math.abs(dy)*1.2) return;
    drag.locked=true; app.setPointerCapture(event.pointerId);
    document.querySelector('.tab-track').classList.add('is-dragging');
    document.querySelectorAll('.tab-panel').forEach(el=>el.inert=false);
  }
  event.preventDefault();
  const edge=(state.tab===0 && dx>0)||(state.tab===2 && dx<0);
  drag.dx=edge ? dx*.2 : Math.max(-drag.width,Math.min(drag.width,dx));
  document.querySelector('.tab-track').style.transform=`translate3d(${-state.tab*drag.width+drag.dx}px,0,0)`;
}, { passive:false });
function finishSwipe(cancelled=false) {
  if (!drag) return;
  const gesture=drag; drag=null;
  if (!gesture.locked) return;
  suppressClickUntil=performance.now()+300;
  const velocity=Math.abs(gesture.dx)/Math.max(1,performance.now()-gesture.start);
  let next=state.tab;
  if (!cancelled && (Math.abs(gesture.dx)>gesture.width*.19 || (Math.abs(gesture.dx)>35 && velocity>.4))) next=Math.max(0,Math.min(2,state.tab+(gesture.dx<0?1:-1)));
  // Force the dragged transform to be committed before restoring the spring.
  document.querySelector('.tab-track').getBoundingClientRect();
  setTab(next,false);
  if (location.hash !== '#'+tabs[next]) history.pushState(null,'','#'+tabs[next]);
}
app.addEventListener('pointerup',()=>finishSwipe());
app.addEventListener('pointercancel',()=>finishSwipe(true));
app.addEventListener('lostpointercapture',()=>finishSwipe(true));
document.addEventListener('keydown',event=>{
  if (event.key === 'Escape' && !dialog.open && document.querySelector('.detail-screen')) { const back=document.querySelector('.detail-screen [data-action="back"]'); if (back) navigate(back.dataset.target); }
  if (!event.target.closest('.tabbar') || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?2:Math.max(0,Math.min(2,state.tab+(event.key==='ArrowRight'?1:-1)));
  navigate(tabs[next]);
  requestAnimationFrame(()=>document.querySelector(`[data-tab="${next}"]`)?.focus());
});
window.addEventListener('hashchange',renderRoute);
window.addEventListener('resize',()=>{ if(drag) finishSwipe(true); });
renderRoute();
