# Dataset Folder

Place your Duolingo dataset CSV here to train on real data.

## Supported filenames (auto-detected in priority order)

1. `learning_traces.13m.csv`  — Full 13M row Harvard dataset
2. `duolingo_data.csv`        — Kaggle version

## Where to download

### Kaggle (easiest)
1. Go to: https://www.kaggle.com/datasets/aravinii/duolingo-spaced-repetition-data
2. Download and unzip
3. Place `duolingo_data.csv` in this folder

## Training commands

```bash
python training/train.py                 # auto-detect
python training/train.py --rows 500000  # limit rows
python training/train.py --synthetic    # force synthetic
```

If no file is found, training auto-falls back to 500k synthetic rows.
