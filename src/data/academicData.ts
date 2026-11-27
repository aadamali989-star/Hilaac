import type {
  FlashcardItem,
  HealthBook,
  LeaderboardEntry,
  StudyGroup,
} from '../types';
import type { QuizQuestion } from './clinicalData';
import coverKatzung from '../assets/images/cover_katzung_pharmacology_1795714347820.jpg';
import coverGuyton from '../assets/images/cover_guyton_physiology_1795714348632.jpg';
import coverJawetz from '../assets/images/cover_jawetz_microbiology_1795714347872.jpg';
import coverHarpers from '../assets/images/cover_harpers_biochemistry_1795714347923.jpg';
import coverOxford from '../assets/images/cover_oxford_clinical_1795714348160.jpg';
import coverHarrisons from '../assets/images/cover_harrisons_medicine_1795714347947.jpg';

export interface LectureNoteSection {
  id: string;
  title: string;
  keyTakeaway: string;
  bullets: string[];
  clinicalPearl: string;
}

export interface SubjectModuleSpec {
  id: 'Pharmacology' | 'Anatomy & Physiology' | 'Microbiology' | 'Biochemistry';
  subtitle: string;
  targetMinutes: number;
  lectureNotes: LectureNoteSection[];
  quiz: QuizQuestion[];
}

