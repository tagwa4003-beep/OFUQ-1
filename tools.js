/* ===== أدوات أفق — تعمل كلها داخل المتصفح ===== */
if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ---------- التنقل ---------- */
const TI = { merge: 'merge', split: 'split', img2pdf: 'image', pdf2text: 'file', ocr: 'scan', text2word: 'text', mergeword: 'merge', text2pdf: 'file', ppt: 'slides', imgc: 'image', qr: 'qr', count: 'count', clean: 'clean', pass: 'key' };
function openTool(id) {
  if (!$('#t-' + id)) id = 'merge';
  $$('.tool').forEach(e => e.classList.toggle('on', e.id === 't-' + id));
  $$('#tlist button').forEach(b => b.classList.toggle('on', b.dataset.t === id));
  history.replaceState(null, '', '#' + id);
}
$$('#tlist button').forEach(b => { b.insertAdjacentHTML('afterbegin', ic(TI[b.dataset.t])); b.onclick = () => openTool(b.dataset.t); });
window.addEventListener('hashchange', () => openTool(location.hash.slice(1)));

const buf = f => f.arrayBuffer();
const need = (lib, sid) => { if (typeof window[lib] === 'undefined') { say(sid, 'تعذر تحميل مكتبة (' + lib + '). تأكدي من الإنترنت ثم أعيدي تحميل الصفحة.', 'err'); return false; } return true; };
const kb = f => Math.max(1, Math.round(f.size / 1024)) + ' KB';

/* ---------- قائمة ملفات مرتبة (أول ملف يكون الأول) ---------- */
function orderList(boxId, inputId) {
  const st = { files: [] }, box = $('#' + boxId), inp = $('#' + inputId);
  st.render = () => {
    box.innerHTML = st.files.length ? st.files.map((f, i) => `<div class="ol"><span class="n">${i + 1}</span><span class="nm">${esc(f.name)}</span><small>${kb(f)}</small>
      <button type="button" data-a="up" data-i="${i}" title="رفع">▲</button><button type="button" data-a="dn" data-i="${i}" title="خفض">▼</button><button type="button" data-a="rm" data-i="${i}" title="حذف">✕</button></div>`).join('')
      : '<p class="olhint">لم تُضف ملفات بعد.</p>';
  };
  inp.onchange = () => { st.files.push(...inp.files); inp.value = ''; st.render(); };
  box.onclick = e => {
    const b = e.target.closest('button'); if (!b) return; const i = +b.dataset.i, a = b.dataset.a, f = st.files;
    if (a === 'rm') f.splice(i, 1);
    if (a === 'up' && i > 0) [f[i - 1], f[i]] = [f[i], f[i - 1]];
    if (a === 'dn' && i < f.length - 1) [f[i + 1], f[i]] = [f[i], f[i + 1]];
    st.render();
  };
  st.render(); return st;
}
const mergeSt = orderList('merge-list', 'merge-in'), i2pSt = orderList('i2p-list', 'i2p-in'), mwSt = orderList('mw-list', 'mw-in');

/* ---------- دمج PDF مع ترقيم ---------- */
const hex2rgb = h => { const n = parseInt(h.slice(1), 16); return PDFLib.rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
async function numberPages(doc) {
  const SF = PDFLib.StandardFonts, font = await doc.embedFont({ Helvetica: SF.Helvetica, Times: SF.TimesRoman, Courier: SF.Courier }[$('#mg-font').value]);
  const size = +$('#mg-size').value || 11, mar = +$('#mg-mar').value || 28, skip = Math.max(0, +$('#mg-skip').value || 0), start = +$('#mg-start').value || 1;
  const pos = $('#mg-pos').value, fmt = $('#mg-fmt').value, color = hex2rgb($('#mg-color').value);
  const pages = doc.getPages(), N = start + Math.max(0, pages.length - skip) - 1;
  pages.forEach((pg, i) => {
    if (i < skip) return; const n = start + i - skip;
    const txt = fmt === 'dash' ? `- ${n} -` : fmt === 'slash' ? `${n} / ${N}` : fmt === 'page' ? `Page ${n} of ${N}` : String(n);
    const w = font.widthOfTextAtSize(txt, size), { width, height } = pg.getSize();
    const x = pos[1] === 'c' ? (width - w) / 2 : pos[1] === 'l' ? mar : width - mar - w;
    const y = pos[0] === 'b' ? mar : height - mar - size;
    pg.drawText(txt, { x, y, size, font, color });
  });
}
async function mergePdf() {
  if (!need('PDFLib', 'merge-s')) return;
  const fs = mergeSt.files; if (fs.length < 2) return say('merge-s', 'أضيفي ملفين على الأقل.', 'err');
  try {
    say('merge-s', 'جارٍ الدمج...');
    const out = await PDFLib.PDFDocument.create();
    for (const f of fs) { const src = await PDFLib.PDFDocument.load(await buf(f), { ignoreEncryption: true }); (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p)); }
    if ($('#mg-pn').value === 'yes') await numberPages(out);
    download(new Blob([await out.save()], { type: 'application/pdf' }), 'ofuq-merged.pdf');
    say('merge-s', 'تم الدمج بالترتيب الذي حددتِه: ' + out.getPageCount() + ' صفحة.', 'ok');
  } catch (e) { say('merge-s', 'تعذر الدمج. قد يكون أحد الملفات تالفاً أو محمياً بكلمة مرور.', 'err'); }
}

