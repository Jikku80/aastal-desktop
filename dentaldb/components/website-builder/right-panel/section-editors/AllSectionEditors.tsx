'use client';

import React from 'react';
import {
  EditorField, EditorSelect, EditorToggle, EditorColorPicker,
  EditorSection, EditorTabs, EditorArrayField, EditorImageUpload, EditorRating,
} from './EditorComponents';

type Props = { settings: Record<string, any>; onChange: (u: Record<string, any>) => void; clinicId?: string };

// CRITICAL FIX: Always guard settings against undefined/null (AI-generated sections may omit settings)
const safe = (settings: any): Record<string, any> => settings ?? {};
const set = (onChange: Props['onChange']) => (key: string, val: any) => onChange({ [key]: val });

const font = "'Inter','Geist','Segoe UI',system-ui,sans-serif";

// Shared dark-themed remove button for array items
const RemoveBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} style={{
    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
    color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 1, borderRadius: 4,
    transition: 'color 0.12s',
  }}
    onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
  >✕</button>
);

// Shared item header row
const ItemHeader = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#8b8fa8', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
    <RemoveBtn onClick={onRemove} />
  </div>
);

const Stack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
);

const PadStack = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
);

// ── About ─────────────────────────────────────────────────────────────────────
export function AboutEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Body Text" value={s.body}    onChange={v => $set('body', v)} multiline rows={5} />
          <EditorImageUpload label="Image" value={s.image} onChange={v => $set('image', v)} />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'split'} onChange={v => $set('variant', v)} options={[
            { value: 'split',            label: '1. Classic Split' },
            { value: 'timeline',         label: '2. Timeline' },
            { value: 'mission-vision',   label: '3. Mission & Vision' },
            { value: 'founder-spotlight',label: '4. Founder Spotlight' },
            { value: 'stats-integrated', label: '5. Stats Integrated' },
            { value: 'multi-column',     label: '6. Multi-Column' },
            { value: 'awards',           label: '7. Awards' },
            { value: 'story-layout',     label: '8. Story Layout' },
            { value: 'image-gallery-style', label: '9. Image Gallery' },
          ]} />
          <EditorSelect label="Image Position" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'image-right', label: 'Image Right' },
            { value: 'image-left',  label: 'Image Left' },
            { value: 'full-width',  label: 'Full Width' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}

// ── Services ──────────────────────────────────────────────────────────────────
export function ServicesEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorArrayField
            label="Services"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Service"
            defaultItem={{ id: '', title: 'New Service', icon: '🩺', description: '', price: '' }}
            renderItem={(item, update, remove) => (
              <Stack>
                <ItemHeader label={item.title} onRemove={remove} />
                <EditorField label="Title" value={item.title} onChange={v => update({ title: v })} />
                <EditorField label="Icon" value={item.icon} onChange={v => update({ icon: v })} placeholder="e.g. ♥ or leave blank" />
                <EditorField label="Description" value={item.description} onChange={v => update({ description: v })} multiline rows={2} />
                <EditorField label="Price (optional)" value={item.price} onChange={v => update({ price: v })} placeholder="NPR 500" />
              </Stack>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',               label: '1. Cards' },
            { value: 'premium-cards',       label: '2. Premium Cards' },
            { value: 'bento-grid',          label: '3. Bento Grid' },
            { value: 'icon-based',          label: '4. Icon Based' },
            { value: 'tabs',                label: '5. Tabs' },
            { value: 'image-first',         label: '6. Image First' },
            { value: 'treatment-pathway',   label: '7. Treatment Pathway' },
            { value: 'accordion',           label: '8. Accordion' },
            { value: 'horizontal-scroll',   label: '9. Horizontal Scroll' },
            { value: 'category-groups',     label: '10. Category Groups' },
            { value: 'department-showcase', label: '11. Department Showcase' },
            { value: 'interactive-hover',   label: '12. Interactive Hover' },
            { value: 'specialist-grid',     label: '13. Specialist Grid' },
            { value: 'masonry-grid',        label: '14. Masonry Grid' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }, { value: 'cards', label: 'Cards' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns)} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
          ]} />
          <EditorToggle label="Show Icons"  checked={s.showIcons  !== false} onChange={v => $set('showIcons',  v)} />
          <EditorToggle label="Show Prices" checked={s.showPrices === true}  onChange={v => $set('showPrices', v)} />
        </Stack>
      )},
    ]} />
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────
export function TeamEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorSelect label="Data Source" value={s.dataSource} onChange={v => $set('dataSource', v)} options={[
            { value: 'live-api', label: 'Live — Auto-sync from Doctors' },
            { value: 'manual',   label: 'Manual — Manage members below' },
          ]} />
          {s.dataSource === 'manual' && (
            <EditorArrayField
              label="Team Members"
              items={s.members || []}
              onChange={items => $set('members', items)}
              addLabel="Add Member"
              defaultItem={{ id: '', name: 'Dr. Name', role: 'Specialist', bio: '', avatar: '', showBookButton: true }}
              renderItem={(item, update, remove) => (
                <Stack>
                  <ItemHeader label={item.name} onRemove={remove} />
                  <EditorImageUpload label="Avatar" value={item.avatar} onChange={v => update({ avatar: v })} />
                  <EditorField label="Name"  value={item.name} onChange={v => update({ name: v })} />
                  <EditorField label="Role"  value={item.role} onChange={v => update({ role: v })} placeholder="Cardiologist" />
                  <EditorField label="Bio"   value={item.bio}  onChange={v => update({ bio: v })} multiline rows={2} />
                </Stack>
              )}
            />
          )}
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',                         label: '1. Cards' },
            { value: 'premium-profiles',              label: '2. Premium Profiles' },
            { value: 'featured-doctor',               label: '3. Featured Doctor' },
            { value: 'horizontal-cards',              label: '4. Horizontal Cards' },
            { value: 'luxury-cosmetic-specialists',   label: '5. Luxury Cosmetic' },
            { value: 'department-groups',             label: '6. Department Groups' },
            { value: 'bento',                         label: '7. Bento' },
            { value: 'carousel',                      label: '8. Carousel' },
            { value: 'team-wall',                     label: '9. Team Wall' },
            { value: 'medical-board',                 label: '10. Medical Board' },
            { value: 'multi-location-listing',        label: '11. Multi-Location Listing' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'grid',     label: 'Grid' },
            { value: 'cards',    label: 'Cards' },
            { value: 'list',     label: 'List' },
            { value: 'carousel', label: 'Carousel' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns)} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' }, { value: '3', label: '3 Columns' }, { value: '4', label: '4 Columns' },
          ]} />
          <EditorToggle label="Show Specializations" checked={s.showSpecializations !== false} onChange={v => $set('showSpecializations', v)} />
          <EditorToggle label="Show Book Button"     checked={s.showBookButton !== false}      onChange={v => $set('showBookButton', v)} />
        </Stack>
      )},
    ]} />
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────────
export function TestimonialsEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorArrayField
            label="Reviews"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Review"
            defaultItem={{ id: '', name: 'Patient Name', rating: 5, text: 'Great experience!', role: 'Patient' }}
            renderItem={(item, update, remove) => (
              <Stack>
                <ItemHeader label={item.name} onRemove={remove} />
                <EditorField label="Name" value={item.name} onChange={v => update({ name: v })} />
                <EditorField label="Role" value={item.role} onChange={v => update({ role: v })} placeholder="Patient" />
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#8b8fa8', marginBottom: 5, fontFamily: font }}>Rating</label>
                  <EditorRating value={item.rating} onChange={v => update({ rating: v })} />
                </div>
                <EditorField label="Review" value={item.text} onChange={v => update({ text: v })} multiline rows={3} />
              </Stack>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',              label: '1. Cards' },
            { value: 'bento-reviews',      label: '2. Bento Reviews' },
            { value: 'google-style',       label: '3. Google Style' },
            { value: 'large-quote',        label: '4. Large Quote' },
            { value: 'trust-wall',         label: '5. Trust Wall' },
            { value: 'featured-story',     label: '6. Featured Story' },
            { value: 'minimal',            label: '7. Minimal' },
            { value: 'carousel',           label: '8. Carousel' },
            { value: 'stats-reviews',      label: '9. Stats + Reviews' },
            { value: 'doctor-specific',    label: '10. Doctor Specific' },
            { value: 'department-reviews', label: '11. Department Reviews' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'carousel', label: 'Carousel' },
            { value: 'grid',     label: 'Grid' },
            { value: 'list',     label: 'List' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}

// ── Appointment Booking ───────────────────────────────────────────────────────
export function AppointmentBookingEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'classic'} onChange={v => $set('variant', v)} options={[
            { value: 'classic', label: '1. Classic Calendar' },
            { value: 'full-width', label: '2. Full Width' },
            { value: 'sidebar-card', label: '3. Sidebar Card' },
            { value: 'luxury', label: '4. Luxury' },
            { value: 'multi-step', label: '5. Multi-Step' },
            { value: 'doctor-first', label: '6. Doctor First' },
            { value: 'treatment-first', label: '7. Treatment First' },
            { value: 'emergency-booking', label: '8. Emergency Booking' },
            { value: 'quick-consult', label: '9. Quick Consult' },
            { value: 'sticky-cta', label: '10. Sticky CTA' },
          ]} />
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Confirmation Message" value={s.confirmationMessage} onChange={v => $set('confirmationMessage', v)} multiline />
        </Stack>
      )},
      { label: 'Options', content: (
        <Stack>
          <EditorSection title="Filters">
            <EditorSelect label="Branch Filter" value={s.branchFilter} onChange={v => $set('branchFilter', v)} options={[
              { value: 'all',      label: 'All Branches' },
              { value: 'specific', label: 'Specific Branch' },
            ]} />
            <EditorSelect label="Doctor Filter" value={s.doctorFilter} onChange={v => $set('doctorFilter', v)} options={[
              { value: 'all',      label: 'All Doctors' },
              { value: 'specific', label: 'Specific Doctor' },
            ]} />
          </EditorSection>
          <EditorSection title="Calendar Style">
            <EditorSelect label="Style" value={s.calendarStyle} onChange={v => $set('calendarStyle', v)} options={[
              { value: 'slots-grid',      label: 'Slots Grid' },
              { value: 'date-picker',     label: 'Date Picker' },
              { value: 'inline-calendar', label: 'Inline Calendar' },
            ]} />
          </EditorSection>
          <EditorSection title="Form Fields">
            {['patientName','patientPhone','patientEmail','notes','doctorSelect','branchSelect'].map(f => (
              <EditorToggle key={f}
                label={f.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                checked={s.formFields?.[f] !== false}
                onChange={v => $set('formFields', { ...(s.formFields || {}), [f]: v })}
              />
            ))}
          </EditorSection>
        </Stack>
      )},
    ]} />
  );
}