export const academicModulesData: SubjectModuleSpec[] = [
  {
    id: 'Pharmacology',
    subtitle: 'Pharmacokinetics, Autonomic Signaling, Cardiovascular & Antimicrobial Therapeutics',
    targetMinutes: 60,
    lectureNotes: [
      {
        id: 'pharm-pk-pd',
        title: 'Lecture 1: Pharmacokinetics (ADME) & Therapeutic Index',
        keyTakeaway: 'Potency (EC50) measures concentration needed for 50% response; Efficacy (Emax) measures maximum clinical ceiling.',
        bullets: [
          'Absorption: Bioavailability (F) equals 100% for IV dosing; first-pass hepatic metabolism reduces oral bioavailability.',
          'Distribution: Volume of distribution (Vd) reflects drug partitioning into plasma vs extravascular tissues; albumin binding restricts free active drug.',
          'Metabolism: Phase I (CYP450 oxidation/reduction/hydrolysis) followed by Phase II (glucuronidation, sulfation, acetylation) for renal/biliary clearance.',
          'Therapeutic Index (TI = TD50 / ED50): Narrow-TI agents (Digoxin, Warfarin, Lithium, Theophylline, Vancomycin) require therapeutic drug monitoring.',
        ],
        clinicalPearl: 'Rifampicin and Carbamazepine are potent CYP450 inducers that accelerate metabolism of co-administered drugs like warfarin and oral contraceptives.',
      },
      {
        id: 'pharm-ans',
        title: 'Lecture 2: Autonomic Pharmacology — Cholinergic & Adrenergic Receptors',
        keyTakeaway: 'Sympathetic activation mobilizes cardiac and airway tone (β1/β2, α1); parasympathetic activation drives rest-and-digest secretions (M1–M3).',
        bullets: [
          'α1 Agonists (Phenylephrine): Vasoconstriction and mydriasis; α1 Blockers (Tamsulosin) relax prostatic/ureteral smooth muscle.',
          'β1 Receptors: ↑ heart rate and contractility; β1-selective blockers (Metoprolol, Atenolol) reduce myocardial oxygen demand.',
          'β2 Receptors: Bronchodilation and smooth muscle relaxation (Salbutamol/Albuterol for acute asthma relief).',
          'Cholinergic Toxicity (SLUDGE): Salivation, Lacrimation, Urination, Defecation, GI cramps, Emesis. Reversed with Atropine.',
        ],
        clinicalPearl: 'Anticholinergic excess produces "DRY AS BONE": dry mouth, flushed warm skin, mydriasis, urinary retention, and delirium.',
      },
    ],
    quiz: [
      {
        q: 'Which pharmacokinetic parameter compares drug safety by dividing median toxic dose (TD50) by median effective dose (ED50)?',
        opts: ['Therapeutic Index (TI)', 'First-pass extraction ratio', 'Zero-order clearance constant'],
        ans: 0,
        why: 'Therapeutic Index (TI = TD50 / ED50) quantifies the safety margin between effective and toxic doses.',
      },
      {
        q: 'Why must a bronchodilator inhaler (e.g., Salbutamol) be used BEFORE an inhaled corticosteroid?',
        opts: [
          'Bronchodilation opens airways first so the steroid penetrates deeper into the lungs',
          'Corticosteroids neutralize beta-2 receptors if given first',
          'It eliminates the need to rinse the mouth afterward',
        ],
        ans: 0,
        why: 'Opening narrowed bronchi first improves distal deposition of the anti-inflammatory corticosteroid; patients must still rinse and spit afterward to prevent oral thrush.',
      },
      {
        q: 'Which laboratory test monitors unfractionated Heparin therapy, and what is its specific antidote?',
        opts: ['aPTT; Protamine sulfate', 'PT/INR; Vitamin K', 'Serum creatinine; N-acetylcysteine'],
        ans: 0,
        why: 'Heparin is monitored with aPTT and reversed with Protamine sulfate; Warfarin is monitored with PT/INR and reversed with Vitamin K.',
      },
    ],
  },
  {
    id: 'Anatomy & Physiology',
    subtitle: 'Cardiovascular Hemodynamics, Respiratory Mechanics, Renal Nephron & Neuroanatomy',
    targetMinutes: 50,
    lectureNotes: [
      {
        id: 'ap-cardio',
        title: 'Lecture 1: Cardiac Cycle, Preload, Afterload & Starling Law',
        keyTakeaway: 'Cardiac Output (CO) = Heart Rate × Stroke Volume; preload, contractility, and afterload govern stroke volume.',
        bullets: [
          'Frank-Starling Mechanism: Increased venous return stretches ventricular myocytes, increasing sarcomere overlap and stroke volume up to physiological limits.',
          'Conduction Pathway: SA node (60–100 bpm) → AV node (0.1 s physiological delay) → Bundle of His → Left & Right bundle branches → Purkinje fibers.',
          'Coronary Perfusion: Left ventricular myocardium perfuses primarily during diastole; tachycardia shortens diastole and reduces coronary filling time.',
          'Venodilators (Nitrates) reduce preload; arteriolar vasodilators (Amlodipine, ACE inhibitors) reduce afterload.',
        ],
        clinicalPearl: 'In left-sided heart failure, elevated left atrial and pulmonary venous pressure causes orthopnea, paroxysmal nocturnal dyspnea, and crackles.',
      },
      {
        id: 'ap-renal-resp',
        title: 'Lecture 2: Nephron Transport & Alveolar Gas Exchange',
        keyTakeaway: 'GFR regulation balances afferent arteriolar dilation (prostaglandins) and efferent arteriolar constriction (Angiotensin II).',
        bullets: [
          'Proximal Convoluted Tubule (PCT): Reabsorbs ~65% of filtered Na+, water, bicarbonate, and virtually 100% of glucose/amino acids (SGLT2 target).',
          'Thick Ascending Limb of Loop of Henle: Na+/K+/2Cl- cotransporter establishes medullary osmotic gradient (site of Loop diuretics like Furosemide).',
          'Distal Tubule & Collecting Duct: Thiazides inhibit Na+/Cl- cotransport; Aldosterone and Spironolactone act at principal cells.',
          'Ventilation-Perfusion (V/Q) Matching: Alveolar hypoxia triggers local hypoxic pulmonary vasoconstriction to redirect blood toward well-ventilated alveoli.',
        ],
        clinicalPearl: 'NSAIDs block vasodilatory prostaglandins at the afferent arteriole, while ACE inhibitors dilate the efferent arteriole—combined use risks acute kidney injury.',
      },
    ],
    quiz: [
      {
        q: 'During which phase of the cardiac cycle does left ventricular coronary blood flow reach its maximum?',
        opts: ['Diastole', 'Isovolumetric contraction', 'Rapid ventricular ejection'],
        ans: 0,
        why: 'High intramyocardial pressure compresses coronary vessels during systole, so LV perfusion occurs primarily during diastole.',
      },
      {
        q: 'Which nephron segment contains the Na+/K+/2Cl- cotransporter inhibited by furosemide?',
        opts: ['Thick ascending limb of the loop of Henle', 'Proximal convoluted tubule', 'Bowman capsule'],
        ans: 0,
        why: 'Loop diuretics inhibit the NKCC2 cotransporter in the thick ascending limb, abolishing the medullary concentration gradient.',
      },
      {
        q: 'Why can NSAIDs precipitate acute kidney injury in volume-depleted patients?',
        opts: [
          'They inhibit prostaglandin-mediated dilation of the afferent arteriole, lowering GFR',
          'They permanently destroy aldosterone receptors in the collecting duct',
          'They trigger excessive ADH release from the posterior pituitary',
        ],
        ans: 0,
        why: 'Prostaglandins maintain afferent arteriolar dilation during hypoperfusion; blocking COX reduces renal plasma flow and GFR.',
      },
    ],
  },
  {
    id: 'Microbiology',
    subtitle: 'Bacteriology, Mycobacteria, Parasitology, Virology & Antimicrobial Resistance',
    targetMinutes: 50,
    lectureNotes: [
      {
        id: 'micro-bacteria',
        title: 'Lecture 1: Bacterial Cell Wall Architecture & Acid-Fast Pathogens',
        keyTakeaway: 'Gram-positive bacteria carry a thick peptidoglycan layer; Gram-negative bacteria possess an outer LPS membrane and periplasmic space.',
        bullets: [
          'β-Lactam Antibiotics (Penicillins, Cephalosporins, Carbapenems): Bind Penicillin-Binding Proteins (PBPs) to block peptidoglycan cross-linking.',
          'Mycobacterium tuberculosis: Acid-fast bacillus with mycolic acid cell wall; visualized via Ziehl-Neelsen AFB smear and rapidly detected by GeneXpert MTB/RIF.',
          'Salmonella Typhi: Gram-negative rod causing enteric fever with step-ladder fever, relative bradycardia (Faget sign), and rose spots.',
          'Resistance Mechanisms: β-lactamase production, altered PBPs (MRSA mecA), ribosomal methylation, and efflux pumps.',
        ],
        clinicalPearl: 'Always collect two sets of blood cultures BEFORE initiating empiric IV broad-spectrum antibiotics in suspected sepsis (within the 1-hour bundle).',
      },
      {
        id: 'micro-parasites-viruses',
        title: 'Lecture 2: Malaria (Plasmodium spp.), Dengue & Enteric Viruses',
        keyTakeaway: 'Plasmodium falciparum causes severe microvascular sequestration and cerebral malaria; P. vivax/ovale form dormant hepatic hypnozoites.',
        bullets: [
          'Malaria Diagnosis: Rapid Diagnostic Test (Pf/Pan) and thick/thin blood smears; IV Artesunate is first-line for severe malaria.',
          'Radical Cure: Primaquine eliminates P. vivax/ovale liver hypnozoites—check G6PD status before prescribing to prevent hemolysis.',
          'Dengue Virus: Flavivirus transmitted by Aedes aegypti; causes high fever, retro-orbital pain, thrombocytopenia, and plasma leakage—treat fever with Paracetamol, avoid NSAIDs.',
          'Acute Gastroenteritis: Rotavirus and Norovirus are leading viral causes; ORS + Zinc prevent dehydration mortality.',
        ],
        clinicalPearl: 'In enteric fever, blood cultures have highest yield in week 1, whereas stool and urine cultures become increasingly positive in weeks 2–3.',
      },
    ],
    quiz: [
      {
        q: 'Which laboratory screening is mandatory before giving Primaquine for radical cure of P. vivax or P. ovale?',
        opts: ['G6PD enzyme status', 'Serum uric acid', 'Anti-dsDNA antibody'],
        ans: 0,
        why: 'Primaquine can trigger severe oxidative hemolytic anemia in patients with G6PD deficiency.',
      },
      {
        q: 'Which diagnostic test rapidly detects Mycobacterium tuberculosis AND rifampicin resistance directly from sputum?',
        opts: ['GeneXpert MTB/RIF', 'Widal agglutination test', 'Mantoux skin test alone'],
        ans: 0,
        why: 'GeneXpert MTB/RIF is a molecular NAAT that detects M. tuberculosis DNA and rpoB mutations conferring rifampicin resistance.',
      },
      {
        q: 'Why should NSAIDs and aspirin be avoided when treating fever in suspected Dengue infection?',
        opts: [
          'They increase bleeding and platelet-dysfunction risk',
          'They convert dengue into bacterial meningitis',
          'They block oral rehydration salt absorption',
        ],
        ans: 0,
        why: 'Dengue causes thrombocytopenia and capillary fragility; Paracetamol is preferred while NSAIDs/aspirin increase hemorrhagic risk.',
      },
    ],
  },
  {
    id: 'Biochemistry',
    subtitle: 'Cellular Bioenergetics, Enzyme Kinetics, Acid-Base Balance & Clinical Liver/Renal Panels',
    targetMinutes: 45,
    lectureNotes: [
      {
        id: 'biochem-metabolism',
        title: 'Lecture 1: Glycolysis, TCA Cycle & Glutathione Detoxification',
        keyTakeaway: 'ATP yield relies on NAD+/FAD electron shuttles; glutathione (GSH) protects hepatocytes from reactive drug metabolites.',
        bullets: [
          'Rate-Limiting Enzymes: Phosphofructokinase-1 (PFK-1) in glycolysis; Isocitrate dehydrogenase in TCA; HMG-CoA reductase in cholesterol synthesis (statin target).',
          'Metformin Mechanism: Activates AMPK and inhibits hepatic mitochondrial complex I / gluconeogenesis, lowering fasting blood glucose without hypoglycemia.',
          'Acetaminophen Toxicity: High doses saturate glucuronidation/sulfation, shifting metabolism via CYP2E1 to toxic NAPQI, which depletes hepatic glutathione.',
          'N-acetylcysteine (NAC) restores cysteine/glutathione stores to detoxify NAPQI before centrilobular hepatic necrosis occurs.',
        ],
        clinicalPearl: 'In lactic acidosis or severe sepsis, impaired tissue oxygen delivery shifts pyruvate to lactate via lactate dehydrogenase—serum lactate >4 mmol/L demands urgent resuscitation.',
      },
      {
        id: 'biochem-kinetics-acidbase',
        title: 'Lecture 2: Enzyme Kinetics & Henderson-Hasselbalch Acid-Base Balance',
        keyTakeaway: 'Competitive inhibitors increase apparent Km without changing Vmax; non-competitive inhibitors lower Vmax without changing Km.',
        bullets: [
          'Michaelis-Menten Kinetics: Km reflects substrate affinity (lower Km = higher affinity); Vmax reflects maximal enzyme velocity.',
          'Arterial Blood Gas (ABG) Reference: pH 7.35–7.45, PaCO2 35–45 mmHg, HCO3- 22–26 mEq/L.',
          'Anion Gap = Na+ - (Cl- + HCO3-); elevated anion gap metabolic acidosis (MUDPILES) includes lactic acidosis, DKA, and uremia.',
          'Electrolytes & Arrhythmias: Hypokalemia (↓ K+) potentiates Digoxin binding to Na+/K+-ATPase and precipitates life-threatening digoxin toxicity.',
        ],
        clinicalPearl: 'Always check serum potassium and renal function before administering Digoxin or potassium-sparing/loop diuretics.',
      },
    ],
    quiz: [
      {
        q: 'How does N-acetylcysteine (NAC) prevent liver necrosis after acetaminophen overdose?',
        opts: [
          'It replenishes hepatic glutathione stores to detoxify the toxic NAPQI metabolite',
          'It directly chelates acetaminophen in the renal glomerulus',
          'It blocks PFK-1 in glycolysis to slow liver ATP consumption',
        ],
        ans: 0,
        why: 'NAC serves as a cysteine precursor that restores glutathione (GSH), neutralizing NAPQI into non-toxic mercapturic acid.',
      },
      {
        q: 'In enzyme kinetics, how does a pure competitive inhibitor alter Km and Vmax?',
        opts: [
          'Increases apparent Km while Vmax remains unchanged',
          'Decreases both Km and Vmax proportionally',
          'Decreases Km and increases Vmax',
        ],
        ans: 0,
        why: 'Because high substrate concentration can outcompete a competitive inhibitor, Vmax is unchanged while more substrate (higher Km) is needed to reach half-Vmax.',
      },
      {
        q: 'Which electrolyte disturbance strongly increases the risk of Digoxin toxicity?',
        opts: ['Hypokalemia (low K+)', 'Hypernatremia', 'Mild hypercalcemia alone without cardiac changes'],
        ans: 0,
        why: 'Potassium and Digoxin compete at the Na+/K+-ATPase binding site; low K+ allows greater digoxin binding and toxicity.',
      },
    ],
  },
];

