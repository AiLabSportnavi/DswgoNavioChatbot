"""
Manual live-test for the Salesforce contact integration. NOT part of the app.

Run it AFTER putting SALESFORCE_CLIENT_ID / SALESFORCE_CLIENT_SECRET in backend/.env:

    cd backend
    python test_salesforce.py

It (1) fetches an OAuth token, (2) triggers the CaseHandler flow with the exact
sample payload from the API doc, and (3) prints whether the flow returned
isSuccess=true. A real test Case is created in Salesforce — delete it afterwards.
"""

from __future__ import annotations

import sys

# UTF-8 console output on Windows (so the German text / symbols don't crash cp1252).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from dotenv import load_dotenv

load_dotenv()

import salesforce as sf  # noqa: E402  (after load_dotenv so it reads .env)

# Exact sample from the Sportnavi API documentation.
SAMPLE = {
    "MembershipType": "Private",
    "CaseGrounds": "Membership administration (Private)",
    "Topic": "Problem logging in",
    "ShortDescription": "Ich kann mich in die App nicht einloggen",
    "Subject": "Navio integration test — please ignore",
    "Name": "Navio Test",
    "Email": "info@sportnavi.de",
    "Phone": "0151234567",
    "CustomerNumber": "0000012345",
    "Description": "Automated connectivity test from test_salesforce.py",
}


def main() -> None:
    if not sf.salesforce_enabled():
        print("[X] SALESFORCE_CLIENT_ID / SALESFORCE_CLIENT_SECRET not set in backend/.env")
        return

    print("[1] Fetching OAuth token ...")
    try:
        token, instance_url = sf._get_token(force=True)
        print(f"    [OK] token received ({token[:6]}...{token[-4:]}), instance_url={instance_url}")
    except Exception as e:  # noqa: BLE001
        print(f"    [X] token request FAILED: {e}")
        return

    print("[2] Triggering CaseHandler flow with the sample payload ...")
    ok, detail = sf.submit_case(SAMPLE)
    if ok:
        print(f"    [OK] isSuccess=true -- flow ran. outputValues: {detail}")
        print("\nRESULT: SALESFORCE INTEGRATION WORKING  (delete the test Case in Salesforce)")
    else:
        print(f"    [X] flow did NOT succeed: {detail}")
        print("\nRESULT: NOT WORKING -- check the picklist values (MembershipType / "
              "CaseGrounds / Topic must match Salesforce exactly) and the credentials.")


if __name__ == "__main__":
    main()
