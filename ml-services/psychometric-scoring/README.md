# psychometric-scoring

Upcore deterministic scoring engine for validated psychometric instruments.

## Instruments

| Instrument       | Items | Source                                     | License              | Status        |
|------------------|-------|--------------------------------------------|----------------------|---------------|
| BAT-12-TR        | 12    | Kocak, Gencay & Schaufeli (2022)           | Free, cite required  | Provisional   |
| COPSOQ-III-TR    | 40    | Sahan, Baydur & Demiral (2019) CFI=0.98    | CC-BY                | Validated TR  |
| UpCap-TR         | 12    | Lorenz 2016 CPC-12, CC-BY 4.0 (adapted)    | CC-BY 4.0            | Provisional   |
| JD-R v0.1        | n/a   | Bakker & Demerouti (2007), Crawford (2010) | n/a                  | Heuristic     |

**Scientific transparency:** every scored response returns a model card containing citations,
reliability metrics, norm source, calibration status, and known limitations.

## Development

```bash
uv sync
uv run ruff check .
uv run mypy app/
uv run pytest -v
uv run uvicorn app.main:app --port 8021
```

## API

- `POST /api/v1/score/bat` — BAT-12-TR burnout scoring
- `POST /api/v1/score/copsoq` — COPSOQ-III-TR psychosocial demands
- `POST /api/v1/score/upcap` — UpCap-TR PsyCap (provisional)
- `POST /api/v1/score/jdr-balance` — JD-R burnout risk (v0.1 heuristic)
- `GET /api/v1/norms/{instrument}` — norm table metadata
- `GET /api/v1/instruments` — list instruments
- `GET /api/v1/instruments/{id}/model-card` — scientific transparency
- `GET /health`, `GET /ready`

## Citations

- Kocak, O. E., Gencay, F., & Schaufeli, W. B. (2022). Turkish validation of BAT-23 and BAT-12.
  Psikoloji Calismalari / Studies in Psychology, 42(3), 509-549. DOI: 10.26650/SP2020-799817
- Schaufeli, W. B., De Witte, H., & Desart, S. (2020). Burnout Assessment Tool (BAT).
- Sahan, C., Baydur, H., & Demiral, Y. (2019). COPSOQ-III Turkish validation.
- Crawford, E. R., LePine, J. A., & Rich, B. L. (2010). JD-R meta-analysis. J. Applied Psychology.
- Lesener, T., Gusy, B., & Wolter, C. (2019). JD-R model: longitudinal meta-analysis. Work & Stress.
- Lorenz, T., Beer, C., Putz, J., & Heinitz, K. (2016). CPC-12 PsyCap short scale. PLOS ONE.