// ── Working Hours ─────────────────────────────────────────────────────────────
export function WorkingHoursEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const inputSt: React.CSSProperties = {
    flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
    padding: '5px 7px', fontSize: 11, background: 'rgba(0,0,0,0.3)',
    color: '#c9ccd8', fontFamily: font, outline: 'none',
  };
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'table'} onChange={v => $set('variant', v)} options={[
        { value: 'table',       label: '1. Table' },
        { value: 'cards',       label: '2. Day Cards' },
        { value: 'premium',     label: '3. Premium Split' },
        { value: 'emergency',   label: '4. Emergency / Dark' },
        { value: 'timeline',    label: '5. Timeline' },
        { value: 'doctor-wise', label: '6. Doctor-Wise' },
      ]} />
      
      <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} />
      <EditorSelect label="Data Source" value={s.dataSource} onChange={v => $set('dataSource', v)} options={[
        { value: 'live-api', label: 'Auto-sync from Clinic Settings' },
        { value: 'manual',   label: 'Manual Entry' },
      ]} />
      {s.dataSource === 'manual' && (
        <EditorSection title="Hours">
          {days.map(day => {
            const slot = s.hours?.[day];
            return (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, fontSize: 10.5, fontWeight: 600, color: '#6b7080', textTransform: 'capitalize', fontFamily: font }}>{day.slice(0,3)}</div>
                {slot ? (
                  <>
                    <input type="time" value={slot.open}  onChange={e => $set('hours', { ...s.hours, [day]: { ...slot, open:  e.target.value }})} style={inputSt} />
                    <span style={{ color: '#4b5060', fontSize: 10 }}>–</span>
                    <input type="time" value={slot.close} onChange={e => $set('hours', { ...s.hours, [day]: { ...slot, close: e.target.value }})} style={inputSt} />
                    <RemoveBtn onClick={() => $set('hours', { ...s.hours, [day]: null })} />
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 11, color: '#4b5060', fontStyle: 'italic', fontFamily: font }}>Closed</span>
                    <button onClick={() => $set('hours', { ...s.hours, [day]: { open: '09:00', close: '17:00' }})}
                      style={{ fontSize: 11, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: font, padding: '2px 4px' }}>
                      + Add
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </EditorSection>
      )}
      <EditorToggle label="Highlight Today"  checked={s.showTodayHighlight !== false} onChange={v => $set('showTodayHighlight', v)} />
      <EditorToggle label="Show Closed Days" checked={s.showClosedDays !== false}     onChange={v => $set('showClosedDays', v)} />
      <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
        { value: 'table', label: 'Table' }, { value: 'cards', label: 'Cards' }, { value: 'list', label: 'List' },
      ]} />
    </PadStack>
  );
}

