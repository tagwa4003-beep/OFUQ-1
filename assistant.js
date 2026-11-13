/* ===== مساعد أفق: دردشة (سحابي / WebLLM / Ollama) + قوالب جاهزة ===== */
const SYSTEM = 'أنت مساعد أفق الذكي. تساعد في كتابة المحتوى وتلخيصه وإعداد الخطابات والتقارير والامتحانات وشرح الدروس. أجب بلغة المستخدم بوضوح وتنظيم. لا تخترع مراجع أو مصادر أو أرقاماً؛ إن لم تكن متأكداً فقل ذلك صراحة.';
let engine = null, history = [{ role: 'system', content: SYSTEM }], busy = false;

/* تبويبات */
$$('.tabs button').forEach(b => b.onclick = () => { $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.p)); });

const CH = ['اكتب تقريراً عن الطاقة الشمسية بعناوين واضحة', 'لخّص هذا النص في 5 نقاط:', 'أنشئ امتحان 10 أسئلة اختيار من متعدد في العلوم للصف السادس مع نموذج الإجابة', 'اكتب خطاباً رسمياً لطلب إجازة', 'صحّح الأخطاء اللغوية في هذا النص:'];
$('#chips').innerHTML = CH.map(c => `<button type="button">${c}</button>`).join('');
$$('#chips button').forEach(b => b.onclick = () => { $('#inp').value = b.textContent + ' '; $('#inp').focus(); });

function modeChange() { const m = $('#mode').value; $('#web-box').style.display = m === 'web' ? '' : 'none'; $('#ol-box').style.display = m === 'ollama' ? '' : 'none'; }

async function testAi() {
  say('diag', 'جارٍ اختبار الاتصال...');
  try { const r = await aiChat([{ role: 'user', content: 'اكتب كلمة واحدة فقط: تمام' }]); say('diag', 'الاتصال يعمل ✓ (الرد: ' + r.trim().slice(0, 30) + ')', 'ok'); }
  catch (e) { say('diag', 'فشل الاتصال. الأسباب: ' + e.message + ' — جرّبي: تعطيل حاجب الإعلانات، السماح للنوافذ المنبثقة (لتسجيل Puter)، فتح الموقع من الرابط المنشور بدل الملف المحلي، أو تجربة شبكة أخرى. وفي الأثناء استخدمي «قوالب مستندات جاهزة».', 'err'); }
}

async function loadWeb() {
  if (!navigator.gpu) { say('ld', 'متصفحك لا يدعم WebGPU. استخدمي الوضع السحابي.', 'err'); return; }
  $('#loadbtn').disabled = true; $('#bar').style.display = 'block'; say('ld', 'جارٍ التحميل (مرة واحدة)...');
  try {
    const webllm = await import('https://esm.run/@mlc-ai/web-llm');
    engine = await webllm.CreateMLCEngine($('#wm').value, { initProgressCallback: p => { $('#bari').style.width = Math.round(p.progress * 100) + '%'; say('ld', p.text); } });
    say('ld', 'النموذج جاهز.', 'ok');
  } catch (e) { say('ld', 'فشل التحميل: ' + (e.message || e), 'err'); }
  $('#loadbtn').disabled = false;
}

function addMsg(cls, text) { const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; d.dir = 'auto'; $('#msgs').appendChild(d); $('#msgs').scrollTop = 1e9; return d; }
function addActs(d, text) {
  const a = document.createElement('div'); a.className = 'acts';
  a.innerHTML = '<button class="btn sm line" type="button">نسخ</button><button class="btn sm line" type="button">Word</button><button class="btn sm line" type="button">PDF</button>';
  const [c, w, p] = a.children;
  c.onclick = () => navigator.clipboard.writeText(text); w.onclick = () => sendToTool(text, 'text2word'); p.onclick = () => printAsPdf(text, 'OFUQ AI');
  d.appendChild(a);
}
const tick = out => t => { out.textContent = t; $('#msgs').scrollTop = 1e9; };