/* ---------- تقسيم PDF ---------- */
function parseRanges(s, max) {
  const set = [];
  s.split(',').map(x => x.trim()).filter(Boolean).forEach(p => {
    const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/); if (!m) throw 0;
    let a = +m[1], b = +(m[2] || m[1]); if (a > b) [a, b] = [b, a];
    for (let i = a; i <= b; i++) { if (i < 1 || i > max) throw 0; set.push(i - 1); }
  });
  if (!set.length) throw 0; return set;
}
async function splitPdf() {
  if (!need('PDFLib', 'split-s')) return;
  const f = $('#split-in').files[0]; if (!f) return say('split-s', 'اختاري ملفاً أولاً.', 'err');
  try {
    const src = await PDFLib.PDFDocument.load(await buf(f), { ignoreEncryption: true });
    const idx = parseRanges($('#split-r').value, src.getPageCount());
    const out = await PDFLib.PDFDocument.create(); (await out.copyPages(src, idx)).forEach(p => out.addPage(p));
    download(new Blob([await out.save()], { type: 'application/pdf' }), 'ofuq-split.pdf');
    say('split-s', 'تم استخراج ' + idx.length + ' صفحة.', 'ok');
  } catch (e) { say('split-s', 'تحققي من أرقام الصفحات (مثال: 1-3,5) وأنها ضمن عدد صفحات الملف.', 'err'); }
}

/* ---------- صور إلى PDF ---------- */
function imgToBytes(file, type) {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0);
      c.toBlob(async b => res(new Uint8Array(await b.arrayBuffer())), type, .92);
    }; img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
async function imgToPdf() {
  if (!need('PDFLib', 'i2p-s')) return;
  const fs = i2pSt.files; if (!fs.length) return say('i2p-s', 'أضيفي صوراً أولاً.', 'err');
  try {
    const doc = await PDFLib.PDFDocument.create();
    for (const f of fs) {
      let im;
      if (f.type === 'image/jpeg') im = await doc.embedJpg(await buf(f));
      else if (f.type === 'image/png') im = await doc.embedPng(await buf(f));
      else im = await doc.embedJpg(await imgToBytes(f, 'image/jpeg'));
      const k = Math.min(1, 595 / im.width, 842 / im.height), w = im.width * k, h = im.height * k;
      doc.addPage([w, h]).drawImage(im, { x: 0, y: 0, width: w, height: h });
    }
    download(new Blob([await doc.save()], { type: 'application/pdf' }), 'ofuq-images.pdf');
    say('i2p-s', 'تم إنشاء PDF من ' + fs.length + ' صورة.', 'ok');
  } catch (e) { say('i2p-s', 'تعذر إنشاء الملف. تأكدي أن الملفات صور صالحة.', 'err'); }
}

/* ---------- PDF إلى نص (يحافظ على الأسطر والفقرات) ---------- */
const AR_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const cleanChars = s => s.normalize('NFKC').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u00AD]/g, '').replace(/\u00A0/g, ' ');
async function pageToText(page) {
  const c = await page.getTextContent();
  const items = c.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0, h: Math.abs(i.transform[3]) || i.height || 10 }));
  items.sort((a, b) => b.y - a.y);
  const lines = [];
  items.forEach(it => { const L = lines.find(l => Math.abs(l.y - it.y) < Math.max(2.5, it.h * .45)); if (L) { L.it.push(it); L.h = Math.max(L.h, it.h); } else lines.push({ y: it.y, h: it.h, it: [it] }); });
  lines.sort((a, b) => b.y - a.y);
  let out = '', prevY = null;
  lines.forEach(L => {
    const all = L.it.map(i => i.s).join(''), rtl = ((all.match(AR_RE) || []).length / Math.max(1, all.length)) > .3;
    L.it.sort((a, b) => rtl ? b.x - a.x : a.x - b.x);
    let txt = '';
    L.it.forEach((it, k) => {
      if (k) { const p = L.it[k - 1], gap = rtl ? p.x - (it.x + it.w) : it.x - (p.x + p.w); if (gap > L.h * .15 && !/\s$/.test(txt) && !/^\s/.test(it.s)) txt += ' '; }
      txt += it.s;
    });
    if (prevY !== null && prevY - L.y > L.h * 1.9) out += '\n';
    out += txt.trim() + '\n'; prevY = L.y;
  });
  return out;
}
async function pdfToText() {
  if (!need('pdfjsLib', 'p2t-s')) return;
  const f = $('#p2t-in').files[0]; if (!f) return say('p2t-s', 'اختاري ملفاً أولاً.', 'err');
  try {
    const pdf = await pdfjsLib.getDocument({ data: await buf(f) }).promise; let out = '';
    for (let i = 1; i <= pdf.numPages; i++) { say('p2t-s', 'الصفحة ' + i + ' من ' + pdf.numPages); out += await pageToText(await pdf.getPage(i)) + '\n'; }
    out = cleanChars(out).replace(/\n{3,}/g, '\n\n').trim();
    $('#p2t-out').value = out;
    say('p2t-s', out ? 'تم الاستخراج. إن ظهرت الكلمات بترتيب معكوس اضغطي «اعكس الكلمات»، وللتصحيح الإملائي استخدمي أزرار التصحيح.' : 'لم يُعثر على نص. الملف على الأغلب مصوّر؛ جرّبي OCR.', out ? 'ok' : 'err');
  } catch (e) { say('p2t-s', 'تعذر قراءة الملف (قد يكون محمياً بكلمة مرور).', 'err'); }
}
function reverseWords(id) { const e = $('#' + id); e.value = e.value.split('\n').map(l => l.split(' ').reverse().join(' ')).join('\n'); }