// ── Contact ───────────────────────────────────────────────────────────────────
export function ContactEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'classic'} onChange={v => $set('variant', v)} options={[
        { value: 'classic',        label: '1. Classic' },
        { value: 'premium',        label: '2. Premium' },
        { value: 'minimal',        label: '3. Minimal' },
        { value: 'emergency',      label: '4. Emergency' },
        { value: 'multi-location', label: '5. Multi-Location' },
        { value: 'consultation',   label: '6. Consultation' },
        { value: 'contact-faq',    label: '7. Contact + FAQ' },
        { value: 'dept-inquiry',   label: '8. Department Inquiry' },
        { value: 'doctor-inquiry', label: '9. Doctor Inquiry' },
      ]} />
      
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Address"  value={s.address}  onChange={v => $set('address', v)} multiline rows={2} />
          <EditorField label="Phone"    value={s.phone}    onChange={v => $set('phone', v)} />
          <EditorField label="Email"    value={s.email}    onChange={v => $set('email', v)} />
          <EditorField label="Map Embed URL" value={s.mapEmbedUrl} onChange={v => $set('mapEmbedUrl', v)} placeholder="Google Maps embed URL" />
        </Stack>
      )},
      { label: 'Options', content: (
        <Stack>
          <EditorToggle label="Show Contact Form"    checked={s.showForm    !== false} onChange={v => $set('showForm', v)} />
          <EditorToggle label="Show Map"             checked={s.showMap     === true}  onChange={v => $set('showMap', v)} />
          <EditorToggle label="Show Contact Details" checked={s.showDetails !== false} onChange={v => $set('showDetails', v)} />
        </Stack>
      )},
    ]} />
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────
export function GalleryEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorArrayField
            label="Images"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Image"
            defaultItem={{ id: '', url: '', caption: '' }}
            renderItem={(item, update, remove) => (
              <Stack>
                <EditorImageUpload label="" value={item.url} onChange={v => update({ url: v })} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <EditorField label="Caption" value={item.caption} onChange={v => update({ caption: v })} />
                  </div>
                  <RemoveBtn onClick={remove} />
                </div>
              </Stack>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'grid'} onChange={v => $set('variant', v)} options={[
            { value: 'grid',               label: '1. Grid' },
            { value: 'masonry',            label: '2. Masonry' },
            { value: 'bento',              label: '3. Bento' },
            { value: 'before-after',       label: '4. Before & After' },
            { value: 'clinic-tour',        label: '5. Clinic Tour' },
            { value: 'lightbox',           label: '6. Lightbox' },
            { value: 'luxury',             label: '7. Luxury' },
            { value: 'equipment',          label: '8. Equipment' },
            { value: 'carousel-gallery',   label: '9. Carousel' },
            { value: 'department-gallery', label: '10. Department Gallery' },
            { value: 'stacked-modern',     label: '11. Stacked Modern' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'grid',    label: 'Grid' },
            { value: 'masonry', label: 'Masonry' },
            { value: 'carousel',label: 'Carousel' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns)} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2' }, { value: '3', label: '3' }, { value: '4', label: '4' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
export function FaqEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'accordion'} onChange={v => $set('variant', v)} options={[
        { value: 'accordion', label: '1. Accordion' },
        { value: 'modern-cards', label: '2. Modern Cards' },
        { value: 'two-column', label: '3. Two Column' },
        { value: 'premium', label: '4. Premium' },
        { value: 'category', label: '5. Category' },
        { value: 'dark', label: '6. Dark' },
      ]} />
      
      <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
      <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
      <EditorArrayField
        label="Questions"
        items={s.items || []}
        onChange={items => $set('items', items)}
        addLabel="Add Question"
        defaultItem={{ id: '', question: 'Your Question?', answer: 'Your Answer.' }}
        renderItem={(item, update, remove) => (
          <Stack>
            <ItemHeader label={item.question} onRemove={remove} />
            <EditorField label="Question" value={item.question} onChange={v => update({ question: v })} />
            <EditorField label="Answer"   value={item.answer}   onChange={v => update({ answer: v })} multiline rows={3} />
          </Stack>
        )}
      />
    </PadStack>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export function StatsEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'banner'} onChange={v => $set('variant', v)} options={[
        { value: 'banner', label: '1. Banner' },
        { value: 'floating-cards', label: '2. Floating Cards' },
        { value: 'bento', label: '3. Bento' },
        { value: 'with-icons', label: '4. With Icons' },
        { value: 'dark-premium', label: '5. Dark Premium' },
        { value: 'gradient-bg', label: '6. Gradient' },
        { value: 'circular', label: '7. Circular' },
        { value: 'dashboard', label: '8. Dashboard Style' },
        { value: 'timeline-stats', label: '9. Timeline Stats' },
      ]} />
      
      <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} placeholder="Optional title" />
      <EditorArrayField
        label="Statistics"
        items={s.items || []}
        onChange={items => $set('items', items)}
        addLabel="Add Stat"
        defaultItem={{ id: '', value: '100+', label: 'Patients' }}
        renderItem={(item, update, remove) => (
          <Stack>
            <ItemHeader label={`${item.value} ${item.label}`} onRemove={remove} />
            <EditorField label="Value" value={item.value} onChange={v => update({ value: v })} placeholder="100+" />
            <EditorField label="Label" value={item.label} onChange={v => update({ label: v })} placeholder="Happy Patients" />
          </Stack>
        )}
      />
    </PadStack>
  );
}

// ── CTA Banner ────────────────────────────────────────────────────────────────
export function CtaBannerEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'horizontal'} onChange={v => $set('variant', v)} options={[
        { value: 'horizontal',        label: '1. Horizontal' },
        { value: 'centered',          label: '2. Centered' },
        { value: 'dark',              label: '3. Dark' },
        { value: 'emergency',         label: '4. Emergency' },
        { value: 'whatsapp',          label: '5. WhatsApp' },
        { value: 'gradient-card',     label: '6. Gradient Card' },
        { value: 'minimal',           label: '7. Minimal' },
        { value: 'split-color',       label: '8. Split Color' },
        { value: 'download-brochure', label: '9. Download Brochure' },
        { value: 'insurance-verify',  label: '10. Insurance Verify' },
        { value: 'health-checkup',    label: '11. Health Checkup' },
      ]} />
      
      <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
      <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
      <EditorField label="Button Text" value={s.ctaText} onChange={v => $set('ctaText', v)} />
      <EditorSelect label="Button Action" value={s.ctaAction} onChange={v => $set('ctaAction', v)} options={[
        { value: 'scroll-to-booking', label: 'Scroll to Booking' },
        { value: 'link',  label: 'Link to URL' },
        { value: 'phone', label: 'Call Phone' },
      ]} />
      {s.ctaAction !== 'scroll-to-booking' && (
        <EditorField label="Action Value" value={s.ctaValue} onChange={v => $set('ctaValue', v)} />
      )}
      <EditorColorPicker label="Background Color" value={s.background} onChange={v => $set('background', v)} />
      <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
        { value: 'centered', label: 'Centered' },
        { value: 'split',    label: 'Split (text left, button right)' },
      ]} />
    </PadStack>
  );
}