export const healthBooks: HealthBook[] = [
  {
    id: 'katzung-pharmacology',
    title: 'Basic & Clinical Pharmacology',
    author: 'Bertram G. Katzung, MD, PhD & Todd W. Vanderah, PhD',
    subject: 'Pharmacology',
    edition: '16th Edition · McGraw Hill',
    readMinutes: 45,
    summary:
      'Foundational medical pharmacology reference covering pharmacokinetics (ADME), autonomic receptor signaling, cardiovascular anticoagulation, and high-alert drug antidotes.',
    coverImage: coverKatzung,
    coverColor: 'navy',
    chapters: [
      {
        id: 'katzung-ch1',
        title: 'Chapter 1: Pharmacokinetics, First-Pass Effect & Therapeutic Index',
        paragraphs: [
          'Pharmacokinetics describes the absorption, distribution, biotransformation, and elimination (ADME) of therapeutic agents across biological membranes. Oral bioavailability (F) quantifies the fraction of unchanged drug reaching systemic circulation after gastrointestinal absorption and hepatic first-pass metabolism.',
          'Drugs with a narrow Therapeutic Index (TI = TD50 / ED50)—including Digoxin, Warfarin, Lithium, Theophylline, and Vancomycin—require rigorous clinical and laboratory surveillance because minor shifts in renal clearance or CYP450 activity can precipitate toxicity.',
          'Phase I reactions mediated by cytochrome P450 enzymes introduce or expose polar functional groups, while Phase II conjugation (glucuronidation, sulfation, acetylation) attaches hydrophilic moieties to facilitate renal or biliary excretion. Inducers such as Rifampicin and Carbamazepine accelerate clearance of co-administered drugs.',
        ],
      },
      {
        id: 'katzung-ch2',
        title: 'Chapter 2: Cardiovascular Anticoagulants, Nitrates & Respiratory Inhalers',
        paragraphs: [
          'Unfractionated heparin enhances antithrombin III inactivation of thrombin and factor Xa, prolonging the activated partial thromboplastin time (aPTT); acute hemorrhage is reversed with protamine sulfate. Warfarin inhibits vitamin K epoxide reductase, monitored via PT/INR and reversed with phytonadione (Vitamin K) plus prothrombin complex concentrate in life-threatening bleeding.',
          'Organic nitrates generate nitric oxide to increase vascular smooth muscle cGMP, decreasing left ventricular preload and myocardial oxygen demand. Never co-administer nitrates with PDE-5 inhibitors (sildenafil, tadalafil) due to synergistic vasodilation and refractory hypotension.',
          'In asthma and COPD step-up therapy, administer a short-acting beta-2 agonist bronchodilator first to dilate airways before an inhaled corticosteroid, improving distal lung deposition while instructing patients to rinse and spit afterward to prevent oral candidiasis.',
        ],
      },
    ],
  },
  {
    id: 'guyton-physiology',
    title: 'Guyton and Hall Textbook of Medical Physiology',
    author: 'John E. Hall, PhD & Michael E. Hall, MD',
    subject: 'Anatomy & Physiology',
    edition: '14th Edition · Elsevier',
    readMinutes: 50,
    summary:
      'Authoritative human physiology text detailing cardiac Starling mechanics, arterial pressure regulation, renal nephron transport, and alveolar ventilation-perfusion matching.',
    coverImage: coverGuyton,
    coverColor: 'slate',
    chapters: [
      {
        id: 'guyton-ch1',
        title: 'Chapter 1: Cardiac Cycle, Frank-Starling Mechanism & Coronary Flow',
        paragraphs: [
          'The Frank-Starling law of the heart states that within physiological limits, the heart pumps all blood returned to it by the veins: increased end-diastolic volume stretches myocardial sarcomeres toward optimal actin-myosin overlap, augmenting stroke volume.',
          'Mean arterial pressure (MAP ≈ Diastolic BP + 1/3 Pulse Pressure) drives vital organ perfusion; maintaining MAP ≥ 65 mmHg during shock resuscitation safeguards cerebral, renal, and coronary autoregulation. Because left ventricular systolic pressure compresses intramural vessels, left coronary arterial perfusion occurs predominantly during diastole.',
          'Autonomic modulation balances sympathetic beta-1 stimulation (increasing SA nodal firing rate and myocardial contractility) against parasympathetic vagal M2 acetylcholine signaling, which slows SA/AV nodal conduction.',
        ],
      },
      {
        id: 'guyton-ch2',
        title: 'Chapter 2: Renal Glomerular Filtration & Nephron Segment Transport',
        paragraphs: [
          'Glomerular filtration rate (GFR) depends on net filtration pressure across the glomerular capillary membrane. Vasodilatory prostaglandins maintain afferent arteriolar blood flow during hypovolemia, whereas Angiotensin II constricts the efferent arteriole to preserve filtration pressure; combining NSAIDs with ACE inhibitors during dehydration sharply lowers GFR.',
          'The proximal convoluted tubule reabsorbs roughly 65% of filtered sodium and water alongside nearly 100% of filtered glucose via SGLT2/SGLT1 cotransporters. Downstream, the thick ascending limb of the loop of Henle uses the NKCC2 (Na+/K+/2Cl-) cotransporter—target of loop diuretics—to establish the corticomedullary osmotic gradient.',
        ],
      },
    ],
  },
  {
    id: 'jawetz-microbiology',
    title: 'Jawetz, Melnick & Adelberg’s Medical Microbiology',
    author: 'Stefan Riedel, MD, PhD & Jeffery A. Hobden, PhD',
    subject: 'Microbiology',
    edition: '28th Edition · McGraw Hill',
    readMinutes: 40,
    summary:
      'Essential clinical microbiology guide covering Gram-positive/negative cell walls, Tuberculosis 2HRZE/4HR regimens, Sepsis 1-Hour Bundle, and Plasmodium malaria management.',
    coverImage: coverJawetz,
    coverColor: 'emerald',
    chapters: [
      {
        id: 'jawetz-ch1',
        title: 'Chapter 1: Bacterial Architecture, Sepsis Bundle & Mycobacterium tuberculosis',
        paragraphs: [
          'Gram-positive bacteria possess a thick cross-linked peptidoglycan wall anchored by teichoic acids, whereas Gram-negative bacilli surround a thin peptidoglycan layer with an outer lipopolysaccharide (endotoxin) membrane and periplasmic beta-lactamase space.',
          'In suspected sepsis, clinicians apply the 1-Hour Bundle: draw two sets of blood cultures before antibiotics, measure serum lactate, start broad-spectrum IV antimicrobials, and infuse 30 mL/kg isotonic crystalloid for hypotension or lactate ≥ 4 mmol/L.',
          'Mycobacterium tuberculosis is an obligate aerobic acid-fast bacillus rich in cell-wall mycolic acids, rapidly identified alongside rifampicin resistance via GeneXpert MTB/RIF. Standard drug-susceptible pulmonary TB treatment comprises 2 months of Isoniazid, Rifampicin, Pyrazinamide, and Ethambutol (2HRZE) followed by 4 months of Isoniazid and Rifampicin (4HR), supplemented with pyridoxine (vitamin B6).',
        ],
      },
      {
        id: 'jawetz-ch2',
        title: 'Chapter 2: Plasmodium Malaria, Enteric Fever & Viral Dehydration',
        paragraphs: [
          'Plasmodium falciparum causes microvascular sequestration in brain and vital organs; severe malaria requires immediate parenteral IV Artesunate (2.4 mg/kg at 0, 12, and 24 hours, then daily) followed by a complete oral artemisinin-based combination therapy (ACT) course. For Plasmodium vivax or P. ovale, radical cure of dormant liver hypnozoites requires Primaquine only after confirming normal G6PD enzyme activity.',
          'Salmonella enterica serotype Typhi causes prolonged step-ladder fever, relative bradycardia (Faget sign), and abdominal tenderness, with highest blood culture yield during week 1. In acute viral gastroenteritis (Rotavirus, Norovirus), low-osmolarity WHO Oral Rehydration Salts paired with 10–14 days of oral Zinc dramatically lowers childhood dehydration mortality.',
        ],
      },
    ],
  },
  {
    id: 'harpers-biochemistry',
    title: 'Harper’s Illustrated Biochemistry',
    author: 'Victor W. Rodwell, PhD & Peter J. Kennelly, PhD',
    subject: 'Biochemistry',
    edition: '32nd Edition · McGraw Hill',
    readMinutes: 35,
    summary:
      'Clear clinical biochemistry connecting Michaelis-Menten enzyme kinetics, cellular glycolysis/TCA bioenergetics, hepatic NAPQI/glutathione detoxification, and ABG acid-base panels.',
    coverImage: coverHarpers,
    coverColor: 'orange',
    chapters: [
      {
        id: 'harpers-ch1',
        title: 'Chapter 1: Enzyme Kinetics, Glycolysis & Hepatic Glutathione Detoxification',
        paragraphs: [
          'Michaelis-Menten kinetics defines Vmax as maximal enzyme velocity at saturating substrate and Km as the substrate concentration yielding half-maximal velocity (inversely proportional to affinity). Competitive inhibitors bind the active site and increase apparent Km without altering Vmax, whereas non-competitive inhibitors lower Vmax without changing Km.',
          'Phosphofructokinase-1 (PFK-1) serves as the committed rate-limiting step of glycolysis, activated by AMP and fructose-2,6-bisphosphate and inhibited by high ATP and citrate. Metformin activates hepatic AMPK and inhibits mitochondrial complex I, curbing gluconeogenesis without provoking hypoglycemia.',
          'In acetaminophen overdose, saturation of Phase II glucuronidation and sulfation shunts excess drug through CYP2E1 to reactive N-acetyl-p-benzoquinone imine (NAPQI). When hepatic glutathione (GSH) falls below 30%, NAPQI induces centrilobular necrosis—prompt N-acetylcysteine (NAC) administration supplies cysteine to regenerate GSH.',
        ],
      },
      {
        id: 'harpers-ch2',
        title: 'Chapter 2: Acid-Base Homeostasis, Anion Gap & Clinical Electrolytes',
        paragraphs: [
          'Arterial blood gas interpretation evaluates pH (7.35–7.45), PaCO2 (35–45 mmHg), and HCO3- (22–26 mEq/L). Calculating the serum Anion Gap = Na+ - (Cl- + HCO3-) distinguishes elevated-gap metabolic acidosis (diabetic ketoacidosis, lactic acidosis, uremia, salicylate/methanol toxicity) from normal-gap hyperchloremic acidosis (diarrhea, renal tubular acidosis).',
          'Serum potassium tightly governs cardiac membrane excitability and drug safety: hypokalemia enhances Digoxin binding to myocardial Na+/K+-ATPase, precipitating ventricular arrhythmias, while severe hyperkalemia (>6.5 mEq/L or peaked T waves) requires immediate membrane stabilization with IV calcium gluconate.',
        ],
      },
    ],
  },
  {
    id: 'oxford-clinical-medicine',
    title: 'Oxford Handbook of Clinical Medicine',
    author: 'Ian B. Wilkinson, Tim Raine & Kate Wiles',
    subject: 'Clinical OPD',
    edition: '11th Edition · Oxford University Press',
    readMinutes: 38,
    summary:
      'Bedside ward and outpatient manual covering acute ABCDE triage, qSOFA sepsis screening, abdominal localization landmarks, and high-safety OPD clinical pearls.',
    coverImage: coverOxford,
    coverColor: 'emerald',
    chapters: [
      {
        id: 'oxford-ch1',
        title: 'Chapter 1: Bedside Triage, qSOFA & Acute Abdomen Landmarks',
        paragraphs: [
          'Every acutely unwell outpatient starts with structured ABCDE assessment: Airway patency, Breathing rate/SpO2, Circulation (capillary refill, BP, pulse), Disability (GCS, pupillary reactivity, capillary glucose), and Exposure/temperature.',
          'The bedside qSOFA score rapidly flags high-risk sepsis outside the ICU using three clinical criteria: respiratory rate ≥ 22/min, systolic blood pressure ≤ 100 mmHg, and altered mental status (GCS < 15). A score ≥ 2 warrants immediate escalation and lactate measurement.',
          'In acute abdominal pain, McBurney’s point lies one-third along the line from the right anterior superior iliac spine (ASIS) to the umbilicus. Visceral appendiceal stretch initially causes periumbilical T10 pain before localized peritoneal inflammation triggers RLQ tenderness, guarding, and Psoas or Obturator signs.',
        ],
      },
      {
        id: 'oxford-ch2',
        title: 'Chapter 2: Safe Outpatient Prescribing & Fever Triage',
        paragraphs: [
          'In dengue-endemic regions, fever accompanied by retro-orbital pain, myalgia, and falling platelets must be managed with Paracetamol rather than NSAIDs or aspirin, avoiding iatrogenic hemorrhage and gastritis while watching closely for plasma leakage warning signs.',
          'Before administering Digoxin on ward rounds, verify the apical heart rate for 60 full seconds (hold if <60 bpm) and inspect renal function and serum potassium. Educate inhaler users clearly on spacer hygiene and oral rinsing after steroid puffs.',
        ],
      },
    ],
  },
  {
    id: 'harrisons-internal-medicine',
    title: 'Harrison’s Manual of Medicine',
    author: 'J. Larry Jameson, MD, PhD & Dennis L. Kasper, MD',
    subject: 'Clinical OPD',
    edition: '21st Edition · McGraw Hill',
    readMinutes: 42,
    summary:
      'Concise point-of-care internal medicine reference synthesizing heart failure hemodynamics, diabetic emergencies, severe hypertension, and infectious fever differentials.',
    coverImage: coverHarrisons,
    coverColor: 'navy',
    chapters: [
      {
        id: 'harrisons-ch1',
        title: 'Chapter 1: Heart Failure, Hypertensive Emergencies & Chest Pain',
        paragraphs: [
          'Decompensated left-sided heart failure presents with exertional dyspnea, orthopnea, paroxysmal nocturnal dyspnea, and bibasilar crackles driven by elevated pulmonary venous pressures. Guideline-directed medical therapy combines ACE inhibitors/ARNIs, evidence-based beta-blockers, mineralocorticoid antagonists, and SGLT2 inhibitors.',
          'Hypertensive emergency is defined not by a single blood pressure number alone, but by severe hypertension (>180/120 mmHg) paired with acute target-organ damage (encephalopathy, aortic dissection, pulmonary edema, acute coronary syndrome, or papilledema), necessitating titratable IV therapy rather than precipitous oral drops.',
        ],
      },
      {
        id: 'harrisons-ch2',
        title: 'Chapter 2: Diabetic Ketoacidosis & Febrile Syndrome Differentials',
        paragraphs: [
          'Diabetic ketoacidosis (DKA) presents with hyperglycemia (>250 mg/dL), ketonemia/ketonuria, high anion gap metabolic acidosis, and Kussmaul respirations. Management prioritizes isotonic 0.9% NaCl volume expansion first, careful potassium replacement once urine output is confirmed and K+ < 5.3 mEq/L, and continuous IV regular insulin infusion until the anion gap closes.',
          'When evaluating undifferentiated fever in outpatient clinics, systematically differentiate enteric fever (step-ladder fever, coated tongue, relative bradycardia), malaria (periodic rigors, splenomegaly, anemia), and community-acquired pneumonia (tachypnea, focal crackles, consolidative dullness).',
        ],
      },
    ],
  },
];