/* ---------- OCR ---------- */
async function runOcr() {
  if (!need('Tesseract', 'ocr-s')) return;
  const f = $('#ocr-in').files[0]; if (!f) return say('ocr-s', 'اختاري صورة أولاً.', 'err');
  try {
    const r = await Tesseract.recognize(f, $('#ocr-l').value, { logger: m => { if (m.status) say('ocr-s', m.status + ' ' + Math.round((m.progress || 0) * 100) + '%'); } });
    $('#ocr-out').value = r.data.text.trim(); say('ocr-s', 'تم. راجعي النص وصحّحي الأخطاء.', 'ok');
  } catch (e) { say('ocr-s', 'تعذر تشغيل OCR. تأكدي من الاتصال بالإنترنت.', 'err'); }
}

/* ---------- مخرجات النص + التصحيح ---------- */
function copyText(id) { const e = $('#' + id); e.select(); navigator.clipboard ? navigator.clipboard.writeText(e.value) : document.execCommand('copy'); }
function outTxt(id) { const v = $('#' + id).value; if (!v) return; download(new Blob(['\ufeff' + v], { type: 'text/plain' }), 'ofuq-text.txt'); }
async function aiFixBtn(id, sid) {
  const e = $('#' + id), v = e.value.trim(); if (!v) return say(sid, 'لا يوجد نص.', 'err');
  say(sid, 'جارٍ التصحيح...');
  try { e.value = await aiFixText(v, (i, n) => say(sid, `جارٍ التصحيح ${i}/${n}`)); say(sid, 'تم التصحيح. راجعي النص قبل الاعتماد.', 'ok'); }
  catch (err) { say(sid, 'تعذر الوصول لخدمة الذكاء الاصطناعي (' + err.message + '). جرّبي «تصحيح أساسي».', 'err'); }
}
function basicFix(id, sid) { const e = $('#' + id); e.value = simpleFixAr(e.value); say(sid, 'تم التصحيح الأساسي (يعالج الأخطاء الشائعة وعلامات الترقيم فقط). للتدقيق الكامل استخدمي الذكاء الاصطناعي.', 'ok'); }