// ── Rich Text ─────────────────────────────────────────────────────────────────
export function RichTextEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <div>
        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#8b8fa8', marginBottom: 5, fontFamily: font }}>
          Content (HTML supported)
        </label>
        <textarea
          value={s.content || ''}
          onChange={e => $set('content', e.target.value)}
          rows={10}
          style={{
            width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
            padding: '8px 10px', fontSize: 11.5, fontFamily: "'JetBrains Mono','Fira Code',monospace",
            background: 'rgba(0,0,0,0.3)', color: '#c9ccd8', outline: 'none', resize: 'vertical',
            boxSizing: 'border-box', lineHeight: 1.6,
          }}
          placeholder="<p>Your content here...</p>"
        />
      </div>
      <EditorSelect label="Design Variant" value={s.variant ?? 'article'} onChange={v => $set('variant', v)} options={[
        { value: 'article',      label: '1. Article' },
        { value: 'two-column',   label: '2. Two Column' },
        { value: 'editorial',    label: '3. Editorial' },
        { value: 'medical-guide',label: '4. Medical Guide' },
        { value: 'highlight',    label: '5. Highlight' },
      ]} />
      <EditorSelect label="Alignment" value={s.alignment} onChange={v => $set('alignment', v)} options={[
        { value: 'left',   label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right',  label: 'Right' },
      ]} />
    </PadStack>
  );
}

// ── Map ───────────────────────────────────────────────────────────────────────
export function MapEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);

  const [branches, setBranches] = React.useState<Array<{ id: string; name: string; address?: string; latitude?: number | null; longitude?: number | null }>>([]);
  const [pulling, setPulling]   = React.useState(false);

  React.useEffect(() => {
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getBranchesForBuilder()
        .then((data: any[]) => setBranches(data || []))
        .catch(() => {});
    });
  }, []);

  /** Pull the first branch that has coordinates and apply to this map section */
  const pullFromBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    setPulling(true);
    const updates: Record<string, any> = {};
    if (branch.address) updates.address = branch.address;
    if (branch.latitude != null && branch.longitude != null) {
      updates.latitude  = branch.latitude;
      updates.longitude = branch.longitude;
      // Clear any stale embed URL so Leaflet coordinates take precedence
      updates.embedUrl  = '';
    }
    onChange({ ...settings, ...updates });
    setTimeout(() => setPulling(false), 600);
  };

  const branchesWithCoords = branches.filter(b => b.latitude != null && b.longitude != null);

  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'full-width'} onChange={v => $set('variant', v)} options={[
        { value: 'full-width',    label: '1. Full Width' },
        { value: 'contact-map',   label: '2. Contact + Map' },
        { value: 'floating-card', label: '3. Floating Card' },
        { value: 'multi-location',label: '4. Multi-Location' },
        { value: 'directions',    label: '5. Directions' },
      ]} />

      {/* Pull coordinates from a branch */}
      {branchesWithCoords.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8b92a5', fontFamily: font }}>
            Pull location from branch
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              defaultValue=""
              onChange={e => { if (e.target.value) pullFromBranch(e.target.value); }}
              style={{ flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #2a2d3a', background: '#1e2130', color: '#c8cdd8', fontFamily: font, cursor: 'pointer' }}>
              <option value="" disabled>Select branch…</option>
              {branchesWithCoords.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: 10, color: '#4b5060', margin: 0, fontFamily: font }}>
            Copies coordinates and address from your branch settings (GPS pin). Uses Leaflet — no API key needed.
          </p>
        </div>
      )}

      {/* Manual lat/lng override */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8b92a5', display: 'block', marginBottom: 4, fontFamily: font }}>Latitude</label>
          <input
            type="number"
            step="any"
            value={s.latitude ?? ''}
            onChange={e => $set('latitude', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="27.7172"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #2a2d3a', background: '#1e2130', color: '#c8cdd8', fontFamily: font, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#8b92a5', display: 'block', marginBottom: 4, fontFamily: font }}>Longitude</label>
          <input
            type="number"
            step="any"
            value={s.longitude ?? ''}
            onChange={e => $set('longitude', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="85.3240"
            style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #2a2d3a', background: '#1e2130', color: '#c8cdd8', fontFamily: font, boxSizing: 'border-box' }}
          />
        </div>
      </div>
      {(s.latitude != null && s.longitude != null) && (
        <p style={{ fontSize: 10, color: '#22c55e', margin: 0, fontFamily: font }}>
          ✓ Coordinates set — Leaflet map will render these exact coordinates on your site.
        </p>
      )}

      <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} placeholder="Find Us" />
      <EditorField
        label="Address"
        value={s.address}
        onChange={v => $set('address', v)}
        placeholder="123 Main St, Kathmandu"
        multiline
      />
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, lineHeight: 1.5, fontFamily: font }}>
        If coordinates above are set, the Leaflet map uses them directly. Otherwise the address is geocoded via OpenStreetMap.
      </p>
      <EditorField
        label="Custom Embed URL (optional override)"
        value={s.embedUrl}
        onChange={v => $set('embedUrl', v)}
        placeholder="https://maps.google.com/maps?q=...&output=embed"
      />
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, lineHeight: 1.5, fontFamily: font }}>
        Paste a Google Maps embed URL to override the Leaflet map entirely.
      </p>
      <EditorField label={`Height: ${s.height || 400}px`} type="range" min={200} max={700} value={s.height || 400} onChange={v => $set('height', Number(v))} />
    </PadStack>
  );
}

// ── Branches ──────────────────────────────────────────────────────────────────
export function BranchesEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorSelect label="Data Source" value={s.dataSource} onChange={v => $set('dataSource', v)} options={[
            { value: 'live-api', label: 'Auto-sync from Branches' },
            { value: 'manual',   label: 'Manual Entry' },
          ]} />
          {s.dataSource === 'manual' && (
            <EditorArrayField
              label="Locations"
              items={s.items || []}
              onChange={items => $set('items', items)}
              addLabel="Add Branch"
              defaultItem={{ id: '', name: 'Branch Name', address: '', phone: '', email: '' }}
              renderItem={(item, update, remove) => (
                <Stack>
                  <ItemHeader label={item.name} onRemove={remove} />
                  <EditorField label="Name"    value={item.name}    onChange={v => update({ name: v })} />
                  <EditorField label="Address" value={item.address} onChange={v => update({ address: v })} multiline rows={2} />
                  <EditorField label="Phone"   value={item.phone}   onChange={v => update({ phone: v })} />
                  <EditorField label="Email"   value={item.email}   onChange={v => update({ email: v })} />
                </Stack>
              )}
            />
          )}
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'cards'} onChange={v => $set('variant', v)} options={[
            { value: 'cards',              label: '1. Cards' },
            { value: 'map-first',          label: '2. Map First' },
            { value: 'premium',            label: '3. Premium' },
            { value: 'city-grid',          label: '4. City Grid' },
            { value: 'hospital-network',   label: '5. Hospital Network' },
            { value: 'carousel',           label: '6. Carousel' },
            { value: 'regional-directory', label: '7. Regional Directory' },
          ]} />
          <EditorSelect label="Layout" value={s.layout} onChange={v => $set('layout', v)} options={[
            { value: 'cards', label: 'Cards' }, { value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' },
          ]} />
          <EditorToggle label="Show Map per Branch" checked={s.showMap === true} onChange={v => $set('showMap', v)} />
        </Stack>
      )},
    ]} />
  );
}

