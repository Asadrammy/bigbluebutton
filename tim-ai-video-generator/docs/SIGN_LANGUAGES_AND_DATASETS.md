# Sign Languages & Datasets Strategy

## 1. Sign Languages Overview

The client requires support for **German Sign Language (DGS)**, **American Sign Language (ASL)**, and **all European sign languages**. Each sign language is a distinct language with its own grammar, vocabulary, and structure — they are NOT direct visual translations of spoken languages.

### Key Fact
> Sign languages are independent languages. German Sign Language (DGS) is NOT a visual version of German. A DGS user from Germany and an ÖGS user from Austria may not fully understand each other, despite both countries speaking German.

---

## 2. Supported Sign Languages — Full List

### Phase 1 (MVP — Priority)
| Code | Name | Region | Spoken Language | Dataset Availability |
|------|------|--------|-----------------|---------------------|
| DGS | Deutsche Gebärdensprache | Germany | German | Medium — DGS Corpus, SIGNUM |
| ASL | American Sign Language | USA, Canada | English | High — WLASL, MS-ASL, ASL-LEX |

### Phase 2 (European Tier 1 — Larger datasets exist)
| Code | Name | Region | Spoken Language | Dataset Availability |
|------|------|--------|-----------------|---------------------|
| BSL | British Sign Language | UK | English | Medium — BSL Corpus, BOBSL |
| LSF | Langue des Signes Française | France | French | Low-Medium — Dicta-Sign |
| LIS | Lingua dei Segni Italiana | Italy | Italian | Low — some research datasets |
| LSE | Lengua de Signos Española | Spain | Spanish | Low — LSE-Sign |

### Phase 3 (European Tier 2 — Less data, more research needed)
| Code | Name | Region | Spoken Language | Dataset Availability |
|------|------|--------|-----------------|---------------------|
| NGT | Nederlandse Gebarentaal | Netherlands | Dutch | Low — NGT Corpus |
| ÖGS | Österreichische Gebärdensprache | Austria | German | Very Low |
| SSL | Svenskt teckenspråk | Sweden | Swedish | Low — SSL Corpus |
| DSL | Dansk Tegnsprog | Denmark | Danish | Very Low |
| NSL | Norsk tegnspråk | Norway | Norwegian | Very Low |
| SVK | Suomalainen viittomakieli | Finland | Finnish | Very Low |
| LGP | Língua Gestual Portuguesa | Portugal | Portuguese | Very Low |
| GSL | Greek Sign Language | Greece | Greek | Very Low |
| PJM | Polski Język Migowy | Poland | Polish | Low — PJM Corpus |
| ČZJ | Český znakový jazyk | Czech Republic | Czech | Very Low |
| LSFB | Langue des Signes de Belgique Francophone | Belgium (French) | French | Very Low |
| VGT | Vlaamse Gebarentaal | Belgium (Flemish) | Dutch | Low — VGT Corpus |
| ISL | Irish Sign Language | Ireland | English | Very Low |
| LSQ | Langue des signes québécoise | Quebec, Canada | French | Very Low |

---

## 3. Dataset Sources

### 3.1 DGS (German Sign Language) — Priority 1

| Dataset | Size | Type | Access | Notes |
|---------|------|------|--------|-------|
| **DGS Corpus** | 560+ hours | Continuous signing | Research agreement (Uni Hamburg) | Largest DGS dataset. Requires academic license. |
| **SIGNUM** | 450 signs, 25 signers | Isolated + continuous | Research request (RWTH Aachen) | Good for initial model. |
| **PHOENIX-2014T** | 8,257 sentences | Continuous (weather forecasts) | Free for research | Popular benchmark. Contains gloss + German text. |
| **RWTH-PHOENIX-Weather 2014** | 6,841 sentences | Continuous | Free for research | Weather domain, good baseline. |
| **Custom Collection** | Variable | Isolated signs | Self-created | Record DGS signs with native signers. 50–100 basic signs minimum. |

**Recommended approach for DGS:**
1. Start with PHOENIX-2014T for continuous sign recognition baseline
2. Use SIGNUM for isolated sign recognition
3. Supplement with custom-collected data for production vocabulary
4. Fine-tune with transfer learning from ASL models

### 3.2 ASL (American Sign Language) — Priority 2