/* ---------- لوحة التنسيق المشتركة ---------- */
const FONTS = ['Arial', 'Tahoma', 'Times New Roman', 'Calibri', 'Cambria', 'Segoe UI', 'Traditional Arabic', 'Simplified Arabic', 'Sakkal Majalla', 'Courier New'];
function fmtHtml(p) {
  return `<h4>التنسيق</h4><div class="g">
<div><label>نوع الخط</label><select id="${p}-font">${FONTS.map(f => `<option>${f}</option>`).join('')}</select></div>
<div><label>حجم الخط</label><input type="number" id="${p}-size" value="14" min="6" max="72"></div>
<div><label>لون الخط</label><input type="color" id="${p}-color" value="#000000"></div>
<div><label>المسافة بين الأسطر</label><select id="${p}-line"><option value="1">1</option><option value="1.15" selected>1.15</option><option value="1.5">1.5</option><option value="2">2</option><option value="2.5">2.5</option></select></div>
<div><label>مسافة بعد الفقرة (نقطة)</label><input type="number" id="${p}-after" value="6" min="0"></div>
<div><label>المحاذاة</label><select id="${p}-align"><option value="start">بداية السطر</option><option value="center">وسط</option><option value="justify">ضبط</option><option value="end">نهاية السطر</option></select></div>
<div><label>اتجاه النص</label><select id="${p}-dir"><option value="auto">تلقائي</option><option value="rtl">عربي (يمين ليسار)</option><option value="ltr">إنجليزي (يسار ليمين)</option></select></div>
<div><label>حجم الورقة</label><select id="${p}-page"><option>A4</option><option>Letter</option></select></div>
<div><label>الهوامش (سم)</label><input type="number" step="0.1" id="${p}-mar" value="2.5" min="0.5"></div>
<div><label class="ck"><input type="checkbox" id="${p}-bold"> خط عريض</label></div></div>
<h4>ترقيم الصفحات</h4><div class="g">
<div><label>المكان</label><select id="${p}-pn"><option value="none">بدون ترقيم</option><option value="bc" selected>أسفل الوسط</option><option value="br">أسفل اليمين</option><option value="bl">أسفل اليسار</option><option value="tc">أعلى الوسط</option><option value="tr">أعلى اليمين</option><option value="tl">أعلى اليسار</option></select></div>
<div><label>الشكل</label><select id="${p}-pnf"><option value="n">1</option><option value="dash">- 1 -</option><option value="slash">1 / N</option><option value="ar_of">صفحة 1 من N</option><option value="en_of">Page 1 of N</option></select></div>
<div><label>نوع الأرقام</label><select id="${p}-pnt"><option value="dec">1 2 3</option><option value="hindi">١ ٢ ٣</option><option value="abjad">أ ب ج</option><option value="lroman">i ii iii</option><option value="uroman">I II III</option></select></div>
<div><label>ابدأ من الرقم</label><input type="number" id="${p}-pns" value="1"></div></div>`;
}
$$('.fmt[data-p]').forEach(e => e.innerHTML = fmtHtml(e.dataset.p));
function readFmt(p) {
  const v = k => $('#' + p + '-' + k).value;
  return { font: v('font'), size: +v('size') || 14, color: v('color'), line: +v('line') || 1.15, after: +v('after') || 0, align: v('align'), dir: v('dir'), page: v('page'), mar: +v('mar') || 2.5, bold: $('#' + p + '-bold').checked, pn: v('pn'), pnf: v('pnf'), pnt: v('pnt'), pns: +v('pns') || 1 };
}
function blocksFromText(t) {
  return t.replace(/\r/g, '').split('\n').map(l => {
    if (/^##\s+/.test(l)) return { type: 'h2', text: l.replace(/^##\s+/, '') };
    if (/^#\s+/.test(l)) return { type: 'h1', text: l.replace(/^#\s+/, '') };
    if (/^[-*]\s+/.test(l)) return { type: 'p', text: '• ' + l.replace(/^[-*]\s+/, '') };
    return { type: 'p', text: l };
  });
}
const hasAr = s => /[\u0600-\u06FF]/.test(s);
const rtlOf = (o, s) => o.dir === 'rtl' || (o.dir === 'auto' && hasAr(s));

/* ---------- بناء ملف Word حقيقي ---------- */
function buildDocx(blocks, o) {
  const D = docx, { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, Header, PageNumber, NumberFormat } = D;
  const font = { ascii: o.font, cs: o.font, eastAsia: o.font, hAnsi: o.font }, col = o.color.replace('#', '');
  const al = { start: AlignmentType.START, center: AlignmentType.CENTER, justify: AlignmentType.JUSTIFIED, end: AlignmentType.END }[o.align];
  const paras = blocks.map(b => {
    const rtl = rtlOf(o, b.text), mult = b.type === 'h1' ? 1.6 : b.type === 'h2' ? 1.3 : 1, sz = Math.round(o.size * mult * 2), bold = o.bold || b.type !== 'p';
    return new Paragraph({ bidirectional: rtl, alignment: al, pageBreakBefore: !!b.pb, spacing: { line: Math.round(240 * o.line), after: Math.round(o.after * 20) },
      children: [new TextRun({ text: b.text, font, size: sz, sizeComplexScript: sz, color: col, bold, boldComplexScript: bold, rightToLeft: rtl })] });
  });
  const NF = D.NumberFormat, nf = { dec: NF.DECIMAL, hindi: NF.HINDI_NUMBERS || NF.DECIMAL, abjad: NF.ARABIC_ABJAD || NF.DECIMAL, lroman: NF.LOWER_ROMAN, uroman: NF.UPPER_ROMAN }[o.pnt];
  const parts = { n: [PageNumber.CURRENT], dash: ['- ', PageNumber.CURRENT, ' -'], slash: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], ar_of: ['صفحة ', PageNumber.CURRENT, ' من ', PageNumber.TOTAL_PAGES], en_of: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] }[o.pnf];
  const sec = { properties: { page: { size: { width: o.page === 'A4' ? 11906 : 12240, height: o.page === 'A4' ? 16838 : 15840 }, margin: { top: Math.round(o.mar * 567), bottom: Math.round(o.mar * 567), left: Math.round(o.mar * 567), right: Math.round(o.mar * 567) }, pageNumbers: { start: o.pns, formatType: nf } } }, children: paras };
  if (o.pn !== 'none') {
    const para = new Paragraph({ alignment: { l: AlignmentType.LEFT, c: AlignmentType.CENTER, r: AlignmentType.RIGHT }[o.pn[1]], children: [new TextRun({ children: parts, font, size: 20, sizeComplexScript: 20, color: col })] });
    if (o.pn[0] === 'b') sec.footers = { default: new Footer({ children: [para] }) }; else sec.headers = { default: new Header({ children: [para] }) };
  }
  return Packer.toBlob(new Document({ creator: 'OFUQ', sections: [sec] }));
}
/* بديل إن تعذر تحميل مكتبة docx */
function htmlDocBlob(blocks, o) {
  const body = blocks.map(b => { const r = rtlOf(o, b.text), s = b.type === 'h1' ? 1.6 : b.type === 'h2' ? 1.3 : 1;
    return `<p dir="${r ? 'rtl' : 'ltr'}" style="font-size:${o.size * s}pt;font-weight:${o.bold || b.type !== 'p' ? 700 : 400};margin:0 0 ${o.after}pt;text-align:${o.align === 'justify' ? 'justify' : o.align === 'center' ? 'center' : (o.align === 'start') === r ? 'right' : 'left'}${b.pb ? ';page-break-before:always' : ''}">${esc(b.text) || '&nbsp;'}</p>`; }).join('');
  return new Blob(['\ufeff', `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>@page{size:${o.page === 'A4' ? '21cm 29.7cm' : '8.5in 11in'};margin:${o.mar}cm}body{font-family:'${o.font}';color:${o.color};line-height:${o.line}}</style></head><body>${body}</body></html>`], { type: 'application/msword' });
}
async function saveWord(blocks, o, name, sid) {
  try {
    if (typeof docx !== 'undefined') { download(await buildDocx(blocks, o), name + '.docx'); say(sid, 'تم إنشاء ملف Word.', 'ok'); }
    else { download(htmlDocBlob(blocks, o), name + '.doc'); say(sid, 'تعذر تحميل مكتبة Word فتم إنشاء ملف .doc بسيط (بدون ترقيم).', 'ok'); }
  } catch (e) { console.error(e); say(sid, 'تعذر إنشاء الملف: ' + (e.message || e), 'err'); }
}
function textToWord() { const t = $('#t2w').value; if (!t.trim()) return say('t2w-s', 'اكتبي نصاً أولاً.', 'err'); saveWord(blocksFromText(t), readFmt('t2w'), 'ofuq-document', 't2w-s'); }

