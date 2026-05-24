/* ===========================================================
   news.js — data/news.json を読み込み、最新順で描画する。
   トップページは最新5件、ニュース一覧ページは全件。
   --max="N" 相当の制御は、リスト要素の data-limit 属性で行う。
============================================================ */
(function(){
  'use strict';

  const list = document.getElementById('newsList');
  if (!list) return;

  const limit = parseInt(list.dataset.limit || '5', 10);

  /* 日付の表示整形：2026-05-22 → 2026.05.22 */
  function fmtDate(iso){
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${y}.${m}.${d}`;
  }

  fetch('./data/news.json', { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then(items => {
      if (!Array.isArray(items) || !items.length){
        list.innerHTML = '<li class="news-list__empty">まだお知らせはありません。</li>';
        return;
      }
      /* 日付降順に並べ替え（ファイル中の順序に依存しない） */
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const slice = limit > 0 ? items.slice(0, limit) : items;

      list.innerHTML = slice.map(item => {
        const date  = fmtDate(item.date);
        const cat   = item.tag ? `<span class="news-list__cat">${escape(item.tag)}</span>` : '<span class="news-list__cat"> </span>';
        const title = item.url
          ? `<a href="${escape(item.url)}" target="_blank" rel="noopener">${escape(item.title || '')}</a>`
          : escape(item.title || '');
        return `<li class="news-list__item">
          <span class="news-list__date">${escape(date)}</span>
          ${cat}
          <span class="news-list__title">${title}</span>
        </li>`;
      }).join('');
    })
    .catch(() => {
      list.innerHTML = '<li class="news-list__empty">お知らせを読み込めませんでした。時間をおいて再度ご確認ください。</li>';
    });

  function escape(s){
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
})();
