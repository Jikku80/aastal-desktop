// Quick-pick vocabulary for the Diagnosis and Treatment Plan fields on the
// clinical record form, grouped by clinic type (Dental / Eye / Skin / Ortho /
// Other) instead of one long flat list. The user first picks a clinic type,
// then picks from that type's specific options — see CategoryOptionPicker.tsx.

export type ClinicTypeId = 'dental' | 'eye' | 'skin' | 'ortho' | 'other';

export interface ClinicTypeDef {
  id:    ClinicTypeId;
  label: string;
}

export const CLINIC_TYPES: ClinicTypeDef[] = [
  { id: 'dental', label: 'Dental' },
  { id: 'eye',    label: 'Eye' },
  { id: 'skin',   label: 'Skin' },
  { id: 'ortho',  label: 'Ortho' },
  { id: 'other',  label: 'Other' },
];

export const DIAGNOSIS_OPTIONS: Record<ClinicTypeId, string[]> = {
  dental: [
    'Chronic generalized gingivitis',
    'Mobility',
    'Pericoronitis',
    'OSMF',
    'Dental caries',
    'Periodontitis',
    'Pulpitis',
    'Tooth abscess',
    'Impacted tooth',
    'Malocclusion',
    'Post-extraction check',
  ],
  eye: [
    'Refractive error',
    'Conjunctivitis',
    'Cataract',
    'Dry eye syndrome',
    'Glaucoma (suspect)',
    'Corneal abrasion',
    'Allergic conjunctivitis',
  ],
  skin: [
    'Acne vulgaris',
    'Eczema / dermatitis',
    'Psoriasis',
    'Fungal infection',
    'Urticaria',
    'Contact dermatitis',
    'Melasma',
  ],
  ortho: [
    'Sprain / strain',
    'Fracture (suspect)',
    'Osteoarthritis',
    'Lower back pain',
    'Frozen shoulder',
    'Tendinitis',
    'Ligament tear (suspect)',
  ],
  other: [
    'General consultation',
    'Follow-up review',
    'Routine check-up',
  ],
};

export const TREATMENT_OPTIONS: Record<ClinicTypeId, string[]> = {
  dental: [
    'Scaling',
    'Polishing',
    'Composite filling',
    'OP+OHIS',
    'GIC restoration',
    'Pulpectomy',
    'Root canal treatment',
    'Tooth extraction',
    'Crown placement',
    'Fluoride application',
    'Referral to specialist',
    'Follow-up in 2 weeks',
  ],
  eye: [
    'Prescription glasses',
    'Eye drops prescribed',
    'Cataract surgery referral',
    'Vision therapy',
    'Follow-up in 2 weeks',
    'Referral to specialist',
  ],
  skin: [
    'Topical medication',
    'Oral medication',
    'Chemical peel',
    'Biopsy recommended',
    'Follow-up in 2 weeks',
    'Referral to specialist',
  ],
  ortho: [
    'Physiotherapy',
    'Pain management',
    'Immobilization / splinting',
    'X-ray advised',
    'Follow-up in 2 weeks',
    'Referral to specialist',
  ],
  other: [
    'Follow-up in 2 weeks',
    'Referral to specialist',
    'Lab tests advised',
  ],
};