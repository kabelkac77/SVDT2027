'use strict';
// Samostatný návrhový artefakt. Žádné API, produkční data ani trvalé úložiště.
const app = document.getElementById('app');
const dialog = document.getElementById('dialog');
const dialogContent = document.getElementById('dialog-content');
const initial = () => structuredClone(window.SVDT_FIXTURES);
let data = initial();
let profile = 'vojta';
let scenario = 'ready';
let edition = '2027';
let busy = false;
let dirty = false;
let focusReturn = null;
let feedbackTimer;
let serial = 100;
let inlineDraft = null;
let partnerFilters = { q: '', status: 'active', mine: false, sort: 'name' };
let financeFilters = { q: '', direction: 'all', unpaid: false };
const columns = { contact: true, next: false, deliverables: false, money: false };
const labels = { neosloven: 'Neoslovený', osloven: 'Oslovený', resi: 'Řeší se', potvrzen: 'Potvrzeno', uzavren: 'Uzavřeno', odmitnut: 'Odmítnuto' };
const deliveryLabels = { nesplneno: 'Nesplněno', v_reseni: 'V řešení', splneno: 'Splněno' };
const settlementLabels = { money: 'Úhrada pořadatele', personal: 'Osobní platba', barter: 'Barter', reimbursement: 'Proplacení osobní platby' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const moneyFormat = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 2 });
const czk = value => value === null || value === undefined ? 'Neznámé' : moneyFormat.format(value / 100);
const dateFormat = value => value ? value.split('-').reverse().join('. ') : 'Bez termínu';
const roleName = () => ({ vojta: 'Vojta', vlasta: 'Vlasta', reader: 'Čtenář', crew: 'Crew · návrh', zone: 'Zóna · návrh' }[profile]);
const locked = () => edition === '2026' || ['archive', 'offline'].includes(scenario);
const partnerEditor = () => ['vojta', 'vlasta'].includes(profile) && !locked();
const financeAllowed = () => ['vojta', 'vlasta'].includes(profile);
const financeItems = () => !financeAllowed() ? [] : data.items.filter(item => profile === 'vojta' || data.partners.some(partner => partner.id === item.partner && partner.owner === 'Vlasta'));
const route = () => location.hash.slice(1) || 'work';
const options = (map, selected) => Object.entries(map).map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const button = (text, action, extra = '', disabled = false) => `<button type="button" data-action="${action}" ${extra} ${disabled ? 'disabled' : ''}>${text}</button>`;
const badge = (text, kind = '') => `<span class="status ${kind}">${esc(text)}</span>`;
const head = (title, subtitle, actions = '') => `<div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="actions">${actions}</div></div>`;
const notice = (text, kind = '', extra = '') => `<div class="notice ${kind}">${text}${extra}</div>`;
const empty = (title, text, actions = '') => `<div class="empty"><h2>${esc(title)}</h2><p>${esc(text)}</p>${actions}</div>`;
function balances(item) {
  const sum = kind => item.settlements.filter(row => row.kind === kind).reduce((total, row) => total + row.amount, 0);
  const M = sum('money'), P = sum('personal'), B = sum('barter'), R = sum('reimbursement');
  return { M, P, B, R, remaining: item.approved && item.confirmed !== null ? item.confirmed - M - P - B : null, reimburse: P - R, organizer: item.direction === 'income' ? M : M + R };
}
function total(items, accessor) {
  let amount = 0, unknown = 0;
  items.forEach(item => { const value = accessor(item); if (value === null || value === undefined) unknown++; else amount += value; });
  return { amount, unknown };
}
function summary(label, value, help = '') { return `<div class="summary"><span class="eyebrow">${esc(label)}</span><span class="value">${esc(value)}</span><small>${esc(help)}</small></div>`; }
function totalSummary(label, result, help = '') { return summary(label, czk(result.amount), `${result.unknown ? `Známý mezisoučet · ${result.unknown} neznámé. ` : ''}${help}`); }
function toast(text) {
  const el = document.getElementById('feedback');
  clearTimeout(feedbackTimer); el.textContent = text; el.classList.add('visible');
  feedbackTimer = setTimeout(() => el.classList.remove('visible'), 5000);
}
function closeDialog(force = false) {
  if (dirty && !force && !window.confirm('Zahodit rozpracované změny návrhu?')) return false;
  dirty = false; dialog.close(); dialogContent.innerHTML = '';
  if (focusReturn && document.contains(focusReturn)) focusReturn.focus();
  return true;
}
function showDialog(title, content) {
  focusReturn = document.activeElement; dirty = false;
  dialogContent.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>${button('Zavřít', 'close')}</div>${content}`;
  dialog.showModal();
  setTimeout(() => (dialog.querySelector('form input:not([type=hidden]),form select,form textarea') || dialog.querySelector('button'))?.focus(), 0);
}
function formError(text) {
  let box = dialog.querySelector('.form-error');
  if (!box) { box = document.createElement('div'); box.className = 'form-error'; box.setAttribute('role', 'alert'); dialog.querySelector('form').prepend(box); }
  box.textContent = text; box.setAttribute('tabindex', '-1'); box.focus();
}
function assertWritable(finance = false) {
  if (locked()) throw new Error(scenario === 'offline' ? 'Bez spojení se zápis nepotvrdí. Rozpracovaný obsah zůstává.' : 'Tento ročník je jen pro čtení.');
  if (finance ? !financeAllowed() : !partnerEditor()) throw new Error('Pro tuto změnu nemáš oprávnění.');
}
async function commit(change, { finance = false } = {}) {
  assertWritable(finance);
  if (busy) throw new Error('Probíhá jiný zápis. Vyčkej na jeho dokončení.');
  busy = true;
  const submit = dialog.querySelector('button[type=submit]'); if (submit) submit.disabled = true;
  try {
    await new Promise(resolve => setTimeout(resolve, 140));
    if (scenario === 'save-error') throw new Error('Uložení se nepodařilo. Rozpracované údaje zůstávají; můžeš zkusit znovu.');
    if (scenario === 'conflict') throw new Error('Mezitím někdo změnil záznam. Rozpracované údaje zůstávají. Nejprve vědomě načti aktuální verzi.');
    change();
  } finally { busy = false; if (submit) submit.disabled = false; }
}
function banners() {
  let result = '';
  if (locked() && scenario !== 'offline') result += notice(`<strong>SVDT ${esc(edition)} · jen pro čtení</strong><p>Archivní stav je simulovaný na fiktivním souboru, ne na historických provozních datech.</p>`, 'warning');
  if (profile === 'vlasta') result += notice('<strong>Pracovní předpoklad A1:</strong> finanční obsah jen u vlastních partnerů. Rozsah práv ještě není potvrzený.');
  if (scenario === 'offline') result += notice('<strong>Nepřipojeno.</strong> Modelová data naposledy načtená před 8 minutami. Zápisy jsou pozastavené; nejde o fungující offline synchronizaci.', 'warning');
  if (['save-error', 'conflict'].includes(scenario)) result += notice(`${scenario === 'conflict' ? 'Simulace konfliktu verzí' : 'Simulace chyby uložení'}: zkus upravit záznam; rozpracovaný obsah zůstane zachovaný. ${button('Načíst aktuální údaje', 'reload')}`, 'warning');
  if (inlineDraft) result += notice(`<strong>Neuložený stav:</strong> ${esc(labels[inlineDraft.value])}. ${esc(inlineDraft.error)} <div class="actions">${button('Zkusit uložit znovu', 'retry-inline')}${button('Zahodit rozpracovanou změnu', 'discard-inline')}</div>`, 'error');
  return result;
}
function render() {
  document.getElementById('identity').textContent = roleName();
  document.getElementById('finance-nav').hidden = !financeAllowed();
  document.querySelector('[data-nav=partners]').hidden = ['crew', 'zone'].includes(profile);
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', route().startsWith(link.dataset.nav === 'partners' ? 'partner' : link.dataset.nav)));
  let html = banners();
  if (scenario === 'loading') html += head('Načítání', 'Data zatím nejsou dostupná.') + '<div aria-busy="true" aria-label="Načítám záznamy">' + '<div class="skeleton"></div>'.repeat(7) + '</div>';
  else if (scenario === 'load-error') html += empty('Data se nepodařilo načíst', 'Evidence nepřechází do dema a chyba se nezobrazuje jako nula.', button('Zkusit znovu', 'reload'));
  else if (scenario === 'empty') html += empty('V ročníku zatím nejsou záznamy', 'Jde o stav prázdné evidence, nikoli výsledek filtrů.', button('Vrátit modelová data', 'reload'));
  else if (profile === 'crew') html += renderCrew();
  else if (profile === 'zone') html += renderZone();
  else if (route() === 'partners') html += renderPartners();
  else if (route().startsWith('partner/')) html += renderPartner(route().split('/')[1]);
  else if (route() === 'finance') html += renderFinance();
  else if (route().startsWith('finance/')) html += renderFinanceDetail(route().split('/')[1]);
  else html += renderWork();
  app.innerHTML = html;
}
function partnerRows() {
  return data.partners.filter(p => (!partnerFilters.q || normalize(`${p.name} ${p.contact} ${p.email} ${p.note}`).includes(normalize(partnerFilters.q))) && (partnerFilters.status === 'active' ? p.status !== 'odmitnut' : partnerFilters.status === 'all' || p.status === partnerFilters.status) && (!partnerFilters.mine || p.owner === roleName())).sort((a, b) => (partnerFilters.sort === 'status' ? labels[a.status].localeCompare(labels[b.status], 'cs') : a.name.localeCompare(b.name, 'cs')));
}
function statusEditor(p) {
  const value = inlineDraft?.id === p.id ? inlineDraft.value : p.status;
  return `<select class="inline-status" aria-label="Stav ${esc(p.name)}" data-status="${p.id}" ${!partnerEditor() || p.status === 'uzavren' ? 'disabled' : ''}>${options(Object.fromEntries(Object.entries(labels).filter(([key]) => key !== 'uzavren' || ['potvrzen', 'uzavren'].includes(p.status))), value)}</select>`;
}
function partnerTable() {
  const rows = partnerRows();
  if (!rows.length) return empty('Žádný partner neodpovídá filtrům', 'Zkus upravit hledání nebo zrušit filtry.', button('Zrušit filtry', 'clear-partners'));
  const financeColumn = columns.money && financeAllowed();
  const financial = p => { const items = financeItems().filter(i => i.partner === p.id && i.approved); return items.length ? czk(total(items.filter(i => i.direction === 'income'), i => i.confirmed).amount) : '—'; };
  const note = p => partnerEditor() && p.status !== 'uzavren' ? `<button type="button" class="note-button" data-action="note" data-id="${p.id}" aria-label="Upravit poznámku ${esc(p.name)}">${esc(p.note || 'Přidat poznámku')}</button>` : `<span class="subline">${esc(p.note)}</span>`;
  const contact = p => p.contact ? `${esc(p.contact)}<span class="subline">${esc(p.email)}</span>` : '<span class="muted">Kontakt chybí</span>';
  return `<div class="table-wrap desktop-partners"><table><caption>Partneři aktuálního ročníku, fiktivní data</caption><thead><tr><th>Partner a poznámka</th><th>Stav spolupráce</th><th>Řeší</th>${columns.contact ? '<th>Kontakt</th>' : ''}${columns.next ? '<th>Další kontakt</th>' : ''}${columns.deliverables ? '<th>Plnění</th>' : ''}${financeColumn ? '<th>Potvrzené příjmy</th>' : ''}</tr></thead><tbody>${rows.map(p => `<tr><td><a class="partner-name" href="#partner/${p.id}">${esc(p.name)}</a>${note(p)}</td><td>${statusEditor(p)}</td><td>${esc(p.owner)}</td>${columns.contact ? `<td>${contact(p)}</td>` : ''}${columns.next ? `<td>${esc(dateFormat(p.next))}</td>` : ''}${columns.deliverables ? `<td>${p.deliverables.filter(d => d.status === 'splneno').length}/${p.deliverables.length}</td>` : ''}${financeColumn ? `<td class="amount">${esc(financial(p))}</td>` : ''}</tr>`).join('')}</tbody></table></div><div class="mobile-partners">${rows.map(p => `<article class="mobile-partner"><a class="partner-name" href="#partner/${p.id}">${esc(p.name)}</a><div class="subline">${contact(p)}</div><div class="mobile-meta">${statusEditor(p)}<span>Řeší ${esc(p.owner)}</span></div><div>${note(p)}</div>${columns.next ? `<p class="subline">Další kontakt: ${esc(dateFormat(p.next))}</p>` : ''}${columns.deliverables ? `<p class="subline">Plnění: ${p.deliverables.filter(d => d.status === 'splneno').length}/${p.deliverables.length}</p>` : ''}${financeColumn ? `<p class="subline">Potvrzené příjmy: ${esc(financial(p))}</p>` : ''}</article>`).join('')}</div>`;
}
function renderPartners() {
  return head('Partneři', 'Spolupráce, kontakty a domluvená plnění.', button('Přidat partnera', 'partner-new', 'class="primary"', !partnerEditor())) + `<div class="toolbar"><label class="search">Hledat partnera<input id="partner-search" value="${esc(partnerFilters.q)}" type="search" placeholder="Název, kontakt nebo poznámka"></label><label>Stav<select id="partner-filter">${options({ active: 'Bez odmítnutých', all: 'Všechny stavy', ...labels }, partnerFilters.status)}</select></label><label>Řazení<select id="partner-sort">${options({ name: 'Podle názvu', status: 'Podle stavu' }, partnerFilters.sort)}</select></label><label class="check"><input id="partner-mine" type="checkbox" ${partnerFilters.mine ? 'checked' : ''}>Moji partneři</label><details class="columns"><summary>Sloupce</summary><div class="columns-panel">${Object.entries({ contact: 'Kontakt', next: 'Další kontakt', deliverables: 'Plnění', ...(financeAllowed() ? { money: 'Potvrzené příjmy partnera' } : {}) }).map(([key, label]) => `<label class="check"><input type="checkbox" data-column="${key}" ${columns[key] ? 'checked' : ''}>${label}</label>`).join('')}</div></details></div><p class="count" id="partner-count" aria-live="polite">${partnerRows().length} z ${data.partners.length} partnerů · odmítnuté najdeš ve filtru</p><div id="partner-results">${partnerTable()}</div>`;
}
function renderPartner(id) {
  const p = data.partners.find(row => row.id === id);
  if (!p) return empty('Partner nebyl nalezen', 'Vrať se do seznamu.', '<a href="#partners">Partneři</a>');
  const editable = partnerEditor() && p.status !== 'uzavren';
  const related = financeItems().filter(item => item.partner === p.id);
  const financeBlock = financeAllowed() && (profile === 'vojta' || p.owner === 'Vlasta') ? `<section class="section"><h2>Finance partnera</h2><p class="form-help">Pouze položky v dostupném finančním rozsahu.</p>${related.map(item => `<div class="task"><div><a href="#finance/${item.id}">${esc(item.title)}</a><small>${item.approved ? 'Potvrzeno' : 'Návrh částky'}: ${esc(czk(item.confirmed))} · Peníze: ${esc(czk(balances(item).organizer))}</small></div></div>`).join('') || '<p>Zatím bez finanční položky. Potvrzení spolupráce samo položku nevytváří.</p>'}</section>` : '';
  return `<a class="breadcrumb" href="#partners">← Zpět na Partnery</a>` + head(p.name, 'Detail spolupráce v aktuálním ročníku.', p.status === 'uzavren' ? button('Znovu otevřít · návrh A2', 'partner-reopen', `data-id="${p.id}"`, !partnerEditor()) : button('Upravit', 'partner-edit', `data-id="${p.id}"`, !editable)) + `<div class="detail-grid"><section class="section"><h2>Kontakt a stav</h2><p>${badge(labels[p.status], p.status === 'potvrzen' ? 'good' : '')}</p><p><strong>${esc(p.contact || 'Kontakt není doplněný')}</strong></p><p class="safe-wrap">${esc(p.email || 'E-mail chybí')}</p><p>Řeší: <strong>${esc(p.owner)}</strong></p><div class="contact-actions actions">${button('Kontaktovat', 'contact', `data-id="${p.id}"`)}</div><p class="subline">Další kontakt: ${esc(dateFormat(p.next))} · volitelné</p>${p.shared ? notice('Hlavní kontakt je sdílený napříč ročníky. Jeho úprava není pouze poznámka pro rok 2027.') : ''}${p.status === 'uzavren' ? notice('Ruční uzavření spolupráce je návrh A2. Stav platby se vede zvlášť; pravidla znovuotevření ještě potvrdit.') : ''}</section><div class="detail-stack"><section class="section"><h2>Dohoda a poznámka</h2><p>${esc(p.note || 'Zatím bez poznámky.')}</p><p class="subline">Sem stručně zapsat, co dodá partner a co zajistíme my. Bez povinného dalšího kroku.</p></section><section class="section"><div class="page-head"><h2>Domluvená plnění</h2>${button('Přidat plnění', 'deliverable-new', `data-id="${p.id}"`, !editable || p.status !== 'potvrzen')}</div>${p.deliverables.map(d => `<div class="task"><div><strong>${esc(d.title)}</strong><small>Termín: ${esc(dateFormat(d.due))}</small><small>${d.evidence ? esc(d.evidence) : 'Důkaz zatím nepřipojený'}</small></div><select aria-label="Stav plnění ${esc(d.title)}" data-delivery="${d.id}" data-partner="${p.id}" ${!editable || p.status !== 'potvrzen' ? 'disabled' : ''}>${options(deliveryLabels, d.status)}</select></div>`).join('') || '<p class="muted">Zatím bez samostatných plnění.</p>'}<p class="subline">Nynější funkční základ umí URL důkaz; upload je navazující rozsah.</p></section>${financeBlock}<section class="section"><details><summary>Historie spolupráce</summary><div class="log-row">Modelový záznam · stav ${esc(labels[p.status])} · autor ${esc(p.owner)}.</div><p class="subline">Finanční historie je oddělená. Tento návrh nevytváří serverový audit.</p></details></section></div></div>`;
}
function filteredFinance() {
  return financeItems().filter(item => (!financeFilters.q || normalize(`${item.title} ${item.party}`).includes(normalize(financeFilters.q))) && (financeFilters.direction === 'all' || item.direction === financeFilters.direction) && (!financeFilters.unpaid || (balances(item).remaining !== null && balances(item).remaining > 0)));
}
function financeTable() {
  const items = filteredFinance();
  if (!items.length) return empty('Žádná položka neodpovídá filtrům', 'Filtry neovlivňují oprávnění.', button('Zrušit filtry', 'clear-finance'));
  return `<div class="table-wrap finance-table"><table><caption>Finanční položky v dostupném rozsahu, fiktivní data</caption><thead><tr><th>Položka</th><th>Plán</th><th>Potvrzená částka</th><th>Peníze pořadatele</th><th>Zbývá protistraně</th></tr></thead><tbody>${items.map(item => { const b = balances(item); return `<tr><td><a class="finance-row-name" href="#finance/${item.id}">${esc(item.title)}</a><span class="subline">${item.direction === 'income' ? 'Příjem' : 'Výdaj'} · ${esc(item.party)} · ${esc(dateFormat(item.due))}</span>${!item.approved ? badge('Návrh · nepotvrzeno', 'warn') : ''}</td><td class="amount" data-label="Plán">${esc(czk(item.planned))}</td><td class="amount" data-label="${item.approved ? 'Potvrzeno' : 'Návrh částky'}">${esc(czk(item.confirmed))}</td><td class="amount" data-label="Peníze pořadatele">${esc(czk(b.organizer))}</td><td class="amount" data-label="Zbývá protistraně">${esc(czk(b.remaining))}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function renderFinance() {
  if (!financeAllowed()) return empty('Finance nejsou dostupné', 'Tento profil nemá finanční oprávnění. Přímý odkaz obsah neposkytne.', '<a href="#partners">Zpět na Partnery</a>');
  const items = financeItems(), income = items.filter(i => i.direction === 'income'), expense = items.filter(i => i.direction === 'expense');
  return head('Finance', profile === 'vlasta' ? 'Pracovní varianta: jen vlastní partneři. Rozsah práv čeká na potvrzení.' : 'Rozpočet a evidence plateb · všechny hodnoty jsou fiktivní.', button('Přidat položku', 'finance-new', 'class="primary"', locked())) + `<div class="summary-grid">${totalSummary('Plán příjmů', total(income, i => i.planned))}${totalSummary('Plán výdajů', total(expense, i => i.planned))}${totalSummary('Potvrzené příjmy', total(income.filter(i => i.approved), i => i.confirmed), 'Bez nepotvrzených návrhů')}${summary('Peníze přijato', czk(total(income, i => balances(i).organizer).amount), 'Skutečně peněžně')}${summary('Peníze vydáno', czk(total(expense, i => balances(i).organizer).amount), 'Úhrady + proplacení lidem')}${summary('Zbývá proplatit lidem', czk(total(expense, i => balances(i).reimburse).amount), 'Po konkrétních osobních platbách')}</div><div class="toolbar"><label class="search">Hledat položku<input id="finance-search" type="search" value="${esc(financeFilters.q)}" placeholder="Název nebo protistrana"></label><label>Směr<select id="finance-filter">${options({ all: 'Příjmy i výdaje', income: 'Příjmy', expense: 'Výdaje' }, financeFilters.direction)}</select></label><label class="check"><input id="finance-unpaid" type="checkbox" ${financeFilters.unpaid ? 'checked' : ''}>Zbývá vypořádat</label></div><p class="count">Souhrny výše: celý dostupný rozsah. Filtry níže: seznam položek.</p><div id="finance-results">${financeTable()}</div>`;
}
function renderFinanceDetail(id) {
  const item = financeItems().find(row => row.id === id);
  if (!item) return empty('Položka není dostupná', 'Položka neexistuje nebo pro ni nemáš oprávnění.', '<a href="#partners">Zpět k dostupné práci</a>');
  const b = balances(item);
  const personal = item.settlements.filter(row => row.kind === 'personal');
  return `<a class="breadcrumb" href="#finance">← Zpět na Finance</a>` + head(item.title, `${item.direction === 'income' ? 'Příjem' : 'Výdaj'} · ${item.party}`, button('Zapsat úhradu', 'payment', `data-id="${item.id}" class="primary"`, locked() || !item.approved || item.confirmed === null)) + `${!item.approved ? notice(`Položka je návrh. ${button('Potvrdit částku', 'approve', `data-id="${item.id}"`, locked() || item.confirmed === null)}`, 'warning') : ''}<div class="summary-grid">${summary('Potvrzená částka', item.approved ? czk(item.confirmed) : 'Nepotvrzeno', item.approved ? 'Potvrzení není platba' : `Návrh: ${czk(item.confirmed)}`)}${summary('Zbývá protistraně', czk(b.remaining), 'Po penězích, osobních platbách a barteru')}${summary(item.direction === 'income' ? 'Peníze přijato' : 'Peníze vydáno', czk(b.organizer), 'Jen peněžní tok pořadatele')}</div><section class="section"><h2>Položka</h2><div class="facts"><div class="fact"><span class="label">Plán</span><span class="value">${esc(czk(item.planned))}</span></div><div class="fact"><span class="label">Splatnost</span><span class="value">${esc(dateFormat(item.due))}</span></div><div class="fact"><span class="label">Kategorie</span><span class="value">${esc(item.category)}</span></div><div class="fact"><span class="label">Protistrana</span><span class="value">${esc(item.party)}</span></div></div>${item.partner ? `<p class="subline"><a href="#partner/${item.partner}">Otevřít partnera a jeho plnění</a></p>` : '<p class="subline">Dodavatel není automaticky partnerem.</p>'}</section><section class="section"><h2>Úhrady a vypořádání</h2>${item.settlements.map(row => `<div class="task"><div><strong>${esc(settlementLabels[row.kind])}</strong><small>${esc(row.person || row.note || (row.channel === 'bank' ? 'Bankovní převod' : 'Hotovost'))} · ${esc(dateFormat(row.date))}</small></div><strong class="number">${esc(czk(row.amount))}</strong></div>`).join('') || '<p>Zatím bez pohybů.</p>'}<p class="subline">Barter: ${esc(czk(b.B))} · Osobně dodavateli: ${esc(czk(b.P))} · Proplaceno lidem: ${esc(czk(b.R))}</p></section>${personal.length ? `<section class="section"><h2>Osobní platby a proplacení</h2>${personal.map(row => { const reimbursed = item.settlements.filter(r => r.kind === 'reimbursement' && r.source === row.id).reduce((s, r) => s + r.amount, 0); return `<div class="task"><div><strong>${esc(row.person)}</strong><small>Zdroj ${esc(row.id)} · Zbývá proplatit ${esc(czk(row.amount - reimbursed))}</small></div>${button('Proplatit tuto platbu', 'reimburse', `data-id="${item.id}" data-source="${row.id}"`, locked() || row.amount === reimbursed)}</div>`; }).join('')}</section>` : ''}<section class="section"><h2>Doklady</h2><p class="muted">Soukromý upload je navazující rozsah. Doklad není platba.</p></section><section class="section"><details><summary>Finanční historie</summary><p class="subline">Fiktivní model · skutečný autor a append-only audit jsou podmínkou backendu.</p></details></section>`;
}
function renderWork() {
  if (profile === 'reader') return head('Moje práce', 'Čtenář partnerské evidence') + `<section class="section"><h2>Dostupná práce</h2><p>Partneři a jejich plnění jsou k dispozici pouze pro čtení.</p><p><a href="#partners">Otevřít Partnery</a></p></section>`;
  const vlasta = profile === 'vlasta';
  return head('Moje práce', `${roleName()} · aktuální ročník · nejdřív termíny a rozhodnutí`) + notice('Celkový návrh používá modelové údaje. Úkoly, registrace a personál jsou budoucí zdroje; skutečná první dodávka zobrazí jen napojené moduly.') + `<section class="section"><h2>Potřebuje pozornost</h2><div class="task"><div><strong>${vlasta ? 'Dotáhnout dohodu s partnerem 01' : 'Potvrdit logistiku návozu překážek'}</strong><small>${vlasta ? 'Partner 01 · domluvit podklady · termín dnes' : 'Budoucí úkol · termín dnes · zatím chybí potvrzený odpovědný'}</small></div>${vlasta ? '<a href="#partner/p01">Otevřít a upravit</a>' : button('Otevřít zadání návrhu', 'future-task')}</div><div class="task"><div><strong>${vlasta ? 'Chybí potvrzený plán produkční lokace' : 'Chybí potvrzený zástup kritické role'}</strong><small>Budoucí modul · problém delegované oblasti ohrožující termín</small></div>${button('Upravit / přiřadit', 'future-task')}</div></section><div class="compact-grid"><section class="section"><h2>${vlasta ? 'Partneři k dotažení' : 'Personální obsazenost'}</h2>${vlasta ? `<p>${data.partners.filter(p => p.owner === 'Vlasta' && ['osloven', 'resi'].includes(p.status)).length} vlastních partnerů v jednání</p><p><a href="#partners">Otevřít Partnery</a></p>` : '<p>Model: 24 požadovaných rolí · 18 potvrzených · 3 předběžně · 3 chybí.</p><p class="subline">Budoucí modul. Předběžná domluva není potvrzená účast a docházka je další údaj.</p>'}</section><section class="section"><h2>${vlasta ? 'Produkce a lokace' : 'Registrace závodníků'}</h2><p>${vlasta ? 'Model: 1 blokace, 2 chybějící potvrzení dodavatelů.' : 'Model: 92 přihlášek, 74 dokončených, 18 k dořešení.'}</p><p class="subline">Budoucí modul · tento počet není načtený z provozu.</p></section></div>${financeAllowed() ? `<section class="section"><h2>Rychlé finance</h2><p>${vlasta ? 'Jen pracovní rozsah vlastních partnerů; bez celkového rozpočtu.' : 'Plán, potvrzené částky a peníze pořadatele v samostatném přehledu.'}</p><p><a href="#finance">Otevřít Finance</a></p></section>` : ''}`;
}
function renderCrew() {
  return head('Moje směna', 'Budoucí provozní skica · varianta A3 k potvrzení') + notice('Vlastní potvrzení příchodu a úkolu není dosud schválené. Žádná crew práva ani docházkový backend tím nevznikají.', 'warning') + `<section class="section"><h2>Modelová směna</h2><div class="facts"><div class="fact"><span class="label">Kdy přijít</span><span class="value">Sobota · 07:30</span></div><div class="fact"><span class="label">Kam</span><span class="value">Modelová zóna Cíl · crew point</span></div><div class="fact"><span class="label">Vedoucí</span><span class="value">Fiktivní vedoucí zóny</span></div><div class="fact"><span class="label">Účast</span><span class="value">Potvrzená · docházka zatím nezapsaná</span></div></div><div class="actions contact-actions">${button('Kontakt na vedoucího', 'contact')}${button('Dorazil jsem · varianta', 'crew-action', '', locked())}</div></section><section class="section"><h2>Moje práce</h2><div class="task"><div><strong>Připravit označení průchodu</strong><small>Připravenost celé zóny potvrzuje oprávněný vedoucí, ne tato jednotlivá akce.</small></div>${button('Úkol hotový · varianta', 'crew-action', '', locked())}</div></section><section class="section"><h2>Místo a instrukce</h2><p>Ohlásit se vedoucímu, převzít vybavení a přečíst briefing.</p><p class="subline">Mapa je budoucí modul; skica neobsahuje skutečné mapové podklady ani live polohu.</p></section>`;
}
function renderZone() {
  return head('Zóna Cíl', 'Budoucí provozní skica · modelová zóna') + notice('Poslední modelové potvrzení před 8 minutami. Stav v této skice není živá bezpečnostní informace.', 'warning') + `<div class="summary-grid">${summary('Potvrzení lidé', '5 z 7', '1 předběžně · 1 chybí')}${summary('Připravenost', 'Čeká na potvrzení', 'Vlastník oblasti / oprávněné vedení')}${summary('Otevřené problémy', '2', 'Modelová produkční data')}</div><section class="section"><h2>Co blokuje připravenost</h2><div class="task"><div><strong>Chybí náhradní člověk na směnu</strong><small>Obsazenost není totéž jako příchod na místo.</small></div>${button('Přiřadit člověka · návrh', 'future-task')}</div><div class="task"><div><strong>Dodavatel nepotvrdil vykládku</strong><small>Termín dnes · odpovědný modelový koordinátor</small></div>${button('Otevřít problém · návrh', 'future-task')}</div></section><section class="section"><h2>Provozní stav</h2><p>READY / HOLD / restart se řídí provozním protokolem a potvrzeným zdrojem. Skica nemá aktivní bezpečnostní tlačítka.</p><p class="subline">Při výpadku se bezpečnostní akce neřadí do tiché offline fronty.</p></section>`;
}
function partnerForm(id) {
  const p = data.partners.find(row => row.id === id) || { id: '', name: '', owner: roleName() === 'Vlasta' ? 'Vlasta' : 'Vojta', contact: '', email: '', status: 'neosloven', next: '', note: '', shared: false };
  showDialog(p.id ? 'Upravit partnera' : 'Přidat partnera', `<form id="partner-form" data-id="${p.id}"><div class="form-grid"><label class="full">Název organizace<input name="name" required value="${esc(p.name)}"></label><label>Řeší<select name="owner">${options({ Vojta: 'Vojta', Vlasta: 'Vlasta' }, p.owner)}</select></label><label>Stav<select name="status">${options(labels, p.status)}</select></label><label>Hlavní kontakt · volitelné<input name="contact" value="${esc(p.contact)}"></label><label>E-mail · volitelné<input name="email" type="email" value="${esc(p.email)}"></label>${p.shared ? '<div class="full notice warning">Tento hlavní kontakt je společný pro více ročníků.<label class="check"><input type="checkbox" name="shared">Rozumím dopadu případné změny kontaktu napříč ročníky.</label></div>' : ''}<label class="full">Dohoda / poznámka · volitelné<textarea name="note">${esc(p.note)}</textarea></label><label>Další kontakt · volitelné<input type="date" name="next" value="${esc(p.next || '')}"></label><p class="form-help">Nevyplněné datum uložení neblokuje. Nová organizace se v produkci nejprve vyhledá, shoda názvu sama nestačí.</p></div><div class="form-actions">${button('Zrušit', 'close')}<button class="primary" type="submit">Uložit partnera</button></div></form>`);
}
function deliverableForm(id) {
  showDialog('Přidat plnění', `<form id="delivery-form" data-id="${id}"><div class="form-grid"><label class="full">Co zajistíme<input name="title" required></label><label>Stav<select name="status">${options(deliveryLabels, 'nesplneno')}</select></label><label>Termín · volitelné<input name="due" type="date"></label><label class="full">URL důkazu · volitelné<input name="evidence" type="url" placeholder="https://..."></label></div><div class="form-actions">${button('Zrušit', 'close')}<button class="primary" type="submit">Uložit plnění</button></div></form>`);
}
function financeForm() {
  const ps = data.partners.filter(p => profile === 'vojta' || p.owner === 'Vlasta');
  showDialog('Přidat finanční položku', `<form id="finance-form"><div class="form-grid"><label class="full">Název položky<input name="title" required></label><label>Směr<select name="direction"><option value="expense">Výdaj</option><option value="income">Příjem</option></select></label><label>Protistrana<select name="partner">${profile === 'vojta' ? '<option value="">Fiktivní dodavatel · bez partnerství</option>' : ''}${ps.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label>Plán Kč · neznámé nech prázdné<input name="planned" inputmode="decimal" placeholder="Neznámé"></label><label>Návrh potvrzené částky Kč<input name="confirmed" inputmode="decimal" placeholder="Neznámé"></label><label>Splatnost · volitelné<input name="due" type="date"></label><label class="check"><input name="approve" type="checkbox">Potvrdit známou částku v mém rozsahu</label></div><p class="form-help">Vojta/Vlasta mohou potvrdit i vlastní výdaj v přiděleném rozsahu. Skutečná práva a rozsah Vlasty čekají na B0.</p><div class="form-actions">${button('Zrušit', 'close')}<button class="primary" type="submit">Uložit položku</button></div></form>`);
}
function parseMoney(raw, nullable = false) {
  const text = String(raw).replace(/[\s\u00a0\u202f]/g, '');
  if (!text && nullable) return null;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Zadej částku s nejvýše dvěma desetinnými místy.');
  const [whole, decimals = ''] = text.replace(',', '.').split('.');
  const value = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(value) || value > 100000000000) throw new Error('Částka je mimo podporovaný rozsah.');
  return value;
}
function paymentForm(id, sourceId) {
  const item = financeItems().find(row => row.id === id);
  if (!item || locked() || !item.approved || item.confirmed === null) { toast('Pro zápis je potřeba potvrzená dostupná položka.'); return; }
  const personal = item.settlements.filter(row => row.kind === 'personal');
  const kinds = { money: 'Banka / hotovost', ...(item.direction === 'expense' ? { personal: 'Osobní platba dodavateli', barter: 'Barter', ...(personal.length ? { reimbursement: 'Proplacení konkrétní osobní platby' } : {}) } : { barter: 'Barter' }) };
  showDialog(sourceId ? 'Proplatit osobní platbu' : 'Zapsat úhradu / vypořádání', `<form id="payment-form" data-id="${item.id}"><p><strong>${esc(item.title)}</strong></p><p class="form-help">Zbývá protistraně ${esc(czk(balances(item).remaining))}. Evidence neodesílá peníze.</p><div class="form-grid"><label class="full">Typ<select name="kind" id="payment-kind">${options(kinds, sourceId ? 'reimbursement' : 'money')}</select></label><label>Částka Kč<input name="amount" inputmode="decimal" required placeholder="0,00"></label><label>Datum<input name="date" type="date" required value="${data.modelDay}"></label><label id="channel-label">Způsob<select name="channel"><option value="bank">Banka</option><option value="cash">Hotovost</option></select></label><label id="person-label">Osobní plátce<select name="person"><option>Fiktivní osoba A</option><option>Fiktivní osoba B</option></select></label><label class="full" id="source-label">Původní osobní platba<select name="source">${personal.map(row => { const used = item.settlements.filter(r => r.kind === 'reimbursement' && r.source === row.id).reduce((s, r) => s + r.amount, 0); return `<option value="${row.id}" ${row.id === sourceId ? 'selected' : ''}>${esc(row.person)} · ${row.id} · zbývá ${esc(czk(row.amount - used))}</option>`; }).join('')}</select></label><label class="full">Poznámka / popis barteru<textarea name="note"></textarea></label></div><div class="form-actions">${button('Zrušit', 'close')}<button class="primary" type="submit">Zapsat vypořádání</button></div></form>`);
  syncPaymentFields();
}
function syncPaymentFields() {
  const kind = dialog.querySelector('#payment-kind')?.value;
  if (!kind) return;
  dialog.querySelector('#channel-label').hidden = !['money', 'reimbursement'].includes(kind);
  dialog.querySelector('#person-label').hidden = kind !== 'personal';
  dialog.querySelector('#source-label').hidden = kind !== 'reimbursement';
}
async function saveInline(id, value) {
  try {
    await commit(() => { data.partners.find(p => p.id === id).status = value; inlineDraft = null; });
    toast('Stav uložený v návrhu.'); render();
  } catch (error) { inlineDraft = { id, value, error: error.message }; render(); }
}
document.addEventListener('click', async event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const { action, id, source } = control.dataset;
  if (action === 'close') closeDialog();
  if (action === 'reload') {
    if ((dirty || inlineDraft) && !window.confirm('Načíst aktuální modelové údaje a zahodit rozpracovaný obsah?')) return;
    closeDialog(true); inlineDraft = null; scenario = 'ready'; document.getElementById('scenario').value = 'ready'; render();
  }
  if (action === 'discard-inline') { inlineDraft = null; render(); }
  if (action === 'retry-inline' && inlineDraft) await saveInline(inlineDraft.id, inlineDraft.value);
  if (action === 'clear-partners') { partnerFilters = { q: '', status: 'active', mine: false, sort: 'name' }; render(); }
  if (action === 'clear-finance') { financeFilters = { q: '', direction: 'all', unpaid: false }; render(); }
  if (action === 'partner-reopen' && partnerEditor() && window.confirm('Vrátit spolupráci do Potvrzeno? Jde o pracovní variantu A2; platby se nezmění.')) await saveInline(id, 'potvrzen');
  if (action === 'note' && partnerEditor()) { const p = data.partners.find(row => row.id === id); showDialog('Upravit poznámku', `<form id="note-form" data-id="${p.id}"><p class="form-help">${esc(p.name)} · poznámka jen pro aktuální ročník</p><label>Dohoda / poznámka<textarea name="note">${esc(p.note)}</textarea></label><div class="form-actions">${button('Zrušit', 'close')}<button class="primary" type="submit">Uložit poznámku</button></div></form>`); }
  if (action === 'partner-new' && partnerEditor()) partnerForm();
  if (action === 'partner-edit' && partnerEditor()) partnerForm(id);
  if (action === 'deliverable-new' && partnerEditor()) deliverableForm(id);
  if (action === 'finance-new' && financeAllowed() && !locked()) financeForm();
  if (action === 'payment') paymentForm(id);
  if (action === 'reimburse') paymentForm(id, source);
  if (action === 'approve') {
    const item = financeItems().find(row => row.id === id);
    if (!item || item.confirmed === null) return;
    try { await commit(() => { item.approved = true; }, { finance: true }); toast('Částka potvrzená v návrhu.'); render(); } catch (error) { toast(error.message); }
  }
  if (action === 'contact') toast('Fiktivní kontakt: návrh nikoho nekontaktuje ani nevytáčí telefon.');
  if (action === 'future-task') toast('Budoucí modul: přiřazení a úkoly jsou zatím pouze návrh, bez zápisu.');
  if (action === 'crew-action') toast('Ukázka vlastní akce crew. Kdo ji smí potvrdit, zůstává otevřené.');
});
document.addEventListener('input', event => {
  if (dialog.contains(event.target)) dirty = true;
  if (event.target.id === 'partner-search') { partnerFilters.q = event.target.value; document.getElementById('partner-results').innerHTML = partnerTable(); document.getElementById('partner-count').textContent = `${partnerRows().length} z ${data.partners.length} partnerů`; }
  if (event.target.id === 'finance-search') { financeFilters.q = event.target.value; document.getElementById('finance-results').innerHTML = financeTable(); }
});
document.addEventListener('change', async event => {
  const el = event.target;
  if (el.dataset.status) { if (el.value === 'uzavren' && !window.confirm('Ručně uzavřít spolupráci pro tento ročník? Pracovní varianta A2 nezmění plnění, fakturaci ani úhrady.')) { render(); return; } return saveInline(el.dataset.status, el.value); }
  if (el.dataset.delivery) {
    try { await commit(() => { data.partners.find(p => p.id === el.dataset.partner).deliverables.find(d => d.id === el.dataset.delivery).status = el.value; }); toast('Stav plnění uložený v návrhu.'); render(); } catch (error) { toast(error.message); }
  }
  if (el.id === 'partner-filter') { partnerFilters.status = el.value; render(); }
  if (el.id === 'partner-sort') { partnerFilters.sort = el.value; render(); }
  if (el.id === 'partner-mine') { partnerFilters.mine = el.checked; render(); }
  if (el.dataset.column) { columns[el.dataset.column] = el.checked; render(); }
  if (el.id === 'finance-filter') { financeFilters.direction = el.value; render(); }
  if (el.id === 'finance-unpaid') { financeFilters.unpaid = el.checked; render(); }
  if (el.id === 'payment-kind') syncPaymentFields();
});
document.addEventListener('submit', async event => {
  if (!dialog.contains(event.target)) return;
  event.preventDefault();
  const form = event.target, values = new FormData(form), str = key => String(values.get(key) || '').trim();
  try {
    let target = null;
    if (form.id === 'note-form') { const p = data.partners.find(row => row.id === form.dataset.id); await commit(() => { p.note = str('note'); }); }
    if (form.id === 'partner-form') {
      const old = data.partners.find(p => p.id === form.dataset.id);
      if (old?.shared && (str('contact') !== old.contact || str('email') !== old.email) && !values.has('shared')) throw new Error('Před úpravou sdíleného kontaktu potvrď, že rozumíš dopadu napříč ročníky.');
      if (!str('name') || !str('owner')) throw new Error('Doplň název a odpovědného člověka.');
      if (data.partners.some(p => p.id !== old?.id && normalize(p.name) === normalize(str('name')))) throw new Error('Stejný název už existuje. Nejprve zkontroluj, zda jde o tutéž organizaci.');
      const p = { ...(old || { id: `p${++serial}`, deliverables: [], shared: false }), name: str('name'), owner: str('owner'), status: str('status'), contact: str('contact'), email: str('email'), next: str('next') || null, note: str('note') };
      await commit(() => { if (old) Object.assign(old, p); else data.partners.push(p); });
      target = `partner/${p.id}`;
    }
    if (form.id === 'delivery-form') {
      const evidence = str('evidence');
      if (evidence && !/^https?:\/\//i.test(evidence)) throw new Error('Důkaz musí být odkaz HTTP(S).');
      const p = data.partners.find(row => row.id === form.dataset.id);
      if (!p || p.status !== 'potvrzen') throw new Error('Plnění lze měnit u potvrzené spolupráce.');
      await commit(() => p.deliverables.push({ id: `d${++serial}`, title: str('title'), status: str('status'), due: str('due') || null, evidence }));
    }
    if (form.id === 'finance-form') {
      const planned = parseMoney(str('planned'), true), confirmed = parseMoney(str('confirmed'), true), approved = values.has('approve');
      if (approved && confirmed === null) throw new Error('Potvrzení vyžaduje známou částku. Neznámé můžeš uložit jako návrh.');
      const partner = data.partners.find(p => p.id === str('partner'));
      if (profile === 'vlasta' && partner?.owner !== 'Vlasta') throw new Error('Protistrana není v pracovním rozsahu A1.');
      const item = { id: `f${++serial}`, title: str('title'), direction: str('direction'), partner: partner?.id || null, party: partner?.name || 'Fiktivní dodavatel bez partnerství', planned, confirmed, approved, due: str('due') || null, category: 'K doplnění', scope: 'main', settlements: [] };
      await commit(() => data.items.push(item), { finance: true }); target = `finance/${item.id}`;
    }
    if (form.id === 'payment-form') {
      const item = financeItems().find(row => row.id === form.dataset.id);
      if (!item || !item.approved || item.confirmed === null) throw new Error('Položka není potvrzená nebo dostupná.');
      const amount = parseMoney(str('amount')), kind = str('kind');
      if (amount <= 0) throw new Error('Částka pohybu musí být větší než nula.');
      if (!str('date')) throw new Error('Doplň datum skutečné platby.');
      if (kind === 'barter' && !str('note')) throw new Error('Doplň stručný popis barteru.');
      let personal = null;
      if (kind === 'reimbursement') {
        personal = item.settlements.find(row => row.id === str('source') && row.kind === 'personal');
        if (!personal) throw new Error('Vyber původní osobní platbu.');
        const used = item.settlements.filter(row => row.kind === kind && row.source === personal.id).reduce((sum, row) => sum + row.amount, 0);
        if (amount > personal.amount - used) throw new Error('Částka přesahuje zůstatek této konkrétní osobní platby.');
      } else if (amount > balances(item).remaining) throw new Error('Částka přesahuje zbývající vypořádání protistrany.');
      if (item.direction === 'income' && ['personal', 'reimbursement'].includes(kind)) throw new Error('Osobní platbu ani proplacení nelze zapsat k příjmu.');
      await commit(() => item.settlements.push({ id: `s${++serial}`, kind, amount, date: str('date'), channel: str('channel'), person: personal?.person || str('person'), source: personal?.id || null, note: str('note') }), { finance: true });
    }
    closeDialog(true); toast('Uloženo v návrhu. Po obnovení stránky se modelová data vrátí.');
    if (target && route() !== target) location.hash = target; else render();
  } catch (error) { formError(error.message); }
});
dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
document.getElementById('profile').addEventListener('change', event => { closeDialog(true); inlineDraft = null; profile = event.target.value; render(); });
document.getElementById('theme').addEventListener('change', event => document.documentElement.dataset.theme = event.target.value);
document.getElementById('scenario').addEventListener('change', event => { scenario = event.target.value; render(); });
document.getElementById('edition').addEventListener('change', event => {
  if ((dirty || inlineDraft) && !window.confirm('Zahodit rozpracované změny a přepnout ročník návrhu?')) { event.target.value = edition; return; }
  closeDialog(true); inlineDraft = null; edition = event.target.value; render();
});
document.getElementById('menu').addEventListener('click', event => { const open = document.getElementById('sidebar').classList.toggle('open'); event.currentTarget.setAttribute('aria-expanded', String(open)); });
document.getElementById('reset').addEventListener('click', () => { closeDialog(true); data = initial(); inlineDraft = null; scenario = 'ready'; edition = '2027'; document.getElementById('scenario').value = 'ready'; document.getElementById('edition').value = '2027'; render(); toast('Fiktivní údaje obnovené.'); });
window.addEventListener('hashchange', () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('menu').setAttribute('aria-expanded', 'false'); render(); });
window.SVDT_DESIGN = { snapshot: () => structuredClone(data), balances: id => balances(data.items.find(item => item.id === id)) };
render();
