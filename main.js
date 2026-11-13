/* ===== أفق — الوظائف المشتركة ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isEn = () => document.documentElement.lang === 'en';
const t = (ar, en) => (isEn() ? en : ar);

/* اللغة */
(function () {
  const saved = localStorage.getItem('ofuq-lang') || 'ar';
  document.documentElement.lang = saved;
  document.documentElement.dir = saved === 'en' ? 'ltr' : 'rtl';
})();
function setLang(l) {
  localStorage.setItem('ofuq-lang', l);
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'en' ? 'ltr' : 'rtl';
  $$('[data-ph-ar]').forEach(e => e.placeholder = l === 'en' ? e.dataset.phEn : e.dataset.phAr);
}

/* أدوات مساعدة */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function textToDocBlob(text, title) {
  const rtl = /[\u0600-\u06FF]/.test(text);
  const body = text.split(/\n/).map(l => `<p>${esc(l) || '&nbsp;'}</p>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title || 'OFUQ')}</title></head><body dir="${rtl ? 'rtl' : 'ltr'}" style="font-family:Arial,Tahoma;font-size:14pt;line-height:1.6">${body}</body></html>`;
  return new Blob(['\ufeff', html], { type: 'application/msword' });
}
function printAsPdf(text, title) {
  const rtl = /[\u0600-\u06FF]/.test(text);
  const w = window.open('', '_blank');
  if (!w) { alert(t('اسمح بالنوافذ المنبثقة ثم أعد المحاولة', 'Allow pop-ups and try again')); return; }
  w.document.write(`<!doctype html><html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${esc(title || 'OFUQ')}</title><style>body{font-family:Arial,Tahoma;font-size:14pt;line-height:1.7;margin:2cm;white-space:pre-wrap}</style></head><body>${esc(text)}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
}
function say(id, msg, kind) { const e = document.getElementById(id); if (e) { e.textContent = msg; e.className = 'status ' + (kind || ''); } }
function waLink(msg) { return `https://wa.me/${OFUQ.whatsapp}?text=${encodeURIComponent(msg)}`; }


/* الأيقونات */
const ICONS = {
  file:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  slides:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  cap:'<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  palette:'<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 22 11c0-5-4.5-9-10-9z"/>',
  code:'<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  building:'<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  qr:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
  ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  merge:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  split:'<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  zap:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  text:'<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M16 7l3 3"/>',
  count:'<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  clean:'<path d="M3 21h18M5 21V10l7-6 7 6v11"/><path d="M10 21v-6h4v6"/>',
  wa:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1-1.5-2-1-.8.8c-.8-.4-1.6-1.2-2-2l.8-.8-1-2z"/>'
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* الخدمات */
const SERVICES = [
  { k: 'docs', i: 'file', ar: 'المستندات والملفات', en: 'Documents & Files',
    da: 'تحويل ودمج وتقسيم وضغط ملفات PDF وWord.', de: 'Convert, merge, split and compress PDF and Word files.',
    items: ['PDF إلى Word', 'Word إلى PDF', 'الصور إلى PDF', 'PDF إلى صور', 'دمج وتقسيم PDF', 'ضغط PDF', 'استخراج النص وOCR'], tool: 'merge' },
  { k: 'writing', i: 'pen', ar: 'إنشاء المستندات والكتابة', en: 'Document Creation',
    da: 'خطابات وسير ذاتية وتقارير ومحاضر اجتماعات جاهزة.', de: 'Letters, CVs, reports and meeting minutes.',
    items: ['خطاب رسمي', 'سيرة ذاتية CV', 'تقارير شهرية وسنوية', 'محاضر الاجتماعات', 'الخطط التنفيذية', 'صفحة الغلاف والفهرس', 'تنسيق الجداول والمراجع'], tool: 'text2word' },
  { k: 'ppt', i: 'slides', ar: 'العروض التقديمية', en: 'Presentations',
    da: 'عروض PowerPoint منظمة بقوالب أكاديمية وإدارية وتجارية.', de: 'Structured PowerPoint decks in academic, business and admin styles.',
    items: ['قالب أكاديمي', 'قالب طبي', 'قالب تعليمي', 'قالب إداري', 'قالب أعمال وشركات', 'قالب تقارير ومشاريع'], tool: 'ppt' },
  { k: 'edu', i: 'cap', ar: 'الخدمات التعليمية', en: 'Education',
    da: 'للمدارس والمعلمين والطلاب.', de: 'For schools, teachers and students.',
    items: ['إعداد الامتحانات ونماذج الإجابة', 'أوراق العمل والواجبات', 'الملخصات وبنوك الأسئلة', 'شهادات التقدير', 'الجداول والخطط الدراسية', 'القصص والأنشطة التعليمية'], tool: 'ai' },
  { k: 'academic', i: 'book', ar: 'الخدمات الأكاديمية والبحثية', en: 'Academic & Research',
    da: 'تنسيق البحوث ومشاريع التخرج وتوثيق المراجع بمصادر حقيقية فقط.', de: 'Thesis formatting and citations from real, verifiable sources only.',
    items: ['تنسيق البحوث ومشاريع التخرج', 'أغلفة وفهارس', 'توثيق APA / Harvard / MLA / Chicago', 'العروض البحثية', 'تلخيص الدراسات السابقة', 'الاستبيانات وإدخال البيانات', 'الجداول والرسوم البيانية'] },
  { k: 'design', i: 'palette', ar: 'التصميم والجرافيك', en: 'Design & Graphics',
    da: 'تصاميم إعلانية وتعليمية وشخصية.', de: 'Advertising, educational and personal designs.',
    items: ['إعلانات ومنشورات', 'شهادات وبطاقات دعوة', 'بطاقات شخصية', 'أغلفة كتب ومجلات', 'قوالب السوشيال ميديا', 'تعديل الصور وإزالة الخلفية', 'إنفوجرافيك'] },
  { k: 'dev', i: 'code', ar: 'البرمجة وتطوير المواقع', en: 'Web & Software',
    da: 'مواقع وتطبيقات وأنظمة إدارة.', de: 'Websites, apps and management systems.',
    items: ['مواقع وصفحات هبوط', 'تطبيقات ويب وFlutter', 'أنظمة المخزون ونقاط البيع', 'أنظمة المدارس وتسجيل الطلاب', 'قواعد البيانات', 'لوحات التحكم Dashboard'] },
  { k: 'data', i: 'chart', ar: 'البيانات والتحليل', en: 'Data & Analysis',
    da: 'تنظيم وتحليل البيانات وتقارير Excel وPower BI.', de: 'Data cleaning, analysis, Excel and Power BI reports.',
    items: ['إدخال وتنظيف البيانات', 'تنظيم ملفات Excel', 'تحليل الاستبيانات', 'الرسوم البيانية', 'Dashboards وPower BI', 'تحويل Excel إلى تقارير'] },
  { k: 'org', i: 'building', ar: 'خدمات المؤسسات والشركات', en: 'Organizations',
    da: 'ملفات وتقارير وخطط للمؤسسات.', de: 'Files, reports and plans for organizations.',
    items: ['الخطط التشغيلية والتنفيذية', 'التقارير الإدارية', 'الأرشيف الإلكتروني', 'النماذج والاستمارات', 'ملفات الموارد البشرية', 'جداول المتابعة'] }
];

function serviceCards(target) {
  const el = $(target); if (!el) return;
  el.innerHTML = SERVICES.map(s => `
    <article class="card" data-s="${esc((s.ar + s.en + s.da + s.items.join(' ')).toLowerCase())}">
      <div class="ico">${ic(s.i)}</div>
      <h3><span class="ar">${s.ar}</span><span class="en">${s.en}</span></h3>
      <p><span class="ar">${s.da}</span><span class="en">${s.de}</span></p>
      <details><summary><span class="ar">ماذا نقدم؟</span><span class="en">What we offer</span></summary>
        <ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul></details>
      <div class="row" style="margin-top:auto">
        <a class="btn gold sm" href="contact.html?s=${s.k}"><span class="ar">اطلب الخدمة</span><span class="en">Request</span></a>
        ${s.tool ? `<a class="btn line sm" href="${s.tool === 'ai' ? 'assistant.html' : 'tools.html#' + s.tool}"><span class="ar">جرّب مجاناً</span><span class="en">Try free</span></a>` : ''}
      </div>
    </article>`).join('');
}
const TOOL_LIST = [
  ['merge', 'merge', 'دمج PDF', 'Merge PDF', 'اجمع ملفات PDF في ملف واحد', 'Combine PDFs into one'],
  ['split', 'split', 'تقسيم PDF', 'Split PDF', 'استخرج الصفحات التي تحتاجها', 'Extract the pages you need'],
  ['img2pdf', 'image', 'صور إلى PDF', 'Images to PDF', 'حوّل صورك إلى ملف واحد', 'Turn images into one file'],
  ['ppt', 'slides', 'منشئ العروض', 'Slides Maker', 'عرض PowerPoint بقالب جاهز', 'Ready-made PowerPoint decks'],
  ['ocr', 'scan', 'OCR عربي وإنجليزي', 'OCR', 'استخرج النص من الصور', 'Extract text from images'],
  ['text2word', 'text', 'نص إلى Word', 'Text to Word', 'نزّل نصك كمستند Word', 'Download text as Word'],
  ['qr', 'qr', 'QR Code', 'QR Code', 'أنشئ رمز QR لأي رابط', 'Create a QR for any link'],
  ['imgc', 'image', 'ضغط الصور', 'Image Compressor', 'قلّل حجم الصور بسرعة', 'Shrink images fast']
];
function toolTiles(target, n, mini) {
  const el = $(target); if (!el) return;
  el.innerHTML = TOOL_LIST.slice(0, n).map(x => mini
    ? `<a href="tools.html#${x[0]}">${ic(x[1])}<span class="ar">${x[2]}</span><span class="en">${x[3]}</span></a>`
    : `<a class="tile" href="tools.html#${x[0]}">${ic(x[1])}<b><span class="ar">${x[2]}</span><span class="en">${x[3]}</span></b><span><span class="ar">${x[4]}</span><span class="en">${x[5]}</span></span></a>`).join('');
}
function filterCards(q) {
  q = q.trim().toLowerCase(); let n = 0;
  $$('#svc-grid .card').forEach(c => { const show = !q || c.dataset.s.includes(q); c.style.display = show ? '' : 'none'; if (show) n++; });
  const nr = $('#noresult'); if (nr) nr.style.display = n ? 'none' : 'block';
}

/* الهيدر والفوتر */
function layout(active) {
  const logo = `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#B8901A"/><stop offset=".55" stop-color="#E8CF82"/><stop offset="1" stop-color="#C9A227"/></linearGradient></defs><circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#g)" stroke-width="1.8"/><path d="M11 25a9 9 0 0 1 18 0z" fill="url(#g)"/><path d="M6 25h28" stroke="url(#g)" stroke-width="2.4" stroke-linecap="round"/><path d="M13 30h14M17 34h6" stroke="#E8CF82" stroke-width="1.6" stroke-linecap="round" opacity=".55"/></svg>`;
  const links = [['index.html', 'الرئيسية', 'Home', 'home'], ['services.html', 'الخدمات', 'Services', 'services'], ['tools.html', 'الأدوات المجانية', 'Free Tools', 'tools'], ['assistant.html', 'المساعد الذكي', 'AI Assistant', 'ai'], ['about.html', 'من نحن', 'About', 'about'], ['contact.html', 'تواصل معنا', 'Contact', 'contact']];
  $('#hdr').outerHTML = `<header class="hdr"><div class="wrap">
    <a class="brand" href="index.html">${logo}<span><span class="ar">أفق</span><span class="en">OFUQ</span><small><span class="ar">للخدمات الإلكترونية</span><span class="en">Digital Services</span></small></span></a>
    <button class="burger" aria-label="menu" onclick="$('.nav').classList.toggle('open')">☰</button>
    <nav class="nav">${links.map(l => `<a href="${l[0]}" class="${l[3] === active ? 'on' : ''}"><span class="ar">${l[1]}</span><span class="en">${l[2]}</span></a>`).join('')}</nav>
    <button class="lang" onclick="setLang(isEn()?'ar':'en')">EN / ع</button></div></header>`;
  const soc = [['واتساب', 'WhatsApp', `https://wa.me/${OFUQ.whatsapp}`], ['فيسبوك', 'Facebook', OFUQ.facebook], ['تيك توك', 'TikTok', OFUQ.tiktok], ['البريد الإلكتروني', 'Email', OFUQ.email && 'mailto:' + OFUQ.email]].filter(x => x[2]);
  $('#ftr').outerHTML = `<footer class="ftr"><div class="wrap"><div class="cols3">
    <div><div class="brand" style="color:#fff;margin-bottom:10px">${logo}<span><span class="ar">أفق للخدمات الإلكترونية</span><span class="en">OFUQ Digital Services</span></span></div>
      <p><span class="ar">نحو أفق أوسع من الإبداع والتميز. خدمات رقمية وتعليمية وأكاديمية وتقنية في مكان واحد.</span><span class="en">Toward a wider horizon of creativity and excellence. Digital, educational, academic and technical services in one place.</span></p></div>
    <div><h4><span class="ar">روابط سريعة</span><span class="en">Quick links</span></h4>${links.slice(1).map(l => `<a href="${l[0]}"><span class="ar">${l[1]}</span><span class="en">${l[2]}</span></a>`).join('')}<a href="privacy.html"><span class="ar">الخصوصية والشروط</span><span class="en">Privacy & Terms</span></a></div>
    <div><h4><span class="ar">تواصل معنا</span><span class="en">Contact</span></h4>${soc.map(x => `<a href="${x[2]}" target="_blank" rel="noopener"><span class="ar">${x[0]}</span><span class="en">${x[1]}</span></a>`).join('')}</div>
  </div><div class="copy">© ${new Date().getFullYear()} <span class="ar">أفق للخدمات الإلكترونية. جميع الحقوق محفوظة.</span><span class="en">OFUQ Digital Services. All rights reserved.</span></div></div></footer>`;
  $$('[data-ph-ar]').forEach(e => e.placeholder = isEn() ? e.dataset.phEn : e.dataset.phAr);
}

/* ===== الذكاء الاصطناعي المشترك: Puter ثم Pollinations ===== */
function aiText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  const c = r.message && r.message.content;
  if (Array.isArray(c)) return c.map(x => x.text || '').join('');
  if (typeof c === 'string') return c;
  return r.text || '';
}
async function aiChat(messages, onTok) {
  const errs = [];
  if (window.puter && puter.ai) {
    try {
      if (onTok) {
        let full = ''; const s = await puter.ai.chat(messages, { stream: true });
        for await (const p of s) { full += (p && p.text) || ''; onTok(full); }
        if (full) return full; throw new Error('empty');
      }
      const x = aiText(await puter.ai.chat(messages)); if (x) return x; throw new Error('empty');
    } catch (e) { errs.push('Puter: ' + ((e && (e.message || (e.error && e.error.message))) || JSON.stringify(e))); }
  } else errs.push('Puter: لم يُحمَّل');
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
    const r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'openai', messages }), signal: ctl.signal });
    clearTimeout(to); if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); const x = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (x) { onTok && onTok(x); return x; } throw new Error('empty');
  } catch (e) { errs.push('Pollinations: ' + (e.message || e)); }
  const err = new Error(errs.join(' | ')); err.list = errs; throw err;
}
async function aiFixText(text, progress) {
  const lines = text.split('\n'), chunks = []; let cur = '';
  lines.forEach(l => { if ((cur + '\n' + l).length > 1600 && cur) { chunks.push(cur); cur = l; } else cur = cur ? cur + '\n' + l : l; });
  if (cur) chunks.push(cur);
  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    progress && progress(i + 1, chunks.length);
    if (!chunks[i].trim()) { out.push(chunks[i]); continue; }
    out.push((await aiChat([
      { role: 'system', content: 'أنت مدقق لغوي محترف. صحّح الأخطاء الإملائية والنحوية وعلامات الترقيم في النص دون تغيير المعنى أو ترتيب الأسطر والفقرات، ودون إضافة أي شرح أو تعليق، ودون تغيير الأرقام والأسماء. أعد النص المصحّح فقط بنفس لغته.' },
      { role: 'user', content: chunks[i] }])).trim());
  }
  return out.join('\n');
}
/* تصحيح أساسي بدون إنترنت (عربي) */
function simpleFixAr(t) {
  const AR = '\\u0600-\\u06FF';
  const dict = { 'فى': 'في', 'الى': 'إلى', 'الذى': 'الذي', 'التى': 'التي', 'لاكن': 'لكن', 'هاذا': 'هذا', 'هاذه': 'هذه', 'هذة': 'هذه', 'ذالك': 'ذلك', 'اللة': 'الله', 'انشاء الله': 'إن شاء الله', 'ان شاء الله': 'إن شاء الله', 'مسئول': 'مسؤول', 'مسئولية': 'مسؤولية', 'اذا': 'إذا', 'اذن': 'إذن', 'لاكنه': 'لكنه', 'إنشاء الله': 'إن شاء الله', 'علي': 'على' };
  delete dict['علي'];
  Object.keys(dict).forEach(k => { t = t.replace(new RegExp('(?<![' + AR + '])' + k + '(?![' + AR + '])', 'g'), dict[k]); });
  t = t.replace(/\u0640/g, '').replace(/[ \t]+/g, ' ').replace(/^ +| +$/gm, '');
  t = t.split('\n').map(l => {
    if (!new RegExp('[' + AR + ']').test(l)) return l;
    return l.replace(/ *, */g, '، ').replace(/ *\? */g, '؟ ').replace(/ *; */g, '؛ ')
      .replace(/ +([،؛؟.!:])/g, '$1').replace(new RegExp('([.!:])(?=[' + AR + '])', 'g'), '$1 ').replace(/([،؛؟]) *$/, '$1').replace(/ {2,}/g, ' ').trim();
  }).join('\n');
  return t;
}
function sendToTool(text, tool) { sessionStorage.setItem('ofuq-text', text); location.href = 'tools.html#' + tool; }

/* زر واتساب عائم */
(function () {
  const old = layout;
  window.layout = function (a) { old(a); const b = document.createElement('a'); b.className = 'wa-fab'; b.href = waLink('مرحباً أفق'); b.target = '_blank'; b.rel = 'noopener'; b.setAttribute('aria-label', 'WhatsApp'); b.innerHTML = ic('wa'); document.body.appendChild(b); };
})();
