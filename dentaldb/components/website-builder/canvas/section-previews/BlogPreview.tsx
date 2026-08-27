'use client';

import React from 'react';
import type { PreviewProps } from './types';
import { resolveImg, SectionTitle } from './shared';

export function BlogPreview({ s, css, padding, theme, wrapperClass }: PreviewProps) {
  const variant = s.variant ?? 'modern-grid';
  const p = theme.primaryColor;

  const samplePosts = [
    { id:'1', title:'Understanding Heart Health: Tips for a Stronger Cardiovascular System', excerpt:'Learn how lifestyle choices affect your heart and what you can do today to improve cardiovascular health.', category:'Cardiology', author:'Dr. Smith', date:'May 12, 2025', readTime:'5 min', image:'' },
    { id:'2', title:'Skincare Routines: What Dermatologists Actually Recommend', excerpt:'Dermatologists share the evidence-based skincare routines that actually work for different skin types.', category:'Dermatology', author:'Dr. Patel', date:'May 8, 2025', readTime:'4 min', image:'' },
    { id:'3', title:'Managing Diabetes: A Comprehensive Guide for Patients', excerpt:'Practical strategies for managing blood sugar, diet, exercise and medication for type 2 diabetes.', category:'Endocrinology', author:'Dr. Chen', date:'Apr 29, 2025', readTime:'7 min', image:'' },
    { id:'4', title:"Children's Vaccination Schedule: What Every Parent Should Know", excerpt:"An updated guide to childhood vaccinations, timing, and why they matter for your child's long-term health.", category:'Pediatrics', author:'Dr. Lee', date:'Apr 20, 2025', readTime:'6 min', image:'' },
    { id:'5', title:'Mental Health in the Workplace: Recognizing Signs of Burnout', excerpt:'How to identify, address, and prevent burnout before it affects your productivity and relationships.', category:'Mental Health', author:'Dr. Nguyen', date:'Apr 15, 2025', readTime:'5 min', image:'' },
    { id:'6', title:'Physiotherapy After Surgery: Recovery Tips from Specialists', excerpt:'Expert advice on post-surgical physiotherapy to speed recovery and regain full function safely.', category:'Physiotherapy', author:'Dr. Kumar', date:'Apr 10, 2025', readTime:'4 min', image:'' },
  ];

  const posts: any[] = (() => {
    const raw: any[] = (s.posts as any[])?.length ? s.posts : samplePosts;
    const hidden: string[] = (s.hiddenPostIds as string[]) || [];
    const max = s.maxPosts ? Number(s.maxPosts) : 6;
    return raw.filter(p => !hidden.includes(p.id)).slice(0, max);
  })();

  const PostCard = ({ post, horizontal=false }: { post: any; horizontal?: boolean }) => (
    <div style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1px solid ${p}10`, display:horizontal?'flex':'block', cursor:'pointer' }}>
      <div style={{ height:horizontal?'auto':160, width:horizontal?140:'auto', minWidth:horizontal?140:undefined, background:`${p}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {post.image ? <img src={resolveImg(post.image)} alt={post.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:36,opacity:0.4}}>📰</span>}
      </div>
      <div style={{padding:horizontal?'14px 18px':'16px 18px',flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 8px',borderRadius:999}}>{post.category}</span>
          <span style={{fontSize:11,color:'#9ca3af'}}>⏱ {post.readTime} read</span>
        </div>
        <h3 style={{fontWeight:700,color:theme.textColor,fontSize:horizontal?13:14,lineHeight:1.4,marginBottom:6}}>{post.title}</h3>
        {!horizontal && <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5,marginBottom:10}}>{post.excerpt?.slice(0,80)}…</p>}
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:22,height:22,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:p}}>{post.author?.[3]||'D'}</div>
          <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.date}</span>
        </div>
      </div>
    </div>
  );

  if (variant === 'modern-grid' || variant === 'classic') {
    return (
      <div style={{...css,...padding,background:'#f9fafb'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Articles'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {posts.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'magazine') {
    const [featured,...rest] = posts;
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Magazine'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:24,marginBottom:24}}>
            <div style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',cursor:'pointer',border:`1px solid ${p}10`}}>
              <div style={{height:280,background:`${p}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {featured?.image ? <img src={resolveImg(featured.image)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:64,opacity:0.3}}>📰</span>}
              </div>
              <div style={{padding:28}}>
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  <span style={{fontSize:11,fontWeight:700,color:p,background:`${p}12`,padding:'3px 10px',borderRadius:999}}>{featured?.category}</span>
                  <span style={{fontSize:11,color:'#9ca3af'}}>⏱ {featured?.readTime} read</span>
                </div>
                <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.4rem',fontWeight:700,color:theme.textColor,marginBottom:10,lineHeight:1.4}}>{featured?.title}</h2>
                <p style={{fontSize:14,color:'#6b7280',lineHeight:1.6,marginBottom:16}}>{featured?.excerpt}</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:12,color:'#9ca3af'}}>{featured?.author} · {featured?.date}</span>
                  <span style={{fontSize:13,color:p,fontWeight:600}}>Read More →</span>
                </div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {rest.slice(0,3).map((post,i)=><PostCard key={i} post={post} horizontal/>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'bento') {
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Tips'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'auto auto',gap:16}}>
            {posts.slice(0,5).map((post,i)=>(
              <div key={i} style={{borderRadius:20,overflow:'hidden',background:i===0?`linear-gradient(135deg,${p},${theme.secondaryColor})`:'white',gridColumn:i===0?'span 2':undefined,boxShadow:i===0?`0 8px 32px ${p}30`:'0 2px 12px rgba(0,0,0,0.07)',cursor:'pointer',border:i!==0?`1px solid ${p}10`:'none'}}>
                {i===0 ? (
                  <div style={{padding:32}}>
                    <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.2)',padding:'3px 10px',borderRadius:999,marginBottom:14,display:'inline-block'}}>{post.category}</span>
                    <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.3rem',fontWeight:700,color:'#fff',marginBottom:10,lineHeight:1.4}}>{post.title}</h2>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.8)',lineHeight:1.5,marginBottom:16}}>{post.excerpt?.slice(0,100)}…</p>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>{post.author} · {post.readTime} read</span>
                  </div>
                ) : (
                  <div style={{padding:'18px 20px'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 8px',borderRadius:999,marginBottom:8,display:'inline-block'}}>{post.category}</span>
                    <h3 style={{fontWeight:700,color:theme.textColor,fontSize:13,lineHeight:1.4,marginBottom:6}}>{post.title}</h3>
                    <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.readTime} read</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'featured-article') {
    const [feat,...rest] = posts;
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Featured Article'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:48,alignItems:'center',marginBottom:40}}>
            <div style={{aspectRatio:'4/3',borderRadius:20,background:`${p}15`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {feat?.image ? <img src={resolveImg(feat.image)} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontSize:64,opacity:0.3}}>📰</span>}
            </div>
            <div>
              <span style={{fontSize:11,fontWeight:700,color:p,background:`${p}12`,padding:'3px 10px',borderRadius:999,marginBottom:14,display:'inline-block'}}>{feat?.category}</span>
              <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:700,color:theme.textColor,lineHeight:1.3,marginBottom:14}}>{feat?.title}</h2>
              <p style={{color:'#6b7280',lineHeight:1.7,marginBottom:20,fontSize:15}}>{feat?.excerpt}</p>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p}}>{feat?.author?.[3]||'D'}</div>
                <div><div style={{fontWeight:600,color:theme.textColor,fontSize:13}}>{feat?.author}</div><div style={{fontSize:11,color:'#9ca3af'}}>{feat?.date} · {feat?.readTime} read</div></div>
              </div>
              <button style={{padding:'11px 24px',borderRadius:8,background:p,color:'#fff',fontWeight:600,border:'none',cursor:'pointer',fontSize:14}}>Read Full Article</button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            {rest.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div style={{...css,...padding,background:`${p}08`}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Latest Articles'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:20,overflowX:'auto',paddingBottom:8}}>
            {posts.map((post,i)=>(
              <div key={i} style={{minWidth:280,flexShrink:0,background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.07)'}}>
                <div style={{height:160,background:`${p}${14+i*5}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:36,opacity:0.4}}>📰</span>
                </div>
                <div style={{padding:'16px 18px'}}>
                  <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 8px',borderRadius:999}}>{post.category}</span>
                    <span style={{fontSize:10,color:'#9ca3af'}}>⏱ {post.readTime}</span>
                  </div>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:13,lineHeight:1.4,marginBottom:8}}>{post.title}</h3>
                  <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.date}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:20}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===0?24:8,height:8,borderRadius:4,background:i===0?p:'#e5e7eb'}}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'doctor-articles') {
    const byDoctor = [
      {doc:'Dr. Smith',spec:'Cardiology',posts:posts.slice(0,2)},
      {doc:'Dr. Patel',spec:'Dermatology',posts:posts.slice(2,4)},
    ];
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'From Our Doctors'} subtitle={s.subtitle} theme={theme}/>
          {byDoctor.map((group,gi)=>(
            <div key={gi} style={{marginBottom:36}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:`${p}15`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:p,fontSize:16,flexShrink:0}}>{group.doc[3]}</div>
                <div><div style={{fontWeight:700,color:theme.textColor}}>{group.doc}</div><div style={{fontSize:12,color:p,fontWeight:600}}>{group.spec}</div></div>
                <div style={{flex:1,height:1,background:'#e5e7eb',marginLeft:8}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {group.posts.map((post,i)=><PostCard key={i} post={post} horizontal/>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'health-tips') {
    return (
      <div style={{...css,...padding,background:'#f0fdf4'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Health Tips'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
            {posts.slice(0,4).map((post,i)=>(
              <div key={i} style={{background:'white',borderRadius:16,padding:'18px 22px',display:'flex',gap:16,alignItems:'flex-start',boxShadow:'0 2px 10px rgba(0,0,0,0.05)',border:`1px solid ${p}10`}}>
                <div style={{width:48,height:48,borderRadius:12,background:`${p}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:22}}>
                  {['❤️','🌿','🩺','🏃'][i%4]}
                </div>
                <div>
                  <span style={{fontSize:10,fontWeight:700,color:p,background:`${p}12`,padding:'2px 7px',borderRadius:999,marginBottom:6,display:'inline-block'}}>{post.category}</span>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,lineHeight:1.4,marginBottom:4}}>{post.title}</h3>
                  <p style={{fontSize:12,color:'#9ca3af',lineHeight:1.5,marginBottom:8}}>{post.excerpt?.slice(0,70)}…</p>
                  <span style={{fontSize:11,color:p,fontWeight:600}}>Read More →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'latest-articles') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.6rem',fontWeight:700,color:theme.textColor}}>{s.title||'Latest Articles'}</h2>
            <span style={{fontSize:13,color:p,fontWeight:600,cursor:'pointer'}}>View All →</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {posts.slice(0,5).map((post,i)=>(
              <div key={i} style={{display:'flex',gap:16,alignItems:'center',padding:'16px 0',borderBottom:'1px solid #f1f5f9',cursor:'pointer'}}>
                <div style={{width:80,height:60,borderRadius:10,background:`${p}${14+i*4}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:20,opacity:0.6}}>📰</div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p}}>{post.category}</span>
                    <span style={{fontSize:10,color:'#9ca3af'}}>· {post.readTime} read</span>
                  </div>
                  <h3 style={{fontWeight:700,color:theme.textColor,fontSize:14,lineHeight:1.4,marginBottom:4}}>{post.title}</h3>
                  <span style={{fontSize:11,color:'#9ca3af'}}>{post.author} · {post.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'category-showcase') {
    const cats = ['All','Cardiology','Dermatology','Pediatrics','Mental Health','Physiotherapy'];
    return (
      <div style={{...css,...padding,background:'#f8faff'}}>
        <div className={wrapperClass}>
          <SectionTitle title={s.title||'Browse by Category'} subtitle={s.subtitle} theme={theme}/>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginBottom:28}}>
            {cats.map((cat,i)=>(
              <button key={i} style={{padding:'7px 18px',borderRadius:999,border:'none',background:i===0?p:'white',color:i===0?'#fff':theme.textColor,fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>{cat}</button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
            {posts.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'editorial') {
    return (
      <div style={{...css,...padding,background:'white'}}>
        <div className={wrapperClass}>
          <div style={{borderBottom:`2px solid ${p}20`,marginBottom:32,paddingBottom:16,display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.8rem',fontWeight:300,color:theme.textColor,letterSpacing:'-0.02em'}}>{s.title||'Health Insights'}</h2>
            <span style={{fontSize:12,color:p,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase',cursor:'pointer'}}>All Articles →</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:40}}>
            <div>
              {posts.slice(0,1).map((post,i)=>(
                <div key={i} style={{cursor:'pointer'}}>
                  <div style={{aspectRatio:'16/9',borderRadius:16,background:`${p}18`,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
                    <span style={{fontSize:48,opacity:0.3}}>📰</span>
                  </div>
                  <div style={{display:'flex',gap:10,marginBottom:10}}>
                    <span style={{fontSize:11,fontWeight:700,color:p,textTransform:'uppercase',letterSpacing:'0.08em'}}>{post.category}</span>
                    <span style={{color:'#e5e7eb'}}>·</span>
                    <span style={{fontSize:11,color:'#9ca3af'}}>{post.date}</span>
                  </div>
                  <h2 style={{fontFamily:theme.fontHeading,fontSize:'1.4rem',fontWeight:700,color:theme.textColor,lineHeight:1.3,marginBottom:10}}>{post.title}</h2>
                  <p style={{color:'#6b7280',lineHeight:1.7,fontSize:14}}>{post.excerpt}</p>
                </div>
              ))}
            </div>
            <div style={{borderLeft:`1px solid #f1f5f9`,paddingLeft:32}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:16}}>More Articles</div>
              <div style={{display:'flex',flexDirection:'column',gap:18}}>
                {posts.slice(1,5).map((post,i)=>(
                  <div key={i} style={{cursor:'pointer',paddingBottom:18,borderBottom:i<3?'1px solid #f1f5f9':'none'}}>
                    <span style={{fontSize:10,fontWeight:700,color:p,marginBottom:4,display:'block'}}>{post.category}</span>
                    <h4 style={{fontWeight:700,color:theme.textColor,fontSize:13,lineHeight:1.4,marginBottom:4}}>{post.title}</h4>
                    <span style={{fontSize:11,color:'#9ca3af'}}>{post.readTime} read</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // default
  return (
    <div style={{...css,...padding,background:'#f9fafb'}}>
      <div className={wrapperClass}>
        <SectionTitle title={s.title||'Health Articles'} subtitle={s.subtitle} theme={theme}/>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
          {posts.slice(0,3).map((post,i)=><PostCard key={i} post={post}/>)}
        </div>
      </div>
    </div>
  );
}
