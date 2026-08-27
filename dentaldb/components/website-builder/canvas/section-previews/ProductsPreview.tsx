'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { SectionTitle } from './shared';

export function ProductsPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'grid';
  const [products, setProducts] = React.useState<any[]>([]);
  const [loadError, setLoadError] = React.useState(false);
  const p = theme.primaryColor;

  React.useEffect(() => {
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getProductsForBuilder()
        .then((data: any) => {
          const all = Array.isArray(data) ? data : (data?.products || data?.data || []);
          const active = all.filter((pr: any) => pr.isActive !== false);
          const branchIds: string[] = s.branchIds || [];
          const bf = branchIds.length > 0 ? active.filter((pr:any) => !pr.branchId || branchIds.includes(pr.branchId)) : active;
          const hiddenIds: string[] = s.hiddenProductIds || [];
          setProducts(bf.filter((pr:any) => !hiddenIds.includes(pr.id)));
        })
        .catch(() => setLoadError(true));
    });
  }, [JSON.stringify(s.branchIds), JSON.stringify(s.hiddenProductIds)]);

  const sample = [
    {id:'1',name:'Vitamin C 500mg',price:350,unit:'tablet',inStock:true},
    {id:'2',name:'Face Moisturizer',price:1200,unit:'piece',inStock:true},
    {id:'3',name:'Omega-3 Capsules',price:850,unit:'capsule',inStock:false},
    {id:'4',name:'Antiseptic Cream',price:180,unit:'tube',inStock:true},
    {id:'5',name:'Blood Pressure Monitor',price:3500,unit:'piece',inStock:true},
    {id:'6',name:'Paracetamol 500mg',price:120,unit:'strip',inStock:true},
  ];
  const display = products.length > 0 ? products : sample;
  const isLive = products.length > 0;
  const cols = s.columns || 3;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/,'') ?? (typeof window!=='undefined'?window.location.origin:'');
  const imgSrc = (pr:any) => pr.imageUrl ? (pr.imageUrl.startsWith('/')?`${baseUrl}${pr.imageUrl}`:pr.imageUrl) : null;

  const ProductCard = ({pr}:{pr:any}) => (
    <div style={{borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.07)',border:`1px solid ${p}15`,background:'white'}}>
      <div style={{height:140,display:'flex',alignItems:'center',justifyContent:'center',background:`${p}10`,overflow:'hidden'}}>
        {imgSrc(pr)
          ? <img src={imgSrc(pr)!} alt={pr.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>
          : <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={`${p}80`} strokeWidth="1.5"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
      </div>
      <div style={{padding:'14px 16px'}}>
        <div style={{display:'flex',alignItems:'start',justifyContent:'space-between',gap:8,marginBottom:4}}>
          <p style={{fontWeight:600,fontSize:13,color:theme.textColor,lineHeight:1.3}}>{pr.name}</p>
          {s.showStockBadge!==false && <span style={{fontSize:10,padding:'2px 7px',borderRadius:999,fontWeight:600,flexShrink:0,background:pr.inStock?'#dcfce7':'#fee2e2',color:pr.inStock?'#16a34a':'#dc2626'}}>{pr.inStock?'In Stock':'Out'}</span>}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
          <span style={{fontWeight:800,color:p,fontSize:14}}>NPR {pr.price?.toLocaleString?.()}</span>
          <button style={{padding:'6px 14px',borderRadius:8,background:pr.inStock?p:'#d1d5db',color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:pr.inStock?'pointer':'not-allowed'}}>{pr.inStock?(s.ctaText||'Order'):'Unavailable'}</button>
        </div>
      </div>
    </div>
  );

  if (variant === 'grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Our Products'} subtitle={(s.subtitle as string)||'Browse our clinic inventory'} theme={theme}/>
          {s.showSearch!==false && <div style={{marginBottom:24,display:'flex',justifyContent:'center'}}><div style={{width:'100%',maxWidth:360,padding:'10px 16px',borderRadius:10,border:`1.5px solid ${p}40`,color:'#9ca3af',background:'white',fontSize:14}}>Search products…</div></div>}
          <div style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    const [first,...rest] = display;
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Featured Products'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:16}}>
            {first && (
              <div style={{borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.1)',background:'white',gridRow:'span 2'}}>
                <div style={{height:240,background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {imgSrc(first) ? <img src={imgSrc(first)!} alt={first.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:48,opacity:0.4}}>💊</span>}
                </div>
                <div style={{padding:24}}>
                  <span style={{fontSize:11,background:`${p}15`,color:p,padding:'3px 10px',borderRadius:999,fontWeight:700}}>Featured</span>
                  <h3 style={{fontWeight:700,color:theme.textColor,margin:'10px 0 6px',fontSize:16}}>{first.name}</h3>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
                    <span style={{fontWeight:800,color:p,fontSize:18}}>NPR {first.price?.toLocaleString?.()}</span>
                    <button style={{padding:'8px 20px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:13,border:'none',cursor:'pointer'}}>{s.ctaText||'Order'}</button>
                  </div>
                </div>
              </div>
            )}
            {rest.slice(0,4).map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'pharmacy') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
            <div>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.5rem',fontWeight:700,color:theme.textColor}}>{s.title||'Pharmacy'}</h2>
              {s.subtitle && <p style={{fontSize:14,color:'#6b7280',marginTop:4}}>{s.subtitle}</p>}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['All','Vitamins','Skincare','Equipment','Medicine'].map(cat=>(
                <button key={cat} style={{padding:'6px 14px',borderRadius:999,fontSize:12,fontWeight:600,border:`1px solid ${cat==='All'?p:'#e5e7eb'}`,background:cat==='All'?p:'white',color:cat==='All'?'#fff':theme.textColor,cursor:'pointer'}}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gap:14,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category-tabs') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title as string||'Shop'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap',justifyContent:'center'}}>
            {['All Products','Supplements','Skincare','Devices','OTC Medicine'].map((cat,i)=>(
              <button key={cat} style={{padding:'8px 18px',borderRadius:999,fontSize:13,fontWeight:600,border:'none',background:i===0?p:'white',color:i===0?'#fff':theme.textColor,cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>{cat}</button>
            ))}
          </div>
          <div style={{display:'grid',gap:14,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.slice(0,cols*2).map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
          </div>
        </div>
      </div>
    );
  }

  // carousel
  if (variant === 'carousel') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Our Products'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>
            {display.map((pr:any)=>(
              <div key={pr.id} style={{minWidth:200,flexShrink:0}}><ProductCard pr={pr}/></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // supplement-showcase
  if (variant === 'supplement-showcase') {
    return (
      <div style={{...css,...padding,background:`${p}06`}}>
        <div className={wrapperClass}>
          <SectionTitle title={(s.title as string)||'Supplements & Wellness'} subtitle={s.subtitle as string} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {display.slice(0,8).map((pr:any)=>(
              <div key={pr.id} style={{background:'white',borderRadius:20,padding:20,textAlign:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',border:`1px solid ${p}10`}}>
                <div style={{width:80,height:80,borderRadius:16,background:`${p}10`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',overflow:'hidden'}}>
                  {imgSrc(pr) ? <img src={imgSrc(pr)!} alt={pr.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:28}}>💊</span>}
                </div>
                <div style={{fontWeight:700,color:theme.textColor,fontSize:13,marginBottom:4}}>{pr.name}</div>
                <div style={{fontWeight:800,color:p,fontSize:15,marginBottom:10}}>NPR {pr.price?.toLocaleString?.()}</div>
                <button style={{width:'100%',padding:'7px',borderRadius:8,background:p,color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:'pointer'}}>{pr.inStock?(s.ctaText||'Order'):'Out'}</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // premium-layout
  if (variant === 'premium-layout') {
    return (
      <div style={{...css,...padding,background:'#0f172a'}}>
        <div className={wrapperClass}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'2rem',fontWeight:700,color:'#fff',marginBottom:8}}>{s.title||'Premium Products'}</h2>
            {s.subtitle && <p style={{color:'rgba(255,255,255,0.5)'}}>{s.subtitle}</p>}
          </div>
          <div style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${cols},1fr)`}}>
            {display.map((pr:any)=>(
              <div key={pr.id} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,overflow:'hidden'}}>
                <div style={{height:140,background:`${p}20`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {imgSrc(pr) ? <img src={imgSrc(pr)!} alt={pr.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:36,opacity:0.5}}>💊</span>}
                </div>
                <div style={{padding:'14px 16px'}}>
                  <div style={{fontWeight:600,color:'#fff',fontSize:13,marginBottom:4}}>{pr.name}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                    <span style={{fontWeight:800,color:p,fontSize:14}}>NPR {pr.price?.toLocaleString?.()}</span>
                    <button style={{padding:'6px 12px',borderRadius:6,background:p,color:'#fff',fontWeight:600,fontSize:11,border:'none',cursor:'pointer'}}>{pr.inStock?'Order':'Out'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding}}>
      <div className={wrapperClass}>
        <SectionTitle title={(s.title as string)||'Our Products'} subtitle={s.subtitle as string} theme={theme}/>
        <div style={{display:'grid',gap:16,gridTemplateColumns:`repeat(${cols},1fr)`}}>
          {display.map((pr:any)=><ProductCard key={pr.id} pr={pr}/>)}
        </div>
        <p style={{textAlign:'center',fontSize:11,marginTop:16,color:`${theme.textColor}50`}}>
          {isLive?`Showing ${display.length} products`:loadError?'Preview mode':'Loading…'}
        </p>
      </div>
    </div>
  );
}