async function ask() {
  const out = addMsg('a', '...'), m = $('#mode').value; let full = '';
  if (m === 'cloud') full = await aiChat(history, tick(out));
  else if (m === 'web') {
    if (!engine) throw new Error('حمّلي النموذج أولاً من الخيارات المتقدمة');
    const s = await engine.chat.completions.create({ messages: history, stream: true });
    for await (const ch of s) { full += ch.choices[0]?.delta?.content || ''; tick(out)(full); }
  } else {
    const r = await fetch('http://localhost:11434/api/chat', { method: 'POST', body: JSON.stringify({ model: $('#om').value, messages: history, stream: true }) });
    const rd = r.body.getReader(), dec = new TextDecoder(); let tail = '';
    for (;;) { const { done, value } = await rd.read(); if (done) break; tail += dec.decode(value, { stream: true }); const ls = tail.split('\n'); tail = ls.pop(); ls.forEach(l => { if (l.trim()) try { full += JSON.parse(l).message?.content || ''; } catch (_) { } }); tick(out)(full); }
  }
  out.textContent = full; history.push({ role: 'assistant', content: full }); addActs(out, full);
}
$('#cf').onsubmit = async e => {
  e.preventDefault(); const v = $('#inp').value.trim(); if (!v || busy) return;
  addMsg('u', v); $('#inp').value = ''; history.push({ role: 'user', content: v }); busy = true; $('#sendb').disabled = true;
  try { await ask(); }
  catch (err) { console.error(err); history.pop(); const l = $('#msgs').lastChild; if (l && l.textContent === '...') l.remove(); addMsg('a', 'تعذر الحصول على رد.\nالسبب: ' + (err.message || err) + '\n\nاضغطي «اختبار الاتصال» أعلى الصفحة لمعرفة المشكلة، أو استخدمي «قوالب مستندات جاهزة» وهي تعمل دائماً.'); }
  busy = false; $('#sendb').disabled = false;
};
$('#inp').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#cf').requestSubmit(); } });