// ── Video ─────────────────────────────────────────────────────────────────────
export function VideoEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'centered'} onChange={v => $set('variant', v)} options={[
        { value: 'centered', label: '1. Centered' },
        { value: 'side-by-side', label: '2. Side by Side' },
        { value: 'gallery', label: '3. Gallery' },
        { value: 'testimonial-video', label: '4. Testimonial Videos' },
        { value: 'fullwidth', label: '5. Full Width' },
      ]} />
      
      <EditorField label="Title (optional)" value={s.title} onChange={v => $set('title', v)} />
      <EditorField
        label="Video URL"
        value={s.url}
        onChange={v => $set('url', v)}
        placeholder="https://www.youtube.com/embed/..."
      />
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, lineHeight: 1.5, fontFamily: font }}>
        Use the embed URL from YouTube: Share → Embed → copy src
      </p>
      <EditorField label="Caption" value={s.caption} onChange={v => $set('caption', v)} />
      <EditorToggle label="Autoplay" checked={s.autoplay === true} onChange={v => $set('autoplay', v)} />
      <EditorToggle label="Loop"     checked={s.loop     === true} onChange={v => $set('loop', v)} />
    </PadStack>
  );
}

// ── Generic (fallback) ────────────────────────────────────────────────────────
export function GenericSectionEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  return (
    <PadStack>
      <p style={{ fontSize: 11, color: '#4b5060', margin: 0, fontFamily: font }}>Raw settings editor</p>
      <textarea
        value={JSON.stringify(s, null, 2)}
        onChange={e => {
          try { onChange(JSON.parse(e.target.value)); } catch {}
        }}
        rows={20}
        style={{
          width: '100%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
          padding: '8px 10px', fontSize: 11,
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          background: 'rgba(0,0,0,0.3)', color: '#c9ccd8', outline: 'none', resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </PadStack>
  );
}
// ── Products / Shop ───────────────────────────────────────────────────────────
export function ProductsEditor({ settings, onChange, clinicId }: Props) {
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = React.useState<Array<{ id: string; name: string; branchId?: string | null; price: number; unit?: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [productsLoading, setProductsLoading] = React.useState(false);

  const s = settings || {};
  const $set = (k: string, v: any) => onChange({ ...s, [k]: v });

  // Selected branch IDs (array)
  const selectedBranchIds: string[] = s.branchIds || [];
  // Hidden product IDs (array)
  const hiddenProductIds: string[] = s.hiddenProductIds || [];

  // Fetch branches on mount
  React.useEffect(() => {
    setLoading(true);
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getBranchesForBuilder()
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.branches || data?.data || []);
          setBranches(list.filter((b: any) => b.isActive !== false));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  // Fetch products when branch selection changes
  React.useEffect(() => {
    setProductsLoading(true);
    import('@/lib/api/websiteApi').then(({ websiteApi }) => {
      websiteApi.getProductsForBuilder()
        .then((data: any) => {
          const list = Array.isArray(data) ? data : (data?.products || data?.data || []);
          const active = list.filter((p: any) => p.isActive !== false);
          // If branch filter active, filter products
          if (selectedBranchIds.length > 0) {
            setProducts(active.filter((p: any) =>
              !p.branchId || selectedBranchIds.includes(p.branchId)
            ));
          } else {
            setProducts(active);
          }
        })
        .catch(() => {})
        .finally(() => setProductsLoading(false));
    });
  }, [selectedBranchIds.join(',')]);

  const toggleBranch = (id: string) => {
    const next = selectedBranchIds.includes(id)
      ? selectedBranchIds.filter(b => b !== id)
      : [...selectedBranchIds, id];
    $set('branchIds', next);
  };

  const toggleProductVisibility = (id: string) => {
    const next = hiddenProductIds.includes(id)
      ? hiddenProductIds.filter(p => p !== id)
      : [...hiddenProductIds, id];
    $set('hiddenProductIds', next);
  };

  const tk = {
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#6366f1',
    accentLight: 'rgba(99,102,241,0.15)',
    text: '#c9ccd8',
    muted: '#6b7080',
    font: "'Inter','Geist','Segoe UI',system-ui,sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>

      {/* Title/Subtitle */}
      <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EditorField label="Section Title" value={s.title} onChange={v => $set('title', v)} placeholder="Our Products" />
        <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} placeholder="Browse our clinic inventory" />
        <EditorSelect label="Design Variant" value={s.variant ?? 'grid'} onChange={v => $set('variant', v)} options={[
          { value: 'grid',                label: 'Grid (Default)' },
          { value: 'featured',            label: 'Featured Hero' },
          { value: 'pharmacy',            label: 'Pharmacy / Categories' },
          { value: 'category-tabs',       label: 'Category Tabs' },
          { value: 'carousel',            label: 'Carousel Scroll' },
          { value: 'supplement-showcase', label: 'Supplement Showcase' },
          { value: 'premium-layout',      label: 'Premium Dark' },
        ]} />
        <EditorSelect label="Columns" value={String(s.columns || '3')} onChange={v => $set('columns', Number(v))} options={[
          { value: '2', label: '2 Columns' },
          { value: '3', label: '3 Columns' },
          { value: '4', label: '4 Columns' },
        ]} />
        <EditorField label="Button Label" value={s.ctaText} onChange={v => $set('ctaText', v)} placeholder="Order" />
        <EditorToggle label="Show Search Bar" checked={s.showSearch !== false} onChange={v => $set('showSearch', v)} />
        <EditorToggle label="Show Stock Badge" checked={s.showStockBadge !== false} onChange={v => $set('showStockBadge', v)} />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />

      {/* Branch Selection */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: tk.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: tk.font }}>
          Show Products From Branches
        </div>
        {loading && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>Loading branches…</p>
        )}
        {!loading && branches.length === 0 && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>No branches found. Products from all branches will be shown.</p>
        )}
        {!loading && branches.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: '0 0 8px' }}>
              Select branches to show their inventory. Leave all unselected to show everything.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {branches.map((branch: any) => {
                const selected = selectedBranchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => toggleBranch(branch.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8, border: `1px solid ${selected ? tk.accent : tk.border}`,
                      background: selected ? tk.accentLight : tk.surface,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: tk.font,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? tk.accent : tk.muted}`,
                      background: selected ? tk.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s',
                    }}>
                      {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: selected ? '#a5b4fc' : tk.text }}>{branch.name}</div>
                      {branch.address && <div style={{ fontSize: 10, color: tk.muted, marginTop: 1 }}>{branch.address}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 14px' }} />

      {/* Product Visibility */}
      <div style={{ padding: '0 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: tk.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontFamily: tk.font }}>
          Products to Show / Hide
        </div>
        {productsLoading && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>Loading products…</p>
        )}
        {!productsLoading && products.length === 0 && (
          <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: 0 }}>
            {selectedBranchIds.length > 0 ? 'No active products found for the selected branches.' : 'No active products found in your inventory.'}
          </p>
        )}
        {!productsLoading && products.length > 0 && (
          <>
            <p style={{ fontSize: 11, color: tk.muted, fontFamily: tk.font, margin: '0 0 8px' }}>
              Toggle products to show or hide them on your website.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }} className="builder-scrollbar">
              {products.map((product: any) => {
                const hidden = hiddenProductIds.includes(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProductVisibility(product.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 7,
                      border: `1px solid ${hidden ? 'rgba(239,68,68,0.25)' : tk.border}`,
                      background: hidden ? 'rgba(239,68,68,0.06)' : tk.surface,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: tk.font,
                    }}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${hidden ? '#ef4444' : '#10b981'}`,
                      background: hidden ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {!hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      {hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: hidden ? '#9ca3af' : tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 10, color: tk.muted, marginTop: 1 }}>
                        NPR {Number(product.price).toLocaleString()} · {product.unit || 'unit'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: hidden ? '#ef4444' : '#10b981', fontWeight: 600, flexShrink: 0 }}>
                      {hidden ? 'Hidden' : 'Visible'}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── AI Chatbot Editor ─────────────────────────────────────────────────────────

export function AiChatbotEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Clinic Info', content: (
        <PadStack>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11.5, color: '#a5b4fc', lineHeight: 1.6 }}>
            💡 Fill in your clinic details below. The AI chatbot will use this information to answer visitor questions automatically.
          </div>
          <EditorField label="Clinic Name"   value={s.clinicName}   onChange={v => $set('clinicName', v)} placeholder="e.g. Bright Smile Dental" />
          <EditorField label="Phone Number"  value={s.clinicPhone}  onChange={v => $set('clinicPhone', v)} placeholder="e.g. +977 980-000-0000" />
          <EditorField label="Email"         value={s.clinicEmail}  onChange={v => $set('clinicEmail', v)} placeholder="e.g. info@clinic.com" />
          <EditorField label="Opening Hours" value={s.openingHours} onChange={v => $set('openingHours', v)} multiline rows={3}
            placeholder="e.g. Mon–Fri: 9am–5pm&#10;Sat: 9am–1pm&#10;Sun: Closed" />
          <EditorField label="Branch Locations" value={s.branches} onChange={v => $set('branches', v)} multiline rows={4}
            placeholder="e.g. Main Branch — 123 Medical Ave, Ph: 01-000000&#10;Downtown — 456 Health St, Ph: 01-111111" />
          <EditorField label="Doctors / Specialists" value={s.doctors} onChange={v => $set('doctors', v)} multiline rows={3}
            placeholder="e.g. Dr. Smith (General Dentistry)&#10;Dr. Patel (Orthodontist)" />
          <EditorField label="Services Offered" value={s.services} onChange={v => $set('services', v)} multiline rows={3}
            placeholder="e.g. Teeth Cleaning, Root Canal, Braces, Whitening…" />
          <EditorField label="Additional Info" value={s.extraInfo} onChange={v => $set('extraInfo', v)} multiline rows={3}
            placeholder="Anything else the chatbot should know (insurance, parking, etc.)" />
        </PadStack>
      )},
      { label: 'Appearance', content: (
        <PadStack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'floating'} onChange={v => $set('variant', v)} options={[
            { value: 'floating',    label: '1. Floating Widget' },
            { value: 'sidebar',     label: '2. Sidebar Panel' },
            { value: 'full-panel',  label: '3. Full Panel' },
            { value: 'doctor-ai',   label: '4. Doctor AI' },
            { value: 'minimal',     label: '5. Minimal' },
          ]} />
          <EditorField label="Chat Widget Title" value={s.title}    onChange={v => $set('title', v)} />
          <EditorField label="Subtitle"          value={s.subtitle} onChange={v => $set('subtitle', v)} />
          <EditorField label="Bot Name"          value={s.botName}  onChange={v => $set('botName', v)} placeholder="e.g. Clinic Assistant" />
          <EditorField label="Welcome Message"   value={s.welcomeMessage} onChange={v => $set('welcomeMessage', v)} multiline rows={3} />
          <EditorColorPicker label="Accent Color" value={s.accentColor || '#0ea5e9'} onChange={v => $set('accentColor', v)} />
          <EditorSelect label="Widget Position" value={s.position || 'bottom-right'} onChange={v => $set('position', v)} options={[
            { value: 'bottom-right', label: 'Bottom Right (floating)' },
            { value: 'bottom-left',  label: 'Bottom Left (floating)' },
            { value: 'inline',       label: 'Inline (embedded in page)' },
          ]} />
        </PadStack>
      )},
    ]} />
  );
}

