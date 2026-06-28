import { Injectable } from '@nestjs/common';

/**
 * Symptom → specialty mapping. Admin-editable in a future iteration
 * (store in DB with a simple key/value table). For now seeded statically.
 */
const SYMPTOM_MAP: { keywords: string[]; specialties: string[]; score: number }[] = [
  { keywords: ['toothache','tooth pain','cavity','gum','bleeding gum','dental','jaw pain','tooth sensitivity'], specialties: ['dental'], score: 10 },
  { keywords: ['eye pain','blurred vision','red eye','watery eye','squint','vision loss','conjunctivitis'], specialties: ['eye'], score: 10 },
  { keywords: ['rash','acne','skin itching','eczema','psoriasis','hair loss','dandruff','pigmentation'], specialties: ['dermatology'], score: 10 },
  { keywords: ['child fever','baby rash','infant cough','pediatric','childhood illness','child vomiting'], specialties: ['pediatrics'], score: 10 },
  { keywords: ['period pain','pregnancy','menstrual','vaginal discharge','pcos','ovary','uterus','cervical'], specialties: ['gynecology'], score: 10 },
  { keywords: ['back pain','knee pain','joint pain','physiotherapy','muscle spasm','sports injury','ankle sprain'], specialties: ['physiotherapy','orthopedics'], score: 8 },
  { keywords: ['blood test','urine test','lab','x-ray','ultrasound','biopsy','culture test','diagnostic'], specialties: ['diagnostics'], score: 10 },
  { keywords: ['chest pain','palpitation','shortness of breath','heart rate','hypertension','bp','cholesterol'], specialties: ['cardiology'], score: 10 },
  { keywords: ['bone fracture','ortho','spine','disc','arthritis','hip replacement'], specialties: ['orthopedics'], score: 10 },
  { keywords: ['headache','migraine','seizure','numbness','memory loss','stroke','paralysis','tremor'], specialties: ['neurology'], score: 10 },
  { keywords: ['anxiety','depression','panic attack','insomnia','mental health','ocd','bipolar','stress'], specialties: ['psychiatry'], score: 10 },
  { keywords: ['ear pain','hearing loss','throat','tonsil','nasal','sinusitis','nose bleed','ent'], specialties: ['ent'], score: 10 },
  { keywords: ['fever','cold','cough','flu','fatigue','body ache','general','nausea','vomiting','diarrhea'], specialties: ['general'], score: 5 },
];

export interface SymptomResult {
  specialty: string;
  confidence: number;
  label: string;
}

const SPECIALTY_LABELS: Record<string, string> = {
  dental: 'Dental / Oral Health',
  eye: 'Ophthalmology',
  dermatology: 'Dermatology / Skin',
  pediatrics: 'Pediatrics / Child Health',
  gynecology: 'Gynecology / Women\'s Health',
  physiotherapy: 'Physiotherapy',
  diagnostics: 'Diagnostics / Lab Tests',
  cardiology: 'Cardiology / Heart',
  orthopedics: 'Orthopedics / Bone & Joint',
  neurology: 'Neurology / Brain & Nerves',
  psychiatry: 'Psychiatry / Mental Health',
  ent: 'ENT / Ear Nose Throat',
  general: 'General Medicine',
};

@Injectable()
export class SymptomCheckerService {
  search(q: string): SymptomResult[] {
    if (!q?.trim()) return [];
    const lower = q.toLowerCase();
    const scores: Record<string, number> = {};

    for (const entry of SYMPTOM_MAP) {
      for (const keyword of entry.keywords) {
        if (lower.includes(keyword) || keyword.includes(lower)) {
          for (const specialty of entry.specialties) {
            scores[specialty] = (scores[specialty] || 0) + entry.score;
          }
        }
      }
    }

    const maxScore = Math.max(...Object.values(scores), 1);
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([specialty, score]) => ({
        specialty,
        confidence: Math.round((score / maxScore) * 100),
        label: SPECIALTY_LABELS[specialty] || specialty,
      }));
  }
}