/* ---------- دمج ملفات Word ---------- */
function htmlToBlocks(html) {
  const d = new DOMParser().parseFromString(html, 'text/html'), out = [];
  [...d.body.children].forEach(n => {
    const tag = n.tagName.toLowerCase(), tx = n.textContent.trim();
    if (/^h[1-6]$/.test(tag)) tx && out.push({ type: tag === 'h1' ? 'h1' : 'h2', text: tx });
    else if (tag === 'ul' || tag === 'ol') [...n.querySelectorAll('li')].forEach((li, i) => out.push({ type: 'p', text: (tag === 'ol' ? (i + 1) + '. ' : '• ') + li.textContent.trim() }));
    else if (tag === 'table') [...n.querySelectorAll('tr')].forEach(tr => out.push({ type: 'p', text: [...tr.children].map(c => c.textContent.trim()).join(' | ') }));
    else if (tx) out.push({ type: 'p', text: tx });
  });
  return out;
}
async function mergeWord() {
  const fs = mwSt.files; if (!fs.length) return say('mw-s', 'أضيفي ملفاً واحداً على الأقل.', 'err');
  if (!need('mammoth', 'mw-s')) return;
  try {
    say('mw-s', 'جارٍ القراءة والدمج...'); const blocks = [];
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i]; let b;
      if (/\.docx$/i.test(f.name)) b = htmlToBlocks((await mammoth.convertToHtml({ arrayBuffer: await buf(f) })).value);
      else if (/\.txt$/i.test(f.name)) b = blocksFromText(await f.text());
      else return say('mw-s', 'الملف ' + f.name + ' غير مدعوم. استخدمي .docx أو .txt (احفظي ملفات .doc القديمة بصيغة docx).', 'err');
      if (i > 0 && $('#mw-pb').checked && b.length) b[0].pb = true;
      blocks.push(...b);
    }
    await saveWord(blocks, readFmt('mw'), 'ofuq-merged', 'mw-s');
  } catch (e) { console.error(e); say('mw-s', 'تعذر قراءة أحد الملفات.', 'err'); }
}

/* ---------- نص إلى PDF (طباعة بتنسيق) ---------- */
function textToPdf() {
  const t = $('#t2p').value; if (!t.trim()) return alert('اكتبي نصاً أولاً');
  const o = readFmt('t2p'), blocks = blocksFromText(t), ar = hasAr(t) && o.dir !== 'ltr' || o.dir === 'rtl';
  const content = { n: 'counter(page)', dash: '"- " counter(page) " -"', slash: 'counter(page) " / " counter(pages)', ar_of: '"صفحة " counter(page) " من " counter(pages)', en_of: '"Page " counter(page) " of " counter(pages)' }[o.pnf];
  const box = o.pn === 'none' ? '' : `@${{ b: 'bottom', t: 'top' }[o.pn[0]]}-${{ l: 'left', c: 'center', r: 'right' }[o.pn[1]]}{content:${content};font-family:'${o.font}';font-size:10pt;color:${o.color}}`;
  const al = o.align === 'justify' ? 'justify' : o.align === 'center' ? 'center' : (o.align === 'start') === ar ? 'right' : 'left';
  const body = blocks.map(b => { const r = rtlOf(o, b.text), s = b.type === 'h1' ? 1.6 : b.type === 'h2' ? 1.3 : 1; return `<p dir="${r ? 'rtl' : 'ltr'}" style="font-size:${o.size * s}pt;font-weight:${o.bold || b.type !== 'p' ? 700 : 400};margin:0 0 ${o.after}pt;text-align:${al}">${esc(b.text) || '&nbsp;'}</p>`; }).join('');
  const w = window.open('', '_blank'); if (!w) return alert('اسمحي بالنوافذ المنبثقة ثم أعيدي المحاولة');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OFUQ</title><style>@page{size:${o.page};margin:${o.mar}cm;${box ? '' : ''}${box}}body{margin:0;font-family:'${o.font}',Arial,Tahoma,sans-serif;color:${o.color};line-height:${o.line}}</style></head><body>${body}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 500);
}