export const defaultFlashcards: Omit<FlashcardItem, 'userId'>[] = [
  {
    id: 'fc-1',
    subject: 'Pharmacology',
    front: 'What is the specific antidote for Heparin overdose, and which lab test monitors it?',
    back: 'Antidote: Protamine sulfate. Lab monitoring: aPTT (activated partial thromboplastin time).',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-2',
    subject: 'Pharmacology',
    front: 'Why must Nitrates (Nitroglycerin) NEVER be combined with PDE-5 inhibitors (Sildenafil)?',
    back: 'Both elevate cGMP via nitric oxide signaling, causing synergistic vasodilation and severe, potentially fatal hypotension.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-3',
    subject: 'Pharmacology',
    front: 'What are the 4 organ systems monitored regularly during Amiodarone therapy?',
    back: 'Lungs (pulmonary fibrosis), Liver (hepatotoxicity/LFTs), Thyroid (hypo/hyperthyroidism), and ECG (QT prolongation/bradycardia).',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-4',
    subject: 'Anatomy & Physiology',
    front: 'Where is McBurney’s point located anatomically?',
    back: 'One-third of the distance along a straight line from the right anterior superior iliac spine (ASIS) to the umbilicus.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-5',
    subject: 'Anatomy & Physiology',
    front: 'What are the three components of the qSOFA bedside sepsis score?',
    back: '1) Respiratory rate ≥ 22/min, 2) Systolic BP ≤ 100 mmHg, 3) Altered mentation (GCS < 15). Score ≥ 2 indicates high risk.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-6',
    subject: 'Microbiology',
    front: 'What is the standard adult first-line regimen and duration for drug-susceptible Pulmonary TB?',
    back: '2HRZE / 4HR: 2 months intensive (Isoniazid, Rifampicin, Pyrazinamide, Ethambutol) + 4 months continuation (Isoniazid, Rifampicin).',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-7',
    subject: 'Microbiology',
    front: 'What test is required before giving Primaquine for P. vivax/ovale radical cure, and why?',
    back: 'G6PD activity test—Primaquine triggers acute oxidative hemolytic anemia in G6PD-deficient individuals.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
  {
    id: 'fc-8',
    subject: 'Biochemistry',
    front: 'Which toxic metabolite causes Acetaminophen hepatotoxicity, and how does NAC rescue the liver?',
    back: 'NAPQI (generated by CYP2E1) depletes glutathione; N-acetylcysteine (NAC) replenishes glutathione (GSH) to neutralize NAPQI.',
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: new Date().toISOString(),
  },
];

export const seedStudyGroups: StudyGroup[] = [
  {
    id: 'grp-pharm-rounds',
    name: 'Clinical Pharmacology Rounds',
    subject: 'Pharmacology',
    description: 'High-yield drug classes, antidotes, and #1–#209 formulary flashcard sprints.',
    createdByUid: 'system-faculty',
    createdByName: 'Dr. A. Farah (Faculty)',
    memberCount: 28,
  },
  {
    id: 'grp-micro-opd',
    name: 'Infectious Disease & OPD Cases',
    subject: 'Microbiology',
    description: 'Discuss Sepsis 1-Hour Bundle, Malaria ACT dosing, TB 2HRZE/4HR, and #01–#100 OPD clues.',
    createdByUid: 'system-faculty',
    createdByName: 'Hilaac Study Leads',
    memberCount: 34,
  },
  {
    id: 'grp-anatomy-biochem',
    name: 'Pre-Clinical Foundations (A&P + Biochem)',
    subject: 'Anatomy & Physiology',
    description: 'Organ hemodynamics, nephron transport, enzyme kinetics, and acid-base practice.',
    createdByUid: 'system-faculty',
    createdByName: 'Amina Warsame',
    memberCount: 19,
  },
];

export const seedLeaderboard: LeaderboardEntry[] = [
  { uid: 'peer-1', displayName: 'Amina Warsame', role: 'student', xp: 1420, studyMinutes: 340, streakDays: 12 },
  { uid: 'peer-2', displayName: 'Yusuf Abdi', role: 'student', xp: 1280, studyMinutes: 295, streakDays: 9 },
  { uid: 'peer-3', displayName: 'Dr. Halima Noor', role: 'teacher', xp: 1150, studyMinutes: 260, streakDays: 14 },
  { uid: 'peer-4', displayName: 'Khadija Omar', role: 'student', xp: 940, studyMinutes: 210, streakDays: 6 },
];
