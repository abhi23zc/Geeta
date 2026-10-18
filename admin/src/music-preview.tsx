import React from 'react';
import { localized, sectionItems, type MusicReleaseV2 } from '../../shared/music-presentation';
export function MusicPreview({ page, language, small, home = false }: { page: MusicReleaseV2; language: string; small: boolean; home?: boolean }) {
  const text = (v: Parameters<typeof localized>[0]) => localized(v, language);
  const image = (id?: string) => page.media.find(m => m.id === id);
  const content = (type: string, id?: string) => type === 'track' ? page.tracks.find(t => t.id === id) : page.playlists.find(p => p.id === id);
  const art = (id?: string) => image(id) ? <img src={image(id)!.thumbnail} alt={text(image(id)!.alt)} /> : <span className="preview-art">♫</span>;
  const p = page.presentation;
  return <div className={`music-phone ${small ? 'small-phone' : ''}`} aria-label={`${small ? 'Small' : 'Large'} phone preview`}>
    {home ? p.home.visible ? <article className={`preview-hero theme-${p.home.theme}`}>{art(p.home.imageId)}<small>{text(p.home.eyebrow)}</small><h3>{text(p.home.title)}</h3><p>{text(p.home.subtitle)}</p><span className="preview-button">{text(p.home.button)}</span></article> : <p>Home music card is hidden</p> : <>
      {p.header.visible && <header><div><small>{text(p.header.subtitle)}</small><h3>{text(p.header.title)}</h3></div><span>↻</span></header>}
      {p.search.visible && <div className="preview-search">⌕ {text(p.search.placeholder)}</div>}
      <div className="preview-tabs"><span>{text(p.tabs.explore)}</span>{p.tabs.showFavorites && <span>{text(p.tabs.favorites)}</span>}{p.tabs.showRecent && <span>{text(p.tabs.recent)}</span>}</div>
      {p.sections.filter(s => s.visible).map(s => {
        if (s.type === 'banner' || s.type === 'featured') {
          const selected = s.target.type === 'track' || s.target.type === 'playlist' ? content(s.target.type, s.target.id) : undefined;
          return <article key={s.id} className={`preview-hero theme-${s.theme} ${s.type === 'banner' ? 'preview-banner' : ''}`}><small>{text(s.title)}</small>{art(s.imageId ?? selected?.imageId)}{s.type === 'featured' && <h3>{selected ? (language === 'hi' ? selected.metadata.hi?.title || selected.metadata.en.title : selected.metadata.en.title) : 'Choose featured content'}</h3>}<p>{text(s.subtitle)}</p><span className="preview-button">{text(s.button)}</span></article>;
        }
        const ids = sectionItems(page, s);
        if (!ids.length) return null;
        return <div key={s.id}><h4>{text(s.title)}</h4><p>{text(s.subtitle)}</p><div className={`preview-items layout-${s.layout}`}>{ids.map(id => {
          const item = s.type === 'categories' ? page.categories.find(c => c.id === id) : s.type === 'tracks' ? page.tracks.find(t => t.id === id) : page.playlists.find(p => p.id === id);
          if (!item) return null;
          const label = 'name' in item ? text(item.name) : language === 'hi' ? item.metadata.hi?.title || item.metadata.en.title : item.metadata.en.title;
          return <div key={id}>{s.layout !== 'chips' && art(item.imageId)}<strong>{label}</strong>{'availability' in item && item.availability === 'comingSoon' && <small>Coming soon</small>}</div>;
        })}</div></div>;
      })}
    </>}
  </div>;
}