/* ---------- منشئ العروض ---------- */
const SPEC = [
  { k: 'academic', ar: 'أكاديمي / بحثي', en: 'Academic', pal: { bg: '0B1F3A', ac: 'C9A227', body: 'F6F7F9', ink: '14213A' },
    oa: ['المقدمة', 'مشكلة البحث', 'أهداف البحث', 'أسئلة البحث', 'الإطار النظري', 'الدراسات السابقة', 'المنهجية', 'النتائج', 'المناقشة', 'التوصيات', 'الخاتمة', 'المراجع'],
    oe: ['Introduction', 'Research Problem', 'Objectives', 'Research Questions', 'Theoretical Framework', 'Literature Review', 'Methodology', 'Results', 'Discussion', 'Recommendations', 'Conclusion', 'References'] },
  { k: 'medical', ar: 'طبي / صحي', en: 'Medical', pal: { bg: '0E6E7E', ac: '7FD6DF', body: 'F2FAFB', ink: '0B3A44' },
    oa: ['مقدمة', 'التعريف', 'الوبائيات', 'الأسباب وعوامل الخطورة', 'الفيزيولوجيا المرضية', 'الأعراض والعلامات', 'التشخيص', 'العلاج', 'المضاعفات', 'الوقاية', 'حالة سريرية', 'الخلاصة', 'المراجع'],
    oe: ['Introduction', 'Definition', 'Epidemiology', 'Causes & Risk Factors', 'Pathophysiology', 'Signs & Symptoms', 'Diagnosis', 'Treatment', 'Complications', 'Prevention', 'Case Presentation', 'Summary', 'References'] },
  { k: 'edu', ar: 'تعليمي / مدرسي', en: 'Education', pal: { bg: '2E5FA3', ac: 'F4B942', body: 'FFFFFF', ink: '1B2B45' },
    oa: ['أهداف الدرس', 'تمهيد', 'المفاهيم الأساسية', 'الشرح', 'أمثلة', 'نشاط', 'تقويم', 'ملخص الدرس', 'الواجب'],
    oe: ['Lesson Objectives', 'Warm-up', 'Key Concepts', 'Explanation', 'Examples', 'Activity', 'Assessment', 'Summary', 'Homework'] },
  { k: 'admin', ar: 'إداري / مؤسسي', en: 'Administrative', pal: { bg: '3A3F4B', ac: 'C9A227', body: 'F5F5F5', ink: '222222' },
    oa: ['جدول الأعمال', 'الوضع الحالي', 'الأهداف', 'الخطة', 'المسؤوليات', 'الجدول الزمني', 'الميزانية', 'المخاطر', 'التوصيات', 'الخطوات التالية'],
    oe: ['Agenda', 'Current Status', 'Goals', 'Plan', 'Responsibilities', 'Timeline', 'Budget', 'Risks', 'Recommendations', 'Next Steps'] },
  { k: 'biz', ar: 'أعمال وشركات', en: 'Business', pal: { bg: '12263F', ac: '2FB59A', body: 'FFFFFF', ink: '12263F' },
    oa: ['نبذة عن الشركة', 'المشكلة', 'الحل', 'السوق المستهدف', 'المنتجات والخدمات', 'نموذج العمل', 'المنافسون', 'الخطة التسويقية', 'الخطة المالية', 'الفريق', 'الخطوات القادمة'],
    oe: ['About the Company', 'Problem', 'Solution', 'Target Market', 'Products & Services', 'Business Model', 'Competitors', 'Marketing Plan', 'Financial Plan', 'Team', 'Next Steps'] },
  { k: 'report', ar: 'تقارير ومشاريع', en: 'Reports', pal: { bg: '1F3C5B', ac: 'E07A3F', body: 'F7F9FB', ink: '1F3C5B' },
    oa: ['ملخص تنفيذي', 'الخلفية', 'الإنجازات', 'المؤشرات', 'التحديات', 'الدروس المستفادة', 'الخطة القادمة', 'التوصيات'],
    oe: ['Executive Summary', 'Background', 'Achievements', 'Key Metrics', 'Challenges', 'Lessons Learned', 'Next Plan', 'Recommendations'] },
  { k: 'tech', ar: 'تقني / برمجي', en: 'Technology', pal: { bg: '1B1B3A', ac: '7C5CFF', body: 'F4F3FF', ink: '1B1B3A' },
    oa: ['المقدمة', 'المشكلة', 'الحل المقترح', 'البنية التقنية', 'المميزات', 'عرض توضيحي', 'خارطة الطريق', 'المخاطر', 'الخاتمة'],
    oe: ['Introduction', 'Problem', 'Proposed Solution', 'Architecture', 'Features', 'Demo', 'Roadmap', 'Risks', 'Conclusion'] },
  { k: 'simple', ar: 'بسيط وأنيق', en: 'Simple', pal: { bg: '2B2B2B', ac: 'C9A227', body: 'FFFFFF', ink: '222222' },
    oa: ['المقدمة', 'النقطة الأولى', 'النقطة الثانية', 'النقطة الثالثة', 'الخلاصة'], oe: ['Introduction', 'Point One', 'Point Two', 'Point Three', 'Conclusion'] }
];
const VARS = [['band', 'كلاسيكي', 'Classic'], ['side', 'عصري', 'Modern'], ['dark', 'داكن', 'Dark']];
const DESIGNS = [].concat(...SPEC.map(s => VARS.map(v => ({ id: s.k + '-' + v[0], spec: s.k, layout: v[0], name: s.ar + ' — ' + v[1], ...s.pal }))));
let ppSpec = 'academic', ppSel = 'academic-band', ppAll = false;

function ms(d, kind, rtl) {
  const c = x => '#' + x, R = (x, y, w, h, bg, ex) => `<i style="left:${rtl ? 100 - x - w : x}%;top:${y}%;width:${w}%;height:${h}%;background:${bg};${ex || ''}"></i>`;
  const L = d.layout; let h = '';
  if (kind === 't') {
    if (L === 'side') h = R(0, 0, 100, 100, c(d.body)) + R(0, 0, 9, 100, c(d.bg)) + R(9, 0, 1.6, 100, c(d.ac)) + R(16, 36, 58, 10, c(d.bg), 'border-radius:2px') + R(16, 54, 34, 5, c(d.ac), 'border-radius:2px');
    else h = R(0, 0, 100, 100, c(d.bg)) + R(10, 36, 60, 10, '#fff', 'border-radius:2px') + R(10, 54, 34, 5, c(d.ac), 'border-radius:2px') + (L === 'band' ? R(0, 92, 100, 8, c(d.ac)) : R(10, 66, 12, 2.5, c(d.ac)));
  } else {
    const ln = (x, y, w, col) => R(x, y, w, 4.5, col, 'border-radius:2px;opacity:.4');
    if (L === 'band') h = R(0, 0, 100, 100, c(d.body)) + R(0, 0, 100, 27, c(d.bg)) + R(0, 27, 100, 3, c(d.ac)) + R(8, 9, 45, 8, '#fff', 'border-radius:2px') + ln(8, 45, 80, c(d.ink)) + ln(8, 58, 66, c(d.ink)) + ln(8, 71, 52, c(d.ink));
    else if (L === 'side') h = R(0, 0, 100, 100, c(d.body)) + R(0, 0, 9, 100, c(d.bg)) + R(9, 0, 1.6, 100, c(d.ac)) + R(16, 12, 48, 8, c(d.bg), 'border-radius:2px') + ln(16, 38, 72, c(d.ink)) + ln(16, 52, 60, c(d.ink)) + ln(16, 66, 48, c(d.ink));
    else h = R(0, 0, 100, 100, c(d.bg)) + R(8, 10, 45, 8, c(d.ac), 'border-radius:2px') + R(0, 24, 100, 1.5, c(d.ac)) + ln(8, 42, 80, '#fff') + ln(8, 56, 66, '#fff') + ln(8, 70, 52, '#fff');
  }
  return `<div class="ms">${h}</div>`;
}
function ppSpecs() {
  $('#pp-spec').innerHTML = SPEC.map(s => `<button type="button" class="${s.k === ppSpec ? 'on' : ''}" data-k="${s.k}">${s.ar}</button>`).join('');
  $$('#pp-spec button').forEach(b => b.onclick = () => { ppSpec = b.dataset.k; ppAll = false; ppSel = ppSpec + '-band'; ppSpecs(); ppGallery(); });
}
function ppGallery() {
  const rtl = $('#pp-l').value === 'ar', list = ppAll ? DESIGNS : DESIGNS.filter(d => d.spec === ppSpec);
  $('#pp-gal').innerHTML = list.map(d => `<button type="button" class="dz ${d.id === ppSel ? 'on' : ''}" data-id="${d.id}"><div class="pvs">${ms(d, 't', rtl)}${ms(d, 'b', rtl)}</div><b>${d.name}</b></button>`).join('');
  $$('#pp-gal .dz').forEach(b => b.onclick = () => { ppSel = b.dataset.id; ppGallery(); });
  $('#pp-all').textContent = ppAll ? 'عرض تصاميم هذا التخصص فقط' : 'عرض كل التصاميم';
}
ppSpecs(); ppGallery();