// ── WhatsApp Button Editor ────────────────────────────────────────────────────

export function WhatsAppButtonEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', fontSize: 11.5, color: '#86efac', lineHeight: 1.6 }}>
        🟢 Add your WhatsApp number below. Visitors will click the floating button and be taken directly to a WhatsApp chat with your clinic.
      </div>
      <EditorSelect label="Design Variant" value={s.variant ?? 'floating-circle'} onChange={v => $set('variant', v)} options={[
        { value: 'floating-circle', label: '1. Floating Circle' },
        { value: 'floating-pill',   label: '2. Floating Pill' },
        { value: 'bottom-bar',      label: '3. Bottom Bar' },
        { value: 'doctor-avatar',   label: '4. Doctor Avatar' },
      ]} />
      <EditorField
        label="WhatsApp Phone Number"
        value={s.phoneNumber}
        onChange={v => $set('phoneNumber', v)}
        placeholder="e.g. 9779800000000  (country code, no + or spaces)"
      />
      <EditorField
        label="Pre-filled Message"
        value={s.welcomeMessage}
        onChange={v => $set('welcomeMessage', v)}
        multiline rows={2}
        placeholder="e.g. Hello! I have a question about your clinic."
      />
      <EditorField label="Banner Heading"  value={s.bannerText}    onChange={v => $set('bannerText', v)}    placeholder="How can I help you?" />
      <EditorField label="Banner Subtext"  value={s.bannerSubText} onChange={v => $set('bannerSubText', v)} placeholder="Chat with us on WhatsApp" />
      <EditorColorPicker label="Button Color" value={s.accentColor || '#25D366'} onChange={v => $set('accentColor', v)} />
      <EditorSelect label="Button Position" value={s.position || 'bottom-right'} onChange={v => $set('position', v)} options={[
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'bottom-left',  label: 'Bottom Left' },
      ]} />
    </PadStack>
  );
}


