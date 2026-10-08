# AuthenChain Python SDK Examples

These examples show how Python AI teams can capture and verify AuthenChain technical evidence without writing manual HTTP calls.

AuthenChain supports provenance, integrity, traceability, audit, and dispute workflows. It does not guarantee legal compliance.

## Install

From the Python SDK directory:

```bash
python -m pip install -e .
```

## Examples

- `regulated-text-output/`: minimal regulated text capture and verification.
- `credit-decision-audit/`: synthetic credit decision-support audit evidence.
- `medical-ai-traceability/`: synthetic reviewed medical AI draft traceability.
- `tamper-verification-failure/`: original output verification plus tamper failure.
- `evidence-pack-export-verify/`: Evidence Pack export and verification flow.

## Run

Each example is executable with Python:

```bash
python examples/regulated-text-output/example.py
```

The examples use `mock=True` by default so they can run locally without `AUTHENCHAIN_API_KEY`. Mock mode is for tests, demos, local CI, examples, and harness simulations. It must not be treated as externally trusted evidence.

For live API usage, create the client with:

```py
client = AuthenChain(
    api_key="ac_test_...",
    base_url="https://api.authenchain.com",
    mock=False,
)
```