| Dataset | Size | Type | Access | Notes |
|---------|------|------|--------|-------|
| **WLASL** (v2) | 2,000 signs, 21,083 videos | Isolated | Free (GitHub) | Most popular ASL dataset. Multiple signers. |
| **MS-ASL** | 1,000 signs, 25,513 videos | Isolated | Free (request from MS) | Microsoft dataset. Clean labels. |
| **ASL-LEX** | 2,723 signs | Lexical database | Free | Phonological properties, useful for dictionary. |
| **How2Sign** | 35 hours | Continuous | Free (GitHub) | Large continuous signing dataset with English text. |
| **ASL Citizen** | 83,399 videos | Isolated | Free | Crowdsourced, diverse signers. |
| **ASLLVD** | 3,300+ signs | Isolated | Free (BU) | Boston University dataset. Multiple angles. |

**Recommended approach for ASL:**
1. Start with WLASL-2000 (best isolated sign dataset)
2. Add MS-ASL for additional vocabulary
3. Use How2Sign for continuous recognition
4. ASL-LEX for dictionary metadata

### 3.3 BSL (British Sign Language) — Priority 3

| Dataset | Size | Type | Access | Notes |
|---------|------|------|--------|-------|
| **BSL Corpus** | 249 hours | Continuous | Research agreement (UCL) | Largest BSL resource. |
| **BOBSL** | 1,467 hours | Continuous (BBC) | Free for research | BBC sign language broadcasts. Huge but noisy. |
| **BSL-1K** | 1,064 signs | Isolated | Research request | Extracted from BOBSL. |

### 3.4 LSF (French Sign Language)

| Dataset | Size | Type | Access | Notes |
|---------|------|------|--------|-------|
| **Dicta-Sign-LSF** | ~1,500 signs | Isolated + sentences | Research request | Multi-language sign project (also has DGS, BSL, GSL). |
| **LSF Corpus** | Limited | Continuous | Research | French government funded. |

### 3.5 Other European — General Strategy

For sign languages with **very low** dataset availability:
1. **Transfer Learning**: Pre-train on ASL/DGS (largest datasets), fine-tune on target language
2. **Cross-lingual features**: Many European sign languages share some signs (especially iconic/international signs)
3. **Synthetic data**: Use pose estimation → augmentation to generate training variations
4. **Crowdsourcing**: Build a data collection tool where native signers can contribute videos
5. **Fingerspelling focus**: Start with fingerspelling alphabet (easier to collect) then expand to signs

---

## 4. Model Architecture Per Language

Each sign language gets its own model, but they share the same architecture:

```
┌─────────────────────────────────────────────────┐
│              Shared Architecture                 │
│                                                  │
│  Input: Video frames (T × H × W × C)            │
│         T=16 frames, H=W=224, C=3 (RGB)         │
│                                                  │
│  ┌────────────────────────────────────────┐     │
│  │   Backbone: MobileNet3D / I3D          │     │
│  │   (pre-trained on Kinetics-400)         │     │
│  └───────────────┬────────────────────────┘     │
│                  │                               │
│  ┌───────────────▼────────────────────────┐     │
│  │   Classification Head                   │     │
│  │   (per sign language, different output)  │     │
│  │   DGS: 50 classes                       │     │
│  │   ASL: 2000 classes                     │     │
│  │   BSL: 1064 classes                     │     │
│  └────────────────────────────────────────┘     │
│                                                  │
│  Output: sign_label, confidence, top_k           │
└─────────────────────────────────────────────────┘
```

### Transfer Learning Strategy
```
1. Pre-train backbone on Kinetics-400 (general video understanding)
2. Fine-tune on ASL (largest sign language dataset)
3. For each new sign language:
   a. Start from ASL-fine-tuned backbone weights
   b. Replace classification head with new head (N classes)
   c. Fine-tune on target language dataset
   d. This requires much less data than training from scratch
```

---

## 5. Data Collection Plan (For Missing Languages)

### Custom Data Collection Tool
Build a simple web/mobile interface where native signers can:
1. See a word/phrase prompt
2. Record themselves signing it (3–5 repetitions)
3. Upload video automatically
4. Admin reviews and labels

### Collection Protocol
- **Minimum per sign**: 10 videos from 5+ different signers
- **Camera angle**: Front-facing, chest up, neutral background
- **Lighting**: Even, well-lit
- **Duration**: 1–5 seconds per sign
- **Resolution**: 720p minimum

### Vocabulary Priority (Per Language)
Start with the most common/useful categories:
1. **Alphabet** (fingerspelling) — ~26–30 signs
2. **Numbers** (0–100) — ~20 signs
3. **Basic greetings** — ~15 signs (hello, goodbye, thank you, please, sorry, etc.)
4. **Common questions** — ~20 signs (what, where, when, who, how, etc.)
5. **Daily activities** — ~30 signs (eat, drink, sleep, work, etc.)
6. **Emotions** — ~15 signs (happy, sad, angry, scared, etc.)
7. **People/family** — ~15 signs (mother, father, friend, etc.)
8. **Time** — ~15 signs (today, tomorrow, yesterday, morning, etc.)
9. **Places** — ~15 signs (home, school, hospital, etc.)
10. **Common nouns** — ~50 signs (water, food, phone, car, etc.)