// ─── Blog Articles Editor ──────────────────────────────────────────────────
export function BlogEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);

  const [allPosts, setAllPosts]     = React.useState<any[]>([]);
  const [loading, setLoading]       = React.useState(false);
  const [error, setError]           = React.useState('');
  const [search, setSearch]         = React.useState('');

  // hidden post IDs (user-controlled)
  const hiddenIds: string[] = s.hiddenPostIds || [];

  const togglePostVisibility = (id: string) => {
    const next = hiddenIds.includes(id)
      ? hiddenIds.filter((p: string) => p !== id)
      : [...hiddenIds, id];
    $set('hiddenPostIds', next);
  };

  // map DB post → shape used by BlogPreview in SectionRenderer
  const mapPost = (p: any) => ({
    id:       p.id,
    title:    p.title || 'Untitled',
    excerpt:  p.excerpt || '',
    category: Array.isArray(p.categories) ? (p.categories[0] || 'General') : (p.category || 'General'),
    author:   p.authorName || p.author || 'Clinic',
    date:     p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    readTime: p.readingTimeMinutes ? `${p.readingTimeMinutes} min` : '3 min',
    image:    p.featuredImage || p.image || '',
    slug:     p.slug || '',
    status:   p.status || 'published',
  });

  // Fetch published posts from the blog API
  React.useEffect(() => {
    setLoading(true);
    setError('');
    import('@/lib/api').then(({ blogApi }) => {
      blogApi.list({ status: 'published', limit: 100 })
        .then((res: any) => {
          const raw = Array.isArray(res) ? res : (res?.data?.posts || res?.data || res?.posts || []);
          const mapped = raw.map(mapPost);
          setAllPosts(mapped);

          // Auto-sync: save ALL published posts to settings so SectionRenderer can render them
          // (filtered by hiddenIds at render time)
          onChange({ ...s, posts: mapped });
        })
        .catch(() => setError('Failed to load blog posts. Make sure you have published posts.'))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When posts change, keep settings.posts up to date
  React.useEffect(() => {
    if (allPosts.length > 0) {
      $set('posts', allPosts);
    }
  }, [allPosts]);

  const filtered = search.trim()
    ? allPosts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : allPosts;

  const maxPosts = s.maxPosts ? Number(s.maxPosts) : 6;

  const tk = {
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    accent: '#6366f1',
    text: '#c9ccd8',
    muted: '#6b7080',
    green: '#10b981',
    red: '#ef4444',
  };

  return (
    <EditorTabs tabs={[
      { label: 'Posts', content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}>

          {/* Info banner */}
          <div style={{ padding: '9px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11, color: '#a5b4fc', lineHeight: 1.6 }}>
            Showing your published blog posts. Toggle visibility to show/hide individual posts on your website. Manage posts in the <strong style={{ color: '#818cf8' }}>Blog</strong> section.
          </div>

          {/* Loading / Error */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: tk.muted, fontSize: 11.5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: 'builder-spin .7s linear infinite', flexShrink: 0 }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Loading blog posts…
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {!loading && !error && allPosts.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.1)', color: tk.muted, fontSize: 11.5, lineHeight: 1.6 }}>
              No published posts found.<br/>
              <span style={{ color: '#6366f1' }}>Go to Blog → create and publish a post</span> to see it here.
            </div>
          )}

          {/* Search */}
          {!loading && allPosts.length > 0 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search posts…"
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 7, boxSizing: 'border-box',
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
                color: '#c9ccd8', fontSize: 11.5, fontFamily: font, outline: 'none',
              }}
            />
          )}

          {/* Post list */}
          {!loading && filtered.map((post: any) => {
            const hidden = hiddenIds.includes(post.id);
            return (
              <button
                key={post.id}
                onClick={() => togglePostVisibility(post.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '9px 11px', borderRadius: 8, textAlign: 'left',
                  border: `1px solid ${hidden ? 'rgba(239,68,68,0.2)' : tk.border}`,
                  background: hidden ? 'rgba(239,68,68,0.05)' : tk.surface,
                  cursor: 'pointer', transition: 'all 0.14s', fontFamily: font,
                }}
              >
                {/* Checkbox indicator */}
                <div style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${hidden ? tk.red : tk.green}`,
                  background: hidden ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {!hidden && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={tk.green} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {hidden  && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={tk.red}   strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                </div>

                {/* Thumbnail */}
                <div style={{
                  width: 40, height: 40, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                  background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {post.image
                    ? <img src={post.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 16, opacity: 0.5 }}>📰</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: hidden ? '#6b7080' : tk.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {post.title}
                  </div>
                  <div style={{ fontSize: 10, color: tk.muted, marginTop: 2 }}>
                    {post.category} · {post.readTime} read
                  </div>
                </div>

                <span style={{ fontSize: 10, fontWeight: 600, color: hidden ? tk.red : tk.green, flexShrink: 0 }}>
                  {hidden ? 'Hidden' : 'Visible'}
                </span>
              </button>
            );
          })}

          {/* Show count */}
          {!loading && allPosts.length > 0 && (
            <div style={{ fontSize: 10.5, color: tk.muted, textAlign: 'center', paddingTop: 4 }}>
              {allPosts.length - hiddenIds.length} of {allPosts.length} posts visible on website
            </div>
          )}
        </div>
      )},

      { label: 'Settings', content: (
        <Stack>
          <EditorField label="Section Title"    value={s.title}    onChange={v => $set('title', v)}    placeholder="Health Articles" />
          <EditorField label="Section Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} placeholder="Latest news and health tips" />
          <EditorField
            label={`Max Posts to Show: ${maxPosts}`}
            type="range" min={2} max={12}
            value={maxPosts}
            onChange={v => $set('maxPosts', Number(v))}
          />
          <EditorToggle label="Show Category Tags"  checked={s.showCategories !== false} onChange={v => $set('showCategories', v)} />
          <EditorToggle label="Show Author Name"    checked={s.showAuthor !== false}     onChange={v => $set('showAuthor', v)} />
          <EditorToggle label="Show Read Time"      checked={s.showReadTime !== false}   onChange={v => $set('showReadTime', v)} />
          <EditorToggle label="Show Date"           checked={s.showDate !== false}       onChange={v => $set('showDate', v)} />
          <EditorToggle label="Show Excerpt"        checked={s.showExcerpt !== false}    onChange={v => $set('showExcerpt', v)} />
        </Stack>
      )},

      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'modern-grid'} onChange={v => $set('variant', v)} options={[
            { value: 'modern-grid',      label: '1. Modern Grid' },
            { value: 'magazine',         label: '2. Magazine Layout' },
            { value: 'bento',            label: '3. Bento Layout' },
            { value: 'featured-article', label: '4. Featured Article' },
            { value: 'carousel',         label: '5. Carousel' },
            { value: 'doctor-articles',  label: '6. Doctor Articles' },
            { value: 'health-tips',      label: '7. Health Tips' },
            { value: 'latest-articles',  label: '8. Latest Articles' },
            { value: 'category-showcase',label: '9. Category Showcase' },
            { value: 'editorial',        label: '10. Editorial Layout' },
          ]} />
          <EditorSelect label="Columns" value={String(s.columns || '3')} onChange={v => $set('columns', Number(v))} options={[
            { value: '2', label: '2 Columns' },
            { value: '3', label: '3 Columns' },
            { value: '4', label: '4 Columns' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}

// ─── Clinic Info Editor ────────────────────────────────────────────────────
export function ClinicInfoEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'modern-card'} onChange={v => $set('variant', v)} options={[
            { value: 'modern-card',          label: '1. Modern Card' },
            { value: 'premium-overview',     label: '2. Premium Overview' },
            { value: 'founder-message',      label: '3. Founder Message' },
            { value: 'medical-excellence',   label: '4. Medical Excellence' },
            { value: 'split-image-content',  label: '5. Split Image + Content' },
            { value: 'multi-column-overview',label: '6. Multi-Column Overview' },
            { value: 'timeline-history',     label: '7. Timeline / History' },
          ]} />
          <EditorField label="Title"       value={s.title}       onChange={v => $set('title', v)} />
          <EditorField label="Description" value={s.description} onChange={v => $set('description', v)} multiline />
          <EditorField label="Badge Text"  value={s.badge}       onChange={v => $set('badge', v)} />
          <EditorField label="CTA Text"    value={s.ctaText}     onChange={v => $set('ctaText', v)} />
        </Stack>
      )},
      { label: 'Stats', content: (
        <Stack>
          <EditorField label="Stat 1 Value"  value={s.stat1Val} onChange={v => $set('stat1Val', v)} placeholder="15+" />
          <EditorField label="Stat 1 Label"  value={s.stat1Lbl} onChange={v => $set('stat1Lbl', v)} placeholder="Years Experience" />
          <EditorField label="Stat 2 Value"  value={s.stat2Val} onChange={v => $set('stat2Val', v)} placeholder="10K+" />
          <EditorField label="Stat 2 Label"  value={s.stat2Lbl} onChange={v => $set('stat2Lbl', v)} placeholder="Patients Treated" />
          <EditorField label="Stat 3 Value"  value={s.stat3Val} onChange={v => $set('stat3Val', v)} placeholder="50+" />
          <EditorField label="Stat 3 Label"  value={s.stat3Lbl} onChange={v => $set('stat3Lbl', v)} placeholder="Specialists" />
          <EditorField label="Stat 4 Value"  value={s.stat4Val} onChange={v => $set('stat4Val', v)} placeholder="98%" />
          <EditorField label="Stat 4 Label"  value={s.stat4Lbl} onChange={v => $set('stat4Lbl', v)} placeholder="Satisfaction" />
        </Stack>
      )},
    ]} />
  );
}


// ── Social Proof / Trust Badges Editor ───────────────────────────────────────
export function SocialProofEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <EditorTabs tabs={[
      { label: 'Content', content: (
        <Stack>
          <EditorField label="Title" value={s.title} onChange={v => $set('title', v)} />
          <EditorArrayField
            label="Badges / Logos"
            items={s.items || []}
            onChange={items => $set('items', items)}
            addLabel="Add Badge"
            defaultItem={{ id: '', image: '', name: 'Certification' }}
            renderItem={(item, update, remove) => (
              <Stack>
                <ItemHeader label={item.name} onRemove={remove} />
                <EditorImageUpload label="Logo / Badge Image" value={item.image} onChange={v => update({ image: v })} />
                <EditorField label="Name / Label" value={item.name} onChange={v => update({ name: v })} />
              </Stack>
            )}
          />
        </Stack>
      )},
      { label: 'Style', content: (
        <Stack>
          <EditorSelect label="Design Variant" value={s.variant ?? 'logos'} onChange={v => $set('variant', v)} options={[
            { value: 'logos',          label: '1. Logo Strip' },
            { value: 'award-showcase', label: '2. Award Showcase' },
            { value: 'strip',          label: '3. Scrolling Strip' },
            { value: 'insurance',      label: '4. Insurance Partners' },
            { value: 'dark',           label: '5. Dark Background' },
            { value: 'interactive',    label: '6. Interactive Cards' },
          ]} />
        </Stack>
      )},
    ]} />
  );
}

// ── Available Slots Editor ────────────────────────────────────────────────────
export function AvailableSlotsEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'grid'} onChange={v => $set('variant', v)} options={[
        { value: 'grid',        label: '1. Slot Grid' },
        { value: 'day-cards',   label: '2. Day Cards' },
        { value: 'timeline',    label: '3. Timeline' },
        { value: 'doctor-wise', label: '4. Doctor-Wise' },
        { value: 'compact',     label: '5. Compact' },
      ]} />
      <EditorField label="Title"    value={s.title}    onChange={v => $set('title', v)} />
      <EditorField label="Subtitle" value={s.subtitle} onChange={v => $set('subtitle', v)} />
      <EditorSelect label="Branch Filter" value={s.branchFilter ?? 'all'} onChange={v => $set('branchFilter', v)} options={[
        { value: 'all', label: 'All Branches' },
      ]} />
      <EditorSelect label="Doctor Filter" value={s.doctorFilter ?? 'all'} onChange={v => $set('doctorFilter', v)} options={[
        { value: 'all', label: 'All Doctors' },
      ]} />
    </PadStack>
  );
}

// ── Divider Editor ────────────────────────────────────────────────────────────
export function DividerEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorSelect label="Design Variant" value={s.variant ?? 'line'} onChange={v => $set('variant', v)} options={[
        { value: 'line',     label: '1. Simple Line' },
        { value: 'wave',     label: '2. Wave' },
        { value: 'gradient', label: '3. Gradient Fade' },
        { value: 'dashed',   label: '4. Dashed' },
        { value: 'dotted',   label: '5. Dotted' },
        { value: 'thick',    label: '6. Thick' },
        { value: 'icon',     label: '7. With Icon' },
      ]} />
      <EditorColorPicker label="Color" value={s.color ?? '#e5e7eb'} onChange={v => $set('color', v)} />
      <EditorField label={`Thickness: ${s.thickness ?? 1}px`} type="range" min={1} max={8} value={s.thickness ?? 1} onChange={v => $set('thickness', Number(v))} />
    </PadStack>
  );
}

// ── Spacer Editor ─────────────────────────────────────────────────────────────
export function SpacerEditor({ settings, onChange }: Props) {
  const s = safe(settings);
  const $set = set(onChange);
  return (
    <PadStack>
      <EditorField
        label={`Height: ${s.height ?? 80}px`}
        type="range" min={16} max={320}
        value={s.height ?? 80}
        onChange={v => $set('height', Number(v))}
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[16, 32, 48, 64, 80, 120, 160].map(h => (
          <button
            key={h}
            onClick={() => $set('height', h)}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
              background: s.height === h ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
              color: s.height === h ? '#818cf8' : '#6b7080',
              fontSize: 11, cursor: 'pointer', fontFamily: font, fontWeight: 500,
              transition: 'all 0.12s',
            }}
          >{h}px</button>
        ))}
      </div>
    </PadStack>
  );
}