/* ===== القوالب الجاهزة (تعمل بدون ذكاء اصطناعي ولا إنترنت) ===== */
const today = () => new Date().toLocaleDateString('ar-EG');
const L = s => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
const num = s => L(s).map((x, i) => (i + 1) + '. ' + x).join('\n') || '1. ';
const TPL = {
  letter: { n: 'خطاب رسمي', f: [['to', 'الجهة / الشخص المرسل إليه'], ['sub', 'الموضوع'], ['body', 'نص الخطاب', 'ta'], ['from', 'اسم المرسل'], ['role', 'الصفة / الوظيفة'], ['date', 'التاريخ', 'date']],
    g: v => `التاريخ: ${v.date || today()}\n\nالسيد/ ${v.to} المحترم\n\nالسلام عليكم ورحمة الله وبركاته،،،\n\nالموضوع: ${v.sub}\n\n${v.body}\n\nوتفضلوا بقبول فائق الاحترام والتقدير،،،\n\n${v.from}\n${v.role}` },
  minutes: { n: 'محضر اجتماع', f: [['title', 'عنوان الاجتماع'], ['date', 'التاريخ', 'date'], ['place', 'المكان'], ['att', 'الحضور (اسم في كل سطر)', 'ta'], ['agenda', 'جدول الأعمال (بند في كل سطر)', 'ta'], ['dec', 'القرارات والتوصيات (قرار في كل سطر)', 'ta'], ['sec', 'أمين المحضر']],
    g: v => `# محضر اجتماع\n\n## ${v.title}\nالتاريخ: ${v.date || today()}\nالمكان: ${v.place}\n\n## الحضور\n${num(v.att)}\n\n## جدول الأعمال\n${num(v.agenda)}\n\n## القرارات والتوصيات\n${num(v.dec)}\n\nأمين المحضر: ${v.sec}\nالتوقيع: ..............` },
  report: { n: 'تقرير', f: [['title', 'عنوان التقرير'], ['org', 'الجهة المُعدّة'], ['period', 'الفترة'], ['intro', 'مقدمة', 'ta'], ['ach', 'الإنجازات (واحد في كل سطر)', 'ta'], ['chal', 'التحديات (واحد في كل سطر)', 'ta'], ['rec', 'التوصيات (واحد في كل سطر)', 'ta']],
    g: v => `# ${v.title}\n\nالجهة: ${v.org}\nالفترة: ${v.period}\n\n## المقدمة\n${v.intro}\n\n## الإنجازات\n${num(v.ach)}\n\n## التحديات\n${num(v.chal)}\n\n## التوصيات\n${num(v.rec)}\n\n## الخاتمة\n..............` },
  exam: { n: 'ورقة امتحان (قالب)', f: [['school', 'اسم المدرسة'], ['subj', 'المادة'], ['grade', 'الصف'], ['time', 'زمن الامتحان'], ['total', 'الدرجة الكلية'], ['q', 'عدد الأسئلة', 'n'], ['type', 'نوع الأسئلة', 's', ['اختيار من متعدد', 'صح وخطأ', 'أسئلة مقالية']]],
    g: v => { const n = Math.max(1, +v.q || 10); let o = `# ${v.school}\n## امتحان مادة ${v.subj} — ${v.grade}\nالزمن: ${v.time}      الدرجة الكلية: ${v.total}\nاسم الطالب: ...............................   الرقم: ..........\n\n`;
      for (let i = 1; i <= n; i++) o += v.type === 'اختيار من متعدد' ? `${i}) ....................................................\n   أ) ..........   ب) ..........   ج) ..........   د) ..........\n\n` : v.type === 'صح وخطأ' ? `${i}) ....................................................   ( )\n\n` : `${i}) ....................................................\n.....................................................................\n\n`;
      return o + '\nمع تمنياتنا لكم بالتوفيق\n\n(هذا قالب لكتابة أسئلتك. لتوليد الأسئلة نفسها استخدمي «الدردشة الذكية».)'; } },
  cv: { n: 'سيرة ذاتية', f: [['name', 'الاسم الكامل'], ['job', 'المسمى الوظيفي'], ['phone', 'الهاتف'], ['mail', 'البريد'], ['loc', 'المدينة / البلد'], ['sum', 'نبذة مختصرة', 'ta'], ['edu', 'المؤهلات (واحد في كل سطر)', 'ta'], ['exp', 'الخبرات (واحدة في كل سطر)', 'ta'], ['skills', 'المهارات (واحدة في كل سطر)', 'ta'], ['lang', 'اللغات']],
    g: v => `# ${v.name}\n${v.job}\n${[v.phone, v.mail, v.loc].filter(Boolean).join('  |  ')}\n\n## نبذة\n${v.sum}\n\n## المؤهلات العلمية\n${L(v.edu).map(x => '- ' + x).join('\n')}\n\n## الخبرات العملية\n${L(v.exp).map(x => '- ' + x).join('\n')}\n\n## المهارات\n${L(v.skills).map(x => '- ' + x).join('\n')}\n\n## اللغات\n${v.lang}` },
  plan: { n: 'خطة تنفيذية', f: [['title', 'عنوان الخطة'], ['goal', 'الهدف العام', 'ta'], ['acts', 'الأنشطة (نشاط في كل سطر)', 'ta'], ['who', 'الجهة المسؤولة'], ['dur', 'المدة الزمنية'], ['kpi', 'مؤشرات النجاح (واحد في كل سطر)', 'ta']],
    g: v => `# ${v.title}\n\n## الهدف العام\n${v.goal}\n\n## الأنشطة\n${num(v.acts)}\n\n## الجهة المسؤولة\n${v.who}\n\n## المدة الزمنية\n${v.dur}\n\n## مؤشرات النجاح\n${num(v.kpi)}` }
};
$('#tp-type').innerHTML = Object.keys(TPL).map(k => `<option value="${k}">${TPL[k].n}</option>`).join('');
function tplForm() {
  const t = TPL[$('#tp-type').value];
  $('#tp-form').innerHTML = t.f.map(([k, l, ty, opts]) => `<label>${l}</label>` + (ty === 'ta' ? `<textarea id="tf-${k}" dir="auto" style="min-height:90px"></textarea>` : ty === 's' ? `<select id="tf-${k}">${opts.map(o => `<option>${o}</option>`).join('')}</select>` : ty === 'n' ? `<input type="number" id="tf-${k}" value="10" min="1" max="100">` : ty === 'date' ? `<input type="text" id="tf-${k}" value="${today()}">` : `<input type="text" id="tf-${k}" dir="auto">`)).join('');
}
function tplMake() { const t = TPL[$('#tp-type').value], v = {}; t.f.forEach(([k]) => v[k] = $('#tf-' + k).value.trim()); $('#tp-out').value = t.g(v); }
tplForm();