**Total minimum vocabulary per language: ~230 signs**

---

## 6. Avatar Animation Data

### Per Sign Language
Each sign needs corresponding avatar animation data:

```json
{
  "sign_language": "DGS",
  "word": "HALLO",
  "category": "greeting",
  "animation": {
    "duration": 1.5,
    "keyframes": [
      {
        "time": 0.0,
        "bones": {
          "RightShoulder": { "rotation": [0, 0, 0, 1] },
          "RightArm": { "rotation": [0.3, 0.1, 0, 0.95] },
          "RightHand": { "rotation": [0, 0, 0, 1], "position": [0.3, 0.5, 0.1] }
        }
      },
      {
        "time": 0.75,
        "bones": {
          "RightHand": { "rotation": [0, 0.2, 0, 0.98], "position": [0.4, 0.6, 0.1] }
        }
      }
    ]
  }
}
```

### Animation Sources
1. **Pose estimation from video**: Use MediaPipe/OpenPose to extract bone positions from sign language videos, convert to avatar keyframes
2. **Motion capture**: If budget allows, capture native signers with MoCap
3. **Manual animation**: Create keyframes manually in Blender for critical signs
4. **Procedural**: For fingerspelling, generate animations programmatically from hand shape definitions

### Avatar Model
- Use **ReadyPlayerMe** or **Mixamo** for quick rigged character
- Export as **glTF/glb** format
- Required bones: spine, shoulders, arms, forearms, hands, fingers (all 10), head, neck
- Facial expressions: eyebrows, mouth shapes (for non-manual markers in sign language)

---

## 7. Sign Language Dictionary Database Schema

```sql
-- Each sign language is registered
CREATE TABLE sign_languages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,    -- "DGS", "ASL", etc.
    name VARCHAR(100) NOT NULL,           -- "Deutsche Gebärdensprache"
    region VARCHAR(100),                  -- "Germany"
    spoken_language VARCHAR(10),          -- "de", "en", etc.
    total_signs INTEGER DEFAULT 0,
    model_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dictionary of signs per language
CREATE TABLE sign_dictionary (
    id SERIAL PRIMARY KEY,
    sign_language_code VARCHAR(10) REFERENCES sign_languages(code),
    word VARCHAR(200) NOT NULL,           -- The word in spoken language
    gloss VARCHAR(200),                   -- Sign language gloss notation
    category VARCHAR(50),                 -- "greeting", "number", etc.
    difficulty VARCHAR(20),               -- "basic", "intermediate", "advanced"
    description TEXT,                     -- How to perform the sign
    animation_data JSONB,                -- Avatar animation keyframes
    video_url VARCHAR(500),              -- Optional video of human signer
    thumbnail_url VARCHAR(500),          -- Thumbnail image
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(sign_language_code, word)
);

-- ML models per sign language
CREATE TABLE sign_language_models (
    id SERIAL PRIMARY KEY,
    sign_language_code VARCHAR(10) REFERENCES sign_languages(code),
    model_version_id INTEGER REFERENCES model_versions(id),
    is_active BOOLEAN DEFAULT FALSE,     -- Currently deployed model
    accuracy FLOAT,
    num_classes INTEGER,
    model_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Evaluation Metrics

### Per-Model Metrics
- **Top-1 Accuracy**: Primary metric (must be > 70% for production)
- **Top-5 Accuracy**: Secondary (must be > 90%)
- **F1 Score**: Per-class performance
- **Confusion Matrix**: Identify commonly confused signs
- **Inference Time**: Must be < 200ms per prediction on target hardware

### System-Level Metrics
- **End-to-end latency**: Camera → text display (< 3 seconds)
- **Word Error Rate (WER)**: For continuous sign recognition
- **User satisfaction**: Qualitative feedback from deaf users

---

## 9. Legal & Ethical Considerations

### Dataset Licensing
- Most research datasets require **academic/research license agreements**
- For commercial use, may need to:
  - Contact dataset creators for commercial license
  - Collect own data
  - Use only datasets with permissive licenses

### Representation
- Training data should include **diverse signers** (age, gender, ethnicity, signing style)
- Test with native deaf signers, not just hearing sign language students
- Regional dialect variations exist within sign languages (e.g., BSL varies between cities)

### Privacy
- All collected video data must comply with **GDPR** (data is processed in Germany)
- Signer consent required for all training data
- Option to delete contributed data