function makePpt() {
  if (!need('PptxGenJS', 'pp-st')) return;
  const title = $('#pp-t').value.trim(); if (!title) return say('pp-st', 'اكتبي عنوان العرض.', 'err');
  const d = DESIGNS.find(x => x.id === ppSel), spec = SPEC.find(s => s.k === ppSpec), lang = $('#pp-l').value, rtl = lang === 'ar';
  const font = $('#pp-font').value, sc = +$('#pp-sz').value, by = $('#pp-by').value.trim(), W = 13.33, H = 7.5;
  const withAg = $('#pp-ag').checked, withTh = $('#pp-th').checked, withNum = $('#pp-num').checked;
  let N = Math.max(3, Math.min(60, +$('#pp-n').value || 10));
  const raw = $('#pp-c').value.trim(), user = raw ? raw.split(/\n\s*\n/).map(b => b.trim().split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length) : [];
  let C = N - 1 - (withAg ? 1 : 0) - (withTh ? 1 : 0); C = Math.max(1, C);
  let notice = ''; if (user.length > C) { C = user.length; notice = ' (زدنا العدد ليتّسع لكل محتواك)'; }
  const skel = (rtl ? spec.oa : spec.oe).slice(), usedT = user.map(b => b[0]);
  const prompts = rtl ? ['أضف الفكرة الرئيسية هنا', 'أضف نقطة داعمة أو مثالاً'] : ['Add your main idea here', 'Add a supporting point or example'];
  const content = user.map(b => ({ t: b[0], pts: b.slice(1).map(x => x.replace(/^[-•*]\s*/, '')) }));
  const free = skel.filter(x => !usedT.includes(x));
  while (content.length < C) { const t = free.shift() || (rtl ? 'شريحة ' : 'Slide ') + (content.length + 1); content.push({ t, pts: prompts }); }
  const rx = (x, w) => rtl ? W - x - w : x, al = rtl ? 'right' : 'left', L = d.layout;
  const cols = kind => L === 'dark' ? { head: kind === 'b' ? d.ac : 'FFFFFF', text: 'E8EDF5', num: 'BBBBBB' } : L === 'band' ? { head: 'FFFFFF', text: d.ink, num: '888888' } : { head: d.bg, text: d.ink, num: '888888' };
  const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.title = title; p.author = 'OFUQ';
  const base = (s, kind) => {
    if (L === 'dark') { s.background = { color: d.bg }; if (kind === 'b') s.addShape('rect', { x: 0, y: 1.45, w: W, h: 0.05, fill: { color: d.ac } }); return; }
    if (L === 'band') { if (kind === 't') { s.background = { color: d.bg }; s.addShape('rect', { x: 0, y: H - 0.5, w: W, h: 0.5, fill: { color: d.ac } }); } else { s.background = { color: d.body }; s.addShape('rect', { x: 0, y: 0, w: W, h: 1.4, fill: { color: d.bg } }); s.addShape('rect', { x: 0, y: 1.4, w: W, h: 0.06, fill: { color: d.ac } }); } return; }
    s.background = { color: d.body }; s.addShape('rect', { x: rx(0, 0.55), y: 0, w: 0.55, h: H, fill: { color: d.bg } }); s.addShape('rect', { x: rx(0.55, 0.08), y: 0, w: 0.08, h: H, fill: { color: d.ac } });
  };
  const bx = L === 'side' ? 1.5 : 0.8, bw = L === 'side' ? 11.0 : 11.73;
  const num = (s, n, kind) => { if (withNum && kind === 'b') s.addText(String(n), { x: rx(0.8, 0.8), y: 6.95, w: 0.8, h: 0.3, fontSize: 11, color: cols(kind).num, fontFace: font, align: rtl ? 'left' : 'right' }); };
  const titleSlide = (t, sub) => {
    const s = p.addSlide(); base(s, 't'); const cc = cols('t'), tc = L === 'side' ? d.bg : 'FFFFFF';
    s.addText(t, { x: rx(bx, bw), y: 2.2, w: bw, h: 1.8, fontSize: 42 * sc, bold: true, color: tc, fontFace: font, align: al, rtlMode: rtl, valign: 'middle', fit: 'shrink' });
    s.addShape('rect', { x: rx(bx, 1.4), y: 4.15, w: 1.4, h: 0.07, fill: { color: d.ac } });
    if (sub) s.addText(sub, { x: rx(bx, bw), y: 4.4, w: bw, h: 0.8, fontSize: 20 * sc, color: L === 'side' ? d.ink : 'D5DDEB', fontFace: font, align: al, rtlMode: rtl });
  };
  const bodySlide = (t, pts, n, numbered) => {
    const s = p.addSlide(); base(s, 'b'); const cc = cols('b'), ty = L === 'side' ? 0.45 : L === 'dark' ? 0.3 : 0.2, th = L === 'dark' ? 1.1 : 1.0, cy = L === 'side' ? 1.8 : 1.9;
    s.addText(t, { x: rx(bx, bw), y: ty, w: bw, h: th, fontSize: 30 * sc, bold: true, color: cc.head, fontFace: font, align: al, rtlMode: rtl, valign: 'middle', fit: 'shrink' });
    if (pts.length) { const fs = (pts.length <= 4 ? 24 : pts.length <= 6 ? 21 : pts.length <= 8 ? 18 : 16) * sc;
      s.addText(pts.map((x, i) => ({ text: numbered ? (i + 1) + '. ' + x : x, options: { bullet: !numbered, breakLine: true } })), { x: rx(bx, bw), y: cy, w: bw, h: H - cy - 0.9, fontSize: fs, color: cc.text, fontFace: font, align: al, rtlMode: rtl, valign: 'top', paraSpaceAfter: 10, fit: 'shrink' }); }
    num(s, n, 'b');
  };
  const sub = [by, new Date().toLocaleDateString(rtl ? 'ar' : 'en-GB')].filter(Boolean).join('   |   ');
  let n = 1; titleSlide(title, sub); n++;
  if (withAg) { bodySlide(rtl ? 'الفهرس' : 'Agenda', content.slice(0, 10).map(x => x.t), n++, true); }
  content.forEach(x => bodySlide(x.t, x.pts, n++, false));
  if (withTh) titleSlide(rtl ? 'شكراً لكم' : 'Thank you', by);
  p.writeFile({ fileName: 'ofuq-presentation.pptx' }).then(() => say('pp-st', 'تم إنشاء ' + (n - 1 + (withTh ? 1 : 0)) + ' شريحة بتصميم «' + d.name + '»' + notice + '. افتحيه في PowerPoint وعدّلي النقاط.', 'ok'));
}

