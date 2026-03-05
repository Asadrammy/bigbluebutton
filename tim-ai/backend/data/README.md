# TIM-AI Dataset Strategy

This document tracks the curated datasets, collection workflows, and quality targets for the multi-language sign recognition pipeline described in Phase 4 of the implementation plan.

## 1. Supported Sign Languages & Datasets

| Sign Language | Primary Datasets | Supplemental Sources | Notes |
| --- | --- | --- | --- |
| **DGS (German)** | DGS Corpus (IDGS), SIGNUM | Custom recordings with Hamburg interpreters | Balanced across conversational + formal vocabulary |
| **ASL (American)** | WLASL, MS-ASL, ASL-LEX | Deaf professional network recordings | Include fingerspelling & classifier gestures |
| **BSL (British)** | BSL Corpus, BOBSL | Universities of Edinburgh/Manchester | Request access for research use |
| **LSF (French)** | Dicta-Sign LSF | Enseignement Spécialisé syndicate footage | Prioritize high-resolution RGB clips |
| **LIS (Italian)** | Dicta-Sign LIS | RAI archive cooperation | Label regional variants |
| **LSE (Spanish)** | Dicta-Sign LSE, LSE_T15 | Madrid municipal offices | Capture autonomous community variants |
| **NGT (Dutch)** | Corpus NGT | Dutch Sign Centre | Ensure GDPR compliance for public office recordings |
| **OGS (Austrian)** | Custom filming (Vienna), DGS derivatives | Austrian Sign Language Association | Share pose skeletons with DGS where possible |
| **SSL (Swedish)** | Spread the Sign, Örebro University data | Swedish Public Employment Service | Requires Swedish data export approval |

## 2. Collection & Labeling Workflow

1. **Intake** ⇒ Acquire raw videos (or MoCap) using written consent. Store in encrypted S3-compatible bucket in `backend/data/raw/{LANG}`.
2. **Anonymization** ⇒ Blur faces when required, remove metadata, assign UUID clip IDs.
3. **Segmentation** ⇒ Use semi-automatic tools (OpenPose, MediaPipe) to split long videos into sign-level clips.
4. **Labeling** ⇒ Combination of expert linguists + interpreters using the TIM-AI labeling UI. Capture gloss, spoken translation, context.
5. **Validation** ⇒ Second reviewer cross-checks each label, confidence stored in dataset manifest (`dataset.json`).
6. **Augmentation** ⇒ Apply rotation/scale/light augmentations only at training time; keep raw clips untouched.

## 3. Folder Structure

```
backend/data/
  raw/{LANG}/              # Original footage or MoCap exports
  processed/{LANG}/        # Trimmed + normalized clips
  manifests/{LANG}.json    # Metadata (gloss, signer_id, fps, license)
  exports/{LANG}/          # Train/val/test splits ready for trainer
```

> Each manifest entry: `{ "clip_id": str, "gloss": str, "spoken_text": str, "sign_language": str, "split": "train|val|test", "confidence": float, "source": str }`

## 4. Training Targets

- Minimum **1,500 glosses** per language for initial release (DGS/ASL ≥ 3,000).
- At least **5 signers** per gloss where possible to avoid signer bias.
- Keep **train/val/test = 70/15/15** split, stratified by gloss + signer.
- Track `top1` and `top5` accuracy per language; accept deployment when `top1 ≥ 80%` on validation for DGS/ASL and `≥ 70%` for others (initial milestone).

## 5. Avatar Animation Assets

- Store animation clips under `backend/avatar/{LANG}/{GLOSS}.json` or `.gltf`.
- Each entry includes: skeleton definition, keyframes, metadata (duration, neutral pose, requires_fingerspelling flag).
- Fallback strategy: if `text-to-sign` lacks an explicit animation, use per-language fingerspelling alphabet (stored under `avatar/{LANG}/fingerspelling`).
- Maintain a translation manifest linking gloss IDs to avatar clip IDs to keep sign recognition + avatar playback aligned.

## 6. Compliance & Licensing

- Ensure every dataset respects original license agreements; store copies under `docs/licenses/{LANG}/`.
- Keep audit trail of consent forms in `backend/data/compliance/{LANG}/` (encrypted at rest).
- For EU deployments, follow GDPR Article 9 exemptions for accessibility services; document DPIA outcomes in `docs/compliance/`.

## 7. Next Steps

1. Finalize MoUs with Hamburg, Madrid, and Rotterdam pilot partners for continued data intake.
2. Normalize dataset manifests to a shared schema (see `backend/app/ml/datasets/schema.py`).
3. Automate export from manifests into `models/{LANG}/` training jobs.
4. Extend avatar rig to include SSL-specific handshapes (collaboration with Swedish interpreters Q2).

---
Last updated: 2026-02-15 (Phase 4 dataset planning).