/* ---------- ضغط الصور / QR / عدّاد / تنظيف / كلمات مرور ---------- */
function compressImg() {
  const f = $('#ic-in').files[0]; if (!f) return say('ic-s', 'اختاري صورة.', 'err');
  const img = new Image(); img.onload = () => {
    const mw = Math.max(50, +$('#ic-w').value || 1280), k = Math.min(1, mw / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = img.naturalWidth * k; c.height = img.naturalHeight * k;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const q = Math.min(100, Math.max(10, +$('#ic-q').value || 75)) / 100;
    c.toBlob(b => { download(b, 'ofuq-image.jpg'); say('ic-s', 'من ' + Math.round(f.size / 1024) + ' KB إلى ' + Math.round(b.size / 1024) + ' KB (' + c.width + '×' + c.height + ')', 'ok'); }, 'image/jpeg', q);
  }; img.onerror = () => say('ic-s', 'ملف الصورة غير صالح.', 'err'); img.src = URL.createObjectURL(f);
}
function makeQr() { if (!need('QRCode', 'qr-t')) return; const v = $('#qr-t').value.trim(); if (!v) return; $('#qrbox').innerHTML = ''; new QRCode($('#qrbox'), { text: v, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); }
function dlQr() { const c = $('#qrbox canvas'); if (!c) return makeQr(); c.toBlob(b => download(b, 'ofuq-qr.png')); }
function countText() { const v = $('#cn-t').value; $('#c-w').textContent = (v.trim().match(/\S+/g) || []).length; $('#c-c').textContent = v.length; $('#c-n').textContent = v.replace(/\s/g, '').length; $('#c-l').textContent = v ? v.split('\n').length : 0; }
function cleanText(m) {
  const e = $('#cl-t'); let v = e.value;
  if (m === 'spaces') v = v.replace(/[ \t]+/g, ' ').replace(/^ +| +$/gm, '');
  if (m === 'lines') v = v.replace(/\n\s*\n+/g, '\n');
  if (m === 'tashkeel') v = v.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
  if (m === 'upper') v = v.toUpperCase(); if (m === 'lower') v = v.toLowerCase();
  if (m === 'title') v = v.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  e.value = v;
}
function genPass() {
  const n = Math.min(64, Math.max(6, +$('#pw-n').value || 16)), set = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' + ($('#pw-s').value === '1' ? '!@#$%^&*-_=+?' : '');
  const a = new Uint32Array(n); crypto.getRandomValues(a); $('#pw-o').value = [...a].map(x => set[x % set.length]).join('');
}

/* نص قادم من أداة أخرى */
(function () { const t = sessionStorage.getItem('ofuq-text'); if (t) { $('#t2w').value = t; sessionStorage.removeItem('ofuq-text'); } })();
openTool(location.hash.slice(1) || 'merge');
